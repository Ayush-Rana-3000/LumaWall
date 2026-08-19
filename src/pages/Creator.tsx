import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Monitor,
  Check,
  Save,
  Download,
  Maximize,
  Minimize,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Square,
  Film,
  Wand2,
  MousePointer2,
  Type,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@components/Card'
import { Button } from '@components/Button'
import { Slider } from '@components/Slider'
import { Toggle } from '@components/Toggle'
import { VideoImporter } from '@components/VideoImporter'
import { ALL_ENGINES, WALLPAPER_ENGINES, type EngineType } from '@engines'
import { applyLiveCanvasWallpaper, stopLiveWallpaper } from '@utils/wallpaperRenderer'
import { useAppStore } from '@stores/appStore'
import type { Wallpaper } from '@/types/index'

const COLOR_PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: 'Cyber Neon', primary: '#00f0ff', secondary: '#ff0077' },
  { name: 'Solar Flare', primary: '#ff6b00', secondary: '#ffe600' },
  { name: 'Deep Cosmic', primary: '#8a2be2', secondary: '#4169e1' },
  { name: 'Emerald Matrix', primary: '#00ff88', secondary: '#006633' },
  { name: 'Synthwave', primary: '#ff00aa', secondary: '#7700ff' },
  { name: 'Nordic Frost', primary: '#70d6ff', secondary: '#e9ff70' },
]

type CreatorTab = 'canvas' | 'video'

