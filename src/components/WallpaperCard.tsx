import React from 'react'
import { Heart, Play, Check, Monitor, Sparkles, AlertTriangle, Trash2 } from 'lucide-react'
import { WallpaperPreview } from '@components/WallpaperPreview'
import { isPhotoType } from '@utils/libraryContent'
import type { Wallpaper } from '@/types/index'

interface WallpaperCardProps {
  wallpaper: Wallpaper
  isLive?: boolean
  isJustApplied?: boolean
  onSelect: (wallpaper: Wallpaper) => void
  onApply?: (wallpaper: Wallpaper) => void
  onToggleFavorite?: (wallpaper: Wallpaper) => void
  onRemove?: (wallpaper: Wallpaper) => void
  className?: string
}

const TYPE_LABEL: Record<string, string> = {
  photo: 'Photo',
  video: 'Video',
  animated: 'Animated',
  webgl: 'WebGL',
  html: 'Scene',
  interactive: 'Interactive',
  engine: 'Live',
}

export const WallpaperCard: React.FC<WallpaperCardProps> = ({
  wallpaper,
  isLive = false,
  isJustApplied = false,
  onSelect,
  onApply,
  onToggleFavorite,
  onRemove,
  className,
}) => {
  const isVideo = wallpaper.type === 'video' || !!wallpaper.videoPath
  const isPhoto = isPhotoType(wallpaper.contentType)
  const isInteractive =
    wallpaper.settings?.interactive !== false &&
    wallpaper.supportsMouse !== false &&
    (wallpaper.contentType ? !isPhoto : true)

  const typeLabel = isVideo ? 'Video' : TYPE_LABEL[wallpaper.contentType ?? 'engine'] ?? 'Live'

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-ink-850/70 border border-white/[0.08] shadow-glowCard transition-all duration-300 hover:border-luma-violet/40 hover:shadow-glowViolet/25 hover:-translate-y-0.5 ${
        wallpaper.libraryBroken ? 'border-red-500/30' : ''
      } ${className ?? ''}`}
    >
      {/* Preview */}
      <button
        onClick={() => onSelect(wallpaper)}
        className="relative aspect-video w-full overflow-hidden bg-ink-900 text-left"
        aria-label={`Open ${wallpaper.name}`}
      >
        <WallpaperPreview
          engineId={wallpaper.engineType}
          settings={wallpaper.settings}
          videoPath={wallpaper.videoPath}
          thumbnail={wallpaper.thumbnail}
          contentType={wallpaper.contentType}
          contentUrl={wallpaper.contentUrl}
          broken={wallpaper.libraryBroken}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/90 to-transparent pointer-events-none" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {wallpaper.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-luma-violet/25 text-luma-violetLight border border-luma-violet/40 backdrop-blur-md">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/[0.08] text-slate-200 border border-white/15 backdrop-blur-md">
            {typeLabel}
          </span>
          {isInteractive && !isPhoto && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
              Interactive
            </span>
          )}
          {wallpaper.perfEstimate && (
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md border ${
                wallpaper.perfEstimate === 'low'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : wallpaper.perfEstimate === 'high'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
              }`}
              title={`${wallpaper.perfEstimate} resource usage`}
            >
              {wallpaper.perfEstimate === 'low' ? '⚡ Light' : wallpaper.perfEstimate === 'high' ? '🔥 Heavy' : '⚖️ Balanced'}
            </span>
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute inset-0 bg-ink-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5">
          {!wallpaper.libraryBroken && onApply && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onApply(wallpaper)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-ink-950 text-sm font-semibold shadow-glowViolet hover:scale-105 transition-transform"
            >
              {isJustApplied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Applied!
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Apply
                </>
              )}
            </span>
          )}
          {wallpaper.libraryBroken && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Unavailable
            </span>
          )}
          {onToggleFavorite && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(wallpaper)
              }}
              className="p-2.5 rounded-xl glass text-white hover:bg-white/15 transition-colors"
              aria-label={wallpaper.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 ${wallpaper.isFavorite ? 'fill-luma-pink text-luma-pink' : 'text-white'}`}
              />
            </span>
          )}
          {onRemove && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(wallpaper)
              }}
              className="p-2.5 rounded-xl glass text-red-300 hover:bg-red-500/20 transition-colors"
              aria-label={`Remove ${wallpaper.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </span>
          )}
        </div>
      </button>

      {/* Meta */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 text-[15px] truncate leading-tight">{wallpaper.name}</h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {wallpaper.author}
            {wallpaper.resolution ? ` · ${wallpaper.resolution}` : ''}
          </p>
        </div>
        <button
          onClick={() => onSelect(wallpaper)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 glass glass-hover"
        >
          <Monitor className="w-3.5 h-3.5" />
          Details
        </button>
      </div>
    </div>
  )
}
