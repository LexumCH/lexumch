import { Navigate } from 'react-router-dom'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'

/**
 * RootRedirect
 * Gestisce la rotta "/" facendo un redirect alla lingua giusta.
 * Priorità:
 *   1. localStorage (preferenza salvata)
 *   2. navigator.language (lingua del browser)
 *   3. LINGUA_DEFAULT (it)
 */
export default function RootRedirect({ to = '' }) {
    // 1. localStorage
    const linguaSalvata = localStorage.getItem('lexum_lingua')
    if (linguaSalvata && LINGUE_SUPPORTATE.includes(linguaSalvata)) {
        return <Navigate to={`/${linguaSalvata}${to}`} replace />
    }

    // 2. Navigator language (prendi solo i primi 2 caratteri)
    const linguaBrowser = (navigator.language || '').slice(0, 2).toLowerCase()
    if (LINGUE_SUPPORTATE.includes(linguaBrowser)) {
        return <Navigate to={`/${linguaBrowser}${to}`} replace />
    }

    // 3. Default
    return <Navigate to={`/${LINGUA_DEFAULT}${to}`} replace />
}