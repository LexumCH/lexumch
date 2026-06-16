// src/components/avvocato/BoxUdienzeETermini.jsx
//
// Blocco unificato full-width per la scheda pratica.
// Contiene due sezioni verticali sempre visibili:
//   1) Termini processuali (in alto, piu' critici)
//   2) Udienze ed esiti (sotto)
// Header con 2 bottoni separati: "+ Termine" e "+ Udienza"

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Plus, Gavel, AlertTriangle, CheckCircle2, XCircle, Calendar,
    ChevronRight, Clock, MapPin, Check, Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import UdienzaModal from '@/components/UdienzaModal'
import NuovoTerminePratica from '@/components/avvocato/NuovoTerminePratica'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// ─── Helpers ────────────────────────────────────────────────
function fmtData(iso, dateLocale) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtOra(iso, dateLocale) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
}

function giorniMancanti(dataScadenza) {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const target = new Date(dataScadenza)
    target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

function badgeUrgenza(giorni, t) {
    const giorniLabel = t('badge.giorni', { count: giorni })
    if (giorni < 0) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: t('badge.scaduta'), critico: true }
    if (giorni === 0) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: t('badge.oggi'), critico: true }
    if (giorni <= 3) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: giorniLabel, critico: true }
    if (giorni <= 7) return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: giorniLabel, critico: false }
    if (giorni <= 30) return { color: 'text-salvia bg-salvia/10 border-salvia/30', label: giorniLabel, critico: false }
    return { color: 'text-nebbia/50 bg-white/5 border-white/10', label: giorniLabel, critico: false }
}

