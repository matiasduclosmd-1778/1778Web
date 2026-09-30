import { Hero, Arte, Contactos } from '@/components/sections'
import { useLenis } from '@/hooks/useLenis'
import { useRollingLinks } from '@/hooks/useRollingLinks'

export default function App() {
  useLenis()
  useRollingLinks()

  return (
    <main className="bg-black">
      <Hero />
      <Arte />
      <Contactos />
    </main>
  )
}
