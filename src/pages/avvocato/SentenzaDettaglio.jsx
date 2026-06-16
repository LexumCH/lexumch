// src/pages/avvocato/SentenzaDettaglio.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Pagina dettaglio sentenza — gestisce 2 fonti CH:
//   - giurisprudenza  → giurisprudenza_ch  (TF, TAF, TPF, cantonali)
//   - sentenza_ue     → eur_lex            (CGUE: Corte di Giustizia, Tribunale UE)
//
// Entrambi gli id sono uuid → disambiguazione per cascata:
//   prova giurisprudenza_ch, poi eur_lex.
// Opzionalmente la rotta puo' passare una prop `fonte` per saltare la cascata.
//
// Riusa AggiungiAPratica + AggiungiAEtichetta col tipo granulare corretto.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { labelFonteGiur } from '@/lib/istituzioni'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import AggiungiAPratica from '@/components/AggiungiAPratica'
import { Scale, Globe, AlertCircle, Calendar, FileText } from 'lucide-react'

const LINGUE_LABEL = { it: 'IT', de: 'DE', fr: 'FR' }
const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// Etichette fonti/camere centralizzate in src/lib/istituzioni.js (namespace i18n 'istituzioni')

function risolviTitoloGiur(s, linguaPref) {
    const ordine = [linguaPref, 'it', 'de', 'fr'].filter(Boolean)
    for (const l of ordine) {
        const v = s[`titolo_${l}`]
        if (v && v.trim()) return { testo: v, lingua: l }
    }
    return { testo: s.signature ?? s.reference ?? '—', lingua: null }
}

