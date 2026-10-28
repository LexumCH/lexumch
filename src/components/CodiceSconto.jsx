// src/components/CodiceSconto.jsx
//
// Codice sconto alla cassa (28-10-2026, come su Lexum IT). I codici li crea l'admin (admin → Codici
// sconto) con la percentuale e le condizioni; qui chi compra lo scrive, il database dice per quali dei
// prodotti in pagina vale (verifica_codice_sconto) e i prezzi si aggiornano. Il prezzo vero lo decide
// comunque il server alla cassa (tagada-checkout), che riverifica il codice.
// «Richiedi il tuo codice» apre un ticket di assistenza con oggetto e messaggio già scritti: l'admin
// decide a chi mandarlo. Testi in public/locales/{it,de,fr}/comp_codice_sconto.json.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Tag, Loader2 } from 'lucide-react'

const chf = (n) => `CHF ${Number(n).toFixed(2)}`

/** Lo stato del codice per i prodotti di una pagina (id dei prodotti che si possono comprare lì). */
export function useCodiceSconto(prodottiIds) {
    const { t } = useTranslation('comp_codice_sconto')
    const [testo, setTesto] = useState('')
    const [applicato, setApplicato] = useState(null) // { codice, percentuale, prodotti: Set }
    const [errore, setErrore] = useState('')
    const [verificando, setVerificando] = useState(false)

    async function applica() {
        const codice = testo.trim().toUpperCase()
        if (!codice) return
        setVerificando(true)
        setErrore('')
        const ids = (prodottiIds ?? []).filter(Boolean)
        const { data, error } = await supabase.rpc('verifica_codice_sconto', { p_codice: codice, p_prodotti: ids })
        setVerificando(false)
        if (error) { setErrore(t('errore_verifica')); return }
        if (!data?.valido) { setApplicato(null); setErrore(t(`motivi.${data?.motivo ?? 'inesistente'}`, { defaultValue: t('motivi.inesistente') })); return }
        setApplicato({ codice: data.codice, percentuale: Number(data.percentuale), prodotti: new Set(data.prodotti ?? []) })
    }

    function togli() {
        setApplicato(null)
        setTesto('')
        setErrore('')
    }

    return {
        testo, setTesto, applicato, errore, verificando, applica, togli,
        /** Il prezzo con lo sconto, o null se il codice non vale per quel prodotto. */
        prezzo(prodottoId, importo) {
            if (!applicato?.prodotti.has(prodottoId)) return null
            return Math.round(Number(importo) * (100 - applicato.percentuale)) / 100
        },
        /** Da aggiungere al corpo della richiesta a tagada-checkout per quel prodotto. */
        campo(prodottoId) {
            return applicato?.prodotti.has(prodottoId) ? { codice_sconto: applicato.codice } : {}
        },
    }
}

/** Un prezzo in franchi, barrato col nuovo accanto quando c'è lo sconto. */
export function PrezzoScontato({ prezzo, scontato }) {
    if (scontato == null) return <>CHF {prezzo}</>
    return (
        <>
            <span className="line-through opacity-40 text-[0.6em] mr-2 align-middle">CHF {prezzo}</span>
            {chf(scontato)}
        </>
    )
}

/** Il campo del codice, con «Richiedi il tuo codice». */
export default function CodiceSconto({ sconto, perProdotto, conTitolo = false, className = '' }) {
    const { t, i18n } = useTranslation('comp_codice_sconto')
    const { profile } = useAuth()
    const nuovoTicket = profile?.role === 'user' ? '/area/assistenza/nuovo' : '/assistenza/nuovo'
    const richiesta = new URLSearchParams({
        oggetto: t('ticket_oggetto'),
        messaggio: perProdotto ? t('ticket_messaggio_per', { prodotto: perProdotto }) : t('ticket_messaggio'),
    })

    if (sconto.applicato) {
        const percentuale = sconto.applicato.percentuale.toLocaleString(i18n.language === 'de' ? 'de-CH' : i18n.language === 'fr' ? 'fr-CH' : 'it-CH')
        return (
            <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
                <p className="flex items-center gap-2 font-body text-xs text-salvia">
                    <Tag size={13} />
                    {t('applicato', { codice: sconto.applicato.codice, percentuale })}
                </p>
                <button onClick={sconto.togli} className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">
                    {t('togli')}
                </button>
            </div>
        )
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {conTitolo && <p className="section-label">{t('titolo')}</p>}
            <div className="flex gap-2">
                <input
                    value={sconto.testo}
                    onChange={e => sconto.setTesto(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') sconto.applica() }}
                    placeholder={t('placeholder')}
                    aria-label={t('placeholder')}
                    maxLength={30}
                    className="flex-1 min-w-0 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25 tracking-wider uppercase"
                />
                <button
                    onClick={sconto.applica}
                    disabled={!sconto.testo.trim() || sconto.verificando}
                    className="btn-secondary text-sm shrink-0 disabled:opacity-40"
                >
                    {sconto.verificando ? <Loader2 size={14} className="animate-spin" /> : t('applica')}
                </button>
            </div>
            {sconto.errore && <p className="font-body text-xs text-red-400">{sconto.errore}</p>}
            <Link to={`${nuovoTicket}?${richiesta}`} className="inline-block font-body text-xs text-oro hover:text-oro/70 transition-colors">
                {t('richiedi')}
            </Link>
        </div>
    )
}
