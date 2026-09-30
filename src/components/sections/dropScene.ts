// "Drag & drop" beat on the "8": a chunky 3D pixel-art hand carries a pill labelled
// with the effect's name, drops it on the glyph, and a pixel shockwave switches the
// chromatic-aberration echo on. Pure canvas-2D drawing in screen space (CSS px).

// Classic hand cursor, finger up. 1 = outline, 2 = fill. Fingertip hotspot = (6.5, 0).
const HAND = [
  '......11.........',
  '.....1221........',
  '.....1221........',
  '.....1221........',
  '.....1221........',
  '.....1222111.....',
  '.....1221221111..',
  '.....12212212211.',
  '..11.122222222121',
  '.1221122222222221',
  '.1222122222222221',
  '..122222222222221',
  '...12222222222221',
  '...1222222222221.',
  '....122222222221.',
  '....12222222221..',
  '.....1222222221..',
  '.....1222222221..',
  '.....1111111111..',
]
const HOT_X = 6.5
const HOT_Y = 0

// ── Timeline (seconds) ──────────────────────────────────────────
export const DROP_TOTAL = 1.9
const T_ARRIVE = 0.5   // hand + pill glide in
const T_DROP = 0.66    // hand taps and lets go
const T_IMPACT = 0.8   // pill lands → shockwave, effect switches on
const T_LEAVE = 0.95   // hand leaves
const T_DISSOLVE = 1.2 // pill breaks into pixels

// Pixel-glass pill
const GLASS_BLOCK = 2                               // CSS px per glass pixel
const SCRAMBLE = '█▓▒░#%&@$*+=/\\<>01ÆØ§¤'            // glyphs the label cycles through in flight

export const DROP_IMPACT = T_IMPACT

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, px: number, press: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(1 - 0.08 * press, 1 - 0.08 * press)
  ctx.translate(-HOT_X * px, -HOT_Y * px)
  const depth = Math.round(4 * (1 - 0.6 * press))
  // Extruded body: stacked silhouettes stepping down-right, darker as they go back
  for (let d = depth; d >= 1; d--) {
    ctx.fillStyle = `rgb(${34 + d * 6},${38 + d * 6},${38 + d * 6})`
    for (let r = 0; r < HAND.length; r++) {
      for (let c = 0; c < HAND[r].length; c++) {
        if (HAND[r][c] !== '.') ctx.fillRect(c * px + d * px * 0.45, r * px + d * px * 0.45, px + 0.5, px + 0.5)
      }
    }
  }
  // Face
  for (let r = 0; r < HAND.length; r++) {
    for (let c = 0; c < HAND[r].length; c++) {
      const v = HAND[r][c]
      if (v === '.') continue
      ctx.fillStyle = v === '1' ? '#0b0f0f' : '#ffffff'
      ctx.fillRect(c * px, r * px, px + 0.5, px + 0.5)
    }
  }
  ctx.restore()
}

// Offscreen buffers for the glass pill (reused)
const glass = { base: null as HTMLCanvasElement | null, chan: null as HTMLCanvasElement | null }
const buffer = (key: 'base' | 'chan', w: number, h: number) => {
  const c = glass[key] ?? (glass[key] = document.createElement('canvas'))
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
  return c
}

/** Label text while flying: characters settle left → right as `resolve` goes 0 → 1 */
function scrambled(label: string, resolve: number, t: number) {
  const tick = Math.floor(t * 22)
  return label
    .split('')
    .map((ch, i) => {
      if (ch === ' ' || i / label.length < resolve) return ch
      return SCRAMBLE[Math.floor(hash(i, tick) * SCRAMBLE.length)]
    })
    .join('')
}

