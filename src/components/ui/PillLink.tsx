import { motion, type HTMLMotionProps } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

// Cream pill with a black round arrow on the right — the site's call-to-action button
// ("Contáctenos", "Hablemos", "Trabajemos juntos")
export default function PillLink({ children, className = '', ...props }: Omit<HTMLMotionProps<'a'>, 'children'> & { children: ReactNode }) {
  return (
    <motion.a
      {...props}
      className={`group inline-flex items-center gap-2 hover:gap-3 transition-[gap] duration-300 bg-primary rounded-full pl-5 pr-1.5 py-1.5 font-medium text-sm sm:text-base text-black whitespace-nowrap ${className}`}
    >
      {children}
      <span className="bg-black rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DEDBC8]" />
      </span>
    </motion.a>
  )
}
