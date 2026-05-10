import { memo } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'

interface AnimatedLetterProps {
  char: string
  scrollYProgress: MotionValue<number>
  charProgress: number
}

const AnimatedLetter = memo(function AnimatedLetter({ char, scrollYProgress, charProgress }: AnimatedLetterProps) {
  const opacity = useTransform(
    scrollYProgress,
    [charProgress - 0.1, charProgress + 0.05],
    [0.2, 1],
  )

  if (char === ' ') return <span> </span>

  return (
    <motion.span style={{ opacity }} className="inline-block">
      {char}
    </motion.span>
  )
})

export default AnimatedLetter
