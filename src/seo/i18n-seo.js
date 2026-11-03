// src/seo/i18n-seo.js
//
// Le traduzioni per il build del testo già pronto (entry-seo.jsx): tutte subito, senza rete.
// Nel sito invece arrivano dalla rete (src/i18n/index.js).
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const FILE = import.meta.glob('/public/locales/*/*.json', { eager: true, import: 'default' })
const resources = {}
for (const [percorso, contenuto] of Object.entries(FILE)) {
    const m = percorso.match(/locales\/([^/]+)\/([^/]+)\.json$/)
    if (m) (resources[m[1]] ??= {})[m[2]] = contenuto
}

i18n.use(initReactI18next).init({
    lng: 'it',
    fallbackLng: 'it',
    supportedLngs: ['it', 'de', 'fr'],
    resources,
    ns: Object.keys(resources.it ?? {}),
    defaultNS: 'common',
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
})

export default i18n
