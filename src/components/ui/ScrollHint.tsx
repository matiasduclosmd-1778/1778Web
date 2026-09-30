import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { isScrollLocked } from '@/hooks/useLenis'

// Below this the hero's own "Scroll para comenzar" button is on screen
const START_AT = 40
// Within this of the bottom there is nothing left to scroll to
const END_GAP = 40

/**
 * "Continuá scrolleando": a small floating cue, shown whenever there is more page below and the
 * user is free to scroll. Difference blending keeps it legible on the dark scenes and the white one.
 */
export default function ScrollHint() {
  const { t } = useLang()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Checked on scroll, plus a light poll for holds / glides that start or end without one
    let last = false
    const check = () => {
      const y = window.scrollY
      const end = document.documentElement.scrollHeight - window.innerHeight - END_GAP
      const next = y > START_AT && y < end && !isScrollLocked()
      if (next !== last) { last = next; setShow(next) }
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    const poll = window.setInterval(check, 250)
    return () => { window.removeEventListener('scroll', check); window.clearInterval(poll) }
  }, [])

  return (
    <div className="fixed inset-x-0 z-40 flex justify-center pointer-events-none mix-blend-difference bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-8">
      <AnimatePresence>
        {show && (
          <motion.div
            aria-hidden
            className="flex items-center gap-2 rounded-full border border-white/25 pl-4 pr-1.5 py-1.5 text-white text-[11px] md:text-xs tracking-[0.08em] uppercase"
            style={{ fontFamily: '"Geist", sans-serif', fontWeight: 700 }}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.scrollHint}
            <span className="w-6 h-6 rounded-full border border-white/25 flex items-center justify-center overflow-hidden">
              <motion.span
                className="block"
                animate={{ y: [-12, 0, 0, 12] }}
                transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1], repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowDown className="w-3 h-3" />
              </motion.span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
