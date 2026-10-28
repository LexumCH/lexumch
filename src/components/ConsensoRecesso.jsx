// src/components/ConsensoRecesso.jsx
//
// L'attivazione immediata e il recesso (20-10-2026). Chi compra come privato (ruolo «user») crediti, pacchetti
// o un piano chiede l'attivazione immediata e prende atto di cosa succede al recesso: Termini, punto 4.6 (come
// per Anthropic e OpenAI, entro 14 giorni si rimborsa la parte non usata). Il diritto svizzero non ha il
// recesso per gli acquisti online, ma i consumatori residenti nell'UE sì (direttiva 2011/83/UE).
//
// Dal 28-10-2026 niente casella da spuntare a ogni acquisto (deciso da Antonino, come su Lexum IT): come
// Amazon e Google Play, il pulsante che paga si chiama «Paga e attiva subito» e la frase sul recesso sta lì
// accanto. Il clic è la richiesta esplicita per quell'acquisto; viaggia con la richiesta di pagamento
// (consenso_recesso), il server la registra e la ricevuta la conferma.

import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'

export function useConsensoRecesso() {
    const { profile } = useAuth()
    const { t } = useTranslation('comp_consenso_recesso')
    const richiesto = profile?.role === 'user'
    return {
        richiesto,
        // la richiesta è il clic sul pulsante: non c'è più nulla da spuntare prima
        ok: true,
        // da aggiungere al corpo della richiesta di pagamento
        campo: richiesto ? { consenso_recesso: true } : {},
        errore: t('errore'),
        /** Il testo del pulsante che paga: per i privati dice che l'acquisto si attiva subito. */
        pulsante: (normale) => (richiesto ? t('pulsante') : normale),
    }
}

export default function ConsensoRecesso({ consenso, className = '' }) {
    const { t, i18n } = useTranslation('comp_consenso_recesso')
    if (!consenso?.richiesto) return null
    const lingua = ['it', 'de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    return (
        <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${className}`}>
            {t('testo_a')}
            <a href={`/${lingua}/termini`} target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 underline">
                {t('link')}
            </a>
            {t('testo_b')}
        </p>
    )
}