/**
 * Liquid-glass pill, pixelated, with chromatic aberration.
 * Refracts (slightly magnified) whatever is already on `ctx` behind it, adds a
 * milky tint, rim light and a specular, all resolved at GLASS_BLOCK px, then
 * composited as offset R/G/B layers.
 */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  label: string, text: string,
  lift: number, dissolve: number, split: number, font: string, dpr: number,
) {
  ctx.save()
  ctx.font = font
  const w = Math.ceil(ctx.measureText(label).width + 40) // width from the final label: no jitter while scrambling
  const h = 40
  const pad = 6
  const bw = Math.ceil((w + pad * 2) / GLASS_BLOCK)
  const bh = Math.ceil((h + pad * 2) / GLASS_BLOCK)

  // 1 · Glass, rendered small (pill-local coords, CSS px → glass pixels)
  const base = buffer('base', bw, bh)
  const g = base.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, bw, bh)
  g.imageSmoothingEnabled = true
  g.setTransform(1 / GLASS_BLOCK, 0, 0, 1 / GLASS_BLOCK, bw / 2, bh / 2)
  g.beginPath()
  g.roundRect(-w / 2, -h / 2, w, h, h / 2)
  g.save()
  g.clip()
  // Refraction: the scene behind, magnified a touch and nudged by the lift
  g.save()
  g.rotate(-angle)
  g.scale(1.12, 1.12)
  g.translate(-x - lift * 0.3, -y + lift * 0.5)
  g.drawImage(ctx.canvas, 0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr)
  g.restore()
  // Smoked glass so it reads over both the dark grid and the white glyphs…
  g.fillStyle = 'rgba(14,20,20,0.32)'
  g.fillRect(-w / 2, -h / 2, w, h)
  // …with a milky sheen, brighter at the top
  const body = g.createLinearGradient(0, -h / 2, 0, h / 2)
  body.addColorStop(0, 'rgba(255,255,255,0.26)')
  body.addColorStop(0.55, 'rgba(255,255,255,0.06)')
  body.addColorStop(1, 'rgba(255,255,255,0.14)')
  g.fillStyle = body
  g.fillRect(-w / 2, -h / 2, w, h)
  // Specular
  const spec = g.createRadialGradient(-w * 0.28, -h * 0.3, 0, -w * 0.28, -h * 0.3, h * 0.9)
  spec.addColorStop(0, 'rgba(255,255,255,0.55)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = spec
  g.fillRect(-w / 2, -h / 2, w, h)
  g.restore()
  // Rim light: bright top-left, dim bottom-right
  const rim = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
  rim.addColorStop(0, 'rgba(255,255,255,0.95)')
  rim.addColorStop(0.5, 'rgba(255,255,255,0.25)')
  rim.addColorStop(1, 'rgba(255,255,255,0.6)')
  g.strokeStyle = rim
  g.lineWidth = 2
  g.stroke()

  // Break into pixel blocks at the end
  if (dissolve > 0) {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'destination-out'
    for (let yy = 0; yy < bh; yy += 2) {
      for (let xx = 0; xx < bw; xx += 2) {
        if (hash(xx, yy) < dissolve * 1.15) g.fillRect(xx, yy, 2, 2)
      }
    }
    g.globalCompositeOperation = 'source-over'
  }

  // 2 · Contact shadow (smooth, under the glass)
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - dissolve)})`
  ctx.filter = `blur(${5 + lift * 0.5}px)`
  ctx.beginPath()
  ctx.roundRect(-w / 2 + lift * 0.4, -h / 2 + lift, w, h, h / 2)
  ctx.fill()
  ctx.filter = 'none'

  // 3 · Composite as three offset channels (nearest-neighbour → crisp glass pixels)
  ctx.translate(-lift * 0.25, -lift * 0.6)
  ctx.imageSmoothingEnabled = false
  const chan = buffer('chan', bw, bh)
  const cc = chan.getContext('2d')!
  const channels: [string, number][] = [['#ff0000', -split], ['#00ff00', 0], ['#0000ff', split]]
  // First lay the glass down normally so it occludes what is behind it…
  ctx.globalAlpha = 0.55
  ctx.drawImage(base, -bw * GLASS_BLOCK / 2, -bh * GLASS_BLOCK / 2, bw * GLASS_BLOCK, bh * GLASS_BLOCK)
  // …then add the channels on top, each shifted along the pill's axis
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'lighter'
  for (const [color, dx] of channels) {
    cc.globalCompositeOperation = 'copy'
    cc.drawImage(base, 0, 0)
    cc.globalCompositeOperation = 'multiply'
    cc.fillStyle = color
    cc.fillRect(0, 0, bw, bh)
    cc.globalCompositeOperation = 'destination-in'
    cc.drawImage(base, 0, 0)
    ctx.drawImage(chan, -bw * GLASS_BLOCK / 2 + dx, -bh * GLASS_BLOCK / 2, bw * GLASS_BLOCK, bh * GLASS_BLOCK)
  }
  ctx.globalCompositeOperation = 'source-over'

  // 4 · Label, crisp on top of the pixel glass, with its own (lighter) channel split
  if (dissolve < 0.6) {
    ctx.imageSmoothingEnabled = true
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 1 - dissolve / 0.6
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillText(text, 0.5, 2)
    ctx.globalCompositeOperation = 'lighter'
    const ts = split * 0.45
    ctx.fillStyle = '#ff0000'; ctx.fillText(text, -ts, 1)
    ctx.fillStyle = '#00ff00'; ctx.fillText(text, 0, 1)
    ctx.fillStyle = '#0000ff'; ctx.fillText(text, ts, 1)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
  return { w, h }
}

/** Expanding pixel ring, split into R/G/B */
function drawShockwave(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, px: number) {
  if (t <= 0 || t >= 1) return
  const r = 20 + easeOutCubic(t) * 220
  const a = (1 - t) ** 1.2
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const colors = ['255,40,60', '60,255,120', '70,120,255']
  colors.forEach((rgb, k) => {
    const rr = r * (1 + (k - 1) * 0.06)
    ctx.fillStyle = `rgba(${rgb},${a})`
    // Two pixel-thick ring, snapped to the pixel grid
    const steps = Math.max(32, Math.round((Math.PI * 2 * rr) / (px * 0.8)))
    for (const band of [0, px]) {
      for (let i = 0; i < steps; i++) {
        const ang = (i / steps) * Math.PI * 2
        const gx = Math.round((x + Math.cos(ang) * (rr + band)) / px) * px
        const gy = Math.round((y + Math.sin(ang) * (rr + band)) / px) * px
        ctx.fillRect(gx, gy, px - 1, px - 1)
      }
    }
  })
  // Brief white flash at the contact point
  const flash = (1 - span(t, 0, 0.25)) * 0.8
  if (flash > 0) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 120)
    g.addColorStop(0, `rgba(255,255,255,${flash})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 120, y - 120, 240, 240)
  }
  ctx.restore()
}

