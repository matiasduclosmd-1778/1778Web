/**
 * Projects shown in the Works reel. Names are shown in capitals.
 * Images: 1600 × 1000 WebP (quality ~65–80) in public/projects; other ratios are cropped to fit.
 * `url: '#'` = no link yet (the image is just a hover area).
 */
export type ProjectTag = 'Web' | 'UX' | 'Brand' | 'Motion'

export interface Project {
  name: string
  image: string
  url: string
  /** Chips shown under the name */
  tags: ProjectTag[]
}

export const PROJECTS: Project[] = [
  { name: 'Red Bull 3D Stage', image: '/projects/redbull-3d-stage.webp', url: '#', tags: ['Motion'] },
  { name: 'Byebye Artwork',    image: '/projects/byebye-artwork.webp',   url: '#', tags: ['Motion', 'Brand'] },
  { name: 'Domene Presskit',   image: '/projects/domene-presskit.webp',  url: '#', tags: ['Brand'] },
  { name: 'Bola88 Brandbook',  image: '/projects/bola88-brandbook.webp', url: '#', tags: ['Brand'] },
  { name: 'OhGift Prototype',  image: '/projects/ohgift-prototype.webp', url: '#', tags: ['Web', 'Brand'] },
  { name: 'Halley Brand Guidelines', image: '/projects/halley-brand-guidelines.webp', url: 'https://halleybrandguidelines.vercel.app', tags: ['Brand'] },
  { name: 'MDM Salud',               image: '/projects/mdm-salud.webp',               url: 'https://mdm-salud.vercel.app/index.html', tags: ['Web', 'UX'] },
]
