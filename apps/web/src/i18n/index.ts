import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import nb from './locales/nb.json'

void i18n.use(initReactI18next).init({
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  lng: 'nb',
  fallbackLng: 'nb',
  interpolation: { escapeValue: false },
})

export default i18n
