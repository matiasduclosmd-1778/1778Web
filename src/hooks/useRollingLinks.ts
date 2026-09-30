import { useEffect } from 'react'

// Rolling-letters hover for every link and button: each letter rolls up and is
// replaced by a copy of itself (a text-shadow one line below), rippling out from
// the letter nearest the cursor; moving across the label re-rolls letters under it.
//
// React owns these text nodes, so letters are only split while hovered and the
// original nodes are put back once every roll has finished.

const SELECTOR = 'a, button'
const DURATION = 340 // ms per letter
const STAGGER = 24   // ms between neighbouring letters
const EASING = 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' // ≈ power2.inOut

type Letter = { box: HTMLElement; x: number; y: number }
type Split = { swaps: [Text, HTMLElement][]; labelled: boolean; running: number; letters: Letter[] }

const splits = new WeakMap<Element, Split>()

function split(el: Element): Split | null {
  const existing = splits.get(el)
  if (existing) return existing

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
      const parent = node.parentElement
      return !parent || parent.closest('.rl-t, svg, i') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    },
  })
  const texts: Text[] = []
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  if (!texts.length) return null

  const labelled = !el.hasAttribute('aria-label')
  if (labelled) el.setAttribute('aria-label', (el.textContent ?? '').replace(/\s+/g, ' ').trim())

  const swaps: [Text, HTMLElement][] = texts.map((text) => {
    const wrap = document.createElement('span')
    wrap.className = 'rl-t'
    wrap.setAttribute('aria-hidden', 'true')
    for (const part of (text.nodeValue ?? '').split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) { wrap.appendChild(document.createTextNode(part)); continue }
      const word = document.createElement('span')
      word.className = 'rl-w'
      for (const ch of part) {
        const box = document.createElement('span')
        box.className = 'rl'
        const inner = document.createElement('span')
        inner.className = 'rl-i'
        inner.textContent = ch
        box.appendChild(inner)
        word.appendChild(box)
      }
      wrap.appendChild(word)
    }
    text.replaceWith(wrap)
    return [text, wrap]
  })

  const s: Split = { swaps, labelled, running: 0, letters: [] }
  splits.set(el, s)
  return s
}

function restore(el: Element, s: Split) {
  for (const [text, wrap] of s.swaps) if (wrap.isConnected) wrap.replaceWith(text)
  if (s.labelled) el.removeAttribute('aria-label')
  splits.delete(el)
}

function measure(s: Split) {
  s.letters = [...new Set(s.swaps.flatMap(([, wrap]) => [...wrap.querySelectorAll<HTMLElement>('.rl')]))]
    .map((box) => ({ box, r: box.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0)
    .map(({ box, r }) => ({ box, x: r.left + r.width / 2, y: r.top + r.height / 2 }))
}

function nearest(letters: Letter[], x: number, y: number) {
  let best = -1
  let dist = Infinity
  letters.forEach((l, i) => {
    const d = Math.hypot(l.x - x, (l.y - y) * 2)
    if (d < dist) { dist = d; best = i }
  })
  return best
}

export function useRollingLinks() {
  useEffect(() => {
    const noHover = window.matchMedia('(hover: none)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (noHover || reduced) return

    let active: Element | null = null
    let current = -1

    const settle = (el: Element, s: Split) => {
      if (s.running === 0 && el !== active) restore(el, s)
    }

    const roll = (el: Element, s: Split, box: HTMLElement, delay: number) => {
      if (box.dataset.rolling) return
      const inner = box.firstElementChild as HTMLElement | null
      if (!inner) return
      box.dataset.rolling = '1'
      s.running++
      const vertical = getComputedStyle(el).writingMode.startsWith('vertical')
      const to = vertical ? `translateX(${box.offsetWidth}px)` : `translateY(${-box.offsetHeight}px)`
      const anim = inner.animate([{ transform: 'none' }, { transform: to }], { duration: DURATION, delay, easing: EASING })
      const done = () => {
        delete box.dataset.rolling
        s.running--
        settle(el, s)
      }
      anim.onfinish = done
      anim.oncancel = done
    }

    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(SELECTOR)
      if (!el || el === active) return
      const s = split(el)
      if (!s) return
      active = el
      el.classList.toggle('rl-v', getComputedStyle(el).writingMode.startsWith('vertical'))
      measure(s)
      if (!s.letters.length) return
      current = nearest(s.letters, e.clientX, e.clientY)
      s.letters.forEach((l, i) => roll(el, s, l.box, Math.abs(i - current) * STAGGER))
    }

    const onMove = (e: PointerEvent) => {
      if (!active) return
      const s = splits.get(active)
      if (!s?.letters.length) return
      const i = nearest(s.letters, e.clientX, e.clientY)
      if (i === current) return
      current = i
      roll(active, s, s.letters[i].box, 0)
      if (s.letters[i - 1]) roll(active, s, s.letters[i - 1].box, STAGGER * 1.5)
      if (s.letters[i + 1]) roll(active, s, s.letters[i + 1].box, STAGGER * 1.5)
    }

    const onOut = (e: PointerEvent) => {
      if (!active) return
      const to = e.relatedTarget as Node | null
      if (to && active.contains(to)) return
      const el = active
      active = null
      current = -1
      const s = splits.get(el)
      if (s) settle(el, s)
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onOut)
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onOut)
    }
  }, [])
}
