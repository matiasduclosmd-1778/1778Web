import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { scrollTo, holdThenGlide, isScrollLocked } from '@/hooks/useLenis'
import { LiquidText } from '@/components/ui'
import HeroFace from './HeroFace'
import LogoMorph, { PAN_FRAC, DROP_AT, DROP_IMPACT_MS, WORKS_DROP } from './LogoMorph'
import LateralScene from './LateralScene'
import ProjectsReel from './ProjectsReel'
import { PROJECTS } from '@/data/projects'

// Pinned scroll budget (vh): morph → dwell on the closing frame → lateral scene → down to Works
// → the projects reel (one stop per project)
const MORPH_VH = 370
const DWELL_VH = 50
const LATERAL_VH = 180
const WORKS_VH = 130
const REEL_LEAD_VH = 30                            // settle on Works before the reel starts moving
const REEL_STEP_VH = 70                            // scroll per project
const REEL_TAIL_VH = 60                            // hold on the last project
const REEL_VH = REEL_LEAD_VH + REEL_STEP_VH * (PROJECTS.length - 1) + REEL_TAIL_VH
const PIN_VH = MORPH_VH + DWELL_VH + LATERAL_VH + WORKS_VH + REEL_VH
const MORPH_END = MORPH_VH / PIN_VH                // progress where the closing frame lands
const LATERAL_START = (MORPH_VH + DWELL_VH) / PIN_VH
const WORKS_START = (MORPH_VH + DWELL_VH + LATERAL_VH) / PIN_VH
const WORKS_END = (MORPH_VH + DWELL_VH + LATERAL_VH + WORKS_VH) / PIN_VH
const REEL_START = WORKS_END + REEL_LEAD_VH / PIN_VH
const REEL_END = (PIN_VH - REEL_TAIL_VH) / PIN_VH
const PAN_SHARE = 0.47                             // share of the lateral stretch spent sliding (≈85vh)
const GLIDE_S = 3                                  // after the drop, the camera's own trip to the closing frame

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
// One camera for every scroll-driven beat: critically damped, so it lands softly and never bounces
const CAMERA_SPRING = { stiffness: 80, damping: 22, mass: 0.7, restDelta: 0.00005 }

