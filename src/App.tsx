import { useEffect } from 'react'
import { Sidebar } from '@components/Sidebar'
import { TopBar } from '@components/TopBar'
import { ErrorBoundary } from '@components/ErrorBoundary'
import {
  Dashboard,
  Library,
  Displays,
  Performance,
  Settings,
  Creator,
} from '@pages/index'
import {
  useAppStore,
  refreshDisplays,
  fetchPerformanceMetrics,
  attachDisplayChangeListener,
} from '@stores/appStore'
import { applyWallpaperLive } from '@utils/wallpaperRenderer'
import { log } from '@utils/logger'

export default function App(): JSX.Element {
  const { currentRoute, setCurrentRoute } = useAppStore()

  // ── Startup: load persisted state, detect running wallpaper, auto-apply ──
  useEffect(() => {
    log.info('LumaWall frontend initializing')
    void refreshDisplays()
    void fetchPerformanceMetrics()
    void useAppStore.getState().loadLibraryContent()
    void useAppStore.getState().loadPersistedState()

    // Poll metrics every 5s — CPU/memory change slowly, no need for 3s.
    const metricsInterval = setInterval(() => {
      void fetchPerformanceMetrics()
    }, 5000)

    const cleanupDisplays = attachDisplayChangeListener()

    return () => {
      clearInterval(metricsInterval)
      cleanupDisplays()
    }
  }, [])

  // After the library is loaded, if we have a persisted wallpaper that isn't
  // currently running, re-apply it so the desktop wallpaper survives restarts.
  const persistedLoaded = useAppStore((s) => s.persistedLoaded)
  const libraryLoaded = useAppStore((s) => s.libraryLoaded)
  useEffect(() => {
    const { currentWallpaperId, isHostRunning } = useAppStore.getState()
    if (!persistedLoaded || !libraryLoaded) return
    if (!currentWallpaperId || isHostRunning) return

    const wallpaper = useAppStore
      .getState()
      .wallpapers.find((w) => w.id === currentWallpaperId)
    if (!wallpaper) return

    void (async () => {
      const result = await applyWallpaperLive(wallpaper)
      if (result.ok) {
        useAppStore.getState().setIsHostRunning(true)
      }
    })()
  }, [persistedLoaded, libraryLoaded])

  // ⌘K / Ctrl+K → focus library search
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCurrentRoute('library')
        window.dispatchEvent(new CustomEvent('lumawall:focus-search'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCurrentRoute])

  const renderPage = (): JSX.Element => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />
      case 'explore':
      case 'favorites':
      case 'library':
        return <Library />
      case 'displays':
        return <Displays />
      case 'performance':
        return <Performance />
      case 'settings':
        return <Settings />
      case 'creator':
        return <Creator />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden aurora-bg">
      {/* Ambient aurora blobs */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="aurora-blob w-[42rem] h-[42rem] -top-40 -left-40 bg-luma-violet/60" />
        <div className="aurora-blob w-[36rem] h-[36rem] top-1/3 -right-48 bg-luma-cyan/40" style={{ animationDelay: '-8s' }} />
        <div className="aurora-blob w-[30rem] h-[30rem] -bottom-32 left-1/4 bg-luma-blue/40" style={{ animationDelay: '-16s' }} />
      </div>

      {/* Sidebar */}
      <div className="relative z-20 flex">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <TopBar />
        <main key={currentRoute} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto animate-page-in">
            <ErrorBoundary label={currentRoute}>
              {renderPage()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
