import { MotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { RefObject, useCallback, useEffect, useRef } from 'react'
import type { EchoFx } from './echoFx'
import { CLIENT_LOGOS } from '@/data/clients'
import { drawDropScene, DROP_TOTAL, DROP_IMPACT } from './dropScene'

/** Below this progress the DOM face is shown; above it, the canvas takes over */
export const MORPH_HANDOFF = 0.004

// ── Logo geometry (SVG units — viewBox 331.88 × 433.69) ─────────
// The logo is a 2×2 grid of glyphs ("1 7 / 7 8"), each built on 3×4 modules.
const LOGO_W = 331.88
const LOGO_H = 433.69
const CELL_W = 157.3 / 3
const CELL_H = 209.3 / 4
const GLYPH_X = [0, 174.6]
const GLYPH_Y = [0, 224.43]

// Per glyph, rows of 3 cells: F full · . empty · a/b/c/d half-cell triangle
// whose TL / TR / BR / BL corner collapses into the cell center.
const GLYPHS: string[][][] = [
  [['aF.', 'FF.', '.F.', 'FFF'], ['FFF', 'aFF', 'FFc', 'F..']], // "1" "7"
  [['FFF', 'aFF', 'FFc', 'F..'], ['FFb', 'dFF', 'FFb', 'dFF']], // "7" "8"
]
const COLLAPSE: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }

// Exact outlines, drawn once every piece has settled (identical silhouette → invisible swap)
const LOGO_POLYS = [
  [331.88, .02, 331.84, 104.47, 279.44, 156.87, 226.94, 156.9, 226.91, 209.28, 174.6, 209.29, 174.57, 104.69, 226.88, 52.4, 174.58, 52.27, 174.62, .06, 277.36, .03],
  [157.29, 157.03, 157.27, 209.31, .06, 209.29, .03, 157.02, 52.39, 157.02, 52.35, 104.75, .04, 104.75, .04, 52.51, 52.56, 0, 105.02, .01, 104.95, 157],
  [157.31, 224.43, 157.27, 328.87, 104.86, 381.28, 52.37, 381.3, 52.34, 433.69, .03, 433.69, 0, 329.1, 52.31, 276.81, 0, 276.67, .05, 224.46, 102.79, 224.44],
  [331.73, 381.22, 331.65, 433.68, 226.95, 433.66, 174.76, 381.35, 174.75, 328.98, 226.77, 328.93, 174.73, 276.62, 174.77, 224.44, 279.46, 224.43, 331.7, 276.62, 331.69, 328.94, 279.79, 328.98, 331.73, 381.22],
]

// ── Choreography (scroll progress 0 → 1) ────────────────────────
const S1 = [0.03, 0.16]    // 2 eyes → 4
const S2 = [0.2, 0.34]     // 4 → 8 blocks (logo silhouette)
const S3 = [0.38, 0.45]    // 8 blocks → module grid
// Camera takes over to close the assembly
const ZOOM = [0.45, 0.55]  // cinematic push-in onto the "1"
const TURN = [0.53, 0.62]  // cinematic roll to a tilted view
const CARVE1 = [0.62, 0.7] // the "1" carves itself
const PAN = [0.7, 0.85]    // camera glides to the "8"; the 7s and the 8 carve as it passes
// …holds on the "8" (hover echo lives here)…
const FINAL = [0.9, 0.98]  // travel to the closing hero frame: the lower "7", cropped on the right
// Closing frame: where the "7" sits on screen (fraction of the card from its center), zoom and roll
const FINAL_AT = { x: 0.316, y: -0.058 }
const FINAL_ZOOM = 3
const FINAL_TILT = 0.12
// Phones (portrait card): the copy sits on top, so the "7" drops to the lower right and zooms less
const FINAL_AT_PORTRAIT = { x: 0.26, y: 0.3 }
const FINAL_ZOOM_PORTRAIT = 1.9
/** Tall, narrow card (phones): framings and captions switch to their portrait variants */
const isPortrait = (W: number, H: number) => W < H * 0.8
// Lateral scene: after the closing frame the camera slides right by this share of the card width
// (far enough that the "8" ends up peeking in on the left edge)
export const PAN_FRAC = 1.28
// The lower "7" and "8" (they carry the chromatic aberration) stay through the slide; the top row clears
const STAYING_GLYPHS = [2, 3]
// Works: from the logos screen the camera travels down by this share of the card height
export const WORKS_DROP = 1

// Logos screen framing (camera level): the "8" peeks in on the left, the logos row sits below centre
const LATERAL_PEEK = 0.1    // share of the width the "8" keeps on screen
const LATERAL_ROW_Y = 0.12  // logos row centre, share of the height below the middle
function lateralFrame(W: number, H: number, s: number, ox: number, oy: number) {
  const zoom = isPortrait(W, H) ? FINAL_ZOOM_PORTRAIT : FINAL_ZOOM
  const eightRight = ox + (GLYPH_X[1] + CELL_W * 3) * s
  const rowCy = oy + (GLYPH_Y[1] + CELL_H * 2.5) * s
  return {
    fx: eightRight + ((0.5 - LATERAL_PEEK) * W) / zoom,
    fy: rowCy - (LATERAL_ROW_Y * H) / zoom,
    zoom,
  }
}

/**
 * Logos screen, measured on the card once the camera has settled (card px): the module size and
 * where the logos row starts — so DOM content (the services grid) can sit on the canvas grid lines
 */
export function lateralGrid(W: number, H: number) {
  const logoH = Math.min(H * 0.56, (W * 0.62 * LOGO_H) / LOGO_W)
  const zoom = isPortrait(W, H) ? FINAL_ZOOM_PORTRAIT : FINAL_ZOOM
  const module = CELL_H * (logoH / LOGO_H) * zoom
  return { module, logosTop: H / 2 + LATERAL_ROW_Y * H - module / 2 }
}

// Client logos ride inside one module row of the grid (so they tilt with it) in the lateral scene
const LOGO_ROW = { glyphRow: 1, row: 2 } // between module lines 2 and 3 of the lower glyph row
const LOGO_SPEED = 0.55                  // module heights per second
const LOGO_HEIGHT = 0.208                // logo height, share of the row
const LOGO_GAP = 1                       // gap between logos, in module heights
const CARVE_LEN = 0.06     // how long each module takes to settle
const SETTLED = PAN[1] + 0.005
const FLASHES = [[S1[1], 0.35], [S2[1], 0.5], [FINAL[1], 0.6]] as const

// Hover echo (three.js, chromatic aberration): the hovered glyph trails back, splitting into RGB
const ECHO_DIR_EIGHT = { x: 0.88, y: 0.47 }   // screen-space trail direction on the "8"…
const ECHO_DIR_FINAL = { x: -0.34, y: 0.94 }  // …and on the closing "7" (down, away from the edge)
const ECHO_LENGTH = 0.34                      // trail length, fraction of the card's larger side
const ECHO_MELT = 16                          // CSS px of glyph edge that dissolves into pixels

