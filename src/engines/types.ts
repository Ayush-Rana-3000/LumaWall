import type { WallpaperSettings } from '@/types/index'

// ─── Engine Categories ──────────────────────────────────────────────────────

export type EngineCategory = 'neon' | 'space' | 'nature' | 'abstract' | 'clock'

export type EngineType =
  | 'matrix'
  | 'sunset'
  | 'matrixRain'
  | 'circuit'
  | 'rings'
  | 'nebula'
  | 'stars'
  | 'tunnel'
  | 'aurora'
  | 'ocean'
  | 'rain'
  | 'snow'
  | 'fire'
  | 'particles'
  | 'waves'
  | 'hud'
  | 'fireworks'

// ─── Mouse State ────────────────────────────────────────────────────────────

export interface MouseState {
  x: number // 0..1 normalized
  y: number // 0..1 normalized
}

// ─── Engine Lifecycle ───────────────────────────────────────────────────────

/** Lifecycle states a wallpaper engine can be in. */
export type EngineState = 'idle' | 'loaded' | 'running' | 'paused' | 'stopped' | 'error'

/**
 * Lifecycle manager for a wallpaper engine.
 * Controls initialize → start → pause → resume → stop → destroy transitions.
 */
export interface EngineLifecycle {
  getState(): EngineState
  initialize(): void
  start(): void
  pause(): void
  resume(): void
  stop(): void
  destroy(): void
}

// ─── Procedural Engine (Canvas 2D) ─────────────────────────────────────────

/**
 * A procedural canvas engine. The render function is self-contained — it may
 * only use its parameters and globals like Math/performance. No closures over
 * external state, because it gets serialized via toString() for the desktop
 * wallpaper HTML.
 */
export interface ProceduralEngine {
  id: EngineType
  name: string
  category: EngineCategory
  description: string
  author: string
  tags: string[]
  isFeatured?: boolean
  defaultSettings: WallpaperSettings
  render: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    opts: WallpaperSettings,
    mouse: MouseState,
  ) => void
}

// ─── Content Engine (Photo / Video / Scene) ─────────────────────────────────

/**
 * Engine type for content-based wallpapers (photos with depth, video loops,
 * HTML/WebGL scenes). These don't have a canvas render function — they
 * generate HTML pages instead.
 */
export type ContentEngineType = 'photo' | 'video' | 'webgl' | 'html' | 'interactive'

export interface ContentEngine {
  type: ContentEngineType
  name: string
}

// ─── Unified Engine Record ──────────────────────────────────────────────────

/**
 * A unified engine record that can represent either a procedural engine
 * or a content-based engine. The UI uses this to display any wallpaper
 * regardless of its underlying rendering mechanism.
 */
export type AnyEngine = ProceduralEngine | ContentEngine

// ─── Engine Registry ────────────────────────────────────────────────────────

/**
 * The engine registry holds all known procedural engines.
 * Content-based engines are discovered at runtime from the library.
 */
export interface EngineRegistry {
  /** All procedural engines indexed by id. */
  procedural: Record<EngineType, ProceduralEngine>
  /** Flat list of all procedural engines. */
  all: ProceduralEngine[]
  /** Category filter definitions. */
  categories: { id: EngineCategory | 'all' | 'favorites'; name: string }[]
}

// ─── Engine Lifecycle Factory ───────────────────────────────────────────────

/** Create a lifecycle manager for any engine. */
export function createEngineLifecycle(): EngineLifecycle {
  let state: EngineState = 'idle'

  const validTransitions: Record<EngineState, EngineState[]> = {
    idle: ['loaded', 'error'],
    loaded: ['running', 'idle', 'error'],
    running: ['paused', 'stopped', 'error'],
    paused: ['running', 'stopped', 'error'],
    stopped: ['idle'],
    error: ['idle'],
  }

  function transition(to: EngineState): void {
    if (!validTransitions[state]?.includes(to)) {
      console.warn(`Engine lifecycle: invalid transition ${state} → ${to}`)
      return
    }
    state = to
  }

  return {
    getState: () => state,
    initialize: () => transition('loaded'),
    start: () => transition('running'),
    pause: () => transition('paused'),
    resume: () => transition('running'),
    stop: () => {
      state = 'idle'
    },
    destroy: () => {
      state = 'idle'
    },
  }
}
