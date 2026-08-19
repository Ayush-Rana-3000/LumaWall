import type { Wallpaper, WallpaperSettings } from '@/types/index'

/**
 * Wallpaper engine registry.
 *
 * Every engine defines ONE self-contained `render` function that is used in two
 * places: (1) directly in the in-app canvas previews, and (2) serialized via
 * `render.toString()` and embedded into the HTML that runs live on the desktop
 * behind the icons. Because of (2), each render body MUST be fully
 * self-contained — it may only use its parameters (`ctx, w, h, t, opts, mouse`)
 * and globals like `Math`/`performance`. Avoid backticks and `${...}` inside the
 * bodies so they survive string embedding.
 */

export type EngineCategory = 'neon' | 'space' | 'nature' | 'abstract' | 'clock'

export type EngineType =
  | 'matrix'
  | 'sunset'
  | 'matrixRain'
  | 'circuit'
  | 'rings'
  | 'nebula'
  | 'stars'
  | 'tunnel'
  | 'aurora'
  | 'ocean'
  | 'rain'
  | 'snow'
  | 'fire'
  | 'particles'
  | 'waves'
  | 'hud'
  | 'fireworks'

export interface MouseState {
  x: number // 0..1 normalized
  y: number // 0..1 normalized
}

export interface WallpaperEngine {
  id: EngineType
  name: string
  category: EngineCategory
  description: string
  author: string
  tags: string[]
  isFeatured?: boolean
  defaultSettings: WallpaperSettings
  render: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    opts: WallpaperSettings,
    mouse: MouseState,
  ) => void
}

const BASE: Omit<WallpaperSettings, 'primaryColor' | 'secondaryColor'> = {
  speed: 1.2,
  density: 50,
  glow: 80,
  customText: '',
  interactive: true,
}

// ─── Engines ─────────────────────────────────────────────────────────────────

