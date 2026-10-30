// L'app sul telefono (30-10-2026, come su lexum.it): l'app Android è pubblicata su Google Play (una sola app
// per Italia e Svizzera, si sceglie il paese all'avvio); l'iPhone è ancora in revisione da Apple, quindi per
// l'App Store solo la scritta «presto» (il badge di Apple si usa solo quando l'app c'è).
// L'immagine del badge è quella ufficiale di Google, nella lingua della pagina, presa dal suo indirizzo.
import { useTranslation } from 'react-i18next'

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=ch.lexum.app'
const BADGE_PLAY = {
    it: 'https://play.google.com/intl/it_it/badges/static/images/badges/it_badge_web_generic.png',
    de: 'https://play.google.com/intl/de_de/badges/static/images/badges/de_badge_web_generic.png',
    fr: 'https://play.google.com/intl/fr_fr/badges/static/images/badges/fr_badge_web_generic.png',
}
const linguaDi = (l) => (['de', 'fr'].includes(String(l).slice(0, 2)) ? String(l).slice(0, 2) : 'it')

export default function BadgeApp({ altezza = 'h-14', allinea = 'items-center', className = '' }) {
    const { t, i18n } = useTranslation('common')
    return (
        <div className={`flex flex-col ${allinea} gap-1 ${className}`}>
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label={t('app.aria')}>
                <img src={BADGE_PLAY[linguaDi(i18n.language)]} alt={t('app.badge_alt')} className={`${altezza} w-auto`} loading="lazy" />
            </a>
            <span className="font-body text-xs text-nebbia/30">{t('app.presto_iphone')}</span>
        </div>
    )
}

// Il logo di Google Play, piccolo, accanto al testo (stessi quattro colori del logo ufficiale)
function LogoPlay({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0">
            <path fill="#4285F4" d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1 9.8-9.8v-.2L3.7 1.7z" />
            <path fill="#FBBC04" d="M16.8 15.8l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-3.9 2.2h-.1z" />
            <path fill="#EA4335" d="M16.9 15.7l-3.4-3.4-10 10c.4.4 1 .4 1.7.1l11.7-6.7" />
            <path fill="#34A853" d="M16.9 8.9 5.2 2.2c-.7-.4-1.3-.3-1.7.1l10 10 3.4-3.4z" />
        </svg>
    )
}

// La riga piccola sotto i pulsanti della home: logo di Google Play e invito a scaricare l'app.
export function LinkApp({ className = '' }) {
    const { t } = useTranslation('common')
    return (
        <a href={PLAY_URL} target="_blank" rel="noopener noreferrer"
            className={`group inline-flex items-center gap-2.5 font-body text-sm text-nebbia/45 hover:text-oro transition-colors ${className}`}>
            <LogoPlay />
            <span>{t('app.riga')}</span>
            <span className="text-xs text-nebbia/25 group-hover:text-oro/60">· {t('app.riga_iphone')}</span>
        </a>
    )
}
