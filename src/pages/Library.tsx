import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Heart,
  Search,
  Shuffle,
  Film,
  Plus,
  Square,
  Sparkles,
  SlidersHorizontal,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@components/Button'
import { VideoImporter } from '@components/VideoImporter'
import { PhotoImporter } from '@components/PhotoImporter'
import { WallpaperModal } from '@components/WallpaperModal'
import { WallpaperCard } from '@components/WallpaperCard'
import { EmptyState } from '@components/EmptyState'
import { ENGINE_CATEGORIES } from '@engines'
import { applyWallpaperLive, stopLiveWallpaper } from '@utils/wallpaperRenderer'
import { isPhotoType, isSceneType } from '@utils/libraryContent'
import { useAppStore } from '@stores/appStore'
import type { Wallpaper } from '@/types/index'

type CategoryFilter = (typeof ENGINE_CATEGORIES)[number]['id'] | 'interactive' | 'custom'
type TypeFilter = 'all' | 'photos' | 'videos' | 'scenes' | 'engines'

interface LibraryChip {
  id: CategoryFilter
  name: string
}

const LIBRARY_CHIPS: LibraryChip[] = [
  ...ENGINE_CATEGORIES.map((c) => ({ id: c.id as CategoryFilter, name: c.name })),
  { id: 'interactive', name: 'Interactive' },
  { id: 'custom', name: 'Custom' },
]

const ROUTE_FILTER: Record<string, CategoryFilter> = {
  explore: 'all',
  favorites: 'favorites',
  library: 'all',
}

const TYPE_CHIPS: { id: TypeFilter; name: string }[] = [
  { id: 'all', name: 'All Types' },
  { id: 'photos', name: 'Photos' },
  { id: 'videos', name: 'Videos' },
  { id: 'scenes', name: 'Scenes' },
  { id: 'engines', name: 'Engines' },
]