export const Creator: React.FC = () => {
  const { addWallpaper, setCurrentWallpaperId } = useAppStore()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [activeTab, setActiveTab] = useState<CreatorTab>('canvas')

  const [engine, setEngine] = useState<EngineType>('matrix')
  const [primaryColor, setPrimaryColor] = useState<string>('#00f0ff')
  const [secondaryColor, setSecondaryColor] = useState<string>('#ff0077')
  const [speed, setSpeed] = useState<number>(1.2)
  const [density, setDensity] = useState<number>(50)
  const [glow, setGlow] = useState<number>(80)
  const [interactive, setInteractive] = useState<boolean>(true)
  const [customText, setCustomText] = useState<string>('LUMAWALL')
  const [wallpaperTitle, setWallpaperTitle] = useState<string>('My Custom Wallpaper')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const [isLiveOnDesktop, setIsLiveOnDesktop] = useState<boolean>(false)
  const [isApplying, setIsApplying] = useState<boolean>(false)
  const [applySuccess, setApplySuccess] = useState<boolean>(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  const mousePos = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const settingsRef = useRef({ primaryColor, secondaryColor, speed, density, glow, customText, interactive })
  settingsRef.current = { primaryColor, secondaryColor, speed, density, glow, customText, interactive }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let time = 0
    let last = performance.now()
    const renderer = WALLPAPER_ENGINES[engine].render

    const resizeCanvas = (): void => {
      if (canvas) {
        canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1)
        canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1)
      }
    }
    resizeCanvas()

    const render = (now: number): void => {
      const s = settingsRef.current
      const W = canvas.width
      const H = canvas.height
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (isPlaying) time += dt * s.speed

      renderer(
        ctx,
        W,
        H,
        time,
        {
          primaryColor: s.primaryColor,
          secondaryColor: s.secondaryColor,
          speed: s.speed,
          density: s.density,
          glow: s.glow,
          customText: s.customText,
          interactive: s.interactive,
        },
        { x: mousePos.current.x, y: mousePos.current.y },
      )
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrameId)
  }, [engine, isPlaying])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mousePos.current = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  const liveOptions = (): {
    engine: EngineType
    primaryColor: string
    secondaryColor: string
    speed: number
    density: number
    glow: number
    customText: string
    interactive: boolean
  } => ({
    engine,
    primaryColor,
    secondaryColor,
    speed,
    density,
    glow,
    customText,
    interactive,
  })

  const handleApplyLive = async (): Promise<void> => {
    setIsApplying(true)
    setApplyError(null)
    try {
      const result = await applyLiveCanvasWallpaper(liveOptions())
      if (result.ok) {
        setIsLiveOnDesktop(true)
        setApplySuccess(true)

        const canvas = canvasRef.current
        const thumbnail = canvas?.toDataURL('image/png')

        const newWp: Wallpaper = {
          id: `custom-${Date.now()}`,
          name: wallpaperTitle || 'Custom Live Creation',
          author: 'You (Studio)',
          version: '1.0.0',
          description: `Live animated ${WALLPAPER_ENGINES[engine].name} wallpaper from LumaWall Studio.`,
          type: 'web',
          engineType: engine,
          category: WALLPAPER_ENGINES[engine].category,
          thumbnail,
          settings: liveOptions(),
          created: new Date(),
          modified: new Date(),
          isFavorite: true,
          tags: ['Custom', engine, 'Live', 'Studio'],
          supportsMouse: interactive,
          supportsAudio: engine === 'waves',
          supportsSystem: true,
        }
        addWallpaper(newWp)
        setCurrentWallpaperId(newWp.id)

        setTimeout(() => setApplySuccess(false), 3000)
      } else {
        setApplyError(result.error || 'Failed to apply live wallpaper.')
      }
    } catch (err) {
      console.error('Failed to apply live wallpaper:', err)
      setApplyError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsApplying(false)
    }
  }

  const handleStopLive = async (): Promise<void> => {
    await stopLiveWallpaper()
    setIsLiveOnDesktop(false)
  }

  const handleSaveToLibrary = (): void => {
    const canvas = canvasRef.current
    const thumbnail = canvas?.toDataURL('image/png')
    const newWp: Wallpaper = {
      id: `custom-${Date.now()}`,
      name: wallpaperTitle || 'Custom Creation',
      author: 'You (Studio)',
      version: '1.0.0',
      description: `Procedural ${WALLPAPER_ENGINES[engine].name} wallpaper with custom colors.`,
      type: 'web',
      engineType: engine,
      category: WALLPAPER_ENGINES[engine].category,
      thumbnail,
      settings: liveOptions(),
      created: new Date(),
      modified: new Date(),
      isFavorite: false,
      tags: ['Custom', engine, 'Studio'],
      supportsMouse: interactive,
      supportsAudio: engine === 'waves',
      supportsSystem: true,
    }
    addWallpaper(newWp)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const handleDownload = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${wallpaperTitle.replace(/\s+/g, '_')}_wallpaper.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const pickEngine = (id: EngineType): void => {
    const e = WALLPAPER_ENGINES[id]
    setEngine(id)
    setPrimaryColor(e.defaultSettings.primaryColor)
    setSecondaryColor(e.defaultSettings.secondaryColor)
    setSpeed(e.defaultSettings.speed)
    setDensity(e.defaultSettings.density)
    setGlow(e.defaultSettings.glow)
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
            Creator Studio
          </p>
          <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
            Create something <span className="text-luma-brand">alive.</span>
          </h1>
          <p className="mt-2 text-slate-400 text-[15px] max-w-xl">
            {ALL_ENGINES.length} animated engines, infinite color themes, real mouse interactivity —
            applied at your display's native resolution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isLiveOnDesktop && (
            <>
              <span className="badge-live animate-pulse-subtle">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live on desktop
              </span>
              <Button variant="ghost" onClick={() => void handleStopLive()} className="text-red-300">
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </>
          )}
          {activeTab === 'canvas' && (
            <>
              <Button variant="primary" onClick={() => void handleApplyLive()} disabled={isApplying}>
                {applySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Live on desktop!
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" />
                    {isApplying ? 'Applying…' : 'Apply Live to Desktop'}
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={handleSaveToLibrary}>
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={handleDownload} title="Download PNG snapshot">
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Creation mode cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          onClick={() => setActiveTab('canvas')}
          className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 ${
            activeTab === 'canvas'
              ? 'border-luma-violet/50 bg-luma-violet/10 shadow-glowViolet'
              : 'border-white/10 bg-ink-850/50 hover:border-luma-violet/30 hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-luma-violet/15 border border-luma-violet/30 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-luma-violetLight" />
            </div>
            {activeTab === 'canvas' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-luma-gradient text-white">
                Active
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Animated Scene</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pick one of {ALL_ENGINES.length} procedural engines, tune colors, speed, density and
            glow — then push it live behind your icons.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 ${
            activeTab === 'video'
              ? 'border-luma-violet/50 bg-luma-violet/10 shadow-glowViolet'
              : 'border-white/10 bg-ink-850/50 hover:border-luma-violet/30 hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-4">
              <Film className="w-6 h-6 text-cyan-300" />
            </div>
            {activeTab === 'video' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-luma-gradient text-white">
                Active
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Video Wallpaper</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Import an MP4, WebM, MOV or MKV and it loops fullscreen at your display's exact pixel
            resolution.
          </p>
        </button>
      </div>

      {/* ── Canvas Studio ──────────────────────────────────────── */}
      {activeTab === 'canvas' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Live canvas */}
          <Card className="xl:col-span-2 overflow-hidden flex flex-col border-white/10">
            <CardHeader className="border-white/[0.06] bg-ink-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-luma-violetLight" />
                  <h2 className="text-lg font-semibold">Live preview</h2>
                  <span className="text-xs text-slate-500 ml-1 hidden md:inline">
                    (desktop runs at native resolution)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause preview' : 'Play preview'}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSpeed(1.2)
                      setDensity(50)
                      setGlow(80)
                    }}
                    title="Reset parameters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0 relative bg-ink-950 flex-1 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                className={`w-full cursor-crosshair transition-all duration-300 ${isFullscreen ? 'h-[620px]' : 'h-[440px]'}`}
              />
              {interactive && (
                <div className="absolute bottom-4 left-4 glass rounded-full px-3.5 py-1.5 text-xs text-slate-300 flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Move cursor to interact
                </div>
              )}
            </CardBody>
          </Card>

          {/* Controls */}
          <div className="space-y-5">
            {/* Engine */}
            <Card className="border-white/10">
              <CardHeader className="border-white/[0.06]">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Wand2 className="w-4 h-4 text-luma-violetLight" />
                  Animation engine
                </h2>
              </CardHeader>
              <CardBody className="space-y-2 max-h-[15rem] overflow-y-auto pr-1">
                {ALL_ENGINES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => pickEngine(e.id)}
                    className={`w-full p-2.5 rounded-xl text-sm font-semibold transition-all border text-left flex items-center justify-between ${
                      engine === e.id
                        ? 'bg-luma-violet/15 text-white border-luma-violet/50 shadow-glowViolet'
                        : 'bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 shrink-0 ml-2 capitalize">
                      {e.category}
                    </span>
                  </button>
                ))}
              </CardBody>
            </Card>

            {/* Colors */}
            <Card className="border-white/10">
              <CardHeader className="border-white/[0.06]">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Palette className="w-4 h-4 text-luma-violetLight" />
                  Color theme
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((cp) => (
                    <button
                      key={cp.name}
                      onClick={() => {
                        setPrimaryColor(cp.primary)
                        setSecondaryColor(cp.secondary)
                      }}
                      className="p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-luma-violet/40 text-xs flex flex-col items-center gap-1.5 transition-colors"
                    >
                      <div className="flex gap-1">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: cp.primary }} />
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: cp.secondary }} />
                      </div>
                      <span className="text-slate-300 text-[10px] font-medium truncate w-full text-center">{cp.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                  {[
                    { label: 'Primary', value: primaryColor, setter: setPrimaryColor },
                    { label: 'Secondary glow', value: secondaryColor, setter: setSecondaryColor },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
                      <div className="flex items-center gap-2 bg-ink-900/80 p-1.5 rounded-xl border border-white/10">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-slate-200 uppercase">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Parameters */}
            <Card className="border-white/10">
              <CardHeader className="border-white/[0.06]">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="w-4 h-4 text-luma-violetLight" />
                  Parameters
                </h2>
              </CardHeader>
              <CardBody className="space-y-5 text-sm">
                <Slider
                  label="Flow speed"
                  value={speed}
                  min={0.2}
                  max={3}
                  step={0.1}
                  unit="×"
                  display={speed.toFixed(1)}
                  onChange={setSpeed}
                />
                <Slider label="Density" value={density} min={10} max={100} step={5} unit="%" onChange={setDensity} />
                <Slider label="Bloom & glow" value={glow} min={0} max={150} step={5} unit="%" onChange={setGlow} />

                <div className="pt-1 border-t border-white/[0.06] space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 block mb-1.5">
                      <Type className="w-3.5 h-3.5" />
                      Overlay text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CYBERPUNK 2077"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Wallpaper title</label>
                    <input
                      type="text"
                      placeholder="Wallpaper Title"
                      value={wallpaperTitle}
                      onChange={(e) => setWallpaperTitle(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                      <MousePointer2 className="w-4 h-4 text-luma-violetLight" />
                      Mouse reactivity
                    </span>
                    <Toggle checked={interactive} onChange={setInteractive} label="Mouse reactivity" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── Video import ───────────────────────────────────────── */}
      {activeTab === 'video' && (
        <Card className="border-white/10">
          <CardHeader className="border-white/[0.06]">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Film className="w-5 h-5 text-luma-violetLight" />
              Import video as live wallpaper
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Import MP4, WebM, AVI, MKV, MOV or WMV files. The video will loop fullscreen at your
              desktop's exact pixel resolution.
            </p>
          </CardHeader>
          <CardBody>
            <VideoImporter />
          </CardBody>
        </Card>
      )}

      {applyError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {applyError}
        </div>
      )}
    </div>
  )
}
