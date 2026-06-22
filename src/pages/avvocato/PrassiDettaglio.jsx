// src/pages/avvocato/PrassiDettaglio.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Pagina dettaglio prassi — fonte unica: prassi_ch
//   Federale: fonte in {estv, ufas, seco, finma, udsc, sem, ufg, weko, ifpdt, mros}
//   Cantonale: fonte='fisco_cant' (cantone valorizzato)
//
// id uuid → query secca su prassi_ch (nessuna cascata).
// tipo granulare: 'prassi'
// Riusa AggiungiAPratica + AggiungiAEtichetta.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { labelFontePrassi } from '@/lib/istituzioni'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import AggiungiAPratica from '@/components/AggiungiAPratica'
import { ScrollText, AlertCircle, Calendar, FileText, Tag } from 'lucide-react'

const LINGUE_LABEL = { it: 'IT', de: 'DE', fr: 'FR' }
const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// Etichette emittenti/fisco cantonale centralizzate in src/lib/istituzioni.js (namespace i18n 'istituzioni')

export function PrassiDettaglio() {
    const { id } = useParams()
    const { profile } = useAuth()
    const { t, i18n } = useTranslation('avv_dettaglio')
    const { t: tIst } = useTranslation('istituzioni')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [prassi, setPrassi] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [refreshEtichette, setRefreshEtichette] = useState(0)
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    useEffect(() => { carica() }, [id])

    async function carica() {
        setLoading(true)
        setErrore(null)
        setPrassi(null)
        setRicercaSalvataId(null)
        try {
            const { data, error } = await supabase
                .from('prassi_ch')
                .select('id, fonte, tipo_documento, numero, anno, data_emanazione, stato, lingua, lingua_originale, titolo, sottotitolo, oggetto, materia, parole_chiave, testo, cantone, emittente_nome, giurisdizione')
                .eq('id', id)
                .maybeSingle()
            if (error) { setErrore(error.message); return }
            if (data) { setPrassi(data); return }
            setErrore(t('prassi.non_trovato'))
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    const tornaA = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'

    if (errore || !prassi) return (
        <div className="space-y-5">
            <BackButton to={tornaA} label={t('back')} />
            <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="font-body text-sm text-red-400">{errore ?? t('prassi.non_trovato')}</p>
                <p className="font-body text-xs text-nebbia/30 mt-2">{t('id')} {id}</p>
            </div>
        </div>
    )

    const isAvvocato = profile?.role === 'avvocato'
    const isPro = isAvvocato || profile?.role === 'fiduciario'
    const fonteLabel = labelFontePrassi(prassi, tIst)

    // oggetto spesso vuoto → uso titolo come riga principale; oggetto/sottotitolo come sezioni se presenti
    const corpo = []
    if (prassi.sottotitolo) corpo.push({ titolo: t('prassi.sottotitolo'), testo: prassi.sottotitolo })
    if (prassi.oggetto) corpo.push({ titolo: t('oggetto'), testo: prassi.oggetto })
    if (prassi.testo) corpo.push({ titolo: t('testo'), testo: prassi.testo })

    const badge = []
    if (prassi.tipo_documento) badge.push({ txt: prassi.tipo_documento, cls: 'text-oro/70 border-oro/20' })
    if (prassi.numero) badge.push({ txt: `${t('prassi.n_prefix')} ${prassi.numero}`, cls: 'text-nebbia/50 border-white/10' })
    if (prassi.lingua && LINGUE_LABEL[prassi.lingua]) badge.push({ txt: LINGUE_LABEL[prassi.lingua], cls: 'text-salvia/60 border-salvia/20' })

    const titoloPerSalvataggio = [prassi.numero, prassi.titolo].filter(Boolean).join(' — ').slice(0, 300)
    const testoPerSalvataggio = corpo.map(c => `${c.titolo}: ${c.testo}`).join('\n\n') || prassi.titolo

    return (
        <div className="space-y-5">
            <BackButton to={tornaA} label={t('back')} />

            {/* Intestazione */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="section-label !m-0 flex items-center gap-1.5">
                            <ScrollText size={12} className="text-oro" /> {t('prassi.label')}
                        </span>
                        {badge.map((b, i) => (
                            <span key={i} className={`font-body text-[10px] border px-1.5 py-0.5 uppercase tracking-wider ${b.cls}`}>{b.txt}</span>
                        ))}
                    </div>

                    <h1 className="font-display text-2xl text-nebbia leading-snug">{prassi.titolo}</h1>
                    <p className="font-body text-sm text-nebbia/50 mt-2">{fonteLabel}</p>
                    {prassi.data_emanazione && (
                        <p className="font-body text-xs text-nebbia/30 flex items-center gap-1.5 mt-2">
                            <Calendar size={11} /> {t('prassi.emanato_il')} {new Date(prassi.data_emanazione).toLocaleDateString(dateLocale)}
                        </p>
                    )}
                </div>

                {isPro && (
                    <div className="shrink-0 flex flex-wrap items-center gap-2">
                        {/* AggiungiAPratica è bifronte: avvocato → pratica, fiduciario → mandato.
                            Si auto-protegge (return null per altri ruoli): niente gate esterno. */}
                        <AggiungiAPratica
                            ricerca={{
                                tipo: 'prassi',
                                domanda: titoloPerSalvataggio,
                                risposta: testoPerSalvataggio,
                                testo: testoPerSalvataggio,
                            }}
                            ricercaSalvataId={ricercaSalvataId}
                            setRicercaSalvataId={setRicercaSalvataId}
                            variant="default"
                        />
                        {/* AggiungiAEtichetta è condivisa: avvocato + fiduciario. */}
                        <AggiungiAEtichetta
                            elemento={{ tipo: 'prassi', id: prassi.id }}
                            onCambio={() => setRefreshEtichette(k => k + 1)}
                        />
                    </div>
                )}
            </div>

            {/* Materia / parole chiave */}
            {(Array.isArray(prassi.materia) && prassi.materia.length > 0) ||
                (Array.isArray(prassi.parole_chiave) && prassi.parole_chiave.length > 0) ? (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3 flex items-center gap-1.5"><Tag size={12} /> {t('prassi.classificazione')}</p>
                    <div className="flex flex-wrap gap-2">
                        {(prassi.materia ?? []).map((m, i) => (
                            <span key={`m${i}`} className="font-body text-xs text-salvia border border-salvia/20 px-2 py-1">{m}</span>
                        ))}
                        {(prassi.parole_chiave ?? []).map((p, i) => (
                            <span key={`p${i}`} className="font-body text-xs text-nebbia/50 border border-white/10 px-2 py-1">{p}</span>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Corpo */}
            {corpo.length > 0 ? corpo.map((c, i) => (
                <div key={i} className="bg-slate border border-white/5 p-6">
                    <p className="section-label mb-3 flex items-center gap-1.5"><FileText size={12} /> {c.titolo}</p>
                    <div className="font-body text-base text-nebbia/80 leading-relaxed whitespace-pre-line">{c.testo}</div>
                </div>
            )) : (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-sm text-nebbia/30 italic">{t('prassi.solo_metadati')}</p>
                </div>
            )}

            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">{t('id')} {prassi.id}</p>
            </div>
        </div>
    )
}

export default PrassiDettaglio
