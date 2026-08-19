/**
 * LumaWall content library data model.
 *
 * Wallpapers are treated as CONTENT — folders on disk described by a
 * `metadata.json` — rather than hard-coded UI. The library is discovered
 * at runtime (Rust filesystem scan in Tauri, generated manifest in the
 * browser preview), so new content appears without touching app code.
 */

/** Kind of renderer a scene uses. */
export type ContentType =
  | 'photo' // real photograph + optional depth map, rendered with cinematic motion
  | 'video' // mp4 / webm looped on the desktop
  | 'animated' // animated image / image-sequence style content
  | 'webgl' // self-contained WebGL scene (index.html)
  | 'html' // self-contained HTML scene (index.html)
  | 'interactive' // HTML scene that declares an interaction API
  | 'engine' // built-in procedural canvas engines (existing LumaWall collection)

/** Where a scene came from. `builtin` ships with the app; `user` is imported. */
export type SceneSource = 'builtin' | 'user'

/** A single dynamic, metadata-driven setting control. */
export interface SettingSchema {
  id: string
  type: 'slider' | 'boolean' | 'select' | 'color' | 'text'
  label: string
  min?: number
  max?: number
  step?: number
  default?: string | number | boolean
  options?: { value: string; label: string }[]
}

/** Interaction capabilities a scene declares. Only these are wired up. */
export interface SceneInteraction {
  mouseParallax?: boolean
  mouseGlow?: boolean
  clickEffects?: boolean
  audioReactive?: boolean
}

/** Asset file names inside a wallpaper folder. */
export interface SceneFiles {
  /** Primary visual (photo: the photograph; scene: entry html). */
  image?: string
  /** Optional grayscale depth map (bright = far). Drives 2.5D parallax. */
  depth?: string
  /** Optimized thumbnail used by the Library UI. */
  thumbnail?: string
  /** Optional short video preview. */
  preview?: string
  /** Entry point for webgl/html/interactive scenes. */
  scene?: string
}

/** Wallpaper lifecycle + performance budget hint. */
export type PerfEstimate = 'low' | 'medium' | 'high'

/**
 * On-disk wallpaper scene (the unit of library content).
 * Mirrors `library/.../<id>/metadata.json` plus resolved absolute paths
 * returned by the Rust scanner.
 */
export interface LibraryScene {
  id: string
  title: string
  description?: string
  author: string
  category: string
  tags: string[]
  type: ContentType
  source: SceneSource
  /** Absolute paths (Tauri) or origin-relative URLs (browser manifest). */
  files: SceneFiles
  resolution?: string
  aspectRatio?: string
  fps?: number
  interactive?: boolean
  audio?: boolean
  featured?: boolean
  recommended?: boolean
  favorite?: boolean
  version?: string
  createdAt?: string
  interaction?: SceneInteraction
  /** Dynamic customization controls; absent = sensible defaults per type. */
  settings?: SettingSchema[]
  perfEstimate?: PerfEstimate
  /** Absolute directory path when discovered by the Rust scanner. */
  basePath?: string
}

/** Flat key/value settings instance (values map to a SettingSchema). */
export type SceneSettings = Record<string, string | number | boolean>

/**
 * A scene's declared motion/atmosphere capabilities. The UI only exposes
 * what the scene supports; unknown capabilities are ignored.
 */
export interface SceneCapabilities {
  depth?: boolean // depth map present → real 2.5D parallax available
  particles?: string[] // ['rain', 'snow', 'dust', 'lightRays']
  motion?: boolean // 2D cinematic camera drift available
  colorGrading?: boolean
}

// ─── Multi-Layer Depth System ──────────────────────────────────────────────

/** A single layer in a multi-layer depth scene. */
export interface DepthLayer {
  /** Unique id for this layer. */
  id: string
  /** Display name (e.g. "Sky", "Mountains", "Trees"). */
  name: string
  /** Asset filename within the scene folder (e.g. "sky.webp"). */
  asset: string
  /** Depth value 0..1 where 0 = closest (foreground), 1 = farthest (background). */
  depth: number
  /** Vertical offset in pixels (positive = down). */
  offsetY?: number
  /** Scale factor (1.0 = original size). */
  scale?: number
  /** Opacity 0..1. */
  opacity?: number
  /** Whether this layer should be blurred based on depth (depth-of-field). */
  blurByDepth?: boolean
}

/** Quality preset for the depth renderer. */
export type DepthQuality = 'low' | 'medium' | 'high'

/** Configuration for the multi-layer depth renderer. */
export interface DepthConfig {
  /** Layers sorted back-to-front (index 0 = farthest). */
  layers: DepthLayer[]
  /** Quality preset affecting resolution and sample count. */
  quality: DepthQuality
  /** Maximum parallax displacement in pixels at full mouse deflection. */
  maxDisplacement?: number
  /** Enable depth-aware fog between layers. */
  fog?: boolean
  /** Fog color (hex). */
  fogColor?: string
  /** Fog density 0..1. */
  fogDensity?: number
}

/** Quality preset presets with concrete rendering parameters. */
export const DEPTH_QUALITY_PRESETS: Record<DepthQuality, {
  canvasScale: number
  maxDisplacement: number
  fogSamples: number
}> = {
  low: {
    canvasScale: 0.5,
    maxDisplacement: 30,
    fogSamples: 4,
  },
  medium: {
    canvasScale: 0.75,
    maxDisplacement: 60,
    fogSamples: 8,
  },
  high: {
    canvasScale: 1.0,
    maxDisplacement: 100,
    fogSamples: 16,
  },
}
