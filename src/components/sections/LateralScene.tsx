import { AnimatePresence, motion, MotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLang } from '@/contexts/LangContext'
import { PAN_FRAC, WORKS_DROP, lateralGrid } from './LogoMorph'
import { CLIENT_LOGOS } from '@/data/clients'
import { LiquidText } from '@/components/ui'

// The scene the camera slides into after the hero's closing frame:
// "Desarrollamos …" with a word that flips like a calendar, the services grid on the right,
// and the client logos passing in the canvas grid below.


const FLIP_EVERY_MS = 700
// Calendar-style flip upwards: the old word tips back and up, the new one rolls in from below
const flip = {
  initial: { y: '70%', rotateX: -90, opacity: 0 },
  animate: { y: '0%', rotateX: 0, opacity: 1 },
  exit: { y: '-70%', rotateX: 90, opacity: 0 },
  transition: { duration: 0.34, ease: [0.3, 0.9, 0.35, 1] as number[] },
}

const FONT = { fontFamily: '"Geist", sans-serif', fontWeight: 700 }
const LINE = 'rgba(255,255,255,0.3)'
// Services grid: two canvas modules tall, one row per half module, sitting right on the logos row
const SERVICES_MODULES = 2
const EASE_WIPE = [0.7, 0, 0.2, 1] as const

/**
 * One service row. Hovering floods it white from the edge the cursor came in through, the label
 * turns black and slides in a touch; leaving drains it out through the edge the cursor leaves by.
 */
function ServiceRow({ label, show, delay }: { label: string; show: boolean; delay: number }) {
  const [on, setOn] = useState(false)
  const [from, setFrom] = useState<'top' | 'bottom'>('bottom')
  const edge = (e: ReactPointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientY < r.top + r.height / 2 ? 'top' : 'bottom'
  }

  return (
    <li
      className="relative flex-1 flex items-center justify-end overflow-hidden border-b"
      style={{ borderColor: LINE }}
      onPointerEnter={(e) => { setFrom(edge(e)); setOn(true) }}
      onPointerLeave={(e) => { setFrom(edge(e)); setOn(false) }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-white"
        style={{ originY: from === 'top' ? 0 : 1 }}
        initial={false}
        animate={{ scaleY: on ? 1 : 0 }}
        transition={{ duration: 0.55, ease: EASE_WIPE }}
      />
      <motion.span
        className="relative pr-3 md:pr-4 uppercase leading-none tracking-[-0.01em] text-[clamp(0.85rem,2vw,1.9rem)] whitespace-nowrap"
        style={FONT}
        initial={false}
        animate={{ color: on ? '#000000' : '#ffffff', x: on ? -10 : 0 }}
        transition={{ duration: 0.45, ease: EASE_WIPE, delay: on ? 0.08 : 0 }}
      >
        <LiquidText show={show} delay={delay}>{label}</LiquidText>
      </motion.span>
    </li>
  )
}

interface LateralSceneProps {
  /** 0 → 1 camera slide (the scene enters from the right with it) */
  pan: MotionValue<number>
  /** 0 → 1 camera travel down to Works (the scene leaves upwards with it) */
  down: MotionValue<number>
}

export default function LateralScene({ pan, down }: LateralSceneProps) {
  const { t } = useLang()
  const { prefix, items, services } = t.hero.lateral

  // The word after "Desarrollamos" flips every 0.5 s, looping — only while the scene is on screen
  // (and stops once the camera has come down onto Works)
  const [visible, setVisible] = useState(false)
  const syncVisible = () => setVisible(pan.get() > 0.3 && down.get() < 0.9)
  useMotionValueEvent(pan, 'change', syncVisible)
  useMotionValueEvent(down, 'change', syncVisible)
  // Headline and services write themselves in liquid ink as the camera settles on the screen
  const [inkShow, setInkShow] = useState(false)
  useMotionValueEvent(pan, 'change', (v) => setInkShow(v > 0.6))
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % items.length), FLIP_EVERY_MS)
    return () => window.clearInterval(id)
  }, [visible, items.length])

  const x = useTransform(pan, (v) => `${(1 - v) * PAN_FRAC * 100}%`)
  const y = useTransform(down, (v) => `${-v * WORKS_DROP * 100}%`)
  // The grid only takes the pointer once the camera has settled on this screen
  const gridEvents = useTransform([pan, down], ([p, d]: number[]) => (p > 0.95 && d < 0.02 ? 'auto' : 'none'))

  // Card size → where the canvas grid lines fall on this screen
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ W: 0, H: 0 })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ W: e.contentRect.width, H: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const portrait = box.W < box.H * 0.8
  const { module, logosTop } = lateralGrid(box.W || 1, box.H || 1)
  const gridTop = logosTop - module * SERVICES_MODULES

  return (
    <motion.div ref={rootRef} className="absolute inset-0 z-10 pointer-events-none" style={{ x, y }}>
      {/* Headline — desktop: left of the grid, in its top module; phones: centred above it */}
      <h2
        className={`absolute text-white leading-[1.15] tracking-[-0.01em] uppercase flex items-center ${
          portrait
            ? 'left-5 right-5 justify-center text-center text-[clamp(1.35rem,6vw,1.75rem)]'
            : 'left-[20%] right-[36%] text-left text-[clamp(1.2rem,2vw,2.1rem)]'
        }`}
        style={{
          ...FONT,
          ...(portrait ? { bottom: box.H - gridTop + 28 } : { top: gridTop, height: module }),
        }}
      >
        <span className="sr-only">{items.map((item) => `${prefix} ${item}.`).join(' ')}</span>
        {/* Phones: the flipping word gets its own line so the longest one still fits */}
        <LiquidText show={inkShow}>
        <span aria-hidden className={`inline-flex whitespace-nowrap ${portrait ? 'flex-col items-center' : 'flex-row items-baseline'}`}>
          <span>{prefix}{!portrait && <>&nbsp;</>}</span>
          {/* Sized by the longest word so the line never shifts as words change */}
          <span className={`inline-grid overflow-hidden pb-[0.14em] -mb-[0.14em] ${portrait ? 'text-center' : 'text-left'}`} style={{ perspective: 600 }}>
            {items.map((item) => (
              <span key={item} className="invisible [grid-area:1/1]">{item}</span>
            ))}
            <AnimatePresence initial={false}>
              <motion.span
                key={`${step}-${items[step]}`}
                className="[grid-area:1/1] block"
                style={{ transformOrigin: '50% 50% -0.3em', backfaceVisibility: 'hidden' }}
                {...flip}
              >
                {items[step % items.length]}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        </LiquidText>
      </h2>

      {/* Services grid, on the canvas module lines right above the logos row */}
      <motion.ul
        className={`absolute right-0 flex flex-col border-l ${portrait ? 'left-[30%]' : 'left-[66%]'}`}
        style={{ top: gridTop, height: module * SERVICES_MODULES, borderColor: LINE, pointerEvents: gridEvents }}
      >
        {services.map((s, i) => <ServiceRow key={s} label={s} show={inkShow} delay={0.25 + i * 0.1} />)}
      </motion.ul>

      {/* Logos are drawn inside the grid by LogoMorph; this list is for assistive tech */}
      <ul className="sr-only" aria-label={t.clientes.label}>
        {CLIENT_LOGOS.map((logo) => <li key={logo.name}>{logo.name}</li>)}
      </ul>
    </motion.div>
  )
}
