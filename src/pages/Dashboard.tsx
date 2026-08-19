import React, { useState, useEffect } from 'react'
import {
  PlayCircle,
  Pause,
  Monitor,
  Check,
  Compass,
  Wand2,
  Activity,
  Cpu,
  MemoryStick,
  Gauge,
  Sparkles,
} from 'lucide-react'
import { Button } from '@components/Button'
import { WallpaperPreview } from '@components/WallpaperPreview'
import { WallpaperCard } from '@components/WallpaperCard'
import { useAppStore, stopWallpaperHost } from '@stores/appStore'
import { applyWallpaperLive, stopLiveWallpaper } from '@utils/wallpaperRenderer'
import type { Wallpaper } from '@/types/index'

export const Dashboard: React.FC = () => {
  const {
    displays,
    currentWallpaperId,
    wallpapers,
    metrics,
    isHostRunning,
    setIsHostRunning,
    setCurrentWallpaperId,
    setCurrentRoute,
    updateWallpaper,
    addRecentlyUsed,
  } = useAppStore()
  const [heroWallpaper, setHeroWallpaper] = useState<Wallpaper | null>(null)
  const [isApplyingDesktop, setIsApplyingDesktop] = useState(false)
  const [applyDesktopSuccess, setApplyDesktopSuccess] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    const current = currentWallpaperId
      ? wallpapers.find((w) => w.id === currentWallpaperId)
      : undefined
    const featured = wallpapers.find((w) => w.isFeatured)
    setHeroWallpaper(current || featured || wallpapers[0] || null)
  }, [currentWallpaperId, wallpapers])

  const handleApplyToDesktop = async (): Promise<void> => {
    if (!heroWallpaper) return
    setIsApplyingDesktop(true)
    setApplyError(null)
    try {
      const result = await applyWallpaperLive(heroWallpaper)
      if (result.ok) {
        setCurrentWallpaperId(heroWallpaper.id)
        setIsHostRunning(true)
        addRecentlyUsed(heroWallpaper.id)
        setApplyDesktopSuccess(true)
        setTimeout(() => setApplyDesktopSuccess(false), 3000)
      } else {
        setApplyError(result.error || 'Failed to apply wallpaper.')
      }
    } catch (err) {
      console.error('Failed to set desktop wallpaper:', err)
      setApplyError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsApplyingDesktop(false)
    }
  }

  const handleTogglePlayback = async (): Promise<void> => {
    setApplyError(null)
    if (isHostRunning) {
      await stopLiveWallpaper()
      await stopWallpaperHost()
      setCurrentWallpaperId(null)
      setIsHostRunning(false)
    } else {
      await handleApplyToDesktop()
    }
  }

  const featured = wallpapers.filter((w) => w.isFeatured).slice(0, 6)

  return (
    <div className="space-y-10">
      {/* ── Immersive hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] shadow-glowSoft min-h-[420px]">
        {/* Live wallpaper backdrop */}
        {heroWallpaper && (
          <div className="absolute inset-0">
            <WallpaperPreview
              engineId={heroWallpaper.engineType}
              settings={heroWallpaper.settings}
              videoPath={heroWallpaper.videoPath}
              thumbnail={heroWallpaper.thumbnail}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-ink-950/30" />

        {/* Content */}
        <div className="relative z-10 p-8 md:p-12 lg:p-14 flex flex-col justify-end min-h-[420px]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-luma-violetLight mb-4 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-luma-cyan shadow-glowCyan" />
            LumaWall — Interactive live wallpapers
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.05] text-white animate-hero-in">
            Live Wallpaper,
            <br />
            <span className="text-luma-brand">Redefined.</span>
          </h1>
          <p className="mt-4 text-slate-300 text-base md:text-lg max-w-xl leading-relaxed">
            Beautiful worlds that move with you — interactive, alive, and rendered
            right behind your desktop icons.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => setCurrentRoute('explore')}>
              <Compass className="w-4 h-4" />
              Explore Wallpapers
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setCurrentRoute('creator')}>
              <Wand2 className="w-4 h-4" />
              Create Wallpaper
            </Button>
          </div>

          {heroWallpaper && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Floating glass controls */}
              <div className="glass rounded-2xl p-2 flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => void handleApplyToDesktop()}
                  disabled={isApplyingDesktop}
                  size="sm"
                >
                  {applyDesktopSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Applied live!
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4" />
                      {isApplyingDesktop ? 'Applying…' : 'Set as Wallpaper'}
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleTogglePlayback()}>
                  {isHostRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Play
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm">
                <p className="text-white font-semibold">{heroWallpaper.name}</p>
                <p className="text-slate-400 text-xs">{heroWallpaper.author}</p>
              </div>
            </div>
          )}

          {applyError && (
            <div className="mt-4 max-w-xl p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {applyError}
            </div>
          )}
        </div>

        {/* Hero status chips */}
        <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
          {isHostRunning && (
            <span className="badge-live backdrop-blur-md animate-pulse-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live on desktop
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider glass text-slate-300">
            {heroWallpaper?.settings?.interactive ? 'Interactive' : 'Ambient'}
          </span>
        </div>
      </section>

      {/* ── Live metrics strip ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Activity className="w-5 h-5 text-luma-violetLight" />
            Live performance
          </h2>
          <button
            onClick={() => setCurrentRoute('performance')}
            className="text-xs text-slate-400 hover:text-luma-violetLight transition-colors"
          >
            View details →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            icon={<Gauge className="w-4 h-4 text-luma-cyan" />}
            label="FPS"
            value={metrics ? metrics.fps.toFixed(1) : '—'}
            unit="fps"
            loading={!metrics}
          />
          <MetricTile
            icon={<Cpu className="w-4 h-4 text-luma-violetLight" />}
            label="CPU"
            value={metrics ? metrics.cpuUsage.toFixed(1) : '—'}
            unit="%"
            loading={!metrics}
          />
          <MetricTile
            icon={<MemoryStick className="w-4 h-4 text-luma-blue" />}
            label="Memory"
            value={metrics ? metrics.memoryUsage.toFixed(1) : '—'}
            unit="%"
            loading={!metrics}
          />
          <MetricTile
            icon={<Sparkles className="w-4 h-4 text-luma-pink" />}
            label="GPU"
            value={metrics && metrics.gpuUsage !== undefined ? metrics.gpuUsage.toFixed(1) : '—'}
            unit="%"
            loading={!metrics}
          />
        </div>
      </section>

      {/* ── Featured collection ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Featured</h2>
            <p className="text-sm text-slate-500">Hand-picked worlds, ready to live on your desktop.</p>
          </div>
          <button
            onClick={() => setCurrentRoute('explore')}
            className="text-xs text-slate-400 hover:text-luma-violetLight transition-colors"
          >
            Browse all →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((w) => (
            <WallpaperCard
              key={w.id}
              wallpaper={w}
              isLive={isHostRunning && w.id === currentWallpaperId}
              onSelect={() => setCurrentRoute('library')}
              onApply={(wallpaper) => {
                void (async () => {
                  const result = await applyWallpaperLive(wallpaper)
                  if (result.ok) {
                    setIsHostRunning(true)
                    addRecentlyUsed(wallpaper.id)
                  }
                })()
              }}
              onToggleFavorite={(wallpaper) =>
                updateWallpaper(wallpaper.id, { isFavorite: !wallpaper.isFavorite })
              }
            />
          ))}
        </div>
      </section>

      {/* ── Displays overview ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Monitor className="w-5 h-5 text-luma-violetLight" />
            Displays
          </h2>
          <button
            onClick={() => setCurrentRoute('displays')}
            className="text-xs text-slate-400 hover:text-luma-violetLight transition-colors"
          >
            Manage displays →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displays.map((display) => (
            <div
              key={display.id}
              className="glass glass-hover rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="shrink-0 w-12 h-9 rounded-lg border border-white/10 bg-ink-800 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-luma-violetLight" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-100 text-sm truncate">{display.name}</h3>
                  {display.isPrimary && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-luma-violet/20 text-luma-violetLight border border-luma-violet/30">
                      Main
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {display.width}×{display.height} · {display.refreshRate ? `${display.refreshRate}Hz` : `${display.dpi} DPI`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

interface MetricTileProps {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  loading?: boolean
}

const MetricTile: React.FC<MetricTileProps> = ({ icon, label, value, unit, loading }) => (
  <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="skeleton h-5 w-14 mt-1" />
      ) : (
        <p className="text-lg font-bold text-white leading-tight tabular-nums">
          {value}
          <span className="text-xs text-slate-500 font-medium ml-1">{unit}</span>
        </p>
      )}
    </div>
  </div>
)