// Drag & drop beat on the "8": a pixel hand drops an "aberración cromática" pill on it,
// which switches the echo on for good on the lower "7" and the "8"
export const DROP_AT = 0.858                  // morph progress that triggers it (Hero also holds the scroll here)
export const DROP_HOLD_MS = DROP_TOTAL * 1000
export const DROP_IMPACT_MS = DROP_IMPACT * 1000 // the effect switches on here
const DROP_TARGET = { x: 372, y: 322 }        // landing point, SVG units (dark space right of the "8")
const DROP_TARGET_PORTRAIT = { x: 290, y: 188 } // phones: no room beside the "8", it lands in the gap above it
const CA_GLYPHS = [2, 3]                      // lower "7" and "8" in LOGO_POLYS
// Physics: the trail grows on an underdamped spring (overshoots, then settles),
// and a double heartbeat kicks a second spring that makes the pixel blocks jiggle
const ECHO_GROW_SPRING = { k: 70, c: 8 }
const ECHO_KICK_SPRING = { k: 320, c: 9 }
const ECHO_BEAT_PERIOD = 1.4   // s between heartbeats
const ECHO_BEAT_GAP = 0.2      // s between the two thumps of a beat
const ECHO_BEAT_TRAVEL = 0.9   // s for a beat to run down the whole trail

// Captions, in logo space (SVG units) so they ride the camera. One per beat of the morph.
// x/y = top-left (or top-right when align is 'right') of the first line; show = [in, out]
type CaptionSlot = { x: number; y: number; size: number; align: 'left' | 'right' | 'center'; show: [number, number] }
const CAPTION_SLOTS: CaptionSlot[] = [
  { x: -40, y: 95, size: 20, align: 'right', show: [0.06, 0.19] },  // 2 → 4 squares
  { x: -40, y: 290, size: 20, align: 'right', show: [0.21, 0.36] }, // 4 → 8
  { x: 372, y: 30, size: 20, align: 'left', show: [0.39, 0.5] },    // module grid
  { x: -110, y: 60, size: 13, align: 'left', show: [0.6, 0.71] },   // the "1" carves
  { x: 392, y: 292, size: 13, align: 'left', show: [0.8, 0.925] },  // resting on the "8"
]
// Phones: no room beside the logo, so the captions sit under it (centred) or above the glyph in focus
const CAPTION_SLOTS_PORTRAIT: CaptionSlot[] = [
  { x: LOGO_W / 2, y: LOGO_H + 44, size: 26, align: 'center', show: [0.06, 0.19] },
  { x: LOGO_W / 2, y: LOGO_H + 44, size: 26, align: 'center', show: [0.21, 0.36] },
  { x: LOGO_W / 2, y: LOGO_H + 44, size: 26, align: 'center', show: [0.39, 0.5] },
  { x: 55, y: -40, size: 15, align: 'left', show: [0.6, 0.71] },
  { x: 120, y: LOGO_H + 22, size: 15, align: 'left', show: [0.8, 0.925] },
]
const CAPTION_FONT = '"Geist", system-ui, sans-serif'
const CAPTION_IN = 0.035    // progress each word takes to slide in / out
const CAPTION_LINE_LAG = 0.012
const CAPTION_WORD_LAG = 0.006

// Push: hovering a module tilts it back in 3D towards the cursor, then it springs back
const PUSH_TILT = 0.75    // rad at the very edge of the module
const PUSH_DEPTH = 0.55   // how far it sinks, in module sizes
const PUSH_FOCAL = 3.2    // perspective focal length, in module sizes
const PUSH_SPRING = { k: 170, c: 11 }

type Press = { amt: number; vel: number; target: number; ox: number; oy: number }

/** Project a quad as if tilted about its center towards (ox, oy) and pushed back by `amt` */
function pushQuad(q: Quad, press: Press): Quad {
  const cx = (q[0] + q[2] + q[4] + q[6]) / 4
  const cy = (q[1] + q[3] + q[5] + q[7]) / 4
  const half = Math.max(Math.hypot(q[2] - q[0], q[3] - q[1]), Math.hypot(q[6] - q[0], q[7] - q[1])) / 2 || 1
  const reach = Math.min(1, Math.hypot(press.ox, press.oy))
  const ang = Math.atan2(press.oy, press.ox)
  const ux = Math.cos(ang)
  const uy = Math.sin(ang)
  const theta = PUSH_TILT * reach * press.amt
  const depth = PUSH_DEPTH * half * 2 * press.amt
  const focal = PUSH_FOCAL * half * 2
  const out: Quad = []
  for (let i = 0; i < 8; i += 2) {
    const px = q[i] - cx
    const py = q[i + 1] - cy
    const a = px * ux + py * uy   // along the push direction
    const b = -px * uy + py * ux  // across it (rotation axis)
    const z = a * Math.sin(theta) + depth
    const f = focal / (focal + Math.max(-focal * 0.8, z))
    const a2 = a * Math.cos(theta)
    out.push(cx + (a2 * ux - b * uy) * f, cy + (a2 * uy + b * ux) * f)
  }
  return out
}

// Camera framing
const ZOOM_IN = 2.4
const TILT = -0.33 // rad (~-19°)

// ── Math helpers ────────────────────────────────────────────────
type Rect = { cx: number; cy: number; w: number; h: number }
type Quad = number[] // x0 y0 … x3 y3 (TL TR BR BL)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const stage = (p: number, [a, b]: number[]) => clamp01((p - a) / (b - a))
const stagger = (t: number, order: number, spread: number) => clamp01((t - order * spread) / (1 - spread))
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t))

/** Rect interpolation along a slight arc, shrinking a touch mid-flight (depth) */
function flyRect(a: Rect, b: Rect, t: number, arc: number, depth: number): Rect {
  if (t <= 0) return a
  if (t >= 1) return b
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const bend = Math.sin(Math.PI * t) * arc
  const k = 1 - depth * Math.sin(Math.PI * t)
  return {
    cx: lerp(a.cx, b.cx, t) - dy * bend,
    cy: lerp(a.cy, b.cy, t) + dx * bend,
    w: lerp(a.w, b.w, t) * k,
    h: lerp(a.h, b.h, t) * k,
  }
}

const rectQuad = ({ cx, cy, w, h }: Rect, grow = 0): Quad => {
  const x0 = cx - w / 2 - grow, x1 = cx + w / 2 + grow
  const y0 = cy - h / 2 - grow, y1 = cy + h / 2 + grow
  return [x0, y0, x1, y0, x1, y1, x0, y1]
}

// Glyph centers (SVG units) — camera targets
const glyphCenter = (col: number, row: number) => ({
  x: GLYPH_X[col] + (CELL_W * 3) / 2,
  y: GLYPH_Y[row] + CELL_H * 2,
})
const G_ONE = glyphCenter(0, 0)
const G_EIGHT = glyphCenter(1, 1)

