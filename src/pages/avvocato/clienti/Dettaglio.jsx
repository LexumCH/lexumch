// src/pages/avvocato/clienti/Dettaglio.jsx — Lexum CH
//
// Clone dell'IT con adattamenti svizzeri:
//   - Anagrafica CH: cf→numero_avs, comune→citta, provincia→cantone,
//     partita_iva→uid, rappr_cf→rappr_avs, +forma_giuridica +iva_attiva, pec rimosso.
//   - salvaCliente: payload verso update-cliente con nomi campo CH (+ note).
//   - TabPagamenti: EUR→CHF, fatt.importo→fatt.totale. "Segna pagata" apre
//     ModalRegistraPagamento (chiede metodo/data/importo); lo stato passa a
//     'pagata' da solo via trigger trg_pagamenti_fattura_stato su CH.
//   - PannelloPratica sezione Ricerche: da note_interne → ricerche (tabella
//     unificata), testo→contenuto, tipi ['ricerca_ai','ricerca_manuale'].
//   - TabNoteInterne: punta a note_interne (tabella creata su CH), usa testo. Invariato.
//   - Date in it-CH (già nell'IT).

import { useState, useEffect, useRef } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { BackButton, Badge, InputField, EmptyState } from '@/components/shared'
import {
    Plus, Search, Send, Lock, FileText, MessageSquare,
    CreditCard, StickyNote, User, FolderOpen, ArrowRight, Sparkles,
    Edit2, Check, X, Calendar, Clock, AlertCircle, Trash2, Building2,
    ExternalLink, Eye, Upload, KeyRound, Mail, Eye as EyeIcon, EyeOff,
    Copy, RefreshCw, CheckCircle, ShieldOff, Wallet, Users, BookOpen,
    DraftingCompass
} from 'lucide-react'
import { supabase, supabaseUrl } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import DocumentiPortale from '@/components/shared/DocumentiPortale'
import GestioneDipendenti from '@/components/fiduciario/GestioneDipendenti'
import GestioneMandati from '@/components/fiduciario/GestioneMandati'
import GestioneProgetti from '@/components/progettista/GestioneProgetti'
import EntrateUscite from '@/components/fiduciario/EntrateUscite'
import PianificazioneLiquidita from '@/components/fiduciario/PianificazioneLiquidita'
import BudgetScostamenti from '@/components/fiduciario/BudgetScostamenti'
import ReportConto from '@/components/fiduciario/ReportConto'
import Contabilita from '@/components/fiduciario/Contabilita'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
// label = chiave i18n (namespace avv_clienti_dettaglio), risolta a render-time
const STATI_PRATICA = {
    aperta: { labelKey: 'stati_pratica.aperta', variant: 'salvia' },
    chiusa: { labelKey: 'stati_pratica.chiusa', variant: 'gray' },
}

const STATI_FATTURA = {
    in_attesa: { labelKey: 'stati_fattura.in_attesa', variant: 'warning' },
    pagata: { labelKey: 'stati_fattura.pagata', variant: 'salvia' },
    scaduta: { labelKey: 'stati_fattura.scaduta', variant: 'red' },
    annullata: { labelKey: 'stati_fattura.annullata', variant: 'gray' },
}

const STATUS_OCR = {
    pending: { labelKey: 'status_ocr.pending', variant: 'gray' },
    processing: { labelKey: 'status_ocr.processing', variant: 'warning' },
    completed: { labelKey: 'status_ocr.completed', variant: 'salvia' },
    failed: { labelKey: 'status_ocr.failed', variant: 'red' },
    skipped: { labelKey: 'status_ocr.skipped', variant: 'gray' },
}

// Metodi pagamento svizzeri (allineati a FatturazioneDettaglio CH)
// value = valore salvato su DB (invariato); labelKey = chiave i18n
const METODI_PAGAMENTO = [
    { value: 'bonifico', labelKey: 'metodi_pagamento.bonifico' },
    { value: 'qr', labelKey: 'metodi_pagamento.qr' },
    { value: 'contanti', labelKey: 'metodi_pagamento.contanti' },
    { value: 'carta', labelKey: 'metodi_pagamento.carta' },
    { value: 'altro', labelKey: 'metodi_pagamento.altro' },
]

