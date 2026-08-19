import React, { useRef, useState } from 'react'
import { Image as ImageIcon, Check, X, AlertTriangle, Upload, FolderOpen, Sparkles } from 'lucide-react'
import { Button } from '@components/Button'
import { isTauriEnvironment, useAppStore } from '@stores/appStore'
import {
  pickImageFileDialog,
  importPhotoWallpaper,
  sceneToWallpaper,
} from '@utils/libraryContent'
import type { LibraryScene } from '@/types/content'

const ACCEPTED = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']

interface PhotoImporterProps {
  onImported?: () => void
}

interface PendingPhoto {
  name: string
  url: string
  /** Absolute disk path when picked via the native dialog (Tauri). */
  path?: string
}

export const PhotoImporter: React.FC<PhotoImporterProps> = ({ onImported }) => {
  const addWallpaper = useAppStore((s) => s.addWallpaper)
  const setCurrentWallpaperId = useAppStore((s) => s.setCurrentWallpaperId)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [photo, setPhoto] = useState<PendingPhoto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleNativePick = async (): Promise<void> => {
    setError(null)
    try {
      const picked = await pickImageFileDialog()
      if (!picked) return
      const { convertFileSrc } = await import('@tauri-apps/api/core')
      setPhoto({
        name: picked.name,
        path: picked.path,
        url: convertFileSrc(picked.path),
      })
    } catch (err) {
      console.warn('native picker failed:', err)
      inputRef.current?.click()
    }
  }

  const handlePick = async (): Promise<void> => {
    if (isTauriEnvironment()) {
      await handleNativePick()
      return
    }
    inputRef.current?.click()
  }

  const handleFiles = async (files: FileList | File[]): Promise<void> => {
    const file = files[0]
    if (!file) return
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported format "${ext}". Accepted: ${ACCEPTED.join(', ')}`)
      return
    }
    setError(null)
    if (isTauriEnvironment()) {
      setError(
        'Dropped files need a real disk path — please use the native file dialog (click the drop zone) so the photo can be copied into your library.',
      )
      return
    }
    setPhoto({ name: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) })
  }

  const handleImport = async (): Promise<void> => {
    if (!photo) return
    setSaving(true)
    setError(null)
    try {
      if (isTauriEnvironment() && photo.path) {
        const scene = (await importPhotoWallpaper(photo.path, photo.name)) as LibraryScene | null
        if (!scene) {
          setError('Could not import the image. Please try the native file dialog.')
          return
        }
        const wp = sceneToWallpaper(scene)
        addWallpaper(wp)
        setCurrentWallpaperId(wp.id)
      } else {
        // Browser preview: build an in-session photo scene from the object URL.
        const fakeScene: LibraryScene = {
          id: `user-browser-${Date.now()}`,
          title: photo.name,
          description: 'Imported photograph (browser preview — session only).',
          author: 'You (Imported)',
          category: 'User',
          tags: ['imported', 'photo', 'user'],
          type: 'photo',
          source: 'user',
          files: { image: photo.url },
          interactive: true,
          audio: false,
          featured: false,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
        }
        const wp = sceneToWallpaper(fakeScene)
        addWallpaper(wp)
        setCurrentWallpaperId(wp.id)
      }
      setSaved(true)
      onImported?.()
      setTimeout(() => {
        setSaved(false)
        setPhoto(null)
      }, 1800)
    } catch (err) {
      setError(`Import failed: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!photo && (
        <div
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => void handlePick()}
          className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
            dragging
              ? 'border-luma-violet bg-luma-violet/15 scale-[1.01] shadow-glowViolet/30'
              : 'border-white/15 bg-white/[0.02] hover:border-luma-violet/50 hover:bg-white/[0.04]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-white/[0.04] border-white/10">
            <ImageIcon className="w-7 h-7 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-100">Select or drop a photo</p>
            <p className="text-slate-400 text-sm mt-1">
              JPG · PNG · WebP · BMP — turned into a cinematic live wallpaper
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full glass text-xs text-slate-300">
            <FolderOpen className="w-3.5 h-3.5 text-luma-violetLight" />
            <span>Opens native Windows file dialog</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {photo && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-ink-950 border border-white/10">
            <img src={photo.url} alt={photo.name} className="w-full max-h-56 object-contain" />
            <button
              onClick={() => {
                setPhoto(null)
                setError(null)
              }}
              className="absolute top-2 right-2 w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-red-500/30 transition-colors"
              title="Remove photo"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950/90 to-transparent px-3 py-2 pointer-events-none">
              <p className="text-sm font-semibold text-white truncate">{photo.name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Will be animated with cinematic motion
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void handleImport()} disabled={saving} className="flex-1">
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Added to Library!
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {saving ? 'Importing…' : 'Add to Library'}
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => void handlePick()}>
              Choose different
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