// ── Pieces: 8 blocks × 6 modules = 48 ───────────────────────────
// Block b: eye (b >> 2) — left eye feeds the left glyphs, right eye the right ones.
// Inside an eye, blocks stack top→bottom: top glyph (upper half, lower half), bottom glyph (…).
type Piece = {
  eye: number
  pair: number   // which half of the eye in the 4-split
  block: number
  col: number    // glyph col / row
  row: number
  half: number   // upper or lower half of the glyph
  cc: number     // module inside the half: col 0..2, row 0..1
  cr: number
  kind: string
  order: number  // stagger order (diagonal sweep)
  carve: number  // progress at which this module starts carving
}

const PIECES: Piece[] = []
for (let block = 0; block < 8; block++) {
  const eye = block >> 2
  const k = block & 3
  const row = k >> 1
  const half = k & 1
  for (let s = 0; s < 6; s++) {
    const cc = s % 3
    const cr = Math.floor(s / 3)
    const gr = row * 4 + half * 2 + cr
    const gc = eye * 3 + cc
    // Carve timing: the "1" carves on its own; the rest carve as the camera glides past them
    let carve: number
    if (row === 0 && eye === 0) {
      carve = lerp(CARVE1[0], CARVE1[1] - CARVE_LEN, (cc + half * 2 + cr) / 5)
    } else {
      const x = GLYPH_X[eye] + CELL_W * (cc + 0.5) - G_ONE.x
      const y = GLYPH_Y[row] + CELL_H * (half * 2 + cr + 0.5) - G_ONE.y
      const vx = G_EIGHT.x - G_ONE.x
      const vy = G_EIGHT.y - G_ONE.y
      const u = clamp01(((x * vx + y * vy) / (vx * vx + vy * vy) - 0.1) / 1.15)
      carve = lerp(PAN[0] + 0.01, PAN[1] - CARVE_LEN, u)
    }
    PIECES.push({
      eye, pair: row, block, col: eye, row, half, cc, cr,
      kind: GLYPHS[row][eye][half * 2 + cr][cc],
      order: (gc + gr) / 12,
      carve,
    })
  }
}

// Diagonal guides: every 45° chamfer of the logo extended into a construction line.
// Collinear chamfers share one line; it is traced when its first module starts carving.
type Diagonal = { ax: number; ay: number; dx: number; dy: number; start: number }
const DIAGONALS: Diagonal[] = (() => {
  const byLine = new Map<string, Diagonal>()
  for (const pc of PIECES) {
    if (pc.kind === 'F' || pc.kind === '.') continue
    const x0 = GLYPH_X[pc.col] + CELL_W * pc.cc
    const y0 = GLYPH_Y[pc.row] + CELL_H * (pc.half * 2 + pc.cr)
    const x1 = x0 + CELL_W
    const y1 = y0 + CELL_H
    // a / c cut from top-right to bottom-left, b / d from top-left to bottom-right
    const rising = pc.kind === 'a' || pc.kind === 'c'
    const [px, py, qx, qy] = rising ? [x1, y0, x0, y1] : [x0, y0, x1, y1]
    const key = rising ? `r${Math.round((px + py) / 4)}` : `f${Math.round((px - py) / 4)}`
    const len = Math.hypot(qx - px, qy - py)
    const line = byLine.get(key)
    if (!line || pc.carve < line.start) {
      byLine.set(key, { ax: (px + qx) / 2, ay: (py + qy) / 2, dx: (qx - px) / len, dy: (qy - py) / len, start: pc.carve })
    }
  }
  return [...byLine.values()]
})()

interface LogoMorphProps {
  progress: MotionValue<number>
  /** Lines for each caption slot (CAPTION_SLOTS) */
  captions: string[][]
  /** 0 → 1: lateral camera slide after the closing frame */
  pan?: MotionValue<number>
  /** 0 → 1: camera moves down from the logos screen to "Works" */
  down?: MotionValue<number>
  /** Text on the dragged pill */
  effectLabel?: string
  /** The two DOM eyes the morph starts from */
  eyesRef: RefObject<(HTMLElement | null)[]>
}

