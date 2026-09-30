import { motion, AnimatePresence, useSpring } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { scrollTo } from '@/hooks/useLenis'
import LangSwitch from './LangSwitch'

// Scrolled past this (px), the island opens up into the full menu
const OPEN_AT = 24
// iOS Dynamic Island feel: quick, a touch of give, no wobble
const ISLAND = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const
const ITEM_IN = { type: 'spring', stiffness: 380, damping: 30 } as const

// Liquid indicator: three blobs chase the target on ever softer springs; the goo filter melts
// them into one drop, so moving between items stretches a sticky bridge that snaps back
const BLOB_SPRINGS = [
  { stiffness: 520, damping: 34, mass: 0.6 },
  { stiffness: 260, damping: 26, mass: 0.8 },
  { stiffness: 140, damping: 20, mass: 1 },
]
const GOO_ID = 'island-goo'

type Id = 'home' | 'works' | 'contact'

function useBlob(spring: (typeof BLOB_SPRINGS)[number]) {
  return { x: useSpring(0, spring), w: useSpring(0, spring) }
}

/**
 * Navbar as a Dynamic Island: at the top of the page it is a small black pill holding only the
 * 1778 logo; as soon as the page scrolls it stretches open and reveals the menu.
 */
export default function DynamicNav() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  // Compact island opened by hand: mouse over it, or a tap on touch screens
  const [peek, setPeek] = useState(false)
  const open = scrolled || peek
  const [hovered, setHovered] = useState<Id | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState<Id>('home')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > OPEN_AT)
      // Section in view (its top above the middle of the screen)
      const mid = window.scrollY + window.innerHeight * 0.5
      const top = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel)
        return el ? el.getBoundingClientRect().top + window.scrollY : Infinity
      }
      setActive(mid >= top('#contactos') ? 'contact' : mid >= top('#works') + window.innerHeight * 0.5 ? 'works' : 'home')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const items: { id: Id; label: string; href: string; to: string | number }[] = [
    { id: 'home', label: t.nav.home, href: '#hero', to: 0 },
    { id: 'works', label: t.nav.works, href: '#works', to: '#works' },
    { id: 'contact', label: t.nav.contact, href: '#contactos', to: '#contactos' },
  ]

  // ── Liquid indicator ─────────────────────────────────────────
  const listRef = useRef<HTMLUListElement>(null)
  const linkRefs = useRef<Partial<Record<Id, HTMLAnchorElement | null>>>({})
  const blobs = [useBlob(BLOB_SPRINGS[0]), useBlob(BLOB_SPRINGS[1]), useBlob(BLOB_SPRINGS[2])]
  const blobsRef = useRef(blobs)
  const target = hovered ?? active
  const placed = useRef(false)

  const place = useCallback(() => {
    const el = linkRefs.current[target]
    const list = listRef.current
    if (!el || !list) return
    // Relative to the list (each link sits in its own positioned <li>)
    const x = el.getBoundingClientRect().left - list.getBoundingClientRect().left
    const w = el.offsetWidth
    for (const b of blobsRef.current) {
      // First placement jumps straight there; after that the blobs travel
      if (!placed.current) { b.x.jump(x); b.w.jump(w) } else { b.x.set(x); b.w.set(w) }
    }
    placed.current = true
  }, [target])

  useLayoutEffect(() => { if (open) place() }, [open, place, t])
  useEffect(() => {
    if (!open) { placed.current = false; return }
    const list = listRef.current
    if (!list) return
    const ro = new ResizeObserver(() => place())
    ro.observe(list)
    return () => ro.disconnect()
  }, [open, place])

  // Hovering the compact island opens it; leaving closes it again after a short grace period.
  // Touch: a tap opens it, a tap anywhere else closes it.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    let timer = 0
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      window.clearTimeout(timer)
      setPeek(true)
    }
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      timer = window.setTimeout(() => setPeek(false), 260)
    }
    const onOutside = (e: PointerEvent) => { if (!nav.contains(e.target as Node)) setPeek(false) }
    nav.addEventListener('pointerenter', onEnter)
    nav.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      window.clearTimeout(timer)
      nav.removeEventListener('pointerenter', onEnter)
      nav.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [])

  // Native listener: the rolling-letters hover swaps the label's text nodes on pointerout, which
  // leaves React's synthetic onMouseLeave without a target — the liquid would stay stuck
  useEffect(() => {
    const list = listRef.current
    if (!open || !list) return
    const onLeave = () => setHovered(null)
    list.addEventListener('mouseleave', onLeave)
    return () => list.removeEventListener('mouseleave', onLeave)
  }, [open])

  return (
    <div className="fixed inset-x-0 z-50 flex justify-center pointer-events-none top-[max(0.75rem,env(safe-area-inset-top))] md:top-5">
      {/* Goo: blur the blobs together, then snap the alpha back to a crisp edge */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id={GOO_ID}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      <motion.nav
        ref={navRef}
        layout
        transition={ISLAND}
        aria-label="Principal"
        className="pointer-events-auto flex items-center bg-black overflow-hidden"
        style={{
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.1)',
          boxShadow: open ? '0 10px 36px rgba(0,0,0,0.55)' : '0 4px 18px rgba(0,0,0,0.35)',
          padding: open ? '6px 6px 6px 16px' : '7px 18px',
        }}
      >
        <motion.a
          layout="position"
          transition={ISLAND}
          href="#hero"
          className="shrink-0 block"
          onClick={(e) => {
            e.preventDefault()
            // Touch has no hover: the first tap on the compact island just opens it
            if (!open) setPeek(true)
            else scrollTo(0)
          }}
        >
          <img src="/1778-white.svg" alt="1778Studio" className="h-6 md:h-7 w-auto object-contain block" />
        </motion.a>

        <AnimatePresence initial={false} mode="popLayout">
          {open && (
            <motion.div
              key="menu"
              className="flex items-center"
              initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.92 }}
              // Blur on a tween: a spring overshoots below zero and blur() rejects negative values
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, transition: { ...ITEM_IN, delay: 0.08, filter: { duration: 0.3, delay: 0.08 } } }}
              exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.92, transition: { duration: 0.14 } }}
            >
              <div className="w-px h-4 bg-white/10 mx-2.5 md:mx-3" />
              <ul ref={listRef} className="relative flex items-center">
                {/* Liquid layer (behind the labels) */}
                <div aria-hidden className="absolute inset-y-0 -inset-x-3 pointer-events-none" style={{ filter: `url(#${GOO_ID})` }}>
                  {blobs.map((b, i) => (
                    <motion.span
                      key={i}
                      className="absolute top-0 bottom-0 left-3 rounded-full bg-[#E1E0CC]"
                      style={{ x: b.x, width: b.w, scaleY: i === 0 ? 1 : 0.86 }}
                    />
                  ))}
                </div>
                {items.map(({ id, label, href, to }) => (
                  <li key={id} className="relative">
                    <a
                      ref={(el) => { linkRefs.current[id] = el }}
                      href={href}
                      aria-current={active === id ? 'true' : undefined}
                      // Difference blend: cream on black, near-black wherever the liquid flows under it
                      className="relative z-10 block px-2.5 md:px-3 py-1 text-[13px] md:text-sm whitespace-nowrap mix-blend-difference"
                      style={{ color: '#E1E0CC' }}
                      onMouseEnter={() => setHovered(id)}
                      onFocus={() => setHovered(id)}
                      onBlur={() => setHovered(null)}
                      onClick={(e) => { e.preventDefault(); scrollTo(to) }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="w-px h-4 bg-white/10 mx-2 md:mx-3" />
              <LangSwitch />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  )
}
