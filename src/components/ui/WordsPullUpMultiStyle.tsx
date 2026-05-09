import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Segment {
  text: string
  className?: string
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[]
  className?: string
}

export default function WordsPullUpMultiStyle({ segments, className = '' }: WordsPullUpMultiStyleProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 'some' })

  const allWords: { word: string; className: string; index: number }[] = []
  let globalIndex = 0

  segments.forEach((seg) => {
    seg.text.split(' ').filter(Boolean).forEach((word) => {
      allWords.push({ word, className: seg.className ?? '', index: globalIndex++ })
    })
  })

  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center gap-x-[0.25em] ${className}`}>
      {allWords.map(({ word, className: wordClass, index }) => (
        <span key={index} className="overflow-hidden inline-block pb-[0.12em]">
          <motion.span
            className={`inline-block ${wordClass}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
