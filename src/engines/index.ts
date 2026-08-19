// Engine types and lifecycle
export type {
  EngineType,
  EngineCategory,
  EngineState,
  MouseState,
  ProceduralEngine,
  ContentEngine,
  ContentEngineType,
  AnyEngine,
  EngineRegistry,
  EngineLifecycle,
} from './types'

export { createEngineLifecycle } from './types'

// Engine registry (wraps procedural engines with lifecycle + error boundaries)
export {
  WALLPAPER_ENGINES,
  ALL_ENGINES,
  ENGINE_CATEGORIES,
  DEFAULT_WALLPAPER_SETTINGS,
  wallpaperFromEngine,
  getEngineLifecycle,
  resetEngineLifecycle,
  getEngineState,
  createSafeRender,
  getEngine,
  isProceduralEngine,
  ENGINE_TYPES,
} from './registry'
