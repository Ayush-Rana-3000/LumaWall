import React from 'react'
import { Search, Zap, Square } from 'lucide-react'
import { useAppStore } from '@stores/appStore'
import { stopLiveWallpaper } from '@utils/wallpaperRenderer'
import { LumaLogo } from '@components/LumaLogo'

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Home', subtitle: 'Live Beautifully.' },
  library: { title: 'Library', subtitle: 'Explore worlds built to live on your desktop.' },
  displays: { title: 'Displays', subtitle: 'Your wallpapers, on every screen.' },
  performance: { title: 'Performance', subtitle: 'Quiet power, measured clearly.' },
  settings: { title: 'Settings', subtitle: 'Make LumaWall yours.' },
  creator: { title: 'Creator Studio', subtitle: 'Create something alive.' },
}

export const TopBar: React.FC = () => {
  const { currentRoute, setCurrentRoute, isHostRunning, setIsHostRunning, setCurrentWallpaperId, wallpapers } = useAppStore()
  const info = ROUTE_TITLES[currentRoute] ?? ROUTE_TITLES.dashboard
  const current = wallpapers.find((w) => w.id === useAppStore.getState().currentWallpaperId)

  const handleStop = async (): Promise<void> => {
    await stopLiveWallpaper()
    setCurrentWallpaperId(null)
    setIsHostRunning(false)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 md:px-8 py-4 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <span className="md:hidden shrink-0">
          <LumaLogo size={22} withGlow={false} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-200 truncate leading-tight">{info.title}</h2>
          <p className="text-[11px] text-slate-500 truncate hidden sm:block">{info.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isHostRunning && (
          <div className="flex items-center gap-2">
            <span className="badge-live animate-pulse-subtle hidden sm:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {current ? current.name : 'Live on desktop'}
            </span>
            <button
              onClick={() => void handleStop()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              title="Stop live wallpaper"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          </div>
        )}

        <button
          onClick={() => setCurrentRoute('library')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass glass-hover text-sm text-slate-300 w-44 hidden lg:flex"
          title="Search wallpapers"
        >
          <Search className="w-4 h-4 text-slate-500" />
          <span className="text-slate-500">Search wallpapers…</span>
          <kbd className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] border border-white/10 text-slate-500">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => setCurrentRoute('dashboard')}
          className="w-8 h-8 rounded-xl bg-luma-violet/15 border border-luma-violet/30 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luma-violet/50"
          title="Status: ready"
        >
          <Zap className="w-4 h-4 text-luma-violetLight" />
        </button>
      </div>
    </header>
  )
}