export const Library: React.FC = () => {
  const {
    currentRoute,
    wallpapers,
    recentlyUsed,
    setCurrentWallpaperId,
    updateWallpaper,
    removeWallpaper,
    clearLibraryError,
    setCurrentRoute: navigate,
    setIsHostRunning,
    addRecentlyUsed,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<CategoryFilter>(
    () => ROUTE_FILTER[currentRoute] ?? 'all',
  )
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [liveId, setLiveId] = useState<string | null>(null)
  const [showVideoImporter, setShowVideoImporter] = useState(false)
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Route-aware filter (Explore → all, Favorites → favorites)
  useEffect(() => {
    if (currentRoute === 'explore' || currentRoute === 'favorites') {
      setFilterType(ROUTE_FILTER[currentRoute])
    }
  }, [currentRoute])

  // ⌘K / Ctrl+K from the app shell
  useEffect(() => {
    const onFocusSearch = (): void => searchInputRef.current?.focus()
    window.addEventListener('lumawall:focus-search', onFocusSearch)
    return () => window.removeEventListener('lumawall:focus-search', onFocusSearch)
  }, [])

  const featured = useMemo(() => wallpapers.filter((w) => w.isFeatured).slice(0, 6), [wallpapers])

  const filteredWallpapers = useMemo(
    () =>
      wallpapers.filter((w) => {
        const matchesSearch =
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory =
          filterType === 'all' ||
          (filterType === 'favorites' && w.isFavorite) ||
          (filterType === 'interactive' && w.settings?.interactive !== false && w.supportsMouse !== false) ||
          (filterType === 'custom' && (!!w.videoPath || w.id.startsWith('custom') || w.author === 'You (Studio)')) ||
          w.category === filterType
        const isPhoto = isPhotoType(w.contentType)
        const isScene = isSceneType(w.contentType)
        const isVideo = w.type === 'video' || !!w.videoPath
        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'photos' && isPhoto) ||
          (typeFilter === 'videos' && isVideo) ||
          (typeFilter === 'scenes' && isScene) ||
          (typeFilter === 'engines' && (!w.contentType || w.contentType === 'engine'))
        return matchesSearch && matchesCategory && matchesType
      }),
    [wallpapers, searchQuery, filterType, typeFilter],
  )

  const handleToggleFavorite = (wallpaper: Wallpaper): void => {
    updateWallpaper(wallpaper.id, { isFavorite: !wallpaper.isFavorite, modified: new Date() })
  }

  const handleApply = async (wallpaper: Wallpaper): Promise<void> => {
    setCurrentWallpaperId(wallpaper.id)
    const result = await applyWallpaperLive(wallpaper)
    if (result.ok) {
      setLiveId(wallpaper.id)
      setIsHostRunning(true)
      setAppliedId(wallpaper.id)
      addRecentlyUsed(wallpaper.id)
      setTimeout(() => setAppliedId(null), 2500)
    } else {
      console.error('Failed to apply wallpaper:', result.error)
    }
  }

  const handleStopLive = async (): Promise<void> => {
    await stopLiveWallpaper()
    setLiveId(null)
    setCurrentWallpaperId(null)
    setIsHostRunning(false)
  }

  const handleShuffle = async (): Promise<void> => {
    const pool = wallpapers.filter((w) => !w.videoPath)
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setSelectedWallpaper(pick)
    await handleApply(pick)
  }

  const isFiltering = searchQuery !== '' || filterType !== 'all' || typeFilter !== 'all'

  return (
    <div className="space-y-10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
            Wallpaper Library
          </p>
          <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
            Explore worlds built to
            <br className="hidden sm:block" /> live on your desktop.
          </h1>
          <p className="mt-2 text-slate-400 text-[15px]">
            {wallpapers.length} live wallpapers · click any card to customize and apply
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {liveId && (
            <>
              <span className="badge-live animate-pulse-subtle">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live behind icons
              </span>
              <Button variant="ghost" onClick={() => void handleStopLive()} className="text-red-300">
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => void handleShuffle()}>
            <Shuffle className="w-4 h-4" />
            Surprise Me
          </Button>
          <Button variant="secondary" onClick={() => setShowVideoImporter((v) => !v)}>
            <Film className="w-4 h-4" />
            Import
          </Button>
          <Button variant="primary" onClick={() => navigate('creator')}>
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>
      </div>

      {/* ── Featured (responsive grid — no horizontal scroll) ──── */}
      {featured.length > 0 && !isFiltering && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-luma-violetLight" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Featured collection
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-luma-violet/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {featured.map((w) => (
              <WallpaperCard
                key={w.id}
                wallpaper={w}
                isLive={liveId === w.id}
                isJustApplied={appliedId === w.id}
                onSelect={(wp) => setSelectedWallpaper(wp)}
                onApply={(wp) => void handleApply(wp)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Recently Used ──────────────────────────────────────── */}
      {recentlyUsed.length > 0 && !isFiltering && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Recently used
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {recentlyUsed
              .map((id) => wallpapers.find((w) => w.id === id))
              .filter((w): w is Wallpaper => w != null)
              .slice(0, 6)
              .map((w) => (
                <WallpaperCard
                  key={w.id}
                  wallpaper={w}
                  isLive={liveId === w.id}
                  isJustApplied={appliedId === w.id}
                  onSelect={(wp) => setSelectedWallpaper(wp)}
                  onApply={(wp) => void handleApply(wp)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
          </div>
        </section>
      )}

      {/* ── Import panel ───────────────────────────────────────── */}
      {showVideoImporter && (
        <section className="glass rounded-3xl p-5 space-y-6 animate-slide-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-luma-violetLight" />
              Import wallpaper
            </h3>
            <button
              onClick={() => setShowVideoImporter(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Collapse ↑
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-luma-violetLight" />
                Photo — animated with cinematic motion
              </h4>
              <PhotoImporter onImported={() => setShowVideoImporter(false)} />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Film className="w-4 h-4 text-luma-violetLight" />
                Video — loops at native resolution
              </h4>
              <VideoImporter />
            </div>
          </div>
        </section>
      )}

      {/* ── Search + filters ───────────────────────────────────── */}
      <section className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, author, or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-11 py-3 text-[15px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 mr-1" />
          {LIBRARY_CHIPS.map((cat) => {
            const active = filterType === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setFilterType(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize border ${
                  active
                    ? 'bg-luma-gradient text-white border-transparent shadow-glowViolet'
                    : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-slate-100 hover:border-luma-violet/40 hover:bg-white/[0.06]'
                }`}
              >
                {cat.name}
                {cat.id === 'favorites' && (
                  <Heart className={`w-3 h-3 inline-block ml-1.5 -mt-0.5 ${active ? 'fill-white' : ''}`} />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mr-1">Type</span>
          {TYPE_CHIPS.map((t) => {
            const active = typeFilter === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                  active
                    ? 'bg-luma-cyan/15 text-cyan-200 border-luma-cyan/40'
                    : 'bg-white/[0.02] text-slate-500 border-white/10 hover:text-slate-200 hover:border-luma-cyan/30'
                }`}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Grid / empty state ─────────────────────────────────── */}
      {filteredWallpapers.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filteredWallpapers.map((wallpaper) => (
            <WallpaperCard
              key={wallpaper.id}
              wallpaper={wallpaper}
              isLive={liveId === wallpaper.id}
              isJustApplied={appliedId === wallpaper.id}
              onSelect={(wp) => setSelectedWallpaper(wp)}
              onApply={(wp) => void handleApply(wp)}
              onToggleFavorite={handleToggleFavorite}
              onRemove={(wp) => {
                removeWallpaper(wp.id)
                clearLibraryError(wp.id)
                if (liveId === wp.id) void handleStopLive()
              }}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title={wallpapers.length === 0 ? 'No wallpapers yet' : 'Nothing matches your filter'}
          description={
            wallpapers.length === 0
              ? 'Your desktop is waiting for something beautiful. Create or import your first wallpaper.'
              : 'Try a different search term or category — something gorgeous is nearby.'
          }
          actions={
            wallpapers.length === 0 ? (
              <>
                <Button variant="primary" onClick={() => navigate('creator')}>
                  <Plus className="w-4 h-4" />
                  Create Wallpaper
                </Button>
                <Button variant="secondary" onClick={() => setShowVideoImporter(true)}>
                  <Film className="w-4 h-4" />
                  Import Video
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      )}

      {/* Detail modal */}
      <WallpaperModal
        wallpaper={selectedWallpaper}
        onClose={() => setSelectedWallpaper(null)}
      />
    </div>
  )
}
