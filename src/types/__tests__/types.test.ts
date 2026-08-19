import { describe, it, expect } from 'vitest'
import type {
  Display,
  Wallpaper,
  WallpaperManifest,
  WallpaperProfile,
  PerformanceMetrics,
  AppSettings,
} from '../index'

describe('Type Definitions and Model Structures', () => {
  it('validates Display interface structure', () => {
    const display: Display = {
      id: 'disp-test',
      name: 'Test Monitor',
      width: 3840,
      height: 2160,
      x: 0,
      y: 0,
      scale: 1.5,
      dpi: 144,
      isPrimary: true,
      orientation: 'landscape',
      refreshRate: 120,
    }

    expect(display.id).toBe('disp-test')
    expect(display.scale).toBe(1.5)
    expect(display.isPrimary).toBe(true)
  })

  it('validates Wallpaper and Manifest types', () => {
    const manifest: WallpaperManifest = {
      id: 'wp-manifest-1',
      name: 'Manifest Wallpaper',
      author: 'Author',
      version: '1.0.0',
      type: 'web',
      permissions: ['mouse', 'audio', 'system'],
    }

    const wallpaper: Wallpaper = {
      ...manifest,
      created: new Date(),
      modified: new Date(),
      isFavorite: true,
      tags: ['interactive', 'audio'],
    }

    expect(wallpaper.type).toBe('web')
    expect(manifest.permissions).toContain('audio')
  })

  it('validates Profile and Settings types', () => {
    const profile: WallpaperProfile = {
      id: 'prof-1',
      name: 'Gaming Profile',
      displayAssignments: { 'disp-0': 'wp-cyberpunk' },
      settings: { fpsLimit: 144 },
      performanceLevel: 'high',
      created: new Date(),
      modified: new Date(),
    }

    const settings: AppSettings = {
      performanceMode: 'auto',
      enableOnStartup: true,
      enableBatteryOptimization: true,
      pauseOnFullscreen: true,
      pauseOnGameDetected: true,
      volume: 0.8,
      theme: 'dark',
    }

    expect(profile.performanceLevel).toBe('high')
    expect(settings.pauseOnFullscreen).toBe(true)
  })

  it('validates PerformanceMetrics type structure', () => {
    const metrics: PerformanceMetrics = {
      fps: 60.0,
      cpuUsage: 10.5,
      memoryUsage: 25.0,
      gpuUsage: 15.2,
      battery: 88.0,
      powerState: 'normal',
      timestamp: new Date(),
    }

    expect(metrics.fps).toBe(60.0)
    expect(metrics.powerState).toBe('normal')
  })
})
