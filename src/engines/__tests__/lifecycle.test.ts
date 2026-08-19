import { describe, it, expect, vi } from 'vitest'
import { createEngineLifecycle } from '../types'
import {
  getEngineLifecycle,
  resetEngineLifecycle,
  getEngineState,
  createSafeRender,
  getEngine,
  isProceduralEngine,
  ENGINE_TYPES,
} from '../registry'
import type { ProceduralEngine } from '../types'

describe('Engine Lifecycle', () => {
  it('starts in idle state', () => {
    const lc = createEngineLifecycle()
    expect(lc.getState()).toBe('idle')
  })

  it('transitions idle → loaded → running → paused → running → stopped → idle', () => {
    const lc = createEngineLifecycle()

    lc.initialize()
    expect(lc.getState()).toBe('loaded')

    lc.start()
    expect(lc.getState()).toBe('running')

    lc.pause()
    expect(lc.getState()).toBe('paused')

    lc.resume()
    expect(lc.getState()).toBe('running')

    lc.stop()
    expect(lc.getState()).toBe('idle')
  })

  it('rejects invalid transitions', () => {
    const lc = createEngineLifecycle()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Can't go directly from idle to running
    lc.start()
    expect(lc.getState()).toBe('idle') // unchanged

    // Can't pause from idle
    lc.pause()
    expect(lc.getState()).toBe('idle') // unchanged

    warnSpy.mockRestore()
  })

  it('reset clears the lifecycle', () => {
    resetEngineLifecycle('matrix')
    const lc = getEngineLifecycle('matrix')
    expect(lc.getState()).toBe('idle')

    lc.initialize()
    lc.start()
    expect(lc.getState()).toBe('running')

    resetEngineLifecycle('matrix')
    const lc2 = getEngineLifecycle('matrix')
    expect(lc2.getState()).toBe('idle')
  })

  it('getEngineState returns current state', () => {
    resetEngineLifecycle('sunset')
    expect(getEngineState('sunset')).toBe('idle')
    getEngineLifecycle('sunset').initialize()
    expect(getEngineState('sunset')).toBe('loaded')
  })
})

describe('Error-Bounded Render', () => {
  const mockEngine: ProceduralEngine = {
    id: 'matrix',
    name: 'Test',
    category: 'neon',
    description: 'Test engine',
    author: 'Test',
    tags: [],
    defaultSettings: {
      primaryColor: '#00f0ff',
      secondaryColor: '#ff0077',
      speed: 1.2,
      density: 50,
      glow: 80,
      customText: '',
      interactive: true,
    },
    render: vi.fn(),
  }

  it('passes through to the engine render', () => {
    const safe = createSafeRender(mockEngine)
    const ctx = {} as CanvasRenderingContext2D
    safe(ctx, 1920, 1080, 1.0, mockEngine.defaultSettings, { x: 0.5, y: 0.5 })
    expect(mockEngine.render).toHaveBeenCalled()
  })

  it('catches errors and stops after MAX_ERRORS', () => {
    const errorEngine: ProceduralEngine = {
      ...mockEngine,
      render: vi.fn(() => {
        throw new Error('boom')
      }),
    }
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const safe = createSafeRender(errorEngine)
    const ctx = {} as CanvasRenderingContext2D

    // Calls 1-10 still try (MAX_ERRORS = 10)
    for (let i = 0; i < 10; i++) {
      safe(ctx, 1920, 1080, 1.0, errorEngine.defaultSettings, { x: 0.5, y: 0.5 })
    }
    expect(errorEngine.render).toHaveBeenCalledTimes(10)
    expect(errorSpy).toHaveBeenCalledTimes(1) // only first error logged

    // Call 11+ stops trying
    safe(ctx, 1920, 1080, 1.0, errorEngine.defaultSettings, { x: 0.5, y: 0.5 })
    expect(errorEngine.render).toHaveBeenCalledTimes(10) // not 11

    errorSpy.mockRestore()
  })
})

describe('Engine Registry', () => {
  it('has all 17 engines', () => {
    expect(ENGINE_TYPES).toHaveLength(17)
  })

  it('getEngine returns known engines', () => {
    expect(getEngine('matrix')).toBeDefined()
    expect(getEngine('matrix')?.name).toBe('Neon Grid Horizon')
  })

  it('getEngine returns undefined for unknown engines', () => {
    expect(getEngine('nonexistent')).toBeUndefined()
  })

  it('isProceduralEngine identifies procedural engines', () => {
    expect(isProceduralEngine('matrix')).toBe(true)
    expect(isProceduralEngine('nonexistent')).toBe(false)
  })

  it('all engines have required fields', () => {
    for (const engine of ENGINE_TYPES) {
      const e = getEngine(engine)!
      expect(e.id).toBeDefined()
      expect(e.name).toBeDefined()
      expect(e.category).toBeDefined()
      expect(e.description).toBeDefined()
      expect(e.author).toBeDefined()
      expect(e.defaultSettings).toBeDefined()
      expect(typeof e.render).toBe('function')
    }
  })
})
