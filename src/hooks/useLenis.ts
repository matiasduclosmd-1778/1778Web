import { useEffect } from 'react'
import Lenis from 'lenis'

// Instancia compartida — accesible desde cualquier componente
let _lenis: Lenis | null = null
// True while the page is being carried by code (nav links, glides): scroll magnets stay quiet
let _auto = false

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
// Slow start, long soft landing — reads as a camera move rather than a jump
const easeCinematic = (t: number) => (t < 0.35 ? 0.35 * easeInOutCubic(t / 0.35) : 0.35 + 0.65 * easeOutQuart((t - 0.35) / 0.65))

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isAutoScrolling = () => _auto
/** The user can't move the page right now (a hold or a programmatic glide is running) */
export const isScrollLocked = () => _auto || !!_lenis?.isStopped

function resolveY(target: string | number) {
  if (typeof target === 'number') return target
  const el = document.querySelector<HTMLElement>(target)
  return el ? el.getBoundingClientRect().top + window.scrollY : null
}

/** Smooth scroll to a selector / y. With no duration, it scales with the distance travelled. */
export function scrollTo(target: string | number, duration?: number) {
  const lenis = _lenis
  const y = resolveY(target)
  if (y === null) return
  if (!lenis || reducedMotion()) {
    window.scrollTo(0, y)
    return
  }
  const screens = Math.abs(y - window.scrollY) / window.innerHeight
  _auto = true
  lenis.scrollTo(y, {
    duration: duration ?? Math.min(3.2, 1.1 + Math.sqrt(screens) * 0.55),
    easing: easeCinematic,
    force: true,
    onComplete: () => { _auto = false },
  })
}

/** Move the page to `y` at once (no animation) — for jumps nothing on screen should show */
export function jumpTo(y: number) {
  if (_lenis) _lenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo(0, y)
}

/**
 * Ease the page onto `y`, wait `ms`, then glide on its own to `to` (user input is ignored until
 * it arrives) — used to carry the camera to the next frame.
 */
export function holdThenGlide(y: number, ms: number, to: number, duration = 3) {
  const lenis = _lenis
  if (!lenis || _auto || reducedMotion()) return
  _auto = true
  lenis.stop()
  lenis.scrollTo(y, { duration: 0.5, easing: easeOutQuart, force: true })
  window.setTimeout(() => {
    lenis.start()
    lenis.scrollTo(to, {
      duration,
      lock: true,
      force: true,
      // Gentle on both ends and never steep in the middle: the camera move itself stays unhurried
      easing: easeInOutSine,
      onComplete: () => { _auto = false },
    })
  }, ms)
}

export function useLenis() {
  useEffect(() => {
    if (reducedMotion()) return

    const lenis = new Lenis({
      // Frame-rate independent inertia: soft, weighty wheel scrolling on desktop.
      // Touch keeps the native (iOS / Android) momentum — the scenes smooth it on their own.
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      infinite: false,
    })

    _lenis = lenis
    // A user gesture always wins over an unfinished programmatic scroll
    const release = () => { if (!lenis.isStopped) _auto = false }
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', release, { passive: true })

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', release)
      lenis.destroy()
      _lenis = null
      _auto = false
    }
  }, [])
}
