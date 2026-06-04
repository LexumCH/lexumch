import { useEffect } from 'react'
import { useParams, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'

/**
 * LanguageWrapper
 * Wrapper che legge il parametro :lang dall'URL e lo applica a i18next.
 * Hooks chiamati SEMPRE prima di qualsiasi return condizionale.
 */
export default function LanguageWrapper({ children }) {
    const { lang } = useParams()
    const { i18n } = useTranslation()
    const location = useLocation()

    const linguaValida = LINGUE_SUPPORTATE.includes(lang)

    // ⚠️ useEffect deve essere chiamato SEMPRE, prima di qualsiasi return
    useEffect(() => {
        if (linguaValida && i18n.language !== lang) {
            i18n.changeLanguage(lang)
            localStorage.setItem('lexum_lingua', lang)
        }
    }, [lang, linguaValida, i18n])

    // Se lingua invalida → redirect (DOPO l'useEffect)
    if (!linguaValida) {
        const pathSenzaLingua = location.pathname.replace(/^\/[^/]+/, '')
        return <Navigate to={`/${LINGUA_DEFAULT}${pathSenzaLingua}${location.search}`} replace />
    }

    return children
}