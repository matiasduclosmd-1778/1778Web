import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Lang, type Translations, translations } from '@/data/translations'

interface LangContextValue {
  lang: Lang
  t: Translations
  toggle: () => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es')
  const toggle = () => setLang(l => (l === 'es' ? 'en' : 'es'))
  // Screen readers and translators read the page in the language on screen
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  return (
    <LangContext.Provider value={{ lang, toggle, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
