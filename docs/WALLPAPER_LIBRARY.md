# LumaWall Wallpaper Library

LumaWall treats wallpapers as **content** — folders on disk described by a
`metadata.json` — discovered at runtime. You add a wallpaper by creating a
folder and dropping files into it; **you never edit application source code**.

```
public/library/                  ← content root (also bundled into the app)
├── builtin/                     ← ships with LumaWall; never overwritten by updates
│   ├── wallpapers/              ← photo / animated / video content
│   │   ├── nature/
│   │   │   └── alpine-lake/
│   │   │       ├── metadata.json
│   │   │       ├── image.png        ← the photograph
│   │   │       ├── depth.png        ← optional depth map (bright = far)
│   │   │       └── thumbnail.jpg    ← optimized card thumbnail
│   │   └── city/
│   │       └── rainy-tokyo-night/
│   │           ├── metadata.json
│   │           ├── image.png
│   │           └── depth.png
│   └── scenes/                  ← HTML / WebGL / interactive content
│       ├── cosmic-particles/
│       │   ├── metadata.json
│       │   ├── index.html       ← the scene's own renderer
│       │   └── thumbnail.jpg
│       └── broken-aurora/       ← QA fixture (missing files) — exercises error handling
└── manifest.json                ← generated browser-mode index (see below)
```

**User content** lives outside the app folder, at
`%APPDATA%\LumaWall\library\user\<id>\`, so application updates never touch it.
Import via the Library → **Import** panel (photo or video).

---

## 1. The metadata format

Every wallpaper folder needs a `metadata.json`:

```jsonc
{
  "id": "alpine-lake",              // unique id
  "title": "Alpine Reflection",     // display title
  "description": "A cinematic alpine lake at dawn.",
  "author": "Luma Studio",
  "category": "Nature",             // Nature / City / Space / Abstract / ...
  "tags": ["mountains", "lake", "sunrise", "cinematic"],
  "type": "photo",                  // photo | video | animated | webgl | html | interactive
  "source": "builtin",              // builtin | user  (the scanner sets this)
  "files": {                        // asset names inside this folder
    "image": "image.png",           //   photo: the photograph
    "depth": "depth.png",           //   photo: optional depth map
    "thumbnail": "thumbnail.jpg",   //   card thumbnail (optional)
    "preview": "preview.mp4",       //   video: the video file
    "scene": "index.html"           //   html/webgl: entry point
  },
  "resolution": "1600x900",         // display string (UI only)
  "aspectRatio": "16:9",
  "fps": 60,
  "interactive": true,
  "audio": false,
  "featured": true,
  "recommended": false,
  "version": "1.0.0",
  "interaction": {                  // only what the scene actually supports
    "mouseParallax": true,
    "mouseGlow": false,
    "clickEffects": false,
    "audioReactive": false
  },
  "perfEstimate": "medium",         // low | medium | high
  "settings": [                     // dynamic, metadata-driven customization
    { "id": "motion", "type": "slider", "label": "Motion", "min": 0, "max": 100, "step": 1, "default": 35 },
    { "id": "particles", "type": "select", "label": "Particles", "default": "none",
      "options": [ { "value": "none", "label": "None" }, { "value": "rain", "label": "Rain" } ] },
    { "id": "lightRays", "type": "boolean", "label": "Light Rays", "default": false }
  ]
}
```

Setting control types: `slider` (min/max/step), `boolean`, `select` (options),
`color`, `text`. The UI generates controls from this array — no per-wallpaper UI
code.

---

## 2. Photo wallpapers (the important one)

A real photograph becomes a *live* wallpaper. The engine applies:

- **Cinematic camera motion** — very slow drift + gentle zoom (configurable
  `motion` / `zoom`). Deliberately subtle, not a Ken Burns slideshow.
- **Depth parallax (2.5D)** — if `depth.png` exists, a WebGL2 renderer displaces
  the image by depth so the foreground and background separate as your cursor
  moves. Falls back to 2D motion when there's no depth map or WebGL2.
- **Atmosphere & particles** — fog, rain, snow, floating dust, light rays.
- **Color grading** — warmth / brightness, vignette.

To add a photo wallpaper:

```
library/wallpapers/nature/my-spot/
    metadata.json     (type: "photo", files.image → image.jpg)
    image.jpg
    depth.png         (optional)
    thumbnail.jpg     (optional, 640px wide is plenty)
