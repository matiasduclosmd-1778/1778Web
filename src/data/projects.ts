/**
 * Projects shown in the Works reel. Names are shown in capitals.
 * Images: 1600 × 1000 WebP (quality ~65–80) in public/projects; other ratios are cropped to fit.
 * `url: '#'` = no link yet (the image is just a hover area).
 * Order = order in the reel: Web & UX first, then Brand, then Motion.
 */
export type ProjectTag = 'Web' | 'UX' | 'Brand' | 'Motion'

export interface Project {
  name: string
  image: string
  url: string
  /** Used by the Works filter tabs */
  tags: ProjectTag[]
}

export const PROJECTS: Project[] = [
  { name: 'Halley Brand Guidelines', image: '/projects/halley-brand-guidelines.webp', url: 'https://halleybrandguidelines.vercel.app', tags: ['Web', 'Brand'] },
  { name: 'MDM Salud',               image: '/projects/mdm-salud.webp',               url: 'https://mdm-salud.vercel.app/index.html', tags: ['Web', 'UX'] },
  { name: 'OhGift Prototype',        image: '/projects/ohgift-prototype.webp',        url: '#', tags: ['Web', 'Brand'] },
  { name: 'Domene Presskit',         image: '/projects/domene-presskit.webp',         url: '#', tags: ['Brand'] },
  { name: 'Bola88 Brandbook',        image: '/projects/bola88-brandbook.webp',        url: '#', tags: ['Brand'] },
  { name: 'Byebye Artwork',          image: '/projects/byebye-artwork.webp',          url: '#', tags: ['Brand', 'Motion'] },
  { name: 'Red Bull 3D Stage',       image: '/projects/redbull-3d-stage.webp',        url: '#', tags: ['Motion'] },
]

/** Works filter tabs ("all" shows everything; its label comes from the translations) */
export type WorksFilter = 'all' | 'webux' | 'brand' | 'motion'

export const WORKS_FILTERS: { id: WorksFilter; label?: string; tags: ProjectTag[] }[] = [
  { id: 'all', tags: [] },
  { id: 'webux', label: 'Web & UX', tags: ['Web', 'UX'] },
  { id: 'brand', label: 'Brand', tags: ['Brand'] },
  { id: 'motion', label: 'Motion', tags: ['Motion'] },
]

export function projectsFor(filter: WorksFilter): Project[] {
  const f = WORKS_FILTERS.find((x) => x.id === filter)
  if (!f || f.id === 'all') return PROJECTS
  return PROJECTS.filter((p) => p.tags.some((t) => f.tags.includes(t)))
}
