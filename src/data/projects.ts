/**
 * Projects shown in the Works reel. Placeholders — swap in the real name, image and link.
 * Images should be landscape (~16:10); any size, they are cropped to fit.
 */
export interface Project {
  name: string
  image: string
  url: string
}

export const PROJECTS: Project[] = [
  { name: 'Name Website', image: 'https://picsum.photos/seed/1778p1/1600/1000', url: '#' },
  { name: 'Brand System', image: 'https://picsum.photos/seed/1778p2/1600/1000', url: '#' },
  { name: 'Motion Reel',  image: 'https://picsum.photos/seed/1778p3/1600/1000', url: '#' },
  { name: 'Atomic Kit',   image: 'https://picsum.photos/seed/1778p4/1600/1000', url: '#' },
]
