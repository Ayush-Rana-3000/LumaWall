# LumaWall Production Roadmap

## Completed Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 | Architecture Audit | ✅ Complete |
| 1 | Stabilize Existing Application | ✅ Complete |
| 2 | Production UI/UX | ✅ Complete |
| 3 | Engine Architecture | ✅ Complete |
| 4 | Multi-Layer Depth & Parallax | ✅ Complete |
| 5 | `.lumawall` Package Format | ✅ Complete |
| 6 | Multi-Monitor System | ✅ Complete |
| 7 | Performance Optimization | ✅ Complete |
| 8 | Library & Content Pipeline | ✅ Complete |
| 9 | Reliability, Logging & Recovery | ✅ Complete |
| 10 | Security Hardening | ✅ Complete |
| 12 | Installer, Uninstaller & Updates | ✅ Complete |
| 13 | Repository & Documentation Cleanup | ✅ Complete |
| 14 | Release Audit | ✅ Complete |

## v1.0 Release Status

**Status: RELEASE CANDIDATE**

LumaWall v1.0 is functionally complete. The release audit (Phase 14) has been
performed. Automated tests pass (52 tests: 17 Rust + 35 frontend). All Critical
and High defects have been resolved.

### Remaining Validation (requires real Windows hardware)

The following items cannot be verified through automated testing and require
manual validation on a real Windows machine:

- [ ] Wallpaper restoration after app restart
- [ ] Wallpaper restoration after Windows reboot
- [ ] Sleep/wake behavior (wallpaper pauses and resumes)
- [ ] Multi-monitor wallpaper assignment (Independent/Clone/Span)
- [ ] Monitor hot-plug (connect/disconnect while running)
- [ ] NSIS installer creation and uninstall
- [ ] MSI installer creation and uninstall
- [ ] DPI scaling at 125%, 150%, 200%
- [ ] Video wallpaper playback (MP4, WebM)
- [ ] Photo wallpaper depth parallax with cursor
- [ ] WebGL scene interaction (cosmic-particles)
- [ ] `.lumawall` package import and installation
- [ ] Settings persistence across restarts
- [ ] CPU usage in idle state (target: < 5%)
- [ ] Memory usage in idle state (target: < 200 MB)

See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the full manual testing guide.

## Post-v1.0 Roadmap

| Phase | Name | Priority |
|-------|------|----------|
| 15 | Cloud & Online Content | Post-v1.0 |
| 16 | Creator Platform & Marketplace | Post-v1.0 |
| 17 | Accounts, Sync & Monetization | Post-v1.0 |

## Known Issues (documented, not release blockers)

### Medium
- 34 `console.warn/error` calls should use structured logger for consistency
- FPS and GPU metrics in Performance dashboard are hardcoded constants
- No fullscreen application detection (pause on fullscreen not functional)

### Low
- Updater pubkey empty (expected for pre-release, will be populated for v1.0)
- Generated PNG icons are gradient placeholders (should be replaced with designed icons)
- `unsafe-inline`/`unsafe-eval` in CSP required for procedural engines
- No code signing for `.lumawall` packages
- `.github/agents/Senior-Engineer.agent.md` internal artifact retained in repo
