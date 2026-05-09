import { Hero, Servicios, Clientes, Arte, Contactos } from '@/components/sections'

export default function App() {
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