export function SentenzaDettaglio({ fonte: fonteProp }) {
    const { id } = useParams()
    const { profile } = useAuth()
    const { t, i18n } = useTranslation('avv_dettaglio')
    const { t: tIst } = useTranslation('istituzioni')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [sentenza, setSentenza] = useState(null)
    const [tipoFonte, setTipoFonte] = useState(null) // 'giurisprudenza' | 'sentenza_ue'
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [refreshEtichette, setRefreshEtichette] = useState(0)
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    // Lingua preferita per i titoli multilingue delle federali
    const linguaPref = (() => {
        try {
            return localStorage.getItem('i18nextLng')?.slice(0, 2)
                ?? localStorage.getItem('lingua')?.slice(0, 2) ?? 'it'
        } catch { return 'it' }
    })()

    useEffect(() => { carica() }, [id])

    async function carica() {
        setLoading(true)
        setErrore(null)
        setSentenza(null); setTipoFonte(null)
        setRicercaSalvataId(null)
        try {
            // Se la rotta indica gia' la fonte, niente cascata
            const provaGiur = fonteProp !== 'ue'
            const provaUe = fonteProp !== 'ch'

            if (provaGiur) {
                const { data } = await supabase
                    .from('giurisprudenza_ch')
                    .select('id, fonte, signature, reference, anno_deposito, data_decisione, camera_codice, hierarchy, lingua, titolo_de, titolo_fr, titolo_it, testo, is_dtf, dtf_riferimento, principio_diritto, oggetto')
                    .eq('id', id)
                    .maybeSingle()
                if (data) {
                    setSentenza(data); setTipoFonte('giurisprudenza'); setLoading(false); return
                }
            }

            if (provaUe) {
                const { data } = await supabase
                    .from('eur_lex')
                    .select('id, celex_id, ecli, tipo, numero_caso, organo, data_decisione, data_pubblicazione, oggetto, parti, relatore, materia, vigente, rilevanza, testo_integrale, url_originale')
                    .eq('id', id)
                    .maybeSingle()
                if (data) {
                    setSentenza(data); setTipoFonte('sentenza_ue'); setLoading(false); return
                }
            }

            setErrore(t('sentenza.non_trovata'))
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

    if (errore || !sentenza) return (
        <div className="space-y-5">
            <BackButton to={tornaA} label={t('back')} />
            <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="font-body text-sm text-red-400">{errore ?? t('sentenza.non_trovata')}</p>
                <p className="font-body text-xs text-nebbia/30 mt-2">{t('id')} {id}</p>
            </div>
        </div>
    )

    const isAvvocato = profile?.role === 'avvocato'
    const isPro = isAvvocato || profile?.role === 'fiduciario'

    // ── Render per fonte ──
    let titolo, sottoTitolo, riferimento, badge = [], dataInfo, corpo = [], collocazione, lingueffettiva = null
    // CEDU (Corte EDU) vive in eur_lex con organo='CEDU' / tipo='sentenza_cedu': formato caso diverso.
    const isCedu = tipoFonte === 'sentenza_ue' && (sentenza.organo === 'CEDU' || sentenza.tipo === 'sentenza_cedu')

    if (tipoFonte === 'giurisprudenza') {
        const tt = risolviTitoloGiur(sentenza, linguaPref)
        titolo = tt.testo
        lingueffettiva = tt.lingua
        riferimento = sentenza.signature ?? sentenza.reference
        sottoTitolo = labelFonteGiur(sentenza.fonte, tIst)
        if (sentenza.is_dtf) badge.push({ txt: sentenza.dtf_riferimento ? `DTF ${sentenza.dtf_riferimento}` : 'DTF', cls: 'text-oro border-oro/30 bg-oro/5' })
        if (lingueffettiva && LINGUE_LABEL[lingueffettiva]) badge.push({ txt: LINGUE_LABEL[lingueffettiva], cls: 'text-salvia/60 border-salvia/20' })
        if (Array.isArray(sentenza.hierarchy) && sentenza.hierarchy.length)
            collocazione = sentenza.hierarchy.filter(Boolean).join(' › ')
        if (sentenza.data_decisione) dataInfo = { label: t('decisione_del'), value: sentenza.data_decisione }
        if (sentenza.principio_diritto) corpo.push({ titolo: t('sentenza.principio'), testo: sentenza.principio_diritto })
        if (sentenza.oggetto) corpo.push({ titolo: t('oggetto'), testo: sentenza.oggetto })
        if (sentenza.testo) corpo.push({ titolo: t('testo'), testo: sentenza.testo })
    } else {
        // sentenza_ue (eur_lex) — CGUE / Tribunale UE / CEDU
        // Per la CEDU il titolo naturale è il caso (parti: "AFFAIRE X c. STATO"),
        // mentre l'oggetto è la massima sulla violazione → va in sezione.
        titolo = isCedu
            ? (sentenza.parti || sentenza.oggetto || sentenza.numero_caso || sentenza.celex_id || '—')
            : (sentenza.oggetto || sentenza.numero_caso || sentenza.celex_id || '—')
        riferimento = sentenza.numero_caso
        sottoTitolo = sentenza.organo
        if (sentenza.celex_id) badge.push({ txt: `CELEX ${sentenza.celex_id}`, cls: 'text-nebbia/50 border-white/10' })
        if (sentenza.ecli) badge.push({ txt: sentenza.ecli, cls: 'text-nebbia/40 border-white/10' })
        if (sentenza.vigente === false) badge.push({ txt: t('non_vigente'), cls: 'text-red-400/70 border-red-400/30 bg-red-400/5' })
        if (sentenza.data_decisione) dataInfo = { label: t('decisione_del'), value: sentenza.data_decisione }
        if (sentenza.parti && sentenza.parti !== titolo) corpo.push({ titolo: t('sentenza.parti'), testo: sentenza.parti })
        if (sentenza.oggetto) corpo.push({ titolo: t('oggetto'), testo: sentenza.oggetto })
        if (sentenza.testo_integrale) corpo.push({ titolo: t('testo'), testo: sentenza.testo_integrale })
        if (sentenza.relatore) corpo.push({ titolo: t('sentenza.relatore'), testo: sentenza.relatore })
        if (Array.isArray(sentenza.materia) && sentenza.materia.length)
            corpo.push({ titolo: t('sentenza.materia'), testo: sentenza.materia.join(', ') })
    }

    const FonteIcon = tipoFonte === 'giurisprudenza' ? Scale : Globe
    const cfgLabel = tipoFonte === 'giurisprudenza' ? t('sentenza.giur_ch') : (isCedu ? t('sentenza.giur_cedu') : t('sentenza.giur_ue'))
    const cfgColor = tipoFonte === 'giurisprudenza' ? 'text-salvia' : 'text-nebbia'

    const titoloPerSalvataggio = [riferimento, titolo].filter(Boolean).join(' — ').slice(0, 300)
    const testoPerSalvataggio = corpo.map(c => `${c.titolo}: ${c.testo}`).join('\n\n')

    return (
        <div className="space-y-5">
            <BackButton to={tornaA} label={t('back')} />

            {/* Intestazione */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="section-label !m-0 flex items-center gap-1.5">
                            <FonteIcon size={12} className={cfgColor} /> {cfgLabel}
                        </span>
                        {badge.map((b, i) => (
                            <span key={i} className={`font-body text-[10px] border px-1.5 py-0.5 uppercase tracking-wider ${b.cls}`}>{b.txt}</span>
                        ))}
                    </div>

                    <h1 className="font-display text-2xl text-nebbia leading-snug">{titolo}</h1>
                    {riferimento && riferimento !== titolo && (
                        <p className="font-mono text-xs text-nebbia/40 mt-2">{riferimento}</p>
                    )}
                    {sottoTitolo && <p className="font-body text-sm text-nebbia/50 mt-1">{sottoTitolo}</p>}
                    {collocazione && <p className="font-body text-xs text-nebbia/40 mt-1">{collocazione}</p>}
                    {dataInfo && (
                        <p className="font-body text-xs text-nebbia/30 flex items-center gap-1.5 mt-2">
                            <Calendar size={11} /> {dataInfo.label} {new Date(dataInfo.value).toLocaleDateString(dateLocale)}
                        </p>
                    )}
                    {tipoFonte === 'sentenza_ue' && sentenza.url_originale && (
                        <a href={sentenza.url_originale} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-body text-xs text-oro hover:text-oro/70 mt-2">
                            <Globe size={11} /> {t('sentenza.fonte_originale')}
                        </a>
                    )}
                </div>

                {isPro && (
                    <div className="shrink-0 flex flex-wrap items-center gap-2">
                        {/* AggiungiAPratica è bifronte: avvocato → pratica, fiduciario → mandato.
                            Si auto-protegge (return null per altri ruoli): niente gate esterno. */}
                        <AggiungiAPratica
                            ricerca={{
                                tipo: tipoFonte,
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
                            elemento={{ tipo: tipoFonte, id: sentenza.id }}
                            onCambio={() => setRefreshEtichette(k => k + 1)}
                        />
                    </div>
                )}
            </div>

            {/* Corpo: sezioni */}
            {corpo.length > 0 ? corpo.map((c, i) => (
                <div key={i} className="bg-slate border border-white/5 p-6">
                    <p className="section-label mb-3 flex items-center gap-1.5"><FileText size={12} /> {c.titolo}</p>
                    <div className="font-body text-base text-nebbia/80 leading-relaxed whitespace-pre-line">{c.testo}</div>
                </div>
            )) : (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-sm text-nebbia/30 italic">{t('sentenza.nessun_contenuto')}</p>
                </div>
            )}

            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">{t('id')} {sentenza.id}</p>
            </div>
        </div>
    )
}

export default SentenzaDettaglio
