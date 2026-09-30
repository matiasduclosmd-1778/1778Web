import { useEffect } from 'react'
import Lenis from 'lenis'

// Instancia compartida — accesible desde cualquier componente
let _lenis: Lenis | null = null

export function scrollTo(target: string | number, duration = 1.2) {
  _lenis?.scrollTo(target as string, {
    duration,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  })
}

/**
 * Park the page at `y` and ignore scrolling for `ms` — kills the momentum so the
 * user has to scroll again to move on.
 */
export function holdScroll(y: number, ms: number) {
  const lenis = _lenis
  if (!lenis) return
  lenis.scrollTo(y, { immediate: true, force: true })
  lenis.stop()
  window.setTimeout(() => lenis.start(), ms)
}

/**
 * Park the page at `y`, wait `ms`, then glide on its own to `to` (user input is
 * ignored until it arrives) — used to carry the camera to the next frame.
 */
export function holdThenGlide(y: number, ms: number, to: number, duration = 1.8) {
  const lenis = _lenis
  if (!lenis) return
  lenis.scrollTo(y, { immediate: true, force: true })
  lenis.stop()
  window.setTimeout(() => {
    lenis.start()
    lenis.scrollTo(to, {
      duration,
      lock: true,
      force: true,
      easing: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
    })
  }, ms)
}

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      infinite: false,
    })

    _lenis = lenis

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      _lenis = null
    }
  }, [])
}