// ─────────────────────────────────────────────────────────────
// SEZIONE TERMINI
// ─────────────────────────────────────────────────────────────
function SezioneTermini({ termini, loading, onMarcaCompiuto, onElimina }) {
    const { t, i18n } = useTranslation('comp_box_udienze_termini')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [filtroStato, setFiltroStato] = useState('in_corso')

    const terminiInCorso = termini.filter(term => term.stato === 'in_corso')
    const terminiStorico = termini.filter(term => term.stato !== 'in_corso')
    const terminiVisibili = filtroStato === 'in_corso' ? terminiInCorso : terminiStorico

    return (
        <div>
            {/* Sub-header sezione termini */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <p className="font-body text-xs font-medium text-oro uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={11} className="text-oro/70" />
                        {t('termini.titolo')} ({terminiInCorso.length})
                    </p>
                    {(terminiInCorso.length > 0 || terminiStorico.length > 0) && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFiltroStato('in_corso')}
                                className={`font-body text-[10px] px-2 py-0.5 transition-colors ${filtroStato === 'in_corso'
                                    ? 'text-oro border-b border-oro'
                                    : 'text-nebbia/30 hover:text-nebbia/60 border-b border-transparent'
                                    }`}
                            >
                                {t('termini.filtro.in_corso')} ({terminiInCorso.length})
                            </button>
                            <button
                                onClick={() => setFiltroStato('storico')}
                                className={`font-body text-[10px] px-2 py-0.5 transition-colors ${filtroStato === 'storico'
                                    ? 'text-oro border-b border-oro'
                                    : 'text-nebbia/30 hover:text-nebbia/60 border-b border-transparent'
                                    }`}
                            >
                                {t('termini.filtro.storico')} ({terminiStorico.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : terminiVisibili.length === 0 ? (
                <div className="py-6 text-center">
                    <Calendar size={20} className="text-nebbia/20 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/30">
                        {filtroStato === 'in_corso' ? t('termini.vuoto.in_corso') : t('termini.vuoto.storico')}
                    </p>
                    {filtroStato === 'in_corso' && (
                        <p className="font-body text-xs text-nebbia/25 mt-1">
                            {t('termini.vuoto.suggerimento')}
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {terminiVisibili.map(term => {
                        const giorni = giorniMancanti(term.data_scadenza)
                        const badge = badgeUrgenza(giorni, t)
                        const isAttivo = term.stato === 'in_corso'

                        let StatoIcon = Calendar
                        let statoColor = 'text-salvia'
                        if (term.stato === 'compiuto') { StatoIcon = CheckCircle2; statoColor = 'text-salvia' }
                        else if (term.stato === 'scaduto_non_compiuto') { StatoIcon = XCircle; statoColor = 'text-red-400' }
                        else if (badge.critico) { StatoIcon = AlertTriangle; statoColor = 'text-red-400' }

                        return (
                            <div
                                key={term.id}
                                className={`group p-3 border transition-colors ${isAttivo && badge.critico
                                    ? 'bg-red-500/[0.03] border-red-500/20'
                                    : 'bg-petrolio border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <StatoIcon size={15} className={`${statoColor} mt-0.5 shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-body text-sm text-nebbia font-medium">{term.tipo_label}</p>
                                            {isAttivo && (
                                                <span className={`font-body text-[10px] px-2 py-0.5 border ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            )}
                                            {term.stato === 'compiuto' && (
                                                <span className="font-body text-[10px] px-2 py-0.5 border text-salvia bg-salvia/10 border-salvia/30">
                                                    {t('termini.stato.compiuto', { data: fmtData(term.data_compimento, dateLocale) })}
                                                </span>
                                            )}
                                            {term.stato === 'scaduto_non_compiuto' && (
                                                <span className="font-body text-[10px] px-2 py-0.5 border text-red-400 bg-red-500/10 border-red-500/30">
                                                    {t('termini.stato.scaduto_non_compiuto')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <p className="font-body text-xs text-nebbia/50">
                                                {t('termini.scadenza')}: <span className="text-nebbia/80">{fmtData(term.data_scadenza, dateLocale)}</span>
                                            </p>
                                            {term.evento_descrizione && (
                                                <p className="font-body text-xs text-nebbia/40">
                                                    {t('termini.da')}: {term.evento_descrizione}
                                                </p>
                                            )}
                                        </div>

                                        {term.note_calcolo && (
                                            <p className="font-body text-[11px] text-nebbia/40 mt-1 italic">{term.note_calcolo}</p>
                                        )}
                                        {term.note_avvocato && (
                                            <p className="font-body text-xs text-nebbia/60 mt-1">{term.note_avvocato}</p>
                                        )}
                                    </div>

                                    {isAttivo && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => onMarcaCompiuto(term.id)}
                                                title={t('termini.azioni.segna_compiuto')}
                                                className="p-1.5 hover:bg-salvia/10 border border-transparent hover:border-salvia/30 transition-colors"
                                            >
                                                <Check size={13} className="text-salvia" />
                                            </button>
                                            <button
                                                onClick={() => onElimina(term.id)}
                                                title={t('termini.azioni.elimina')}
                                                className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                                            >
                                                <Trash2 size={13} className="text-nebbia/40 hover:text-red-400" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SEZIONE UDIENZE
// ─────────────────────────────────────────────────────────────
function SezioneUdienze({ udienze, loading, onUdienzaClick }) {
    const { t, i18n } = useTranslation('comp_box_udienze_termini')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const ora = new Date()

    return (
        <div>
            {/* Sub-header sezione udienze */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="font-body text-xs font-medium text-oro uppercase tracking-widest flex items-center gap-2">
                    <Gavel size={11} className="text-oro/70" />
                    {t('udienze.titolo')} ({udienze.length})
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : udienze.length === 0 ? (
                <div className="py-6 text-center">
                    <Gavel size={20} className="text-nebbia/20 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/30">{t('udienze.vuoto')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {udienze.map(u => {
                        const dataU = new Date(u.data_ora)
                        const isPassata = dataU < ora && u.stato === 'programmata'
                        const isProssima = u.stato === 'programmata' && dataU >= ora &&
                            !udienze.some(u2 => u2.stato === 'programmata' &&
                                new Date(u2.data_ora) >= ora &&
                                new Date(u2.data_ora) < dataU)

                        const statoColors = {
                            programmata: isProssima
                                ? 'border-oro/40 bg-oro/5'
                                : isPassata
                                    ? 'border-amber-500/30 bg-amber-500/5'
                                    : 'border-white/10 bg-petrolio',
                            svolta: 'border-salvia/30 bg-salvia/5',
                            rinviata: 'border-amber-500/30 bg-amber-500/5',
                            annullata: 'border-white/10 opacity-50 bg-petrolio',
                        }

                        return (
                            <button
                                key={u.id}
                                onClick={() => onUdienzaClick(u)}
                                className={`w-full text-left p-3 border ${statoColors[u.stato]} hover:border-oro/50 transition-colors group`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`font-body text-sm font-medium ${isProssima ? 'text-oro' : 'text-nebbia'}`}>
                                                {fmtData(u.data_ora, dateLocale)}
                                            </span>
                                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                                <Clock size={10} />
                                                {fmtOra(u.data_ora, dateLocale)}
                                            </span>
                                            {isProssima && (
                                                <span className="font-body text-[10px] text-oro border border-oro/30 px-1.5 py-0.5 uppercase tracking-wider">
                                                    {t('udienze.badge.prossima')}
                                                </span>
                                            )}
                                            {isPassata && (
                                                <span className="font-body text-[10px] text-amber-400 border border-amber-500/30 px-1.5 py-0.5 uppercase tracking-wider">
                                                    {t('udienze.badge.da_aggiornare')}
                                                </span>
                                            )}
                                            {u.stato !== 'programmata' && (
                                                <span className={`font-body text-[10px] px-1.5 py-0.5 uppercase tracking-wider border ${u.stato === 'svolta' ? 'border-salvia/30 text-salvia' :
                                                    u.stato === 'rinviata' ? 'border-amber-500/30 text-amber-400' :
                                                        'border-white/10 text-nebbia/40'
                                                    }`}>
                                                    {t(`udienze.stato.${u.stato}`)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-body text-sm text-nebbia/70 truncate">{u.tipo}</p>
                                        {u.tribunale && (
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5 flex items-center gap-1">
                                                <MapPin size={9} />
                                                {[u.tribunale, u.sezione].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight size={13} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0 mt-1" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function BoxUdienzeETermini({
    praticaId,
    clienteId,
    praticaTitolo,
    onUdienzaSaved,
}) {
    const { t } = useTranslation('comp_box_udienze_termini')

    // Stato Termini
    const [termini, setTermini] = useState([])
    const [loadingTermini, setLoadingTermini] = useState(true)
    const [modalTermineOpen, setModalTermineOpen] = useState(false)

    // Stato Udienze
    const [udienze, setUdienze] = useState([])
    const [loadingUdienze, setLoadingUdienze] = useState(true)
    const [udienzaModale, setUdienzaModale] = useState(null)

    // ─── Carica termini ───────────────────────────────────────
    async function caricaTermini() {
        setLoadingTermini(true)
        const { data, error } = await supabase
            .from('termini_processuali')
            .select('*')
            .eq('pratica_id', praticaId)
            .order('data_scadenza', { ascending: true })

        if (error) {
            console.error('Errore caricamento termini:', error.message)
            setTermini([])
        } else {
            setTermini(data ?? [])
        }
        setLoadingTermini(false)
    }

    // ─── Carica udienze ───────────────────────────────────────
    async function caricaUdienze() {
        setLoadingUdienze(true)
        const { data } = await supabase
            .from('udienze')
            .select('*')
            .eq('pratica_id', praticaId)
            .order('data_ora', { ascending: false })
        setUdienze(data ?? [])
        setLoadingUdienze(false)
    }

    useEffect(() => {
        if (praticaId) {
            caricaTermini()
            caricaUdienze()
        }
    }, [praticaId])

    // ─── Azioni Termini ───────────────────────────────────────
    async function marcaCompiuto(id) {
        const oggi = new Date().toISOString().slice(0, 10)
        const { error } = await supabase
            .from('termini_processuali')
            .update({ stato: 'compiuto', data_compimento: oggi })
            .eq('id', id)
        if (error) return alert(t('errori.generico') + ': ' + error.message)
        caricaTermini()
    }

    async function eliminaTermine(id) {
        if (!confirm(t('termini.conferma_elimina'))) return
        const { error } = await supabase
            .from('termini_processuali')
            .delete()
            .eq('id', id)
        if (error) return alert(t('errori.generico') + ': ' + error.message)
        caricaTermini()
    }

    // ─── Azioni Udienze ───────────────────────────────────────
    async function handleUdienzaSaved() {
        await caricaUdienze()
        if (onUdienzaSaved) await onUdienzaSaved()
    }

    return (
        <div className="bg-slate border border-white/5 p-5">
            {/* Header con bottoni separati */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <p className="section-label">{t('header.titolo')}</p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalTermineOpen(true)}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                    >
                        <Plus size={11} /> {t('header.aggiungi_termine')}
                    </button>
                    <button
                        onClick={() => setUdienzaModale({})}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                    >
                        <Plus size={11} /> {t('header.aggiungi_udienza')}
                    </button>
                </div>
            </div>

            {/* Sezione Termini (in alto, piu' critici) */}
            <SezioneTermini
                termini={termini}
                loading={loadingTermini}
                onMarcaCompiuto={marcaCompiuto}
                onElimina={eliminaTermine}
            />

            {/* Divisore */}
            <div className="border-t border-white/5 my-5" />

            {/* Sezione Udienze */}
            <SezioneUdienze
                udienze={udienze}
                loading={loadingUdienze}
                onUdienzaClick={(u) => setUdienzaModale(u)}
            />

            {/* Modale udienza */}
            {udienzaModale && (
                <UdienzaModal
                    praticaId={praticaId}
                    praticaTitolo={praticaTitolo}
                    clienteId={clienteId}
                    udienza={udienzaModale.id ? udienzaModale : null}
                    onClose={() => setUdienzaModale(null)}
                    onSaved={async () => { setUdienzaModale(null); await handleUdienzaSaved() }}
                    onDeleted={async () => { setUdienzaModale(null); await handleUdienzaSaved() }}
                />
            )}

            {/* Modale termine */}
            {modalTermineOpen && (
                <NuovoTerminePratica
                    praticaId={praticaId}
                    onClose={() => setModalTermineOpen(false)}
                    onSaved={() => { setModalTermineOpen(false); caricaTermini() }}
                />
            )}
        </div>
    )
}