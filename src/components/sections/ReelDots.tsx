import { motion, MotionValue, useSpring, useTransform } from 'framer-motion'

// Pagination dots for the Works reel. Inactive dots sit at 50%; the active one is a white drop made
// of three blobs melted together by a goo filter:
// - the head follows the reel's continuous position (it reacts to the scroll itself),
// - the tail stays anchored on the dot being left and only lets go past the halfway point, then
//   lands on the next dot with a little wobble,
// - a neck between them forms the liquid bridge, which thins out and snaps as the head pulls away.

const PITCH = 24 // px between dot centres
const GOO_ID = 'reel-dots-goo'
const HEAD_SPRING = { stiffness: 700, damping: 45, mass: 0.5 }
const TAIL_SPRING = { stiffness: 190, damping: 13, mass: 0.8 } // underdamped: a small wobble on landing
// 20% smaller than the original 12 / 14 px dots
const DOT = 'w-[9.6px] h-[9.6px] md:w-[11.2px] md:h-[11.2px]'
const DOT_CENTER = '-mt-[4.8px] -ml-[4.8px] md:-mt-[5.6px] md:-ml-[5.6px]'

interface ReelDotsProps {
  count: number
  /** Continuous project index (0 … count-1) */
  pos: MotionValue<number>
  active: number
  labels: string[]
  onSelect: (index: number) => void
}

export default function ReelDots({ count, pos, active, labels, onSelect }: ReelDotsProps) {
  const clampPos = (p: number) => Math.max(0, Math.min(count - 1, p))
  const head = useSpring(useTransform(pos, (p) => clampPos(p) * PITCH), HEAD_SPRING)
  const tail = useSpring(useTransform(pos, (p) => Math.round(clampPos(p)) * PITCH), TAIL_SPRING)
  const neck = useTransform([head, tail], ([a, b]: number[]) => (a + b) / 2)
  // The neck thins as the drop stretches, so the bridge pinches off before it gets too long
  const neckScale = useTransform([head, tail], ([a, b]: number[]) => Math.max(0.2, 0.95 - Math.abs(a - b) / (PITCH * 1.1)))

  return (
    <div className="relative flex">
      {/* Goo: blur the blobs together, then snap the alpha back to a crisp edge */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id={GOO_ID} x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
          <feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </svg>

      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => onSelect(i)}
          // 24 px apart; the hit area reaches out to a finger-sized 36 × 44
          className="relative w-6 h-11 flex items-center justify-center after:absolute after:inset-y-0 after:-inset-x-1.5 after:content-['']"
        >
          <span className={`block ${DOT} rounded-full bg-white/50`} />
        </button>
      ))}

      {/* The liquid active drop, on top of the dots */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ filter: `url(#${GOO_ID})` }}>
        <motion.span className={`absolute top-1/2 left-3 ${DOT} ${DOT_CENTER} rounded-full bg-white`} style={{ x: tail, scale: 1.12 }} />
        <motion.span className={`absolute top-1/2 left-3 ${DOT} ${DOT_CENTER} rounded-full bg-white`} style={{ x: neck, scale: neckScale }} />
        <motion.span className={`absolute top-1/2 left-3 ${DOT} ${DOT_CENTER} rounded-full bg-white`} style={{ x: head, scale: 1.12 }} />
      </div>
    </div>
  )
}
