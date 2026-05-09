const LOGOS = [
  { name: 'BNA',    src: '/clientes/bna-logo.png'    },
  { name: 'Bola',   src: '/clientes/bola-logo.png'   },
  { name: 'Freres', src: '/clientes/freres-logo.png' },
  { name: 'RB',     src: '/clientes/rb-logo.png'     },
  { name: 'Viamo',  src: '/clientes/viamo-logo.png'  },
]

// Dos copias: la animación mueve -50% del total → loop perfecto sin salto
const TRACK = [...LOGOS, ...LOGOS]

export default function Clientes() {
  return (
    <section id="clientes" className="bg-black py-16">

      <p className="text-center text-primary text-[10px] sm:text-xs tracking-widest uppercase mb-10 px-4">
        Clientes frecuentes
      </p>

      {/* Fade en los bordes */}
      <div
        className="overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        {/* Track — usa inline style para garantizar la animación */}
        <div
          style={{
            display: 'flex',
            width: 'max-content',
            animation: 'marquee 20s linear infinite',
          }}
        >
          {TRACK.map((logo, i) => (
            <div
              key={i}
              style={{
                width: 130,
                height: 48,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 48px',
              }}
            >
              <img
                src={logo.src}
                alt={logo.name}
                className="max-w-full max-h-full object-contain brightness-0 invert opacity-50 hover:opacity-100 transition-opacity duration-300"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
