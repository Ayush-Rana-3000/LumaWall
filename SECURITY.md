# LumaWall Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in LumaWall, please report it responsibly.
Do not open a public GitHub issue for security vulnerabilities.

## Security Architecture

### IPC Command Restriction

LumaWall uses Tauri 2 capabilities to restrict which commands the frontend can invoke.
Only explicitly declared commands are accessible from the web context.

### Content Security Policy (CSP)

The application enforces a strict CSP:
- `default-src 'self'` — only load resources from the app itself
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:` — required for WebView2 wallpaper rendering
- `img-src` restricted to `self`, `blob:`, `data:`, `file:`, `asset:`
- `connect-src` restricted to `self`, `ipc:`, localhost dev server
- `frame-src 'none'` — no iframes allowed
- `object-src 'none'` — no plugins

### .lumawall Package Security

Imported `.lumawall` packages are treated as **untrusted input**.

Validation performed:
1. **File size** — Max 100 MB total package, 50 MB per file
2. **File count** — Max 500 files per package
3. **ZIP validation** — Magic bytes verified before extraction
4. **Extension blocking** — 22 executable extensions blocked:
   `.exe`, `.bat`, `.cmd`, `.com`, `.msi`, `.ps1`, `.sh`, `.bash`,
   `.dll`, `.so`, `.dylib`, `.scr`, `.pif`, `.vbs`, `.ws`, `.wsh`,
   `.wsf`, `.hta`, `.cpl`, `.inf`, `.reg`
5. **Path traversal** — Canonicalized paths verified to remain within source directory
6. **Package ID** — Must be alphanumeric with hyphens/underscores only
7. **Manifest validation** — Schema, required fields, format validated
8. **Atomic installation** — Copy to temp dir first, then rename; rollback on failure

### File Path Validation

All IPC commands accepting file paths validate:
- No null bytes
- No UNC paths (`\\server\share`)

### Filesystem Isolation

- User wallpapers stored in `%APPDATA%/LumaWall/`
- Imported videos stored in `%APPDATA%/LumaWall/wallpapers/`
- Installed packages stored in user library directory
- Temporary installation uses `.installing_<id>` dirs with cleanup on failure

### WebView2 Sandboxing

Wallpaper WebView2 windows:
- Run in a separate process
- Cannot access the main application window
- Receive only mouse position data (no file system access)
- Are terminated on error (MAX_ERRORS limit = 10)

## Known Limitations

1. **CSP `unsafe-inline` and `unsafe-eval`** — Required for procedural wallpaper engines
   that serialize JavaScript via `toString()`. A future improvement could use
   `Blob` URLs or service workers to avoid this.

2. **No code signing** — Packages are not digitally signed. Users should only import
   packages from trusted sources.

3. **No automatic updates** — The application does not currently auto-update.
   Users download new versions manually.

4. **Local-only** — LumaWall operates entirely offline. No data is sent to external servers.

## Dependency Audit

Key dependencies and their security posture:
- `tauri` 2.0 — Well-maintained, active security updates
- `windows` 0.52 — Official Microsoft crate for Win32 API
- `webview2-com` 0.28 — Official Microsoft WebView2 bindings
- `serde`/`serde_json` — Battle-tested serialization
- `tokio` — Async runtime, well-maintained
- `tracing` — Logging framework, no security surface
