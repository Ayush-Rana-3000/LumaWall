import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  Volume2,
  Moon,
  Rocket,
  Sliders,
  Info,
  Home,
  Volume1,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardBody } from '@components/Card'
import { Button } from '@components/Button'
import { Slider } from '@components/Slider'
import { Toggle } from '@components/Toggle'
import { useAppStore } from '@stores/appStore'
import { LumaBrand } from '@components/LumaLogo'
import clsx from 'clsx'

type SettingsCategory = 'general' | 'startup' | 'appearance' | 'wallpaper' | 'performance' | 'about'

const CATEGORIES: { id: SettingsCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Home className="w-4 h-4" /> },
  { id: 'startup', label: 'Startup', icon: <Rocket className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Moon className="w-4 h-4" /> },
  { id: 'wallpaper', label: 'Wallpaper', icon: <Volume2 className="w-4 h-4" /> },
  { id: 'performance', label: 'Performance', icon: <Sliders className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
]

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest' | 'error'>('idle')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  const handleCheckUpdates = async (): Promise<void> => {
    setUpdateStatus('checking')
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update) {
        setUpdateStatus('available')
        setUpdateVersion(update.version)
      } else {
        setUpdateStatus('latest')
      }
    } catch (err) {
      console.warn('Update check failed:', err)
      setUpdateStatus('error')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
          Settings
        </p>
        <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
          Make LumaWall <span className="text-luma-brand">yours.</span>
        </h1>
        <p className="mt-2 text-slate-400 text-[15px]">
          Every preference, organized — nothing hidden.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Category nav */}
        <nav className="glass rounded-2xl p-2 space-y-0.5 lg:sticky lg:top-20">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-luma-violet/15 text-white border border-luma-violet/30 shadow-glowViolet'
                    : 'text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/[0.04]',
                )}
              >
                <span className={active ? 'text-luma-violetLight' : 'text-slate-500'}>{cat.icon}</span>
                {cat.label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {activeCategory === 'general' && (
            <Card className="border-white/10">
              <CardBody className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <SettingsIcon className="w-5 h-5 text-luma-violetLight" />
                  General
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  LumaWall turns your desktop into a living canvas — interactive, audio-reactive
                  wallpapers rendered behind your icons at native resolution. Start from the
                  Dashboard or Explore the library to find your first world.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Volume1 className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">
                    Tip: press{' '}
                    <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 font-mono">
                      Ctrl+K
                    </kbd>{' '}
                    anywhere to jump to wallpaper search.
                  </span>
                </div>
              </CardBody>
            </Card>
          )}

          {activeCategory === 'startup' && (
            <Card className="border-white/10">
              <CardBody className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Rocket className="w-5 h-5 text-luma-violetLight" />
                  Startup
                </h2>
                <SettingRow
                  label="Launch at startup"
                  description="Start LumaWall automatically when Windows starts"
                  checked={settings.enableOnStartup}
                  onChange={(checked) => updateSettings({ enableOnStartup: checked })}
                />
              </CardBody>
            </Card>
          )}

          {activeCategory === 'appearance' && (
            <Card className="border-white/10">
              <CardBody className="space-y-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Moon className="w-5 h-5 text-luma-violetLight" />
                  Appearance
                </h2>
                <div>
                  <label className="label">Theme</label>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {(['dark', 'light', 'auto'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateSettings({ theme })}
                        className={clsx(
                          'p-3 rounded-xl border transition-all duration-200 capitalize text-sm font-medium',
                          settings.theme === theme
                            ? 'border-luma-violet/50 bg-luma-violet/10 text-white shadow-glowViolet'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-luma-violet/30 hover:text-slate-100',
                        )}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5">
                    Auto follows your system setting. The LumaWall signature look is the deep
                    midnight theme.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {activeCategory === 'wallpaper' && (
            <Card className="border-white/10">
              <CardBody className="space-y-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Volume2 className="w-5 h-5 text-luma-violetLight" />
                  Wallpaper audio
                </h2>
                <div className="max-w-md">
                  <Slider
                    label="Master volume"
                    value={settings.volume}
                    min={0}
                    max={1}
                    step={0.05}
                    unit="%"
                    display={`${Math.round(settings.volume * 100)}`}
                    onChange={(v) => updateSettings({ volume: v })}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Applies to audio-reactive wallpapers (e.g. Aurora Waves) and video wallpapers
                  with sound.
                </p>
              </CardBody>
            </Card>
          )}

          {activeCategory === 'performance' && (
            <Card className="border-white/10">
              <CardBody className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Sliders className="w-5 h-5 text-luma-violetLight" />
                  Performance
                </h2>
                <SettingRow
                  label="Battery optimization"
                  description="Automatically reduce quality when on battery power"
                  checked={settings.enableBatteryOptimization}
                  onChange={(checked) => updateSettings({ enableBatteryOptimization: checked })}
                />
                <SettingRow
                  label="Pause on fullscreen"
                  description="Pause wallpaper when a fullscreen application is active"
                  checked={settings.pauseOnFullscreen}
                  onChange={(checked) => updateSettings({ pauseOnFullscreen: checked })}
                />
                <SettingRow
                  label="Game mode"
                  description="Pause wallpaper when gaming applications are detected"
                  checked={settings.pauseOnGameDetected}
                  onChange={(checked) => updateSettings({ pauseOnGameDetected: checked })}
                />
                <p className="text-xs text-slate-500 pt-1">
                  Fine-tune the performance mode presets on the Performance page.
                </p>
              </CardBody>
            </Card>
          )}

          {activeCategory === 'about' && (
            <Card className="border-white/10">
              <CardBody className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-luma-violet/15 border border-luma-violet/30 flex items-center justify-center">
                    <LumaBrand size={30} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">About LumaWall</h2>
                    <p className="text-xs text-slate-500">
                      Live Beautifully.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 max-w-md">
                  <InfoRow label="Version" value="0.1.0" />
                  <InfoRow label="Build" value="Dev" />
                  <InfoRow label="Platform" value="Windows (Tauri 2)" />
                  <InfoRow label="Engines" value="17 live wallpaper engines" />
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 max-w-md">
                    LumaWall is an advanced, interactive live wallpaper platform for Windows —
                    procedural engines, video import, and cursor-reactive scenes rendered behind
                    your desktop icons.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Documentation
                    </Button>
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Report Issue
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCheckUpdates()}
                      disabled={updateStatus === 'checking'}
                    >
                      {updateStatus === 'checking' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : updateStatus === 'available' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : updateStatus === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {updateStatus === 'checking'
                        ? 'Checking...'
                        : updateStatus === 'available'
                          ? `Update v${updateVersion}`
                          : updateStatus === 'latest'
                            ? 'Up to Date'
                            : updateStatus === 'error'
                              ? 'Check Failed'
                              : 'Check Updates'}
                    </Button>
                  </div>
                  {updateStatus === 'available' && updateVersion && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Version {updateVersion} is available. Visit GitHub Releases to download.
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

interface SettingRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
    <div className="min-w-0">
      <h3 className="font-medium text-slate-100 text-sm">{label}</h3>
      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} label={label} />
  </div>
)

interface InfoRowProps {
  label: string
  value: string
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="text-slate-100 font-semibold">{value}</span>
  </div>
)
