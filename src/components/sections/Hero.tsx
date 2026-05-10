import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { useScrollVideo } from '@/hooks/useScrollVideo'
import { scrollTo } from '@/hooks/useLenis'
import { WordsPullUpMultiStyle, LangSwitch } from '@/components/ui'

const fadeUp = (delay: number) => ({
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as number[] },
})

export default function Hero() {
  const { t } = useLang()
  const contentRef  = useRef(null)
  const videoRef    = useRef<HTMLVideoElement>(null)
  const isInView    = useInView(contentRef, { once: true, amount: 'some' })
  const [menuOpen, setMenuOpen] = useState(false)

  useScrollVideo(videoRef)

  const navItems = [
    { label: t.nav.home,     href: '#hero'      },
    { label: t.nav.services, href: '#servicios' },
    { label: t.nav.clients,  href: '#clientes'  },
    { label: t.nav.art,      href: '#arte'      },
    { label: t.nav.contact,  href: '#contactos' },
  ]

  return (
    <section id="hero" className="h-screen p-4 md:p-6">
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden">

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          loop muted playsInline
          src="/hero-video.mp4"
        />
        <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10" />

        {/* ── Navbar ────────────────────────────────────────────── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <nav className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-6 flex items-center gap-3 md:gap-6">
            {/* Logo */}
            <a href="#hero" className="shrink-0" onClick={(e) => { e.preventDefault(); scrollTo(0) }}>
              <img src="/1778logo.png" alt="1778Studio" className="h-7 sm:h-8 w-auto object-contain" />
            </a>

            {/* Desktop links — hidden on mobile */}
            <ul className="hidden md:flex items-center gap-5 lg:gap-9">
              {navItems.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-xs md:text-sm transition-colors duration-200 whitespace-nowrap"
                    style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(225, 224, 204, 0.8)')}
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
                className="md:hidden flex items-center justify-center w-7 h-7 rounded-full border border-white/10 ml-1"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="w-3.5 h-3.5" style={{ color: 'rgba(222,219,200,0.8)' }} />
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

        {/* ── Hero content ──────────────────────────────────────── */}
        <div
          ref={contentRef}
          className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-12 items-end px-5 md:px-10 pb-6 md:pb-10"
        >
          <div className="col-span-12 lg:col-span-8">
            <h1
              className="text-[14vw] sm:text-[13vw] md:text-[11vw] lg:text-[9.5vw] xl:text-[9vw] 2xl:text-[8.5vw] leading-[1.05] tracking-[-0.04em] pb-2"
              style={{ color: '#E1E0CC' }}
            >
              <WordsPullUpMultiStyle
                segments={[
                  { text: t.hero.h1, className: 'font-medium' },
                  { text: t.hero.h2, className: 'font-serif italic font-normal' },
                ]}
              />
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col items-start lg:items-end gap-3 md:gap-4 pb-2 lg:pb-3 mt-3 lg:mt-0">
            <motion.p
              {...fadeUp(0.5)}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              className="text-primary/70 text-xs sm:text-sm md:text-base max-w-xs lg:text-right"
              style={{ lineHeight: 1.3 }}
            >
              {t.hero.description}
            </motion.p>

            <motion.a
              href="#contactos"
              onClick={(e) => { e.preventDefault(); scrollTo('#contactos') }}
              {...fadeUp(0.7)}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-4 sm:pl-5 pr-1 py-1 font-medium text-sm sm:text-base text-black"
            >
              {t.hero.cta}
              <span className="bg-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DEDBC8]" />
              </span>
            </motion.a>
          </div>
        </div>

      </div>
    </section>
  )
}
