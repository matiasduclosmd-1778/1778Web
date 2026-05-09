import { useRef } from 'react'
import { motion, useScroll, useInView } from 'framer-motion'
import { WordsPullUp, AnimatedLetter } from '@/components/ui'

const BODY_TEXT =
  'We create digital experiences, visual identities and products designed to elevate brands through design, strategy and technology. Different disciplines. One shared vision.'

export default function Servicios() {
  const sectionRef = useRef(null)
  const footerRef  = useRef(null)
  const footerInView = useInView(footerRef, { once: true, amount: 'some' })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.2'],
  })

  const chars = BODY_TEXT.split('')

  return (
    <section id="servicios" className="bg-black py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#101010] rounded-3xl px-8 py-14 md:px-16 md:py-20 text-center">

          <p className="text-primary text-[10px] sm:text-xs mb-8 tracking-widest uppercase">
            Worldwide agency
          </p>

          <div
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9] mb-10"
            style={{ color: '#E1E0CC' }}
          >
            <WordsPullUp text="Welcome to 1778Studio." className="mb-1" />
            <span className="block mt-2">
              <WordsPullUp text="A multidisciplinary" className="font-serif italic font-normal" />
              {' '}
              <WordsPullUp text="agency bringing together creatives, visual artists, developers, UX/UI specialists and branding experts." />
            </span>
          </div>

          {/* Scroll-linked body */}
          <div
            ref={sectionRef}
            className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base mb-10"
            style={{ color: '#DEDBC8' }}
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

          {/* Footer note */}
          <div ref={footerRef}>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={footerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-gray-500 text-[11px] sm:text-xs max-w-sm mx-auto border-t border-white/5 pt-8"
              style={{ lineHeight: 1.7 }}
            >
              More than 10 years developing creativity, strategy, art and usability for companies.
              Based in Buenos Aires, Argentina.
            </motion.p>
          </div>

        </div>
      </div>
    </section>
  )
}
