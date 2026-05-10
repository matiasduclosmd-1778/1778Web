import { useRef, useState, useCallback, useEffect, memo } from 'react'
import {
  motion, useScroll,
  useMotionValue, useSpring, useMotionTemplate,
} from 'framer-motion'
import { AnimatedLetter } from '@/components/ui'
import { useLang } from '@/contexts/LangContext'
import type { ServiceItem } from '@/data/translations'

// ── Variants ──────────────────────────────────────────────────────────────

const sweepVariants = {
  rest:  { clipPath: 'inset(0 100% 0 0)' },
  hover: { clipPath: 'inset(0 0%   0 0)' },
}
const lineVariants = {
  rest:  { scaleX: 0 },
  hover: { scaleX: 1 },
}
const tagVariants = {
  rest:  { opacity: 0, y: 10 },
  hover: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
}

// ── Service card ──────────────────────────────────────────────────────────

const ServiceCard = memo(function ServiceCard({ service, delay, isTouch }: { service: ServiceItem; delay: number; isTouch: boolean }) {
  return (
    <motion.div
      className="relative border-t border-white/[0.06] overflow-hidden"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="relative py-9 md:py-11 cursor-default"
        initial="rest"
        whileHover={isTouch ? undefined : 'hover'}
        animate={isTouch ? 'hover' : 'rest'}
      >
        {/* Sweep background */}
        <motion.div
          className="absolute inset-0 origin-left pointer-events-none"
          style={{ background: 'rgba(222,219,200,0.025)' }}
          variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Top line sweep */}
        <motion.div
          className="absolute top-0 left-0 h-[1px] w-full origin-left pointer-events-none"
          style={{ background: 'rgba(222,219,200,0.35)' }}
          variants={lineVariants}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />

        <div className="relative flex items-start gap-5 md:gap-8">
          {/* Number */}
          <motion.span
            className="font-serif italic text-sm md:text-base pt-2 flex-shrink-0"
            variants={{
              rest:  { color: 'rgba(222,219,200,0.28)' },
              hover: { color: '#DEDBC8' },
            }}
            transition={{ duration: 0.2 }}
          >
            {service.number}
          </motion.span>

          <div className="flex-1 min-w-0">
            {/* Service name — dim base + clip-sweep bright layer */}
            <div className="relative mb-5 md:mb-6">
              <h3
                className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-normal leading-[0.92] tracking-[-0.025em]"
                style={{ color: 'rgba(222,219,200,0.16)' }}
              >
                {service.name}
              </h3>
              <motion.h3
                className="absolute inset-0 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-normal leading-[0.92] tracking-[-0.025em] pointer-events-none"
                style={{ color: 'rgba(222,219,200,0.88)' }}
                variants={sweepVariants}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden
              >
                {service.name}
              </motion.h3>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {service.tags.map((tag, i) => (
                <motion.span
                  key={tag}
                  className="border border-white/[0.12] rounded-full px-3 py-[5px] text-[9px] md:text-[10px] tracking-[0.1em] uppercase"
                  style={{ color: 'rgba(222,219,200,0.32)' }}
                  custom={i}
                  variants={tagVariants}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})

// ── Heading (shared by dim + bright layers) ───────────────────────────────

function HeadingContent({ h1, h2, h3, h4 }: { h1: string; h2: string; h3: string; h4: string }) {
  return (
    <div className="leading-[0.92] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)' }}>
      <div className="font-normal">{h1}</div>
      <div className="font-medium">{h2}</div>
      <div className="mt-3">
        <span className="font-serif italic font-normal">{h3}</span>
        <span className="font-normal"> {h4}</span>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches)
  }, [])
  return isTouch
}

export default function Servicios() {
  const { t } = useLang()
  const st = t.servicios
  const isTouch = useIsTouch()

  const headingRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef(null)
  const [isHovering, setIsHovering] = useState(false)

  const { scrollYProgress } = useScroll({
    target: bodyRef,
    offset: ['start 0.8', 'end 0.2'],
  })

  const cursorX = useMotionValue(-400)
  const cursorY = useMotionValue(-400)
  const springX = useSpring(cursorX, { stiffness: 600, damping: 50 })
  const springY = useSpring(cursorY, { stiffness: 600, damping: 50 })
  const maskImage = useMotionTemplate`radial-gradient(circle 220px at ${springX}px ${springY}px, black 0%, transparent 100%)`

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = headingRef.current?.getBoundingClientRect()
    if (!rect) return
    cursorX.set(e.clientX - rect.left)
    cursorY.set(e.clientY - rect.top)
  }, [cursorX, cursorY])

  const handleMouseEnter = useCallback(() => setIsHovering(true), [])
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    cursorX.set(-400)
    cursorY.set(-400)
  }, [cursorX, cursorY])

  const chars = st.body.split('')

  return (
    <section id="servicios" className="bg-black py-16 md:py-24 px-4 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">

        {/* Spotlight heading */}
        <div
          ref={headingRef}
          className="relative mb-12 md:mb-24 select-none"
          style={{ cursor: 'none' }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ color: 'rgba(222,219,200,0.15)' }}>
            <HeadingContent h1={st.h1} h2={st.h2} h3={st.h3} h4={st.h4} />
          </div>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ color: '#E1E0CC', maskImage, WebkitMaskImage: maskImage, willChange: 'mask-image' }}
            aria-hidden
          >
            <HeadingContent h1={st.h1} h2={st.h2} h3={st.h3} h4={st.h4} />
          </motion.div>
          <motion.div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 72, height: 72,
              x: springX, y: springY,
              translateX: '-50%', translateY: '-50%',
              border: '1px solid rgba(222,219,200,0.35)',
              top: 0, left: 0,
            }}
            animate={{ opacity: isHovering ? 1 : 0, scale: isHovering ? 1 : 0.4 }}
            transition={{ duration: 0.15 }}
          />
        </div>

        {/* Body text */}
        <div className="mb-4">
          <div ref={bodyRef}>
            <div
              className="text-sm sm:text-base md:text-lg w-full"
              style={{ color: '#DEDBC8', lineHeight: 1.65 }}
            >
              {chars.map((char, i) => (
                <AnimatedLetter
                  key={i}
                  char={char}
                  scrollYProgress={scrollYProgress}
                  charProgress={i / chars.length}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Services 2×2 grid */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 md:gap-x-16 lg:gap-x-24">
          {st.services.map((service, i) => (
            <ServiceCard key={service.number} service={service} delay={i * 0.1} isTouch={isTouch} />
          ))}
        </div>

      </div>
    </section>
  )
}
