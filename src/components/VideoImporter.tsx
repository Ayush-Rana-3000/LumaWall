import React, { useState, useRef, useCallback } from 'react'
import { Upload, Film, Check, X, AlertTriangle, Play, FolderOpen } from 'lucide-react'
import { Button } from '@components/Button'
import {
  applyLiveVideoWallpaper,
  pickVideoFileDialog,
  importVideoFile,
} from '@utils/wallpaperRenderer'
import { useAppStore, isTauriEnvironment } from '@stores/appStore'
import type { Wallpaper } from '@/types/index'

const ACCEPTED_FORMATS = ['.mp4', '.webm', '.avi', '.mkv', '.mov', '.wmv', '.m4v']
const MAX_FILE_SIZE_MB = 2048 // 2 GB

interface VideoImporterProps {
  onImported?: (wallpaper: Wallpaper) => void
  compact?: boolean
}

interface VideoFile {
  diskPath: string
  previewUrl: string
  name: string
  sizeMb: number
  duration?: number
  resolution?: { width: number; height: number }
}

export const VideoImporter: React.FC<VideoImporterProps> = ({ onImported, compact = false }) => {
  const { addWallpaper } = useAppStore()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_FORMATS.includes(ext)) {
      return `Unsupported format "${ext}". Accepted: ${ACCEPTED_FORMATS.join(', ')}`
    }
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return `File too large (${sizeMb.toFixed(0)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`
    }
    return null
  }

  const loadVideoMetadata = (
    previewUrl: string,
    name: string,
    sizeMb: number,
    diskPath: string,
  ): Promise<VideoFile> =>
    new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        resolve({
          diskPath,
          previewUrl,
          name,
          sizeMb,
          duration: Math.round(video.duration),
          resolution: { width: video.videoWidth, height: video.videoHeight },
        })
      }
      video.onerror = () => {
        resolve({
          diskPath,
          previewUrl,
          name,
          sizeMb,
        })
      }
      video.src = previewUrl
    })

  // Open native Windows File Picker dialog when running in Tauri
  const handleNativePick = async () => {
    setError(null)
    if (isTauriEnvironment()) {
      try {
        const picked = await pickVideoFileDialog()
        if (picked) {
          // Convert Windows file path to file:/// URL for webview preview
          const normalized = picked.path.replace(/\\/g, '/')
          const previewUrl = `file:///${normalized}`
          const loaded = await loadVideoMetadata(previewUrl, picked.name, picked.sizeMb, picked.path)
          setVideoFile(loaded)
          setApplySuccess(false)
          return
        }
      } catch (err) {
        console.warn('Native picker error:', err)
      }
    }

    // Fallback to HTML input click
    inputRef.current?.click()
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.isArray(files) ? files[0] : files[0]
      if (!file) return

      setError(null)
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      const previewUrl = URL.createObjectURL(file)

      let diskPath = ''
      if (isTauriEnvironment()) {
        // Stream the file to local storage in chunks (large videos otherwise
        // stall or fail when pushed through a single IPC call).
        setUploadProgress(0)
        const saved = await importVideoFile(file, setUploadProgress)
        setUploadProgress(null)
        if (saved) {
          diskPath = saved.path
        } else {
          setError(
            'Could not save the video to local storage. Please use "Browse" to pick the file with the native dialog instead.',
          )
        }
      }

      const loaded = await loadVideoMetadata(
        previewUrl,
        file.name.replace(/\.[^.]+$/, ''),
        file.size / (1024 * 1024),
        diskPath,
      )
      setVideoFile(loaded)
      setApplySuccess(false)
    },
    [],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files)
    }
  }

  const handleApply = async () => {
    if (!videoFile) return
    setApplying(true)
    setError(null)

    try {
      // In Tauri, always use the real filesystem path from the native picker.
      // If diskPath is empty, the import didn't save — show a helpful error.
      const path = videoFile.diskPath
      if (isTauriEnvironment() && !path) {
        setError(
          'Could not locate the video file on disk. Please use "Browse" to pick the video using the native file dialog.',
        )
        return
      }
      const videoSrc = path || videoFile.previewUrl
      const result = await applyLiveVideoWallpaper(videoSrc)
      if (result.ok) {
        setApplySuccess(true)
        // Save to library with the real path so future "Play Live" works
        const wallpaper = buildWallpaperFromVideo(videoFile)
        addWallpaper(wallpaper)
        onImported?.(wallpaper)
        setTimeout(() => setApplySuccess(false), 3500)
      } else {
        setError(
          `Failed to apply video wallpaper: ${result.error || 'make sure the video file is accessible.'}`,
        )
      }
    } catch (err) {
      setError(`Error: ${String(err)}`)
    } finally {
      setApplying(false)
    }
  }

  const handleSaveToLibrary = () => {
    if (!videoFile) return
    setSaving(true)
    const wallpaper = buildWallpaperFromVideo(videoFile)
    addWallpaper(wallpaper)
    onImported?.(wallpaper)
    setTimeout(() => setSaving(false), 1500)
  }


  const handleClear = () => {
    if (videoFile?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoFile.previewUrl)
    }
    setVideoFile(null)
    setError(null)
    setApplySuccess(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (compact) {
    return (
      <Button variant="secondary" onClick={() => void handleNativePick()}>
        <Film className="w-4 h-4 mr-2" />
        Import Video
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone / Native Picker */}
      {!videoFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => void handleNativePick()}
          className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
            dragging
              ? 'border-luma-violet bg-luma-violet/15 scale-[1.01] shadow-glowViolet'
              : 'border-white/15 bg-white/[0.02] hover:border-luma-violet/50 hover:bg-white/[0.04]'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${
              dragging
                ? 'bg-luma-violet/25 border-luma-violet/40'
                : 'bg-white/[0.04] border-white/10'
            }`}
          >
            <Film className={`w-7 h-7 ${dragging ? 'text-luma-violetLight' : 'text-slate-400'}`} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-100">
              {dragging ? 'Drop your video here' : 'Select or drop a video file'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Click to browse your computer · {ACCEPTED_FORMATS.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full glass text-xs text-slate-300">
            <FolderOpen className="w-3.5 h-3.5 text-luma-violetLight" />
            <span>Opens native Windows file dialog</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-luma-violet/10 border border-luma-violet/30 text-sm">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-luma-gradient rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-xs text-luma-violetLight whitespace-nowrap shrink-0">
            Saving… {uploadProgress}%
          </span>
        </div>
      )}

      {/* Video Preview & Actions */}
      {videoFile && (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-ink-950 border border-white/10">
            <video
              src={videoFile.previewUrl}
              className="w-full max-h-56 object-contain"
              controls={false}
              autoPlay
              loop
              muted
              playsInline
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-red-500/30 transition-colors"
              title="Remove video"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
              <p className="text-sm font-semibold text-white truncate">{videoFile.name}</p>
              <p className="text-xs text-slate-300">
                {videoFile.resolution
                  ? `${videoFile.resolution.width}×${videoFile.resolution.height} · `
                  : ''}
                {videoFile.duration !== undefined
                  ? `${Math.floor(videoFile.duration / 60)}m ${videoFile.duration % 60}s · `
                  : ''}
                {videoFile.sizeMb.toFixed(1)} MB
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              onClick={() => void handleApply()}
              disabled={applying}
              className="flex-1"
            >
              {applySuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-400" />
                  Applied as Live Desktop Wallpaper!
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {applying ? 'Applying behind desktop icons...' : 'Apply as Live Video Wallpaper'}
                </>
              )}
            </Button>

            <Button variant="secondary" onClick={handleSaveToLibrary} disabled={saving}>
              {saving ? 'Saved!' : 'Save to Library'}
            </Button>

            <Button variant="ghost" onClick={handleClear} title="Remove">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload new */}
          <button
            onClick={() => void handleNativePick()}
            className="text-xs text-luma-violetLight hover:text-white transition-colors flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            Choose a different video
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}

function buildWallpaperFromVideo(videoFile: VideoFile): Wallpaper {
  const path = videoFile.diskPath || videoFile.previewUrl
  return {
    id: `video-${Date.now()}`,
    name: videoFile.name || 'Imported Video',
    author: 'You (Imported)',
    version: '1.0.0',
    description: `Live video wallpaper${
      videoFile.resolution
        ? ` · ${videoFile.resolution.width}×${videoFile.resolution.height}`
        : ''
    }${
      videoFile.duration !== undefined
        ? ` · ${Math.floor(videoFile.duration / 60)}m ${videoFile.duration % 60}s`
        : ''
    }`,
    type: 'video',
    thumbnail: undefined,
    videoPath: path,
    filePath: path,
    created: new Date(),
    modified: new Date(),
    isFavorite: false,
    tags: ['Video', 'Imported', 'Live'],
    supportsMouse: false,
    supportsAudio: true,
    supportsSystem: false,
  }
}
