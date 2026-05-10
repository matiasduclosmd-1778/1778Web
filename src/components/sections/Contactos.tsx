import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, Instagram } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { useLang } from '@/contexts/LangContext'

const WORDS = ['Hablemos', "Let's talk", 'Parlons', '聊聊吧', 'Reden wir', 'Поговорим']

function CyclingHeading() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % WORDS.length), 500)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="relative h-[1.05em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={index}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export default function Contactos() {
  const { t } = useLang()
  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 'some' })

  return (
    <section id="contactos" className="bg-black py-28 px-4 md:px-8 border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">

        <p className="text-primary text-[10px] sm:text-xs mb-8 tracking-widest uppercase">
          {t.contactos.label}
        </p>

        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium leading-[0.9] tracking-[-0.04em] mb-8"
          style={{ color: '#E1E0CC' }}
        >
          <CyclingHeading />
        </h2>

        <div ref={ref}>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-gray-400 text-sm md:text-base mb-10 max-w-md mx-auto"
            style={{ lineHeight: 1.6 }}
          >
            {t.contactos.body}
          </motion.p>

          <motion.a
            href="mailto:1778studioba@gmail.com"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-6 pr-1 py-1 font-medium text-sm sm:text-base text-black"
          >
            1778studioba@gmail.com
            <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-[#DEDBC8]" />
            </span>
          </motion.a>

          <motion.a
            href="https://www.instagram.com/1778studio/"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 mt-6 text-sm transition-colors duration-200"
            style={{ color: 'rgba(222,219,200,0.4)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(222,219,200,0.85)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(222,219,200,0.4)')}
          >
            <Instagram className="w-4 h-4" />
            Check my instagram
          </motion.a>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="text-gray-600 text-xs mt-16"
          >
            {t.contactos.footer}
          </motion.p>
        </div>

      </div>
    </section>
  )
}
