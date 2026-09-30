import { Hero, Arte, Contactos } from '@/components/sections'
import { DynamicNav, ScrollHint } from '@/components/ui'
import { useLenis } from '@/hooks/useLenis'
import { useRollingLinks } from '@/hooks/useRollingLinks'

export default function App() {
  useLenis()
  useRollingLinks()

  return (
    <main className="bg-black">
      <DynamicNav />
      <ScrollHint />
      <Hero />
      <Arte />
      <Contactos />
    </main>
  )
}
