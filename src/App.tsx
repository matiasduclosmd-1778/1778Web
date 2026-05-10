import { Hero, Servicios, Clientes, Arte, Contactos } from '@/components/sections'
import { useLenis } from '@/hooks/useLenis'

export default function App() {
  useLenis()

  return (
    <main className="bg-black">
      <Hero />
      <Servicios />
      <Clientes />
      <Arte />
      <Contactos />
    </main>
  )
}
