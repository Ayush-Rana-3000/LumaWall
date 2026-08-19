# LumaWall Architecture

## Overview

LumaWall is a Windows desktop live-wallpaper platform built with Tauri 2 (Rust backend + React frontend). It renders wallpaper content behind desktop icons using the Win32 WorkerW window hierarchy and WebView2.

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     LumaWall Application                      │
├──────────────────────────────────────────────────────────────┤
│  React UI (TypeScript)                                        │
│  ├── Pages: Dashboard, Library, Displays, Performance,        │
│  │          Settings, Creator                                 │
│  ├── Components: Button, Card, Sidebar, WallpaperCard,        │
│  │              WallpaperPreview, ErrorBoundary, ...           │
│  ├── State: Zustand store (appStore.ts)                       │
│  └── Utils: Logger, Persistence, Renderer, Library Content    │
│                         ↕ Tauri IPC (type-safe commands)      │
├──────────────────────────────────────────────────────────────┤
│  Rust Backend                                                 │
│  ├── Commands: 30+ IPC handlers                               │
│  ├── WallpaperHost: WebView2 window behind desktop            │
│  ├── Display: Monitor detection (Win32 EnumDisplayMonitors)   │
│  ├── System: CPU/memory/GPU/battery metrics                   │
│  ├── Library: Filesystem scanning, package installation        │
│  └── WorkerW: Win32 desktop window hierarchy                  │
├──────────────────────────────────────────────────────────────┤
│  Windows Desktop                                              │
│  └── Progman → WorkerW → Wallpaper WebView2 window            │
└──────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Tech Stack
- **React 18** with functional components and hooks
- **TypeScript** (strict mode, no `any`)
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Vite** for bundling
- **Lucide React** for icons

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| Engine System | `src/engines/` | Type definitions, lifecycle management, registry |
| State Store | `src/stores/appStore.ts` | Centralized app state, persistence, IPC calls |
| Wallpaper Renderer | `src/utils/wallpaperRenderer.ts` | Generates HTML for WebView2, handles apply/stop |
| Library Content | `src/utils/libraryContent.ts` | Scans filesystem, parses metadata, maps to UI models |
| Persistence | `src/utils/wallpaperPersistence.ts` | Save/load wallpaper state via Tauri IPC |
| Logger | `src/utils/logger.ts` | Structured logging with ring buffer |

### Engine Type System

```typescript
interface ProceduralEngine {
  id: string
  name: string
  category: string
  render: (settings, width, height) => string  // returns HTML
}

type EngineState = 'idle' | 'loaded' | 'running' | 'paused' | 'stopped' | 'error'

interface EngineLifecycle {
  initialize(): void
  start(): void
  pause(): void
  resume(): void
  stop(): void
  destroy(): void
  getState(): EngineState
}
```

Lifecycle transitions are enforced — invalid transitions are rejected and logged.

### Error Boundaries

Two levels of error isolation:
1. **Top-level** (`main.tsx`) — catches any crash in the entire app
2. **Per-route** (`App.tsx`) — each page is wrapped individually

A broken page shows a recovery UI while navigation remains functional.

## Backend Architecture (Rust)

### Modules

| Module | Purpose |
|--------|---------|
| `main.rs` | Entry point, tracing init, WebView2 args, startup logging, display monitor |
| `commands.rs` | 30+ `#[tauri::command]` handlers with input validation |
| `wallpaper_host.rs` | WebView2 window creation, HTML loading, base64 handling |
| `wallpaper_window.rs` | Window lifecycle, cursor polling (100ms), resource cleanup |
| `workerw.rs` | Win32 Progman/WorkerW hierarchy for desktop integration |
| `display.rs` | Monitor enumeration, DPI, orientation, refresh rate |
| `system.rs` | CPU/memory/GPU/battery metrics via Win32 APIs |
| `library.rs` | Filesystem scanning, metadata parsing, package installation |
| `app.rs` | Application state management |

### Wallpaper Window Lifecycle

