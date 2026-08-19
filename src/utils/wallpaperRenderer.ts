import { invoke } from '@tauri-apps/api/core'
import { isTauriEnvironment, setWallpaperFromCanvas } from '@stores/appStore'
import { WALLPAPER_ENGINES, type EngineType } from '@engines'
import {
  isPhotoType,
  isSceneType,
  toSceneSettings,
  toFileUrl,
  DEFAULT_PHOTO_SCHEMA,
} from '@utils/libraryContent'
import type { SceneSettings } from '@/types/content'
import type { Wallpaper, WallpaperSettings } from '@/types/index'

// ─── Display Resolution ───────────────────────────────────────────────────────

export interface DisplayResolution {
  width: number
  height: number
  scale: number
}

/** Get the actual physical pixel dimensions of the primary display from the Rust backend. */
export async function getPrimaryDisplayInfo(): Promise<DisplayResolution> {
  if (isTauriEnvironment()) {
    try {
      const info = await invoke<{ width: number; height: number; scale: number }>(
        'get_primary_display_info',
      )
      return { width: info.width, height: info.height, scale: info.scale }
    } catch (err) {
      console.warn('get_primary_display_info failed:', err)
    }
  }

  // Fallback: use the screen's available pixel dimensions
  const dpr = window.devicePixelRatio || 1
  return {
    width: Math.round(window.screen.width * dpr),
    height: Math.round(window.screen.height * dpr),
    scale: dpr,
  }
}

export type { EngineType }
export { WALLPAPER_ENGINES }

// ─── Live Canvas Wallpaper ─────────────────────────────────────────────────────

export interface LiveWallpaperOptions {
  engine: EngineType
  primaryColor: string
  secondaryColor: string
  speed: number
  density: number
  glow: number
  customText: string
  interactive: boolean
}

/** Convert the flat options object used by the UI into persisted wallpaper settings. */
export function settingsFromOptions(options: LiveWallpaperOptions): WallpaperSettings {
  return {
    primaryColor: options.primaryColor,
    secondaryColor: options.secondaryColor,
    speed: options.speed,
    density: options.density,
    glow: options.glow,
    customText: options.customText,
    interactive: options.interactive,
  }
}

/**
 * Generates a fully self-contained HTML page that renders the selected engine
 * as a live canvas at the target display's exact pixel resolution.
 *
 * The engine's `render` function is serialized with `toString()` and embedded
 * directly, so the desktop wallpaper runs the exact same code as the in-app
 * preview. The page also reads `window.__lw_mx/__lw_my` — written by the Rust
 * host's global cursor poller — so interactive engines react to the mouse even
 * though the wallpaper window sits behind the desktop icons.
 */
