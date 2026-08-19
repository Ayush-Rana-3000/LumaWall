import React, { useEffect, useRef } from 'react'
import { WALLPAPER_ENGINES, type EngineType } from '@engines'
import { isPhotoType, isSceneType } from '@utils/libraryContent'
import type { WallpaperSettings } from '@/types/index'

interface WallpaperPreviewProps {
  engineId?: string
  settings?: WallpaperSettings
  videoPath?: string
  thumbnail?: string
  /** Content-library fields (photo / webgl / html / interactive). */
  contentType?: string
  contentUrl?: string
  broken?: boolean
  className?: string
}

/**
 * Live animated preview for a wallpaper. Runs the exact same engine render code
 * that is used on the real desktop for engine wallpapers; renders photos as
 * images and HTML/WebGL scenes inside a sandboxed iframe for content-library
 * wallpapers.
 */
export const WallpaperPreview: React.FC<WallpaperPreviewProps> = ({
  engineId,
  settings,
  videoPath,
  thumbnail,
  contentType,
  contentUrl,
  broken,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (!engineId) return
    const engine = WALLPAPER_ENGINES[engineId as EngineType]
    if (!engine) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    let last = performance.now()
    let mx = 0.5
    let my = 0.5
    let failures = 0

    const dpr = window.devicePixelRatio || 1
    const W = Math.max(1, Math.round((canvas.clientWidth || 320) * dpr))
    const H = Math.max(1, Math.round((canvas.clientHeight || 180) * dpr))
    canvas.width = W
    canvas.height = H

    const onMove = (e: MouseEvent): void => {
      const r = canvas.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        mx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        my = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      }
    }
    canvas.addEventListener('mousemove', onMove)

    const render = (now: number): void => {
      const s = settingsRef.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt * (s?.speed ?? engine.defaultSettings.speed)
      // A throwing engine must never break the app or spam the console —
      // after a few consecutive failures the preview stops trying.
      try {
        engine.render(
          ctx,
          W,
          H,
          t,
          {
            primaryColor: s?.primaryColor ?? engine.defaultSettings.primaryColor,
            secondaryColor: s?.secondaryColor ?? engine.defaultSettings.secondaryColor,
            speed: s?.speed ?? engine.defaultSettings.speed,
            density: s?.density ?? engine.defaultSettings.density,
            glow: s?.glow ?? engine.defaultSettings.glow,
            customText: s?.customText ?? '',
            interactive: s?.interactive ?? true,
          },
          { x: mx, y: my },
        )
        failures = 0
      } catch (err) {
        failures += 1
        console.warn('Wallpaper engine preview failed:', err)
        if (failures >= 5) return // stop the loop for this broken engine
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [engineId])

  // Broken content → clear, branded error state (never a crash).
  if (broken) {
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center bg-ink-900`}
        style={{ minHeight: '100%' }}
      >
        <div className="text-center px-4">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-xs text-red-400 font-medium">Content unavailable</p>
        </div>
      </div>
    )
  }

  // Video wallpaper
  if (videoPath) {
    const src =
      videoPath.startsWith('http') || videoPath.startsWith('file:') || videoPath.startsWith('blob:')
        ? videoPath
        : `file:///${videoPath.replace(/\\/g, '/')}`
    return (
      <video src={src} className={className} autoPlay loop muted playsInline />
    )
  }

  // HTML / WebGL / interactive scenes → sandboxed iframe (scripts only).
  if (isSceneType(contentType) && contentUrl) {
    return (
      <iframe
        src={contentUrl}
        title="wallpaper scene preview"
        sandbox="allow-scripts"
        className={`${className ?? ''} pointer-events-none`}
        loading="lazy"
      />
    )
  }

  // Photo / animated content → the photograph itself.
  if (isPhotoType(contentType) && contentUrl) {
    return <img src={contentUrl} alt="" className={className} loading="lazy" draggable={false} />
  }

  // Built-in engine canvas
  if (engineId) {
    return <canvas ref={canvasRef} className={className} />
  }

  // Static thumbnail fallback
  if (thumbnail) {
    return <img src={thumbnail} alt="" className={className} loading="lazy" />
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-gradient-to-br from-lumaBlue-900/40 via-slate-900 to-black`}
    >
      <span className="text-4xl font-black text-lumaBlue-500/60">LW</span>
    </div>
  )
}
