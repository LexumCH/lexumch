import { Navigate, useLocation } from 'react-router-dom'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'

/**
 * RootRedirect
 * Gestisce la rotta "/" facendo un redirect alla lingua giusta.
 * Priorità:
 *   1. localStorage (preferenza salvata)
 *   2. navigator.language (lingua del browser)
 *   3. LINGUA_DEFAULT (it)
 * Un segnaposto semplice resta: /privacy#elimina-account → /it/privacy#elimina-account (link di Google Play).
 * Gli altri «#…» (per esempio i token di Supabase) restano fuori, come prima.
 */
export default function RootRedirect({ to = '' }) {
    const { hash } = useLocation()
    const resto = /^#[\w-]+$/.test(hash) ? `${to}${hash}` : to
    // 1. localStorage
    const linguaSalvata = localStorage.getItem('lexum_lingua')
    if (linguaSalvata && LINGUE_SUPPORTATE.includes(linguaSalvata)) {
        return <Navigate to={`/${linguaSalvata}${resto}`} replace />
    }

    // 2. Navigator language (prendi solo i primi 2 caratteri)
    const linguaBrowser = (navigator.language || '').slice(0, 2).toLowerCase()
    if (LINGUE_SUPPORTATE.includes(linguaBrowser)) {
        return <Navigate to={`/${linguaBrowser}${resto}`} replace />
    }

    // 3. Default
    return <Navigate to={`/${LINGUA_DEFAULT}${resto}`} replace />
}