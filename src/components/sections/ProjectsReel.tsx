import { MotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PROJECTS } from '@/data/projects'
import type { Reel } from './projectsGl'

// Works reel: project images slide sideways with the scroll; the ones leaving the centre fold
// back like sheets of paper, and the pointer drags a liquid, heat-coloured trail across the whole
// reel (see projectsGl). The active rect, the title timing and the dots are handled here.

const HOVER_SPRING = { k: 180, c: 20 }
const VEL_FULL = 3        // projects per second that count as full speed (velocity = 1)
const VEL_LERP = 0.1      // per-frame smoothing of the velocity
const GHOST_MAX_PX = 6    // title RGB ghost at full speed
const BEAT_PERIOD = 1.05  // s between heartbeats while hovered
const TITLE_S = 0.3       // title change: fade + slide
const TITLE_SLIDE_PX = 60

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/** Heartbeat: a strong thump and a softer second one ("lub-dub"), 0..1 */
function beat(t: number) {
  const x = t % BEAT_PERIOD
  const thump = (at: number, w: number) => Math.exp(-(((x - at) / w) ** 2))
  return Math.max(thump(0.08, 0.055), 0.6 * thump(0.3, 0.05))
}

/** Active rect for a card of W × H (desktop: centred, ~45% wide; phones: nearly full width) */
function layoutFor(W: number, H: number) {
  const portrait = W < H * 0.8
  const w = portrait ? W * 0.84 : Math.min(W * 0.45, H * 0.44 * 1.6)
  const h = w / 1.6
  const top = portrait ? H * 0.36 : H * 0.34
  return { w, h, top, left: (W - w) / 2, step: w + (portrait ? W * 0.1 : W * 0.06) }
}

/** Name size scales with the card */
const nameSizeFor = (W: number) => Math.min(106, Math.max(34, 0.066 * W))

interface ProjectsReelProps {
  /** Continuous project index (0 … n-1), already smoothed */
  pos: MotionValue<number>
  /** The reel is on screen (the camera has come down onto Works) */
  visible: boolean
  /** Works is coming up: fetch three.js and the project images (nothing loads before this) */
  preload: boolean
  /** Jump to a project (the page scrolls there) */
  onSelect: (index: number) => void
}