```

**Creating a depth map**: a grayscale PNG where **bright = far, dark = near**.
Photopea/GIMP/Photoshop: duplicate the photo, desaturate, paint distance,
export as grayscale PNG at the same dimensions as the image.

**Thumbnails**: 640–1280px wide JPEG. The Library never loads the original
4K image — only the thumbnail — so hundreds of wallpapers stay fast.

---

## 3. Video wallpapers

```
library/wallpapers/.../<id>/
    metadata.json   (type: "video", files.preview → clip.mp4)
    clip.mp4
```

Supported: `.mp4`, `.webm`. The desktop host loops the video muted, adapts to
display resolution, and pauses rendering when fullscreen/game modes are active
(per the Performance settings). Videos are streamed, not loaded into memory.
Import a video from the Library → Import panel instead of hand-crafting a
folder if you prefer.

---

## 4. HTML / WebGL / interactive scenes

A scene ships its **own renderer**:

```
library/scenes/webgl/cosmic-particles/
    index.html      ← full page; runs inside a sandboxed iframe
    assets/…
    thumbnail.jpg
    metadata.json   (type: "webgl" | "html" | "interactive")
```

### The interaction bridge

The host page forwards the LumaWall interaction state to your scene via
`window.postMessage`:

```js
// Scene receives (listen on window):
{ type: 'lw-init',  settings: { density: 80, ... }, width, height }
{ type: 'lw-state', mouseX: 0.42, mouseY: 0.57, time: 123.4, perf: 1 }

// Standalone fallback: the scene can also read injected globals:
window.__lw_mx, window.__lw_my   // normalized 0..1 cursor position
```

Scenes should declare only the interactions they implement in
`metadata.json > interaction` (mouseParallax, mouseGlow, clickEffects,
audioReactive) — the UI surfaces exactly those.

### Sandboxing

Scenes run in an iframe with `sandbox="allow-scripts"` only: no same-origin
file access, no forms, no top navigation. A broken scene is caught by the host
(8s load watchdog) and shown as an error card — **it can never crash LumaWall**.

---

## 5. Auto-discovery & refresh

- **Packaged app (Tauri):** the Rust backend scans the library folders on every
  launch and on demand (`scan_library`). Add a folder → restart or refresh.
- **Browser preview (dev):** the UI reads `public/library/manifest.json`.
  Regenerate it after adding/removing content:

  ```bash
  node scripts/build-library-manifest.mjs
  ```

  The generator nulls-out missing assets so broken content is flagged instead
  of 404ing.

The filesystem is the source of truth; the in-app library is just an index
that can be rebuilt at any time.

---

## 6. Customization

Each wallpaper's `settings` array drives the detail view's controls
(slider/boolean/select/color/text). Values are persisted per wallpaper and
re-applied when you set it live. Photo scenes without a declared `settings`
array get the standard cinematic controls (Motion, Depth Parallax, Zoom,
Atmosphere, Particles, Light Rays, Vignette, Warmth).

---

## 7. Test content

`scripts/generate-library-content.ps1` generates the built-in test library
(procedurally drawn placeholder photography — replace with real curated
images at any time; the format is identical). It produces:

| Scene | Type | Depth | Purpose |
|---|---|---|---|
| `alpine-lake` | photo | ✅ | photo + depth map + particles/snow |
| `rainy-tokyo-night` | photo | ✅ | rain, light rays, warmth grading |
| `cosmic-particles` | webgl | — | self-contained WebGL scene + interaction bridge |
| `broken-aurora` | html | — | error-handling fixture (missing files) |

Regenerate with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-library-content.ps1
```
