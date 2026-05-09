import type { FileItem } from '@/types'

export const FILES: FileItem[] = [
  { id: '1', name: 'Campaign_2024.jpg',  seed: 'pf1art', left: '3%',  top: '5%',  rotation: -1.5 },
  { id: '2', name: 'Brand_Identity.jpg', seed: 'pf2art', left: '22%', top: '16%', rotation: 2    },
  { id: '3', name: 'UI_Design_01.jpg',   seed: 'pf3art', left: '42%', top: '4%',  rotation: -0.8 },
  { id: '4', name: 'Motion_Reel.jpg',    seed: 'pf4art', left: '60%', top: '10%', rotation: 1.3  },
  { id: '5', name: 'Web_Project.jpg',    seed: 'pf5art', left: '78%', top: '3%',  rotation: -2   },
  { id: '6', name: 'Editorial_01.jpg',   seed: 'pf6art', left: '4%',  top: '53%', rotation: 1.8  },
  { id: '7', name: 'Poster_Series.jpg',  seed: 'pf7art', left: '28%', top: '48%', rotation: -1   },
  { id: '8', name: 'Brand_Film.jpg',     seed: 'pf8art', left: '50%', top: '55%', rotation: 2.5  },
  { id: '9', name: 'Identity_Kit.jpg',   seed: 'pf9art', left: '72%', top: '46%', rotation: -1.5 },
]

export const thumb = (seed: string) => `https://picsum.photos/seed/${seed}/280/210`
export const full  = (seed: string) => `https://picsum.photos/seed/${seed}/1200/900`