export function buildAnimatedHtml(options: LiveWallpaperOptions, width: number, height: number): string {
  const engine = WALLPAPER_ENGINES[options.engine]
  const settings = settingsFromOptions(options)
  const renderSource = engine.render.toString()
  const optsJson = JSON.stringify(settings)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>LumaWall Live</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #05070e; }
  canvas { display: block; width: 100vw; height: 100vh; }
</style>
</head>
<body>
<canvas id="lw"></canvas>
<script>
(function() {
  const canvas = document.getElementById('lw');
  const ctx = canvas.getContext('2d');
  const W = ${width};
  const H = ${height};
  canvas.width = W;
  canvas.height = H;

  const opts = ${optsJson};
  const render = ${renderSource};

  let t = 0;
  let mx = W * 0.5, my = H * 0.5;
  let lastFrame = performance.now();

  document.addEventListener('mousemove', function(e) {
    mx = e.clientX * (W / window.innerWidth);
    my = e.clientY * (H / window.innerHeight);
  });

  // Read the global cursor position injected by the native host (the wallpaper
  // window itself rarely receives mouse events behind the desktop icons).
  function readCursor() {
    if (window.__lw_mx !== undefined && window.__lw_my !== undefined) {
      var tx = window.__lw_mx * W;
      var ty = window.__lw_my * H;
      mx += (tx - mx) * 0.22;
      my += (ty - my) * 0.22;
    }
  }

  function loop() {
    lastFrame = performance.now();
    t += 0.015 * opts.speed;
    readCursor();
    // A broken engine must never crash the wallpaper host or freeze it silently.
    if ((window.__lw_lastError || 0) < 10) {
      try {
        render(ctx, W, H, t, opts, { x: mx / W, y: my / H });
      } catch (e) {
        if (window.__lw_lastError === undefined) window.__lw_lastError = 0;
        window.__lw_lastError += 1;
        if (window.__lw_lastError === 1) console.error('Wallpaper engine error:', e);
      }
    }
    requestAnimationFrame(loop);
  }

  // Watchdog: if the browser ever throttles requestAnimationFrame (e.g. the
  // window is considered occluded behind the desktop icons), nudge it back to
  // life so the wallpaper never freezes into a static frame.
  setInterval(function() {
    if (performance.now() - lastFrame > 1000) {
      requestAnimationFrame(loop);
    }
  }, 500);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) requestAnimationFrame(loop);
  });

  loop();
})();
</script>
</body>
</html>`
}

// ─── Start / Stop Live Wallpaper (frontend bridge) ─────────────────────────────

export interface ApplyResult {
  ok: boolean
  error?: string
}

function toErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * Apply a live animated wallpaper to the desktop.
 * Queries the actual display resolution from Rust, generates a self-contained HTML,
 * and sends it to the Rust backend to launch the wallpaper window behind the icons.
 */
export async function applyLiveCanvasWallpaper(options: LiveWallpaperOptions): Promise<ApplyResult> {
  const resolution = await getPrimaryDisplayInfo()
  const { width, height } = resolution

  const html = buildAnimatedHtml(options, width, height)

  if (isTauriEnvironment()) {
    try {
      await invoke<string>('start_live_canvas_wallpaper', {
        htmlContent: html,
        width,
        height,
      })
      return { ok: true }
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('start_live_canvas_wallpaper failed:', err)
      return { ok: false, error: message }
    }
  }

  // Fallback for browser dev mode: open in a new tab to preview
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', `width=${Math.min(width, 1600)},height=${Math.min(height, 900)}`)
  return { ok: true }
}

/**
 * Apply a live animated wallpaper from a persisted Wallpaper record,
 * routing by content type:
 *   - video            → native video host
 *   - photo/animated   → cinematic photo scene (2D motion or WebGL depth parallax)
 *   - webgl/html/interactive → sandboxed HTML scene with interaction bridge
 *   - engine           → built-in procedural canvas engine
 */
export async function applyWallpaperLive(wallpaper: Wallpaper): Promise<ApplyResult> {
  const ct = wallpaper.contentType

  if (ct === 'video' || wallpaper.type === 'video' || wallpaper.videoPath) {
    const path = wallpaper.videoPath || wallpaper.filePath || wallpaper.runtime
    if (!path) return { ok: false, error: 'No video file path available for this wallpaper.' }
    return await applyLiveVideoWallpaper(path)
  }

  if (isPhotoType(ct)) {
    return await applyLivePhotoWallpaper(wallpaper)
  }

  if (isSceneType(ct)) {
    return await applyLiveSceneWallpaper(wallpaper)
  }

  const engineId = (wallpaper.engineType || 'matrix') as EngineType
  const s = wallpaper.settings
  return await applyLiveCanvasWallpaper({
    engine: engineId,
    primaryColor: s?.primaryColor ?? '#00f0ff',
    secondaryColor: s?.secondaryColor ?? '#ff0077',
    speed: s?.speed ?? 1.2,
    density: s?.density ?? 50,
    glow: s?.glow ?? 80,
    customText: s?.customText ?? '',
    interactive: s?.interactive ?? true,
  })
}

// ─── Photo Scenes (cinematic motion + depth parallax) ─────────────────────────

/**
 * Launch any self-contained HTML as a desktop wallpaper (shared by photo and
 * scene renderers). Sends the page to the Rust host, or opens a preview tab
 * when running in the browser.
 */
async function launchHtmlWallpaper(html: string, width: number, height: number): Promise<ApplyResult> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('start_live_canvas_wallpaper', { htmlContent: html, width, height })
      return { ok: true }
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('start_live_canvas_wallpaper failed:', err)
      return { ok: false, error: message }
    }
  }
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', `width=${Math.min(width, 1600)},height=${Math.min(height, 900)}`)
  return { ok: true }
}

/** URL used inside the desktop wallpaper HTML for a wallpaper asset. */
function assetSrcForHtml(fileUrl: string | undefined, appUrl: string | undefined): string | undefined {
  if (isTauriEnvironment()) return toFileUrl(fileUrl)
  return appUrl // browser preview: absolute origin URL
}

/**
 * Build the self-contained photo wallpaper page.
 *
 * Renders a real photograph with subtle, cinematic life:
 *   - slow camera drift + gentle zoom (never a cheap Ken Burns slideshow)
 *   - optional WebGL2 2.5D parallax driven by a depth map (falls back to 2D
 *     motion when no depth map or WebGL2 is unavailable)
 *   - atmosphere/fog, particles (rain/snow/dust), light rays, vignette
 *   - color grading (warmth / brightness)
 *   - mouse parallax via the native host's global cursor injection
 */
export function buildPhotoWallpaperHtml(
  wallpaper: Wallpaper,
  width: number,
  height: number,
  settings?: SceneSettings,
): string {
  const schema = wallpaper.settingSchema && wallpaper.settingSchema.length > 0
    ? wallpaper.settingSchema
    : DEFAULT_PHOTO_SCHEMA
  const s = toSceneSettings(settings ?? (wallpaper.settings as unknown as Record<string, unknown>), schema)

  const imgSrc = assetSrcForHtml(wallpaper.contentFileUrl, wallpaper.contentUrl) ?? ''
  const depthSrc = assetSrcForHtml(wallpaper.depthFileUrl, wallpaper.depthUrl)
  const hasDepth = Boolean(depthSrc)

  const optsJson = JSON.stringify({
    motion: Number(s.motion ?? 35),
    parallax: Number(s.parallax ?? 45),
    zoom: Number(s.zoom ?? 8),
    atmosphere: Number(s.atmosphere ?? 20),
    particles: String(s.particles ?? 'none'),
    lightRays: Boolean(s.lightRays),
    vignette: s.vignette !== false,
    warmth: Number(s.warmth ?? 0),
    quality: String(s.quality ?? 'medium'),
    fog: Boolean(s.fog ?? true),
  })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>LumaWall Photo</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  #stage { position: fixed; inset: 0; overflow: hidden; }
  #bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; will-change: transform; }
  #gl { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: none; }
  #fx { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }
  #vignette { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.42) 100%); }
  #grade { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
</head>
<body>
<div id="stage">
  <img id="bg" src="${imgSrc}" alt="" draggable="false">
  <canvas id="gl"></canvas>
  <canvas id="fx"></canvas>
  <div id="vignette"></div>
  <div id="grade"></div>
</div>
<script>
(function() {
  var W = ${width}, H = ${height};
  var opts = ${optsJson};
  var hasDepth = ${hasDepth};
  var depthSrc = ${JSON.stringify(depthSrc ?? '')};

  var stage = document.getElementById('stage');
  var bgImg = document.getElementById('bg');
  var glCanvas = document.getElementById('gl');
  var fx = document.getElementById('fx');
  var grade = document.getElementById('grade');
  var fctx = fx.getContext('2d');

  var mx = 0.5, my = 0.5, t = 0;
  var last = performance.now();
  var ready = false;
  var imgObj = new Image();
  var depthObj = new Image();

  function readMouse() {
    if (window.__lw_mx !== undefined) { mx += (window.__lw_mx - mx) * 0.18; }
    if (window.__lw_my !== undefined) { my += (window.__lw_my - my) * 0.18; }
  }
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) last = 0;
  });

  // ── Color grading ──
  function applyGrade() {
    var w = opts.warmth;
    var f = 'brightness(1.06) contrast(1.03) saturate(' + (1 + Math.max(0, -w) * 0.006) + ')';
    if (w > 0) f += ' sepia(' + (w * 0.9) + '%)';
    if (w < 0) f += ' hue-rotate(' + (w * 1.8) + 'deg)';
    grade.style.filter = f;
  }

  // ── Mode: WebGL2 depth parallax vs 2D cinematic motion ──
  var useGL = false;
  var gl = null, prog = null, quad = null;
  var uImg, uDepth, uMouse, uPar, uZoom, uDrift, uTime;
  var texImg = null, texDepth = null;

  // ── Multi-layer depth system ──
  // When a wallpaper declares layers in its metadata, we render them as
  // independent depth planes with per-layer parallax displacement and
  // optional depth-of-field blur. The fragment shader samples each layer
  // texture, applies depth-based offset, and composites front-to-back.
  var layerTextures = [];  // WebGL textures for each layer
  var layerDepths = [];   // depth value per layer (0=close, 1=far)
  var layerCount = 0;
  var uLayerCount = null;
  var uLayerTex = [];     // uniform locations for layer textures
  var uLayerDepth = [];   // uniform locations for layer depth values
  var uFogEnabled = null;
  var uFogColor = null;
  var uFogDensity = null;

  function glInit() {
    try {
      gl = glCanvas.getContext('webgl2', { alpha: false, antialias: false });
      if (!gl) return false;
      var vs = '#version 300 es\nin vec2 aPos; out vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

      // Enhanced fragment shader supporting both single-layer and multi-layer modes.
      // Multi-layer mode composites N layers with independent parallax and fog.
      var fs = '#version 300 es\nprecision highp float;\n' +
        'in vec2 vUv; out vec4 c;\n' +
        'uniform sampler2D uImage; uniform sampler2D uDepth;\n' +
        'uniform vec2 uMouse; uniform float uPar; uniform float uZoom; uniform vec2 uDrift;\n' +
        'uniform int uLayerCount;\n' +
        'uniform sampler2D uLayerTex0; uniform sampler2D uLayerTex1;\n' +
        'uniform sampler2D uLayerTex2; uniform sampler2D uLayerTex3;\n' +
        'uniform sampler2D uLayerTex4; uniform sampler2D uLayerTex5;\n' +
        'uniform float uLayerDepth0; uniform float uLayerDepth1;\n' +
        'uniform float uLayerDepth2; uniform float uLayerDepth3;\n' +
        'uniform float uLayerDepth4; uniform float uLayerDepth5;\n' +
        'uniform bool uFogEnabled; uniform vec3 uFogColor; uniform float uFogDensity;\n' +
        'vec4 sampleLayer(int idx, vec2 uv) {\n' +
        '  if (idx == 0) return texture(uLayerTex0, uv);\n' +
        '  if (idx == 1) return texture(uLayerTex1, uv);\n' +
        '  if (idx == 2) return texture(uLayerTex2, uv);\n' +
        '  if (idx == 3) return texture(uLayerTex3, uv);\n' +
        '  if (idx == 4) return texture(uLayerTex4, uv);\n' +
        '  if (idx == 5) return texture(uLayerTex5, uv);\n' +
        '  return vec4(0.0);\n' +
        '}\n' +
        'float getDepth(int idx) {\n' +
        '  if (idx == 0) return uLayerDepth0;\n' +
        '  if (idx == 1) return uLayerDepth1;\n' +
        '  if (idx == 2) return uLayerDepth2;\n' +
        '  if (idx == 3) return uLayerDepth3;\n' +
        '  if (idx == 4) return uLayerDepth4;\n' +
        '  if (idx == 5) return uLayerDepth5;\n' +
        '  return 0.5;\n' +
        '}\n' +
        'void main() {\n' +
        '  if (uLayerCount > 0) {\n' +
        '    // Multi-layer mode: composite layers back-to-front with per-layer parallax\n' +
        '    vec4 result = vec4(0.0, 0.0, 0.0, 1.0);\n' +
        '    for (int i = 0; i < 6; i++) {\n' +
        '      if (i >= uLayerCount) break;\n' +
        '      float d = getDepth(i);\n' +
        '      float parallax = (d - 0.5) * uPar * 0.8;\n' +
        '      vec2 offset = uMouse * parallax * 0.5 + uDrift * (1.0 - d);\n' +
        '      vec2 uv = (vUv - 0.5) * (1.0 + uZoom * (1.0 - d)) + 0.5 + offset;\n' +
        '      vec4 layer = sampleLayer(i, uv);\n' +
        '      // Depth-of-field: blur distant layers slightly\n' +
        '      // (approximated by sampling neighboring texels)\n' +
        '      if (d > 0.6 && uZoom > 0.02) {\n' +
        '        float blur = (d - 0.6) * 0.003 * uZoom;\n' +
        '        vec4 s1 = sampleLayer(i, uv + vec2(blur, 0.0));\n' +
        '        vec4 s2 = sampleLayer(i, uv - vec2(blur, 0.0));\n' +
        '        vec4 s3 = sampleLayer(i, uv + vec2(0.0, blur));\n' +
        '        vec4 s4 = sampleLayer(i, uv - vec2(0.0, blur));\n' +
        '        layer = (layer + s1 + s2 + s3 + s4) * 0.2;\n' +
        '      }\n' +
        '      // Fog blend: distant layers fade toward fog color\n' +
        '      if (uFogEnabled && d > 0.3) {\n' +
        '        float fogFactor = smoothstep(0.3, 1.0, d) * uFogDensity;\n' +
        '        layer.rgb = mix(layer.rgb, uFogColor, fogFactor);\n' +
        '      }\n' +
        '      result.rgb = mix(result.rgb, layer.rgb, layer.a);\n' +
        '    }\n' +
        '    c = result;\n' +
        '  } else {\n' +
        '    // Single-layer mode: original displacement shader\n' +
        '    vec2 d = texture(uDepth, vUv).r - 0.5;\n' +
        '    vec2 off = d * uPar * uMouse * 0.5;\n' +
        '    vec2 uv = (vUv - 0.5) * (1.0 + uZoom) + 0.5 + off + uDrift;\n' +
        '    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { c = vec4(0.0, 0.0, 0.0, 1.0); }\n' +
        '    else { c = texture(uImage, uv); }\n' +
        '  }\n' +
        '}';

      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
        return s;
      }
      var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return false;
      prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uImg = gl.getUniformLocation(prog, 'uImage'); uDepth = gl.getUniformLocation(prog, 'uDepth');
      uMouse = gl.getUniformLocation(prog, 'uMouse'); uPar = gl.getUniformLocation(prog, 'uPar');
      uZoom = gl.getUniformLocation(prog, 'uZoom'); uDrift = gl.getUniformLocation(prog, 'uDrift');
      uLayerCount = gl.getUniformLocation(prog, 'uLayerCount');
      uFogEnabled = gl.getUniformLocation(prog, 'uFogEnabled');
      uFogColor = gl.getUniformLocation(prog, 'uFogColor');
      uFogDensity = gl.getUniformLocation(prog, 'uFogDensity');
      for (var li = 0; li < 6; li++) {
        uLayerTex.push(gl.getUniformLocation(prog, 'uLayerTex' + li));
        uLayerDepth.push(gl.getUniformLocation(prog, 'uLayerDepth' + li));
      }
      texImg = gl.createTexture(); texDepth = gl.createTexture();
      function tex(t, img) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      tex(texImg, imgObj); tex(texDepth, depthObj);

      // Initialize multi-layer textures if layers are declared
      if (typeof window.__lw_layers !== 'undefined' && window.__lw_layers.length > 0) {
        var layers = window.__lw_layers;
        layerCount = Math.min(layers.length, 6);
        gl.uniform1i(uLayerCount, layerCount);
        for (var li = 0; li < layerCount; li++) {
          var l = layers[li];
          var lt = gl.createTexture();
          gl.activeTexture(gl.TEXTURE2 + li);
          gl.bindTexture(gl.TEXTURE_2D, lt);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, l.img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.uniform1i(uLayerTex[li], 2 + li);
          gl.uniform1f(uLayerDepth[li], l.depth);
          layerTextures.push(lt);
          layerDepths.push(l.depth);
        }
        // Fog settings
        if (typeof window.__lw_fog !== 'undefined') {
          gl.uniform1i(uFogEnabled, 1);
          gl.uniform3f(uFogColor, window.__lw_fog.r, window.__lw_fog.g, window.__lw_fog.b);
          gl.uniform1f(uFogDensity, window.__lw_fog.density);
        }
      }

      return true;
    } catch (e) { return false; }
  }

  // ── Particles ──
  var particles = [];
  function buildParticles() {
    particles = [];
    var kind = opts.particles;
    if (!kind || kind === 'none') return;
    var n = Math.round(60 + (opts.motion / 100) * 140);
    if (kind === 'rain') {
      for (var i = 0; i < n; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, l: 14 + Math.random() * 22, s: 0.5 + Math.random() * 0.9, a: 0.25 + Math.random() * 0.4 });
    } else if (kind === 'snow') {
      for (var i = 0; i < n; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.8, s: 0.2 + Math.random() * 0.5, w: Math.random() * Math.PI * 2, a: 0.4 + Math.random() * 0.5 });
    } else if (kind === 'dust') {
      for (var i = 0; i < n; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.4, s: 0.03 + Math.random() * 0.08, w: Math.random() * Math.PI * 2, a: 0.1 + Math.random() * 0.25 });
    }
  }

  function drawParticles() {
    var kind = opts.particles;
    if (!kind || kind === 'none') return;
    var speed = 0.6 + (opts.motion / 100) * 1.2;
    if (kind === 'rain') {
      fctx.strokeStyle = 'rgba(185, 210, 235, 0.55)';
      fctx.lineWidth = 1.2;
      fctx.beginPath();
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.s * speed * 2.2; p.x -= p.s * speed * 0.5;
        if (p.y > H + 30) { p.y = -30; p.x = Math.random() * W; }
        fctx.moveTo(p.x, p.y); fctx.lineTo(p.x - p.l * 0.35, p.y - p.l);
      }
      fctx.stroke();
    } else if (kind === 'snow') {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.w += 0.01; p.y += p.s * speed;
        var x = p.x + Math.sin(p.w) * 0.8;
        if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; }
        fctx.beginPath(); fctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        fctx.fillStyle = 'rgba(255,255,255,' + p.a + ')'; fctx.fill();
      }
    } else if (kind === 'dust') {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.w += 0.004; p.x += Math.sin(p.w) * 0.25; p.y += p.s * speed * 0.3;
        if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; }
        fctx.beginPath(); fctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        fctx.fillStyle = 'rgba(255,255,255,' + p.a + ')'; fctx.fill();
      }
    }
  }

  function drawAtmosphere() {
    var a = (opts.atmosphere / 100) * 0.5;
    if (a <= 0.01) return;
    var cx = W * (0.5 + Math.sin(t * 0.03) * 0.35);
    for (var i = 0; i < 2; i++) {
      var g = fctx.createRadialGradient(cx + i * W * 0.4, H * 0.25, 0, cx + i * W * 0.4, H * 0.25, W * 0.55);
      g.addColorStop(0, 'rgba(255,255,255,' + a * 0.12 + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      fctx.fillStyle = g;
      fctx.fillRect(0, 0, W, H);
    }
  }

  function drawLightRays() {
    if (!opts.lightRays) return;
    var rays = 4, base = t * 0.006;
    for (var i = 0; i < rays; i++) {
      var ang = base + (i / rays) * Math.PI * 2;
      var cx = W / 2 + Math.cos(ang) * W * 0.12;
      var g = fctx.createLinearGradient(cx, 0, cx + Math.sin(ang) * 140, H);
      g.addColorStop(0, 'rgba(255, 226, 160, 0.07)');
      g.addColorStop(1, 'rgba(255, 226, 160, 0)');
      fctx.fillStyle = g;
      fctx.beginPath();
      fctx.moveTo(cx - 90, 0); fctx.lineTo(cx + 90, 0);
      fctx.lineTo(cx + Math.sin(ang) * 140 + 260, H); fctx.lineTo(cx + Math.sin(ang) * 140 - 260, H);
      fctx.closePath(); fctx.fill();
    }
  }

  // ── Render loop ──
  function render2D(now) {
    var zoom = 1.07 + (opts.zoom / 100) * 0.45 + Math.sin(t * 0.03) * 0.012;
    var drift = (opts.motion / 100);
    var dx = (Math.sin(t * 0.021) * 0.02 + (mx - 0.5) * 0.05) * (0.4 + drift * 0.8) * W * 0.02;
    var dy = (Math.cos(t * 0.017) * 0.015 + (my - 0.5) * 0.05) * (0.4 + drift * 0.8) * H * 0.02;
    bgImg.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + zoom + ')';
    bgImg.style.transformOrigin = '50% 50%';
  }

  function renderGL(now) {
    gl.uniform2f(uMouse, (mx - 0.5) * 2, (my - 0.5) * 2);
    gl.uniform1f(uPar, (opts.parallax / 100) * 0.55);
    gl.uniform1f(uZoom, (opts.zoom / 100) * 0.35 + 0.02);
    gl.uniform2f(uDrift, Math.sin(t * 0.02) * 0.006 * (opts.motion / 100), Math.cos(t * 0.016) * 0.005 * (opts.motion / 100));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texImg); gl.uniform1i(uImg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texDepth); gl.uniform1i(uDepth, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now();
    if (now - last < 16) return;
    last = now;
    t += 0.016;
    readMouse();
    fctx.clearRect(0, 0, W, H);
    if (useGL) renderGL(now); else render2D(now);
    drawAtmosphere();
    drawLightRays();
    drawParticles();
  }

  // Watchdog: never freeze into a static frame.
  setInterval(function () {
    if (performance.now() - last > 1000) { last = 0; requestAnimationFrame(loop); }
  }, 500);

  function start() {
    if (ready) return;
    ready = true;
    applyGrade();
    buildParticles();
    glCanvas.width = W; glCanvas.height = H;
    fx.width = W; fx.height = H;
    if (useGL) { glCanvas.style.display = 'block'; bgImg.style.display = 'none'; }
    requestAnimationFrame(loop);
  }

  function decideMode() {
    useGL = hasDepth && opts.parallax > 0 && !!window.WebGL2RenderingContext && glInit();
  }

  // ── Multi-layer loading ──
  // If the wallpaper declares layers via window.__lw_layerSrcs, load them
  // as separate textures for the multi-layer depth renderer.
  if (typeof window.__lw_layerSrcs !== 'undefined' && window.__lw_layerSrcs.length > 0) {
    window.__lw_layers = [];
    var pendingLayers = window.__lw_layerSrcs.length;
    window.__lw_layerSrcs.forEach(function(ls, idx) {
      var img = new Image();
      img.onload = function() {
        window.__lw_layers[idx] = { img: img, depth: ls.depth };
        pendingLayers--;
        if (pendingLayers === 0 && ready) { glInit(); renderGL(performance.now()); }
      };
      img.src = ls.src;
    });
  }

  // ── Fog configuration ──
  if (opts.atmosphere > 0) {
    window.__lw_fog = { r: 0.85, g: 0.88, b: 0.92, density: opts.atmosphere / 100 * 0.6 };
  }

  imgObj.onload = function () {
    if (hasDepth && depthObj.complete && depthObj.naturalWidth > 0) {
      decideMode(); start();
    } else if (!hasDepth) {
      decideMode(); start();
    }
  };
  imgObj.onerror = function () {
    document.body.innerHTML = '<div style="color:#f87171;font-family:sans-serif;padding:24px;font-size:14px">LumaWall: failed to load wallpaper image.</div>';
  };
  imgObj.src = '${imgSrc}';
  if (hasDepth) depthObj.src = depthSrc;
})();
</script>
</body>
</html>`
}

