import { describe, it, expect } from 'vitest'
import {
  sceneToWallpaper,
  schemaDefaults,
  toSceneSettings,
  sceneIsBroken,
  isPhotoType,
  isSceneType,
  DEFAULT_PHOTO_SCHEMA,
} from '../libraryContent'
import type { LibraryScene } from '@/types/content'

const photoScene: LibraryScene = {
  id: 'alpine-lake',
  title: 'Alpine Reflection',
  description: 'A cinematic alpine lake.',
  author: 'Luma Studio',
  category: 'Nature',
  tags: ['mountains', 'lake'],
  type: 'photo',
  source: 'builtin',
  files: { image: 'C:/library/alpine-lake/image.png', depth: 'C:/library/alpine-lake/depth.png', thumbnail: 'C:/library/alpine-lake/thumbnail.jpg' },
  resolution: '1600x900',
  aspectRatio: '16:9',
  interactive: true,
  featured: true,
  settings: DEFAULT_PHOTO_SCHEMA,
}

const sceneScene: LibraryScene = {
  id: 'cosmic',
  title: 'Cosmic Particles',
  author: 'Luma Studio',
  category: 'Space',
  tags: ['webgl'],
  type: 'webgl',
  source: 'builtin',
  files: { scene: 'C:/library/scenes/cosmic/index.html', thumbnail: 'C:/library/scenes/cosmic/thumb.jpg' },
  interaction: { mouseParallax: true, clickEffects: true },
  settings: [
    { id: 'density', type: 'slider', label: 'Density', min: 10, max: 200, default: 80 },
    { id: 'clickBurst', type: 'boolean', label: 'Click Burst', default: true },
  ],
}

// The manifest generator / Rust scanner null-out assets that don't exist on
// disk, so broken scenes surface with empty file entries.
const brokenScene: LibraryScene = {
  id: 'broken',
  title: 'Broken',
  author: 'QA',
  category: 'Nature',
  tags: [],
  type: 'html',
  source: 'builtin',
  files: {},
}

describe('content type guards', () => {
  it('recognizes photo/animated content', () => {
    expect(isPhotoType('photo')).toBe(true)
    expect(isPhotoType('animated')).toBe(true)
    expect(isPhotoType('webgl')).toBe(false)
    expect(isPhotoType(undefined)).toBe(false)
  })

  it('recognizes scene content', () => {
    expect(isSceneType('webgl')).toBe(true)
    expect(isSceneType('html')).toBe(true)
    expect(isSceneType('interactive')).toBe(true)
    expect(isSceneType('photo')).toBe(false)
  })
})

describe('schema defaults', () => {
  it('derives defaults for every schema type', () => {
    const d = schemaDefaults([
      { id: 'a', type: 'slider', label: 'A', min: 0, max: 10, default: 5 },
      { id: 'b', type: 'boolean', label: 'B', default: true },
      { id: 'c', type: 'select', label: 'C', default: 'x', options: [{ value: 'x', label: 'X' }] },
      { id: 'd', type: 'text', label: 'D' },
      { id: 'e', type: 'color', label: 'E' },
    ])
    expect(d).toEqual({ a: 5, b: true, c: 'x', d: '', e: '#ffffff' })
  })
})

describe('sceneToWallpaper', () => {
  it('maps a photo scene into the unified Wallpaper record', () => {
    const wp = sceneToWallpaper(photoScene)
    expect(wp.id).toBe('lib-builtin-alpine-lake')
    expect(wp.name).toBe('Alpine Reflection')
    expect(wp.contentType).toBe('photo')
    expect(wp.contentUrl).toContain('image.png')
    expect(wp.depthUrl).toContain('depth.png')
    expect(wp.resolution).toBe('1600x900')
    expect(wp.isFeatured).toBe(true)
    expect(wp.supportsMouse).toBe(true)
    expect(wp.libraryBroken).toBe(false)
    expect(wp.settingSchema?.length).toBe(DEFAULT_PHOTO_SCHEMA.length)
  })

  it('defaults photo settings from the declared schema', () => {
    const wp = sceneToWallpaper(photoScene)
    const s = wp.settings as unknown as Record<string, unknown>
    expect(s.motion).toBe(35)
    expect(s.parallax).toBe(45)
  })

  it('maps a webgl scene with interaction capabilities', () => {
    const wp = sceneToWallpaper(sceneScene)
    expect(wp.contentType).toBe('webgl')
    expect(wp.interaction?.clickEffects).toBe(true)
    expect(wp.sceneFileUrl).toContain('index.html')
    expect(wp.settings).toBeDefined()
  })

  it('flags scenes with missing assets as broken', () => {
    expect(sceneIsBroken(brokenScene)).toBe(true)
    const wp = sceneToWallpaper(brokenScene)
    expect(wp.libraryBroken).toBe(true)
  })
})

describe('toSceneSettings', () => {
  it('merges persisted values over schema defaults', () => {
    const schema = DEFAULT_PHOTO_SCHEMA
    const merged = toSceneSettings({ motion: 70, particles: 'rain' }, schema)
    expect(merged.motion).toBe(70)
    expect(merged.particles).toBe('rain')
    expect(merged.parallax).toBe(45) // default preserved
  })

  it('returns defaults when no persisted settings exist', () => {
    const merged = toSceneSettings(undefined, DEFAULT_PHOTO_SCHEMA)
    expect(merged.vignette).toBe(true)
  })
})
