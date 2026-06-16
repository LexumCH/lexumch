// src/components/fiduciario/AssegnaMovimento.jsx
//
// Tag "entrata/uscita" da apporre a un documento d'archivio. Vive accanto ad
// AssegnaDocumento nelle card documenti e nel dettaglio documento.
//
// Flusso (come definito col cliente):
//   1. il documento deve avere già un MANDATO assegnato (via AssegnaDocumento);
//      finché non ce l'ha, il tag è disabilitato.
//   2. clicco "Entrata" o "Uscita" → l'edge `estrai-movimento` legge il
//      testo_estratto GIÀ presente, ne ricava l'importo e CREA il record nel
//      mandato (origine='ocr', verificato=false → badge "da verificare").
//   3. se manca il testo o l'importo non è leggibile → fallback su inserimento
//      manuale (FormMovimento) precompilato. Niente vicoli ciechi.
//
// L'importo NON sta sul documento: sta sul movimento creato. Questo componente
// è solo il grilletto + la vista dei movimenti collegati a questo documento.
//
// Props:
//   doc           - documento d'archivio (serve id, mandato_id, cliente_id, titolo)
//   onAggiornato  - callback opzionale (ricarica la lista nel parent)

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Loader2, X, ShieldAlert, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import FormMovimento from './FormMovimento'

function fmtCHFbreve(n) {
    return `CHF ${Number(n || 0).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AssegnaMovimento({ doc, onAggiornato }) {
    const { t } = useTranslation('comp_fid_assegna_movimento')
    const { role } = useAuth()
    const [movimenti, setMovimenti] = useState([])
    const [estraendo, setEstraendo] = useState(null)   // 'entrata' | 'uscita' | null
    const [errore, setErrore] = useState('')
    const [formManuale, setFormManuale] = useState(null) // { tipo, valoriIniziali } | null

    const haMandato = !!doc?.mandato_id

    useEffect(() => { caricaMovimenti() }, [doc?.id])

    async function caricaMovimenti() {
        if (role !== 'fiduciario' || !doc?.id) return
        const { data, error } = await supabase
            .from('movimenti')
            .select('id, tipo, importo, verificato, origine')
            .eq('documento_id', doc.id)
        // tabella assente (migration non applicata) → semplicemente nessun tag
        if (!error) setMovimenti(data ?? [])
    }

    async function tagga(tipo) {
        setErrore('')
        setEstraendo(tipo)
        const { data, error } = await supabase.functions.invoke('estrai-movimento', {
            body: { documento_id: doc.id, tipo, mandato_id: doc.mandato_id },
        })
        setEstraendo(null)

        // Errore di funzione/HTTP → non blocchiamo: apri l'inserimento manuale
        if (error) {
            setFormManuale({ tipo, valoriIniziali: { documento_id: doc.id } })
            return
        }
        if (data?.ok && data.movimento) {
            setMovimenti(prev => [...prev, data.movimento])
            if (onAggiornato) onAggiornato()
        } else if (data?.needs_manual) {
            setFormManuale({
                tipo,
                valoriIniziali: {
                    documento_id: doc.id,
                    descrizione: data.suggeriti?.descrizione,
                    data: data.suggeriti?.data,
                },
            })
        } else {
            setErrore(data?.error ?? t('errori.estrazione_fallita'))
        }
    }

    async function scollega(m) {
        await supabase.from('movimenti').delete().eq('id', m.id)
        setMovimenti(prev => prev.filter(x => x.id !== m.id))
        if (onAggiornato) onAggiornato()
    }

    // Feature fiduciaria: per gli altri ruoli il tag non compare.
    if (role !== 'fiduciario') return null

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Movimenti già collegati a questo documento */}
            {movimenti.map(m => {
                const eEntrata = m.tipo === 'entrata'
                const cls = eEntrata
                    ? 'bg-salvia/10 border-salvia/30 text-salvia'
                    : 'bg-oro/10 border-oro/30 text-oro'
                return (
                    <span key={m.id} className={`group/chip flex items-center gap-1.5 px-2 py-1 border font-body text-xs ${cls}`}>
                        {eEntrata ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {fmtCHFbreve(m.importo)}
                        {m.origine === 'ocr' && !m.verificato && (
                            <span className="inline-flex items-center gap-0.5 text-amber-400" title={t('chip.ocr_da_verificare')}>
                                <ShieldAlert size={9} />
                            </span>
                        )}
                        <button onClick={() => scollega(m)} title={t('chip.scollega')}
                            className="opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity">
                            <X size={10} />
                        </button>
                    </span>
                )
            })}

            {/* Controlli tag — gated sul mandato */}
            {!haMandato ? (
                <span
                    title={t('controlli.mandato_richiesto')}
                    className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-white/8 text-nebbia/20 font-body text-xs cursor-not-allowed"
                >
                    <Tag size={10} /> {t('controlli.entrata_uscita')}
                </span>
            ) : (
                <>
                    <button
                        onClick={() => tagga('entrata')}
                        disabled={!!estraendo}
                        className="flex items-center gap-1.5 px-2 py-1 border border-salvia/30 text-salvia/80 font-body text-xs hover:bg-salvia/10 transition-colors disabled:opacity-40"
                    >
                        {estraendo === 'entrata' ? <Loader2 size={10} className="animate-spin" /> : <TrendingUp size={10} />} {t('controlli.entrata')}
                    </button>
                    <button
                        onClick={() => tagga('uscita')}
                        disabled={!!estraendo}
                        className="flex items-center gap-1.5 px-2 py-1 border border-oro/30 text-oro/80 font-body text-xs hover:bg-oro/10 transition-colors disabled:opacity-40"
                    >
                        {estraendo === 'uscita' ? <Loader2 size={10} className="animate-spin" /> : <TrendingDown size={10} />} {t('controlli.uscita')}
                    </button>
                </>
            )}

            {errore && <span className="font-body text-[10px] text-red-400">{errore}</span>}

            {/* Fallback inserimento manuale */}
            {formManuale && (
                <FormMovimento
                    tipo={formManuale.tipo}
                    clienteId={doc.cliente_id}
                    mandatoId={doc.mandato_id}
                    valoriIniziali={formManuale.valoriIniziali}
                    onClose={() => setFormManuale(null)}
                    onSaved={() => { setFormManuale(null); caricaMovimenti(); if (onAggiornato) onAggiornato() }}
                />
            )}
        </div>
    )
}
