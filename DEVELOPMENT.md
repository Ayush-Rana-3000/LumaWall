# LumaWall Development Guide

## Prerequisites

- **Node.js 18+** — https://nodejs.org/
- **Rust 1.70+** — https://www.rust-lang.org/tools/install
- **Windows 10/11** (64-bit)
- **VS Code** (recommended) with Rust Analyzer extension

## Quick Start

```bash
# Install dependencies
npm install

# Start development (frontend + Rust backend with hot reload)
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Available Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only (http://localhost:5173) |
| `npm run build` | Build frontend to `dist/` |
| `npm run typecheck` | TypeScript type checking (strict mode) |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npx vitest run` | Run all tests |
| `npx vitest run --watch` | Run tests in watch mode |

### Tauri (Full App)

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Dev server + Rust backend + Tauri window |
| `npm run tauri:build` | Production build (exe + installers) |

### Rust (from `src-tauri/`)

| Command | Description |
|---------|-------------|
| `cargo check` | Type-check Rust code |
| `cargo test` | Run Rust unit tests |
| `cargo build` | Build Rust backend |

## Project Architecture

```
src/                          Frontend (React + TypeScript)
├── components/               Reusable UI (Button, Card, Sidebar, ErrorBoundary, ...)
├── pages/                    Route pages (Dashboard, Library, Displays, Performance, Settings, Creator)
├── engines/                  Engine type system, lifecycle management, registry
├── stores/                   Zustand state (appStore.ts)
├── types/                    TypeScript types, content models, package format
├── utils/                    Logger, persistence, wallpaper renderer, library content
├── App.tsx                   Root component, routing, startup
└── main.tsx                  Entry point

src-tauri/                    Backend (Rust + Tauri 2)
├── src/
│   ├── main.rs               Entry point, logging, startup, display monitor
│   ├── commands.rs           30+ IPC commands (wallpaper, display, library, package)
│   ├── wallpaper_host.rs     Windows wallpaper window (WebView2 behind desktop icons)
│   ├── wallpaper_window.rs   WebView2 window management, cursor polling
│   ├── workerw.rs            Win32 WorkerW hierarchy
│   ├── display.rs            Monitor detection (EnumDisplayMonitors)
│   ├── system.rs             CPU/memory/GPU/battery metrics
│   ├── library.rs            Library scanning, package installation
│   └── app.rs                Application state
├── capabilities/             Tauri 2 IPC permissions
├── icons/                    Application icons (ico + png)
└── tauri.conf.json           Tauri configuration
```

## Key Systems

### Wallpaper Engine

Wallpapers are rendered in a WebView2 window positioned behind desktop icons using the Win32 WorkerW hierarchy. The engine supports:
- Procedural engines (17 built-in)
- Photo wallpapers with WebGL2 depth parallax
- Video wallpapers (MP4/WebM)
- HTML/WebGL scenes

### Engine Lifecycle

```
idle → loaded → running ⇄ paused → stopped → idle
                         ↘ error
```

Managed by `src/engines/registry.ts` with error-bounded rendering (MAX_ERRORS = 10).

### Library System

Wallpapers are discovered from the filesystem:
- **Built-in**: `public/library/builtin/`
- **User-imported**: `%APPDATA%/LumaWall/library/user/`
- **Package-installed**: via `.lumawall` import

Each wallpaper has a `metadata.json` — see `docs/WALLPAPER_LIBRARY.md`.

### Persistence

- Wallpaper state: `%APPDATA%/LumaWall/wallpaper_state.json`
- Recently used: `localStorage` (ring buffer of 20)
- Display assignments: persisted in wallpaper state

### Structured Logging

- **Rust**: `tracing` crate at INFO level with structured fields
- **Frontend**: `src/utils/logger.ts` — levels (debug/info/warn/error), context objects, ring buffer (200 entries)

## Testing

```bash
# Frontend tests (35 tests)
npx vitest run

# Rust tests (17 tests)
cd src-tauri && cargo test

# Type checking
npm run typecheck

# Linting
npm run lint

# Full build verification
npm run build && cd src-tauri && cargo check
```

## Troubleshooting

### "cargo not found"
Install Rust: https://www.rust-lang.org/tools/install. Restart terminal after installation.

### Hot reload not working
Ensure port 5173 is free. The dev server will use the next available port automatically.

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### WebView2 errors
Ensure Windows 10/11 has WebView2 Runtime installed (ships with modern Windows).

### Build fails with Tauri config errors
Check `src-tauri/tauri.conf.json` against the Tauri 2 schema. Run `cargo clean` in `src-tauri/` and rebuild.

## Security Notes

- Imported `.lumawall` packages are treated as untrusted
- IPC commands validate file paths (null bytes, UNC paths)
- Package installation checks for blocked extensions and path traversal
- CSP is enforced in the Tauri webview
- See `SECURITY.md` for the full security policy