export default function LogoMorph({ progress, eyesRef, captions, pan, down, effectLabel = '' }: LogoMorphProps) {
  const downRef = useRef(down)
  downRef.current = down
  const panRef = useRef(pan)
  panRef.current = pan
  const reduceMotion = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  // Eye rects (card-local px), captured live until the handoff
  const eyes = useRef<Rect[]>([])
  // Untransformed eye size (ignores blinks / expressions) — drives the split formations
  const eyeBase = useRef({ w: 0, h: 0 })
  const morphing = useRef(false)
  // Hover echo state (animated in its own rAF loop)
  const echoCanvas = useRef<HTMLCanvasElement | null>(null) // mask: R = outline, G = body
  const fxCanvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef<EchoFx | null>(null)
  const echo = useRef({
    amt: LOGO_POLYS.map(() => 0), // per glyph, spring position
    vel: LOGO_POLYS.map(() => 0),
    beat: 0,     // s since the current heartbeat started
    phase: -1,   // heartbeat front along the trail (−1 = none)
    kick: 0,     // heartbeat spring
    kickVel: 0,
  })
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const presses = useRef(new Map<number, Press>())
  const lastPieces = useRef<{ q: Quad; alpha: number }[]>([])
  const captionsRef = useRef(captions)
  captionsRef.current = captions
  const effectLabelRef = useRef(effectLabel)
  effectLabelRef.current = effectLabel
  // Drag & drop beat: when it started (ms), and whether the effect is switched on for good
  const drop = useRef<{ start: number | null; on: boolean }>({ start: null, on: false })
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion
  // Client logos pre-rendered as white silhouettes
  const logoSprites = useRef<{ img: HTMLCanvasElement; aspect: number }[]>([])

  const captureEyes = useCallback(() => {
    const canvas = canvasRef.current
    const els = eyesRef.current
    if (!canvas || !els) return
    const base = canvas.getBoundingClientRect()
    const rects: Rect[] = []
    for (const el of els) {
      if (!el) return
      const r = el.getBoundingClientRect()
      rects.push({ cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2, w: r.width, h: r.height })
    }
    if (rects.length === 2) eyes.current = rects
    const el = els[0]
    if (el) eyeBase.current = { w: el.offsetWidth, h: el.offsetHeight }
  }, [eyesRef])

  /** Formations shared by the pieces and the grid (card-local px) */
  const layout = useCallback(() => {
    const { w: W, h: H } = size.current
    const [eL, eR] = eyes.current
    const { w: eyeW, h: eyeH } = eyeBase.current

    // Logo box
    const logoH = Math.min(H * 0.56, (W * 0.62 * LOGO_H) / LOGO_W)
    const s = logoH / LOGO_H
    const ox = W / 2 - (LOGO_W * s) / 2
    const oy = H / 2 - logoH / 2
    const lcx = W / 2
    const lcy = H / 2

    // 4-split formation: each eye halves, drifting a third of the way to the logo
    const spread = Math.abs(eR.cx - eL.cx) / 2
    const c1x = lerp((eL.cx + eR.cx) / 2, lcx, 0.33)
    const c1y = lerp((eL.cy + eR.cy) / 2, lcy, 0.33)
    const w1 = eyeW * 1.5
    const h1 = eyeH * 0.5
    const gap1 = eyeH * 0.22

    const f1 = (eye: number, pair: number): Rect => ({
      cx: c1x + (eye ? 1 : -1) * spread * 1.25,
      cy: c1y + (pair ? 1 : -1) * (h1 + gap1) / 2,
      w: w1, h: h1,
    })

    // 8-split formation: glyph halves (the logo silhouette), with gaps
    const inset2 = 5
    const f2 = (col: number, row: number, half: number): Rect => ({
      cx: ox + (GLYPH_X[col] + CELL_W * 1.5) * s,
      cy: oy + (GLYPH_Y[row] + half * CELL_H * 2 + CELL_H) * s,
      w: (CELL_W * 3 - inset2 * 2) * s,
      h: (CELL_H * 2 - inset2 * 2) * s,
    })

    return { W, H, eL, eR, s, ox, oy, lcx, lcy, c1x, c1y, f1, f2 }
  }, [])

  /** Every piece's quad + alpha at a given progress */
  const piecesAt = useCallback((p: number) => {
    const { eL, eR, s, ox, oy, lcx, lcy, f1: formation1, f2: formation2 } = layout()

    const t1 = stage(p, S1)
    const t2 = stage(p, S2)
    const t3 = stage(p, S3)

    return PIECES.map((pc) => {
      const e0 = pc.eye ? eR : eL

      const f1 = formation1(pc.eye, pc.pair)
      const f2 = formation2(pc.col, pc.row, pc.half)
      const gx = GLYPH_X[pc.col]
      const gy = GLYPH_Y[pc.row] + pc.half * CELL_H * 2

      const cell: Rect = {
        cx: ox + (gx + CELL_W * (pc.cc + 0.5)) * s,
        cy: oy + (gy + CELL_H * (pc.cr + 0.5)) * s,
        w: CELL_W * s,
        h: CELL_H * s,
      }
      const inset3 = 3.5 * s
      const f3: Rect = { ...cell, w: cell.w - inset3 * 2, h: cell.h - inset3 * 2 }

      // 1 · two eyes split into four
      let r = flyRect(e0, f1, easeInOutQuart(stagger(t1, pc.eye, 0.12)), (pc.pair ? 1 : -1) * 0.04, 0.05)
      // 2 · four split into eight, flying out to the logo silhouette
      r = flyRect(r, f2, easeInOutQuart(stagger(t2, pc.block / 7, 0.28)), (pc.block % 2 ? 1 : -1) * 0.12, 0.14)
      // 3 · each block cracks into its module grid
      r = flyRect(r, f3, easeInOutCubic(stagger(t3, pc.order, 0.35)), 0, 0)

      // 4 · carve: modules settle, triangles fold a corner in, empty modules drift away
      let q = rectQuad(r)
      let alpha = 1
      const t = easeOutExpo(clamp01((p - pc.carve) / CARVE_LEN))
      if (t > 0) {
        let target: Quad
        if (pc.kind === '.') {
          const dx = cell.cx - lcx
          const dy = cell.cy - lcy
          const d = Math.hypot(dx, dy) || 1
          const px = cell.cx + (dx / d) * cell.w * 0.6
          const py = cell.cy + (dy / d) * cell.w * 0.6
          target = [px, py, px, py, px, py, px, py]
          alpha = 1 - t
        } else {
          target = rectQuad(cell, 0.4)
          if (pc.kind !== 'F') {
            const k = COLLAPSE[pc.kind] * 2
            target[k] = cell.cx
            target[k + 1] = cell.cy
          }
        }
        q = q.map((v, i) => lerp(v, target[i], t))
      }
      return { q, alpha }
    })
  }, [layout])

  /**
   * The construction grid: born around the 4 squares, it mutates with every split
   * until it becomes the logo's module grid. Line counts stay constant — new lines
   * are born stacked on existing ones and slide apart.
   */
  const gridAt = useCallback((p: number) => {
    const { s, ox, oy, lcx, lcy, c1x, c1y, f1, f2 } = layout()
    const t2 = easeInOutQuart(stage(p, S2))
    const t3 = easeInOutCubic(stage(p, S3))

    const mix = (a: number[], b: number[], c: number[]) =>
      a.map((v, i) => lerp(lerp(v, b[i], t2), c[i], t3))

    const xs: number[] = []
    const ys: number[] = []
    for (let g = 0; g < 2; g++) {
      // Columns of glyph g: [left, inner, inner, right]
      const a = f1(g, 0)
      const b = f2(g, 0, 0)
      const cols = (r: Rect) => [r.cx - r.w / 2, r.cx, r.cx, r.cx + r.w / 2]
      const logoCols = [0, 1, 2, 3].map((k) => ox + (GLYPH_X[g] + CELL_W * k) * s)
      xs.push(...mix(cols(a), cols(b), logoCols))

      // Rows of glyph g: [top, ·, mid, mid, ·, bottom] → the 4 module rows
      const r1 = f1(0, g)
      const top = r1.cy - r1.h / 2
      const bot = r1.cy + r1.h / 2
      const m1 = r1.cy
      const u = f2(0, g, 0)
      const d = f2(0, g, 1)
      const rows2 = [u.cy - u.h / 2, u.cy, u.cy + u.h / 2, d.cy - d.h / 2, d.cy, d.cy + d.h / 2]
      const y = (k: number) => oy + (GLYPH_Y[g] + CELL_H * k) * s
      ys.push(...mix([top, m1, m1, m1, m1, bot], rows2, [y(0), y(1), y(2), y(2), y(3), y(4)]))
    }

    const reveal = easeInOutCubic(stage(p, [lerp(S1[0], S1[1], 0.55), S1[1] + 0.04]))
    const fade = 1
    // Diagonal guides (card px), each growing out from its chamfer
    const diags = DIAGONALS.map((d) => ({
      x: ox + d.ax * s,
      y: oy + d.ay * s,
      dx: d.dx,
      dy: d.dy,
      grow: easeOutExpo(clamp01((p - (d.start - 0.01)) / 0.07)),
    }))

    return {
      xs, ys, diags,
      alpha: reveal * fade,
      reveal,
      cx: lerp(c1x, lcx, t2),
      cy: lerp(c1y, lcy, t2),
    }
  }, [layout])

  /** 2D camera: focus point (card px), zoom and roll */
  const cameraAt = useCallback((p: number) => {
    const { W, H, s, ox, oy, lcx, lcy } = layout()
    const one = { x: ox + G_ONE.x * s, y: oy + G_ONE.y * s }
    const eight = { x: ox + G_EIGHT.x * s, y: oy + G_EIGHT.y * s }
    const seven = glyphCenter(0, 1)

    const z = easeInOutCubic(stage(p, ZOOM))
    const tr = easeInOutCubic(stage(p, TURN))
    const pn = easeInOutCubic(stage(p, PAN))
    const fin = easeInOutCubic(stage(p, FINAL))

    let fx = lerp(lerp(lcx, one.x, z), eight.x, pn)
    let fy = lerp(lerp(lcy, one.y, z), eight.y, pn)
    // Push in, lean in a touch more during the roll, breathe out mid-glide
    let zoom = lerp(1, ZOOM_IN, z) * lerp(1, 1.1, tr) * (1 - 0.14 * Math.sin(Math.PI * pn))
    let rot = TILT * tr

    // Closing frame: solve the focus so the lower "7" lands at FINAL_AT on screen
    const portrait = isPortrait(W, H)
    const at = portrait ? FINAL_AT_PORTRAIT : FINAL_AT
    const finalZoom = portrait ? FINAL_ZOOM_PORTRAIT : FINAL_ZOOM
    const vx = at.x * W
    const vy = at.y * H
    const c = Math.cos(-FINAL_TILT)
    const n = Math.sin(-FINAL_TILT)
    const endX = ox + seven.x * s - (vx * c - vy * n) / finalZoom
    const endY = oy + seven.y * s - (vx * n + vy * c) / finalZoom
    fx = lerp(fx, endX, fin)
    fy = lerp(fy, endY, fin)
    // Pull out a little mid-move, then settle in
    zoom = lerp(zoom, finalZoom, fin) * (1 - 0.22 * Math.sin(Math.PI * fin))
    rot = lerp(rot, FINAL_TILT, fin)

    // Lateral slide: travel to the logos screen and straighten the roll, so its grid,
    // logos row and copy end up level and centred
    const slide = panRef.current?.get() ?? 0
    if (slide > 0) {
      const lat = lateralFrame(W, H, s, ox, oy)
      fx = lerp(fx, lat.fx, slide)
      fy = lerp(fy, lat.fy, slide)
      zoom = lerp(zoom, lat.zoom, slide)
      rot = lerp(rot, 0, slide)
    }
    // …then down to "Works" (level camera, so a straight vertical move)
    fy += ((downRef.current?.get() ?? 0) * WORKS_DROP * H) / zoom
    return { fx, fy, zoom, rot }
  }, [layout])

  /** Which glyph (index into LOGO_POLYS) is under a viewport point, with the current camera; -1 if none */
  /** Viewport point → world (card px before the camera) */
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || eyes.current.length < 2) return null
    const r = canvas.getBoundingClientRect()
    const { w: W, h: H } = size.current
    const cam = cameraAt(progress.get())
    const vx = clientX - r.left - W / 2
    const vy = clientY - r.top - H / 2
    const c = Math.cos(-cam.rot)
    const n = Math.sin(-cam.rot)
    return { x: (vx * c - vy * n) / cam.zoom + cam.fx, y: (vx * n + vy * c) / cam.zoom + cam.fy }
  }, [cameraAt, progress])

  /** Index of the module under a viewport point, -1 if none */
  const hitPiece = useCallback((clientX: number, clientY: number) => {
    const w = toWorld(clientX, clientY)
    if (!w) return -1
    return lastPieces.current.findIndex(({ q, alpha }) => {
      if (alpha < 0.5) return false
      let inside = false
      for (let i = 0, j = 6; i < 8; j = i, i += 2) {
        const [x1, y1, x2, y2] = [q[i], q[i + 1], q[j], q[j + 1]]
        if ((y1 > w.y) !== (y2 > w.y) && w.x < ((x2 - x1) * (w.y - y1)) / (y2 - y1) + x1) inside = !inside
      }
      return inside
    })
  }, [toWorld])

  const hitLogo = useCallback((clientX: number, clientY: number) => {
    const w = toWorld(clientX, clientY)
    if (!w) return -1
    const { s, ox, oy } = layout()
    const wx = w.x
    const wy = w.y
    // World → SVG units
    const x = (wx - ox) / s
    const y = (wy - oy) / s
    // Glyphs hidden by the lateral slide can't be hovered
    const sliding = (panRef.current?.get() ?? 0) > 0.05
    return LOGO_POLYS.findIndex((poly, g) => {
      if (sliding && !STAYING_GLYPHS.includes(g)) return false
      let inside = false
      for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
        const [x1, y1, x2, y2] = [poly[i], poly[i + 1], poly[j], poly[j + 1]]
        if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside
      }
      return inside
    })
  }, [toWorld, layout])

  const draw = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return
    const p = progress.get()

    if (p <= MORPH_HANDOFF) {
      morphing.current = false
      captureEyes()
      wrap.style.opacity = '0'
      return
    }
    // Freeze the eyes exactly where they were when the scroll took over
    if (!morphing.current) {
      captureEyes()
      morphing.current = true
    }
    if (eyes.current.length < 2) return
    wrap.style.opacity = '1'

    const { w: W, h: H, dpr } = size.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const cam = cameraAt(p)
    ctx.translate(W / 2, H / 2)
    ctx.rotate(cam.rot)
    ctx.scale(cam.zoom, cam.zoom)
    ctx.translate(-cam.fx, -cam.fy)
    // World-space span wide enough to fill the view at any roll
    const reach = Math.hypot(W, H) / cam.zoom
    const hair = 1 / cam.zoom

    // Grid: hairlines + intersection ticks, revealed from the formation outwards
    const grid = gridAt(p)
    if (grid.alpha > 0.002) {
      const R = Math.hypot(W, H) * 0.5 * grid.reveal
      ctx.globalAlpha = grid.alpha
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'
      ctx.lineWidth = hair
      ctx.beginPath()
      for (const x of grid.xs) { ctx.moveTo(x, cam.fy - reach); ctx.lineTo(x, cam.fy + reach) }
      for (const y of grid.ys) { ctx.moveTo(cam.fx - reach, y); ctx.lineTo(cam.fx + reach, y) }
      ctx.stroke()

      // Beyond the logo the grid carries on at module spacing (fades in on the way down to Works)
      const ext = downRef.current?.get() ?? 0
      if (ext > 0.001) {
        const { s, ox, oy } = layout()
        const cw = CELL_W * s
        const ch = CELL_H * s
        const right = ox + LOGO_W * s
        const bottom = oy + (GLYPH_Y[1] + CELL_H * 4) * s
        ctx.save()
        ctx.globalAlpha = grid.alpha * Math.min(1, ext * 2)
        ctx.beginPath()
        for (let x = right + cw; x < cam.fx + reach; x += cw) { ctx.moveTo(x, cam.fy - reach); ctx.lineTo(x, cam.fy + reach) }
        for (let x = ox - cw; x > cam.fx - reach; x -= cw) { ctx.moveTo(x, cam.fy - reach); ctx.lineTo(x, cam.fy + reach) }
        for (let y = bottom + ch; y < cam.fy + reach; y += ch) { ctx.moveTo(cam.fx - reach, y); ctx.lineTo(cam.fx + reach, y) }
        ctx.stroke()
        ctx.restore()
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      const tick = 3.5 * hair
      for (const x of grid.xs) for (const y of grid.ys) {
        ctx.moveTo(x - tick, y); ctx.lineTo(x + tick, y)
        ctx.moveTo(x, y - tick); ctx.lineTo(x, y + tick)
      }
      ctx.stroke()

      // Diagonal guides, traced outwards from each chamfer as it carves
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      for (const d of grid.diags) {
        if (d.grow <= 0) continue
        const L = reach * 1.5 * d.grow
        ctx.moveTo(d.x - d.dx * L, d.y - d.dy * L)
        ctx.lineTo(d.x + d.dx * L, d.y + d.dy * L)
      }
      ctx.stroke()

      // Radial falloff (only the grid is on the canvas at this point)
      // While sliding sideways the grid keeps filling the new view
      const slid = panRef.current?.get() ?? 0
      const mcx = lerp(grid.cx, cam.fx, slid)
      const mcy = lerp(grid.cy, cam.fy, slid)
      const R2 = R * (1 + slid)
      if (R > 1) {
        const mask = ctx.createRadialGradient(mcx, mcy, 0, mcx, mcy, R2)
        mask.addColorStop(0, 'rgba(0,0,0,1)')
        mask.addColorStop(0.35, 'rgba(0,0,0,0.9)')
        mask.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'destination-in'
        ctx.fillStyle = mask
        ctx.fillRect(cam.fx - reach, cam.fy - reach, reach * 2, reach * 2)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
    }
    // Hover echo — while resting on the "8", and on the closing "7" frame
    const atEight = clamp01(1 - Math.max(PAN[1] - p, p - FINAL[0], 0) / 0.015)
    const atFinal = clamp01((p - (FINAL[1] - 0.02)) / 0.02)
    // Once dropped, the effect stays on the lower "7" and "8" (the "8" clears with the lateral slide)
    const fixedZone = drop.current.on && p >= PAN[1] - 0.01 ? 1 : 0
    const clearOthers = 1 - easeInOutCubic(clamp01((panRef.current?.get() ?? 0) / 0.3))
    const amts = echo.current.amt.map((a, g) => {
      const zone = Math.max(atEight, atFinal, CA_GLYPHS.includes(g) ? fixedZone : 0)
      return Math.max(0, a) * zone * (STAYING_GLYPHS.includes(g) ? 1 : clearOthers)
    })
    const echoAmt = Math.max(...amts)
    const off = echoCanvas.current
    if (fx.current && off) {
      if (echoAmt > 0.002) {
        // Mask at half resolution, same camera as the scene
        const octx = off.getContext('2d')!
        octx.setTransform(1, 0, 0, 1, 0, 0)
        octx.clearRect(0, 0, off.width, off.height)
        octx.setTransform(new DOMMatrix().scale(off.width / canvas.width).multiply(ctx.getTransform()))
        const { s, ox, oy } = layout()
        octx.globalCompositeOperation = 'lighter'
        octx.lineJoin = 'miter'
        octx.lineWidth = 1.6 / ((off.width / W) * cam.zoom)
        LOGO_POLYS.forEach((poly, g) => {
          const e = Math.sqrt(Math.min(1, amts[g]))
          if (e <= 0.002) return
          octx.beginPath()
          octx.moveTo(ox + poly[0] * s, oy + poly[1] * s)
          for (let v = 2; v < poly.length; v += 2) octx.lineTo(ox + poly[v] * s, oy + poly[v + 1] * s)
          octx.closePath()
          octx.fillStyle = `rgb(0,${Math.round(255 * e)},0)`
          octx.fill()
          octx.strokeStyle = `rgb(${Math.round(255 * e)},0,0)`
          octx.stroke()
        })
        octx.globalCompositeOperation = 'source-over'
      }
      const len = ECHO_LENGTH * Math.max(W, H)
      const dx = lerp(ECHO_DIR_EIGHT.x, ECHO_DIR_FINAL.x, atFinal)
      const dy = lerp(ECHO_DIR_EIGHT.y, ECHO_DIR_FINAL.y, atFinal)
      const dl = Math.hypot(dx, dy) || 1
      fx.current.render(
        { x: (dx / dl) * len, y: (dy / dl) * len },
        Math.min(1.25, echoAmt),
        echo.current.phase,
        performance.now() / 1000,
        echo.current.kick * Math.max(atEight, atFinal, fixedZone),
        ECHO_MELT,
      )
    }

    ctx.fillStyle = '#fff'

    const fillPieces = (at: number, alpha: number, main = false) => {
      const pieces = piecesAt(at)
      if (main) lastPieces.current = pieces
      pieces.forEach(({ q: quad, alpha: a }, i) => {
        if (a <= 0.002) return
        const press = main ? presses.current.get(i) : undefined
        const q = press ? pushQuad(quad, press) : quad
        ctx.globalAlpha = a * alpha
        // Tilted-away modules catch a little less light
        const shade = press ? Math.round(255 * (1 - 0.22 * Math.min(1, Math.abs(press.amt)))) : 255
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.beginPath()
        ctx.moveTo(q[0], q[1])
        ctx.lineTo(q[2], q[3])
        ctx.lineTo(q[4], q[5])
        ctx.lineTo(q[6], q[7])
        ctx.closePath()
        ctx.fill()
      })
      ctx.fillStyle = '#fff'
    }

    // Motion blur: faint copies back along the path, proportional to scroll speed
    const vel = progress.getVelocity()
    const span = Math.max(-0.035, Math.min(0.035, vel * 0.03))
    if (!reduceMotion && Math.abs(span) > 0.0015) {
      const steps = 5
      for (let i = steps; i >= 1; i--) {
        fillPieces(clamp01(p - (span * i) / steps), 0.14 * (1 - i / (steps + 1)))
      }
    }

    if (p >= SETTLED && presses.current.size === 0) {
      lastPieces.current = []
      const logoH = Math.min(H * 0.56, (W * 0.62 * LOGO_H) / LOGO_W)
      const s = logoH / LOGO_H
      const ox = W / 2 - (LOGO_W * s) / 2
      const oy = H / 2 - logoH / 2
      // During the lateral slide the lower "7" and "8" stay; the top row clears before entering the view
      const clear = 1 - easeInOutCubic(clamp01((panRef.current?.get() ?? 0) / 0.3))
      LOGO_POLYS.forEach((poly, g) => {
        ctx.globalAlpha = STAYING_GLYPHS.includes(g) ? 1 : clear
        if (ctx.globalAlpha <= 0.002) return
        ctx.beginPath()
        ctx.moveTo(ox + poly[0] * s, oy + poly[1] * s)
        for (let i = 2; i < poly.length; i += 2) ctx.lineTo(ox + poly[i] * s, oy + poly[i + 1] * s)
        ctx.closePath()
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Echo melt: carve the hovered glyph's edge away in soft steps so the pixel layer shows through
      LOGO_POLYS.forEach((poly, g) => {
        const a = Math.min(1, amts[g])
        if (a < 0.01 || !fx.current) return
        const path = new Path2D()
        path.moveTo(ox + poly[0] * s, oy + poly[1] * s)
        for (let i = 2; i < poly.length; i += 2) path.lineTo(ox + poly[i] * s, oy + poly[i + 1] * s)
        path.closePath()
        ctx.save()
        ctx.clip(path)
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineJoin = 'miter'
        for (const [width, alpha] of [[1, 0.35], [0.66, 0.5], [0.33, 0.8]]) {
          ctx.globalAlpha = alpha * a
          ctx.lineWidth = (ECHO_MELT * 2 * width) / cam.zoom
          ctx.stroke(path)
        }
        ctx.restore()
      })
    } else {
      fillPieces(p, 1, true)
    }
    ctx.globalAlpha = 1

    // Client logos passing inside a grid row (lateral scene)
    const slid = panRef.current?.get() ?? 0
    if (slid > 0.001 && logoSprites.current.length === CLIENT_LOGOS.length) {
      const { s, oy } = layout()
      const rowH = CELL_H * s
      const top = oy + (GLYPH_Y[LOGO_ROW.glyphRow] + CELL_H * LOGO_ROW.row) * s
      const cy = top + rowH / 2
      const h = rowH * LOGO_HEIGHT
      const gap = rowH * LOGO_GAP
      const sizes = logoSprites.current.map(({ aspect }) => h * aspect)
      const track = sizes.reduce((a, w) => a + w + gap, 0)
      const shift = ((performance.now() / 1000) * LOGO_SPEED * rowH) % track
      const span = (Math.hypot(W, H) / cam.zoom) * 1.2
      const m = ctx.getTransform()
      const fadeIn = easeInOutCubic(clamp01((slid - 0.35) / 0.5))

      let x = cam.fx - span - ((cam.fx - span + shift) % track + track) % track
      for (let i = 0; x < cam.fx + span; i = (i + 1) % sizes.length) {
        const w = sizes[i]
        // Fade by screen position: in after the "7", out at the right edge
        const sx = m.transformPoint(new DOMPoint(x + w / 2, cy)).x / canvas.width
        // Enter straight from the right edge; fade out as they reach the "8" on the left
        const edge = clamp01((sx - LATERAL_PEEK - 0.04) / 0.1) * clamp01((1 - sx) / 0.02)
        const a = 0.55 * edge * fadeIn
        if (a > 0.01) {
          ctx.globalAlpha = a
          ctx.drawImage(logoSprites.current[i].img, x, cy - h / 2, w, h)
        }
        x += w + gap
      }

      ctx.globalAlpha = 1
    }

    // Captions: word-by-word masked slide in, slide out upwards, riding the camera
    {
      const { s, ox, oy } = layout()
      const slots = isPortrait(W, H) ? CAPTION_SLOTS_PORTRAIT : CAPTION_SLOTS
      slots.forEach((slot, ci) => {
        const lines = captionsRef.current[ci]
        const [tin, tout] = slot.show
        if (!lines || p < tin || p > tout) return
        const size = slot.size * s
        const lh = size * 1.05
        ctx.font = `700 ${size}px ${CAPTION_FONT}`
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#fff'
        lines.forEach((line, li) => {
          const words = line.split(' ')
          const space = ctx.measureText(' ').width
          const widths = words.map((w) => ctx.measureText(w).width)
          const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1)
          let x = ox + slot.x * s - (slot.align === 'right' ? total : slot.align === 'center' ? total / 2 : 0)
          const y = oy + slot.y * s + li * lh
          words.forEach((word, wi) => {
            const lag = li * CAPTION_LINE_LAG + wi * CAPTION_WORD_LAG
            const enter = easeOutExpo(clamp01((p - tin - lag) / CAPTION_IN))
            const leave = easeInOutCubic(clamp01((p - (tout - CAPTION_IN - 0.02) - lag) / CAPTION_IN))
            const dy = (1 - enter) * lh - leave * lh
            if (enter > 0 && leave < 1) {
              ctx.save()
              ctx.beginPath()
              ctx.rect(x - size * 0.1, y - size * 0.08, widths[wi] + size * 0.2, lh + size * 0.1)
              ctx.clip()
              ctx.fillText(word, x, y + dy)
              ctx.restore()
            }
            x += widths[wi] + space
          })
        })
      })
    }

    // Drag & drop beat (screen space)
    const dropStart = drop.current.start
    if (dropStart !== null) {
      const t = (performance.now() - dropStart) / 1000
      if (t <= DROP_TOTAL) {
        const { s, ox, oy } = layout()
        const m = ctx.getTransform()
        const target = isPortrait(W, H) ? DROP_TARGET_PORTRAIT : DROP_TARGET
        const hit = m.transformPoint(new DOMPoint(ox + target.x * s, oy + target.y * s))
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalAlpha = 1
        drawDropScene(
          ctx, t, { x: hit.x / dpr, y: hit.y / dpr }, cam.rot, { w: W, h: H },
          effectLabelRef.current, `600 15px ${CAPTION_FONT}`, dpr,
        )
        ctx.restore()
      }
    }

    // Glow, flaring briefly each time a formation locks in
    const flare = FLASHES.reduce((m, [at, amt]) => Math.max(m, amt * Math.exp(-(((p - at) / 0.022) ** 2))), 0)
    wrap.style.filter =
      `drop-shadow(0 0 ${4 + flare * 10}px rgba(255,255,255,${0.35 + flare * 0.45})) ` +
      `drop-shadow(0 0 ${18 + flare * 40}px rgba(255,255,255,${0.12 + flare * 0.3}))`
  }, [progress, captureEyes, cameraAt, layout, piecesAt, gridAt, reduceMotion])

  useMotionValueEvent(progress, 'change', draw)


  useEffect(() => pan?.on('change', () => draw()), [pan, draw])
  useEffect(() => down?.on('change', () => draw()), [down, draw])



  // Redraw once Geist is ready, and when the captions change (language switch)
  useEffect(() => {
    document.fonts?.load(`700 20px ${CAPTION_FONT}`).then(() => draw()).catch(() => {})
  }, [draw])
  useEffect(() => { draw() }, [captions, draw])

  // Hover echo loop: eases in/out and keeps the flash travelling while hovered
  const drawRef = useRef(draw)
  drawRef.current = draw
  const hitRef = useRef(hitLogo)
  hitRef.current = hitLogo
  const hitPieceRef = useRef(hitPiece)
  hitPieceRef.current = hitPiece
  const toWorldRef = useRef(toWorld)
  toWorldRef.current = toWorld
  useEffect(() => {
    const onMove = (ev: PointerEvent) => { pointer.current = { x: ev.clientX, y: ev.clientY } }
    const onLeave = () => { pointer.current = null }
    // A finger has no hover: once it lifts, release whatever it was pressing
    const onUp = (ev: PointerEvent) => { if (ev.pointerType !== 'mouse') pointer.current = null }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)


    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = progress.get()
      const echoZone = (p > PAN[1] - 0.015 && p < FINAL[0] + 0.015) || p > FINAL[1] - 0.025
      const ptr = pointer.current
      const hovered = echoZone && ptr ? hitRef.current(ptr.x, ptr.y) : -1
      const e = echo.current

      // Drag & drop beat: starts on reaching the "8"; resets if the user scrolls back before it
      const d = drop.current
      if (p < PAN[0]) { d.start = null; d.on = false }
      else if (d.start === null && p >= DROP_AT) {
        d.start = now
        if (reduceMotionRef.current) { d.start = now - DROP_TOTAL * 1000; d.on = true }
      }
      if (d.start !== null && !d.on && now - d.start >= DROP_IMPACT * 1000) {
        d.on = true
        e.kickVel += 14 // the landing thump
      }
      const dropRunning = d.start !== null && now - d.start <= DROP_TOTAL * 1000

      const echoAlive = e.amt.some((a, g) => Math.abs(a) > 0.001 || Math.abs(e.vel[g]) > 0.01)
      if (hovered >= 0 || d.on || echoAlive || Math.abs(e.kick) > 0.001 || dropRunning) {
        // Trail growth springs
        e.amt.forEach((a, g) => {
          const target = g === hovered || (d.on && CA_GLYPHS.includes(g)) ? 1 : 0
          e.vel[g] += (ECHO_GROW_SPRING.k * (target - a) - ECHO_GROW_SPRING.c * e.vel[g]) * dt
          e.amt[g] = a + e.vel[g] * dt
          if (!target && Math.abs(e.amt[g]) < 0.001 && Math.abs(e.vel[g]) < 0.01) { e.amt[g] = 0; e.vel[g] = 0 }
        })
        // Heartbeat: two thumps per beat, each kicking the jiggle spring
        if (hovered >= 0 || d.on) {
          const before = e.beat
          e.beat = (e.beat + dt) % ECHO_BEAT_PERIOD
          const wrapped = e.beat < before
          const crossedGap = before < ECHO_BEAT_GAP && e.beat >= ECHO_BEAT_GAP
          if (wrapped) e.kickVel += 9
          if (crossedGap) e.kickVel -= 6
        }
        e.phase = hovered >= 0 || d.on || echoAlive ? e.beat / ECHO_BEAT_TRAVEL : -1
        e.kickVel += (-ECHO_KICK_SPRING.k * e.kick - ECHO_KICK_SPRING.c * e.kickVel) * dt
        e.kick += e.kickVel * dt
        drawRef.current()
      }

      // Push on hover: the module under the cursor tilts back towards it
      const canPush = p > MORPH_HANDOFF && p < SETTLED
      const under = canPush && ptr ? hitPieceRef.current(ptr.x, ptr.y) : -1
      const w = under >= 0 && ptr ? toWorldRef.current(ptr.x, ptr.y) : null
      const piece = lastPieces.current[under]
      if (w && piece) {
        const { q } = piece
        const cx = (q[0] + q[2] + q[4] + q[6]) / 4
        const cy = (q[1] + q[3] + q[5] + q[7]) / 4
        const half = Math.max(Math.abs(q[2] - q[0]), Math.abs(q[5] - q[1])) / 2 || 1
        const press = presses.current.get(under) ?? { amt: 0, vel: 0, target: 1, ox: 0, oy: 0 }
        press.target = 1
        press.ox = (w.x - cx) / half
        press.oy = (w.y - cy) / half
        presses.current.set(under, press)
      }
      presses.current.forEach((pr, i) => { if (i !== under) pr.target = 0 })

      // Logos marquee runs on time while the lateral scene is visible
      if ((panRef.current?.get() ?? 0) > 0.001) drawRef.current()

      // Push springs (underdamped → a little wobble on release)
      if (presses.current.size) {
        presses.current.forEach((pr, i) => {
          const acc = PUSH_SPRING.k * (pr.target - pr.amt) - PUSH_SPRING.c * pr.vel
          pr.vel += acc * dt
          pr.amt += pr.vel * dt
          if (!pr.target && Math.abs(pr.amt) < 0.001 && Math.abs(pr.vel) < 0.01) presses.current.delete(i)
        })
        drawRef.current()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [progress])

  // Keep the canvas matched to the card (HiDPI)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // Phones: 1.5× is visually identical on this art and saves a lot of fill-rate
      const coarse = window.matchMedia('(pointer: coarse)').matches
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2)
      size.current = { w: width, h: height, dpr }
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const off = echoCanvas.current ?? (echoCanvas.current = document.createElement('canvas'))
      off.width = Math.max(1, Math.round(width / 2))
      off.height = Math.max(1, Math.round(height / 2))
      fx.current?.resize(width, height, dpr)
      draw()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  // White silhouettes of the client logos (drawn on the canvas, inside the grid)
  useEffect(() => {
    let cancelled = false
    Promise.all(
      CLIENT_LOGOS.map(
        ({ src }) =>
          new Promise<{ img: HTMLCanvasElement; aspect: number }>((resolve, reject) => {
            const image = new Image()
            image.onload = () => {
              const c = document.createElement('canvas')
              c.width = image.naturalWidth
              c.height = image.naturalHeight
              const g = c.getContext('2d')!
              g.drawImage(image, 0, 0)
              g.globalCompositeOperation = 'source-in'
              g.fillStyle = '#fff'
              g.fillRect(0, 0, c.width, c.height)
              resolve({ img: c, aspect: image.naturalWidth / image.naturalHeight })
            }
            image.onerror = reject
            image.src = src
          }),
      ),
    ).then((sprites) => { if (!cancelled) logoSprites.current = sprites }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // three.js echo lives in its own chunk, fetched after first paint
  useEffect(() => {
    let cancelled = false
    import('./echoFx').then(({ createEchoFx }) => {
      const canvas = fxCanvasRef.current
      const mask = echoCanvas.current ?? (echoCanvas.current = document.createElement('canvas'))
      if (cancelled || !canvas) return
      const effect = createEchoFx(canvas, mask)
      const { w, h, dpr } = size.current
      if (w) effect.resize(w, h, dpr)
      fx.current = effect
    })
    return () => {
      cancelled = true
      fx.current?.dispose()
      fx.current = null
    }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity: 0 }}>
      {/* Echo sits behind the scene so the glyphs and the grid stay on top */}
      <canvas ref={fxCanvasRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
