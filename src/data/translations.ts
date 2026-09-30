export type Lang = 'es' | 'en'

export interface ServiceItem {
  number: string
  name: string
  tags: string[]
}

export interface Translations {
  nav: {
    home: string; services: string; clients: string; art: string; contact: string
  }
  hero: {
    phrases: string[]
    scrollCta: string
    contactCta: string
    /** Closing frame of the morph */
    final: { line1: string; line2: string; cta: string }
    /** Placeholder captions shown along the logo morph, one entry per beat (lines) */
    captions: string[][]
  }
  servicios: {
    label: string; location: string
    h1: string; h2: string; h3: string; h4: string
    whatLabel: string; body: string
    services: ServiceItem[]
    footer: string
  }
  clientes: { label: string }
  arte: { label: string; works: string; hint: string }
  contactos: { label: string; heading: string; body: string; footer: string }
}

export const translations: Record<Lang, Translations> = {
  es: {
    nav: {
      home: 'Home', services: 'Servicios', clients: 'Clientes', art: 'Arte', contact: 'Contactos',
    },
    hero: {
      phrases: [
        'Hola. Somos 1778Studio.',
        'Una agencia creativa.',
        'Diseñamos experiencias web.',
        'Accesibles, usables y creativas.',
        '¿Hablamos?',
      ],
      scrollCta: 'Scroll para comenzar',
      contactCta: 'Contáctenos',
      final: { line1: '¿ESTÁS LISTO?', line2: 'DISEÑEMOS JUNTOS', cta: 'HABLEMOS' },
      captions: [
        ['DOS OJOS,', 'UNA IDEA.'],
        ['DIVIDIR', 'PARA CONSTRUIR.'],
        ['CADA MÓDULO', 'TIENE SU LUGAR.'],
        ['DISEÑO', 'CON SISTEMA.'],
        ['EXPERIENCIAS WEB', 'BELOW THE LINE'],
      ],
    },
    servicios: {
      label: 'Agencia mundial', location: 'Buenos Aires, Argentina',
      h1: 'Bienvenidos a', h2: '1778Studio.', h3: 'Una agencia', h4: 'multidisciplinaria.',
      whatLabel: 'Qué hacemos',
      body: 'Creamos experiencias digitales, identidades visuales y productos diseñados para elevar marcas a través del diseño, la estrategia y la tecnología. Disciplinas distintas. Una visión compartida.',
      services: [
        { number: '01', name: 'Dirección Creativa',  tags: ['Branding',       'Dirección de Arte'] },
        { number: '02', name: 'Diseño Web',           tags: ['Frontend',       'UX / UI'] },
        { number: '03', name: 'Diseño Digital',       tags: ['Motion',         'Identidad Visual'] },
        { number: '04', name: 'Consultoría UX & UI',  tags: ['Investigación',  'Estrategia'] },
      ],
      footer: 'Más de 10 años desarrollando creatividad, estrategia, arte y usabilidad para empresas.',
    },
    clientes:  { label: 'Clientes frecuentes' },
    arte:      { label: 'Portfolio', works: '2026 trabajos', hint: 'Doble click para abrir · Arrastrar para mover' },
    contactos: {
      label: 'Contacto', heading: 'Hablemos.',
      body:   '¿Tenés un proyecto en mente? Contanos sobre él y trabajemos juntos para hacerlo realidad.',
      footer: '© 2026 1778Studio. Todos los derechos reservados.',
    },
  },

  en: {
    nav: {
      home: 'Home', services: 'Services', clients: 'Clients', art: 'Art', contact: 'Contact',
    },
    hero: {
      phrases: [
        'Hi. We are 1778Studio.',
        'A creative agency.',
        'We design web experiences.',
        'Accessible, usable and creative.',
        "Let's talk?",
      ],
      scrollCta: 'Scroll to begin',
      contactCta: 'Contact us',
      final: { line1: 'ARE YOU READY?', line2: "LET'S DESIGN TOGETHER", cta: "LET'S TALK" },
      captions: [
        ['TWO EYES,', 'ONE IDEA.'],
        ['SPLIT', 'TO BUILD.'],
        ['EVERY MODULE', 'HAS ITS PLACE.'],
        ['DESIGN', 'WITH A SYSTEM.'],
        ['WEB EXPERIENCES', 'BELOW THE LINE'],
      ],
    },
    servicios: {
      label: 'Worldwide agency', location: 'Buenos Aires, Argentina',
      h1: 'Welcome to', h2: '1778Studio.', h3: 'A multidisciplinary', h4: 'agency.',
      whatLabel: 'What we do',
      body: 'We create digital experiences, visual identities and products designed to elevate brands through design, strategy and technology. Different disciplines. One shared vision.',
      services: [
        { number: '01', name: 'Creative Direction',  tags: ['Branding',   'Art Direction']  },
        { number: '02', name: 'Web Design',          tags: ['Frontend',   'UX / UI']        },
        { number: '03', name: 'Digital Design',      tags: ['Motion',     'Visual Identity'] },
        { number: '04', name: 'UX & UI Consulting',  tags: ['Research',   'Strategy']       },
      ],
      footer: 'More than 10 years developing creativity, strategy, art and usability for companies.',
    },
    clientes:  { label: 'Frequent clients' },
    arte:      { label: 'Portfolio', works: '2026 works', hint: 'Double-click to open · Drag to move' },
    contactos: {
      label: 'Contact', heading: "Let's talk.",
      body:   "Have a project in mind? Tell us about it and let's work together to make it happen.",
      footer: '© 2026 1778Studio. All rights reserved.',
    },
  },
}
