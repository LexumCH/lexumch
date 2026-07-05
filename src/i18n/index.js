import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export const LINGUE_SUPPORTATE = ['it', 'de', 'fr']
export const LINGUA_DEFAULT = 'it'

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: LINGUA_DEFAULT,
        supportedLngs: LINGUE_SUPPORTATE,

        // Precarica i namespace "chrome" sempre visibili (vetrina + layout/sidebar + shared).
        // I namespace delle singole pagine/componenti dell'app si caricano on-demand via useTranslation(ns).
        ns: [
            'common', 'home', 'archivio_demo', 'lex_demo', 'per_avvocati', 'contatti', 'lex_ai', 'per_fiduciari', 'privacy', 'termini', 'auth',
            'comp_layout_avvocato', 'comp_layout_user', 'comp_layout_fiduciario', 'comp_layout_progettista', 'comp_layout_cliente', 'comp_shared', 'comp_notifiche', 'comp_footer',
            'istituzioni',
        ],
        defaultNS: 'common',

        // Precarica le risorse anche per le lingue non attive (cache)
        preload: LINGUE_SUPPORTATE,

        // Aspetta che le risorse siano caricate prima di emettere "initialized"
        partialBundledLanguages: false,

        detection: {
            order: ['path', 'localStorage', 'navigator'],
            lookupFromPathIndex: 0,
            caches: ['localStorage'],
            lookupLocalStorage: 'lexum_lingua',
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        interpolation: {
            escapeValue: false,
        },

        react: {
            useSuspense: false,                  // NIENTE suspense
            bindI18n: 'languageChanged loaded',  // re-render anche al "loaded"
            bindI18nStore: 'added removed',      // re-render quando nuove risorse arrivano
        },
    })

// DEBUG: esponi i18n a window
if (typeof window !== 'undefined') {
    window.i18n = i18n
}

export default i18n