// ─── HTML / WebGL Scenes ──────────────────────────────────────────────────────

/**
 * Build the host page for a self-contained HTML/WebGL scene.
 *
 * The scene's own `index.html` runs inside a sandboxed iframe (`allow-scripts`
 * only — no same-origin, no forms, no top navigation). The host forwards the
 * LumaWall interaction bridge to the scene via postMessage:
 *   { type: 'lw-init', settings, width, height }
 *   { type: 'lw-state', mouseX, mouseY, time, perf }
 * Scenes read mouse position / clicks / settings through this API.
 */
export function buildSceneWallpaperHtml(
  wallpaper: Wallpaper,
  width: number,
  height: number,
  settings?: SceneSettings,
): string {
  const schema = wallpaper.settingSchema && wallpaper.settingSchema.length > 0
    ? wallpaper.settingSchema
    : []
  const s = toSceneSettings(settings ?? (wallpaper.settings as unknown as Record<string, unknown>), schema)
  const sceneSrc = assetSrcForHtml(wallpaper.sceneFileUrl, wallpaper.contentUrl) ?? ''
  const settingsJson = JSON.stringify(s)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>LumaWall Scene</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #05070e; }
  iframe { display: block; width: 100vw; height: 100vh; border: 0; }
  #err { position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    color: #f87171; font-family: sans-serif; font-size: 14px; background: #05070e; padding: 24px; text-align: center; }
</style>
</head>
<body>
<iframe id="scene" sandbox="allow-scripts" title="LumaWall scene"></iframe>
<div id="err">Scene failed to load. It has been marked unavailable — the rest of LumaWall keeps running.</div>
<script>
(function() {
  var W = ${width}, H = ${height};
  var settings = ${settingsJson};
  var iframe = document.getElementById('scene');
  var err = document.getElementById('err');
  var started = false;

  function sendInit() {
    try { iframe.contentWindow.postMessage({ type: 'lw-init', settings: settings, width: W, height: H }, '*'); }
    catch (e) { /* not ready yet */ }
  }

  iframe.onload = function () {
    started = true;
    sendInit();
    // Mouse bridge: forward host-injected global cursor + local events.
    setInterval(function () {
      var msg = { type: 'lw-state', time: performance.now() / 1000, perf: 1 };
      if (window.__lw_mx !== undefined) msg.mouseX = window.__lw_mx;
      if (window.__lw_my !== undefined) msg.mouseY = window.__lw_my;
      try { iframe.contentWindow.postMessage(msg, '*'); } catch (e) {}
    }, 100);
  };

  document.addEventListener('mousemove', function (e) {
    try {
      iframe.contentWindow.postMessage({
        type: 'lw-state', mouseX: e.clientX / window.innerWidth, mouseY: e.clientY / window.innerHeight,
        time: performance.now() / 1000, perf: 1
      }, '*');
    } catch (e) {}
  });

  // Load the scene; surface a clear error instead of crashing.
  iframe.src = '${sceneSrc}';
  setTimeout(function () {
    if (!started) {
      err.style.display = 'flex';
      iframe.style.display = 'none';
    }
  }, 8000);
})();
</script>
</body>
</html>`
}

/** Apply a photo/animated content wallpaper to the desktop. */
export async function applyLivePhotoWallpaper(wallpaper: Wallpaper): Promise<ApplyResult> {
  if (wallpaper.libraryBroken) {
    return { ok: false, error: 'This wallpaper is missing its image file and cannot be applied.' }
  }
  const resolution = await getPrimaryDisplayInfo()
  const html = buildPhotoWallpaperHtml(wallpaper, resolution.width, resolution.height)
  return await launchHtmlWallpaper(html, resolution.width, resolution.height)
}

/** Apply an HTML/WebGL/interactive scene wallpaper to the desktop. */
export async function applyLiveSceneWallpaper(wallpaper: Wallpaper): Promise<ApplyResult> {
  if (wallpaper.libraryBroken) {
    return { ok: false, error: 'This scene is missing its entry file and cannot be applied.' }
  }
  const resolution = await getPrimaryDisplayInfo()
  const html = buildSceneWallpaperHtml(wallpaper, resolution.width, resolution.height)
  return await launchHtmlWallpaper(html, resolution.width, resolution.height)
}

// ─── Video Import Helpers ───────────────────────────────────────────────────

export interface SelectedVideoInfo {
  path: string
  name: string
  sizeMb: number
  extension: string
}

/**
 * Opens native Windows file dialog to pick a video file from disk.
 * Returns the exact absolute path and metadata.
 */
export async function pickVideoFileDialog(): Promise<SelectedVideoInfo | null> {
  if (isTauriEnvironment()) {
    try {
      const res = await invoke<SelectedVideoInfo | null>('pick_video_file')
      return res
    } catch (err) {
      console.warn('pick_video_file failed:', err)
    }
  }
  return null
}

/**
 * Saves uploaded video data to local app data folder and returns absolute path.
 * Single-shot variant — use `importVideoFile` (chunked) for real uploads.
 */
export async function importVideoDataBytes(
  name: string,
  dataBase64: string,
): Promise<SelectedVideoInfo | null> {
  if (isTauriEnvironment()) {
    try {
      const res = await invoke<SelectedVideoInfo>('import_video_bytes', {
        name,
        dataBase64,
      })
      return res
    } catch (err) {
      console.warn('import_video_bytes failed:', err)
    }
  }
  return null
}

const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024 // 4 MB per chunk

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Upload a video file to the local wallpaper store in chunks.
 * Streaming in 4 MB slices avoids pushing the whole file through a single IPC
 * call, which fails or stalls for large videos.
 */
export async function importVideoFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<SelectedVideoInfo | null> {
  if (!isTauriEnvironment()) return null

  try {
    await invoke<string>('start_video_upload', { name: file.name })

    const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE))
    let info: SelectedVideoInfo | null = null

    for (let i = 0; i < totalChunks; i++) {
      const start = i * UPLOAD_CHUNK_SIZE
      const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size)
      const chunkBase64 = await blobToBase64(file.slice(start, end))
      const done = i === totalChunks - 1
      info = await invoke<SelectedVideoInfo | null>('append_video_upload', {
        chunkBase64,
        done,
      })
      onProgress?.(Math.round(((i + 1) / totalChunks) * 100))
    }

    return info
  } catch (err) {
    console.warn('import_video_file failed:', err)
    try {
      await invoke('cancel_video_upload')
    } catch {
      // ignore — nothing to cancel
    }
    return null
  }
}

/**
 * Apply a live video wallpaper from a local file path.
 * Queries the actual display resolution and sends to Rust backend.
 */
export async function applyLiveVideoWallpaper(videoPath: string): Promise<ApplyResult> {
  const resolution = await getPrimaryDisplayInfo()
  const { width, height } = resolution

  if (isTauriEnvironment()) {
    try {
      await invoke<string>('start_live_video_wallpaper', {
        path: videoPath,
        width,
        height,
      })
      return { ok: true }
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('start_live_video_wallpaper failed:', err)
      return { ok: false, error: message }
    }
  }

  console.info(`Simulated live video wallpaper: ${videoPath} at ${width}x${height}`)
  return { ok: true }
}

/**
 * Stop the live wallpaper window and restore the default desktop background.
 */
export async function stopLiveWallpaper(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke<string>('stop_live_wallpaper')
      return true
    } catch (err) {
      console.warn('stop_live_wallpaper failed:', err)
      return false
    }
  }
  console.info('Simulated stop live wallpaper')
  return true
}

// ─── Static Wallpaper Fallback ────────────────────────────────────────────────

/**
 * Generates a static high-resolution PNG snapshot for a given wallpaper and
 * applies it as the Windows desktop background (single frame, not animated).
 * Use `applyLiveCanvasWallpaper` for continuous animation.
 */
export async function applyWallpaperToWindowsDesktop(wallpaper: Wallpaper): Promise<boolean> {
  if (wallpaper.thumbnail && wallpaper.thumbnail.startsWith('data:image/')) {
    return await setWallpaperFromCanvas(wallpaper.thumbnail)
  }

  const resolution = await getPrimaryDisplayInfo()
  const canvas = document.createElement('canvas')
  canvas.width = resolution.width
  canvas.height = resolution.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const w = canvas.width
  const h = canvas.height

  ctx.fillStyle = '#050714'
  ctx.fillRect(0, 0, w, h)

  // Static fallback snapshot of the engine (best-effort single frame).
  const engine = wallpaper.engineType ? WALLPAPER_ENGINES[wallpaper.engineType as EngineType] : undefined
  if (engine) {
    engine.render(ctx, w, h, 30, {
      primaryColor: wallpaper.settings?.primaryColor ?? engine.defaultSettings.primaryColor,
      secondaryColor: wallpaper.settings?.secondaryColor ?? engine.defaultSettings.secondaryColor,
      speed: wallpaper.settings?.speed ?? engine.defaultSettings.speed,
      density: wallpaper.settings?.density ?? engine.defaultSettings.density,
      glow: wallpaper.settings?.glow ?? engine.defaultSettings.glow,
      customText: wallpaper.settings?.customText ?? '',
      interactive: false,
    }, { x: 0.5, y: 0.5 })
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#70d6ff')
    grad.addColorStop(0.5, '#00ff88')
    grad.addColorStop(1, '#ff00aa')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.globalAlpha = 0.8
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(w * 0.02)}px sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('LUMAWALL', w - 40, h - 40)

  const dataUrl = canvas.toDataURL('image/png')
  return await setWallpaperFromCanvas(dataUrl)
}
