import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface WordsPullUpProps {
  text: string
  className?: string
  showAsterisk?: boolean
}

export default function WordsPullUp({ text, className = '', showAsterisk = false }: WordsPullUpProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 'some' })
  const words = text.split(' ')

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1
        return (
          <span key={i} className="overflow-hidden inline-block pb-[0.12em]">
            <motion.span
              className="inline-block relative"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {word}
              {isLast && showAsterisk && (
                <sup className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</sup>
              )}
              {i < words.length - 1 && ' '}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
