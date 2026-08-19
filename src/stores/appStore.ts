import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { ALL_ENGINES, wallpaperFromEngine } from '@engines'
import { fetchLibraryScenes, sceneToWallpaper } from '@utils/libraryContent'
import {
  saveWallpaperState,
  loadWallpaperState,
  isWallpaperRunning,
} from '@utils/wallpaperPersistence'
import { log } from '@utils/logger'
import type {
  Display,
  Wallpaper,
  WallpaperProfile,
  PerformanceMetrics,
  AppSettings,
  NavRoute,
  WallpaperRuntimeState,
} from '@/types/index'

interface AppStore {
  // Navigation
  currentRoute: NavRoute
  setCurrentRoute: (route: NavRoute) => void

  // Displays
  displays: Display[]
  setDisplays: (displays: Display[]) => void
  activeDisplayId: string | null
  setActiveDisplayId: (id: string | null) => void

  // Multi-monitor
  displayMode: 'independent' | 'clone' | 'span'
  setDisplayMode: (mode: 'independent' | 'clone' | 'span') => void
  displayAssignments: Record<string, string>
  setDisplayAssignment: (displayId: string, wallpaperId: string | null) => void

  // Wallpapers
  wallpapers: Wallpaper[]
  setWallpapers: (wallpapers: Wallpaper[]) => void
  addWallpaper: (wallpaper: Wallpaper) => void
  removeWallpaper: (id: string) => void
  updateWallpaper: (id: string, updates: Partial<Wallpaper>) => void
  currentWallpaperId: string | null
  setCurrentWallpaperId: (id: string | null) => void

  // Recently used
  recentlyUsed: string[]
  addRecentlyUsed: (wallpaperId: string) => void
  recentlyUsedLoaded: boolean

  // Host state
  isHostRunning: boolean
  setIsHostRunning: (running: boolean) => void

  // Profiles
  profiles: WallpaperProfile[]
  setProfiles: (profiles: WallpaperProfile[]) => void
  activeProfileId: string | null
  setActiveProfileId: (id: string | null) => void

  // Performance
  metrics: PerformanceMetrics | null
  setMetrics: (metrics: PerformanceMetrics) => void
  runtimeStates: Record<string, WallpaperRuntimeState>
  setRuntimeState: (displayId: string, state: WallpaperRuntimeState) => void

  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void

  // Content library
  libraryLoaded: boolean
  libraryErrors: Record<string, string>
  loadLibraryContent: () => Promise<void>
  setLibraryError: (wallpaperId: string, error: string) => void
  clearLibraryError: (wallpaperId: string) => void

