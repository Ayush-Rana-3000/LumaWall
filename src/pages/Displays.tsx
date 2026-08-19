import React, { useState } from 'react'
import { Monitor, RefreshCw, Check, Maximize2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@components/Card'
import { Button } from '@components/Button'
import { WallpaperPreview } from '@components/WallpaperPreview'
import { useAppStore, refreshDisplays } from '@stores/appStore'
import type { Wallpaper } from '@/types/index'

export const Displays: React.FC = () => {
  const { displays, activeDisplayId, setActiveDisplayId, wallpapers, displayMode, setDisplayMode, displayAssignments, setDisplayAssignment } = useAppStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedDisplay, setSavedDisplay] = useState<string | null>(null)

  const selectedDisplay = displays.find((d) => d.id === activeDisplayId) || displays[0]

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true)
    await refreshDisplays()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleAssignWallpaper = (displayId: string, wallpaperId: string): void => {
    setDisplayAssignment(displayId, wallpaperId)
    setSavedDisplay(displayId)
    setSaveSuccess(true)
    setTimeout(() => {
      setSaveSuccess(false)
      setSavedDisplay(null)
    }, 2000)
  }

  const wallpaperFor = (id: string): Wallpaper | undefined => wallpapers.find((w) => w.id === id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
            Displays
          </p>
          <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
            Every screen, <span className="text-luma-brand">alive.</span>
          </h1>
          <p className="mt-2 text-slate-400 text-[15px]">
            Manage wallpapers across your multi-monitor setup.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void handleRefresh()}>
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Detect Displays
        </Button>
      </div>

      {displays.length > 0 ? (
        <div className="space-y-8">
          {/* Display mode selector */}
          <section className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Display Mode</h3>
            <div className="flex gap-2">
              {(['independent', 'clone', 'span'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize border ${
                    displayMode === mode
                      ? 'bg-luma-violet/15 text-white border-luma-violet/30 shadow-glowViolet'
                      : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-slate-100 hover:border-luma-violet/30'
                  }`}
                >
                  {mode === 'independent' && 'Independent'}
                  {mode === 'clone' && 'Clone'}
                  {mode === 'span' && 'Span'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {displayMode === 'independent' && 'Each display shows a different wallpaper.'}
              {displayMode === 'clone' && 'All displays show the same wallpaper.'}
              {displayMode === 'span' && 'One wallpaper spans across all displays.'}
            </p>
          </section>

          {/* Visual monitor grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displays.map((display) => {
              const assigned = displayAssignments[display.id]
              const wp = wallpaperFor(assigned)
              const isActive = activeDisplayId === display.id
              const aspect = display.height > 0 ? display.width / display.height : 16 / 9

              return (
                <button
                  key={display.id}
                  onClick={() => setActiveDisplayId(display.id)}
                  className={`group text-left rounded-3xl border p-5 transition-all duration-300 ${
                    isActive
                      ? 'border-luma-violet/50 bg-luma-violet/10 shadow-glowViolet'
                      : 'border-white/10 bg-ink-850/50 hover:border-luma-violet/30'
                  }`}
                >
                  {/* Monitor screen */}
                  <div
                    className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-ink-950 mb-4"
                    style={{ aspectRatio: `${aspect}` }}
                  >
                    {wp ? (
                      <WallpaperPreview
                        engineId={wp.engineType}
                        settings={wp.settings}
                        videoPath={wp.videoPath}
                        thumbnail={wp.thumbnail}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    {/* Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 to-transparent pointer-events-none" />
                    {display.isPrimary && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-luma-violet/30 text-luma-violetLight border border-luma-violet/40 backdrop-blur-md">
                        Primary
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                        Selected
                      </span>
                    )}
                    {/* Resolution chip */}
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md glass text-[10px] font-mono text-slate-300">
                      {display.width}×{display.height}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{display.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {display.dpi} DPI · {display.orientation}
                        {display.refreshRate ? ` · ${display.refreshRate}Hz` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Wallpaper</p>
                      <p className="text-xs text-slate-300 font-medium truncate max-w-[9rem]">
                        {wp ? wp.name : 'None assigned'}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </section>

          {/* Selected display details */}
          {selectedDisplay && (
            <Card className="border-white/10">
              <CardHeader className="border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-luma-violetLight" />
                    {selectedDisplay.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a wallpaper to this display
                  </p>
                </div>
                {saveSuccess && savedDisplay === selectedDisplay.id && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <Check className="w-4 h-4" />
                    Assigned
                  </span>
                )}
              </CardHeader>
              <CardBody className="space-y-5">
                {/* Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <SpecTile label="Resolution" value={`${selectedDisplay.width}×${selectedDisplay.height}px`} />
                  <SpecTile label="Scale" value={`${(selectedDisplay.scale * 100).toFixed(0)}%`} />
                  <SpecTile label="DPI" value={`${selectedDisplay.dpi} DPI`} />
                  <SpecTile label="Orientation" value={selectedDisplay.orientation} />
                  {selectedDisplay.refreshRate && (
                    <SpecTile label="Refresh rate" value={`${selectedDisplay.refreshRate}Hz`} />
                  )}
                  <SpecTile label="Position" value={`${selectedDisplay.x}, ${selectedDisplay.y}`} />
                </div>

                {/* Assignment */}
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Choose wallpaper</label>
                  <select
                    value={displayAssignments[selectedDisplay.id] || ''}
                    onChange={(e) => handleAssignWallpaper(selectedDisplay.id, e.target.value)}
                    className="input"
                  >
                    <option value="">-- Choose a wallpaper --</option>
                    {wallpapers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-white/10">
          <CardBody className="py-16 text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-2xl bg-luma-violet/30 blur-2xl" />
              <div className="relative w-16 h-16 rounded-2xl glass flex items-center justify-center">
                <Maximize2 className="w-7 h-7 text-luma-violetLight" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">No displays detected</h3>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
              LumaWall is attempting to communicate with Windows Display APIs.
            </p>
            <Button variant="primary" onClick={() => void handleRefresh()}>
              Detect Displays
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

interface SpecTileProps {
  label: string
  value: string
}

const SpecTile: React.FC<SpecTileProps> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
    <div className="text-[11px] text-slate-500 mb-1">{label}</div>
    <div className="text-sm font-semibold text-slate-50">{value}</div>
  </div>
)
