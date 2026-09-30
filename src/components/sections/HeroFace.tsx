import { motion, useSpring, useTransform, useMotionValue, useReducedMotion, animate, MotionValue } from 'framer-motion'
import { RefObject, useEffect, useRef, useState } from 'react'
import { MORPH_HANDOFF } from './LogoMorph'

const EYE_SPRING = { stiffness: 80, damping: 15, mass: 0.8 }
const JAW_SPRING = { stiffness: 700, damping: 16 }
const MOOD_SPRING = { type: 'spring', stiffness: 170, damping: 18, mass: 0.9 } as const
const VOWELS = /[aeiouáéíóúAEIOUÁÉÍÓÚ]/

const EYE_CLASS = 'block bg-white w-[clamp(18px,2.6vw,40px)] h-[clamp(58px,8.2vw,124px)]'

// ── Expressions ─────────────────────────────────────────────────
// Eyes and mouth are always rectangles: they only change size and position,
// never curve or rotate. Mouth units are em (relative to the mouth font size).
type Eye = { scaleY: number; y: number }
type Mouth = { w: number; h: number; x: number; y: number }
type Mood = {
  left: Eye
  right: Eye
  mouth: Mouth
  /** Fixed gaze (-1..1) that overrides the mouse, e.g. looking up while thinking */
  gaze?: { x: number; y: number }
}

const eye = (scaleY = 1, y = 0): Eye => ({ scaleY, y })
const mouth = (w: number, h = 0.14, x = 0, y = 0): Mouth => ({ w, h, x, y })

const MOODS = {
  neutral:   { left: eye(),        right: eye(),         mouth: mouth(2.2) },
  tender:    { left: eye(0.4, -4), right: eye(0.4, -4),  mouth: mouth(1.1, 0.14, 0, -0.15), gaze: { x: 0, y: 0.15 } },
  thinking:  { left: eye(0.82),    right: eye(0.82),     mouth: mouth(0.8, 0.14, 0.7),        gaze: { x: 0.75, y: -0.85 } },
  pondering: { left: eye(0.7, 4),  right: eye(0.7, 4),   mouth: mouth(1.2, 0.14, -0.5),       gaze: { x: -0.7, y: 0.5 } },
  surprised: { left: eye(1.18),    right: eye(1.18),     mouth: mouth(0.6, 0.6, 0, -0.2) },
  skeptical: { left: eye(),        right: eye(0.5, 6),   mouth: mouth(1.4, 0.14, 0.4) },
  smirk:     { left: eye(0.85),    right: eye(0.85),     mouth: mouth(1, 0.14, 0.6) },
  sleepy:    { left: eye(0.28, 10), right: eye(0.28, 10), mouth: mouth(0.7), gaze: { x: 0, y: 0.3 } },
  puppy:     { left: eye(1.05),    right: eye(1.05),     mouth: mouth(0.45, 0.3), gaze: { x: 0, y: 0.45 } },
} satisfies Record<string, Mood>

type MoodName = keyof typeof MOODS
const IDLE_MOODS: MoodName[] = ['tender', 'thinking', 'pondering', 'surprised', 'skeptical', 'smirk', 'sleepy', 'puppy']
const TALK_MOODS: MoodName[] = ['neutral', 'neutral', 'tender']

const pick = <T,>(list: T[], avoid?: T) => {
  const pool = list.filter((m) => m !== avoid)
  return pool[Math.floor(Math.random() * pool.length)]
}

interface HeroFaceProps {
  phrases: string[]
  /** Scroll progress of the logo morph: the face hands its eyes over to the canvas */
  morph?: MotionValue<number>
  /** Receives the two eye elements so the morph can start exactly from them */
  eyesRef?: RefObject<(HTMLElement | null)[]>
}