  // Persistence
  persistedLoaded: boolean
  loadPersistedState: () => Promise<void>

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const defaultSettings: AppSettings = {
  performanceMode: 'auto',
  enableOnStartup: true,
  enableBatteryOptimization: true,
  pauseOnFullscreen: true,
  pauseOnGameDetected: false,
  volume: 0.8,
  theme: 'dark',
}

const initialWallpapers: Wallpaper[] = ALL_ENGINES.map((engine, index) =>
  wallpaperFromEngine(engine, index),
)

export const useAppStore = create<AppStore>((set) => ({
  // Navigation
  currentRoute: 'dashboard',
  setCurrentRoute: (route) => set({ currentRoute: route }),

  // Displays
  displays: [],
  setDisplays: (displays) =>
    set((state) => ({
      displays,
      activeDisplayId: state.activeDisplayId || (displays[0]?.id ?? null),
    })),
  activeDisplayId: null,
  setActiveDisplayId: (id) => set({ activeDisplayId: id }),

  // Multi-monitor
  displayMode: 'independent',
  setDisplayMode: (mode) => set({ displayMode: mode }),
  displayAssignments: {},
  setDisplayAssignment: (displayId, wallpaperId) => {
    set((state) => {
      const next = { ...state.displayAssignments }
      if (wallpaperId) {
        next[displayId] = wallpaperId
      } else {
        delete next[displayId]
      }
      return { displayAssignments: next }
    })
    // Persist the assignment
    void import('@utils/wallpaperPersistence').then((mod) =>
      mod.saveDisplayAssignment(displayId, wallpaperId),
    )
  },

  // Wallpapers (one per engine, generated from the registry)
  wallpapers: initialWallpapers,
  setWallpapers: (wallpapers) => set({ wallpapers }),
  addWallpaper: (wallpaper) =>
    set((state) => ({
      wallpapers: [wallpaper, ...state.wallpapers],
    })),
  removeWallpaper: (id) =>
    set((state) => ({
      wallpapers: state.wallpapers.filter((w) => w.id !== id),
    })),
  updateWallpaper: (id, updates) =>
    set((state) => ({
      wallpapers: state.wallpapers.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),
  currentWallpaperId: null,
  setCurrentWallpaperId: (id) => {
    set({ currentWallpaperId: id })
    // Persist the selection to disk so it survives app restarts
    void saveWallpaperState(id, null, true)
  },

  // Recently used
  recentlyUsed: [],
  recentlyUsedLoaded: false,
  addRecentlyUsed: (wallpaperId) => {
    set((state) => {
      const filtered = state.recentlyUsed.filter((id) => id !== wallpaperId)
      const next = [wallpaperId, ...filtered].slice(0, 20) // keep max 20
      // Persist to localStorage (lightweight, no IPC needed)
      try {
        localStorage.setItem('lumawall:recentlyUsed', JSON.stringify(next))
      } catch { /* quota exceeded — ignore */ }
      return { recentlyUsed: next }
    })
  },

  // Host state
  isHostRunning: true,
  setIsHostRunning: (isHostRunning) => set({ isHostRunning }),

  // Profiles
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  activeProfileId: null,
  setActiveProfileId: (id) => set({ activeProfileId: id }),

  // Performance
  metrics: null,
  setMetrics: (metrics) => set({ metrics }),
  runtimeStates: {},
  setRuntimeState: (displayId, state) =>
    set((store) => ({
      runtimeStates: {
        ...store.runtimeStates,
        [displayId]: state,
      },
    })),

  // Settings
  settings: defaultSettings,
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  // Content library
  libraryLoaded: false,
  libraryErrors: {},
  loadLibraryContent: async () => {
    try {
      log.debug('Loading library content')
      const scenes = await fetchLibraryScenes()
      const contentWallpapers = scenes.map(sceneToWallpaper)
      log.info('Library content loaded', { sceneCount: scenes.length, newWallpapers: contentWallpapers.length })
      set((state) => {
        const existingIds = new Set(state.wallpapers.map((w) => w.id))
        const fresh = contentWallpapers.filter((w) => !existingIds.has(w.id))
        return { wallpapers: [...fresh, ...state.wallpapers], libraryLoaded: true }
      })
    } catch (err) {
      log.warn('Failed to load content library', { error: String(err) })
      set({ libraryLoaded: true })
    }
  },
  setLibraryError: (wallpaperId, error) =>
    set((state) => ({ libraryErrors: { ...state.libraryErrors, [wallpaperId]: error } })),
  clearLibraryError: (wallpaperId) =>
    set((state) => {
      const next = { ...state.libraryErrors }
      delete next[wallpaperId]
      return { libraryErrors: next }
    }),

  // Persistence
  persistedLoaded: false,
  loadPersistedState: async () => {
    log.debug('Loading persisted state from disk')
    const [persisted, running] = await Promise.all([
      loadWallpaperState(),
      isWallpaperRunning(),
    ])
    log.debug('Persisted state loaded', { wallpaperId: persisted.wallpaperId, running })
    set((state) => {
      const wallpaperId = persisted.wallpaperId ?? state.currentWallpaperId
      // If the wallpaper window is actually running, trust the persisted ID
      // even if it was null (the window might have survived a restart).
      const effectiveId = running && !wallpaperId
        ? state.currentWallpaperId
        : wallpaperId
      // Load recently used from localStorage
      let recentlyUsed: string[] = []
      try {
        const stored = localStorage.getItem('lumawall:recentlyUsed')
        if (stored) recentlyUsed = JSON.parse(stored) as string[]
      } catch { /* ignore */ }

      return {
        currentWallpaperId: effectiveId,
        isHostRunning: running,
        displayMode: (persisted.displayMode as 'independent' | 'clone' | 'span') ?? 'independent',
        displayAssignments: persisted.displayAssignments ?? {},
        recentlyUsed,
        recentlyUsedLoaded: true,
        persistedLoaded: true,
      }
    })
  },

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  )
}

/**
 * Fetch connected displays from Tauri backend
 */
export async function refreshDisplays(): Promise<Display[]> {
  if (isTauriEnvironment()) {
    try {
      const displays = await invoke<Display[]>('get_displays')
      if (Array.isArray(displays) && displays.length > 0) {
        log.info('Displays refreshed', { count: displays.length })
        useAppStore.getState().setDisplays(displays)
        return displays
      }
    } catch (error) {
      log.warn('Displays invoke error', { error: String(error) })
    }
  }

  // Fallback for browser preview or non-Tauri mode
  const current = useAppStore.getState().displays
  if (current.length === 0) {
    const fallbackDisplays: Display[] = [
      {
        id: 'display-0',
        name: 'Primary Display',
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        scale: 1.0,
        dpi: 96,
        isPrimary: true,
        orientation: 'landscape',
        refreshRate: 144,
      },
    ]
    useAppStore.getState().setDisplays(fallbackDisplays)
    return fallbackDisplays
  }
  return current
}

/**
 * Fetch performance metrics from Tauri backend
 */
export async function fetchPerformanceMetrics(): Promise<PerformanceMetrics | null> {
  if (isTauriEnvironment()) {
    try {
      const rawMetrics = await invoke<{
        fps: number
        cpuUsage: number
        memoryUsage: number
        gpuUsage?: number
        battery?: number
        powerState: string
        timestamp: number
      }>('get_performance_metrics')

      if (rawMetrics) {
        const metrics: PerformanceMetrics = {
          fps: rawMetrics.fps,
          cpuUsage: rawMetrics.cpuUsage,
          memoryUsage: rawMetrics.memoryUsage,
          gpuUsage: rawMetrics.gpuUsage,
          battery: rawMetrics.battery,
          powerState: rawMetrics.powerState as PerformanceMetrics['powerState'],
          timestamp: new Date(rawMetrics.timestamp * 1000),
        }
        useAppStore.getState().setMetrics(metrics)
        return metrics
      }
    } catch (error) {
      console.warn('Metrics invoke error:', error)
    }
  }

  // Fallback metrics for preview/testing
  const fallbackMetrics: PerformanceMetrics = {
    fps: 60.0,
    cpuUsage: 18.4,
    memoryUsage: 42.1,
    gpuUsage: 12.0,
    battery: 95.0,
    powerState: 'normal',
    timestamp: new Date(),
  }
  useAppStore.getState().setMetrics(fallbackMetrics)
  return fallbackMetrics
}

/**
 * Apply image directly as the active Windows Desktop Wallpaper
 */
export async function setSystemWallpaper(path: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('set_system_wallpaper', { path })
      return true
    } catch (error) {
      console.warn('set_system_wallpaper error:', error)
      return false
    }
  }
  console.info('Simulated setting system wallpaper:', path)
  return true
}

/**
 * Apply Base64 Canvas data directly as the active Windows Desktop Wallpaper
 */
export async function setWallpaperFromCanvas(imageBase64: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('set_wallpaper_from_canvas', { imageBase64 })
      return true
    } catch (error) {
      console.warn('set_wallpaper_from_canvas error:', error)
      return false
    }
  }
  console.info('Simulated setting wallpaper from canvas base64')
  return true
}

