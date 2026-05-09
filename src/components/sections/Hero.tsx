import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { NAV_ITEMS } from '@/data/nav'
import { useScrollVideo } from '@/hooks/useScrollVideo'
import { WordsPullUpMultiStyle } from '@/components/ui'

const fadeUp = (delay: number) => ({
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as number[] },
})

export default function Hero() {
  const contentRef = useRef(null)
  const videoRef   = useRef<HTMLVideoElement>(null)
  const isInView   = useInView(contentRef, { once: true, amount: 'some' })

  useScrollVideo(videoRef)

  return (
    <section id="hero" className="h-screen p-4 md:p-6">
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden">

        {/* Background video — plays while scrolling, pauses when still */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
          src="/hero-video.mp4"
        />

        {/* Overlays */}
        <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10" />

        {/* Navbar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <nav className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-6 flex items-center gap-4 md:gap-8">
            <a href="#hero" className="shrink-0">
              <img src="/1778logo.png" alt="1778Studio" className="h-7 sm:h-8 w-auto object-contain" />
            </a>
            <ul className="flex items-center gap-3 sm:gap-5 md:gap-8 lg:gap-10">
              {NAV_ITEMS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[10px] sm:text-xs md:text-sm transition-colors duration-200"
                    style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(225, 224, 204, 0.8)')}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Hero content */}
        <div
          ref={contentRef}
          className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-12 items-end px-6 md:px-10 pb-8 md:pb-10"
        >
          <div className="col-span-12 lg:col-span-8">
            <h1
              className="text-[13vw] sm:text-[12vw] md:text-[11vw] lg:text-[9.5vw] xl:text-[9vw] 2xl:text-[8.5vw] leading-[1.05] tracking-[-0.04em] pb-2"
              style={{ color: '#E1E0CC' }}
            >
              <WordsPullUpMultiStyle
                segments={[
                  { text: 'Creative', className: 'font-medium' },
                  { text: 'Agency',   className: 'font-serif italic font-normal' },
                ]}
              />
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col items-start lg:items-end gap-4 pb-2 lg:pb-3 mt-4 lg:mt-0">
            <motion.p
              {...fadeUp(0.5)}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              className="text-primary/70 text-xs sm:text-sm md:text-base max-w-xs lg:text-right"
              style={{ lineHeight: 1.2 }}
            >
              Agencia multimedia especializada en diseño de experiencias web. Accesibles, usables y creativas.
            </motion.p>

            <motion.a
              href="#contactos"
              {...fadeUp(0.7)}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-5 pr-1 py-1 font-medium text-sm sm:text-base text-black"
            >
              Contáctanos
              <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-[#DEDBC8]" />
              </span>
            </motion.a>
          </div>
        </div>

      </div>
    </section>
  )
}
