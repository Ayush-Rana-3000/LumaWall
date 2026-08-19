# LumaWall Quick Start

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Rust 1.70+](https://www.rust-lang.org/tools/install)
- Windows 10/11 (64-bit)

## Run in Development

```bash
npm install
npm run tauri:dev
```

This starts the Vite dev server on `http://localhost:5173` and launches the Tauri application window with hot reload.

## Build for Production

```bash
npm run tauri:build
```

Output:
- `src-tauri/target/release/bundle/nsis/LumaWall_*-setup.exe`
- `src-tauri/target/release/bundle/msi/LumaWall_*.msi`

## Quick Commands

| Command | What it does |
|---------|-------------|
| `npm run tauri:dev` | Full dev mode (frontend + Rust + hot reload) |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run all 35 frontend tests |
| `cd src-tauri && cargo test` | Run all 17 Rust tests |
| `npm run build` | Build frontend only |

## Troubleshooting

**"cargo not found"** — Install Rust from https://rustup.rs/ and restart terminal.

**"Cannot find module"** — Delete `node_modules` and run `npm install`.

**Port 5173 in use** — The dev server automatically picks the next available port.

**WebView2 errors** — Ensure Windows has WebView2 Runtime (ships with Windows 10/11).

## Adding a Wallpaper

Create a folder in `public/library/builtin/wallpapers/`:

```
my-wallpaper/
  metadata.json    # { "id": "my-wallpaper", "type": "photo", ... }
  image.jpg        # The photograph
  depth.png        # Optional depth map
  thumbnail.jpg    # Card thumbnail
```

Restart the app or refresh the library — it auto-discovers new content.

See [docs/WALLPAPER_LIBRARY.md](docs/WALLPAPER_LIBRARY.md) for the full metadata format.

## Further Reading

- [README.md](README.md) — Project overview
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture
- [docs/WALLPAPER_LIBRARY.md](docs/WALLPAPER_LIBRARY.md) — Wallpaper content guide
- [DEVELOPMENT.md](DEVELOPMENT.md) — Full development guide
- [SECURITY.md](SECURITY.md) — Security policy
- [CHANGELOG.md](CHANGELOG.md) — Release history
