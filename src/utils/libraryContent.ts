import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { isTauriEnvironment } from '@stores/appStore'
import type {
  LibraryScene,
  SceneSettings,
  SettingSchema,
} from '@/types/content'
import type { Wallpaper } from '@/types/index'

// ─── Discovery ─────────────────────────────────────────────────────────────────

/**
 * Discover every valid wallpaper scene.
 *
 * Tauri: the Rust backend scans the library folders on disk (filesystem is the
 * source of truth; new folders appear without code changes).
 * Browser preview: reads `public/library/manifest.json` (regenerate with
 * `node scripts/build-library-manifest.mjs` after adding content).
 */
export async function fetchLibraryScenes(): Promise<LibraryScene[]> {
  if (isTauriEnvironment()) {
    try {
      const scenes = await invoke<LibraryScene[]>('scan_library')
      if (Array.isArray(scenes) && scenes.length >= 0) {
        return scenes
      }
    } catch (err) {
      console.warn('scan_library failed, falling back to manifest:', err)
    }
  }

  try {
    const res = await fetch(`/library/manifest.json?t=${Date.now()}`)
    if (!res.ok) return []
    const manifest = (await res.json()) as { scenes?: LibraryScene[] }
    return manifest.scenes ?? []
  } catch (err) {
    console.warn('library manifest unavailable:', err)
    return []
  }
}

// ─── Asset URL resolution ──────────────────────────────────────────────────────

/**
 * Resolve a scene asset path to a URL usable in the app UI.
 * Tauri scan results contain absolute filesystem paths → convertFileSrc.
 * Browser manifest results are already origin-relative URLs.
 */
export function resolveAssetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('/') || path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }
  if (isTauriEnvironment()) {
    try {
      return convertFileSrc(path)
    } catch {
      return path
    }
  }
  return path
}

/** Build a `file:///` URL from an absolute Windows path (for the wallpaper HTML). */
export function toFileUrl(absPath: string | undefined): string | undefined {
  if (!absPath) return undefined
  if (absPath.startsWith('file:') || absPath.startsWith('/') || absPath.startsWith('http')) return absPath
  return `file:///${encodeURI(absPath.replace(/\\/g, '/'))}`
}

// ─── Settings / schema helpers ─────────────────────────────────────────────────

/** Default photo scene settings (2D cinematic motion + overlays). */
export const DEFAULT_PHOTO_SETTINGS: SceneSettings = {
  motion: 35,
  parallax: 45,
  zoom: 8,
  atmosphere: 20,
  particles: 'none',
  lightRays: false,
  vignette: true,
  warmth: 0,
  quality: 'medium',
  fog: true,
}

/** Default settings for HTML/WebGL scenes. */
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  density: 80,
  speed: 40,
  mouseGlow: true,
  clickBurst: true,
}

export const DEFAULT_SCENE_SCHEMA: SettingSchema[] = [
  { id: 'density', type: 'slider', label: 'Density', min: 10, max: 200, step: 5, default: 80 },
  { id: 'speed', type: 'slider', label: 'Drift Speed', min: 0, max: 100, step: 1, default: 40 },
  { id: 'mouseGlow', type: 'boolean', label: 'Mouse Glow', default: true },
  { id: 'clickBurst', type: 'boolean', label: 'Click Burst', default: true },
]

export const DEFAULT_PHOTO_SCHEMA: SettingSchema[] = [
  { id: 'motion', type: 'slider', label: 'Motion', min: 0, max: 100, step: 1, default: 35 },
  { id: 'parallax', type: 'slider', label: 'Depth Parallax', min: 0, max: 100, step: 1, default: 45 },
  { id: 'zoom', type: 'slider', label: 'Cinematic Zoom', min: 0, max: 30, step: 1, default: 8 },
  { id: 'atmosphere', type: 'slider', label: 'Atmosphere', min: 0, max: 100, step: 1, default: 20 },
  {
    id: 'particles', type: 'select', label: 'Particles', default: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'dust', label: 'Floating Dust' },
      { value: 'snow', label: 'Snowfall' },
      { value: 'rain', label: 'Rain' },
    ],
  },
  { id: 'lightRays', type: 'boolean', label: 'Light Rays', default: false },
  { id: 'vignette', type: 'boolean', label: 'Vignette', default: true },
  { id: 'warmth', type: 'slider', label: 'Warmth', min: -30, max: 30, step: 1, default: 0 },
  {
    id: 'quality', type: 'select', label: 'Render Quality', default: 'medium',
    options: [
      { value: 'low', label: 'Low (battery-friendly)' },
      { value: 'medium', label: 'Medium (balanced)' },
      { value: 'high', label: 'High (best quality)' },
    ],
  },
  { id: 'fog', type: 'boolean', label: 'Depth Fog', default: true },
]

export function isPhotoType(type: string | undefined): boolean {
  return type === 'photo' || type === 'animated'
}

export function isSceneType(type: string | undefined): boolean {
  return type === 'webgl' || type === 'html' || type === 'interactive'
}

/** Schema for a scene: metadata-declared settings, or per-type defaults. */
export function getSceneSchema(scene: LibraryScene): SettingSchema[] {
  if (scene.settings && scene.settings.length > 0) return scene.settings
  if (isPhotoType(scene.type)) return DEFAULT_PHOTO_SCHEMA
  return DEFAULT_SCENE_SCHEMA
}

