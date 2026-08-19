import React, { useState } from 'react'
import { Activity, Cpu, MemoryStick, Gauge, Zap, Battery, MonitorPlay } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@components/Card'
import { Toggle } from '@components/Toggle'
import { useAppStore } from '@stores/appStore'

export const Performance: React.FC = () => {
  const { settings, updateSettings, metrics, runtimeStates } = useAppStore()
  const [perfMode, setPerfMode] = useState<string>(settings.performanceMode)

  const handlePerfModeChange = (mode: 'high' | 'medium' | 'low' | 'auto') => {
    setPerfMode(mode)
    updateSettings({ performanceMode: mode })
  }

  const performanceModeDescriptions: Record<string, string> = {
    high: 'Prioritizes visual quality. 60 FPS target.',
    medium: 'Balanced quality and performance. 30–45 FPS target.',
    low: 'Prioritizes performance and battery life. 15 FPS target.',
    auto: 'Automatically adjusts based on system state.',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
          Performance
        </p>
        <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
          Quiet power, <span className="text-luma-brand">measured clearly.</span>
        </h1>
        <p className="mt-2 text-slate-400 text-[15px]">
          Monitor and optimize wallpaper performance without the noise.
        </p>
      </div>

      {/* Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Gauge className="w-5 h-5 text-luma-cyan" />}
          label="FPS"
          value={metrics ? metrics.fps.toFixed(1) : undefined}
          unit="fps"
          pct={metrics ? Math.min((metrics.fps / 120) * 100, 100) : undefined}
          hint="60 target"
        />
        <MetricCard
          icon={<Cpu className="w-5 h-5 text-luma-violetLight" />}
          label="CPU usage"
          value={metrics ? metrics.cpuUsage.toFixed(1) : undefined}
          unit="%"
          pct={metrics?.cpuUsage}
          hint="wallpaper + system"
        />
        <MetricCard
          icon={<MemoryStick className="w-5 h-5 text-luma-blue" />}
          label="Memory"
          value={metrics ? metrics.memoryUsage.toFixed(1) : undefined}
          unit="%"
          pct={metrics?.memoryUsage}
          hint="system-wide"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5 text-luma-pink" />}
          label="GPU usage"
          value={metrics && metrics.gpuUsage !== undefined ? metrics.gpuUsage.toFixed(1) : undefined}
          unit="%"
          pct={metrics?.gpuUsage}
          hint={metrics?.gpuUsage === undefined ? 'not reported' : 'render load'}
        />
      </section>

      {/* Performance mode */}
      <Card className="border-white/10">
        <CardHeader className="border-white/[0.06]">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="w-5 h-5 text-luma-violetLight" />
            Performance mode
          </h2>
        </CardHeader>
        <CardBody>
          <p className="text-slate-400 text-sm mb-5">
            Choose how LumaWall balances visual quality with system performance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['high', 'medium', 'low', 'auto'] as const).map((mode) => {
              const active = perfMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => handlePerfModeChange(mode)}
                  className={`p-4 rounded-2xl border transition-all duration-200 text-left ${
                    active
                      ? 'border-luma-violet/50 bg-luma-violet/10 shadow-glowViolet'
                      : 'border-white/10 bg-white/[0.03] hover:border-luma-violet/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold capitalize text-slate-100">{mode}</h3>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-luma-violetLight shadow-glowViolet" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{performanceModeDescriptions[mode]}</p>
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Power optimization */}
      <Card className="border-white/10">
        <CardHeader className="border-white/[0.06]">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Battery className="w-5 h-5 text-luma-violetLight" />
            Power optimization
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <SettingRow
            icon={<Battery className="w-4 h-4 text-luma-violetLight" />}
            label="Battery optimization"
            description="Automatically reduce quality when on battery power"
            checked={settings.enableBatteryOptimization}
            onChange={(checked) => updateSettings({ enableBatteryOptimization: checked })}
          />
          <SettingRow
            icon={<MonitorPlay className="w-4 h-4 text-luma-violetLight" />}
            label="Pause on fullscreen"
            description="Pause wallpaper when a fullscreen application is active"
            checked={settings.pauseOnFullscreen}
            onChange={(checked) => updateSettings({ pauseOnFullscreen: checked })}
          />
          <SettingRow
            icon={<Activity className="w-4 h-4 text-luma-violetLight" />}
            label="Game mode"
            description="Pause wallpaper when gaming applications are detected"
            checked={settings.pauseOnGameDetected}
            onChange={(checked) => updateSettings({ pauseOnGameDetected: checked })}
          />
        </CardBody>
      </Card>

      {/* Active wallpapers */}
      {Object.keys(runtimeStates).length > 0 && (
        <Card className="border-white/10">
          <CardHeader className="border-white/[0.06]">
            <h2 className="text-lg font-semibold">Active wallpapers</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {Object.values(runtimeStates).map((state) => (
                <div
                  key={`${state.displayId}-${state.wallpaperId}`}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-100 text-sm">{state.wallpaperId}</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        state.isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/[0.05] text-slate-400 border border-white/10'
                      }`}
                    >
                      {state.isRunning ? 'Running' : 'Paused'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <MiniStat label="FPS" value={`${state.fps.toFixed(1)}`} />
                    <MiniStat label="CPU" value={`${state.cpuUsage.toFixed(1)}%`} />
                    <MiniStat label="Memory" value={`${state.memoryUsage.toFixed(1)}%`} />
                    <MiniStat label="Uptime" value={formatUptime(state.uptime)} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value?: string
  unit: string
  pct?: number
  hint?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, unit, pct, hint }) => (
  <Card className="border-white/10">
    <CardBody className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          {icon}
        </div>
      </div>
      {value === undefined ? (
        <>
          <div className="skeleton h-7 w-20" />
          <div className="skeleton h-1.5 w-full" />
        </>
      ) : (
        <>
          <div>
            <div className="text-slate-400 text-sm">{label}</div>
            <div className="text-3xl font-bold text-slate-50 tracking-tight tabular-nums">
              {value}
              <span className="text-base text-slate-500 font-medium ml-1">{unit}</span>
            </div>
          </div>
          <div>
            <div className="h-1.5 rounded-full bg-ink-700/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-luma-violet to-luma-cyan transition-all duration-500"
                style={{ width: `${Math.min(Math.max(pct ?? 0, 2), 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">{hint}</p>
          </div>
        </>
      )}
    </CardBody>
  </Card>
)

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-medium text-slate-100 text-sm">{label}</h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} label={label} />
  </div>
)

interface MiniStatProps {
  label: string
  value: string
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value }) => (
  <div className="text-xs">
    <span className="text-slate-500">{label}</span>
    <span className="text-slate-100 font-semibold ml-1.5 tabular-nums">{value}</span>
  </div>
)

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
