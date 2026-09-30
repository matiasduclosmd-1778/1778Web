import { useState, useRef, useEffect, type RefObject } from 'react'
import { motion, AnimatePresence, useDragControls, useInView } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'
import { FILES, thumb, full } from '@/data/portfolio'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { FileItem } from '@/types'
import { useLang } from '@/contexts/LangContext'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

// Phones: a loose 3 × 3 scatter that fits a narrow screen (desktop keeps the data positions)
const mobileSpot = (i: number) => ({
  left: `${3 + (i % 3) * 33 + (i % 2 ? 1.5 : 0)}%`,
  top: `${4 + Math.floor(i / 3) * 31 + ((i * 7) % 3) * 1.5}%`,
})

// ── Lightbox ──────────────────────────────────────────────────────────────

interface LightboxProps {
  file: FileItem
  desktopRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

function Lightbox({ file, desktopRef, onClose }: LightboxProps) {
  const dragControls = useDragControls()

  return (
    <>
      <motion.div
        className="absolute inset-0 z-[998]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="absolute z-[999] rounded-2xl overflow-hidden"
        style={{
          width: 'min(480px, calc(100% - 24px))',
          left: '50%',
          top: '50%',
          translateX: '-50%',
          translateY: '-50%',
          background: '#1c1c1e',
          border: '0.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 0.5px rgba(255,255,255,0.05)',
        }}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={desktopRef}
        dragMomentum={false}
        dragElastic={0}
        initial={{ scale: 0.82, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.86, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div
          className="flex items-center px-4 py-[11px] select-none"
          style={{
            background: '#252528',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
            cursor: 'grab',
          }}
          onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e) }}
        >
          <div className="flex items-center gap-[7px]">
            <button
              className="w-[13px] h-[13px] rounded-full bg-[#FF5F57] hover:brightness-110 transition-all flex-shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onClose() }}
            />
            <div className="w-[13px] h-[13px] rounded-full bg-[#FEBC2E] flex-shrink-0" />
            <div className="w-[13px] h-[13px] rounded-full bg-[#28C840] flex-shrink-0" />
          </div>
          <span
            className="flex-1 text-center text-[12px] font-medium"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {file.name}
          </span>
          {/* Close button — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
        </div>

        <img
          src={full(file.seed)}
          alt={file.name}
          className="w-full object-contain block"
          style={{ maxHeight: 360, background: '#111' }}
          draggable={false}
        />
      </motion.div>
    </>
  )
}

// ── File icon ─────────────────────────────────────────────────────────────

interface FileIconProps {
  file: FileItem
  index: number
  touch: boolean
  shown: boolean
  isSelected: boolean
  zIndex: number
  desktopRef: RefObject<HTMLDivElement | null>
  onPointerDown: () => void
  onDoubleClick: () => void
}

function FileIcon({ file, index, touch, shown, isSelected, zIndex, desktopRef, onPointerDown, onDoubleClick }: FileIconProps) {
  const spot = touch ? mobileSpot(index) : { left: file.left, top: file.top }
  return (
    <motion.div
      className="absolute"
      style={{ ...spot, zIndex, rotate: file.rotation }}
      // Touch: dragging would swallow the page scroll, so a tap simply opens the file
      drag={!touch}
      dragConstraints={desktopRef}
      dragMomentum={false}
      dragElastic={0}
      whileDrag={{ scale: 1.08, rotate: 0, zIndex: 9999 }}
      whileTap={touch ? { scale: 0.94 } : undefined}
      initial={{ opacity: 0, scale: 0.65, y: 18 }}
      animate={shown ? { opacity: 1, scale: 1, y: 0 } : undefined}
      transition={{ delay: 0.15 + index * 0.07, type: 'spring', stiffness: 170, damping: 20 }}
      onPointerDown={(e) => { if (!touch) e.stopPropagation(); onPointerDown() }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick() }}
      onTap={touch ? onDoubleClick : undefined}
    >
      <div
        className="flex flex-col items-center select-none w-[88px] sm:w-[108px]"
        style={{ gap: 7, cursor: 'default' }}
      >
        <motion.div
          className={`rounded-xl overflow-hidden ${isSelected ? 'ring-[2.5px] ring-white/40' : ''}`}
          style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.65)' }}
          whileHover={{ scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <img
            src={thumb(file.seed)}
            alt={file.name}
            width={104}
            height={80}
            loading="lazy"
            className="w-[84px] h-[64px] sm:w-[104px] sm:h-[80px] object-cover block"
            draggable={false}
          />
        </motion.div>

        <span
          className={`
            text-[10px] text-center truncate w-full px-2 py-[2px] rounded
            transition-colors duration-100
            ${isSelected
              ? 'bg-[#DEDBC8] text-black font-medium'
              : 'text-[#DEDBC8]/65 hover:text-[#DEDBC8]/90'
            }
          `}
        >
          {file.name}
        </span>
      </div>
    </motion.div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────

export default function Arte() {
  const { t } = useLang()
  const desktopRef              = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<FileItem | null>(null)
  const [zOrder, setZOrder]     = useState(() => FILES.map(f => f.id))
  const touch                   = useMediaQuery('(hover: none)')
  const frameRef                = useRef<HTMLDivElement>(null)
  const shown                   = useInView(frameRef, { once: true, amount: 0.25 })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenFile(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const bringToFront = (id: string) =>
    setZOrder(prev => [...prev.filter(i => i !== id), id])

  return (
    <section id="arte" className="bg-black py-10 md:py-16 px-2.5 sm:px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Desktop frame — rises into place as it enters the view */}
        <motion.div
          ref={frameRef}
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={shown ? { opacity: 1, y: 0, scale: 1 } : undefined}
          transition={{ duration: 1.1, ease: EASE_OUT }}
          className="rounded-[1.25rem] sm:rounded-3xl p-2 sm:p-3"
          style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 0 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Screen */}
          <div
            ref={desktopRef}
            className="relative rounded-xl sm:rounded-2xl overflow-hidden h-[min(470px,68svh)] sm:h-[420px] md:h-[500px] lg:h-[520px]"
            style={{ background: '#141414' }}
            onClick={() => setSelected(null)}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 85% 65% at 50% 30%, rgba(222,219,200,0.03) 0%, transparent 100%)',
              }}
            />
            <div className="bg-noise absolute inset-0 opacity-[0.07] pointer-events-none" />

            {/* Background watermark typography */}
            <div
              className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-center"
              style={{
                paddingLeft: '6%',
                paddingBottom: '2%',
                maskImage: 'radial-gradient(ellipse 88% 75% at 42% 52%, black 20%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 88% 75% at 42% 52%, black 20%, transparent 100%)',
              }}
            >
              {/* "Art" — Almarai light */}
              <div
                className="font-light leading-none tracking-[-0.05em]"
                style={{
                  fontSize: 'clamp(84px, 16vw, 162px)',
                  color: 'rgba(222,219,200,0.065)',
                  lineHeight: 0.82,
                }}
              >
                Art
              </div>
              {/* "& Works" — Instrument Serif italic */}
              <div
                className="font-serif italic leading-none tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(74px, 14vw, 142px)',
                  color: 'rgba(222,219,200,0.065)',
                  lineHeight: 0.88,
                  paddingLeft: '0.38em',
                  marginTop: '0.04em',
                }}
              >
                & Works
              </div>
            </div>

            <p
              className="absolute bottom-3 right-4 select-none pointer-events-none text-[9px]"
              style={{ color: 'rgba(255,255,255,0.1)' }}
            >
              {touch ? t.arte.hintTouch : t.arte.hint}
            </p>

            {FILES.map((file, i) => (
              <FileIcon
                key={file.id}
                file={file}
                index={i}
                touch={touch}
                shown={shown}
                isSelected={selected === file.id}
                zIndex={zOrder.indexOf(file.id) + 1}
                desktopRef={desktopRef}
                onPointerDown={() => { setSelected(file.id); bringToFront(file.id) }}
                onDoubleClick={() => { setOpenFile(file); bringToFront(file.id) }}
              />
            ))}

            <AnimatePresence>
              {openFile && (
                <Lightbox
                  key={openFile.id}
                  file={openFile}
                  desktopRef={desktopRef}
                  onClose={() => setOpenFile(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Dock */}
          <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 sm:gap-3">
            <motion.div
              className="inline-flex items-center gap-3 rounded-2xl px-4 py-[10px]"
              style={{
                background: 'rgba(24,24,24,0.9)',
                backdropFilter: 'blur(16px)',
                border: '0.5px solid rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={shown ? { opacity: 1, y: 0 } : undefined}
              transition={{ delay: 0.7, duration: 0.8, ease: EASE_OUT }}
            >
              <div className="rounded-xl p-1.5 flex-shrink-0" style={{ background: '#222' }}>
                <img src="/clientes/1778logo.png" alt="1778Studio" className="w-8 h-8 object-contain block" draggable={false} />
              </div>
              <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="text-sm pr-1" style={{ color: 'rgba(222,219,200,0.4)' }}>
                {t.arte.works}
              </span>
            </motion.div>

            <motion.a
              href="https://www.instagram.com/1778studio/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 bg-primary rounded-full pl-4 pr-1 py-1 font-medium text-sm text-black"
              initial={{ opacity: 0, y: 12 }}
              animate={shown ? { opacity: 1, y: 0 } : undefined}
              transition={{ delay: 0.85, duration: 0.8, ease: EASE_OUT }}
            >
              Portfolio
              <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 text-[#DEDBC8]" />
              </span>
            </motion.a>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
