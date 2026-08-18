import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import nb from './locales/nb.json'

const STORAGE_KEY = 'inknova-lang'

function readSavedLanguage(): 'nb' | 'en' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved?.startsWith('en')) return 'en'
    if (saved?.startsWith('nb')) return 'nb'
  } catch {
    // ignore unavailable storage
  }
  return 'nb'
}

function persistLanguage(lng: string) {
  const lang = lng.startsWith('en') ? 'en' : 'nb'
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore unavailable storage
  }
  document.documentElement.lang = lang
}

const initialLng = readSavedLanguage()

void i18n.use(initReactI18next).init({
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  lng: initialLng,
  fallbackLng: 'nb',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = initialLng
i18n.on('languageChanged', persistLanguage)

export default i18n
