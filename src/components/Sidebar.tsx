import React from 'react'
import {
  LayoutGrid,
  Compass,
  Image,
  Heart,
  Monitor,
  Gauge,
  Settings,
  Wand2,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import type { NavRoute } from '@/types/index'
import { useAppStore } from '@stores/appStore'
import { LumaBrand } from '@components/LumaLogo'

interface NavItem {
  id: NavRoute
  label: string
  icon: React.ReactNode
  hint?: string
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Discover',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-[18px] h-[18px]" /> },
      { id: 'explore', label: 'Explore', icon: <Compass className="w-[18px] h-[18px]" /> },
      { id: 'library', label: 'Library', icon: <Image className="w-[18px] h-[18px]" /> },
      { id: 'favorites', label: 'Favorites', icon: <Heart className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Studio',
    items: [
      { id: 'creator', label: 'Creator', icon: <Wand2 className="w-[18px] h-[18px]" /> },
      { id: 'displays', label: 'Displays', icon: <Monitor className="w-[18px] h-[18px]" /> },
      { id: 'performance', label: 'Performance', icon: <Gauge className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" /> }],
  },
]

export const Sidebar: React.FC = () => {
  const { currentRoute, setCurrentRoute, sidebarOpen, toggleSidebar, isHostRunning, wallpapers } =
    useAppStore()

  const liveCount = isHostRunning ? 1 : 0
  const favCount = wallpapers.filter((w) => w.isFavorite).length

  const navigate = (id: NavRoute): void => {
    setCurrentRoute(id)
    if (window.innerWidth < 1024) toggleSidebar()
  }

  return (
    <>
      {/* Overlay for narrow windows */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-ink-950/60 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 h-full w-[248px] flex flex-col',
          'bg-ink-900/90 border-r border-white/[0.06] backdrop-blur-xl',
          'transition-transform duration-300 ease-out',
          'lg:relative lg:translate-x-0 lg:z-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <LumaBrand size={24} />
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live status pill */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isHostRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-slate-600',
              )}
            />
            <span className="text-xs text-slate-400 truncate">
              {isHostRunning ? 'Live on desktop' : 'Ready to wallpaper'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = currentRoute === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => navigate(item.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luma-violet/50 focus-visible:ring-offset-1 focus-visible:ring-offset-ink-900',
                          active
                            ? 'text-white'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]',
                        )}
                      >
                        {/* soft illuminated pill */}
                        {active && (
                          <span className="absolute inset-0 rounded-xl bg-luma-violet/15 border border-luma-violet/30 shadow-glowViolet" />
                        )}
                        <span
                          className={clsx(
                            'relative transition-colors',
                            active ? 'text-luma-violetLight' : 'text-slate-500 group-hover:text-slate-300',
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="relative">{item.label}</span>
                        {item.id === 'favorites' && favCount > 0 && (
                          <span className="relative ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-slate-400 tabular-nums">
                            {favCount}
                          </span>
                        )}
                        {item.id === 'dashboard' && liveCount > 0 && (
                          <span className="relative ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            LumaWall <span className="text-slate-500">v0.1.0</span>
            <br />
            <span className="text-luma-violetLight/70">Live Beautifully.</span>
          </p>
        </div>
      </aside>
    </>
  )
}
