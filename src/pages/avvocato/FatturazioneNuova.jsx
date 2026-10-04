// src/pages/avvocato/FatturazioneNuova.jsx — Lexum CH
//
// Wizard creazione fattura svizzera:
// - Layout 2 colonne (form a sinistra, preview live a destra)
// - Cliente obbligatorio, pratica opzionale (filtrata sul cliente)
// - Righe multiple, totali calcolati LIVE (stessa formula del trigger CH)
// - Modello fiscale CH: imponibile → IVA (o esente) → totale. Niente CPA/ritenuta.
// - Body allineato alla edge crea-fattura CH: aliquota_iva, esente_iva,
//   esente_iva_motivo, iban (NON iva_percentuale/cpa/ritenuta/iban_pagamento).
// - 04-10-2026: chi emette e' il titolare dello studio. Se non e' assoggettato
//   all'IVA la fattura esce senza (lo impone anche il server); IBAN dal suo
//   profilo; avviso se mancano i dati della QR-fattura; lingua della fattura;
//   la pratica solo per gli avvocati; errori veri delle funzioni.
// - 04-10-2026: per i fiduciari la fattura si collega al mandato (?mandato_id=).

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { PageHeader, BackButton, InputField } from '@/components/shared'
import {
    Plus, Trash2, AlertCircle, FileText, Building2, User,
    Loader2, Save, FileSignature, ChevronDown, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SelectLingua from '@/components/SelectLingua'
import { pulisciIban, formattaIban, ibanValido, isQrIban, mancanzeQr, messaggioErroreFunzione } from '@/lib/fatturazione'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const ALIQUOTA_IVA_DEFAULT = 8.1 // IVA normale svizzera 2024+

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

function fmtCHF(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Stessa formula del trigger Postgres CH (ricalcola_totali_fattura_ch):
//   imponibile = somma righe
//   iva        = esente ? 0 : imponibile * aliquota / 100
//   totale     = imponibile + iva
function calcolaTotali({ righe, aliquotaIva, esente }) {
    const imponibile = righe.reduce((s, r) => {
        const q = parseFloat(r.quantita) || 0
        const p = parseFloat(r.prezzo_unitario) || 0
        return s + q * p
    }, 0)
    const iva = esente ? 0 : Math.round(imponibile * aliquotaIva) / 100
    const totale = imponibile + iva
    return {
        imponibile: Math.round(imponibile * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        totale: Math.round(totale * 100) / 100,
    }
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PREVIEW (colonna destra, sticky)
// ─────────────────────────────────────────────────────────────
function PreviewFattura({ form, righe, totali, cliente, pratica, mandato, nonAssoggettato }) {
    const { t, i18n } = useTranslation('avv_fatturazione_nuova')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const oggi = new Date().toLocaleDateString(dateLocale)

    return (
        <div className="bg-slate border border-white/5 p-5 space-y-4 sticky top-4">
            <p className="section-label">{t('preview.titolo')}</p>

            <div className="space-y-1">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('preview.destinatario')}</p>
                {cliente ? (
                    <p className="font-body text-sm font-medium text-nebbia">{nomeCliente(cliente)}</p>
                ) : (
                    <p className="font-body text-sm text-nebbia/25 italic">{t('preview.seleziona_cliente')}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <p className="font-body text-nebbia/30 uppercase tracking-widest mb-1">{t('preview.data_emissione')}</p>
                    <p className="font-body text-nebbia/70">{form.data_emissione ? new Date(form.data_emissione).toLocaleDateString(dateLocale) : oggi}</p>
                </div>
                <div>
                    <p className="font-body text-nebbia/30 uppercase tracking-widest mb-1">{t('preview.scadenza')}</p>
                    <p className="font-body text-nebbia/70">{form.data_scadenza ? new Date(form.data_scadenza).toLocaleDateString(dateLocale) : '—'}</p>
                </div>
            </div>

            {pratica && (
                <div>
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('preview.pratica_collegata')}</p>
                    <p className="font-body text-xs text-nebbia/60 truncate">{pratica.titolo}</p>
                </div>
            )}

            {mandato && (
                <div>
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('preview.mandato_collegato')}</p>
                    <p className="font-body text-xs text-nebbia/60 truncate">{mandato.titolo}</p>
                </div>
            )}

            <div className="border-t border-white/5 pt-3">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">{t('preview.prestazioni')}</p>
                {righe.length === 0 || righe.every(r => !r.descrizione?.trim()) ? (
                    <p className="font-body text-sm text-nebbia/25 italic">{t('preview.aggiungi_riga_vuoto')}</p>
                ) : (
                    <div className="space-y-1.5">
                        {righe.filter(r => r.descrizione?.trim()).map((r, i) => {
                            const q = parseFloat(r.quantita) || 0
                            const p = parseFloat(r.prezzo_unitario) || 0
                            return (
                                <div key={i} className="flex justify-between gap-2 text-xs">
                                    <span className="font-body text-nebbia/70 truncate flex-1">{r.descrizione}</span>
                                    <span className="font-body text-nebbia/40 whitespace-nowrap">{q} x CHF {fmtCHF(p)}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs font-body text-nebbia/60">
                    <span>{t('preview.imponibile')}</span>
                    <span>CHF {fmtCHF(totali.imponibile)}</span>
                </div>
                {form.esente_iva ? (
                    <div className="flex justify-between text-xs font-body text-nebbia/60">
                        <span>{t('preview.iva_esente')}</span>
                        <span className="text-nebbia/40 italic truncate max-w-[160px]">{nonAssoggettato ? t('iva.non_assoggettato_breve') : (form.esente_iva_motivo || '—')}</span>
                    </div>
                ) : (
                    <div className="flex justify-between text-xs font-body text-nebbia/60">
                        <span>{t('preview.iva_aliquota', { aliquota: form.aliquota_iva })}</span>
                        <span>CHF {fmtCHF(totali.iva)}</span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-body text-sm font-medium text-nebbia">{t('preview.totale_fattura')}</span>
                    <span className="font-body text-base font-semibold text-oro">CHF {fmtCHF(totali.totale)}</span>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA NUOVA FATTURA
// ─────────────────────────────────────────────────────────────
export default function AvvocatoFatturazioneNuova() {
    const { t, i18n } = useTranslation('avv_fatturazione_nuova')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientePreselezionato = searchParams.get('cliente_id')
    const praticaPreselezionata = searchParams.get('pratica_id')
    const mandatoPreselezionato = searchParams.get('mandato_id')

    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [mandati, setMandati] = useState([])
    const [emittente, setEmittente] = useState(null)   // il titolare: chi emette la fattura
    const [emettoIo, setEmettoIo] = useState(true)
    const [ruolo, setRuolo] = useState(null)
    const [loading, setLoading] = useState(true)

    const [salvando, setSalvando] = useState(null) // null | 'bozza' | 'pdf'
    const [errore, setErrore] = useState('')

    const oggi = new Date().toISOString().slice(0, 10)
    const tra30giorni = (() => {
        const d = new Date(); d.setDate(d.getDate() + 30)
        return d.toISOString().slice(0, 10)
    })()

    const [form, setForm] = useState({
        cliente_id: clientePreselezionato ?? '',
        pratica_id: praticaPreselezionata ?? '',
        mandato_id: mandatoPreselezionato ?? '',
        data_emissione: oggi,
        data_scadenza: tra30giorni,
        aliquota_iva: ALIQUOTA_IVA_DEFAULT,
        esente_iva: false,
        esente_iva_motivo: '',
        note_pubbliche: '',
        note_interne: '',
        metodo_pagamento: 'bonifico',
        iban: '',
        lingua_fattura: i18n.language?.slice(0, 2) || 'it',
    })

    const [righe, setRighe] = useState([
        { descrizione: '', quantita: 1, prezzo_unitario: '' }
    ])

    // Caricamento iniziale
    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: prof } = await supabase
                .from('profiles')
                .select('id, role, titolare_id')
                .eq('id', user.id).single()

            const titolareId = prof?.titolare_id ?? user.id
            setRuolo(prof?.role ?? null)
            setEmettoIo(titolareId === user.id)

            // Chi emette: il titolare (assoggettamento IVA, IBAN, indirizzo, lingua)
            const { data: emit } = await supabase
                .from('profiles')
                .select('id, iva_attiva, iban, qr_iban, indirizzo, numero_civico, cap, citta, paese, lingua')
                .eq('id', titolareId).maybeSingle()
            setEmittente(emit ?? null)
            if (emit) {
                setForm(p => ({
                    ...p,
                    iban: emit.iban ? formattaIban(emit.iban) : p.iban,
                    lingua_fattura: ['it', 'de', 'fr'].includes(emit.lingua) ? emit.lingua : p.lingua_fattura,
                    ...(emit.iva_attiva === false ? { esente_iva: true, esente_iva_motivo: '' } : {}),
                }))
            }

            const { data: collabIds } = await supabase
                .from('profiles').select('id').eq('titolare_id', titolareId)
            const idsAvvocati = [titolareId, ...(collabIds ?? []).map(c => c.id)]

            const [{ data: cli }, { data: prat }, { data: mand }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, nome, cognome, ragione_sociale, tipo_soggetto, email')
                    .eq('role', 'cliente')
                    .in('avvocato_id', idsAvvocati)
                    .order('cognome'),
                supabase
                    .from('pratiche')
                    .select('id, titolo, cliente_id, stato')
                    .in('avvocato_id', idsAvvocati)
                    .order('created_at', { ascending: false }),
                prof?.role === 'fiduciario'
                    ? supabase
                        .from('mandati')
                        .select('id, titolo, cliente_id, anno_riferimento')
                        .in('avvocato_id', idsAvvocati)
                        .order('created_at', { ascending: false })
                    : Promise.resolve({ data: [] }),
            ])

            setClienti(cli ?? [])
            setPratiche(prat ?? [])
            setMandati(mand ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    // Quando cambia il cliente, resetta pratica se non appartiene a quel cliente
    useEffect(() => {
        if (!form.pratica_id) return
        const p = pratiche.find(p => p.id === form.pratica_id)
        if (p && p.cliente_id !== form.cliente_id) {
            setForm(prev => ({ ...prev, pratica_id: '' }))
        }
    }, [form.cliente_id, pratiche])

    // Lo stesso per il mandato
    useEffect(() => {
        if (!form.mandato_id) return
        const m = mandati.find(m => m.id === form.mandato_id)
        if (m && m.cliente_id !== form.cliente_id) {
            setForm(prev => ({ ...prev, mandato_id: '' }))
        }
    }, [form.cliente_id, mandati])

    const clienteSelezionato = useMemo(
        () => clienti.find(c => c.id === form.cliente_id) ?? null,
        [clienti, form.cliente_id]
    )

    const praticheCliente = useMemo(
        () => pratiche.filter(p => p.cliente_id === form.cliente_id && p.stato !== 'annullata'),
        [pratiche, form.cliente_id]
    )

    const praticaSelezionata = useMemo(
        () => pratiche.find(p => p.id === form.pratica_id) ?? null,
        [pratiche, form.pratica_id]
    )

    const mandatiCliente = useMemo(
        () => mandati.filter(m => m.cliente_id === form.cliente_id),
        [mandati, form.cliente_id]
    )

    const mandatoSelezionato = useMemo(
        () => mandati.find(m => m.id === form.mandato_id) ?? null,
        [mandati, form.mandato_id]
    )

    const nonAssoggettato = emittente?.iva_attiva === false
    const isAvvocato = ruolo === 'avvocato'
    const isFiduciario = ruolo === 'fiduciario'
    const ibanForm = pulisciIban(form.iban)
    // Il PDF usa l'IBAN scritto nella fattura, se c'e', altrimenti quello del profilo
    const mancaQr = emittente ? mancanzeQr({ ...emittente, iban: ibanForm || emittente.iban }) : []

    // Totali calcolati live (formula CH)
    const totali = useMemo(() => calcolaTotali({
        righe,
        aliquotaIva: Number(form.aliquota_iva) || 0,
        esente: form.esente_iva,
    }), [righe, form.aliquota_iva, form.esente_iva])

    // ─── Manipolazione righe ────────────────────────────────────
    function aggiornaRiga(i, campo, valore) {
        setRighe(prev => prev.map((r, idx) => idx === i ? { ...r, [campo]: valore } : r))
    }
    function aggiungiRiga() {
        setRighe(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: '' }])
    }
    function rimuoviRiga(i) {
        setRighe(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
    }

    // ─── Validazione ────────────────────────────────────────────
    function valida() {
        if (!form.cliente_id) return t('errori.cliente_obbligatorio')
        if (!form.data_emissione) return t('errori.data_emissione_obbligatoria')
        const righeValide = righe.filter(r => r.descrizione?.trim() && Number(r.quantita) > 0)
        if (righeValide.length === 0) return t('errori.almeno_una_riga')
        for (const r of righeValide) {
            if (isNaN(Number(r.prezzo_unitario))) return t('errori.prezzi_numerici')
        }
        if (ibanForm && !ibanValido(ibanForm)) return t('errori.iban_non_valido')
        if (ibanForm && isQrIban(ibanForm)) return t('errori.iban_qr')
        return null
    }

    // ─── Submit ────────────────────────────────────────────────
    async function salva(genePdf) {
        const err = valida()
        if (err) { setErrore(err); return }
        setErrore('')
        setSalvando(genePdf ? 'pdf' : 'bozza')

        try {
            const righeValide = righe
                .filter(r => r.descrizione?.trim())
                .map((r, idx) => ({
                    descrizione: r.descrizione.trim(),
                    quantita: Number(r.quantita),
                    prezzo_unitario: Number(r.prezzo_unitario) || 0,
                    ordine: idx,
                }))

            // Il metodo di pagamento va in fattura cosi' com'e': nella lingua della fattura
            const tFattura = i18n.getFixedT(form.lingua_fattura, 'avv_fatturazione_nuova')
            const metodo = form.metodo_pagamento ? tFattura(`pagamento.metodi.${form.metodo_pagamento}`) : null

            // 1. Crea fattura — body allineato a crea-fattura CH
            const { data: creaRes, error: creaErr } = await supabase.functions.invoke('crea-fattura', {
                body: {
                    cliente_id: form.cliente_id,
                    pratica_id: (isAvvocato && form.pratica_id) || null,
                    mandato_id: (isFiduciario && form.mandato_id) || null,
                    data_emissione: form.data_emissione,
                    data_scadenza: form.data_scadenza || null,
                    aliquota_iva: Number(form.aliquota_iva),
                    esente_iva: form.esente_iva,
                    esente_iva_motivo: form.esente_iva && !nonAssoggettato ? (form.esente_iva_motivo?.trim() || null) : null,
                    note_pubbliche: form.note_pubbliche?.trim() || null,
                    note_interne: form.note_interne?.trim() || null,
                    metodo_pagamento: metodo,
                    iban: ibanForm || null,
                    lingua_fattura: form.lingua_fattura,
                    righe: righeValide,
                }
            })

            if (creaErr || !creaRes?.ok) throw new Error(await messaggioErroreFunzione(creaErr, creaRes, t('errori.creazione_fattura')))

            const fatturaId = creaRes.fattura.id

            // 2. Se richiesto, genera PDF (= archivia automaticamente)
            if (genePdf) {
                const { data: pdfRes, error: pdfErr } = await supabase.functions.invoke('genera-fattura-pdf', {
                    body: { fattura_id: fatturaId }
                })
                if (pdfErr || !pdfRes?.ok) {
                    // La fattura esiste gia': si apre il dettaglio, da li' si rigenera il PDF
                    const motivo = await messaggioErroreFunzione(pdfErr, pdfRes, '')
                    navigate(`/fatturazione/${fatturaId}`, { state: { avviso: `${t('errori.fattura_creata_ma_pdf')}${motivo ? `: ${motivo}` : ''}` } })
                    return
                }
            }

            // 3. Naviga al dettaglio
            navigate(`/fatturazione/${fatturaId}`)
        } catch (err) {
            setErrore(err.message)
            setSalvando(null)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    return (
        <div className="space-y-5">
            <BackButton to="/fatturazione" label={t('back')} />
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {emittente && mancaQr.length > 0 && (
                <div className="bg-amber-900/10 border border-amber-500/30 p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-body text-sm text-amber-400">{t('avviso_qr.titolo')}</p>
                        <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                            {t('avviso_qr.mancano')} {mancaQr.map(k => t(`avviso_qr.campi.${k}`)).join(', ')}.{' '}
                            {emettoIo
                                ? <Link to="/profilo" className="underline hover:text-amber-300">{t('avviso_qr.completa')}</Link>
                                : t('avviso_qr.chiedi_titolare')}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
                {/* COLONNA FORM */}
                <div className="space-y-5">

                    {/* Step 1: Cliente + pratica */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">{t('destinatario.titolo')}</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('destinatario.cliente_label')}</label>
                            <select
                                value={form.cliente_id}
                                onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            >
                                <option value="">{t('destinatario.cliente_placeholder')}</option>
                                {clienti.map(c => (
                                    <option key={c.id} value={c.id}>{nomeCliente(c)}</option>
                                ))}
                            </select>
                            {clienti.length === 0 && (
                                <p className="font-body text-xs text-amber-400/70 mt-2 flex items-center gap-1.5">
                                    <Info size={11} /> <Trans i18nKey="destinatario.nessun_cliente" t={t}>Nessun cliente trovato. <Link to="/clienti/nuovo" className="underline">Crea il primo cliente</Link>.</Trans>
                                </p>
                            )}
                        </div>

                        {isAvvocato && <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {t('destinatario.pratica_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('destinatario.opzionale')}</span>
                            </label>
                            <select
                                value={form.pratica_id}
                                onChange={e => setForm(p => ({ ...p, pratica_id: e.target.value }))}
                                disabled={!form.cliente_id}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-40"
                            >
                                <option value="">{t('destinatario.nessuna_pratica')}</option>
                                {praticheCliente.map(p => (
                                    <option key={p.id} value={p.id}>{p.titolo}</option>
                                ))}
                            </select>
                            {form.cliente_id && praticheCliente.length === 0 && (
                                <p className="font-body text-xs text-nebbia/40 mt-2">{t('destinatario.nessuna_pratica_aperta')}</p>
                            )}
                        </div>}

                        {isFiduciario && <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {t('destinatario.mandato_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('destinatario.opzionale')}</span>
                            </label>
                            <select
                                value={form.mandato_id}
                                onChange={e => setForm(p => ({ ...p, mandato_id: e.target.value }))}
                                disabled={!form.cliente_id}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-40"
                            >
                                <option value="">{t('destinatario.nessun_mandato')}</option>
                                {mandatiCliente.map(m => (
                                    <option key={m.id} value={m.id}>{m.titolo}{m.anno_riferimento ? ` (${m.anno_riferimento})` : ''}</option>
                                ))}
                            </select>
                            {form.cliente_id && mandatiCliente.length === 0 && (
                                <p className="font-body text-xs text-nebbia/40 mt-2">{t('destinatario.nessun_mandato_cliente')}</p>
                            )}
                        </div>}

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('destinatario.lingua_label')}</label>
                            <SelectLingua
                                value={form.lingua_fattura}
                                onChange={v => setForm(p => ({ ...p, lingua_fattura: v }))}
                                className="w-full max-w-[220px] bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    {/* Step 2: Date */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">{t('date.titolo')}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('date.emissione_label')}</label>
                                <input
                                    type="date"
                                    value={form.data_emissione}
                                    onChange={e => setForm(p => ({ ...p, data_emissione: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                    {t('date.scadenza_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('destinatario.opzionale')}</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.data_scadenza}
                                    onChange={e => setForm(p => ({ ...p, data_scadenza: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Righe prestazioni */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="section-label !m-0">{t('prestazioni.titolo')}</p>
                            <button
                                onClick={aggiungiRiga}
                                className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                            >
                                <Plus size={12} /> {t('prestazioni.aggiungi_riga')}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {righe.map((r, i) => {
                                const q = parseFloat(r.quantita) || 0
                                const p = parseFloat(r.prezzo_unitario) || 0
                                const tot = q * p
                                return (
                                    <div key={i} className="bg-petrolio/40 border border-white/5 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('prestazioni.riga', { numero: i + 1 })}</span>
                                            {righe.length > 1 && (
                                                <button
                                                    onClick={() => rimuoviRiga(i)}
                                                    className="text-nebbia/30 hover:text-red-400 transition-colors p-1"
                                                    title={t('prestazioni.rimuovi_riga')}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            placeholder={t('prestazioni.descrizione_ph')}
                                            value={r.descrizione}
                                            onChange={e => aggiornaRiga(i, 'descrizione', e.target.value)}
                                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                        />

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">{t('prestazioni.quantita')}</label>
                                                <input
                                                    type="number" min="0.01" step="0.01"
                                                    value={r.quantita}
                                                    onChange={e => aggiornaRiga(i, 'quantita', e.target.value)}
                                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">{t('prestazioni.prezzo_unitario')}</label>
                                                <input
                                                    type="number" min="0" step="0.01" placeholder="0.00"
                                                    value={r.prezzo_unitario}
                                                    onChange={e => aggiornaRiga(i, 'prezzo_unitario', e.target.value)}
                                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">{t('prestazioni.totale_riga')}</label>
                                                <div className="bg-slate border border-white/5 px-3 py-2 font-body text-sm text-oro">
                                                    CHF {fmtCHF(tot)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Step 4: IVA (modello CH) */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">{t('iva.titolo')}</p>

                        {nonAssoggettato ? (
                            <div className="flex items-start gap-3 bg-petrolio/40 border border-white/5 p-3">
                                <Info size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                    {t('iva.non_assoggettato')}{' '}
                                    {emettoIo
                                        ? <Link to="/profilo" className="text-oro/80 hover:text-oro underline">{t('iva.cambia_profilo')}</Link>
                                        : t('iva.decide_titolare')}
                                </p>
                            </div>
                        ) : (<>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={form.esente_iva}
                                onChange={e => setForm(p => ({ ...p, esente_iva: e.target.checked }))}
                                className="w-4 h-4 accent-oro"
                            />
                            <div className="flex-1">
                                <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">{t('iva.esente_label')}</p>
                                <p className="font-body text-xs text-nebbia/40 mt-0.5">{t('iva.esente_desc')}</p>
                            </div>
                        </label>

                        {form.esente_iva ? (
                            <div className="pl-7">
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                    {t('iva.motivo_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('iva.motivo_hint')}</span>
                                </label>
                                <input
                                    placeholder={t('iva.motivo_ph')}
                                    value={form.esente_iva_motivo}
                                    onChange={e => setForm(p => ({ ...p, esente_iva_motivo: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                            </div>
                        ) : (
                            <div className="pl-7">
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('iva.aliquota_label')}</label>
                                <input
                                    type="number" min="0" max="100" step="0.1"
                                    value={form.aliquota_iva}
                                    onChange={e => setForm(p => ({ ...p, aliquota_iva: e.target.value }))}
                                    className="w-full max-w-[200px] bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                                <p className="font-body text-xs text-nebbia/40 mt-2">
                                    {t('iva.aliquota_hint')}
                                </p>
                            </div>
                        )}
                        </>)}
                    </div>

                    {/* Step 5: Pagamento */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">{t('pagamento.titolo')}</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('pagamento.metodo_label')}</label>
                            <select
                                value={form.metodo_pagamento}
                                onChange={e => setForm(p => ({ ...p, metodo_pagamento: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            >
                                <option value="bonifico">{t('pagamento.metodi.bonifico')}</option>
                                <option value="qr">{t('pagamento.metodi.qr')}</option>
                                <option value="contanti">{t('pagamento.metodi.contanti')}</option>
                                <option value="carta_twint">{t('pagamento.metodi.carta_twint')}</option>
                                <option value="">{t('pagamento.metodi.altro')}</option>
                            </select>
                        </div>

                        <InputField
                            label={t('pagamento.iban_label')}
                            placeholder="CH93 0076 2011 6238 5295 7"
                            value={form.iban}
                            onChange={e => setForm(p => ({ ...p, iban: e.target.value }))}
                        />
                        {emittente?.iban && ibanForm !== pulisciIban(emittente.iban) && (
                            <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, iban: formattaIban(emittente.iban) }))}
                                className="font-body text-xs text-oro/60 hover:text-oro"
                            >
                                {t('pagamento.usa_iban_profilo')}
                            </button>
                        )}
                        <p className="font-body text-xs text-nebbia/40">
                            {t('pagamento.iban_hint')}
                        </p>
                    </div>

                    {/* Step 6: Note */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">{t('note.titolo')}</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {t('note.pubbliche_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('note.pubbliche_hint')}</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder={t('note.pubbliche_ph')}
                                value={form.note_pubbliche}
                                onChange={e => setForm(p => ({ ...p, note_pubbliche: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {t('note.interne_label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('note.interne_hint')}</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder={t('note.interne_ph')}
                                value={form.note_interne}
                                onChange={e => setForm(p => ({ ...p, note_interne: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    </div>

                    {/* Errore */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    {/* Azioni */}
                    <div className="flex flex-wrap gap-3 sticky bottom-4 bg-petrolio/95 backdrop-blur-sm border border-white/10 p-4 shadow-2xl">
                        <button
                            onClick={() => navigate('/fatturazione')}
                            disabled={salvando !== null}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            {t('azioni.annulla')}
                        </button>

                        <div className="flex-1" />

                        <button
                            onClick={() => salva(false)}
                            disabled={salvando !== null}
                            className="flex items-center gap-2 px-4 py-2.5 border border-white/15 text-nebbia/80 hover:border-oro/30 hover:text-oro transition-colors font-body text-sm disabled:opacity-40"
                        >
                            {salvando === 'bozza'
                                ? <><Loader2 size={14} className="animate-spin" /> {t('azioni.salvando')}</>
                                : <><Save size={14} /> {t('azioni.salva_bozza')}</>
                            }
                        </button>

                        <button
                            onClick={() => salva(true)}
                            disabled={salvando !== null}
                            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                        >
                            {salvando === 'pdf'
                                ? <><Loader2 size={14} className="animate-spin" /> {t('azioni.generando_pdf')}</>
                                : <><FileSignature size={14} /> {t('azioni.salva_genera_pdf')}</>
                            }
                        </button>
                    </div>

                    {/* Info workflow */}
                    <div className="bg-petrolio/40 border border-white/5 p-4 flex items-start gap-3">
                        <Info size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-body text-xs text-nebbia/60">
                                <Trans i18nKey="workflow.bozza" t={t}><span className="font-medium text-nebbia/80">Salva bozza</span> — la fattura viene creata con un numero progressivo definitivo, ma il PDF non viene generato. Puoi modificarla in seguito.</Trans>
                            </p>
                            <p className="font-body text-xs text-nebbia/60">
                                <Trans i18nKey="workflow.pdf" t={t}><span className="font-medium text-nebbia/80">Salva e genera PDF</span> — la fattura viene archiviata nell'archivio dello studio e il PDF con QR-fattura è pronto per il cliente.</Trans>
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLONNA PREVIEW */}
                <div>
                    <PreviewFattura
                        form={form}
                        righe={righe}
                        totali={totali}
                        cliente={clienteSelezionato}
                        pratica={isAvvocato ? praticaSelezionata : null}
                        mandato={isFiduciario ? mandatoSelezionato : null}
                        nonAssoggettato={nonAssoggettato}
                    />
                </div>
            </div>
        </div>
    )
}