// TABS calcolato in base al ruolo (vedi dentro AvvocatoClientiDettaglio)

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtCHF(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? c.nome ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG
// ─────────────────────────────────────────────────────────────
function SwitcherTipoSoggetto({ value, onChange, disabled = false }) {
    const { t } = useTranslation('avv_clienti_dettaglio')
    return (
        <div className="flex gap-1 bg-petrolio border border-white/10 p-1 w-fit">
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_fisica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_fisica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <User size={13} /> {t('switcher.persona_fisica')}
            </button>
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_giuridica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Building2 size={13} /> {t('switcher.persona_giuridica')}
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL CAMBIO PASSWORD CLIENTE (riusa pattern admin)
// ─────────────────────────────────────────────────────────────
function ModalCambiaPasswordCliente({ cliente, onClose, onSuccess }) {
    const { t } = useTranslation('avv_clienti_dettaglio')
    const [modo, setModo] = useState('genera') // 'genera' | 'manuale'
    const [pwdManuale, setPwdManuale] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [risultato, setRisultato] = useState(null)
    const [copiato, setCopiato] = useState(false)

    async function handleConferma() {
        setErrore(''); setInviando(true)
        try {
            const body = { action: 'set-password', cliente_id: cliente.id }
            if (modo === 'manuale') {
                if (!pwdManuale || pwdManuale.length < 8) {
                    throw new Error(t('cambio_password.errore_pwd_corta'))
                }
                body.new_password = pwdManuale
            }
            const { data, error } = await supabase.functions.invoke('avvocato-cliente-actions', { body })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('cambio_password.errore_generico'))
            setRisultato(data)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    function handleCopia() {
        if (!risultato?.password) return
        navigator.clipboard.writeText(risultato.password)
        setCopiato(true)
        setTimeout(() => setCopiato(false), 2000)
    }

    function handleChiudi() {
        if (risultato) {
            onSuccess(t('cambio_password.successo_aggiornata', { nome: nomeCliente(cliente) }))
        }
        onClose()
    }

    if (risultato) {
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <CheckCircle size={18} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-lg text-nebbia">{t('cambio_password.titolo_successo')}</h2>
                    </div>

                    {risultato.generata && (
                        <>
                            <div className="bg-amber-900/10 border border-amber-500/30 p-3">
                                <p className="font-body text-xs text-amber-400 leading-relaxed">
                                    <span className="font-medium">{t('cambio_password.importante_label')}</span> {t('cambio_password.avviso_mostrata_una_volta')}
                                </p>
                            </div>

                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    {t('cambio_password.password_temporanea')}
                                </label>
                                <div className="flex items-center gap-2 bg-petrolio border border-white/10 p-3">
                                    <code className="flex-1 font-mono text-base text-nebbia tracking-wider">{risultato.password}</code>
                                    <button onClick={handleCopia} className="text-oro hover:text-oro/70 shrink-0">
                                        {copiato ? <Check size={15} /> : <Copy size={15} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {!risultato.generata && (
                        <p className="font-body text-sm text-nebbia/60">
                            {t('cambio_password.aggiornata_manuale')}
                        </p>
                    )}

                    <button onClick={handleChiudi} className="btn-primary text-sm w-full justify-center">
                        {t('cambio_password.chiudi_presa_nota')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">{t('cambio_password.titolo')}</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        <Trans t={t} i18nKey="cambio_password.stai_cambiando" values={{ nome: nomeCliente(cliente) }}>
                            Stai cambiando la password di <span className="text-nebbia font-medium">{nomeCliente(cliente)}</span>.
                        </Trans>
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setModo('genera')}
                            className={`flex flex-col items-start gap-1 p-3 border text-left transition-colors ${modo === 'genera'
                                ? 'border-oro bg-oro/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw size={12} className={modo === 'genera' ? 'text-oro' : 'text-nebbia/40'} />
                                <span className="font-body text-sm font-medium text-nebbia">{t('cambio_password.genera_casuale')}</span>
                            </div>
                            <p className="font-body text-xs text-nebbia/40">{t('cambio_password.genera_desc')}</p>
                        </button>
                        <button
                            onClick={() => setModo('manuale')}
                            className={`flex flex-col items-start gap-1 p-3 border text-left transition-colors ${modo === 'manuale'
                                ? 'border-oro bg-oro/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <KeyRound size={12} className={modo === 'manuale' ? 'text-oro' : 'text-nebbia/40'} />
                                <span className="font-body text-sm font-medium text-nebbia">{t('cambio_password.manuale')}</span>
                            </div>
                            <p className="font-body text-xs text-nebbia/40">{t('cambio_password.manuale_desc')}</p>
                        </button>
                    </div>

                    {modo === 'manuale' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                {t('cambio_password.nuova_password_label')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={pwdManuale}
                                    onChange={e => setPwdManuale(e.target.value)}
                                    placeholder={t('cambio_password.placeholder_pwd')}
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-10 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                                    {showPwd ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            {t('cambio_password.annulla')}
                        </button>
                        <button onClick={handleConferma} disabled={inviando || (modo === 'manuale' && pwdManuale.length < 8)}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : t('cambio_password.conferma')
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SEZIONE STRUMENTI ASSISTENZA (reset email + cambia password)
// ─────────────────────────────────────────────────────────────
function SezioneStrumentiAssistenza({ cliente }) {
    const { t } = useTranslation('avv_clienti_dettaglio')
    const [errore, setErrore] = useState('')
    const [successo, setSuccesso] = useState('')
    const [busyReset, setBusyReset] = useState(false)
    const [modalPwd, setModalPwd] = useState(false)

    async function handleSendResetEmail() {
        if (!confirm(t('assistenza.conferma_invio_reset', { email: cliente.email }))) return
        setErrore(''); setSuccesso(''); setBusyReset(true)
        try {
            const { data, error } = await supabase.functions.invoke('avvocato-cliente-actions', {
                body: { action: 'send-reset-email', cliente_id: cliente.id }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('assistenza.errore_generico'))
            setSuccesso(data.messaggio)
            setTimeout(() => setSuccesso(''), 5000)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setBusyReset(false)
        }
    }

    return (
        <>
            <div className="bg-slate border border-amber-500/20 p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldOff size={14} className="text-amber-400" />
                    <p className="section-label !m-0">{t('assistenza.titolo')}</p>
                </div>

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {errore}
                    </div>
                )}
                {successo && (
                    <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20">
                        <CheckCircle size={14} /> {successo}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={handleSendResetEmail}
                        disabled={busyReset}
                        className="flex flex-col items-start gap-2 p-4 bg-petrolio border border-white/10 hover:border-oro/40 transition-colors text-left disabled:opacity-40"
                    >
                        <div className="flex items-center gap-2">
                            {busyReset
                                ? <span className="animate-spin w-3.5 h-3.5 border-2 border-oro border-t-transparent rounded-full" />
                                : <Mail size={14} className="text-oro" />
                            }
                            <span className="font-body text-sm font-medium text-nebbia">{t('assistenza.invia_reset')}</span>
                        </div>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {t('assistenza.invia_reset_desc')}
                        </p>
                    </button>

                    <button
                        onClick={() => setModalPwd(true)}
                        disabled={busyReset}
                        className="flex flex-col items-start gap-2 p-4 bg-petrolio border border-white/10 hover:border-oro/40 transition-colors text-left disabled:opacity-40"
                    >
                        <div className="flex items-center gap-2">
                            <KeyRound size={14} className="text-oro" />
                            <span className="font-body text-sm font-medium text-nebbia">{t('assistenza.cambia_password')}</span>
                        </div>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {t('assistenza.cambia_password_desc')}
                        </p>
                    </button>
                </div>
            </div>

            {modalPwd && (
                <ModalCambiaPasswordCliente
                    cliente={cliente}
                    onClose={() => setModalPwd(false)}
                    onSuccess={(msg) => {
                        setSuccesso(msg)
                        setTimeout(() => setSuccesso(''), 10000)
                    }}
                />
            )}
        </>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB DOCUMENTI
// ─────────────────────────────────────────────────────────────
function TabDocumenti({ clienteId }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [documenti, setDocumenti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { caricaTutto() }, [clienteId])

    async function caricaTutto() {
        setLoading(true)
        const [{ data: docs }, { data: prat }] = await Promise.all([
            supabase
                .from('archivio_documenti')
                .select('id, titolo, tipo, dimensione, ocr_status, created_at, pratica_id, categoria_id, sottocategoria_id, metadati')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false }),
            supabase
                .from('pratiche')
                .select('id, titolo')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false }),
        ])
        setDocumenti(docs ?? [])
        setPratiche(prat ?? [])
        setLoading(false)
    }

    async function apriAnteprima(doc) {
        const { data } = await supabase
            .from('archivio_documenti')
            .select('storage_path')
            .eq('id', doc.id)
            .single()
        if (!data?.storage_path) return
        const { data: signed } = await supabase.storage
            .from('archivio')
            .createSignedUrl(data.storage_path, 3600)
        if (signed?.signedUrl) window.open(signed.signedUrl, '_blank')
    }

    return (
        <div className="space-y-4">
            {/* Canale portale: pubblica/condividi documenti col cliente */}
            <DocumentiPortale clienteId={clienteId} />

            {/* Archivio documentale interno (indicizzato, collegato alle pratiche/mandati) */}
            <div className="flex justify-between items-center pt-2">
                <p className="font-body text-sm text-nebbia/40">
                    {documenti.length} {documenti.length === 1 ? t('documenti.conteggio_uno') : t('documenti.conteggio_molti')}
                    {documenti.length > 0 && (
                        <span className="ml-2 text-nebbia/25">
                            · {documenti.filter(d => d.ocr_status === 'completed').length} {t('documenti.indicizzati')}
                        </span>
                    )}
                </p>
                <Link
                    to={`/archivio?cliente_id=${clienteId}`}
                    className="btn-primary text-sm flex items-center gap-2"
                >
                    <Upload size={14} /> {t('documenti.carica_archivio')}
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : documenti.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={t('documenti.vuoto_titolo')}
                    desc={t('documenti.vuoto_desc')}
                />
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {[t('documenti.th_documento'), t('documenti.th_pratica'), t('documenti.th_dimensione'), t('documenti.th_stato'), t('documenti.th_caricato_il'), ''].map((h, hi) => (
                                    <th key={hi} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {documenti.map(doc => {
                                const sc = STATUS_OCR[doc.ocr_status] ?? STATUS_OCR.pending
                                const pratica = pratiche.find(p => p.id === doc.pratica_id)
                                return (
                                    <tr key={doc.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={14} className="text-oro/60 shrink-0" />
                                                <span className="font-body text-sm text-nebbia truncate max-w-xs">{doc.titolo}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 truncate max-w-[160px]">
                                            {pratica?.titolo ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40">{formatSize(doc.dimensione)}</td>
                                        <td className="px-4 py-3"><Badge label={t(sc.labelKey)} variant={sc.variant} /></td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                                            {new Date(doc.created_at).toLocaleDateString(dateLocale)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => apriAnteprima(doc)}
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors"
                                                    title={t('documenti.apri_anteprima')}
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <Link
                                                    to={`/archivio?cliente_id=${clienteId}`}
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors"
                                                    title={t('documenti.apri_archivio')}
                                                >
                                                    <ExternalLink size={13} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB NOTE INTERNE
// ─────────────────────────────────────────────────────────────
function TabNoteInterne({ clienteId }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [noteList, setNoteList] = useState([])
    const [loading, setLoading] = useState(true)
    const [nuovaNota, setNuovaNota] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editVal, setEditVal] = useState('')
    const [errore, setErrore] = useState('')

    useEffect(() => { caricaNote() }, [clienteId])

    async function caricaNote() {
        setLoading(true)
        const { data } = await supabase.from('note_interne')
            .select('id, testo, created_at, autore:autore_id(nome, cognome)')
            .eq('cliente_id', clienteId).order('created_at', { ascending: false })
        setNoteList(data ?? [])
        setLoading(false)
    }

    async function aggiungiNota() {
        if (!nuovaNota.trim()) return
        setErrore(''); setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase.from('note_interne')
                .insert({ cliente_id: clienteId, autore_id: user.id, testo: nuovaNota.trim() })
                .select('id, testo, created_at, autore:autore_id(nome, cognome)').single()
            if (error) throw new Error(error.message)
            setNoteList(prev => [data, ...prev]); setNuovaNota('')
        } catch (err) { setErrore(err.message) } finally { setSalvando(false) }
    }

    async function salvaNota(id) {
        if (!editVal.trim()) return
        await supabase.from('note_interne').update({ testo: editVal.trim() }).eq('id', id)
        setNoteList(prev => prev.map(n => n.id === id ? { ...n, testo: editVal.trim() } : n))
        setEditingId(null)
    }

    async function eliminaNota(id) {
        if (!confirm(t('note_interne.conferma_elimina'))) return
        await supabase.from('note_interne').delete().eq('id', id)
        setNoteList(prev => prev.filter(n => n.id !== id))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-amber-900/10 border border-amber-500/20">
                <Lock size={14} className="text-amber-400 shrink-0" />
                <p className="font-body text-xs text-amber-400">{t('note_interne.avviso_visibilita')}</p>
            </div>
            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-3">{t('note_interne.aggiungi_nota')}</p>
                <textarea rows={4} value={nuovaNota} onChange={e => setNuovaNota(e.target.value)}
                    placeholder={t('note_interne.placeholder_nota')}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mt-3"><AlertCircle size={14} /> {errore}</div>}
                <button onClick={aggiungiNota} disabled={salvando || !nuovaNota.trim()} className="btn-primary text-sm mt-3 flex items-center gap-2">
                    {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Plus size={14} /> {t('note_interne.btn_aggiungi')}</>}
                </button>
            </div>
            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-4">{t('note_interne.storico_note')}</p>
                {loading ? <div className="flex items-center justify-center py-8"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                    : noteList.length === 0 ? <EmptyState icon={StickyNote} title={t('note_interne.vuoto_titolo')} />
                        : (
                            <div className="space-y-3">
                                {noteList.map(n => (
                                    <div key={n.id} className="border border-white/5 p-4 group">
                                        {editingId === n.id ? (
                                            <div className="space-y-2">
                                                <textarea rows={3} value={editVal} onChange={e => setEditVal(e.target.value)}
                                                    className="w-full bg-petrolio border border-oro/30 text-nebbia font-body text-sm px-3 py-2 outline-none resize-none focus:border-oro/50" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => salvaNota(n.id)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><Check size={12} /> {t('note_interne.salva')}</button>
                                                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">{t('note_interne.annulla')}</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{n.testo}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={11} className="text-nebbia/25" />
                                                        <span className="font-body text-xs text-nebbia/30">{n.autore?.nome} {n.autore?.cognome} · {new Date(n.created_at).toLocaleString(dateLocale)}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditingId(n.id); setEditVal(n.testo) }} className="text-nebbia/30 hover:text-oro p-1 transition-colors"><Edit2 size={12} /></button>
                                                        <button onClick={() => eliminaNota(n.id)} className="text-nebbia/30 hover:text-red-400 p-1 transition-colors"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL REGISTRA PAGAMENTO (riuso dal flusso fatturazione CH)
// Inserisce in pagamenti_fattura; lo stato fattura passa a 'pagata'
// automaticamente via trigger trg_pagamenti_fattura_stato su CH.
// ─────────────────────────────────────────────────────────────
function ModalRegistraPagamento({ fattura, residuo, onClose, onSuccess }) {
    const { t } = useTranslation('avv_clienti_dettaglio')
    const [form, setForm] = useState({
        data_pagamento: new Date().toISOString().slice(0, 10),
        importo: residuo.toFixed(2),
        metodo: 'bonifico',
        riferimento: '',
        note: '',
    })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    async function handleSalva() {
        setErrore('')
        const imp = Number(form.importo)
        if (isNaN(imp) || imp <= 0) { setErrore(t('registra_pagamento.errore_importo')); return }
        if (!form.data_pagamento) { setErrore(t('registra_pagamento.errore_data')); return }

        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('pagamenti_fattura').insert({
                fattura_id: fattura.id,
                data_pagamento: form.data_pagamento,
                importo: imp,
                metodo: form.metodo,
                riferimento: form.riferimento?.trim() || null,
                note: form.note?.trim() || null,
                registrato_da: user.id,
            })
            if (error) throw new Error(error.message)
            onSuccess()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-salvia" />
                        <h2 className="font-display text-lg text-nebbia">{t('registra_pagamento.titolo')}</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1">
                        <p className="font-body text-xs text-nebbia/40">
                            {t('registra_pagamento.fattura')} <span className="text-nebbia/70">{fattura.numero}</span>
                        </p>
                        <p className="font-body text-xs text-nebbia/40">
                            {t('registra_pagamento.residuo_da_incassare')} <span className="text-oro font-medium">CHF {fmtCHF(residuo)}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('registra_pagamento.data_label')}</label>
                            <input
                                type="date"
                                value={form.data_pagamento}
                                onChange={e => setForm(p => ({ ...p, data_pagamento: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('registra_pagamento.importo_label')}</label>
                            <input
                                type="number" step="0.01" min="0.01"
                                value={form.importo}
                                onChange={e => setForm(p => ({ ...p, importo: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('registra_pagamento.metodo_label')}</label>
                        <select
                            value={form.metodo}
                            onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                        >
                            {METODI_PAGAMENTO.map(m => <option key={m.value} value={m.value}>{t(m.labelKey)}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            {t('registra_pagamento.riferimento_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('registra_pagamento.opzionale')}</span>
                        </label>
                        <input
                            placeholder={t('registra_pagamento.riferimento_placeholder')}
                            value={form.riferimento}
                            onChange={e => setForm(p => ({ ...p, riferimento: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            {t('registra_pagamento.note_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('registra_pagamento.opzionale')}</span>
                        </label>
                        <textarea
                            rows={2}
                            value={form.note}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none"
                        />
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} disabled={salvando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            {t('registra_pagamento.annulla')}
                        </button>
                        <button onClick={handleSalva} disabled={salvando}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Check size={14} /> {t('registra_pagamento.conferma')}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB PAGAMENTI
// Quick "Segna pagata" apre ModalRegistraPagamento (chiede metodo/data/importo);
// lo stato fattura passa a 'pagata' via trigger DB su pagamenti_fattura.
// ─────────────────────────────────────────────────────────────
function TabPagamenti({ clienteId, avvocatoId }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [fatture, setFatture] = useState([])
    const [loading, setLoading] = useState(true)
    const [fatturaPagamento, setFatturaPagamento] = useState(null)

    useEffect(() => { caricaTutto() }, [clienteId])

    async function caricaTutto() {
        setLoading(true)
        const { data: fatt } = await supabase.from('fatture').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })
        setFatture(fatt ?? [])
        setLoading(false)
    }

    // Residuo della fattura selezionata = totale - somma pagamenti già registrati
    async function apriPagamento(fatt) {
        const { data: pag } = await supabase
            .from('pagamenti_fattura')
            .select('importo')
            .eq('fattura_id', fatt.id)
        const giaPagato = (pag ?? []).reduce((a, p) => a + Number(p.importo ?? 0), 0)
        const residuo = Math.max(0, Number(fatt.totale ?? 0) - giaPagato)
        setFatturaPagamento({ ...fatt, residuo })
    }

    const totaleAperto = fatture.filter(f => ['in_attesa', 'scaduta'].includes(f.stato)).reduce((a, f) => a + parseFloat(f.totale ?? 0), 0)
    const totalePagato = fatture.filter(f => f.stato === 'pagata').reduce((a, f) => a + parseFloat(f.totale ?? 0), 0)

    return (
        <div className="space-y-4">
            {fatture.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate border border-white/5 p-4">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('pagamenti.da_incassare')}</p>
                        <p className="font-display text-2xl font-semibold text-oro">CHF {fmtCHF(totaleAperto)}</p>
                    </div>
                    <div className="bg-slate border border-white/5 p-4">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('pagamenti.incassato')}</p>
                        <p className="font-display text-2xl font-semibold text-salvia">CHF {fmtCHF(totalePagato)}</p>
                    </div>
                </div>
            )}
            <div className="flex justify-end">
                <Link to={`/pagamenti?cliente_id=${clienteId}`} className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} /> {t('pagamenti.vai_pagamenti')}
                </Link>
            </div>
            {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                : fatture.length === 0 ? <EmptyState icon={CreditCard} title={t('pagamenti.vuoto_titolo')} desc={t('pagamenti.vuoto_desc')} />
                    : (
                        <div className="bg-slate border border-white/5 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {[t('pagamenti.th_numero'), t('pagamenti.th_importo'), t('pagamenti.th_descrizione'), t('pagamenti.th_emessa_il'), t('pagamenti.th_scadenza'), t('pagamenti.th_stato'), ''].map((h, hi) => (
                                            <th key={hi} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fatture.map(fatt => {
                                        const sc = STATI_FATTURA[fatt.stato] ?? STATI_FATTURA.in_attesa
                                        return (
                                            <tr key={fatt.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/60 font-medium">{fatt.numero}</td>
                                                <td className="px-4 py-3 font-body text-sm font-semibold text-oro">CHF {fmtCHF(fatt.totale)}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{fatt.descrizione ?? '—'}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(fatt.data_emissione).toLocaleDateString(dateLocale)}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{fatt.data_scadenza ? new Date(fatt.data_scadenza).toLocaleDateString(dateLocale) : '—'}</td>
                                                <td className="px-4 py-3"><Badge label={t(sc.labelKey)} variant={sc.variant} /></td>
                                                <td className="px-4 py-3 text-right">
                                                    {['in_attesa', 'scaduta'].includes(fatt.stato) && (
                                                        <button onClick={() => apriPagamento(fatt)} className="font-body text-xs text-salvia hover:text-salvia/70 transition-colors whitespace-nowrap">{t('pagamenti.segna_pagata')}</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

            {fatturaPagamento && (
                <ModalRegistraPagamento
                    fattura={fatturaPagamento}
                    residuo={fatturaPagamento.residuo}
                    onClose={() => setFatturaPagamento(null)}
                    onSuccess={() => { setFatturaPagamento(null); caricaTutto() }}
                />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB COMUNICAZIONI
// ─────────────────────────────────────────────────────────────
function TabComunicazioni({ clienteId }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [tickets, setTickets] = useState([])
    const [ticketAperto, setTicketAperto] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ titolo: '' })
    const [testo, setTesto] = useState('')
    const [loading, setLoading] = useState(true)
    const [meId, setMeId] = useState(null)
    const bottomRef = useRef(null)

    useEffect(() => { caricaTickets() }, [clienteId])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

    async function caricaTickets() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setMeId(user.id)
        const { data } = await supabase.from('ticket_assistenza')
            .select('*, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
            .or(`and(mittente_id.eq.${user.id},destinatario_id.eq.${clienteId}),and(mittente_id.eq.${clienteId},destinatario_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
        setTickets(data ?? [])
        setLoading(false)
    }

    async function apriTicket(ticket) {
        setTicketAperto(ticket)
        const { data } = await supabase.from('messaggi_ticket').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true })
        setMessaggi(data ?? [])
    }

    async function creaNuovoTicket() {
        if (!form.titolo.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('ticket_assistenza').insert({
            mittente_id: user.id, destinatario_id: clienteId,
            oggetto: form.titolo.trim(), mittente_ruolo: 'avvocato', stato: 'aperto',
        }).select().single()
        if (error) return
        setTickets(prev => [data, ...prev]); setShowForm(false); setForm({ titolo: '' })
        apriTicket(data)
    }

    async function inviaMessaggio() {
        if (!testo.trim() || ticketAperto?.stato === 'chiuso') return
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('messaggi_ticket')
            .insert({ ticket_id: ticketAperto.id, autore_id: user.id, autore_tipo: 'avvocato', testo: testo.trim() })
            .select().single()
        if (error) return
        setMessaggi(prev => [...prev, data]); setTesto('')
    }

    async function chiudiTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'chiuso' }).eq('id', ticketAperto.id)
        setTicketAperto(prev => ({ ...prev, stato: 'chiuso' }))
        setTickets(prev => prev.map(t => t.id === ticketAperto.id ? { ...t, stato: 'chiuso' } : t))
    }

    if (ticketAperto) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setTicketAperto(null); setMessaggi([]) }} className="text-nebbia/40 hover:text-nebbia transition-colors">
                            <ArrowRight size={16} className="rotate-180" />
                        </button>
                        <p className="font-body text-sm font-medium text-nebbia">{ticketAperto.oggetto}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`font-body text-xs px-2 py-0.5 border ${ticketAperto.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                            {ticketAperto.stato === 'aperto' ? t('comunicazioni.stato_aperto') : t('comunicazioni.stato_chiuso')}
                        </span>
                        {ticketAperto.stato === 'aperto' && (
                            <button onClick={chiudiTicket} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/30 px-3 py-1">{t('comunicazioni.chiudi_ticket')}</button>
                        )}
                    </div>
                </div>
                <div className="bg-slate border border-white/5 flex flex-col" style={{ height: 420 }}>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {messaggi.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <MessageSquare size={28} className="text-nebbia/15" />
                                <p className="font-body text-sm text-nebbia/30">{t('comunicazioni.nessun_messaggio')}</p>
                            </div>
                        ) : messaggi.map(msg => {
                            const isMio = msg.autore_id === meId
                            return (
                                <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-sm px-4 py-2.5 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio border border-white/10'}`}>
                                        <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                                        <p className={`font-body text-[10px] mt-1 ${isMio ? 'text-oro/50 text-right' : 'text-nebbia/30'}`}>
                                            {new Date(msg.created_at).toLocaleString(dateLocale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={bottomRef} />
                    </div>
                    {ticketAperto.stato === 'aperto' ? (
                        <div className="border-t border-white/5 p-4 flex gap-3 items-end">
                            <textarea rows={2} value={testo} onChange={e => setTesto(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
                                placeholder={t('comunicazioni.placeholder_messaggio')}
                                className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                            <button onClick={inviaMessaggio} disabled={!testo.trim()} className="btn-primary text-sm self-end px-4 py-3 shrink-0 disabled:opacity-40"><Send size={15} /></button>
                        </div>
                    ) : (
                        <div className="border-t border-white/5 p-4 text-center">
                            <p className="font-body text-xs text-nebbia/30">{t('comunicazioni.ticket_chiuso')}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="font-body text-sm text-nebbia/40">{tickets.length} {tickets.length === 1 ? t('comunicazioni.conteggio_uno') : t('comunicazioni.conteggio_molti')}</p>
                <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} />{showForm ? t('comunicazioni.annulla') : t('comunicazioni.nuovo_ticket')}
                </button>
            </div>
            {showForm && (
                <div className="bg-slate border border-oro/20 p-5 space-y-4">
                    <p className="section-label">{t('comunicazioni.nuovo_ticket_titolo')}</p>
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('comunicazioni.titolo_label')}</label>
                        <input value={form.titolo} onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))}
                            placeholder={t('comunicazioni.titolo_placeholder')}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">{t('comunicazioni.annulla')}</button>
                        <button onClick={creaNuovoTicket} disabled={!form.titolo.trim()} className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">{t('comunicazioni.apri_ticket')}</button>
                    </div>
                </div>
            )}
            {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                : tickets.length === 0 ? <EmptyState icon={MessageSquare} title={t('comunicazioni.vuoto_titolo')} desc={t('comunicazioni.vuoto_desc')} />
                    : (
                        <div className="space-y-2">
                            {tickets.map(ticket => {
                                const msgs = [...(ticket.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                const nonLetto = ticket.stato === 'aperto' && msgs.length > 0 && msgs[0]?.autore_tipo !== 'avvocato'
                                return (
                                    <button key={ticket.id} onClick={() => apriTicket(ticket)} className="w-full text-left bg-slate border border-white/5 hover:border-oro/20 p-4 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {nonLetto && <span className="w-1.5 h-1.5 rounded-full bg-oro shrink-0" />}
                                                <div className="min-w-0">
                                                    <p className="font-body text-sm font-medium text-nebbia truncate">{ticket.oggetto}</p>
                                                    <p className="font-body text-xs text-nebbia/25 mt-1">{new Date(ticket.created_at).toLocaleDateString(dateLocale)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`font-body text-xs px-2 py-0.5 border ${ticket.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                                                    {ticket.stato === 'aperto' ? t('comunicazioni.stato_aperto') : t('comunicazioni.stato_chiuso')}
                                                </span>
                                                <ArrowRight size={14} className="text-nebbia/20" />
                                            </div>
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
// PANNELLO PRATICA + PROSSIMI APPUNTAMENTI
// ─────────────────────────────────────────────────────────────
function PannelloPratica({ pratica, onClose }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [documenti, setDocumenti] = useState([])
    const [ricerche, setRicerche] = useState([])
    const [loadingExtra, setLoadingExtra] = useState(true)
    const scStato = STATI_PRATICA[pratica.stato]
    const sc = scStato
        ? { label: t(scStato.labelKey), variant: scStato.variant }
        : { label: pratica.stato ?? t('stati_pratica.aperta'), variant: 'salvia' }

    useEffect(() => {
        async function carica() {
            setLoadingExtra(true)
            const [{ data: docs }, { data: rich }] = await Promise.all([
                supabase.from('documenti_pratiche')
                    .select('id, nome_file, dimensione, created_at')
                    .eq('pratica_id', pratica.id)
                    .order('created_at', { ascending: false }),
                // CH: le ricerche vivono nella tabella unificata "ricerche"
                // (campo testo si chiama "contenuto"); niente 'sentenza_acquistata'
                supabase.from('ricerche')
                    .select('id, tipo, titolo, contenuto, metadati, created_at, autore:autore_id(nome, cognome)')
                    .eq('pratica_id', pratica.id)
                    .in('tipo', ['ricerca_ai', 'ricerca_manuale'])
                    .order('created_at', { ascending: false }),
            ])
            setDocumenti(docs ?? [])
            setRicerche(rich ?? [])
            setLoadingExtra(false)
        }
        carica()
    }, [pratica.id])

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('pannello_pratica.pratica')}</p>
                    <h3 className="font-display text-xl font-semibold text-nebbia">{pratica.titolo}</h3>
                    <p className="font-body text-xs text-nebbia/40 mt-1">{pratica.tipo ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge label={sc.label} variant={sc.variant} />
                    {onClose && (
                        <button onClick={onClose} className="text-nebbia/20 hover:text-nebbia p-1 ml-1">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            <Link
                to={`/pratiche/${pratica.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
            >
                <ArrowRight size={13} /> {t('pannello_pratica.apri_modifica')}
            </Link>
            <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                <p className="section-label mb-2">{t('pannello_pratica.dettagli')}</p>
                {[
                    [t('pannello_pratica.lbl_tipo'), pratica.tipo ?? '—'],
                    [t('pannello_pratica.lbl_creata_il'), new Date(pratica.created_at).toLocaleDateString(dateLocale)],
                    [t('pannello_pratica.lbl_stato'), sc.label],
                    ...(pratica.esito ? [[t('pannello_pratica.lbl_esito'), pratica.esito.charAt(0).toUpperCase() + pratica.esito.slice(1)]] : []),
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
            </div>
            {pratica.prossima_udienza ? (
                <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/25">
                    <Calendar size={16} className="text-red-400" />
                    <div>
                        <p className="font-body text-xs text-red-400/60 uppercase tracking-widest mb-0.5">{t('pannello_pratica.prossima_udienza')}</p>
                        <span className="font-body text-sm text-red-400">{new Date(pratica.prossima_udienza).toLocaleDateString(dateLocale)}</span>
                    </div>
                </div>
            ) : (
                <EmptyState icon={Calendar} title={t('pannello_pratica.nessuna_scadenza')} />
            )}
            {pratica.note && (
                <div className="bg-petrolio/40 border border-white/5 p-4">
                    <p className="section-label mb-2">{t('pannello_pratica.note_interne')}</p>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line line-clamp-4">{pratica.note}</p>
                </div>
            )}
            {loadingExtra ? (
                <div className="flex justify-center py-4">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    <div className="bg-petrolio/40 border border-white/5 p-4">
                        <p className="section-label mb-3">{t('pannello_pratica.documenti')} ({documenti.length})</p>
                        {documenti.length === 0 ? (
                            <p className="font-body text-xs text-nebbia/30">{t('pannello_pratica.nessun_documento')}</p>
                        ) : documenti.map(d => (
                            <div key={d.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                                <FileText size={12} className="text-nebbia/30 shrink-0" />
                                <p className="font-body text-xs text-nebbia/70 truncate flex-1">{d.nome_file}</p>
                                <span className="font-body text-xs text-nebbia/25">
                                    {new Date(d.created_at).toLocaleDateString(dateLocale)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-petrolio/40 border border-white/5 p-4">
                        <p className="section-label mb-3">{t('pannello_pratica.ricerche')} ({ricerche.length})</p>
                        {ricerche.length === 0 ? (
                            <p className="font-body text-xs text-nebbia/30">{t('pannello_pratica.nessuna_ricerca')}</p>
                        ) : ricerche.map(r => (
                            <div key={r.id} className="py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {r.tipo === 'ricerca_ai'
                                        ? <Sparkles size={10} className="text-salvia shrink-0" />
                                        : <Search size={10} className="text-oro shrink-0" />
                                    }
                                    <p className="font-body text-xs font-medium text-nebbia/70 truncate">
                                        {r.metadati?.domanda ?? r.titolo ?? '—'}
                                    </p>
                                </div>
                                <p className="font-body text-xs text-nebbia/40 line-clamp-2 ml-4">{r.contenuto}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function ProssimiAppuntamenti({ clienteId }) {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [appuntamenti, setAppuntamenti] = useState([])

    useEffect(() => {
        async function carica() {
            const oggi = new Date().toISOString()
            const { data } = await supabase
                .from('appuntamenti')
                .select('id, titolo, tipo, data_ora_inizio, stato')
                .eq('cliente_id', clienteId)
                .eq('stato', 'programmato')
                .gte('data_ora_inizio', oggi)
                .order('data_ora_inizio', { ascending: true })
                .limit(3)
            setAppuntamenti(data ?? [])
        }
        carica()
    }, [clienteId])

    if (appuntamenti.length === 0) return null

    return (
        <div className="bg-slate border border-white/5 p-5">
            <p className="section-label mb-3">{t('appuntamenti.titolo')}</p>
            <div className="space-y-2">
                {appuntamenti.map(a => (
                    <div key={a.id} className={`flex items-center gap-3 p-3 border ${a.tipo === 'udienza' ? 'bg-red-900/10 border-red-500/20' : 'bg-petrolio/40 border-white/5'}`}>
                        <Calendar size={13} className={a.tipo === 'udienza' ? 'text-red-400 shrink-0' : 'text-nebbia/30 shrink-0'} />
                        <div className="min-w-0 flex-1">
                            <p className="font-body text-sm text-nebbia truncate">{a.titolo}</p>
                            <p className={`font-body text-xs mt-0.5 ${a.tipo === 'udienza' ? 'text-red-400/60' : 'text-nebbia/30'}`}>
                                {new Date(a.data_ora_inizio).toLocaleDateString(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' })}
                                {' — '}
                                {new Date(a.data_ora_inizio).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {a.tipo === 'udienza' && (
                            <span className="font-body text-xs text-red-400/60 border border-red-500/20 px-2 py-0.5 shrink-0">{t('appuntamenti.udienza')}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL RESET PASSWORD
// ─────────────────────────────────────────────────────────────
function ModalResetPassword({ cliente, onClose }) {
    const { t } = useTranslation('avv_clienti_dettaglio')
    const [password, setPassword] = useState('')
    const [mostraPassword, setMostraPassword] = useState(false)
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [completato, setCompletato] = useState(false)

    async function eseguiReset() {
        setErrore('')
        if (!password) return setErrore(t('reset_password.errore_inserisci'))
        if (password.length < 8) return setErrore(t('reset_password.errore_minimo'))

        setInviando(true)
        try {
            const { data, error } = await supabase.functions.invoke('cliente-reset-password', {
                body: { cliente_id: cliente.id, nuova_password: password }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('reset_password.errore_reset'))
            setCompletato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    if (completato) {
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <CheckCircle size={18} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-lg text-nebbia">{t('reset_password.titolo_successo')}</h2>
                    </div>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        {t('reset_password.successo_desc')}
                    </p>
                    <button onClick={onClose} className="btn-primary text-sm w-full justify-center">
                        {t('reset_password.chiudi')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-oro/30 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">{t('reset_password.titolo')}</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        {t('reset_password.descrizione')}
                    </p>

                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                            {t('reset_password.nuova_password_label')}
                        </label>
                        <div className="relative">
                            <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                            <input
                                type={mostraPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={t('reset_password.placeholder_pwd')}
                                autoFocus
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-10 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button
                                type="button"
                                onClick={() => setMostraPassword(v => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia p-1"
                            >
                                {mostraPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            {t('reset_password.annulla')}
                        </button>
                        <button
                            type="button"
                            onClick={eseguiReset}
                            disabled={inviando || !password}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro/10 border border-oro/40 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Lock size={14} /> {t('reset_password.imposta_password')}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO CLIENTE — pagina principale
// ─────────────────────────────────────────────────────────────
export default function AvvocatoClientiDettaglio() {
    const { t, i18n } = useTranslation('avv_clienti_dettaglio')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const { id } = useParams()
    const { role } = useAuth()
    const isFiduciario = role === 'fiduciario'
    const isProgettista = role === 'progettista'
    const TABS = isFiduciario
        ? [
            { id: 'panoramica', label: t('tabs.panoramica'), icon: User },
            { id: 'mandati', label: t('tabs.mandati'), icon: FolderOpen },
            { id: 'dipendenti', label: t('tabs.dipendenti'), icon: Users },
            { id: 'contabilita', label: t('tabs.contabilita'), icon: BookOpen },
            { id: 'documenti', label: t('tabs.documenti'), icon: FileText },
            { id: 'comunicazioni', label: t('tabs.comunicazioni'), icon: MessageSquare },
            { id: 'note_interne', label: t('tabs.note_interne'), icon: Lock },
            { id: 'pagamenti', label: t('tabs.pagamenti'), icon: CreditCard },
        ]
        : isProgettista
        ? [
            { id: 'panoramica', label: t('tabs.panoramica'), icon: User },
            { id: 'progetti', label: t('tabs.progetti'), icon: DraftingCompass },
            { id: 'documenti', label: t('tabs.documenti'), icon: FileText },
            { id: 'comunicazioni', label: t('tabs.comunicazioni'), icon: MessageSquare },
            { id: 'note_interne', label: t('tabs.note_interne'), icon: Lock },
            { id: 'pagamenti', label: t('tabs.pagamenti'), icon: CreditCard },
        ]
        : [
            { id: 'panoramica', label: t('tabs.panoramica'), icon: User },
            { id: 'pratiche', label: t('tabs.pratiche'), icon: FolderOpen },
            { id: 'documenti', label: t('tabs.documenti'), icon: FileText },
            { id: 'comunicazioni', label: t('tabs.comunicazioni'), icon: MessageSquare },
            { id: 'note_interne', label: t('tabs.note_interne'), icon: Lock },
            { id: 'pagamenti', label: t('tabs.pagamenti'), icon: CreditCard },
        ]
    const [cliente, setCliente] = useState(null)
    const [tab, setTab] = useState('panoramica')
    const [refreshMovimenti, setRefreshMovimenti] = useState(0)
    const [pratiche, setPratiche] = useState([])
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [praticaSelezionata, setPraticaSelezionata] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editPanoramica, setEditPanoramica] = useState(false)
    const [formCliente, setFormCliente] = useState({})
    const [salvandoCliente, setSalvandoCliente] = useState(false)
    const [erroreCliente, setErroreCliente] = useState('')
    const [avvocatoId, setAvvocatoId] = useState('')
    const [meId, setMeId] = useState(null)
    const [mostraModalReset, setMostraModalReset] = useState(false)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            // CH: anagrafica svizzera — numero_avs, uid, forma_giuridica, iva_attiva,
            // citta, cantone, rappr_avs; niente cf/partita_iva/pec/comune/provincia
            const { data: c } = await supabase.from('profiles')
                .select('id, tipo_soggetto, nome, cognome, ragione_sociale, uid, forma_giuridica, iva_attiva, sede_legale, rappr_nome, rappr_cognome, rappr_avs, rappr_carica, email, telefono, numero_avs, data_nascita, luogo_nascita, indirizzo, citta, cantone, cap, note_iniziali, avvocato_id, created_at')
                .eq('id', id).single()
            if (c) {
                const cliente = { ...c, tipo_soggetto: c.tipo_soggetto ?? 'persona_fisica' }
                setCliente(cliente); setFormCliente(cliente); setAvvocatoId(c.avvocato_id ?? '')
            }

            const { data: pr } = await supabase.from('pratiche').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
            setPratiche(pr ?? [])

            const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
            if ((profilo?.posti_acquistati ?? 1) > 1) {
                setIsStudio(true)
                const { data: collabs } = await supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
                setCollaboratori(collabs ?? [])
            }
            setLoading(false)
        }
        carica()
    }, [id])

    async function salvaCliente() {
        setErroreCliente(''); setSalvandoCliente(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${supabaseUrl}/functions/v1/update-cliente`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        cliente_id: id,
                        tipo_soggetto: formCliente.tipo_soggetto ?? 'persona_fisica',
                        nome: formCliente.nome,
                        cognome: formCliente.cognome,
                        ragione_sociale: formCliente.ragione_sociale,
                        uid: formCliente.uid,
                        forma_giuridica: formCliente.forma_giuridica,
                        iva_attiva: formCliente.iva_attiva,
                        sede_legale: formCliente.sede_legale,
                        rappr_nome: formCliente.rappr_nome,
                        rappr_cognome: formCliente.rappr_cognome,
                        rappr_avs: formCliente.rappr_avs,
                        rappr_carica: formCliente.rappr_carica,
                        numero_avs: formCliente.numero_avs,
                        data_nascita: formCliente.data_nascita,
                        luogo_nascita: formCliente.luogo_nascita,
                        email: formCliente.email,
                        telefono: formCliente.telefono,
                        indirizzo: formCliente.indirizzo,
                        citta: formCliente.citta,
                        cantone: formCliente.cantone,
                        cap: formCliente.cap,
                        avvocato_id: avvocatoId || null,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setCliente(json.cliente)
            setFormCliente(json.cliente)
            setEditPanoramica(false)
        } catch (err) {
            setErroreCliente(err.message)
        } finally {
            setSalvandoCliente(false)
        }
    }

    const fc = k => ({ value: formCliente[k] ?? '', onChange: e => setFormCliente(p => ({ ...p, [k]: e.target.value })) })
    const nomeAvvocato = avvocatoId === meId ? t('principale.tu')
        : collaboratori.find(c => c.id === avvocatoId)
            ? `${collaboratori.find(c => c.id === avvocatoId).nome} ${collaboratori.find(c => c.id === avvocatoId).cognome}`
            : '—'

    if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!cliente) return <div className="space-y-5"><BackButton to="/clienti" label={t('principale.tutti_clienti')} /><p className="font-body text-sm text-nebbia/40">{t('principale.cliente_non_trovato')}</p></div>

    const isPF = (cliente.tipo_soggetto ?? 'persona_fisica') === 'persona_fisica'
    const formIsPF = (formCliente.tipo_soggetto ?? 'persona_fisica') === 'persona_fisica'

    return (
        <div className="space-y-5">
            <BackButton to="/clienti" label={t('principale.tutti_clienti')} />
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <p className="section-label mb-2 flex items-center gap-2">
                        {isPF ? <User size={11} /> : <Building2 size={11} />}
                        {isPF ? t('principale.label_pf') : t('principale.label_pg')}
                    </p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{nomeCliente(cliente)}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">{cliente.email} · {cliente.telefono ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {isStudio && (
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs text-nebbia/30">{t('principale.assegnato_a')}</span>
                            <select value={avvocatoId} onChange={e => setAvvocatoId(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50">
                                <option value={meId}>{t('principale.tu')}</option>
                                {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={() => setMostraModalReset(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                    >
                        <Lock size={12} /> {t('principale.reset_password')}
                    </button>
                </div>
            </div>

            {/* Strumenti di assistenza accesso cliente — sempre visibili */}
            <SezioneStrumentiAssistenza cliente={cliente} />

            <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
                {TABS.map(({ id: tid, label, icon: Icon }) => (
                    <button key={tid} onClick={() => { setTab(tid); setPraticaSelezionata(null) }}
                        className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                            } ${tid === 'note_interne' ? 'text-amber-400/70 hover:text-amber-400' : ''}`}>
                        <Icon size={14} strokeWidth={1.5} />{label}
                        {tid === 'note_interne' && <Lock size={11} className="opacity-50" />}
                    </button>
                ))}
            </div>

            {tab === 'panoramica' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label">{t('anagrafica.titolo')}</p>
                            {!editPanoramica
                                ? <button onClick={() => setEditPanoramica(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/30 hover:text-oro transition-colors"><Edit2 size={12} /> {t('anagrafica.modifica')}</button>
                                : <div className="flex gap-2">
                                    <button onClick={salvaCliente} disabled={salvandoCliente} className="flex items-center gap-1 font-body text-xs text-salvia">
                                        {salvandoCliente ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" /> : <Check size={12} />} {t('anagrafica.salva')}
                                    </button>
                                    <button onClick={() => { setFormCliente({ ...cliente }); setEditPanoramica(false); setErroreCliente('') }} className="font-body text-xs text-nebbia/30 hover:text-red-400"><X size={12} /></button>
                                </div>
                            }
                        </div>

                        {editPanoramica ? (
                            <div className="space-y-4">
                                <SwitcherTipoSoggetto
                                    value={formCliente.tipo_soggetto ?? 'persona_fisica'}
                                    onChange={t => setFormCliente(p => ({ ...p, tipo_soggetto: t }))}
                                />

                                {formIsPF ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label={t('anagrafica.nome')} {...fc('nome')} />
                                            <InputField label={t('anagrafica.cognome')} {...fc('cognome')} />
                                        </div>
                                        <InputField label={t('anagrafica.numero_avs')} placeholder="756.XXXX.XXXX.XX" {...fc('numero_avs')} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('anagrafica.data_nascita')}</label>
                                                <input type="date" {...fc('data_nascita')}
                                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
                                            </div>
                                            <InputField label={t('anagrafica.luogo_nascita')} placeholder={t('anagrafica.luogo_nascita_placeholder')} {...fc('luogo_nascita')} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <InputField label={t('anagrafica.ragione_sociale')} {...fc('ragione_sociale')} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label={t('anagrafica.numero_uid')} placeholder={t('anagrafica.uid_placeholder')} {...fc('uid')} />
                                            <InputField label={t('anagrafica.forma_giuridica')} placeholder={t('anagrafica.forma_giuridica_placeholder')} {...fc('forma_giuridica')} />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!formCliente.iva_attiva}
                                                onChange={e => setFormCliente(p => ({ ...p, iva_attiva: e.target.checked }))}
                                                className="accent-oro w-4 h-4" />
                                            <span className="font-body text-sm text-nebbia/70">{t('anagrafica.assoggettato_iva')}</span>
                                        </label>
                                        <InputField label={t('anagrafica.sede_legale')} {...fc('sede_legale')} />
                                        <div className="border-t border-white/8 pt-3 space-y-3">
                                            <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">{t('anagrafica.rappresentante_legale')}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField label={t('anagrafica.nome')} {...fc('rappr_nome')} />
                                                <InputField label={t('anagrafica.cognome')} {...fc('rappr_cognome')} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField label={t('anagrafica.numero_avs_rappr')} placeholder="756.XXXX.XXXX.XX" {...fc('rappr_avs')} />
                                                <InputField label={t('anagrafica.carica')} placeholder={t('anagrafica.carica_placeholder')} {...fc('rappr_carica')} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="border-t border-white/8 pt-3 space-y-3">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">{t('anagrafica.contatti')}</p>
                                    <InputField label={t('anagrafica.email')} type="email" {...fc('email')} />
                                    <InputField label={t('anagrafica.telefono')} placeholder={t('anagrafica.telefono_placeholder')} {...fc('telefono')} />
                                </div>

                                <div className="border-t border-white/8 pt-3 space-y-3">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">{t('anagrafica.indirizzo')}</p>
                                    <InputField label={t('anagrafica.indirizzo')} placeholder={t('anagrafica.indirizzo_placeholder')} {...fc('indirizzo')} />
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <InputField label={t('anagrafica.localita')} placeholder={t('anagrafica.luogo_nascita_placeholder')} {...fc('citta')} />
                                        </div>
                                        <InputField label={t('anagrafica.cantone')} placeholder="TI" {...fc('cantone')} />
                                    </div>
                                    <InputField label={t('anagrafica.npa')} placeholder="6900" {...fc('cap')} />
                                </div>

                                {erroreCliente && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {erroreCliente}</div>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {isPF ? [
                                    [t('anagrafica.nome_completo'), `${cliente.nome ?? ''} ${cliente.cognome ?? ''}`.trim() || '—'],
                                    [t('anagrafica.numero_avs'), cliente.numero_avs || '—'],
                                    [t('anagrafica.data_nascita'), cliente.data_nascita ? new Date(cliente.data_nascita).toLocaleDateString(dateLocale) : '—'],
                                    [t('anagrafica.luogo_nascita'), cliente.luogo_nascita || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                        <span className="font-body text-sm text-nebbia">{v}</span>
                                    </div>
                                )) : [
                                    [t('anagrafica.ragione_sociale'), cliente.ragione_sociale || '—'],
                                    [t('anagrafica.numero_uid'), cliente.uid || '—'],
                                    [t('anagrafica.forma_giuridica'), cliente.forma_giuridica || '—'],
                                    [t('anagrafica.assoggettato_iva'), cliente.iva_attiva ? t('anagrafica.si') : t('anagrafica.no')],
                                    [t('anagrafica.sede_legale'), cliente.sede_legale || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                        <span className="font-body text-sm text-nebbia">{v}</span>
                                    </div>
                                ))}

                                {!isPF && (cliente.rappr_nome || cliente.rappr_cognome || cliente.rappr_carica) && (
                                    <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('anagrafica.rappresentante_legale')}</p>
                                        {[
                                            [t('anagrafica.nome'), `${cliente.rappr_nome ?? ''} ${cliente.rappr_cognome ?? ''}`.trim() || '—'],
                                            [t('anagrafica.numero_avs'), cliente.rappr_avs || '—'],
                                            [t('anagrafica.carica'), cliente.rappr_carica || '—'],
                                        ].map(([l, v]) => (
                                            <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                                <span className="font-body text-sm text-nebbia/70">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('anagrafica.contatti')}</p>
                                    {[
                                        [t('anagrafica.email'), cliente.email],
                                        [t('anagrafica.telefono'), cliente.telefono || '—'],
                                    ].map(([l, v]) => (
                                        <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className="font-body text-sm text-nebbia/70">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{t('anagrafica.indirizzo')}</p>
                                    {[
                                        [t('anagrafica.indirizzo'), cliente.indirizzo || '—'],
                                        [t('anagrafica.localita'), cliente.citta || '—'],
                                        [t('anagrafica.cantone'), cliente.cantone || '—'],
                                        [t('anagrafica.npa'), cliente.cap || '—'],
                                    ].map(([l, v]) => (
                                        <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className="font-body text-sm text-nebbia/70">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {isStudio && (
                                    <div className="border-t border-white/5 pt-3 mt-3">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('anagrafica.avvocato_assegnato')}</span>
                                            <span className="font-body text-sm text-nebbia">{nomeAvvocato}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <ProssimiAppuntamenti clienteId={id} />
                </div>
            )}

            {tab === 'pratiche' && (
                <div className="flex gap-4 min-h-[500px]">
                    <div className={`flex flex-col gap-2 ${praticaSelezionata ? 'w-[20%] shrink-0' : 'flex-1'}`}>
                        <div className="flex justify-end mb-1">
                            <Link to={`/pratiche/nuova?cliente_id=${id}`} className="btn-primary text-sm flex items-center gap-2"><Plus size={14} />{t('pratiche.nuova_pratica')}</Link>
                        </div>
                        {pratiche.length === 0 ? (
                            <div className="bg-slate border border-white/5 p-8 text-center"><p className="font-body text-sm text-nebbia/30">{t('pratiche.vuoto')}</p></div>
                        ) : pratiche.map(p => {
                            const sc = STATI_PRATICA[p.stato] ?? STATI_PRATICA.aperta
                            const sel = praticaSelezionata?.id === p.id
                            return (
                                <button key={p.id} onClick={() => setPraticaSelezionata(sel ? null : p)}
                                    className={`w-full text-left p-4 border transition-all ${sel ? 'bg-oro/8 border-oro/30' : 'bg-slate border-white/5 hover:border-oro/20'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-body text-sm font-medium text-nebbia truncate">{p.titolo}</p>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">{p.tipo}</p>
                                        </div>
                                        {p.prossima_udienza && (
                                            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-red-900/20 border border-red-500/25">
                                                <Calendar size={10} className="text-red-400" />
                                                <span className="font-body text-xs text-red-400/80">
                                                    {t('pratiche.udienza_prefix')} {new Date(p.prossima_udienza).toLocaleDateString(dateLocale)}
                                                </span>
                                            </div>
                                        )}
                                        <Badge label={t(sc.labelKey)} variant={sc.variant} />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    {praticaSelezionata && (
                        <div className="w-[80%] bg-slate border border-white/5 p-5 overflow-y-auto">
                            <PannelloPratica pratica={praticaSelezionata} onClose={() => setPraticaSelezionata(null)} />
                        </div>
                    )}
                </div>
            )}

            {tab === 'mandati' && <GestioneMandati clienteId={id} />}
            {tab === 'progetti' && <GestioneProgetti clienteId={id} />}
            {tab === 'dipendenti' && (
                <div className="space-y-6">
                    <EntrateUscite clienteId={id} onMovimentiChange={() => setRefreshMovimenti(k => k + 1)} />
                    <ReportConto clienteId={id} refreshTrigger={refreshMovimenti} />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        <PianificazioneLiquidita clienteId={id} refreshTrigger={refreshMovimenti} />
                        <BudgetScostamenti clienteId={id} refreshTrigger={refreshMovimenti} />
                    </div>
                    <GestioneDipendenti clienteId={id} />
                </div>
            )}
            {tab === 'contabilita' && <Contabilita clienteId={id} />}
            {tab === 'documenti' && <TabDocumenti clienteId={id} />}
            {tab === 'comunicazioni' && <TabComunicazioni clienteId={id} />}
            {tab === 'note_interne' && <TabNoteInterne clienteId={id} />}
            {tab === 'pagamenti' && <TabPagamenti clienteId={id} avvocatoId={avvocatoId} />}

            {mostraModalReset && cliente && (
                <ModalResetPassword
                    cliente={cliente}
                    onClose={() => setMostraModalReset(false)}
                />
            )}
        </div>
    )
}