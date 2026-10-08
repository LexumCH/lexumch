// src/components/CompilaDocumentoLex.jsx
//
// 08-10-2026: «Compila con i dati di una pratica» (avvocati) e «di un mandato» (fiduciari) per i documenti
// scritti da Lex. Versione CH di quella IT, in tre lingue (namespace comp_documento_lex). Si sceglie la pratica o il mandato; il sito legge i dati con l'accesso
// dell'utente, la funzione lex-compila-documento dice quali segnaposto si completano con quali dati
// (senza vederne i valori) e qui si mettono i valori. Dentro una pratica o un mandato la scelta non
// serve: `corrente` ({ id, titolo }) è già quello giusto.

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderInput, Loader2, Search, X } from 'lucide-react'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { elencoPratiche, elencoMandati, datiPratica, datiMandato, abbinaSegnaposti, nomeCliente } from '@/lib/documento/caricaDatiCompilazione'

// Chi può compilare: l'avvocato con le sue pratiche, il fiduciario con i suoi mandati
export const RUOLI_COMPILAZIONE = ['avvocato', 'fiduciario']

export default function CompilaDocumentoLex({ ruolo, profilo, numerati, segnaposti, corrente = null, onCompilato, classePulsante }) {
    const { t, i18n } = useTranslation('comp_documento_lex')
    const lingua = ['de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    const MSG_ERRORE = t('compila.errore')
    const testiErrore = {
        errore: MSG_ERRORE, sessione: t('compila.sessione'), lettura: t('compila.lettura'),
        non_trovata: t('compila.non_trovata'), non_trovato_mandato: t('compila.non_trovato_mandato'),
    }
    const ambito = ruolo === 'fiduciario' ? 'mandato' : 'pratica'
    const [aperto, setAperto] = useState(false)
    const [elenco, setElenco] = useState(null)
    const [cerca, setCerca] = useState('')
    const [lavoro, setLavoro] = useState(null)      // id della pratica o del mandato in compilazione
    const [errore, setErrore] = useState('')
    const [avviso, setAvviso] = useState('')

    useEffect(() => {
        if (!aperto || elenco) return
        let vivo = true
        ;(ambito === 'mandato' ? elencoMandati(testiErrore) : elencoPratiche(testiErrore))
            .then((righe) => { if (vivo) setElenco(righe) })
            .catch((e) => { if (vivo) { setErrore(sanitizzaErrore(e, MSG_ERRORE) ?? MSG_ERRORE); setElenco([]) } })
        return () => { vivo = false }
    }, [aperto, elenco, ambito])

    const visibili = useMemo(() => {
        const q = cerca.trim().toLowerCase()
        const righe = elenco ?? []
        return q ? righe.filter((r) => `${r.titolo ?? ''} ${nomeCliente(r.cliente)}`.toLowerCase().includes(q)) : righe
    }, [elenco, cerca])

    async function compila(voce) {
        setErrore('')
        setAvviso('')
        setLavoro(voce.id)
        try {
            const opzioni = { profilo, lingua, titoloAvvocato: t('carta.titolo_avvocato'), messaggi: testiErrore }
            const dati = ambito === 'mandato' ? await datiMandato(voce.id, opzioni) : await datiPratica(voce.id, opzioni)
            const { valori, gruppi } = await abbinaSegnaposti({ ambito, numerati, segnaposti, dati, lingua, messaggi: testiErrore })
            if (!gruppi.length) {
                setAvviso(t(ambito === 'mandato' ? 'compila.nessun_dato_mandato' : 'compila.nessun_dato_pratica'))
                return
            }
            onCompilato({ valori, gruppi, origine: { ambito, id: voce.id, titolo: voce.titolo } })
            setAperto(false)
        } catch (e) {
            setErrore(sanitizzaErrore(e, MSG_ERRORE) ?? MSG_ERRORE)
        } finally {
            setLavoro(null)
        }
    }

    const icona = (attivo) => (attivo ? <Loader2 size={12} className="animate-spin" /> : <FolderInput size={12} />)
    const messaggi = (
        <>
            {lavoro && <p className="font-body text-xs text-nebbia/50">{t('compila.in_corso')}</p>}
            {avviso && <p className="font-body text-xs text-nebbia/60">{avviso}</p>}
            {errore && <p className="font-body text-xs text-red-400/80">{errore}</p>}
        </>
    )

    // Dentro la pratica o il mandato: un solo pulsante, nessuna scelta
    if (corrente) {
        return (
            <div className="space-y-1.5">
                <button type="button" onClick={() => compila(corrente)} disabled={!!lavoro} className={classePulsante}>
                    {icona(!!lavoro)} {t(ambito === 'mandato' ? 'compila.questo_mandato' : 'compila.questa_pratica')}
                </button>
                {messaggi}
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            <button type="button" onClick={() => setAperto((v) => !v)} disabled={!!lavoro} className={classePulsante}>
                {icona(!!lavoro)} {t(ambito === 'mandato' ? 'compila.con_mandato' : 'compila.con_pratica')}
            </button>
            {aperto && (
                <div className="border border-white/10 bg-petrolio/40 p-3 space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 border border-white/10 px-2 py-1">
                            <Search size={12} className="text-nebbia/40" />
                            <input
                                value={cerca}
                                onChange={(e) => setCerca(e.target.value)}
                                placeholder={t(ambito === 'mandato' ? 'compila.cerca_mandato' : 'compila.cerca_pratica')}
                                className="flex-1 bg-transparent font-body text-xs text-nebbia placeholder:text-nebbia/30 outline-none"
                            />
                        </div>
                        <button type="button" onClick={() => setAperto(false)} aria-label={t('compila.chiudi')} className="text-nebbia/40 hover:text-oro">
                            <X size={14} />
                        </button>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/40">
                        {t(ambito === 'mandato' ? 'compila.spiegazione_mandato' : 'compila.spiegazione_pratica')}
                    </p>
                    {elenco === null ? (
                        <p className="flex items-center gap-1.5 font-body text-xs text-nebbia/50"><Loader2 size={12} className="animate-spin" /> {t('compila.carico')}</p>
                    ) : visibili.length === 0 ? (
                        <p className="font-body text-xs text-nebbia/50">
                            {cerca ? t('compila.nessun_risultato') : t(ambito === 'mandato' ? 'compila.nessun_mandato' : 'compila.nessuna_pratica')}
                        </p>
                    ) : (
                        <ul className="max-h-64 overflow-y-auto divide-y divide-white/5">
                            {visibili.map((r) => (
                                <li key={r.id}>
                                    <button type="button" onClick={() => compila(r)} disabled={!!lavoro}
                                        className="w-full text-left px-2 py-1.5 hover:bg-white/5 disabled:opacity-50 flex items-center gap-2">
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-body text-xs text-nebbia/80 truncate">{r.titolo || t('compila.senza_titolo')}</span>
                                            <span className="block font-body text-[11px] text-nebbia/40 truncate">
                                                {[nomeCliente(r.cliente), r.anno_riferimento].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                        {lavoro === r.id && <Loader2 size={12} className="animate-spin text-oro shrink-0" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {messaggi}
        </div>
    )
}