export default function ProjectsReel({ pos, visible, preload, onSelect }: ProjectsReelProps) {
  const reduceMotion = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reel = useRef<Reel | null>(null)
  const [box, setBox] = useState({ W: 0, H: 0 })
  const [active, setActive] = useState(0)
  const hover = useRef(PROJECTS.map(() => ({ amt: 0, vel: 0, target: 0, since: 0 })))
  // Pointer over the active rect: the heartbeat always follows the active project
  const inside = useRef(false)
  // Pointer anywhere over the reel (card px) — drives the liquid trail
  const pointer = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  // Title change: the leaving name and the arriving one, and when the swap started
  const title = useRef({ cur: 0, prev: -1, dir: 1, since: 0 })
  const activeRef = useRef(0)
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const inViewRef = useRef(true)

  useMotionValueEvent(pos, 'change', (v) => {
    const next = Math.max(0, Math.min(PROJECTS.length - 1, Math.round(v)))
    const tl = title.current
    if (next !== tl.cur) {
      title.current = { cur: next, prev: tl.cur, dir: next > tl.cur ? 1 : -1, since: performance.now() / 1000 }
      setActive(next)
    }
  })

  // three.js and the images are fetched only once Works is coming up
  useEffect(() => {
    if (!preload) return
    let cancelled = false
    let gui: { destroy: () => void } | null = null
    import('./projectsGl').then(({ createReel, REEL_PARAMS }) => {
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      reel.current = createReel(canvas, PROJECTS.map((p) => p.image))
      const r = rootRef.current?.getBoundingClientRect()
      if (r) reel.current.resize(r.width, r.height, window.devicePixelRatio || 1)
      // The title is drawn on canvas: redraw once Geist is in
      document.fonts?.load('700 100px "Geist"').then(() => reel.current?.invalidateText()).catch(() => {})
      // Tuning panel, development only (never shipped in the build)
      if (import.meta.env.DEV) {
        import('lil-gui').then(({ default: GUI }) => {
          if (cancelled) return
          const g = new GUI({ title: 'Works reel' })
          g.add(REEL_PARAMS, 'uCurlAmount', 0, 5, 0.01)
          g.add(REEL_PARAMS, 'uRadius', 0.2, 3, 0.01)
          g.add(REEL_PARAMS, 'uWave', 0, 0.3, 0.001)
          g.add(REEL_PARAMS, 'uVelocityCurl', 0, 2, 0.01)
          g.add(REEL_PARAMS, 'uRgbShift', 0, 0.03, 0.0005)
          g.add(REEL_PARAMS, 'darkenAmount', 0, 1, 0.01)
          g.add(REEL_PARAMS, 'minScale', 0.6, 1, 0.01)
          g.add(REEL_PARAMS, 'blur', 0, 0.05, 0.001)
          g.add(REEL_PARAMS, 'pulse', 0, 0.1, 0.001)
          g.add(REEL_PARAMS, 'trailRadius', 0.02, 0.25, 0.001)
          g.add(REEL_PARAMS, 'trailDecay', 0.8, 0.995, 0.001)
          g.add(REEL_PARAMS, 'smear', 0, 0.3, 0.001)
          g.add(REEL_PARAMS, 'trailCA', 0, 1, 0.01)
          g.add(REEL_PARAMS, 'heat', 0, 1, 0.01)
          g.close()
          gui = g
        })
      }
    })
    return () => {
      cancelled = true
      gui?.destroy()
      reel.current?.dispose()
      reel.current = null
    }
  }, [preload])

  // Keep the canvas matched to the card
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setBox({ W: width, H: height })
      reel.current?.resize(width, height, window.devicePixelRatio || 1)
    })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])

  // Render loop — paused while the reel is off screen
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let prevPos = pos.get()
    let vel = 0
    let wasOn = false
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const r = reel.current
      if (!r) return
      if (!visibleRef.current || !inViewRef.current) {
        if (wasOn) { r.clear(); wasOn = false }
        last = now
        prevPos = pos.get()
        return
      }
      wasOn = true
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const { W, H } = r.size
      const p = pos.get()
      // Scroll velocity: projects per second → -1..1, smoothed
      const raw = dt > 0 ? (p - prevPos) / dt : 0
      prevPos = p
      const target = reduceMotion ? 0 : Math.max(-1, Math.min(1, raw / VEL_FULL))
      vel += (target - vel) * VEL_LERP
      if (Math.abs(vel) < 1e-4) vel = 0
      hover.current.forEach((hv, i) => {
        const on = inside.current && i === activeRef.current ? 1 : 0
        if (on && !hv.target) hv.since = t
        hv.target = on
        hv.vel += (HOVER_SPRING.k * (hv.target - hv.amt) - HOVER_SPRING.c * hv.vel) * dt
        hv.amt += hv.vel * dt
      })

      // Pointer → uv (y up) and its movement since the last frame
      const pt = pointer.current
      let ptr: { x: number; y: number; vx: number; vy: number } | null = null
      if (pt) {
        ptr = { x: pt.x / W, y: 1 - pt.y / H, vx: (pt.x - pt.px) / W, vy: -(pt.y - pt.py) / H }
        pt.px = pt.x
        pt.py = pt.y
      }

      // Title: the leaving name fades out one way, the new one slides in the scroll direction
      const tl = title.current
      const e = easeOutExpo(Math.min(1, (t - tl.since) / TITLE_S))
      const slide = reduceMotion ? 0 : TITLE_SLIDE_PX
      const titles = [{ text: PROJECTS[tl.cur].name, alpha: e, x: tl.dir * slide * (1 - e) }]
      if (tl.prev >= 0 && e < 1) titles.unshift({ text: PROJECTS[tl.prev].name, alpha: 1 - e, x: -tl.dir * slide * e })
      const l = layoutFor(W, H)
      const nameSize = nameSizeFor(W)

      r.render({
        pos: p,
        cx: 0,
        cy: H / 2 - (l.top + l.h / 2),
        w: l.w,
        h: l.h,
        step: l.step,
        vel,
        hover: hover.current.map((hv) => Math.max(0, hv.amt)),
        // The beat starts on the first thump the moment the pointer arrives
        pulse: hover.current.map((hv) => (hv.target ? beat(t - hv.since) : 0) * Math.max(0, Math.min(1, hv.amt))),
        time: t,
        reduced: reduceMotion,
        titles,
        // The name straddles the image's bottom edge by ~60% of its height
        titleY: l.top + l.h - nameSize * 0.62 + nameSize * 0.5,
        titleSize: nameSize,
        ghost: vel * GHOST_MAX_PX,
        pointer: ptr,
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pos, reduceMotion])

  activeRef.current = active
  const l = layoutFor(box.W || 1, box.H || 1)
  const project = PROJECTS[active]
  const nameSize = nameSizeFor(box.W)
  const go = (i: number) => onSelect(Math.max(0, Math.min(PROJECTS.length - 1, i)))

  const trackPointer = (e: React.PointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const pt = pointer.current
    pointer.current = pt ? { ...pt, x, y } : { x, y, px: x, py: y }
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 outline-none focus-visible:outline-1 focus-visible:outline-white/30 focus-visible:-outline-offset-8"
      tabIndex={visible ? 0 : -1}
      aria-label="Works"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      onPointerMove={trackPointer}
      onPointerDown={trackPointer}
      onPointerLeave={() => { pointer.current = null }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1) }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* The image in front links to the project (a placeholder '#' is just a hover area: following
          it would jump the page back to the top) */}
      {project.url && project.url !== '#' ? (
        <a
          href={project.url}
          target={project.url.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          aria-label={project.name}
          className="absolute"
          style={{ left: l.left, top: l.top, width: l.w, height: l.h }}
          onPointerEnter={() => { inside.current = true }}
          onPointerLeave={() => { inside.current = false }}
        />
      ) : (
        <div
          aria-hidden
          className="absolute"
          style={{ left: l.left, top: l.top, width: l.w, height: l.h }}
          onPointerEnter={() => { inside.current = true }}
          onPointerLeave={() => { inside.current = false }}
        />
      )}

      {/* The name is drawn on the canvas (so the liquid trail can smear it); this is for assistive tech */}
      <h3 className="sr-only" aria-live="polite">{project.name}</h3>

      {/* Dots */}
      <div
        className="absolute left-0 right-0 flex justify-center gap-3"
        style={{ top: l.top + l.h + nameSize * 0.45 + 18 }}
      >
        {PROJECTS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            aria-label={p.name}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => go(i)}
            className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full transition-colors duration-300"
            style={{ background: i === active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
          />
        ))}
      </div>
    </div>
  )
}