/**
 * Draw the whole beat at `t` seconds.
 * @param target screen point (CSS px) where the pill lands; `angle` = grid roll on screen
 */
export function drawDropScene(
  ctx: CanvasRenderingContext2D,
  t: number,
  target: { x: number; y: number },
  angle: number,
  size: { w: number; h: number },
  label: string,
  font: string,
  dpr = 1,
) {
  if (t < 0 || t > DROP_TOTAL) return
  const px = Math.max(3, Math.round(Math.min(size.w, size.h) / 190))

  // Pill: carried in along an arc, then dropped with a bounce
  const arrive = easeInOutCubic(span(t, 0, T_ARRIVE))
  const start = { x: size.w * 0.97, y: -size.h * 0.12 }
  const bend = Math.sin(Math.PI * arrive) * size.h * 0.08
  const px0 = lerp(start.x, target.x, arrive) + bend
  const py0 = lerp(start.y, target.y, arrive) - bend * 0.3
  const fall = span(t, T_DROP, T_IMPACT)
  const settle = span(t, T_IMPACT, T_IMPACT + 0.25)
  const lift = t < T_DROP ? 18 : t < T_IMPACT ? 18 * (1 - fall * fall) : 6 * Math.sin(Math.PI * settle) * (1 - settle)
  const wobble = Math.sin(t * 9) * 0.05 * (1 - arrive) + (t < T_IMPACT ? 0 : Math.sin(settle * 14) * 0.04 * (1 - settle))
  const dissolve = span(t, T_DISSOLVE, DROP_TOTAL)

  ctx.save()
  // Characters cycle in flight and lock in (left → right) by the time it's dropped
  const text = scrambled(label, span(t, T_ARRIVE * 0.35, T_DROP), t)
  // Channel split: wide while flying, snapping together on landing (a small kick at impact)
  const split = t < T_IMPACT
    ? lerp(4, 1.5, span(t, T_ARRIVE * 0.5, T_IMPACT))
    : 1 + 3 * Math.exp(-(t - T_IMPACT) * 9) * Math.abs(Math.cos((t - T_IMPACT) * 30))
  const pill = drawPill(ctx, px0, py0, angle + wobble, label, text, lift, dissolve, split, font, dpr)
  ctx.restore()

  drawShockwave(ctx, target.x, target.y, span(t, T_IMPACT, T_IMPACT + 0.6), px)

  // Hand: fingertip holds the pill's right end, taps on drop, then leaves up-right
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const endX = px0 + c * (pill.w / 2 + 6)
  const endY = py0 + s * (pill.w / 2 + 6) - lift * 0.6
  const leave = easeInOutCubic(span(t, T_LEAVE, DROP_TOTAL - 0.15))
  const press = t > T_DROP - 0.05 && t < T_IMPACT + 0.1 ? Math.sin(Math.PI * span(t, T_DROP - 0.05, T_IMPACT + 0.1)) : 0
  const hx = lerp(endX, size.w * 1.1, leave)
  const hy = lerp(endY, -size.h * 0.2, leave)
  if (leave < 1) drawHand(ctx, hx, hy, angle - Math.PI / 2 + wobble * 2, px, press)
}
