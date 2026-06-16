// src/components/ContropartiBox.jsx
// Componente CRUD per gestire le controparti di una pratica.
// Va inserito dentro PraticaDettaglio.jsx nella colonna sinistra.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import {
    Plus, X, Edit2, Trash2, Check, AlertCircle,
    User, Building2, ChevronDown, ChevronRight,
    Scale
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
// I value (v) sono enum salvati su DB: NON tradurre. La label si traduce via t().
const RUOLI = [
    { v: '', k: 'ruoli.placeholder' },
    { v: 'convenuto', k: 'ruoli.convenuto' },
    { v: 'co_convenuto', k: 'ruoli.co_convenuto' },
    { v: 'attore', k: 'ruoli.attore' },
    { v: 'co_attore', k: 'ruoli.co_attore' },
    { v: 'imputato', k: 'ruoli.imputato' },
    { v: 'co_imputato', k: 'ruoli.co_imputato' },
    { v: 'parte_civile', k: 'ruoli.parte_civile' },
    { v: 'persona_offesa', k: 'ruoli.persona_offesa' },
    { v: 'ricorrente', k: 'ruoli.ricorrente' },
    { v: 'resistente', k: 'ruoli.resistente' },
    { v: 'opponente', k: 'ruoli.opponente' },
    { v: 'opposto', k: 'ruoli.opposto' },
    { v: 'terzo_chiamato', k: 'ruoli.terzo_chiamato' },
    { v: 'litisconsorte', k: 'ruoli.litisconsorte' },
    { v: 'altro', k: 'ruoli.altro' },
]

function labelRuolo(t, v) {
    const r = RUOLI.find(r => r.v === v)
    return r ? t(r.k) : v
}

