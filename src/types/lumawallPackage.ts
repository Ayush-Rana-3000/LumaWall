/**
 * .lumawall package format specification.
 *
 * A .lumawall file is a ZIP archive containing:
 *   manifest.json          — package metadata and settings
 *   thumbnail.webp|jpg     — card thumbnail (required)
 *   preview.mp4|webm       — optional short video preview
 *   wallpaper/             — scene assets (images, depth maps, HTML, etc.)
 *
 * The package is treated as UNTRUSTED INPUT — all paths are validated,
 * executable payloads are rejected, and extraction is atomic.
 */

// ─── Manifest ───────────────────────────────────────────────────────────────

export const LUMAWALL_FORMAT_VERSION = 1

export interface LumawallManifest {
  /** Format version — must match LUMAWALL_FORMAT_VERSION. */
  formatVersion: number
  /** Unique package id (e.g. "com.studio.alpine-lake"). */
  id: string
  /** Display title. */
  title: string
  /** Short description. */
  description?: string
  /** Creator / author name. */
  author: string
  /** License identifier (e.g. "MIT", "CC-BY-4.0", "Proprietary"). */
  license?: string
  /** Content category (Nature, Space, Abstract, etc.). */
  category: string
  /** Searchable tags. */
  tags: string[]
  /** Engine type: photo | video | webgl | html | interactive */
  engineType: string
  /** Supported screen resolutions (e.g. ["1920x1080", "3840x2160"]). */
  supportedResolutions?: string[]
  /** Thumbnail filename within the package. */
  thumbnail: string
  /** Optional preview video filename. */
  preview?: string
  /** Whether this package is recommended/featured. */
  featured?: boolean
  /** Package version (semantic versioning). */
  version: string
  /** Minimum LumaWall version required. */
  minAppVersion?: string
  /** Approximate resource tier: low | medium | high */
  perfEstimate?: string
  /** Whether the scene uses audio. */
  audio?: boolean
  /** Whether the scene is interactive (mouse/click). */
  interactive?: boolean
  /** Scene-specific settings schema (same format as library metadata). */
  settings?: Array<{
    id: string
    type: string
    label: string
    min?: number
    max?: number
    step?: number
    default?: string | number | boolean
    options?: Array<{ value: string; label: string }>
  }>
  /** Interaction capabilities. */
  interaction?: {
    mouseParallax?: boolean
    mouseGlow?: boolean
    clickEffects?: boolean
    audioReactive?: boolean
  }
}

// ─── Package File Entry ─────────────────────────────────────────────────────

export interface LumawallFileEntry {
  /** Relative path within the package. */
  path: string
  /** File size in bytes. */
  size: number
  /** MIME type if detectable. */
  mimeType?: string
}

// ─── Validation Result ──────────────────────────────────────────────────────

export interface LumawallValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  manifest?: LumawallManifest
  files?: LumawallFileEntry[]
}

// ─── Security Constants ─────────────────────────────────────────────────────

/** Maximum total package size (100 MB). */
export const MAX_PACKAGE_SIZE = 100 * 1024 * 1024

/** Maximum single file size within a package (50 MB). */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** Maximum number of files in a package. */
export const MAX_FILE_COUNT = 200

/** Blocked file extensions (executable payloads). */
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.ps1', '.sh', '.bash',
  '.dll', '.so', '.dylib', '.app', '.scr', '.pif', '.vbs', '.js',
  '.ws', '.wsh', '.wsf', '.hta', '.cpl', '.inf', '.reg', '.rgs',
]

/** Allowed asset extensions. */
export const ALLOWED_EXTENSIONS = [
  '.json', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
  '.mp4', '.webm', '.ogv', '.ogg', '.mp3', '.wav',
  '.html', '.htm', '.css', '.js', '.ts',
  '.glsl', '.vert', '.frag',
]

// ─── Validation Helpers ─────────────────────────────────────────────────────

/** Check if a filename has a blocked extension. */
export function hasBlockedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  return BLOCKED_EXTENSIONS.includes('.' + ext)
}

/** Check if a path attempts directory traversal. */
export function hasPathTraversal(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/')
  return normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized === '..' ||
    normalized.startsWith('/')
}

/** Validate a .lumawall manifest. */
export function validateManifest(manifest: unknown): LumawallValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not a valid JSON object'], warnings: [] }
  }

  const m = manifest as Record<string, unknown>

  // Required fields
  if (typeof m.formatVersion !== 'number') {
    errors.push('Missing or invalid formatVersion')
  } else if (m.formatVersion !== LUMAWALL_FORMAT_VERSION) {
    errors.push(`Unsupported format version: ${m.formatVersion} (expected ${LUMAWALL_FORMAT_VERSION})`)
  }

  if (typeof m.id !== 'string' || m.id.trim().length === 0) {
    errors.push('Missing or empty id')
  } else if (!/^[a-zA-Z0-9._-]+$/.test(m.id)) {
    errors.push('id contains invalid characters (use alphanumeric, dots, hyphens, underscores)')
  }

  if (typeof m.title !== 'string' || m.title.trim().length === 0) {
    errors.push('Missing or empty title')
  }

  if (typeof m.author !== 'string' || m.author.trim().length === 0) {
    errors.push('Missing or empty author')
  }

  if (typeof m.engineType !== 'string') {
    errors.push('Missing or invalid engineType')
  }

  if (typeof m.thumbnail !== 'string' || m.thumbnail.trim().length === 0) {
    errors.push('Missing or empty thumbnail filename')
  }

  // Warnings for optional fields
  if (typeof m.version !== 'string') {
    warnings.push('Missing version — defaulting to "1.0.0"')
  }
  if (typeof m.category !== 'string') {
    warnings.push('Missing category')
  }
  if (!Array.isArray(m.tags)) {
    warnings.push('Missing tags array')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: manifest as LumawallManifest,
  }
}