/**
 * Start wallpaper host window via Tauri backend
 */
export async function startWallpaperHost(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('start_wallpaper_host')
      useAppStore.getState().setIsHostRunning(true)
      return true
    } catch (error) {
      console.warn('start_wallpaper_host error:', error)
    }
  }
  useAppStore.getState().setIsHostRunning(true)
  return true
}

/**
 * Stop wallpaper host window via Tauri backend
 */
export async function stopWallpaperHost(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('stop_wallpaper_host')
      useAppStore.getState().setIsHostRunning(false)
      return true
    } catch (error) {
      console.warn('stop_wallpaper_host error:', error)
    }
  }
  useAppStore.getState().setIsHostRunning(false)
  return true
}

/**
 * Listen for native Windows display change events emitted by Tauri backend
 */
export function attachDisplayChangeListener(): () => void {
  if (!isTauriEnvironment()) {
    return () => undefined
  }

  let isActive = true

  const setup = async (): Promise<(() => void) | undefined> => {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen('display_change', (event) => {
        const payload = event.payload as { displays?: Display[] }
        if (!isActive || !payload.displays) return

        const nextDisplays = payload.displays
        useAppStore.getState().setDisplays(nextDisplays)
      })

      return unlisten
    } catch (error) {
      console.warn('Display change listener unavailable:', error)
      return () => undefined
    }
  }

  let cleanup: (() => void) | undefined
  setup().then((fn) => {
    cleanup = fn
  })

  return () => {
    isActive = false
    cleanup?.()
  }
}
