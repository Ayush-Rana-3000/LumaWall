import { invoke } from '@tauri-apps/api/core'
import { isTauriEnvironment } from '@stores/appStore'

/** Shape of the persisted wallpaper state on disk. */
interface PersistedWallpaperState {
  wallpaperId: string | null
  settings: Record<string, unknown> | null
  isRunning: boolean
  displayAssignments: Record<string, string> | null
  displayMode: string | null
}

/** Save the current wallpaper assignment to disk so it survives app restarts. */
export async function saveWallpaperState(
  wallpaperId: string | null,
  settings: Record<string, unknown> | null,
  isRunning: boolean,
  displayAssignments?: Record<string, string> | null,
  displayMode?: string | null,
): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('save_wallpaper_state', {
        wallpaperId,
        settings: settings ?? null,
        isRunning,
        displayAssignments: displayAssignments ?? null,
        displayMode: displayMode ?? null,
      })
    } catch (err) {
      console.warn('save_wallpaper_state failed:', err)
    }
  }
}

/** Load the persisted wallpaper state from disk. */
export async function loadWallpaperState(): Promise<PersistedWallpaperState> {
  if (isTauriEnvironment()) {
    try {
      const state = await invoke<PersistedWallpaperState>('load_wallpaper_state')
      return state
    } catch (err) {
      console.warn('load_wallpaper_state failed:', err)
    }
  }
  return { wallpaperId: null, settings: null, isRunning: false, displayAssignments: null, displayMode: null }
}

/** Check if a live wallpaper window is currently running behind desktop icons. */
export async function isWallpaperRunning(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<boolean>('is_wallpaper_running')
    } catch (err) {
      console.warn('is_wallpaper_running failed:', err)
    }
  }
  return false
}

/** Save a per-display wallpaper assignment. */
export async function saveDisplayAssignment(
  displayId: string,
  wallpaperId: string | null,
): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('save_display_assignment', { displayId, wallpaperId })
    } catch (err) {
      console.warn('save_display_assignment failed:', err)
    }
  }
}

/** Save the display mode (independent, clone, or span). */
export async function saveDisplayMode(mode: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('save_display_mode', { mode })
    } catch (err) {
      console.warn('save_display_mode failed:', err)
    }
  }
}
