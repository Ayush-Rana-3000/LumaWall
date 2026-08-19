/**
 * Core type definitions for LumaWall application
 */

/**
 * Represents a single display/monitor
 */
export interface Display {
  id: string
  name: string
  width: number
  height: number
  x: number
  y: number
  scale: number
  dpi: number
  isPrimary: boolean
  orientation: 'landscape' | 'portrait'
  refreshRate?: number
}

/**
 * Live wallpaper customization settings.
 */
export interface WallpaperSettings {
  primaryColor: string
  secondaryColor: string
  speed: number
  density: number
  glow: number
  customText: string
  interactive: boolean
}

/**
 * Wallpaper metadata
 */
export interface Wallpaper {
  id: string
  name: string
  author: string
  version: string
  description?: string
  type: 'video' | 'web' | 'native'
  thumbnail?: string
  created: Date
  modified: Date
  isFavorite: boolean
  tags: string[]
  runtime?: string
  videoPath?: string
  filePath?: string
  engineType?: string
  settings?: WallpaperSettings
  isFeatured?: boolean
  category?: string
  supportsAudio?: boolean
  supportsMouse?: boolean
  supportsSystem?: boolean
  /** Precise content type — content-library scenes (photo/video/webgl/html/interactive) vs engine. */
  contentType?: string
  /** builtin | user — where this wallpaper came from. */
  librarySource?: string
  /** App-usable URL of the primary asset (photo image / scene entry). */
  contentUrl?: string
  /** Absolute path of the primary asset (used to build the desktop wallpaper HTML). */
  contentFileUrl?: string
  /** App-usable URL of the optional depth map. */
  depthUrl?: string
  /** Absolute path of the depth map. */
  depthFileUrl?: string
  /** Absolute path of the scene entry html (webgl/html/interactive). */
  sceneFileUrl?: string
  /** Display resolution string, e.g. "3840x2160". */
  resolution?: string
  /** Aspect ratio string, e.g. "16:9". */
  aspectRatio?: string
  /** Dynamic customization schema (metadata-driven). */
  settingSchema?: import('./content').SettingSchema[]
  /** Declared interaction capabilities. */
  interaction?: import('./content').SceneInteraction
  /** Performance budget hint. */
  perfEstimate?: import('./content').PerfEstimate
  /** Recommended collection flag (metadata). */
  isRecommended?: boolean
  /** True when a required asset is missing → render error state, never crash. */
  libraryBroken?: boolean
  /** Absolute scene folder (user imports / discovery). */
  basePath?: string
}

/**
 * Wallpaper manifest (loaded from wallpaper package)
 */
export interface WallpaperManifest {
  id: string
  name: string
  author: string
  version: string
  description?: string
  type: 'video' | 'web' | 'native'
  runtime?: string
  thumbnail?: string
  supportsAudio?: boolean
  supportsMouse?: boolean
  supportsSystem?: boolean
  permissions?: WallpaperPermission[]
}

/**
 * Permissions that a wallpaper can request
 */
export type WallpaperPermission = 'mouse' | 'keyboard' | 'audio' | 'system' | 'time' | 'display'

/**
 * Wallpaper profile (grouping of settings)
 */
export interface WallpaperProfile {
  id: string
  name: string
  description?: string
  wallpaperId?: string
  displayAssignments: Record<string, string> // displayId -> wallpaperId
  settings: Record<string, unknown>
  performanceLevel: PerformanceLevel
  created: Date
  modified: Date
}

/**
 * Performance level/mode
 */
export type PerformanceLevel = 'high' | 'medium' | 'low' | 'battery' | 'auto'

/**
 * Runtime state of a wallpaper
 */
export interface WallpaperRuntimeState {
  wallpaperId: string
  displayId: string
  isRunning: boolean
  fps: number
  cpuUsage: number
  memoryUsage: number
  gpuUsage?: number
  uptime: number
  lastError?: string
}

/**
 * System performance metrics
 */
export interface PerformanceMetrics {
  fps: number
  cpuUsage: number
  memoryUsage: number
  gpuUsage?: number
  battery?: number
  powerState: PowerState
  timestamp: Date
}

/**
 * Power state of the system
 */
export type PowerState = 'normal' | 'battery' | 'lowBattery' | 'sleep' | 'locked'

/**
 * Application settings
 */
export interface AppSettings {
  performanceMode: PerformanceLevel
  enableOnStartup: boolean
  enableBatteryOptimization: boolean
  pauseOnFullscreen: boolean
  pauseOnGameDetected: boolean
  volume: number
  theme: 'dark' | 'light' | 'auto'
}

/**
 * Navigation routes
 */
export type NavRoute =
  | 'dashboard'
  | 'explore'
  | 'library'
  | 'favorites'
  | 'displays'
  | 'performance'
  | 'settings'
  | 'creator'

/**
 * Toast notification
 */
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}
