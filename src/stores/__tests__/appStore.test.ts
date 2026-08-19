import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useAppStore,
  refreshDisplays,
  fetchPerformanceMetrics,
  startWallpaperHost,
  stopWallpaperHost,
  setSystemWallpaper,
  setWallpaperFromCanvas,
  attachDisplayChangeListener,
} from '../appStore'
import type { Display, Wallpaper, PerformanceMetrics } from '@/types/index'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useAppStore.setState({
      currentRoute: 'dashboard',
      displays: [],
      activeDisplayId: null,
      wallpapers: [],
      currentWallpaperId: null,
      isHostRunning: false,
      metrics: null,
    })
  })

  it('updates currentRoute correctly', () => {
    const { setCurrentRoute } = useAppStore.getState()
    setCurrentRoute('library')
    expect(useAppStore.getState().currentRoute).toBe('library')

    setCurrentRoute('displays')
    expect(useAppStore.getState().currentRoute).toBe('displays')

    setCurrentRoute('creator')
    expect(useAppStore.getState().currentRoute).toBe('creator')
  })

  it('manages wallpapers correctly', () => {
    const { addWallpaper, updateWallpaper, removeWallpaper, setCurrentWallpaperId } =
      useAppStore.getState()

    const sampleWallpaper: Wallpaper = {
      id: 'test-wp-1',
      name: 'Test Wallpaper',
      author: 'Tester',
      version: '1.0.0',
      description: 'A test wallpaper',
      type: 'web',
      created: new Date(),
      modified: new Date(),
      isFavorite: false,
      tags: ['test'],
    }

    addWallpaper(sampleWallpaper)
    expect(useAppStore.getState().wallpapers).toHaveLength(1)
    expect(useAppStore.getState().wallpapers[0].name).toBe('Test Wallpaper')

    setCurrentWallpaperId('test-wp-1')
    expect(useAppStore.getState().currentWallpaperId).toBe('test-wp-1')

    updateWallpaper('test-wp-1', { isFavorite: true, version: '1.1.0' })
    const updated = useAppStore.getState().wallpapers.find((w) => w.id === 'test-wp-1')
    expect(updated?.isFavorite).toBe(true)
    expect(updated?.version).toBe('1.1.0')

    removeWallpaper('test-wp-1')
    expect(useAppStore.getState().wallpapers).toHaveLength(0)
  })

  it('manages displays and automatically selects active display', () => {
    const { setDisplays, setActiveDisplayId } = useAppStore.getState()

    const sampleDisplays: Display[] = [
      {
        id: 'display-0',
        name: 'Main Monitor',
        width: 2560,
        height: 1440,
        x: 0,
        y: 0,
        scale: 1.0,
        dpi: 96,
        isPrimary: true,
        orientation: 'landscape',
        refreshRate: 165,
      },
      {
        id: 'display-1',
        name: 'Secondary Monitor',
        width: 1920,
        height: 1080,
        x: 2560,
        y: 0,
        scale: 1.0,
        dpi: 96,
        isPrimary: false,
        orientation: 'landscape',
        refreshRate: 60,
      },
    ]

    setDisplays(sampleDisplays)
    expect(useAppStore.getState().displays).toHaveLength(2)
    expect(useAppStore.getState().activeDisplayId).toBe('display-0')

    setActiveDisplayId('display-1')
    expect(useAppStore.getState().activeDisplayId).toBe('display-1')
  })

  it('updates performance metrics correctly', () => {
    const { setMetrics } = useAppStore.getState()

    const sampleMetrics: PerformanceMetrics = {
      fps: 59.8,
      cpuUsage: 14.2,
      memoryUsage: 38.5,
      gpuUsage: 8.0,
      battery: 92.0,
      powerState: 'normal',
      timestamp: new Date(),
    }

    setMetrics(sampleMetrics)
    expect(useAppStore.getState().metrics).toEqual(sampleMetrics)
    expect(useAppStore.getState().metrics?.fps).toBe(59.8)
  })

  it('updates settings and UI toggles', () => {
    const { updateSettings, toggleSidebar, setIsLoading } = useAppStore.getState()

    updateSettings({ volume: 0.5, theme: 'light', pauseOnGameDetected: true })
    expect(useAppStore.getState().settings.volume).toBe(0.5)
    expect(useAppStore.getState().settings.theme).toBe('light')
    expect(useAppStore.getState().settings.pauseOnGameDetected).toBe(true)

    const initialSidebar = useAppStore.getState().sidebarOpen
    toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(!initialSidebar)

    setIsLoading(true)
    expect(useAppStore.getState().isLoading).toBe(true)
  })
})

describe('Backend integration bridge functions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('refreshDisplays returns displays with fallback if backend is unavailable', async () => {
    const displays = await refreshDisplays()
    expect(displays.length).toBeGreaterThan(0)
    expect(displays[0].id).toBeDefined()
    expect(displays[0].width).toBeGreaterThan(0)
  })

  it('fetchPerformanceMetrics returns metrics with fallback', async () => {
    const metrics = await fetchPerformanceMetrics()
    expect(metrics).not.toBeNull()
    expect(metrics?.fps).toBeGreaterThanOrEqual(0)
    expect(metrics?.cpuUsage).toBeGreaterThanOrEqual(0)
    expect(metrics?.memoryUsage).toBeGreaterThanOrEqual(0)
  })

  it('startWallpaperHost and stopWallpaperHost manage host state cleanly', async () => {
    await startWallpaperHost()
    expect(useAppStore.getState().isHostRunning).toBe(true)

    await stopWallpaperHost()
    expect(useAppStore.getState().isHostRunning).toBe(false)
  })

  it('setSystemWallpaper and setWallpaperFromCanvas execute successfully', async () => {
    const sysResult = await setSystemWallpaper('C:\\wallpaper.png')
    expect(sysResult).toBe(true)

    const canvasResult = await setWallpaperFromCanvas('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')
    expect(canvasResult).toBe(true)
  })

  it('attachDisplayChangeListener initializes and returns a cleanup function', () => {
    const cleanup = attachDisplayChangeListener()
    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
