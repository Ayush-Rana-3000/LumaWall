import type { WallpaperSettings } from '@/types/index'
import type {
  EngineType,
  EngineLifecycle,
  ProceduralEngine,
  MouseState,
} from './types'
import { createEngineLifecycle } from './types'

// ─── Re-export engine data from the existing source ─────────────────────────
// The 17 procedural engines remain in wallpaperEngines.ts (their render
// functions must be self-contained for toString() serialization). This
// registry wraps them with lifecycle management and error boundaries.

import {
  WALLPAPER_ENGINES,
  ALL_ENGINES,
  ENGINE_CATEGORIES,
  DEFAULT_WALLPAPER_SETTINGS,
  wallpaperFromEngine,
} from '@utils/wallpaperEngines'

export {
  WALLPAPER_ENGINES,
  ALL_ENGINES,
  ENGINE_CATEGORIES,
  DEFAULT_WALLPAPER_SETTINGS,
  wallpaperFromEngine,
}

// ─── Lifecycle Manager ──────────────────────────────────────────────────────

/** Active lifecycle instances keyed by engine id. */
const lifecycles = new Map<EngineType, EngineLifecycle>()

/**
 * Get or create the lifecycle manager for a procedural engine.
 * Each engine gets its own lifecycle instance that tracks state transitions.
 */
export function getEngineLifecycle(engineId: EngineType): EngineLifecycle {
  let lc = lifecycles.get(engineId)
  if (!lc) {
    lc = createEngineLifecycle()
    lifecycles.set(engineId, lc)
  }
  return lc
}

/** Reset the lifecycle for an engine (e.g. after a crash). */
export function resetEngineLifecycle(engineId: EngineType): void {
  lifecycles.delete(engineId)
}

/** Get the current state of an engine. */
export function getEngineState(engineId: EngineType): string {
  return getEngineLifecycle(engineId).getState()
}

// ─── Error-Bounded Render ───────────────────────────────────────────────────

/**
 * Wrap a procedural engine's render function with an error boundary.
 * If the engine throws, the error is caught, counted, and the frame is
 * skipped — the engine never crashes the wallpaper host or the app.
 */
export function createSafeRender(
  engine: ProceduralEngine,
): (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  opts: WallpaperSettings,
  mouse: MouseState,
) => void {
  let errorCount = 0
  const MAX_ERRORS = 10

  return (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    opts: WallpaperSettings,
    mouse: MouseState,
  ): void => {
    if (errorCount >= MAX_ERRORS) return
    try {
      engine.render(ctx, w, h, t, opts, mouse)
    } catch (err) {
      errorCount++
      if (errorCount === 1) {
        console.error(`Engine "${engine.id}" render error:`, err)
      }
    }
  }
}

// ─── Engine Lookup Helpers ──────────────────────────────────────────────────

/** Look up a procedural engine by id. Returns undefined for unknown ids. */
export function getEngine(id: string): ProceduralEngine | undefined {
  return WALLPAPER_ENGINES[id as EngineType]
}

/** Check if an engine id refers to a known procedural engine. */
export function isProceduralEngine(id: string): boolean {
  return id in WALLPAPER_ENGINES
}

/** All engine types as an array. */
export const ENGINE_TYPES: EngineType[] = Object.keys(WALLPAPER_ENGINES) as EngineType[]
