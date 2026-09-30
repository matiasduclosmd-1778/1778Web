import { AnimatePresence, motion, MotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { PAN_FRAC, WORKS_DROP } from './LogoMorph'
import { CLIENT_LOGOS } from '@/data/clients'

// The scene the camera slides into after the hero's closing frame:
// "Desarrollamos …" with a word that flips like a calendar (the client logos pass in the grid below).


const FLIP_EVERY_MS = 700
// Calendar-style flip upwards: the old word tips back and up, the new one rolls in from below
const flip = {
  initial: { y: '70%', rotateX: -90, opacity: 0 },
  animate: { y: '0%', rotateX: 0, opacity: 1 },
  exit: { y: '-70%', rotateX: 90, opacity: 0 },
  transition: { duration: 0.34, ease: [0.3, 0.9, 0.35, 1] as number[] },
}

interface LateralSceneProps {
  /** 0 → 1 camera slide (the scene enters from the right with it) */
  pan: MotionValue<number>
  /** 0 → 1 camera travel down to Works (the scene leaves upwards with it) */
  down: MotionValue<number>
}

export default function LateralScene({ pan, down }: LateralSceneProps) {
  const { t } = useLang()
  const { prefix, items } = t.hero.lateral

  // The word after "Desarrollamos" flips every 0.5 s, looping — only while the scene is on screen
  const [visible, setVisible] = useState(false)
  useMotionValueEvent(pan, 'change', (v) => setVisible(v > 0.3))
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % items.length), FLIP_EVERY_MS)
    return () => window.clearInterval(id)
  }, [visible, items.length])

  const x = useTransform(pan, (v) => `${(1 - v) * PAN_FRAC * 100}%`)
  const y = useTransform(down, (v) => `${-v * WORKS_DROP * 100}%`)

  return (
    <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ x, y }}>
      {/* Headline */}
      <h2
        className="absolute left-5 right-5 top-[30%] md:top-[33%] text-center text-white leading-[1.15] tracking-[-0.01em] text-[clamp(1.6rem,3.4vw,3.4rem)]"
        style={{ fontFamily: '"Geist", sans-serif', fontWeight: 700 }}
      >
        <span className="sr-only">{items.map((item) => `${prefix} ${item}.`).join(' ')}</span>
        <span aria-hidden className="inline-flex items-baseline whitespace-nowrap">
          {prefix}&nbsp;
          {/* Sized by the longest word so the centred line never shifts as words change */}
          <span className="inline-grid text-left overflow-hidden pb-[0.14em] -mb-[0.14em]" style={{ perspective: 600 }}>
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
      </h2>

      {/* Logos are drawn inside the grid by LogoMorph; this list is for assistive tech */}
      <ul className="sr-only" aria-label={t.clientes.label}>
        {CLIENT_LOGOS.map((logo) => <li key={logo.name}>{logo.name}</li>)}
      </ul>
    </motion.div>
  )
}
