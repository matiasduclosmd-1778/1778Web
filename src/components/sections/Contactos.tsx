import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { WordsPullUp } from '@/components/ui'

export default function Contactos() {
  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 'some' })

  return (
    <section id="contactos" className="bg-black py-28 px-4 md:px-8 border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">

        <p className="text-primary text-[10px] sm:text-xs mb-8 tracking-widest uppercase">Contacto</p>

        <h2
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-[0.9] tracking-[-0.04em] mb-8"
          style={{ color: '#E1E0CC' }}
        >
          <WordsPullUp text="Hablemos." />
        </h2>

        <div ref={ref}>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-gray-400 text-sm md:text-base mb-10 max-w-md mx-auto"
            style={{ lineHeight: 1.6 }}
          >
            ¿Tenés un proyecto en mente? Contanos sobre él y trabajemos juntos para hacerlo realidad.
          </motion.p>

          <motion.a
            href="mailto:hola@1778studio.com"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-6 pr-1 py-1 font-medium text-sm sm:text-base text-black"
          >
            hola@1778studio.com
            <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-[#DEDBC8]" />
            </span>
          </motion.a>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="text-gray-600 text-xs mt-16"
          >
            © 2026 1778Studio. Todos los derechos reservados.
          </motion.p>
        </div>

      </div>
    </section>
  )
}
