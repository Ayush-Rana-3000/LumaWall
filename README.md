# LumaWall

**Live Beautifully.**

A premium Windows live-wallpaper platform with procedural engines, photo parallax, video import, and cursor-reactive scenes — rendered behind your desktop icons.

> **Status: Release Candidate** — Automated project validation has passed. Final release validation (manual Windows testing) is in progress before v1.0.

[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-blue)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-2021-orange)](https://www.rust-lang.org)

---

## Features

- **17 procedural wallpaper engines** — Matrix, Nebula, Particles, Waves, Rain, and more
- **Photo wallpapers** — Real photographs with cinematic motion, depth parallax, fog, particles
- **Video wallpapers** — MP4/WebM import with seamless looping
- **Interactive WebGL scenes** — Custom renderers with mouse-reactive effects
- **Multi-layer depth** — Up to 6 layers with independent parallax and fog
- **Multi-monitor** — Independent, Clone, or Span modes with per-display assignment
- **`.lumawall` packages** — Portable, validated, safe wallpaper packages
- **Performance modes** — Battery / Balanced / Performance / Quality
- **Settings persistence** — Wallpaper, display assignments, preferences survive restarts
- **Update detection** — Built-in updater checks GitHub Releases

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Rust 1.70+](https://www.rust-lang.org/tools/install)
- Windows 10/11 (64-bit)

### Development

```bash
git clone https://github.com/Ayush-Rana-3000/LumaWall.git lumawall
cd lumawall
npm install
npm run tauri:dev
```

### Build for Production

```bash
npm run tauri:build
```

Output:
- `src-tauri/target/release/bundle/nsis/LumaWall_*-setup.exe` — NSIS installer
- `src-tauri/target/release/bundle/msi/LumaWall_*.msi` — MSI installer

## Commands

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Start dev server with hot reload |
| `npm run tauri:build` | Production build (creates exe/installer) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run build` | Build frontend only |
| `cd src-tauri && cargo test` | Run Rust tests |

## Project Structure

```
lumawall/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/             # UI components (Button, Card, Sidebar, ErrorBoundary...)
│   ├── pages/                  # Dashboard, Library, Displays, Performance, Settings, Creator
│   ├── stores/                 # Zustand state management
│   ├── engines/                # Engine type system, lifecycle, registry
│   ├── types/                  # TypeScript types, content models, package format
│   ├── utils/                  # Logger, persistence, renderer, library content
│   └── App.tsx                 # Root component
│
├── src-tauri/                  # Backend (Rust + Tauri 2)
│   ├── src/
│   │   ├── main.rs             # Entry point, startup logging, display monitor
│   │   ├── commands.rs         # IPC command handlers (30+ commands)
│   │   ├── wallpaper_host.rs   # Windows wallpaper window (WebView2 behind desktop)
│   │   ├── wallpaper_window.rs # WebView2 window management, cursor polling
│   │   ├── workerw.rs          # Win32 WorkerW hierarchy for desktop integration
│   │   ├── display.rs          # Monitor detection (EnumDisplayMonitors)
│   │   ├── system.rs           # CPU/memory/GPU/battery metrics
│   │   ├── library.rs          # Library scanning, package installation
│   │   └── app.rs              # Application state
│   ├── capabilities/           # Tauri 2 IPC permissions
│   ├── icons/                  # Application icons
│   └── tauri.conf.json         # Tauri configuration
│
├── public/library/             # Built-in wallpaper content
│   └── builtin/
│       ├── wallpapers/         # Photo wallpapers (alpine-lake, rainy-tokyo-night)
│       └── scenes/             # WebGL/HTML scenes (cosmic-particles, broken-aurora)
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   └── WALLPAPER_LIBRARY.md
│
├── SECURITY.md                 # Security policy
├── CHANGELOG.md                # Release history
├── LICENSE                     # MIT License
└── ROADMAP.md                  # Development roadmap
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React UI (Dashboard, Library, Settings, ...)   │
│  ↕ Zustand Store                                │
│  ↕ Tauri IPC (type-safe commands)               │
├─────────────────────────────────────────────────┤
│  Rust Backend                                   │
│  ├── Wallpaper Host (WebView2 behind desktop)   │
│  ├── Display Detection (Win32 APIs)             │
│  ├── System Monitoring (CPU/GPU/RAM)            │
│  ├── Library Scanner (filesystem discovery)     │
│  └── Package Manager (.lumawall import/export)  │
├─────────────────────────────────────────────────┤
│  Windows Desktop                                │
│  └── WorkerW hierarchy (Progman → WorkerW)      │
└─────────────────────────────────────────────────┘
```

## Adding a Wallpaper

See [docs/WALLPAPER_LIBRARY.md](docs/WALLPAPER_LIBRARY.md) for the full guide.

**Photo wallpaper** — create a folder in `public/library/builtin/wallpapers/`:
```
my-wallpaper/
  metadata.json    # { "id": "...", "type": "photo", ... }
  image.jpg        # The photograph
  depth.png        # Optional depth map (bright = far)
  thumbnail.jpg    # Card thumbnail
```

**Video wallpaper** — use the Library → Import panel, or create:
```
my-video/
  metadata.json    # { "type": "video", "files": { "preview": "clip.mp4" } }
  clip.mp4
```

**WebGL scene** — create a folder in `public/library/builtin/scenes/`:
```
my-scene/
  metadata.json    # { "type": "webgl", ... }
  index.html       # Your renderer
  thumbnail.jpg
```

The library auto-discovers content from the filesystem — no source code changes needed.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2 |
| Frontend | React 18, TypeScript, Vite |
| State management | Zustand |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend | Rust (2021 edition) |
| Windows APIs | `windows` crate (Win32) |
| WebView | WebView2 |
| Logging | tracing (Rust), custom structured logger (frontend) |
| Testing | Vitest, cargo test |
| Installer | NSIS + MSI |

## Security

LumaWall treats imported wallpapers as untrusted input. See [SECURITY.md](SECURITY.md) for details on:
- CSP enforcement
- Tauri capabilities
- Package validation (path traversal, blocked extensions, size limits)
- Input validation on IPC commands

## Testing & Verification

### Automated verification (all passing)

| Check | Status |
|-------|--------|
| Rust compilation (`cargo check`) | ✅ 0 errors |
| Rust unit tests (`cargo test`) | ✅ 17 passed |
| TypeScript strict mode (`tsc --noEmit`) | ✅ 0 errors |
| ESLint | ✅ 0 errors, 0 warnings |
| Frontend tests (`vitest run`) | ✅ 35 passed |
| Vite production build | ✅ 340 KB JS |

### Manual release validation

See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the full manual testing guide covering wallpaper application, multi-monitor behavior, sleep/wake, performance, and installer/uninstaller verification.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development roadmap. Phases 0–14 are complete. Post-v1.0 work includes online content, creator platform, and optional cloud features.

## Contributing

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions.

## License

[MIT](LICENSE)
