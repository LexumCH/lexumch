// src/lib/datiFatturazione.jsx
//
// Dati di fatturazione per pagare (28-10-2026), come su Lexum IT. La cassa Tagadapay vuole l'indirizzo
// di fatturazione (almeno il paese, per le tasse): senza, la sua pagina si ferma con un errore. Li
// chiediamo noi prima del pulsante «Paga», sul profilo di Lexum, e il server (tagada-checkout) li passa
// alla cassa già compilati. Stessi campi qui e nel server: se ne cambi uno, cambialo anche là.
// Testi: namespace comp_dati_fatturazione (it/de/fr).

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight } from 'lucide-react'

export const CAMPI_ACQUISTO = ['nome', 'cognome', 'indirizzo', 'cap', 'citta', 'paese']

const pieno = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null

/** I campi che mancano per pagare (vuoto = si può pagare). */
export function mancantiAcquisto(profile) {
    return CAMPI_ACQUISTO.filter(k => !pieno(profile?.[k]))
}

/** Dove si completano: i privati nella loro area, i professionisti nel profilo dello studio. */
export function paginaDatiFatturazione(profile) {
    return profile?.role === 'user' ? '/area/profilo' : '/profilo'
}

/** Il messaggio d'errore nella lingua dell'utente, per i punti di pagamento. */
export function useDatiFatturazione() {
    const { t } = useTranslation('comp_dati_fatturazione')
    const elenco = (mancanti) => mancanti.map(k => t(`campi.${k}`)).join(', ')
    return {
        messaggio: (mancanti) => t('errore', { campi: elenco(mancanti) }),
        elenco,
    }
}

/** Avviso con il collegamento al profilo; non mostra niente se i dati ci sono. */
export function AvvisoDatiFatturazione({ profile, className = '' }) {
    const { t } = useTranslation('comp_dati_fatturazione')
    const mancanti = mancantiAcquisto(profile)
    if (mancanti.length === 0) return null
    return (
        <div id="dati-fatturazione" className={`flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-500/30 ${className}`}>
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
                <p className="font-body text-sm text-nebbia/80 leading-relaxed">
                    {t('testo', { campi: mancanti.map(k => t(`campi.${k}`)).join(' · ') })}
                </p>
                <Link
                    to={paginaDatiFatturazione(profile)}
                    className="inline-flex items-center gap-1.5 font-body text-sm text-oro hover:text-oro/70"
                >
                    {t('link')} <ArrowRight size={13} />
                </Link>
            </div>
        </div>
    )
}