// ─────────────────────────────────────────────────────────────
// FIELD (a livello di modulo: non si rimonta a ogni render del parent)
// ─────────────────────────────────────────────────────────────
function Field({
    label,
    type = 'text',
    placeholder = '',
    value,
    onChange,
    colSpan = 1,
    maxLength,
    className = '',
    uppercase = false,
}) {
    return (
        <div style={{ gridColumn: `span ${colSpan}` }}>
            <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={onChange}
                maxLength={maxLength}
                className={`w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25 ${uppercase ? 'uppercase' : ''} ${className}`}
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG (riusabile, simile a Clienti.jsx)
// ─────────────────────────────────────────────────────────────
function SwitcherTipo({ value, onChange }) {
    const { t } = useTranslation('comp_controparti')
    return (
        <div className="flex gap-1 bg-petrolio border border-white/10 p-1 w-fit">
            <button type="button"
                onClick={() => onChange('persona_fisica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs transition-colors ${value === 'persona_fisica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'}`}>
                <User size={11} /> {t('switcher.persona_fisica')}
            </button>
            <button type="button"
                onClick={() => onChange('persona_giuridica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'}`}>
                <Building2 size={11} /> {t('switcher.persona_giuridica')}
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// FORM (usato sia per nuovo che per modifica)
// ─────────────────────────────────────────────────────────────
function FormControparte({ controparte, praticaId, onSalvato, onAnnulla }) {
    const { t } = useTranslation('comp_controparti')
    const isEdit = !!controparte?.id

    const [tipo, setTipo] = useState(controparte?.tipo_soggetto ?? 'persona_fisica')
    const [form, setForm] = useState({
        ruolo: controparte?.ruolo ?? '',
        // PF
        nome: controparte?.nome ?? '',
        cognome: controparte?.cognome ?? '',
        numero_avs: controparte?.numero_avs ?? '',
        data_nascita: controparte?.data_nascita ?? '',
        luogo_nascita: controparte?.luogo_nascita ?? '',
        // PG
        ragione_sociale: controparte?.ragione_sociale ?? '',
        uid: controparte?.uid ?? '',
        sede_legale: controparte?.sede_legale ?? '',
        rappr_nome: controparte?.rappr_nome ?? '',
        rappr_cognome: controparte?.rappr_cognome ?? '',
        rappr_avs: controparte?.rappr_avs ?? '',
        rappr_carica: controparte?.rappr_carica ?? '',
        // Contatti
        email: controparte?.email ?? '',
        telefono: controparte?.telefono ?? '',
        // Indirizzo
        indirizzo: controparte?.indirizzo ?? '',
        citta: controparte?.citta ?? '',
        cantone: controparte?.cantone ?? '',
        cap: controparte?.cap ?? '',
        // Legale avversario
        legale_nome: controparte?.legale_nome ?? '',
        legale_cognome: controparte?.legale_cognome ?? '',
        legale_cantone_albo: controparte?.legale_cantone_albo ?? '',
        legale_albo: controparte?.legale_albo ?? '',
        // Note
        note: controparte?.note ?? '',
    })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [mostraLegale, setMostraLegale] = useState(
        !!(controparte?.legale_nome || controparte?.legale_cognome || controparte?.legale_cantone_albo)
    )

    const f = k => ({
        value: form[k],
        onChange: e => setForm(p => ({ ...p, [k]: e.target.value })),
    })

    async function handleSalva() {
        setErrore('')
        if (tipo === 'persona_fisica') {
            if (!form.nome.trim()) return setErrore(t('errori.nome_obbligatorio'))
            if (!form.cognome.trim()) return setErrore(t('errori.cognome_obbligatorio'))
        } else {
            if (!form.ragione_sociale.trim()) return setErrore(t('errori.ragione_sociale_obbligatoria'))
        }

        setSalvando(true)
        try {
            const payload = {
                pratica_id: praticaId,
                tipo_soggetto: tipo,
                ruolo: form.ruolo || null,
                numero_avs: form.numero_avs?.trim() || null,
                indirizzo: form.indirizzo?.trim() || null,
                citta: form.citta?.trim() || null,
                cantone: form.cantone?.trim().toUpperCase() || null,
                cap: form.cap?.trim() || null,
                email: form.email?.trim() || null,
                telefono: form.telefono?.trim() || null,
                legale_nome: form.legale_nome?.trim() || null,
                legale_cognome: form.legale_cognome?.trim() || null,
                legale_cantone_albo: form.legale_cantone_albo?.trim().toUpperCase() || null,
                legale_albo: form.legale_albo?.trim() || null,
                note: form.note?.trim() || null,
            }

            if (tipo === 'persona_fisica') {
                payload.nome = form.nome.trim()
                payload.cognome = form.cognome.trim()
                payload.data_nascita = form.data_nascita || null
                payload.luogo_nascita = form.luogo_nascita?.trim() || null
                // Pulisci campi PG
                payload.ragione_sociale = null
                payload.uid = null
                payload.sede_legale = null
                payload.rappr_nome = null
                payload.rappr_cognome = null
                payload.rappr_avs = null
                payload.rappr_carica = null
            } else {
                payload.ragione_sociale = form.ragione_sociale.trim()
                payload.uid = form.uid?.trim() || null
                payload.sede_legale = form.sede_legale?.trim() || null
                payload.rappr_nome = form.rappr_nome?.trim() || null
                payload.rappr_cognome = form.rappr_cognome?.trim() || null
                payload.rappr_avs = form.rappr_avs?.trim() || null
                payload.rappr_carica = form.rappr_carica?.trim() || null
                // Pulisci campi PF
                payload.nome = null
                payload.cognome = null
                payload.data_nascita = null
                payload.luogo_nascita = null
            }

            if (isEdit) {
                const { error } = await supabase.from('controparti').update(payload).eq('id', controparte.id)
                if (error) throw new Error(error.message)
            } else {
                const { error } = await supabase.from('controparti').insert(payload)
                if (error) throw new Error(error.message)
            }

            onSalvato()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="bg-petrolio/40 border border-oro/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <p className="font-body text-sm font-medium text-oro">
                    {isEdit ? t('form.titolo_modifica') : t('form.titolo_nuova')}
                </p>
                <button onClick={onAnnulla} className="text-nebbia/30 hover:text-nebbia transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Tipo soggetto */}
            <SwitcherTipo value={tipo} onChange={setTipo} />

            {/* Ruolo processuale */}
            <div>
                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">{t('form.ruolo_processuale')}</label>
                <select value={form.ruolo} onChange={e => setForm(p => ({ ...p, ruolo: e.target.value }))}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                    {RUOLI.map(r => <option key={r.v} value={r.v}>{t(r.k)}</option>)}
                </select>
            </div>

            {/* Anagrafici condizionali */}
            {tipo === 'persona_fisica' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('campi.nome_obbl')} placeholder="Tizio" {...f('nome')} />
                        <Field label={t('campi.cognome_obbl')} placeholder="Caio" {...f('cognome')} />
                    </div>
                    <Field label={t('campi.numero_avs')} placeholder="756.1234.5678.97" {...f('numero_avs')} />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('campi.data_nascita')} type="date" {...f('data_nascita')} />
                        <Field label={t('campi.luogo_nascita')} placeholder="Roma" {...f('luogo_nascita')} />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Field label={t('campi.ragione_sociale_obbl')} placeholder="Alfa SA" {...f('ragione_sociale')} />
                    <Field label={t('campi.uid')} placeholder="CHE-123.456.789" {...f('uid')} />
                    <Field label={t('campi.sede_legale')} placeholder="Via Nassa 5, Lugano" {...f('sede_legale')} />
                    <div className="border-t border-white/8 pt-3 space-y-3">
                        <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">{t('sezioni.rappresentante_legale')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t('campi.nome')} {...f('rappr_nome')} />
                            <Field label={t('campi.cognome')} {...f('rappr_cognome')} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t('campi.numero_avs_rappresentante')} {...f('rappr_avs')} />
                            <Field label={t('campi.carica')} placeholder={t('campi.carica_placeholder')} {...f('rappr_carica')} />
                        </div>
                    </div>
                </div>
            )}

            {/* Indirizzo */}
            <div className="border-t border-white/8 pt-3 space-y-3">
                <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">{t('sezioni.indirizzo')}</p>
                <Field label={t('campi.indirizzo')} placeholder="Via Garibaldi 5" {...f('indirizzo')} />
                <div className="grid grid-cols-3 gap-3">
                    <Field label={t('campi.citta')} placeholder="Lugano" colSpan={2} {...f('citta')} />
                    <Field label={t('campi.cantone')} placeholder="TI" maxLength={2} uppercase {...f('cantone')} />
                </div>
                <Field label={t('campi.cap')} placeholder="20100" {...f('cap')} />
            </div>

            {/* Contatti */}
            <div className="border-t border-white/8 pt-3 space-y-3">
                <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">{t('sezioni.contatti')}</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label={t('campi.email')} type="email" {...f('email')} />
                    <Field label={t('campi.telefono')} {...f('telefono')} />
                </div>
            </div>

            {/* Legale avversario (collassabile) */}
            <div className="border-t border-white/8 pt-3">
                <button type="button" onClick={() => setMostraLegale(v => !v)}
                    className="flex items-center gap-2 font-body text-xs text-nebbia/50 hover:text-oro transition-colors w-full">
                    {mostraLegale ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Scale size={11} />
                    <span className="tracking-widest uppercase">{t('sezioni.legale_avversario')}</span>
                    <span className="text-nebbia/30 normal-case tracking-normal">{t('sezioni.legale_avversario_hint')}</span>
                </button>
                {mostraLegale && (
                    <div className="space-y-3 mt-3 pl-2">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t('campi.nome')} {...f('legale_nome')} />
                            <Field label={t('campi.cognome')} {...f('legale_cognome')} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t('campi.cantone_albo')} placeholder="TI" maxLength={2} uppercase {...f('legale_cantone_albo')} />
                            <Field label={t('campi.numero_albo')} {...f('legale_albo')} />
                        </div>
                    </div>
                )}
            </div>

            {/* Note */}
            <div className="border-t border-white/8 pt-3">
                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">{t('campi.note')}</label>
                <textarea rows={2} {...f('note')}
                    placeholder={t('campi.note_placeholder')}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={13} /> {errore}
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={handleSalva} disabled={salvando}
                    className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                    {salvando
                        ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Check size={13} /> {isEdit ? t('azioni.salva_modifiche') : t('azioni.aggiungi')}</>
                    }
                </button>
                <button onClick={onAnnulla} className="px-4 py-2 border border-white/10 text-nebbia/40 font-body text-sm hover:text-nebbia transition-colors">
                    {t('azioni.annulla')}
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// CARD CONTROPARTE (vista compatta)
// ─────────────────────────────────────────────────────────────
function CardControparte({ c, onModifica, onElimina }) {
    const { t } = useTranslation('comp_controparti')
    const isPF = c.tipo_soggetto === 'persona_fisica'
    const nomeMostrato = isPF
        ? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
        : (c.ragione_sociale ?? '—')

    const indirizzoMostrato = [
        c.indirizzo,
        [c.cap, c.citta].filter(Boolean).join(' '),
        c.cantone ? `(${c.cantone})` : null
    ].filter(Boolean).join(', ')

    return (
        <div className="bg-petrolio/40 border border-white/8 p-3 group hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isPF
                            ? <User size={11} className="text-nebbia/40 shrink-0" />
                            : <Building2 size={11} className="text-nebbia/40 shrink-0" />
                        }
                        <p className="font-body text-sm font-medium text-nebbia">{nomeMostrato}</p>
                        {c.ruolo && (
                            <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                {labelRuolo(t, c.ruolo)}
                            </span>
                        )}
                    </div>

                    {(c.numero_avs || c.uid) && (
                        <p className="font-mono text-[11px] text-nebbia/40 mt-1">
                            {c.uid && <>UID {c.uid}</>}
                            {c.uid && c.numero_avs && ' · '}
                            {c.numero_avs && <>AVS {c.numero_avs}</>}
                        </p>
                    )}

                    {indirizzoMostrato && (
                        <p className="font-body text-xs text-nebbia/45 mt-1">{indirizzoMostrato}</p>
                    )}

                    {!isPF && (c.rappr_nome || c.rappr_cognome) && (
                        <p className="font-body text-xs text-nebbia/40 mt-1.5">
                            <span className="text-nebbia/30">{t('card.rappresentante')}</span>{' '}
                            {`${c.rappr_nome ?? ''} ${c.rappr_cognome ?? ''}`.trim()}
                            {c.rappr_carica && <span className="text-nebbia/30"> ({c.rappr_carica})</span>}
                        </p>
                    )}

                    {(c.legale_nome || c.legale_cognome) && (
                        <p className="font-body text-xs text-nebbia/40 mt-1.5 flex items-center gap-1">
                            <Scale size={9} className="text-nebbia/30" />
                            {t('card.avvocato_prefisso')} {`${c.legale_nome ?? ''} ${c.legale_cognome ?? ''}`.trim()}
                            {c.legale_cantone_albo && <span className="text-nebbia/30"> · {c.legale_cantone_albo}</span>}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => onModifica(c)} title={t('azioni.modifica')}
                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-oro hover:bg-oro/10 transition-colors">
                        <Edit2 size={11} />
                    </button>
                    <button onClick={() => onElimina(c)} title={t('azioni.elimina')}
                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ContropartiBox({ praticaId }) {
    const { t } = useTranslation('comp_controparti')
    const [controparti, setControparti] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraForm, setMostraForm] = useState(false)
    const [inModifica, setInModifica] = useState(null)

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('controparti')
            .select('*')
            .eq('pratica_id', praticaId)
            .order('ordine', { ascending: true })
            .order('created_at', { ascending: true })
        setControparti(data ?? [])
        setLoading(false)
    }

    useEffect(() => { carica() }, [praticaId])
    // Chiudi modal con ESC
    useEffect(() => {
        if (!mostraForm) return
        const onKey = e => { if (e.key === 'Escape') annulla() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [mostraForm])

    async function elimina(c) {
        const nome = c.tipo_soggetto === 'persona_fisica'
            ? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
            : (c.ragione_sociale ?? '')
        if (!confirm(t('conferme.elimina', { nome }))) return
        await supabase.from('controparti').delete().eq('id', c.id)
        setControparti(prev => prev.filter(x => x.id !== c.id))
    }

    function apriNuovo() {
        setInModifica(null)
        setMostraForm(true)
    }

    function apriModifica(c) {
        setInModifica(c)
        setMostraForm(true)
    }

    async function onSalvato() {
        setMostraForm(false)
        setInModifica(null)
        await carica()
    }

    function annulla() {
        setMostraForm(false)
        setInModifica(null)
    }

    return (
        <div className="bg-slate border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="section-label flex items-center gap-2">
                    <Scale size={12} className="text-oro/60" />
                    {t('header.titolo', { n: controparti.length })}
                </p>
                {!mostraForm && (
                    <button onClick={apriNuovo}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors">
                        <Plus size={11} /> {t('azioni.aggiungi')}
                    </button>
                )}
            </div>

            {/* Form (nuovo o modifica) — in modal popup */}
            {mostraForm && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto"
                    onClick={annulla}
                >
                    <div
                        className="w-full max-w-2xl my-8"
                        onClick={e => e.stopPropagation()}
                    >
                        <FormControparte
                            controparte={inModifica}
                            praticaId={praticaId}
                            onSalvato={onSalvato}
                            onAnnulla={annulla}
                        />
                    </div>
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-6">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : controparti.length === 0 && !mostraForm ? (
                <div className="border border-dashed border-white/10 p-6 text-center">
                    <Scale size={20} className="text-nebbia/15 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/30">{t('vuoto.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/20 mt-1">
                        {t('vuoto.sottotitolo')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {controparti.map(c => (
                        <CardControparte
                            key={c.id}
                            c={c}
                            onModifica={apriModifica}
                            onElimina={elimina}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}