// Il pallino ambra dei menu: ci sono conversazioni che aspettano la tua risposta.
// `className` serve a posizionarlo (es. sul pulsante del menu del telefono).

import { useTranslation } from 'react-i18next'

export default function PallinoTicket({ n, className = '' }) {
    const { t } = useTranslation('common')
    if (!n) return null
    const testo = t('pallino_da_rispondere', { count: n })
    return (
        <span className={`w-2 h-2 rounded-full bg-amber-400 shrink-0 ${className}`} title={testo} aria-label={testo} />
    )
}
