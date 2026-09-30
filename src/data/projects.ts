/**
 * Projects shown in the Works reel. Names are shown in capitals.
 * Images: 1600 × 1000 WebP (quality ~65–80) in public/projects; other ratios are cropped to fit.
 * `url: '#'` = no link yet (the image is just a hover area).
 */
export interface Project {
  name: string
  image: string
  url: string
}

export const PROJECTS: Project[] = [
  { name: 'Red Bull 3D Stage', image: '/projects/redbull-3d-stage.webp', url: '#' },
  { name: 'Byebye Artwork',    image: '/projects/byebye-artwork.webp',   url: '#' },
  { name: 'Domene Presskit',   image: '/projects/domene-presskit.webp',  url: '#' },
  { name: 'Bola88 Brandbook',  image: '/projects/bola88-brandbook.webp', url: '#' },
  { name: 'OhGift Prototype',  image: '/projects/ohgift-prototype.webp', url: '#' },
]