/** Default settings values derived from the schema. */
export function schemaDefaults(schema: SettingSchema[]): SceneSettings {
  const out: SceneSettings = {}
  for (const s of schema) {
    if (s.default !== undefined) out[s.id] = s.default
    else if (s.type === 'boolean') out[s.id] = false
    else if (s.type === 'slider') out[s.id] = s.min ?? 0
    else if (s.type === 'select') out[s.id] = s.options?.[0]?.value ?? ''
    else if (s.type === 'text') out[s.id] = ''
    else if (s.type === 'color') out[s.id] = '#ffffff'
  }
  return out
}

/** True when a scene's primary asset is missing (broken content). */
export function sceneIsBroken(scene: LibraryScene): boolean {
  const f = scene.files
  if (isPhotoType(scene.type)) return !f.image
  if (isSceneType(scene.type)) return !f.scene
  if (scene.type === 'video') return !f.preview && !f.image
  return false
}

// ─── Photo import ─────────────────────────────────────────────────────────────

export interface SelectedImageInfo {
  path: string
  name: string
  extension: string
}

/** Open the native Windows file dialog for an image. */
export async function pickImageFileDialog(): Promise<SelectedImageInfo | null> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<SelectedImageInfo | null>('pick_image_file')
    } catch (err) {
      console.warn('pick_image_file failed:', err)
    }
  }
  return null
}

/**
 * Import an image into the user library (Tauri): copies the file, writes
 * metadata.json, then generates + saves a thumbnail. Returns the new scene.
 */
export async function importPhotoWallpaper(
  path: string,
  title?: string,
): Promise<LibraryScene | null> {
  if (!isTauriEnvironment()) return null
  try {
    const scene = await invoke<LibraryScene>('import_wallpaper_file', { path, title })
    if (!scene?.files?.image) return scene

    // Generate a JPEG thumbnail from the copied file via canvas, then persist it.
    try {
      const imgUrl = convertFileSrc(scene.files.image)
      const dataUrl = await imageToThumbnailDataUrl(imgUrl)
      if (dataUrl) {
        scene.files.thumbnail = await invoke<string>('save_thumbnail', {
          imagePath: scene.files.image,
          dataBase64: dataUrl,
        })
      }
    } catch (err) {
      console.warn('thumbnail generation failed:', err)
    }
    return scene
  } catch (err) {
    console.warn('import_wallpaper_file failed:', err)
    return null
  }
}

/** Load an image URL, downscale to a 640px JPEG data URL. */
function imageToThumbnailDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, 640 / img.naturalWidth)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// ─── Scene → Wallpaper mapping ────────────────────────────────────────────────

/** Convert a discovered scene into the store's unified Wallpaper record. */
export function sceneToWallpaper(scene: LibraryScene): Wallpaper {
  const schema = getSceneSchema(scene)
  const settings = schemaDefaults(schema)
  const isPhoto = isPhotoType(scene.type)
  const isScene = isSceneType(scene.type)
  const isVideo = scene.type === 'video'

  const contentUrl = resolveAssetUrl(isScene ? scene.files.scene : isPhoto ? scene.files.image : scene.files.preview ?? scene.files.image)
  const depthUrl = resolveAssetUrl(scene.files.depth)
  const thumbnail = resolveAssetUrl(scene.files.thumbnail)

  return {
    id: `lib-${scene.source}-${scene.id}`,
    name: scene.title,
    author: scene.author,
    version: scene.version ?? '1.0.0',
    description: scene.description,
    type: isVideo ? 'video' : 'web',
    thumbnail,
    created: scene.createdAt ? new Date(scene.createdAt) : new Date(),
    modified: new Date(),
    isFavorite: scene.favorite ?? false,
    tags: scene.tags ?? [],
    contentType: scene.type,
    librarySource: scene.source,
    contentUrl,
    contentFileUrl: isScene ? scene.files.scene : isPhoto ? scene.files.image : undefined,
    depthUrl,
    depthFileUrl: scene.files.depth,
    sceneFileUrl: scene.files.scene,
    videoPath: isVideo ? scene.files.preview : undefined,
    filePath: isVideo ? scene.files.preview : scene.files.image,
    resolution: scene.resolution,
    aspectRatio: scene.aspectRatio,
    settingSchema: schema,
    settings: settings as unknown as Wallpaper['settings'],
    perfEstimate: scene.perfEstimate,
    interaction: scene.interaction,
    isFeatured: scene.featured ?? false,
    isRecommended: scene.recommended ?? false,
    supportsMouse: scene.interactive ?? false,
    supportsAudio: scene.audio ?? false,
    basePath: scene.basePath,
    libraryBroken: sceneIsBroken(scene),
  }
}

/** Normalize the schema-defaults shape back into a flat SceneSettings object. */
export function toSceneSettings(
  raw: Record<string, unknown> | undefined,
  schema: SettingSchema[],
): SceneSettings {
  const defaults = schemaDefaults(schema)
  if (!raw) return defaults
  const out: SceneSettings = { ...defaults }
  for (const s of schema) {
    const v = raw[s.id]
    if (v !== undefined && v !== null) {
      if (s.type === 'boolean') out[s.id] = Boolean(v)
      else if (s.type === 'slider' || s.type === 'color') out[s.id] = v as string | number
      else out[s.id] = v as string
    }
  }
  return out
}
