// src/pages/avvocato/NormaDettaglio.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Pagina dettaglio norma — gestisce 3 fonti CH:
//   - norma_federale  → norme_ch_articoli   (+ atto padre norme_ch)
//   - norma_cantonale → norme_cantonali_ch_articoli (+ atto padre norme_cantonali_ch)
//   - norma_ue        → norme_ue            (riga unica, no padre)
//
// Disambiguazione fonte dall'id:
//   id numerico (bigint) → norme_ue
//   id uuid              → prova federale, poi cantonale
//
// Riusa i componenti AggiungiAPratica e AggiungiAEtichetta (già esistenti),
// passando il `tipo` granulare corretto per elementi_etichette / ricerche.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import AggiungiAPratica from '@/components/AggiungiAPratica'
import {
    Landmark, MapPin, Globe, AlertCircle, Calendar,
} from 'lucide-react'

const ORDINE_LINGUE = ['it', 'de', 'fr', 'en', 'rm']
const LINGUE_LABEL = { it: 'IT', de: 'DE', fr: 'FR', en: 'EN', rm: 'RM' }
const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

function risolviJsonb(campo, linguaPref) {
    if (campo && typeof campo === 'object') {
        if (linguaPref && campo[linguaPref]) return campo[linguaPref]
        for (const k of ORDINE_LINGUE) if (campo[k]) return campo[k]
    }
    return null
}

function gerarchiaLabel(g) {
    if (!g || typeof g !== 'object') return ''
    const vals = Array.isArray(g) ? g : Object.values(g)
    return vals.filter(v => typeof v === 'string' && v.trim()).join(' › ')
}

