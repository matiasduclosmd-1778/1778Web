import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'

// Liquid ink reveal: the text is uncovered left → right while a goo filter (huge blur + alpha
// threshold) melts it into blobs of ink that tighten into crisp letters. Once settled the filter
// is dropped, so the type renders sharp and costs nothing.
const IN_S = 1.25
const OUT_S = 0.45
const BLUR_PER_EM = 0.9   // starting blur, relative to the font size
const GOO = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8'

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4

interface LiquidTextProps {
  /** Plays in when it turns true, dissolves back out when it turns false */
  show: boolean
  children: ReactNode
  /** Seconds before playing in (stagger lines / items) */
  delay?: number
  className?: string
  style?: CSSProperties
  /** Full-width block instead of an inline box (for content that sizes to its container) */
  block?: boolean
}

export default function LiquidText({ show, children, delay = 0, className = '', style, block = false }: LiquidTextProps) {
  const reduceMotion = useReducedMotion()
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const wrapRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const blurRef = useRef<SVGFEGaussianBlurElement>(null)
  const progress = useRef(0) // 0 hidden → 1 settled

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    const blur = blurRef.current
    if (!wrap || !inner || !blur) return

    const paint = (t: number) => {
      progress.current = t
      if (t >= 1) {
        wrap.style.filter = 'none'
        inner.style.clipPath = 'none'
        return
      }
      if (t <= 0) {
        // Fully hidden: no filter to pay for
        wrap.style.filter = 'none'
        inner.style.clipPath = 'inset(-50% 100% -50% -5%)'
        return
      }
      const size = parseFloat(getComputedStyle(wrap).fontSize) || 32
      // The reveal edge runs ahead; the ink keeps tightening a little after it
      const reveal = easeOutQuart(Math.min(1, t / 0.7))
      const sharp = easeOutCubic(t)
      blur.setAttribute('stdDeviation', String(size * BLUR_PER_EM * (1 - sharp)))
      wrap.style.filter = `url(#${id})`
      // Generous vertical room so descenders and the blur are never cut
      inner.style.clipPath = `inset(-50% ${(1 - reveal) * 100}% -50% -5%)`
    }

    if (reduceMotion) { paint(show ? 1 : 0); return }
    const from = progress.current
    const to = show ? 1 : 0
    if (from === to) { paint(to); return }
    const controls = animate(from, to, {
      duration: (show ? IN_S : OUT_S) * Math.abs(to - from),
      delay: show ? delay : 0,
      ease: 'linear',
      onUpdate: paint,
    })
    return () => controls.stop()
  }, [show, delay, id, reduceMotion])

  const box = block ? 'block w-full' : 'inline-block'
  return (
    <span ref={wrapRef} className={`relative ${box} ${className}`} style={style}>
      <svg aria-hidden width="0" height="0" className="absolute pointer-events-none">
        <filter id={id} x="-50%" y="-100%" width="200%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="0" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values={GOO} />
        </filter>
      </svg>
      <span ref={innerRef} className={box} style={{ clipPath: 'inset(-50% 100% -50% -5%)' }}>
        {children}
      </span>
    </span>
  )
}
