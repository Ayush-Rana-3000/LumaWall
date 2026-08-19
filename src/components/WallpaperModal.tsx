import React, { useEffect, useState } from 'react'
import {
  X,
  Heart,
  Trash2,
  Monitor,
  Play,
  Check,
  Palette,
  Type,
  MousePointer2,
  Sliders,
  AlertTriangle,
  Music4,
  MousePointerClick,
  Image as ImageIcon,
  Box,
} from 'lucide-react'
import { Card } from '@components/Card'
import { Button } from '@components/Button'
import { Slider } from '@components/Slider'
import { Toggle } from '@components/Toggle'
import { WallpaperPreview } from '@components/WallpaperPreview'
import { WALLPAPER_ENGINES, type EngineType } from '@engines'
import { applyWallpaperLive, stopLiveWallpaper } from '@utils/wallpaperRenderer'
import { isPhotoType, isSceneType, schemaDefaults } from '@utils/libraryContent'
import type { SettingSchema } from '@/types/content'
import { useAppStore } from '@stores/appStore'
import { ConfirmDialog } from '@components/ConfirmDialog'
import type { Wallpaper, WallpaperSettings } from '@/types/index'

interface WallpaperModalProps {
  wallpaper: Wallpaper | null
  onClose: () => void
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({ wallpaper, onClose }) => {
  const { updateWallpaper, removeWallpaper, setCurrentWallpaperId, isHostRunning, setIsHostRunning } =
    useAppStore()

  const engine = wallpaper?.engineType ? WALLPAPER_ENGINES[wallpaper.engineType as EngineType] : undefined
  const defaults = engine?.defaultSettings
  const isPhoto = isPhotoType(wallpaper?.contentType)
  const isScene = isSceneType(wallpaper?.contentType)
  const isEngine = !wallpaper?.contentType || wallpaper.contentType === 'engine'
  const schema = wallpaper?.settingSchema ?? []

  const [settings, setSettings] = useState<Record<string, string | number | boolean>>(() =>
    wallpaper?.settings
      ? { ...(wallpaper.settings as unknown as Record<string, string | number | boolean>) }
      : isEngine && defaults
        ? { ...defaults }
        : schemaDefaults(schema),
  )
  const [applying, setApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [saved, setSaved] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (wallpaper?.settings) {
      setSettings({ ...(wallpaper.settings as unknown as Record<string, string | number | boolean>) })
    } else if (isEngine && defaults) {
      setSettings({ ...defaults })
    } else {
      setSettings(schemaDefaults(wallpaper?.settingSchema ?? []))
    }
    setApplySuccess(false)
    setApplyError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpaper?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!wallpaper) return null

  const isVideo = wallpaper.type === 'video' || !!wallpaper.videoPath

  const saveSettings = (): void => {
    updateWallpaper(wallpaper.id, {
      settings: settings as unknown as WallpaperSettings,
      modified: new Date(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleApply = async (): Promise<void> => {
    setApplying(true)
    setApplyError(null)
    try {
      const merged = { ...wallpaper, settings: settings as unknown as WallpaperSettings }
      const result = await applyWallpaperLive(merged)
      if (result.ok) {
        setApplySuccess(true)
        setIsHostRunning(true)
        setCurrentWallpaperId(wallpaper.id)
        saveSettings()
        setTimeout(() => setApplySuccess(false), 2500)
      } else {
        setApplyError(result.error || 'Failed to apply wallpaper.')
      }
    } finally {
      setApplying(false)
    }
  }

  const handleStop = async (): Promise<void> => {
    await stopLiveWallpaper()
    setCurrentWallpaperId(null)
    setIsHostRunning(false)
  }

  const handleToggleFavorite = (): void => {
    updateWallpaper(wallpaper.id, { isFavorite: !wallpaper.isFavorite, modified: new Date() })
  }

  const handleDelete = (): void => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = (): void => {
    removeWallpaper(wallpaper.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  const set = (patch: Record<string, string | number | boolean>): void =>
    setSettings((s) => ({ ...s, ...patch }))

  const interaction = wallpaper.interaction

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-ink-950/70 backdrop-blur-md"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden border-white/10 shadow-2xl shadow-black/70 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-ink-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-luma-violet/15 border border-luma-violet/30 flex items-center justify-center">
              {isPhoto ? (
                <ImageIcon className="w-5 h-5 text-luma-violetLight" />
              ) : isScene ? (
                <Box className="w-5 h-5 text-luma-violetLight" />
              ) : (
                <Monitor className="w-5 h-5 text-luma-violetLight" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-50 truncate">{wallpaper.name}</h2>
              <p className="text-xs text-slate-400 truncate">
                {wallpaper.author} · {isVideo ? 'Video' : isPhoto ? 'Photo' : isScene ? wallpaper.contentType : engine?.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleToggleFavorite} aria-label="Toggle favorite">
              <Heart
                className={`w-4 h-4 ${wallpaper.isFavorite ? 'fill-luma-pink text-luma-pink' : 'text-slate-300'}`}
              />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-400 hover:text-red-300" aria-label="Delete wallpaper">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto max-h-[calc(90vh-64px)]">
          {/* Cinematic preview */}
          <div className="relative h-64 md:h-auto min-h-[16rem] bg-ink-950 border-b md:border-b-0 md:border-r border-white/[0.06]">
            <WallpaperPreview
              engineId={wallpaper.engineType}
              settings={settings as unknown as WallpaperSettings}
              videoPath={wallpaper.videoPath}
              thumbnail={wallpaper.thumbnail}
              contentType={wallpaper.contentType}
              contentUrl={wallpaper.contentUrl}
              broken={wallpaper.libraryBroken}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/90 to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4 flex items-center gap-2">
              {isHostRunning && (
                <span className="badge-live backdrop-blur-md animate-pulse-subtle">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live on desktop
                </span>
              )}
              {interaction?.mouseParallax && !isVideo && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                  Mouse parallax
                </span>
              )}
            </div>

            {wallpaper.libraryBroken && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
                <div className="text-center px-6 max-w-xs">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-red-300 mb-1">This wallpaper is unavailable</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Its files are missing from the library. You can remove it — the rest of LumaWall keeps running.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details + customization */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-50 mb-1.5">{wallpaper.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {wallpaper.description || 'A wallpaper from the LumaWall library.'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {wallpaper.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-white/[0.04] text-slate-400 rounded-md border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
                {wallpaper.resolution && <span>Resolution: {wallpaper.resolution}</span>}
                {wallpaper.aspectRatio && <span>Aspect: {wallpaper.aspectRatio}</span>}
                {wallpaper.perfEstimate && <span className="capitalize">Perf: {wallpaper.perfEstimate}</span>}
                {wallpaper.librarySource === 'user' && <span className="text-luma-violetLight">Imported by you</span>}
              </div>

              {/* Interaction capabilities */}
              {interaction && (interaction.mouseParallax || interaction.clickEffects || interaction.audioReactive) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {interaction.mouseParallax && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 rounded-md">
                      <MousePointer2 className="w-3 h-3" /> Mouse reactive
                    </span>
                  )}
                  {interaction.clickEffects && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-luma-violet/10 text-luma-violetLight border border-luma-violet/25 rounded-md">
                      <MousePointerClick className="w-3 h-3" /> Click effects
                    </span>
                  )}
                  {interaction.audioReactive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-luma-pink/10 text-luma-pink border border-luma-pink/25 rounded-md">
                      <Music4 className="w-3 h-3" /> Audio reactive
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Dynamic metadata-driven controls ── */}
            {!isVideo && schema.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-3">
                  <Sliders className="w-4 h-4 text-luma-violetLight" />
                  Customize
                </h4>
                <div className="space-y-4">
                  {schema.map((s) => (
                    <DynamicControl
                      key={s.id}
                      schema={s}
                      value={settings[s.id]}
                      onChange={(v) => set({ [s.id]: v })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Engine controls (built-in canvas collection) ── */}
            {!isVideo && isEngine && !wallpaper.libraryBroken && (
              <>
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-3">
                    <Palette className="w-4 h-4 text-luma-violetLight" />
                    Color theme
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField
                      label="Primary"
                      value={String(settings.primaryColor ?? '#00f0ff')}
                      onChange={(v) => set({ primaryColor: v })}
                    />
                    <ColorField
                      label="Secondary glow"
                      value={String(settings.secondaryColor ?? '#ff0077')}
                      onChange={(v) => set({ secondaryColor: v })}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-3">
                    <Sliders className="w-4 h-4 text-luma-violetLight" />
                    Animation
                  </h4>
                  <div className="space-y-4">
                    <Slider
                      label="Speed"
                      value={Number(settings.speed ?? 1.2)}
                      min={0.2}
                      max={3}
                      step={0.1}
                      unit="×"
                      display={(Number(settings.speed ?? 1.2)).toFixed(1)}
                      onChange={(v) => set({ speed: v })}
                    />
                    <Slider
                      label="Density"
                      value={Number(settings.density ?? 50)}
                      min={10}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={(v) => set({ density: v })}
                    />
                    <Slider
                      label="Bloom & glow"
                      value={Number(settings.glow ?? 80)}
                      min={0}
                      max={150}
                      step={5}
                      unit="%"
                      onChange={(v) => set({ glow: v })}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                    <Type className="w-4 h-4 text-luma-violetLight" />
                    Overlay text
                  </h4>
                  <input
                    type="text"
                    value={String(settings.customText ?? '')}
                    onChange={(e) => set({ customText: e.target.value })}
                    placeholder="Optional — e.g. MY DESKTOP"
                    className="input text-sm"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                    <MousePointer2 className="w-4 h-4 text-luma-violetLight" />
                    Mouse reactivity
                  </span>
                  <Toggle
                    checked={settings.interactive !== false}
                    onChange={(v) => set({ interactive: v })}
                    label="Mouse reactivity"
                  />
                </div>
              </>
            )}

            {isPhoto && !wallpaper.libraryBroken && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {wallpaper.depthUrl
                  ? 'This photograph ships with a depth map — Depth Parallax creates real 2.5D depth as your cursor moves.'
                  : 'No depth map on this photo — cinematic 2D camera motion is used instead. Drop a depth.png into its folder to enable parallax.'}
              </p>
            )}

            {applyError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {applyError}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {!wallpaper.libraryBroken ? (
                <>
                  <Button variant="primary" onClick={() => void handleApply()} disabled={applying} className="flex-1">
                    {applySuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        Applied live!
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        {applying ? 'Applying…' : 'Set as Live Wallpaper'}
                      </>
                    )}
                  </Button>
                  {isHostRunning && (
                    <Button variant="secondary" onClick={() => void handleStop()}>
                      Stop
                    </Button>
                  )}
                  {schema.length > 0 && (
                    <Button variant="secondary" onClick={saveSettings}>
                      {saved ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Saved
                        </>
                      ) : (
                        'Save Settings'
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="danger" onClick={handleDelete} className="flex-1">
                  <Trash2 className="w-4 h-4" />
                  Remove Unavailable Wallpaper
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete wallpaper?"
        message="This will permanently remove this wallpaper from your library. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

// ─── Dynamic control (metadata-driven) ────────────────────────────────────────

interface DynamicControlProps {
  schema: SettingSchema
  value: string | number | boolean | undefined
  onChange: (value: string | number | boolean) => void
}

const DynamicControl: React.FC<DynamicControlProps> = ({ schema, value, onChange }) => {
  switch (schema.type) {
    case 'slider': {
      const min = schema.min ?? 0
      const max = schema.max ?? 100
      const num = Number(value ?? schema.default ?? min)
      return (
        <Slider
          label={schema.label}
          value={num}
          min={min}
          max={max}
          step={schema.step ?? 1}
          onChange={onChange}
        />
      )
    }
    case 'boolean': {
      const checked = Boolean(value ?? schema.default ?? false)
      return (
        <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <span className="text-sm text-slate-200 font-medium">{schema.label}</span>
          <Toggle checked={checked} onChange={onChange} label={schema.label} />
        </div>
      )
    }
    case 'select': {
      const current = String(value ?? schema.default ?? schema.options?.[0]?.value ?? '')
      return (
        <div>
          <label className="text-sm text-slate-300 block mb-2">{schema.label}</label>
          <select
            value={current}
            onChange={(e) => onChange(e.target.value)}
            className="input text-sm"
          >
            {schema.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )
    }
    case 'color': {
      return (
        <ColorField
          label={schema.label}
          value={String(value ?? schema.default ?? '#ffffff')}
          onChange={onChange}
        />
      )
    }
    case 'text': {
      return (
        <div>
          <label className="text-sm text-slate-300 block mb-2">{schema.label}</label>
          <input
            type="text"
            value={String(value ?? schema.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="input text-sm"
          />
        </div>
      )
    }
    default:
      return null
  }
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
    <div className="flex items-center gap-2 bg-ink-900/80 p-1.5 rounded-xl border border-white/10">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
      />
      <span className="text-xs font-mono text-slate-200 uppercase">{value}</span>
    </div>
  </div>
)
