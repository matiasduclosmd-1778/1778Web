import { motion } from 'framer-motion'
import { useLang } from '@/contexts/LangContext'

export default function LangSwitch() {
  const { lang, toggle } = useLang()
  const isEN = lang === 'en'

  return (
    <button
      onClick={toggle}
      aria-label={isEN ? 'Cambiar a Español' : 'Switch to English'}
      className="relative flex items-center rounded-full focus:outline-none flex-shrink-0"
      style={{
        width: 72,
        height: 26,
        background: 'rgba(255,255,255,0.05)',
        border: '0.5px solid rgba(222,219,200,0.18)',
        padding: 2,
      }}
    >
      {/* Inactive label — ES (left) */}
      <span
        className="absolute left-0 w-1/2 text-center text-[9px] font-medium tracking-wide pointer-events-none select-none transition-colors duration-200"
        style={{ color: isEN ? 'rgba(222,219,200,0.45)' : 'transparent' }}
      >
        ES
      </span>

      {/* Inactive label — EN (right) */}
      <span
        className="absolute right-0 w-1/2 text-center text-[9px] font-medium tracking-wide pointer-events-none select-none transition-colors duration-200"
        style={{ color: !isEN ? 'rgba(222,219,200,0.45)' : 'transparent' }}
      >
        EN
      </span>

      {/* Sliding knob */}
      <motion.div
        className="relative z-10 flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 34, height: 22, background: '#DEDBC8' }}
        animate={{ x: isEN ? 34 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.75 }}
      >
        <span className="text-[9px] font-medium text-black select-none">
          {lang.toUpperCase()}
        </span>
      </motion.div>
    </button>
  )
}
