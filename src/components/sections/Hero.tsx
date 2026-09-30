import { motion, AnimatePresence, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion'
import { ArrowDown, ArrowRight, Menu, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/contexts/LangContext'
import { scrollTo, holdScroll } from '@/hooks/useLenis'
import { LangSwitch } from '@/components/ui'
import HeroFace from './HeroFace'
import LogoMorph, { PAN_FRAC, DROP_AT, DROP_HOLD_MS } from './LogoMorph'
import LateralScene from './LateralScene'

// Pinned scroll budget (vh): morph → dwell on the closing frame → lateral scene
const MORPH_VH = 370
const DWELL_VH = 50
const LATERAL_VH = 380
const PIN_VH = MORPH_VH + DWELL_VH + LATERAL_VH
const MORPH_END = MORPH_VH / PIN_VH                // progress where the closing frame lands
const LATERAL_START = (MORPH_VH + DWELL_VH) / PIN_VH
const PAN_SHARE = 0.22                             // share of the lateral stretch spent sliding
const FINAL_HOLD_MS = 1000                         // how long the closing frame holds the scroll

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

export default function Hero() {
  const { t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  // Scroll-driven morph: eyes → 4 → 8 → 1778 logo, while the card stays pinned
  const sectionRef = useRef<HTMLElement>(null)
  const eyesRef = useRef<(HTMLElement | null)[]>([])
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  // The morph plays over the first part of the pin; the rest is a dwell on the closing frame
  const morphSource = useTransform(scrollYProgress, [0, MORPH_END], [0, 1], { clamp: true })
  const morph = useSpring(morphSource, { stiffness: 90, damping: 24, mass: 0.6, restDelta: 0.00005 })
  // Lateral stretch: the camera slides right into the next scene
  const lateralSource = useTransform(scrollYProgress, [LATERAL_START, 1], [0, 1], { clamp: true })
  const lateral = useSpring(lateralSource, { stiffness: 90, damping: 24, mass: 0.6, restDelta: 0.00005 })
  const pan = useTransform(lateral, (v) => easeInOutCubic(Math.min(1, Math.max(0, v / PAN_SHARE))))
  const finalShift = useTransform(pan, (v) => `${-v * PAN_FRAC * 100}%`)

  // Magnet on the closing frame: arriving there (scrolling down) parks the page for a moment
  const heldRef = useRef(false)
  const dropHeldRef = useRef(false)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const section = sectionRef.current
    if (!section) return
    // Same magnet on the "8" while the pixel hand drops the effect in
    const dropAt = DROP_AT * MORPH_END
    if (v < dropAt - 0.03) dropHeldRef.current = false
    if (!dropHeldRef.current && v >= dropAt && scrollYProgress.getPrevious()! < dropAt) {
      dropHeldRef.current = true
      holdScroll(section.offsetTop + dropAt * (section.offsetHeight - window.innerHeight), DROP_HOLD_MS)
      return
    }
    if (v < MORPH_END - 0.03) heldRef.current = false
    if (!heldRef.current && v >= MORPH_END && scrollYProgress.getPrevious()! < MORPH_END) {
      heldRef.current = true
      const y = section.offsetTop + MORPH_END * (section.offsetHeight - window.innerHeight)
      holdScroll(y, FINAL_HOLD_MS)
    }
  })
  // CTAs leave as soon as the morph starts
  const ctaOpacity = useTransform(morph, [0, 0.025], [1, 0])
  const ctaEvents = useTransform(morph, (v) => (v > 0.02 ? 'none' : 'auto'))
  // Closing hero copy, revealed as the camera settles on the last frame
  const finLine1 = useTransform(morph, [0.93, 0.965], ['110%', '0%'])
  const finLine2 = useTransform(morph, [0.94, 0.975], ['110%', '0%'])
  const finCta = useTransform(morph, [0.955, 0.985], [0, 1])
  const finCtaY = useTransform(morph, [0.955, 0.985], [12, 0])
  const finEvents = useTransform(morph, (v) => (v > 0.96 ? 'auto' : 'none'))

  useEffect(() => {
    const onScroll = () => {
      const section = sectionRef.current
      const pinnedFor = section ? section.offsetHeight - window.innerHeight : 0
      setScrolled(window.scrollY > pinnedFor + 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { label: t.nav.home,     href: '#hero'      },
    { label: t.nav.services, href: '#servicios' },
    { label: t.nav.clients,  href: '#clientes'  },
    { label: t.nav.art,      href: '#arte'      },
    { label: t.nav.contact,  href: '#contactos' },
  ]

  return (
    <section id="hero" ref={sectionRef} className="relative" style={{ height: `${PIN_VH + 100}vh` }}>
      {/* Nav target for "Servicios": the lateral scene, once it has slid in */}
      <div
        id="servicios"
        aria-hidden
        className="absolute left-0 w-px h-px"
        style={{ top: `${MORPH_VH + DWELL_VH + LATERAL_VH * PAN_SHARE}vh` }}
      />
      <div className="sticky top-0 h-screen p-4 md:p-6">


        {/* ── Floating navbar (on scroll) ───────────────────────── */}
        <AnimatePresence>
          {scrolled && (
            <motion.div
              className="fixed z-50"
              style={{ top: 16, left: '50%', x: '-50%' }}
              initial={{ opacity: 0, y: -32, scaleX: 0.92, scaleY: 0.8 }}
              animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
              exit={{ opacity: 0, y: -24, scaleX: 0.94, scaleY: 0.85 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.8 }}
            >
              <nav
                className="flex items-center gap-3 md:gap-6 px-5 py-[10px] md:px-6 md:py-2 rounded-full bg-black"
                style={{
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <a href="#hero" className="shrink-0" onClick={(e) => { e.preventDefault(); scrollTo(0) }}>
                  <img src="/1778logo.png" alt="1778Studio" className="h-8 w-auto object-contain" />
                </a>
                <ul className="hidden md:flex items-center gap-1">
                  {navItems.map(({ label, href }) => (
                    <li key={href} className="relative">
                      {hoveredNav === href && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-full bg-white"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <a
                        href={href}
                        className="relative z-10 block px-3 py-1 text-xs md:text-sm whitespace-nowrap transition-colors duration-150"
                        style={{ color: hoveredNav === href ? '#000' : 'rgba(225,224,204,0.8)' }}
                        onMouseEnter={() => setHoveredNav(href)}
                        onMouseLeave={() => setHoveredNav(null)}
                        onClick={(e) => { e.preventDefault(); scrollTo(href) }}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden md:block w-px h-4 bg-white/10" />
                  <LangSwitch />
                  <button
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-full border border-white/10"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menú"
                  >
                    <Menu className="w-4 h-4" style={{ color: 'rgba(222,219,200,0.8)' }} />
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navbar ────────────────────────────────────────────── */}
        <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-20">
          <nav className="bg-black rounded-b-2xl md:rounded-b-3xl px-5 py-[10px] md:px-6 md:py-2 flex items-center gap-3 md:gap-6">
            {/* Logo */}
            <a href="#hero" className="shrink-0" onClick={(e) => { e.preventDefault(); scrollTo(0) }}>
              <img src="/1778logo.png" alt="1778Studio" className="h-8 md:h-8 w-auto object-contain" />
            </a>

            {/* Desktop links — hidden on mobile */}
            <ul className="hidden md:flex items-center gap-1">
              {navItems.map(({ label, href }) => (
                <li key={href} className="relative">
                  {hoveredNav === href && (
                    <motion.div
                      layoutId="nav-pill-static"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <a
                    href={href}
                    className="relative z-10 block px-3 py-1 text-xs md:text-sm whitespace-nowrap transition-colors duration-150"
                    style={{ color: hoveredNav === href ? '#000' : 'rgba(225,224,204,0.8)' }}
                    onMouseEnter={() => setHoveredNav(href)}
                    onMouseLeave={() => setHoveredNav(null)}
                    onClick={(e) => { e.preventDefault(); scrollTo(href) }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Right side: divider (desktop) + lang switch + hamburger (mobile) */}
            <div className="flex items-center gap-2 md:gap-3 ml-1">
              <div className="hidden md:block w-px h-4 bg-white/10" />
              <LangSwitch />
              <button
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full border border-white/10"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="w-4 h-4" style={{ color: 'rgba(222,219,200,0.8)' }} />
              </button>
            </div>
          </nav>
        </div>

        {/* ── Mobile fullscreen menu ────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex flex-col md:hidden"
              style={{ background: '#080808' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <a href="#hero" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollTo(0) }}>
                  <img src="/1778logo.png" alt="1778Studio" className="h-8 w-auto object-contain" />
                </a>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10"
                  aria-label="Cerrar menú"
                >
                  <X className="w-4 h-4" style={{ color: 'rgba(222,219,200,0.7)' }} />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 flex flex-col justify-center px-6 gap-6">
                {navItems.map(({ label, href }, i) => (
                  <motion.a
                    key={href}
                    href={href}
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollTo(href) }}
                    className="text-[2.8rem] font-medium leading-none tracking-[-0.02em]"
                    style={{ color: 'rgba(222,219,200,0.6)' }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(222,219,200,0.6)')}
                  >
                    {label}
                  </motion.a>
                ))}
              </nav>

              {/* Bottom */}
              <div className="px-6 pb-10 flex items-center justify-between border-t border-white/5 pt-6">
                <LangSwitch />
                <p className="text-gray-700 text-xs">© 2026 1778Studio</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <div
        className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex items-center justify-center"
        style={{ background: '#0A1010' }}
      >
        <h1 className="sr-only">1778Studio — {t.hero.phrases.join(' ')}</h1>
        <div className="relative -translate-y-[12vh]">
          <HeroFace phrases={t.hero.phrases} morph={morph} eyesRef={eyesRef} />
        </div>

        <LogoMorph progress={morph} eyesRef={eyesRef} captions={t.hero.captions} pan={pan} clientsLabel={t.clientes.label} effectLabel={t.hero.effectLabel} />

        {/* ── Closing hero frame (slides out left with the camera) ─ */}
        <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ x: finalShift }}>
        <motion.div
          className="absolute left-5 md:left-[5%] top-1/2 -translate-y-1/2 max-w-[90%]"
          style={{ pointerEvents: finEvents }}
        >
          <h2 className="text-white leading-[1.08] tracking-[-0.01em] text-[clamp(1.9rem,3.6vw,3.6rem)]">
            {[t.hero.final.line1, t.hero.final.line2].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  style={{ y: i ? finLine2 : finLine1, fontFamily: '"Geist", sans-serif', fontWeight: 700 }}
                >
                  {line}
                </motion.span>
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
        <LateralScene pan={pan} />

        {/* ── CTAs ──────────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-6 md:bottom-10 left-0 right-0 z-10 flex flex-col-reverse sm:flex-row items-center justify-center gap-3 sm:gap-4 px-5"
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
      </div>
    </section>
  )
}
