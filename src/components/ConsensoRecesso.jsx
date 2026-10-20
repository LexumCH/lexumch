// src/components/ConsensoRecesso.jsx
//
// La casella del recesso (20-10-2026). Chi compra come privato (ruolo «user») crediti, pacchetti o un piano
// chiede l'attivazione immediata e prende atto di cosa succede al recesso: Termini, punto 4.6 (come per
// Anthropic e OpenAI, entro 14 giorni si rimborsa la parte non usata). Il diritto
// svizzero non ha il recesso per gli acquisti online, ma i consumatori residenti nell'UE sì (direttiva
// 2011/83/UE). Senza la spunta il pagamento non parte; la scelta viaggia con la richiesta di pagamento
// (consenso_recesso), così il server la registra e la ricevuta la conferma.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'

export function useConsensoRecesso() {
    const { profile } = useAuth()
    const { t } = useTranslation('comp_consenso_recesso')
    const richiesto = profile?.role === 'user'
    const [dato, setDato] = useState(false)
    return {
        richiesto,
        dato,
        setDato,
        ok: !richiesto || dato,
        // da aggiungere al corpo della richiesta di pagamento
        campo: richiesto ? { consenso_recesso: true } : {},
        errore: t('errore'),
    }
}

export default function ConsensoRecesso({ consenso, className = '' }) {
    const { t, i18n } = useTranslation('comp_consenso_recesso')
    if (!consenso?.richiesto) return null
    const lingua = ['it', 'de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    return (
        <label className={`flex items-start gap-3 cursor-pointer select-none ${className}`}>
            <input
                type="checkbox"
                checked={consenso.dato}
                onChange={e => consenso.setDato(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#C9A45C] cursor-pointer"
            />
            <span className="font-body text-xs text-nebbia/60 leading-relaxed">
                {t('testo_a')}
                <a href={`/${lingua}/termini`} target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 underline">
                    {t('link')}
                </a>
                {t('testo_b')}
            </span>
        </label>
    )
}
