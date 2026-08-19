# LumaWall v1.0 Release Checklist

This checklist covers validation that **cannot be automated** and requires
a real Windows machine. Complete every item before declaring v1.0 ready.

---

## 1. Installation

- [ ] Build NSIS installer: `npm run tauri:build`
- [ ] Run the NSIS installer on a clean Windows 10/11 machine
- [ ] Verify Start Menu shortcut is created
- [ ] Launch LumaWall from Start Menu
- [ ] Verify the application window opens correctly (1400×900)
- [ ] Uninstall via Windows Settings → Apps
- [ ] Verify clean uninstall (no leftover files in Program Files)

## 2. Wallpaper Application

- [ ] Open Library → select "Alpine Reflection" → click Apply
- [ ] Verify the wallpaper appears behind desktop icons
- [ ] Verify the wallpaper is animated (slow camera drift)
- [ ] Move the mouse → verify parallax response
- [ ] Open Library → select "Cosmic Particles" → click Apply
- [ ] Verify the WebGL scene renders and responds to mouse
- [ ] Click Stop → verify wallpaper stops and desktop returns to default
- [ ] Apply a video wallpaper (import MP4) → verify it loops

## 3. Persistence

- [ ] Apply a wallpaper → close LumaWall → reopen
- [ ] Verify the same wallpaper is restored automatically
- [ ] Apply a wallpaper → reboot Windows → verify wallpaper restores on login
- [ ] Change settings (volume, performance mode) → restart → verify settings persist
- [ ] Add a wallpaper to favorites → restart → verify favorites persist

## 4. Multi-Monitor

- [ ] Connect a second monitor (if available)
- [ ] Open Displays page → verify both monitors detected
- [ ] Assign different wallpapers to each display (Independent mode)
- [ ] Switch to Clone mode → verify same wallpaper on both
- [ ] Disconnect second monitor → verify no crash
- [ ] Reconnect → verify detection

## 5. Sleep/Wake

- [ ] Apply a wallpaper → put Windows to sleep
- [ ] Wake from sleep → verify wallpaper resumes correctly
- [ ] Verify no zombie processes after sleep/wake cycle

## 6. Performance

- [ ] Open Performance page → verify CPU/memory metrics update
- [ ] Set performance mode to "Battery" → verify visual quality reduces
- [ ] Set performance mode to "Quality" → verify maximum visual quality
- [ ] Run for 30 minutes → verify no memory leak (check Task Manager)
- [ ] Verify CPU usage < 5% during idle (no interaction)

## 7. Import

- [ ] Library → Import → Photo → select a JPEG → verify it appears in library
- [ ] Library → Import → Video → select an MP4 → verify it appears in library
- [ ] Apply the imported video → verify playback
- [ ] Delete the imported wallpaper → verify it's removed

## 8. Settings

- [ ] Settings → General → toggle startup option
- [ ] Settings → Performance → change performance mode
- [ ] Settings → About → verify version shows "0.1.0"
- [ ] Settings → About → click "Check Updates" → verify behavior (may show "Check Failed" with empty pubkey)

## 9. Error Recovery

- [ ] Apply "Aurora (broken demo)" → verify error card appears (not a crash)
- [ ] Click "Try Again" on the error card → verify recovery
- [ ] Navigate to other pages → verify app still functions after error

## 10. DPI Scaling

- [ ] Set Windows display scaling to 100% → verify UI looks correct
- [ ] Set to 125% → verify no overlapping text or clipped elements
- [ ] Set to 150% → verify sidebar, cards, and controls are usable
- [ ] Set to 200% → verify app remains functional

## 11. Window Behavior

- [ ] Resize the window to minimum (800×600) → verify no overflow
- [ ] Resize to maximum → verify content adapts
- [ ] Verify the title bar shows "LumaWall"
- [ ] Verify minimize/maximize/close buttons work

## 12. Build Artifacts

- [ ] NSIS installer exists in `src-tauri/target/release/bundle/nsis/`
- [ ] MSI installer exists in `src-tauri/target/release/bundle/msi/`
- [ ] Both installers are under 100 MB
- [ ] Installer version matches `package.json` version

---

## Sign-off

| Item | Status | Notes |
|------|--------|-------|
| Installation | ⬜ | |
| Wallpaper application | ⬜ | |
| Persistence | ⬜ | |
| Multi-monitor | ⬜ | |
| Sleep/wake | ⬜ | |
| Performance | ⬜ | |
| Import | ⬜ | |
| Settings | ⬜ | |
| Error recovery | ⬜ | |
| DPI scaling | ⬜ | |
| Window behavior | ⬜ | |
| Build artifacts | ⬜ | |

**Release decision**: ⬜ Ready / ⬜ Not ready

**Tester**: _______________  **Date**: _______________
