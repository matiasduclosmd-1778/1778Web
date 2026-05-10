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
