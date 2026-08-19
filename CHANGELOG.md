# Changelog

All notable changes to LumaWall will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Structured logging (Rust tracing + frontend logger)
- React error boundaries for crash isolation
- Recently-used wallpaper tracking
- Resource tier badges on wallpaper cards
- Multi-layer depth/parallax system for photo wallpapers
- Quality presets (Low/Medium/High) for rendering
- `.lumawall` package format with validation and installation
- Multi-monitor display mode (Independent/Clone/Span)
- Per-display wallpaper assignment persistence
- Tauri updater plugin for update detection
- NSIS installer with branded header/sidebar
- Security: CSP, Tauri capabilities, input validation, path traversal protection
- Engine type system with lifecycle management
- Error-bounded engine rendering (MAX_ERRORS=10)
- SECURITY.md documentation
- .gitignore for clean repository

### Changed
- Cursor poller optimized from 33ms to 100ms (3x fewer IPC calls)
- Display polling optimized from 2s to 5s
- Metrics polling optimized from 3s to 5s
- All engine imports migrated to `@engines` module
- About page "Check Updates" button now functional

### Fixed
- Wallpaper preview/assignment state synchronization
- Settings About page logo/text overlap
- Horizontal scrollbar in Featured Collection
- TopBar stop button now clears currentWallpaperId

## [0.1.0] - 2026-08-17

### Added
- Desktop application shell (Tauri 2 + React 18)
- Dashboard with performance monitoring
- Wallpaper library with search, categories, favorites
- Display management page
- Performance monitoring page
- Settings page with categories
- Creator page
- 17 procedural wallpaper engines
- Zustand state management
- Tailwind CSS styling
- Rust backend with Win32 API integration
- Display detection (EnumDisplayMonitors)
- Performance metrics (CPU, memory, GPU)
- Video wallpaper import
- Photo wallpaper import with depth maps
- Mouse-reactive parallax
- Settings persistence
- Wallpaper state persistence across restarts