export default function HeroFace({ phrases, morph, eyesRef }: HeroFaceProps) {
  const reduceMotion = useReducedMotion()
  const noMorph = useMotionValue(0)
  const morphProgress = morph ?? noMorph
  const eyesOpacity  = useTransform(morphProgress, (v) => (v > MORPH_HANDOFF ? 0 : 1))
  const mouthOpacity = useTransform(morphProgress, [0, 0.03], [1, 0])
  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  // Pupil offsets (each eye aims on its own → natural convergence)
  const lx = useSpring(0, EYE_SPRING)
  const ly = useSpring(0, EYE_SPRING)
  const rx = useSpring(0, EYE_SPRING)
  const ry = useSpring(0, EYE_SPRING)
  // The whole head follows a fraction of the gaze
  const headX = useTransform([lx, rx], ([a, b]: number[]) => (a + b) * 0.16)
  const headY = useTransform([ly, ry], ([a, b]: number[]) => (a + b) * 0.16)

  const lid = useMotionValue(1)
  const jaw = useSpring(1, JAW_SPRING)

  const [text, setText] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [moodName, setMoodName] = useState<MoodName>('neutral')
  const mood: Mood = MOODS[moodName]

  // Shared between the gaze effect and the mood effect
  const pointer   = useRef<{ x: number; y: number } | null>(null)
  const gazeFixed = useRef(false)
  const lookRef   = useRef<(px: number, py: number) => void>(() => {})

  const maxGaze = () => {
    const maxX = Math.min(34, Math.max(12, window.innerWidth * 0.022))
    return { maxX, maxY: maxX * 0.75 }
  }

  // ── Gaze ──────────────────────────────────────────────────────
  useEffect(() => {
    const eyes = [
      { ref: leftRef,  x: lx, y: ly },
      { ref: rightRef, x: rx, y: ry },
    ]

    const look = (px: number, py: number) => {
      const vw = window.innerWidth
      const { maxX, maxY } = maxGaze()
      for (const { ref, x, y } of eyes) {
        const r = ref.current?.getBoundingClientRect()
        if (!r) continue
        const dx = px - (r.left + r.width / 2)
        const dy = py - (r.top + r.height / 2)
        const d = Math.hypot(dx, dy)
        if (d === 0) { x.set(0); y.set(0); continue }
        // Smooth saturation: close cursor → small move, far cursor → approaches max
        const reach = d / (d + vw * 0.18)
        x.set((dx / d) * reach * maxX)
        y.set((dy / d) * reach * maxY)
      }
    }
    lookRef.current = look

    let lastMove = 0
    const onMove = (e: PointerEvent) => {
      lastMove = performance.now()
      pointer.current = { x: e.clientX, y: e.clientY }
      if (!gazeFixed.current) look(e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // Idle / touch: eyes wander around on their own
    let wanderTimer: ReturnType<typeof setTimeout>
    const wander = () => {
      wanderTimer = setTimeout(() => {
        if (!gazeFixed.current && performance.now() - lastMove > 4000) {
          const w = window.innerWidth
          const h = window.innerHeight
          const p = Math.random() < 0.3
            ? { x: w / 2, y: h / 2 }
            : { x: w * (0.1 + Math.random() * 0.8), y: h * (0.1 + Math.random() * 0.8) }
          pointer.current = p
          look(p.x, p.y)
        }
        wander()
      }, 1400 + Math.random() * 2000)
    }
    wander()

    return () => {
      window.removeEventListener('pointermove', onMove)
      clearTimeout(wanderTimer)
    }
  }, [lx, ly, rx, ry])

  // Mood gaze override (thinking looks up, puppy looks down…) → back to the mouse after
  useEffect(() => {
    if (mood.gaze) {
      gazeFixed.current = true
      const { maxX, maxY } = maxGaze()
      lx.set(mood.gaze.x * maxX); rx.set(mood.gaze.x * maxX)
      ly.set(mood.gaze.y * maxY); ry.set(mood.gaze.y * maxY)
    } else {
      gazeFixed.current = false
      if (pointer.current) lookRef.current(pointer.current.x, pointer.current.y)
      else { lx.set(0); rx.set(0); ly.set(0); ry.set(0) }
    }
  }, [mood, lx, ly, rx, ry])

  // ── Blink ─────────────────────────────────────────────────────
  useEffect(() => {
    if (reduceMotion) return
    let blinkTimer: ReturnType<typeof setTimeout>
    let doubleTimer: ReturnType<typeof setTimeout>
    const blink = () => animate(lid, [1, 0.05, 1], { duration: 0.2, times: [0, 0.45, 1], ease: 'easeInOut' })
    const loop = () => {
      blinkTimer = setTimeout(() => {
        blink()
        if (Math.random() < 0.2) doubleTimer = setTimeout(blink, 260)
        loop()
      }, 2200 + Math.random() * 3800)
    }
    loop()
    return () => {
      clearTimeout(blinkTimer)
      clearTimeout(doubleTimer)
    }
  }, [lid, reduceMotion])

  // ── Behaviour loop: speak → a few expressions → rest → speak… ─
  useEffect(() => {
    if (reduceMotion) {
      setMoodName('neutral')
      setText(phrases[0] ?? '')
      return
    }
    let alive = true
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

    ;(async () => {
      setText('')
      setMoodName('neutral')
      await wait(900)
      let last: MoodName = 'neutral'

      for (let i = 0; alive; i++) {
        const phrase = phrases[i % phrases.length]

        // Speak: type left→right; centered text grows both ways
        setMoodName(pick(TALK_MOODS))
        await wait(350)
        setSpeaking(true)
        for (let c = 1; c <= phrase.length && alive; c++) {
          const ch = phrase[c - 1]
          setText(phrase.slice(0, c))
          jaw.set(VOWELS.test(ch) ? 1.16 : ch === ' ' ? 0.88 : 1.03)
          await wait(ch === ',' ? 220 : /[.!?]/.test(ch) ? 320 : 38 + Math.random() * 34)
        }
        jaw.set(1)
        setSpeaking(false)
        await wait(2400)

        // Close mouth: erase from both ends towards the center
        let s = phrase
        while (alive && s.length > 0) {
          s = s.slice(1, -1)
          setText(s)
          await wait(16)
        }

        // Silent stretch: a few faces, sometimes resting in between
        await wait(900 + Math.random() * 900)
        const faces = 2 + Math.floor(Math.random() * 3)
        for (let k = 0; k < faces && alive; k++) {
          last = pick(IDLE_MOODS, last)
          setMoodName(last)
          await wait(1800 + Math.random() * 2200)
          if (Math.random() < 0.4) {
            setMoodName('neutral')
            await wait(1200 + Math.random() * 1800)
          }
        }

        // Often "think" right before the next line
        if (alive && Math.random() < 0.5) {
          setMoodName('thinking')
          await wait(1600 + Math.random() * 1000)
        }
        setMoodName('neutral')
        await wait(1000 + Math.random() * 1500)
      }
    })()

    return () => { alive = false }
  }, [phrases, jaw, reduceMotion])

  const closed = text.length === 0

  return (
    <motion.div className="relative flex flex-col items-center" style={{ x: headX, y: headY }}>
      {/* Eyes: gaze (x/y) → expression (shape/tilt) → blink (lid) */}
      <motion.div className="flex gap-[clamp(40px,6.2vw,100px)]" style={{ opacity: eyesOpacity }}>
        {([[leftRef, lx, ly, mood.left], [rightRef, rx, ry, mood.right]] as const).map(([ref, x, y, shape], i) => (
          <div key={i} ref={ref}>
            <motion.div style={{ x, y }}>
              <motion.div
                style={{ transformOrigin: 'center 65%' }}
                animate={{ scaleY: shape.scaleY, y: shape.y }}
                transition={MOOD_SPRING}
              >
                <motion.span
                  ref={(el) => { if (eyesRef?.current) eyesRef.current[i] = el }}
                  className={EYE_CLASS}
                  style={{ scaleY: lid }}
                />
              </motion.div>
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* Mouth — absolutely positioned so its growth never shifts the eyes */}
      <motion.div
        aria-hidden
        style={{ opacity: mouthOpacity }}
        className="absolute top-full mt-[clamp(40px,6vw,88px)] left-1/2 -translate-x-1/2 w-[min(88vw,900px)] flex justify-center text-[clamp(1.15rem,2.6vw,2.25rem)]"
      >
        {/* Closed mouth: a rectangle that only resizes / shifts */}
        <motion.span
          className="absolute top-[0.5em] bg-white"
          initial={false}
          animate={{
            width: `${mood.mouth.w}em`,
            height: `${mood.mouth.h}em`,
            x: `${mood.mouth.x}em`,
            y: `${mood.mouth.y - mood.mouth.h / 2}em`,
            opacity: closed ? 1 : 0,
            scaleX: closed ? 1 : 0,
          }}
          transition={MOOD_SPRING}
        />

        {/* Open mouth: the text itself */}
        <motion.p
          className="text-white text-center font-medium tracking-[-0.02em] leading-[1.2] min-h-[1.2em]"
          style={{ scaleY: jaw, transformOrigin: 'center top' }}
        >
          {text}
          {!closed && (
            <span
              className={`inline-block align-[-0.12em] ml-[0.12em] w-[0.4em] h-[0.95em] bg-white ${speaking ? '' : 'animate-pulse'}`}
            />
          )}
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