export function NormaDettaglio() {
    const { id } = useParams()
    const { profile } = useAuth()
    const { t, i18n } = useTranslation('avv_dettaglio')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [norma, setNorma] = useState(null)      // riga articolo / norma_ue
    const [atto, setAtto] = useState(null)        // atto padre (federale/cantonale)
    const [tipoFonte, setTipoFonte] = useState(null) // 'norma_federale' | 'norma_cantonale' | 'norma_ue'
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [refreshEtichette, setRefreshEtichette] = useState(0)
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    useEffect(() => { carica() }, [id])

    async function carica() {
        setLoading(true)
        setErrore(null)
        setNorma(null); setAtto(null); setTipoFonte(null)
        setRicercaSalvataId(null)
        try {
            const idNumerico = /^\d+$/.test(String(id))

            // ── UE: id numerico (bigint) ──
            if (idNumerico) {
                const { data, error } = await supabase
                    .from('norme_ue')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle()
                if (error) { setErrore(error.message); return }
                if (data) { setNorma(data); setTipoFonte('norma_ue'); return }
                setErrore(t('norma.non_trovata')); return
            }

            // ── Federale: norme_ch_articoli (uuid) ──
            const { data: artFed, error: errFed } = await supabase
                .from('norme_ch_articoli')
                .select('id, norma_id, articolo_label, articolo_num, rubrica_articolo, rubrica_completa, parte_titolo, titolo_titolo, capo_titolo, testo, lingua, abrogato')
                .eq('id', id)
                .maybeSingle()
            if (artFed) {
                setNorma(artFed); setTipoFonte('norma_federale')
                const { data: padre } = await supabase
                    .from('norme_ch')
                    .select('rs_numero, titolo, titolo_short, tipo_atto, data_documento, abrogato')
                    .eq('id', artFed.norma_id)
                    .maybeSingle()
                setAtto(padre ?? null)
                return
            }

            // ── Cantonale: norme_cantonali_ch_articoli (uuid) ──
            const { data: artCant, error: errCant } = await supabase
                .from('norme_cantonali_ch_articoli')
                .select('id, norma_id, article_num, article_suffix, rubrica, testo, capoversi, gerarchia, note_storiche, lingua, is_abrogato')
                .eq('id', id)
                .maybeSingle()
            if (artCant) {
                setNorma(artCant); setTipoFonte('norma_cantonale')
                const { data: padre } = await supabase
                    .from('norme_cantonali_ch')
                    .select('systematic_number, title, title_by_lang, abbreviation, canton, is_active, materia_macro_lbl, version_active_since')
                    .eq('id', artCant.norma_id)
                    .maybeSingle()
                setAtto(padre ?? null)
                return
            }

            // Nessun dato: se un errore reale (RLS/rete) ha impedito la lettura, mostralo
            if (errFed || errCant) { setErrore((errFed || errCant).message); return }
            setErrore(t('norma.non_trovata'))
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

    if (errore || !norma) return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label={t('back')} />
            <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="font-body text-sm text-red-400">{errore ?? t('norma.non_trovata')}</p>
                <p className="font-body text-xs text-nebbia/30 mt-2">{t('id')} {id}</p>
            </div>
        </div>
    )

    // Config per fonte
    const cfg = {
        norma_federale: { icon: Landmark, label: t('norma.fonte_federale'), color: 'text-oro' },
        norma_cantonale: { icon: MapPin, label: t('norma.fonte_cantonale'), color: 'text-salvia' },
        norma_ue: { icon: Globe, label: t('norma.fonte_ue'), color: 'text-nebbia' },
    }[tipoFonte]
    const FonteIcon = cfg.icon

    // Lingua dell'articolo (per risolvere il titolo dell'atto nella stessa lingua)
    const linguaArt = norma.lingua ?? 'it'

    // Costruzione intestazione + corpo per fonte
    let etichettaArticolo = ''
    let rubrica = null
    let sottoTitolo = null       // titolo atto padre
    let riferimentoAtto = null   // RS / systematic_number / CELEX
    let collocazione = null
    let nonVigente = false
    let dataInfo = null
    const testo = norma.testo

    if (tipoFonte === 'norma_federale') {
        etichettaArticolo = norma.articolo_label ?? '—'
        rubrica = norma.rubrica_articolo
        collocazione = [norma.parte_titolo, norma.titolo_titolo, norma.capo_titolo].filter(Boolean).join(' › ')
        nonVigente = norma.abrogato === true || atto?.abrogato === true
        if (atto) {
            sottoTitolo = risolviJsonb(atto.titolo, linguaArt) || risolviJsonb(atto.titolo_short, linguaArt)
            riferimentoAtto = atto.rs_numero ? `RS ${atto.rs_numero}` : null
            if (atto.data_documento) dataInfo = { label: t('documento_del'), value: atto.data_documento }
        }
    } else if (tipoFonte === 'norma_cantonale') {
        etichettaArticolo = `${t('norma.art_prefix')} ${norma.article_num ?? ''}${norma.article_suffix ?? ''}`.trim()
        rubrica = norma.rubrica
        collocazione = gerarchiaLabel(norma.gerarchia)
        nonVigente = norma.is_abrogato === true || atto?.is_active === false
        if (atto) {
            sottoTitolo = risolviJsonb(atto.title_by_lang, linguaArt) || atto.title
            riferimentoAtto = [atto.canton, atto.systematic_number].filter(Boolean).join(' · ')
        }
    } else if (tipoFonte === 'norma_ue') {
        etichettaArticolo = norma.articolo ?? '—'
        rubrica = norma.rubrica
        nonVigente = norma.vigente === false
        sottoTitolo = norma.titolo_doc || norma.titolo_breve
        riferimentoAtto = norma.celex ? `CELEX ${norma.celex}` : null
        if (norma.data_atto) dataInfo = { label: t('atto_del'), value: norma.data_atto }
    }

    const isAvvocato = profile?.role === 'avvocato'
    const isPro = isAvvocato || profile?.role === 'fiduciario'

    // Oggetto comune per i componenti riusabili (titolo+contenuto da salvare in ricerche)
    const titoloPerSalvataggio = [etichettaArticolo, rubrica, sottoTitolo].filter(Boolean).join(' — ')

    return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label={t('back')} />

            {/* Intestazione */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="section-label !m-0 flex items-center gap-1.5">
                            <FonteIcon size={12} className={cfg.color} /> {cfg.label}
                        </span>
                        {norma.lingua && LINGUE_LABEL[norma.lingua] && (
                            <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 uppercase">{LINGUE_LABEL[norma.lingua]}</span>
                        )}
                        {nonVigente && (
                            <span className="font-body text-xs text-red-400/70 border border-red-400/30 bg-red-400/5 px-2 py-0.5">{t('non_vigente')}</span>
                        )}
                        {norma.tipo_elemento && norma.tipo_elemento !== 'articolo' && (
                            <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">{norma.tipo_elemento}</span>
                        )}
                    </div>

                    <h1 className="font-display text-3xl text-nebbia leading-snug">{etichettaArticolo}</h1>
                    {rubrica && <p className="font-body text-sm text-nebbia/60 italic mt-2">{rubrica}</p>}

                    {sottoTitolo && <p className="font-body text-sm text-nebbia/40 mt-2">{sottoTitolo}</p>}
                    {riferimentoAtto && <p className="font-mono text-xs text-nebbia/30 mt-1">{riferimentoAtto}</p>}
                    {collocazione && <p className="font-body text-xs text-nebbia/40 mt-1">{collocazione}</p>}

                    {dataInfo && (
                        <p className="font-body text-xs text-nebbia/30 flex items-center gap-1.5 mt-2">
                            <Calendar size={11} /> {dataInfo.label} {new Date(dataInfo.value).toLocaleDateString(dateLocale)}
                        </p>
                    )}
                </div>

                {isPro && (
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* AggiungiAPratica è bifronte: avvocato → pratica, fiduciario → mandato.
                                Si auto-protegge (return null per altri ruoli): niente gate esterno. */}
                            <AggiungiAPratica
                                ricerca={{
                                    tipo: tipoFonte,
                                    domanda: titoloPerSalvataggio,
                                    risposta: testo ?? '',
                                    testo: testo ?? '',
                                }}
                                ricercaSalvataId={ricercaSalvataId}
                                setRicercaSalvataId={setRicercaSalvataId}
                                variant="default"
                            />
                            {/* AggiungiAEtichetta è condivisa: avvocato + fiduciario. */}
                            <AggiungiAEtichetta
                                elemento={{ tipo: tipoFonte, id: norma.id }}
                                onCambio={() => setRefreshEtichette(k => k + 1)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Testo */}
            <div className="bg-slate border border-white/5 p-6">
                {testo ? (
                    <div className="font-body text-base text-nebbia/80 leading-relaxed whitespace-pre-line">{testo}</div>
                ) : (
                    <p className="font-body text-sm text-nebbia/30 italic">{t('norma.testo_nd')}</p>
                )}
            </div>

            {/* Note storiche (cantonale) */}
            {tipoFonte === 'norma_cantonale' && norma.note_storiche && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">{t('norma.note_storiche')}</p>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line">{norma.note_storiche}</p>
                </div>
            )}

            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">{t('id')} {norma.id}</p>
            </div>
        </div>
    )
}

export default NormaDettaglio