export default function Hero() {
  const { t } = useLang()

  // Scroll-driven morph: eyes → 4 → 8 → 1778 logo, while the card stays pinned
  const sectionRef = useRef<HTMLElement>(null)
  const eyesRef = useRef<(HTMLElement | null)[]>([])
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  // The morph plays over the first part of the pin; the rest is a dwell on the closing frame
  const morphSource = useTransform(scrollYProgress, [0, MORPH_END], [0, 1], { clamp: true })
  const morph = useSpring(morphSource, CAMERA_SPRING)
  // Lateral stretch: the camera slides right into the next scene
  const lateralSource = useTransform(scrollYProgress, [LATERAL_START, WORKS_START], [0, 1], { clamp: true })
  const lateral = useSpring(lateralSource, CAMERA_SPRING)
  const pan = useTransform(lateral, (v) => easeInOutCubic(Math.min(1, Math.max(0, v / PAN_SHARE))))
  const finalShift = useTransform(pan, (v) => `${-v * PAN_FRAC * 100}%`)
  // Works: the camera moves down, the grid carries on and the title rises in
  const downSource = useTransform(scrollYProgress, [WORKS_START, WORKS_END], [0, 1], { clamp: true })
  const downSpring = useSpring(downSource, CAMERA_SPRING)
  const down = useTransform(downSpring, (v) => easeInOutCubic(Math.min(1, Math.max(0, v))))
  const worksY = useTransform(down, (v) => `${(1 - v) * WORKS_DROP * 100}%`)
  // Projects reel: the images slide sideways, one project per stop
  const reelSource = useTransform(scrollYProgress, [REEL_START, REEL_END], [0, PROJECTS.length - 1], { clamp: true })
  const reelPos = useSpring(reelSource, { stiffness: 60, damping: 20, mass: 0.8, restDelta: 0.0005 })
  const [reelVisible, setReelVisible] = useState(false)
  useMotionValueEvent(down, 'change', (v) => setReelVisible(v > 0.6))
  // The reel's three.js chunk and project images load once the camera heads for the logos screen
  const [reelPreload, setReelPreload] = useState(false)
  useMotionValueEvent(lateral, 'change', (v) => { if (v > 0.02) setReelPreload(true) })
  const projectY = (i: number) => {
    const section = sectionRef.current
    if (!section) return null
    const at = REEL_START + (PROJECTS.length > 1 ? i / (PROJECTS.length - 1) : 0) * (REEL_END - REEL_START)
    return section.offsetTop + at * (section.offsetHeight - window.innerHeight)
  }
  const selectProject = (i: number) => {
    const y = projectY(i)
    if (y !== null) scrollTo(y)
  }
  // Snap: once the scroll comes to rest inside the reel, settle on the nearest project
  useEffect(() => {
    let timer = 0
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const section = sectionRef.current
        if (!section || isScrollLocked()) return
        const pinned = section.offsetHeight - window.innerHeight
        const v = (window.scrollY - section.offsetTop) / pinned
        if (v < REEL_START - 0.01 || v > REEL_END + 0.01) return
        const n = PROJECTS.length - 1
        const i = Math.round(((Math.min(REEL_END, Math.max(REEL_START, v)) - REEL_START) / (REEL_END - REEL_START)) * n)
        const y = projectY(i)
        if (y !== null && Math.abs(y - window.scrollY) > 2) scrollTo(y, 0.7)
      }, 160)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer) }
  }, [])

  // Leaving the pin: the card sinks back and dims as the next section rises over it
  const { scrollYProgress: exitProgress } = useScroll({ target: sectionRef, offset: ['end end', 'end start'] })
  const exit = useSpring(exitProgress, CAMERA_SPRING)
  const cardScale = useTransform(exit, [0, 1], [1, 0.88])
  const cardOpacity = useTransform(exit, [0, 0.9], [1, 0.25])
  const cardRadius = useTransform(exit, [0, 0.4], ['0px', '28px'])

  // Magnet on the closing frame: arriving there (scrolling down) parks the page for a moment
  const dropHeldRef = useRef(false)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const section = sectionRef.current
    if (!section) return
    // On the "8": park while the pixel hand drops the effect in; as soon as it switches on,
    // the camera carries on by itself to the closing frame
    const dropAt = DROP_AT * MORPH_END
    if (v < dropAt - 0.03) dropHeldRef.current = false
    if (!dropHeldRef.current && v >= dropAt && scrollYProgress.getPrevious()! < dropAt) {
      dropHeldRef.current = true
      const pinned = section.offsetHeight - window.innerHeight
      holdThenGlide(section.offsetTop + dropAt * pinned, DROP_IMPACT_MS + 120, section.offsetTop + MORPH_END * pinned, GLIDE_S)
    }
  })
  // CTAs leave as soon as the morph starts
  const ctaOpacity = useTransform(morph, [0, 0.025], [1, 0])
  const ctaEvents = useTransform(morph, (v) => (v > 0.02 ? 'none' : 'auto'))
  // Closing hero copy, revealed as the camera settles on the last frame
  // Headlines write themselves in liquid ink once their frame is on screen
  const [finShow, setFinShow] = useState(false)
  useMotionValueEvent(morph, 'change', (v) => setFinShow(v > 0.93))
  const [worksShow, setWorksShow] = useState(false)
  useMotionValueEvent(down, 'change', (v) => setWorksShow(v > 0.35))
  const finCta = useTransform(morph, [0.955, 0.985], [0, 1])
  const finCtaY = useTransform(morph, [0.955, 0.985], [12, 0])
  const finEvents = useTransform(morph, (v) => (v > 0.96 ? 'auto' : 'none'))

  return (
    <section id="hero" ref={sectionRef} className="relative" style={{ height: `${PIN_VH + 100}vh` }}>
      {/* Nav target for "Works": the camera has come down onto the Works title */}
      <div id="works" aria-hidden className="absolute left-0 w-px h-px" style={{ top: `${MORPH_VH + DWELL_VH + LATERAL_VH + WORKS_VH}vh` }} />
      <div className="sticky top-0 h-[100svh] p-2.5 sm:p-4 md:p-6">
      <motion.div style={{ scale: cardScale, opacity: cardOpacity, borderRadius: cardRadius }} className="w-full h-full origin-top overflow-hidden">
      <div
        className="relative w-full h-full rounded-[1.25rem] md:rounded-[2rem] overflow-hidden flex items-center justify-center"
        style={{ background: '#0A1010' }}
      >
        <h1 className="sr-only">1778Studio — {t.hero.phrases.join(' ')}</h1>
        <div className="relative -translate-y-[12vh]">
          <HeroFace phrases={t.hero.phrases} morph={morph} eyesRef={eyesRef} />
        </div>

        <div className="absolute inset-0">
          <LogoMorph progress={morph} eyesRef={eyesRef} captions={t.hero.captions} pan={pan} down={down} effectLabel={t.hero.effectLabel} />
        </div>

        {/* ── Closing hero frame (slides out left with the camera) ─ */}
        <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ x: finalShift }}>
        <motion.div
          className="absolute left-5 md:left-[5%] top-[15%] md:top-1/2 md:-translate-y-1/2 max-w-[90%]"
          style={{ pointerEvents: finEvents }}
        >
          <h2 className="text-white leading-[1.08] tracking-[-0.01em] text-[clamp(1.5rem,8vw,1.9rem)] md:text-[clamp(1.9rem,3.6vw,3.6rem)]">
            {[t.hero.final.line1, t.hero.final.line2].map((line, i) => (
              <span key={i} className="block pb-[0.06em]">
                <LiquidText show={finShow} delay={i * 0.14} style={{ fontFamily: '"Geist", sans-serif', fontWeight: 700 }}>
                  {line}
                </LiquidText>
              </span>
            ))}
          </h2>
          <motion.a
            href="https://api.whatsapp.com/send/?phone=5491132192293&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 md:mt-9 inline-flex items-center gap-2 text-xs md:text-sm tracking-[0.04em] text-white/45 hover:text-white transition-colors duration-300"
            style={{ opacity: finCta, y: finCtaY, fontFamily: '"Geist", sans-serif', fontWeight: 700 }}
          >
            {t.hero.final.cta}
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>
        </motion.div>
        </motion.div>

        {/* ── Lateral scene ─────────────────────────────────────── */}
        <LateralScene pan={pan} down={down} />

        {/* ── Works (same card: the camera moves down onto it) ── */}
        <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ y: worksY }}>
          <ProjectsReel pos={reelPos} visible={reelVisible} preload={reelPreload} onSelect={selectProject} />
          <motion.h2
            className="absolute left-5 md:left-[5%] top-[16%] md:top-[18%] leading-none tracking-[-0.02em] text-[clamp(3rem,9vw,9rem)]"
            style={{ color: '#ffffff', fontFamily: '"Geist", sans-serif', fontWeight: 700 }}
          >
            <LiquidText show={worksShow}>Works</LiquidText>
          </motion.h2>
        </motion.div>

        {/* ── CTAs ──────────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] md:bottom-10 left-0 right-0 z-10 flex flex-col-reverse sm:flex-row items-center justify-center gap-3 sm:gap-4 px-5"
          style={{ opacity: ctaOpacity, pointerEvents: ctaEvents }}
        >
          <motion.button
            type="button"
            onClick={() => scrollTo(window.innerHeight, 1.8)}
            className="group inline-flex items-center gap-2.5 rounded-full border border-white/15 hover:border-white/40 pl-5 pr-1.5 py-1.5 text-sm sm:text-base text-primary/80 hover:text-primary transition-colors duration-300"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.hero.scrollCta}
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/15 flex items-center justify-center overflow-hidden">
              <motion.span
                animate={{ y: [-14, 0, 0, 14] }}
                transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1], repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.span>
            </span>
          </motion.button>

          <motion.a
            href="https://api.whatsapp.com/send/?phone=5491132192293&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-5 pr-1.5 py-1.5 font-medium text-sm sm:text-base text-black"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.hero.contactCta}
            <span className="bg-black rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DEDBC8]" />
            </span>
          </motion.a>
        </motion.div>
      </div>
      </motion.div>
      </div>
    </section>
  )
}