const engines: WallpaperEngine[] = [
  {
    id: 'matrix',
    name: 'Neon Grid Horizon',
    category: 'neon',
    description: 'A cyberpunk 3D perspective grid under a glowing neon sun. The horizon light bends toward your cursor.',
    author: 'Luma Studio',
    tags: ['Neon', 'Cyberpunk', 'Grid'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#00f0ff', secondaryColor: '#ff0077', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const p = opts.primaryColor
      const s = opts.secondaryColor
      const horizon = h * 0.55
      const mx = mouse.x * w
      const sunX = w * 0.5 + (mx - w * 0.5) * 0.12
      const grad = ctx.createRadialGradient(sunX, horizon, 10, sunX, horizon, h * 0.45)
      grad.addColorStop(0, p)
      grad.addColorStop(0.3, s)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(sunX, horizon, h * 0.38, Math.PI, 0, false)
      ctx.fill()
      ctx.fillStyle = '#05070e'
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(w * 0.18, horizon - i * 18 - 4, w * 0.64, 5 + i * 1.5)
      }
      ctx.strokeStyle = p
      ctx.lineWidth = 1.5
      ctx.shadowColor = p
      ctx.shadowBlur = opts.glow * 0.22
      const n = 26
      for (let i = -n; i <= n; i++) {
        ctx.beginPath()
        ctx.moveTo(sunX, horizon)
        ctx.lineTo(sunX + i * (w / n) * 2, h)
        ctx.stroke()
      }
      const nh = 18
      const off = (t * 60 * opts.speed) % 44
      for (let i = 0; i < nh; i++) {
        const pr = (i * 44 + off) / (nh * 44)
        const y = horizon + Math.pow(pr, 2.2) * (h - horizon)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      if (opts.customText.trim()) {
        ctx.save()
        ctx.font = '900 ' + Math.floor(w * 0.032) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.shadowColor = p
        ctx.shadowBlur = opts.glow * 0.3
        ctx.fillText(opts.customText.toUpperCase(), w * 0.5, h * 0.5)
        ctx.restore()
      }
    },
  },
  {
    id: 'sunset',
    name: 'Synthwave Sunset',
    category: 'neon',
    description: 'The iconic retrowave horizon: striped sun, mirrored grid and a deep purple sky full of stars.',
    author: 'Luma Studio',
    tags: ['Synthwave', 'Retro', 'Sunset'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#ff2d95', secondaryColor: '#00e5ff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const p = opts.primaryColor
      const s = opts.secondaryColor
      const horizon = h * 0.52
      const sky = ctx.createLinearGradient(0, 0, 0, horizon)
      sky.addColorStop(0, '#0b0514')
      sky.addColorStop(0.55, '#2a0a3a')
      sky.addColorStop(0.8, p)
      sky.addColorStop(1, '#ffb347')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, horizon)
      // Stars
      for (let i = 0; i < Math.floor(opts.density * 0.6) + 30; i++) {
        const sx = ((i * 137.5 + t * 6) % w + w) % w
        const sy = ((i * 89.7 + Math.sin(t * 0.7 + i)) % (horizon * 0.8) + horizon * 0.02)
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * Math.abs(Math.sin(t + i))) + ')'
        ctx.fillRect(sx, sy, 1.6, 1.6)
      }
      // Striped sun
      ctx.save()
      ctx.beginPath()
      ctx.arc(w * 0.5, horizon, h * 0.2, Math.PI, 0)
      ctx.clip()
      const sunGrad = ctx.createLinearGradient(0, horizon - h * 0.2, 0, horizon)
      sunGrad.addColorStop(0, '#fff6a0')
      sunGrad.addColorStop(1, '#ff7a00')
      ctx.fillStyle = sunGrad
      ctx.fillRect(w * 0.5 - h * 0.2, horizon - h * 0.2, h * 0.4, h * 0.2)
      ctx.fillStyle = '#2a0a3a'
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(w * 0.5 - h * 0.2, horizon - 14 - i * 22, h * 0.4, 7 + i * 2)
      }
      ctx.restore()
      // Water reflection
      ctx.save()
      ctx.translate(0, horizon)
      ctx.scale(1, -0.45)
      ctx.globalAlpha = 0.35
      ctx.drawImage(ctx.canvas, 0, 0)
      ctx.restore()
      // Perspective grid
      ctx.strokeStyle = p
      ctx.lineWidth = 1.4
      ctx.shadowColor = p
      ctx.shadowBlur = opts.glow * 0.2
      for (let i = -22; i <= 22; i++) {
        ctx.beginPath()
        ctx.moveTo(w * 0.5, horizon)
        ctx.lineTo(w * 0.5 + i * (w / 22) * 1.8, h)
        ctx.stroke()
      }
      const rows = 14
      for (let i = 0; i < rows; i++) {
        const pr = Math.pow(i / rows, 2.1)
        const y = horizon + pr * (h - horizon)
        const gx = (t * 90 * opts.speed) % (w * 2)
        const glowW = pr * w * 0.02 + 2
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        ctx.strokeStyle = s
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo((gx - glowW) % (w * 2) - w, y)
        ctx.lineTo((gx + glowW) % (w * 2) - w, y)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.strokeStyle = p
        ctx.lineWidth = 1.4
      }
      ctx.shadowBlur = 0
      void mouse
    },
  },
  {
    id: 'matrixRain',
    name: 'Matrix Rain',
    category: 'neon',
    description: 'Digital code rain in the style of the Matrix — luminous glyphs streaming down the screen.',
    author: 'Luma Studio',
    tags: ['Matrix', 'Code', 'Rain'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#00ff66', secondaryColor: '#ccff00', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return r + ',' + g + ',' + b
      }
      const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF'
      const fontSize = Math.max(12, Math.floor(w / 90))
      const cols = Math.ceil(w / fontSize)
      const speed = 0.35 * opts.speed
      ctx.fillStyle = 'rgba(2,6,3,0.18)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = fontSize + 'px monospace'
      const rgb = hexToRgb(opts.primaryColor)
      const rgb2 = hexToRgb(opts.secondaryColor)
      for (let i = 0; i < cols; i++) {
        const x = i * fontSize
        const offset = ((i * 97 + t * speed * 60) % h)
        const y = offset
        const head = Math.floor(i * 13 + t * speed * 60)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(glyphs[head % glyphs.length], x, y)
        ctx.fillStyle = 'rgba(' + rgb + ',0.9)'
        ctx.fillText(glyphs[(head + 1) % glyphs.length], x, y + fontSize)
        ctx.fillStyle = 'rgba(' + rgb2 + ',0.35)'
        for (let k = 2; k < 14; k++) {
          ctx.fillText(glyphs[(head + k) % glyphs.length], x, y + fontSize * k)
        }
      }
      // Cursor ripples light up nearby columns
      if (opts.interactive) {
        const col = Math.floor(mouse.x * cols)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillText(glyphs[Math.floor(t * 6) % glyphs.length], col * fontSize, mouse.y * h)
      }
    },
  },
  {
    id: 'circuit',
    name: 'Neon Circuit',
    category: 'neon',
    description: 'Glowing circuit traces that grow and dissolve across the desktop, branching like a living motherboard.',
    author: 'Luma Studio',
    tags: ['Circuit', 'Tech', 'Glow'],
    defaultSettings: { primaryColor: '#00e5ff', secondaryColor: '#7c4dff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const p = opts.primaryColor
      const s = opts.secondaryColor
      ctx.fillStyle = '#04060d'
      ctx.fillRect(0, 0, w, h)
      const count = Math.floor(opts.density * 0.25) + 6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let n = 0; n < count; n++) {
        const phase = (n * 1.7 + t * 0.35 * opts.speed) % 1
        const seed = n * 7919
        let x = ((seed * 37) % w)
        let y = ((seed * 53) % h)
        const len = Math.floor(18 + phase * 40)
        const col = n % 2 === 0 ? p : s
        const alpha = 0.15 + 0.85 * Math.sin(phase * Math.PI)
        ctx.strokeStyle = col
        ctx.globalAlpha = Math.max(0.05, alpha)
        ctx.shadowColor = col
        ctx.shadowBlur = opts.glow * 0.3
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let i = 0; i < len; i++) {
          const dir = ((seed + i * 131) % 4)
          if (dir === 0) x += 24
          else if (dir === 1) x -= 24
          else if (dir === 2) y += 24
          else y -= 24
          if (x < 0) x = w
          if (x > w) x = 0
          if (y < 0) y = h
          if (y > h) y = 0
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        // node dot
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = Math.max(0.1, alpha)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      void mouse
    },
  },
  {
    id: 'rings',
    name: 'Pulse Rings',
    category: 'neon',
    description: 'Concentric neon rings pulse from the center — and from your cursor when you move across the screen.',
    author: 'Luma Studio',
    tags: ['Rings', 'Minimal', 'Interactive'],
    defaultSettings: { primaryColor: '#00f0ff', secondaryColor: '#ff2d95', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = '#05060d'
      ctx.fillRect(0, 0, w, h)
      const centers: Array<[number, number]> = [[w * 0.5, h * 0.5]]
      if (opts.interactive) centers.push([mouse.x * w, mouse.y * h])
      for (const [cx, cy] of centers) {
        for (let i = 0; i < 5; i++) {
          const ph = (t * 0.6 * opts.speed + i / 5) % 1
          const r = 40 + ph * Math.max(w, h) * 0.55
          const col = i % 2 === 0 ? opts.primaryColor : opts.secondaryColor
          ctx.strokeStyle = col
          ctx.globalAlpha = (1 - ph) * 0.75
          ctx.lineWidth = 2 + (1 - ph) * 3
          ctx.shadowColor = col
          ctx.shadowBlur = opts.glow * 0.35 * (1 - ph) + 2
          ctx.beginPath()
          ctx.arc(cx, cy, r, ph * Math.PI * 2, ph * Math.PI * 2 + Math.PI * 1.6)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    },
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    category: 'space',
    description: 'Deep-space star clouds with volumetric nebula gradients and twinkling stars. Parallax follows your cursor.',
    author: 'AstralWorks',
    tags: ['Space', 'Cosmic', 'Stars'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#8a2be2', secondaryColor: '#4169e1', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const px = (mouse.x - 0.5) * 120 * opts.speed
      const py = (mouse.y - 0.5) * 90 * opts.speed
      ctx.fillStyle = '#03040a'
      ctx.fillRect(0, 0, w, h)
      const g1 = ctx.createRadialGradient(w * 0.5 + px, h * 0.5 + py, 60, w * 0.5, h * 0.5, w * 0.65)
      g1.addColorStop(0, opts.primaryColor + '66')
      g1.addColorStop(0.4, opts.secondaryColor + '33')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, w, h)
      const g2 = ctx.createRadialGradient(w * 0.3 - px, h * 0.7 - py, 40, w * 0.3, h * 0.7, w * 0.4)
      g2.addColorStop(0, opts.secondaryColor + '55')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, w, h)
      const stars = Math.floor(opts.density * 4) + 80
      for (let i = 0; i < stars; i++) {
        const sx = (((i * 137.5 + t * 25 * ((i % 5) + 1) + px * 0.3) % w) + w) % w
        const sy = (i * 93.3 + Math.sin(t + i) * 25 + py * 0.3) % h
        const sz = ((i % 3) + 0.8) * 1.4
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + i))
        ctx.fillStyle = i % 2 === 0 ? opts.primaryColor : opts.secondaryColor
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sx, sy, sz, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (opts.customText.trim()) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = '300 ' + Math.floor(w * 0.03) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(opts.customText.toUpperCase(), w * 0.5, h * 0.92)
      }
    },
  },
  {
    id: 'stars',
    name: 'Deep Starfield',
    category: 'space',
    description: 'A parallax starfield with shooting stars. Move your cursor to drift through the galaxy.',
    author: 'AstralWorks',
    tags: ['Space', 'Stars', 'Parallax'],
    defaultSettings: { primaryColor: '#9bd0ff', secondaryColor: '#ffffff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = '#02030a'
      ctx.fillRect(0, 0, w, h)
      const mx = (mouse.x - 0.5) * 40
      const my = (mouse.y - 0.5) * 40
      const stars = Math.floor(opts.density * 1.2) + 60
      for (let i = 0; i < stars; i++) {
        const depth = ((i * 7919) % 10) / 10 + 0.1
        const drift = t * (2 + depth * 22) * opts.speed
        const sx = (((i * 137.5 + drift * 0.4 - mx * depth * 2) % w) + w) % w
        const sy = (((i * 93.3 - my * depth * 2) % h) + h) % h
        const sz = 0.5 + depth * 2.4
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.3))
        ctx.fillStyle = i % 7 === 0 ? opts.secondaryColor : opts.primaryColor
        ctx.globalAlpha = tw
        ctx.beginPath()
        ctx.arc(sx, sy, sz, 0, Math.PI * 2)
        ctx.fill()
        if (depth > 0.75) {
          ctx.strokeStyle = opts.primaryColor
          ctx.globalAlpha = tw * 0.5
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(sx + drift * 0.6, sy + drift * 0.35)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      // shooting star
      const sp = (t * 0.22 * opts.speed) % 1
      const ssx = (w * 0.8 - sp * w * 0.9)
      const ssy = (h * 0.1 + sp * h * 0.4)
      ctx.strokeStyle = '#ffffff'
      ctx.globalAlpha = Math.sin(sp * Math.PI)
      ctx.lineWidth = 2
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.moveTo(ssx, ssy)
      ctx.lineTo(ssx + 90, ssy - 40)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    },
  },
  {
    id: 'tunnel',
    name: 'Hyperspace',
    category: 'space',
    description: 'Rush through a tunnel of light. Speed lines converge toward the horizon as you travel at lightspeed.',
    author: 'Luma Studio',
    tags: ['Space', 'Speed', 'Tunnel'],
    defaultSettings: { primaryColor: '#00d4ff', secondaryColor: '#a855f7', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const cx = w * 0.5 + (mouse.x - 0.5) * 120
      const cy = h * 0.5 + (mouse.y - 0.5) * 90
      ctx.fillStyle = '#020409'
      ctx.fillRect(0, 0, w, h)
      const lines = Math.floor(opts.density * 0.5) + 40
      ctx.lineCap = 'round'
      for (let i = 0; i < lines; i++) {
        const ang = (i / lines) * Math.PI * 2
        const dist = 30 + ((i * 977 + t * 900 * opts.speed) % (Math.max(w, h) * 1.2))
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const len = 18 + dist * 0.12
        const col = i % 3 === 0 ? opts.secondaryColor : opts.primaryColor
        ctx.strokeStyle = col
        ctx.globalAlpha = Math.min(0.85, 0.12 + dist * 0.0012)
        ctx.lineWidth = 1.5 + dist * 0.004
        ctx.shadowColor = col
        ctx.shadowBlur = opts.glow * 0.12
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len)
        ctx.stroke()
      }
      // center glow
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 130)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.25, opts.primaryColor)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(cx - 130, cy - 130, 260, 260)
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    },
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    category: 'nature',
    description: 'Organic aurora ribbons shimmer over a frozen landscape with drifting snow.',
    author: 'NatureShots',
    tags: ['Nature', 'Aurora', 'Sky'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#70d6ff', secondaryColor: '#e9ff70', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = '#030812'
      ctx.fillRect(0, 0, w, h)
      // stars
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.5 * Math.abs(Math.sin(t + i * 2))) + ')'
        ctx.fillRect(((i * 137.5) % w), ((i * 89.7) % (h * 0.5)), 1.4, 1.4)
      }
      // moon
      ctx.fillStyle = '#eef6ff'
      ctx.shadowColor = '#eef6ff'
      ctx.shadowBlur = 24
      ctx.beginPath()
      ctx.arc(w * 0.82, h * 0.14, h * 0.035, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      // ribbons
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const ribbons = 5
      for (let r = 0; r < ribbons; r++) {
        const grad = ctx.createLinearGradient(0, 0, w, h)
        grad.addColorStop(0, opts.primaryColor)
        grad.addColorStop(0.5, opts.secondaryColor)
        grad.addColorStop(1, opts.primaryColor)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, h)
        const steps = 50
        for (let s = 0; s <= steps; s++) {
          const x = (s / steps) * w
          const y =
            h * 0.38 +
            Math.sin(s * 0.28 + t * 1.3 * opts.speed + r * 1.1) * 70 +
            Math.cos(s * 0.14 - t * 0.9 * opts.speed + r * 2.2) * 90 +
            r * 45
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.globalAlpha = 0.26 - r * 0.04
        ctx.fill()
      }
      ctx.restore()
      // ground
      ctx.fillStyle = '#04070f'
      ctx.fillRect(0, h * 0.82, w, h * 0.18)
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(0, h * 0.815, w, h * 0.01)
      void mouse
    },
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    category: 'nature',
    description: 'Layered bioluminescent waves roll across the deep, lit by a silver moon.',
    author: 'NatureShots',
    tags: ['Ocean', 'Waves', 'Calm'],
    defaultSettings: { primaryColor: '#00b4d8', secondaryColor: '#48cae4', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return r + ',' + g + ',' + b
      }
      const base = ctx.createLinearGradient(0, 0, 0, h)
      base.addColorStop(0, '#02111f')
      base.addColorStop(0.6, '#032b3d')
      base.addColorStop(1, '#010a12')
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)
      // moon reflection
      const mx = w * 0.5 + (mouse.x - 0.5) * 60
      ctx.fillStyle = '#dff6ff'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 30
      ctx.beginPath()
      ctx.arc(mx, h * 0.12, h * 0.03, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      // waves
      for (let layer = 0; layer < 5; layer++) {
        const amp = h * 0.05 * (1 - layer * 0.12)
        const y0 = h * (0.45 + layer * 0.11)
        const grad = ctx.createLinearGradient(0, y0 - amp, 0, y0 + amp)
        const c = layer % 2 === 0 ? opts.primaryColor : opts.secondaryColor
        grad.addColorStop(0, 'rgba(' + hexToRgb(c) + ',0.5)')
        grad.addColorStop(1, 'rgba(' + hexToRgb(c) + ',0.05)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 8) {
          const y =
            y0 +
            Math.sin(x * 0.004 * (layer + 1) + t * (1 + layer * 0.3) * opts.speed) * amp +
            Math.cos(x * 0.001 - t * 0.5 + layer) * amp * 0.5
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fill()
      }
      // foam sparks
      for (let i = 0; i < 40; i++) {
        const fx = ((i * 113.7 + t * 40 * opts.speed) % w + w) % w
        const fy = h * 0.5 + ((i * 47.3 + Math.sin(t + i)) % (h * 0.4))
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.4 * Math.abs(Math.sin(t * 2 + i))) + ')'
        ctx.fillRect(fx, fy, 2, 2)
      }
    },
  },
  {
    id: 'rain',
    name: 'Rain on Glass',
    category: 'nature',
    description: 'Rain streaks race down the glass with ripples blooming where drops land.',
    author: 'NatureShots',
    tags: ['Rain', 'Storm', 'Glass'],
    defaultSettings: { primaryColor: '#7fb2ff', secondaryColor: '#b7d6ff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = 'rgba(8,12,20,0.35)'
      ctx.fillRect(0, 0, w, h)
      // streaks
      ctx.strokeStyle = opts.primaryColor
      ctx.lineWidth = 1.2
      ctx.globalAlpha = 0.5
      const drops = Math.floor(opts.density * 0.5) + 40
      for (let i = 0; i < drops; i++) {
        const x = ((i * 137.5) % w)
        const len = 40 + ((i * 977) % 120)
        const y = (t * (260 + (i % 7) * 60) * opts.speed + i * 811) % (h + len) - len
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 3, y + len)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      // ripples
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.4 * opts.speed + i / 6) % 1
        const rx = ((i * 331) % w)
        const ry = ((i * 449 + 90) % (h * 0.9))
        const rr = 4 + ph * 46
        ctx.strokeStyle = opts.secondaryColor
        ctx.globalAlpha = (1 - ph) * 0.55
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(rx, ry, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      void mouse
    },
  },
  {
    id: 'snow',
    name: 'Winter Snowfall',
    category: 'nature',
    description: 'Gentle snow drifts down, swaying with the wind. Move your cursor to steer the breeze.',
    author: 'NatureShots',
    tags: ['Snow', 'Winter', 'Calm'],
    defaultSettings: { primaryColor: '#e8f4ff', secondaryColor: '#a8c8ff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = 'rgba(10,16,28,0.25)'
      ctx.fillRect(0, 0, w, h)
      const wind = (mouse.x - 0.5) * 140 * (opts.interactive ? 1 : 0.2)
      const flakes = Math.floor(opts.density * 0.7) + 50
      for (let i = 0; i < flakes; i++) {
        const sz = 1 + ((i * 13) % 4) * 0.7
        const fall = (t * (30 + ((i * 7) % 50)) * opts.speed + i * 37) % (h + 40)
        const y = fall - 20
        const sway = Math.sin(t * 1.4 + i) * 24
        const x = (((i * 211) + sway + wind * fall / h) % (w + 40)) - 20
        ctx.fillStyle = i % 4 === 0 ? opts.secondaryColor : opts.primaryColor
        ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t + i * 1.7))
        ctx.beginPath()
        ctx.arc(x, y, sz, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },
  },
  {
    id: 'fire',
    name: 'Ember Fire',
    category: 'nature',
    description: 'Glowing embers rise from a crackling fire, drifting and fading into the dark.',
    author: 'Luma Studio',
    tags: ['Fire', 'Ember', 'Cozy'],
    defaultSettings: { primaryColor: '#ff6b35', secondaryColor: '#ffd166', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return r + ',' + g + ',' + b
      }
      ctx.fillStyle = 'rgba(10,4,2,0.18)'
      ctx.fillRect(0, 0, w, h)
      const embers = Math.floor(opts.density * 0.8) + 40
      for (let i = 0; i < embers; i++) {
        const rise = (t * (50 + ((i * 11) % 90)) * opts.speed + i * 83) % (h + 60)
        const y = h - rise + 30
        const sway = Math.sin(t * 1.1 + i * 2.3) * (18 + ((i * 5) % 20))
        const x = w * 0.5 + sway + Math.sin(i * 7.7) * w * 0.25
        const life = Math.sin((rise / (h + 60)) * Math.PI)
        const col = i % 3 === 0 ? opts.secondaryColor : opts.primaryColor
        const rgb = hexToRgb(col)
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.25 + life * 0.7) + ')'
        ctx.shadowColor = col
        ctx.shadowBlur = opts.glow * 0.3 * life
        ctx.beginPath()
        ctx.arc(x, y, 1.5 + life * 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      // fire base glow
      const g = ctx.createRadialGradient(w * 0.5, h + 40, 10, w * 0.5, h + 40, h * 0.3)
      g.addColorStop(0, 'rgba(255,120,40,0.5)')
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(w * 0.2, h * 0.7, w * 0.6, h * 0.3)
      void mouse
    },
  },
  {
    id: 'particles',
    name: 'Constellation',
    category: 'abstract',
    description: 'A living constellation of nodes connected by light. Your cursor pulls the web toward it.',
    author: 'Luma Studio',
    tags: ['Particles', 'Network', 'Interactive'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#00e5ff', secondaryColor: '#ff7ac2', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return r + ',' + g + ',' + b
      }
      ctx.fillStyle = 'rgba(3,5,12,0.4)'
      ctx.fillRect(0, 0, w, h)
      const n = Math.floor(opts.density * 0.5) + 24
      const pts: number[] = []
      for (let i = 0; i < n; i++) {
        pts.push(((i * 137.5 + Math.sin(t * 0.4 + i) * 26) % w + w) % w)
        pts.push(((i * 93.3 + Math.cos(t * 0.33 + i * 1.7) * 26) % h + h) % h)
      }
      if (opts.interactive) {
        pts.push(mouse.x * w)
        pts.push(mouse.y * h)
      }
      const maxDist = Math.min(w, h) * 0.16
      for (let i = 0; i < pts.length / 2; i++) {
        for (let j = i + 1; j < pts.length / 2; j++) {
          const dx = pts[i * 2] - pts[j * 2]
          const dy = pts[i * 2 + 1] - pts[j * 2 + 1]
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < maxDist) {
            const a = (1 - d / maxDist) * 0.5
            ctx.strokeStyle = 'rgba(' + hexToRgb(opts.primaryColor) + ',' + a + ')'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(pts[i * 2], pts[i * 2 + 1])
            ctx.lineTo(pts[j * 2], pts[j * 2 + 1])
            ctx.stroke()
          }
        }
      }
      for (let i = 0; i < pts.length / 2; i++) {
        const isMouse = opts.interactive && i === pts.length / 2 - 1
        const col = isMouse ? opts.secondaryColor : opts.primaryColor
        ctx.fillStyle = col
        ctx.shadowColor = col
        ctx.shadowBlur = opts.glow * 0.25
        ctx.beginPath()
        ctx.arc(pts[i * 2], pts[i * 2 + 1], isMouse ? 4.5 : 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    },
  },
  {
    id: 'waves',
    name: 'Aurora Waves',
    category: 'abstract',
    description: 'Harmonic particle waves that flow and breathe. Cursor creates ripples in the current.',
    author: 'SoundWave Lab',
    tags: ['Waves', 'Audio', 'Flow'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#00ff88', secondaryColor: '#0066cc', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      ctx.fillStyle = '#04070c'
      ctx.fillRect(0, 0, w, h)
      const waveCount = 6
      const pointCount = Math.floor(opts.density * 1.8) + 40
      ctx.save()
      for (let v = 0; v < waveCount; v++) {
        ctx.beginPath()
        ctx.strokeStyle = v % 2 === 0 ? opts.primaryColor : opts.secondaryColor
        ctx.lineWidth = 2 + (waveCount - v) * 0.3
        ctx.shadowColor = ctx.strokeStyle
        ctx.shadowBlur = opts.glow * 0.18
        for (let p = 0; p <= pointCount; p++) {
          const x = (p / pointCount) * w
          const freq = 0.0025 * (v + 1)
          const amp = h * 0.14 * (1 - v * 0.12)
          const distToMouse = opts.interactive
            ? Math.max(0, 1 - Math.hypot(x - mouse.x * w, h * 0.5 - mouse.y * h) / (w * 0.25))
            : 0
          const y =
            h * 0.5 +
            Math.sin(x * freq + t * (v + 1) * opts.speed + v * 1.3) * amp +
            Math.cos(x * 0.0015 - t * 0.6 + v) * (amp * 0.6) +
            distToMouse * 60
          if (p === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
      ctx.shadowBlur = 0
    },
  },
  {
    id: 'hud',
    name: 'Cyber HUD Clock',
    category: 'clock',
    description: 'A futuristic telemetry HUD with a live clock, rotating rings and corner brackets.',
    author: 'NeoTech Systems',
    tags: ['HUD', 'Clock', 'Cyber'],
    isFeatured: true,
    defaultSettings: { primaryColor: '#ff00aa', secondaryColor: '#00f0ff', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const cx = w * 0.5
      const cy = h * 0.5
      ctx.fillStyle = '#05070e'
      ctx.fillRect(0, 0, w, h)
      const pulse = 1 + Math.sin(t * 3) * 0.02
      ctx.save()
      ctx.strokeStyle = opts.primaryColor
      ctx.lineWidth = 2.5
      ctx.shadowColor = opts.primaryColor
      ctx.shadowBlur = opts.glow * 0.25
      ctx.beginPath()
      ctx.arc(cx, cy, 150 * pulse, t, t + Math.PI * 1.4)
      ctx.stroke()
      ctx.strokeStyle = opts.secondaryColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 180 * pulse, -t * 0.8, -t * 0.8 + Math.PI)
      ctx.stroke()
      ctx.strokeStyle = opts.primaryColor + '88'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, 205 * pulse, t * 0.5, t * 0.5 + Math.PI * 0.5)
      ctx.stroke()
      const bs = 24
      const corners: number[][] = [
        [cx - 100, cy - 60],
        [cx + 100 - bs, cy - 60],
        [cx - 100, cy + 60 - bs],
        [cx + 100 - bs, cy + 60 - bs],
      ]
      for (const [bx, by] of corners) {
        ctx.strokeStyle = opts.primaryColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx, by + bs)
        ctx.lineTo(bx, by)
        ctx.lineTo(bx + bs, by)
        ctx.stroke()
      }
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold ' + Math.floor(w * 0.048) + 'px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(hh + ':' + mm + ':' + ss, cx, cy - 10)
      ctx.font = Math.floor(w * 0.016) + 'px sans-serif'
      ctx.fillStyle = opts.primaryColor
      ctx.fillText(now.toDateString().toUpperCase(), cx, cy + 38)
      ctx.fillStyle = opts.secondaryColor
      ctx.font = Math.floor(w * 0.011) + 'px monospace'
      ctx.fillText('SYS.ONLINE · FPS 60 · CORE TEMP NOMINAL', cx, cy + 70)
      ctx.restore()
      ctx.shadowBlur = 0
      if (opts.customText.trim()) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '900 ' + Math.floor(w * 0.02) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(opts.customText.toUpperCase(), cx, h - 40)
      }
      void mouse
    },
  },
  {
    id: 'fireworks',
    name: 'Neon Fireworks',
    category: 'abstract',
    description: 'Fireworks bloom across the night sky. Click anywhere to launch your own.',
    author: 'Luma Studio',
    tags: ['Fireworks', 'Celebration', 'Colorful'],
    defaultSettings: { primaryColor: '#ff6b6b', secondaryColor: '#feca57', ...BASE },
    render: (ctx, w, h, t, opts, mouse) => {
      const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return r + ',' + g + ',' + b
      }
      ctx.fillStyle = 'rgba(4,5,12,0.22)'
      ctx.fillRect(0, 0, w, h)
      const bursts = 5
      for (let b = 0; b < bursts; b++) {
        const ph = (t * 0.32 * opts.speed + b / bursts) % 1
        const bx = ((b * 331) % w) + ((b * 97) % 40)
        const by = ((b * 449 + 80) % (h * 0.6)) + h * 0.08
        const col = b % 2 === 0 ? opts.primaryColor : opts.secondaryColor
        const rgb = hexToRgb(col)
        const parts = 60
        for (let p = 0; p < parts; p++) {
          const ang = (p / parts) * Math.PI * 2 + b
          const rad = ph * Math.max(w, h) * 0.22
          const px = bx + Math.cos(ang) * rad
          const py = by + Math.sin(ang) * rad * 0.72
          const alpha = Math.max(0, 1 - ph) * (0.5 + 0.5 * Math.abs(Math.sin(ang * 3)))
          ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')'
          ctx.beginPath()
          ctx.arc(px, py, 1.6 + (1 - ph) * 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - ph) + ')'
        ctx.shadowColor = col
        ctx.shadowBlur = opts.glow * 0.3
        ctx.beginPath()
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      // cursor trail launches a mini burst
      if (opts.interactive) {
        const mx = mouse.x * w
        const my = mouse.y * h
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(mx, my, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    },
  },
]

export const WALLPAPER_ENGINES: Record<EngineType, WallpaperEngine> = Object.fromEntries(
  engines.map((e) => [e.id, e]),
) as Record<EngineType, WallpaperEngine>

export const ALL_ENGINES: WallpaperEngine[] = engines

export const ENGINE_CATEGORIES: { id: EngineCategory | 'all' | 'favorites'; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'favorites', name: 'Favorites' },
  { id: 'neon', name: 'Neon' },
  { id: 'space', name: 'Space' },
  { id: 'nature', name: 'Nature' },
  { id: 'abstract', name: 'Abstract' },
  { id: 'clock', name: 'Clock' },
]

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  primaryColor: '#00f0ff',
  secondaryColor: '#ff0077',
  speed: 1.2,
  density: 50,
  glow: 80,
  customText: '',
  interactive: true,
}

/** Build a Wallpaper record from an engine. */
export function wallpaperFromEngine(
  engine: WallpaperEngine,
  index: number,
  overrides?: Partial<WallpaperSettings>,
): Wallpaper {
  const settings = { ...engine.defaultSettings, ...overrides }
  return {
    id: 'wp-' + engine.id,
    name: engine.name,
    author: engine.author,
    version: '1.0.0',
    description: engine.description,
    type: 'web',
    engineType: engine.id,
    settings,
    isFeatured: engine.isFeatured,
    category: engine.category,
    isFavorite: engine.isFeatured === true,
    tags: engine.tags,
    created: new Date(2026, 0, 1 + index),
    modified: new Date(2026, 5, 15 + index),
    supportsMouse: engine.defaultSettings.interactive,
    supportsAudio: engine.id === 'waves',
    supportsSystem: true,
  }
}
