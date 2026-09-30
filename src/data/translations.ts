export type Lang = 'es' | 'en'

export interface Translations {
  nav: {
    home: string; works: string; contact: string
  }
  /** Floating cue shown while there is more page below */
  scrollHint: string
  hero: {
    phrases: string[]
    scrollCta: string
    contactCta: string
    /** Closing frame of the morph */
    final: { line1: string; line2: string; cta: string }
    /** Placeholder captions shown along the logo morph, one entry per beat (lines) */
    captions: string[][]
    /** Label on the pill the pixel hand drops on the "8" */
    effectLabel: string
    /** Lateral scene after the closing frame: "<prefix> <item>", the item flipping in a loop */
    lateral: { prefix: string; items: string[]; services: string[] }
  }
  clientes: { label: string }
  contactos: { label: string; heading: string; body: string; instagram: string; footer: string }
}

export const translations: Record<Lang, Translations> = {
  es: {
    nav: {
      home: 'Home', works: 'Works', contact: 'Contact',
    },
    scrollHint: 'Continuá scrolleando',
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
      effectLabel: 'aberración cromática',
      lateral: {
        prefix: 'Desarrollamos',
        items: ['sistemas de diseño', 'ideas ganadoras', 'conceptos', 'frontEnd creativo'],
        services: ['UX & UI', 'Branding', 'Multimedia works', 'Atomic systems'],
      },
    },
    clientes:  { label: 'Clientes frecuentes' },
    contactos: {
      label: 'Contacto', heading: 'Hablemos.',
      body:   '¿Tenés un proyecto en mente? Contanos sobre él y trabajemos juntos para hacerlo realidad.',
      instagram: 'Seguinos en Instagram',
      footer: '© 2026 1778Studio. Todos los derechos reservados.',
    },
  },

  en: {
    nav: {
      home: 'Home', works: 'Works', contact: 'Contact',
    },
    scrollHint: 'Keep scrolling',
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
      effectLabel: 'chromatic aberration',
      lateral: {
        prefix: 'We develop',
        items: ['design systems', 'winning ideas', 'concepts', 'creative front-end'],
        services: ['UX & UI', 'Branding', 'Multimedia works', 'Atomic systems'],
      },
    },
    clientes:  { label: 'Frequent clients' },
    contactos: {
      label: 'Contact', heading: "Let's talk.",
      body:   "Have a project in mind? Tell us about it and let's work together to make it happen.",
      instagram: 'Follow us on Instagram',
      footer: '© 2026 1778Studio. All rights reserved.',
    },
  },
}