```
1. Find Progman window (FindWindow "Progman")
2. Send WM_COMMAND to create WorkerW layer
3. Find the desktop WorkerW behind icons
4. Create WebView2 window as child of WorkerW
5. Size to display resolution
6. Load wallpaper HTML content
7. Start cursor position polling (100ms interval)
```

### IPC Security

- File paths validated for null bytes and UNC paths
- Package imports check for blocked extensions (22 executable types)
- Path traversal prevention via canonicalization
- Package ID restricted to alphanumeric + hyphens/underscores
- File count limit (500 files per package)
- Size limits (100 MB package, 50 MB per file)

## Wallpaper Content System

### Content Types

| Type | Engine | Assets |
|------|--------|--------|
| `photo` | WebGL2 parallax renderer | image.jpg + optional depth.png |
| `video` | HTML5 video element | clip.mp4 / clip.webm |
| `webgl` | Self-contained WebGL | index.html + assets |
| `html` | Sandboxed iframe | index.html + assets |
| `engine` | Procedural (17 built-in) | None (generated HTML) |

### Auto-Discovery

The library scans these directories on startup:
1. `public/library/builtin/wallpapers/` — built-in photo/video content
2. `public/library/builtin/scenes/` — built-in HTML/WebGL scenes
3. `%APPDATA%/LumaWall/library/user/` — user-imported content

Each wallpaper is a folder with `metadata.json`. The filesystem is the source of truth.

### Photo Wallpaper Rendering

Photo wallpapers use a WebGL2 renderer with:
- **Depth parallax** — UV displacement based on depth map (bright = far)
- **Multi-layer mode** — Up to 6 layers with independent depth
- **Camera motion** — Slow cinematic drift + zoom
- **Atmosphere** — Fog, particles (rain/snow/dust), light rays
- **Quality presets** — Low (0.5x scale), Medium (0.75x), High (1.0x)

## Multi-Monitor

Three display modes:
- **Independent** — Each monitor gets its own wallpaper
- **Clone** — Same wallpaper on all monitors
- **Span** — One wallpaper spans all monitors

Display assignments persist to disk and restore on startup.

## Performance

### Optimizations (Phase 7)
- Cursor polling: 33ms → 100ms (3x fewer IPC calls)
- Display polling: 2s → 5s (2.5x fewer Win32 calls)
- Metrics polling: 3s → 5s (1.7x fewer IPC calls)

### Engine Error Recovery
- MAX_ERRORS = 10 per engine render loop
- Only first error logged (prevents console flooding)
- Engine stops calling render after limit reached
- Application continues running

## Packaging

### `.lumawall` Package Format

```
package.lumawall (ZIP)
├── manifest.json          # Metadata (format version 1)
├── thumbnail.webp|jpg     # Card thumbnail
├── preview.mp4|webm       # Optional video preview
└── wallpaper/             # Scene assets
    ├── image.jpg
    ├── depth.png
    └── index.html
```

Validation: size limits, blocked extensions, path traversal, manifest schema.

### Installers

- **NSIS** — Consumer distribution (branded header/sidebar)
- **MSI** — Enterprise/managed environments
- **Updater** — Tauri updater plugin checks GitHub Releases

## Logging

### Rust
- `tracing` crate, INFO level, with thread IDs
- Startup lifecycle, command invocations, errors

### Frontend
- `src/utils/logger.ts` — debug/info/warn/error levels
- Structured context objects
- Ring buffer (200 entries) for crash reports
- Runtime level control

## Security

- CSP enforced (no `eval` from untrusted sources)
- Tauri capabilities restrict IPC commands
- Package import validates 7 security dimensions
- WebView2 runs isolated behind desktop
- No shell access, no unrestricted filesystem
- See `SECURITY.md` for full policy

## Testing

| Suite | Count | Location |
|-------|-------|----------|
| Rust unit tests | 17 | `src-tauri/src/*.rs` |
| Frontend unit tests | 35 | `src/**/__tests__/` |
| Engine lifecycle tests | 12 | `src/engines/__tests__/` |
| Library content tests | 9 | `src/utils/__tests__/` |
| Type definition tests | 4 | `src/types/__tests__/` |
| Store integration tests | 10 | `src/stores/__tests__/` |
