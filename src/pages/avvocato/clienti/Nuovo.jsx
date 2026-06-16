// src/pages/avvocato/clienti/Nuovo.jsx — Lexum CH
//
// Anagrafica svizzera completa:
//   PF: cf→numero_avs, comune→citta, provincia→cantone (campo libero), no pec
//   PG: partita_iva→uid, rappr_cf→rappr_avs, + forma_giuridica + iva_attiva
// Payload verso edge create-cliente usa i nomi campo CH (l'edge va allineata dopo).
// "note" → note_iniziali (campo reale su profiles CH).

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader, BackButton, InputField, TextareaField } from '@/components/shared'
import { AlertCircle, CheckCircle, User, Building2, Eye, EyeOff, Lock, Users, ShoppingBag } from 'lucide-react'
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG
// ─────────────────────────────────────────────────────────────
function SwitcherTipoSoggetto({ value, onChange, disabled = false }) {
    const { t } = useTranslation('avv_clienti_nuovo')
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
// BANNER CONTATORE CLIENTI
// Soglie: < 70% nessun banner · 70-89% ambra · 90-99% rosso chiaro · 100% rosso bloccante
// ─────────────────────────────────────────────────────────────
function BannerContatoreClienti({ clienti, limiteRaggiunto }) {
    const { t } = useTranslation('avv_clienti_nuovo')
    // Se il piano non ha limite definito (es. avvocato senza piano valido o piano legacy), niente banner
    if (clienti.limite_totale <= 0 && !limiteRaggiunto) return null

    const pct = clienti.limite_totale > 0 ? clienti.conteggio / clienti.limite_totale : 1
    const slotRimanenti = Math.max(0, clienti.limite_totale - clienti.conteggio)

    // Se limite raggiunto via race-condition (errore 403), il backend ha confermato che siamo al 100%
    const bloccante = limiteRaggiunto || pct >= 1
    const critico = !bloccante && pct >= 0.9
    const soft = !bloccante && !critico && pct >= 0.7

    if (!bloccante && !critico && !soft) return null

    // ── BLOCCANTE (100%) ──
    if (bloccante) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-red-400">
                            {t('banner.bloccante_titolo', { conteggio: clienti.conteggio, totale: clienti.limite_totale })}
                        </p>
                        <p className="font-body text-xs text-red-400/70 mt-1 leading-relaxed">
                            {t('banner.bloccante_testo')}
                        </p>
                    </div>
                </div>
                <Link
                    to="/studio?tab=acquista"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/30 transition-colors"
                >
                    <ShoppingBag size={13} /> {t('banner.bloccante_cta')}
                </Link>
            </div>
        )
    }

    // ── CRITICO (90-99%) ──
    if (critico) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 p-4 flex items-start gap-3">
                <Users size={16} className="text-red-400/80 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-red-400/90">
                        {t('banner.critico_titolo', { count: slotRimanenti })}
                    </p>
                    <p className="font-body text-xs text-red-400/60 mt-1 leading-relaxed">
                        {t('banner.critico_testo', { conteggio: clienti.conteggio, totale: clienti.limite_totale })}{' '}
                        <Link to="/studio?tab=acquista" className="underline hover:text-red-400">
                            {t('banner.critico_link')}
                        </Link>
                    </p>
                </div>
            </div>
        )
    }

    // ── SOFT (70-89%) ──
    return (
        <div className="bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3">
            <Users size={16} className="text-amber-400/80 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-amber-400/90">
                    {t('banner.soft_titolo', { count: slotRimanenti })}
                </p>
                <p className="font-body text-xs text-amber-400/60 mt-1 leading-relaxed">
                    {t('banner.soft_testo', { conteggio: clienti.conteggio, totale: clienti.limite_totale })}{' '}
                    <Link to="/studio?tab=acquista" className="underline hover:text-amber-400">
                        {t('banner.soft_link')}
                    </Link>
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO CLIENTE
// ─────────────────────────────────────────────────────────────
export default function AvvocatoClientiNuovo() {
    const { t } = useTranslation('avv_clienti_nuovo')
    const navigate = useNavigate()
    const [tipo, setTipo] = useState('persona_fisica')
    const [form, setForm] = useState({
        // PF
        nome: '', cognome: '', numero_avs: '',
        data_nascita: '', luogo_nascita: '',
        // PG
        ragione_sociale: '', uid: '', forma_giuridica: '', iva_attiva: false, sede_legale: '',
        rappr_nome: '', rappr_cognome: '', rappr_avs: '', rappr_carica: '',
        // Comuni
        email: '', telefono: '',
        indirizzo: '', citta: '', cantone: '', cap: '',
        note: '',
        avvocato_id: '',
        // Portale
        attiva_portale: false,
        password_iniziale: '',
    })
    const [mostraPassword, setMostraPassword] = useState(false)
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [success, setSuccess] = useState(false)
    const [clienti, setClienti] = useState({ conteggio: 0, limite_piano: 0, limite_extra: 0, limite_totale: 0 })
    const [limiteRaggiunto, setLimiteRaggiunto] = useState(false)

    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    useEffect(() => {
        async function caricaContesto() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setForm(p => ({ ...p, avvocato_id: user.id }))
            const { data: profilo } = await supabase
                .from('profiles')
                .select('posti_acquistati, titolare_id')
                .eq('id', user.id).single()

            // Carica conteggio clienti (per banner soft/bloccante)
            const proprietarioId = profilo?.titolare_id ?? user.id
            const { data: contData } = await supabase
                .rpc('conteggio_clienti_studio', { p_proprietario_id: proprietarioId })
            const contRow = Array.isArray(contData) ? contData[0] : contData
            if (contRow) {
                setClienti({
                    conteggio: contRow.conteggio ?? 0,
                    limite_piano: contRow.limite_piano ?? 0,
                    limite_extra: contRow.limite_extra ?? 0,
                    limite_totale: contRow.limite_totale ?? 0,
                })
            }

            if ((profilo?.posti_acquistati ?? 1) <= 1) return
            setIsStudio(true)
            const { data: collabs } = await supabase
                .from('profiles')
                .select('id, nome, cognome')
                .eq('titolare_id', user.id)
            setCollaboratori(collabs ?? [])
        }
        caricaContesto()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault(); setErrore('')

        if (tipo === 'persona_fisica') {
            if (!form.nome.trim()) return setErrore(t('errori.nome_obbligatorio'))
            if (!form.cognome.trim()) return setErrore(t('errori.cognome_obbligatorio'))
        } else {
            if (!form.ragione_sociale.trim()) return setErrore(t('errori.ragione_sociale_obbligatoria'))
        }
        if (!form.email.trim()) return setErrore(t('errori.email_obbligatoria'))
        if (!/\S+@\S+\.\S+/.test(form.email)) return setErrore(t('errori.email_non_valida'))

        if (form.attiva_portale) {
            if (!form.password_iniziale) return setErrore(t('errori.password_obbligatoria'))
            if (form.password_iniziale.length < 8) return setErrore(t('errori.password_corta'))
        }

        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            const payload = {
                tipo_soggetto: tipo,
                email: form.email,
                telefono: form.telefono,
                indirizzo: form.indirizzo,
                citta: form.citta,
                cantone: form.cantone,
                cap: form.cap,
                note: form.note,
                avvocato_id: form.avvocato_id || null,
                attiva_portale: form.attiva_portale,
                password_iniziale: form.attiva_portale ? form.password_iniziale : undefined,
            }

            if (tipo === 'persona_fisica') {
                payload.nome = form.nome
                payload.cognome = form.cognome
                payload.numero_avs = form.numero_avs
                payload.data_nascita = form.data_nascita || null
                payload.luogo_nascita = form.luogo_nascita
            } else {
                payload.ragione_sociale = form.ragione_sociale
                payload.uid = form.uid
                payload.forma_giuridica = form.forma_giuridica
                payload.iva_attiva = form.iva_attiva
                payload.sede_legale = form.sede_legale
                payload.rappr_nome = form.rappr_nome
                payload.rappr_cognome = form.rappr_cognome
                payload.rappr_avs = form.rappr_avs
                payload.rappr_carica = form.rappr_carica
            }

            const res = await fetch(
                `${supabaseUrl}/functions/v1/create-cliente`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(payload),
                }
            )
            const json = await res.json()

            if (!json.ok) {
                // Race condition: tra apertura form e submit qualcuno ha sforato il limite
                if (json.code === 'LIMITE_CLIENTI_RAGGIUNTO') {
                    if (json.meta) {
                        setClienti({
                            conteggio: json.meta.conteggio ?? 0,
                            limite_piano: json.meta.limite_piano ?? 0,
                            limite_extra: json.meta.limite_extra ?? 0,
                            limite_totale: json.meta.limite_totale ?? 0,
                        })
                    }
                    setLimiteRaggiunto(true)
                    setErrore('')  // niente errore inline: il banner sopra è già esplicito
                    return
                }
                throw new Error(json.error)
            }

            setSuccess(true)
            setTimeout(() => navigate('/clienti'), 1500)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label={t('back')} />
            <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
                <CheckCircle size={40} className="text-salvia" />
                <h2 className="font-display text-2xl text-nebbia">{t('successo.titolo')}</h2>
                {form.attiva_portale ? (
                    <p className="font-body text-sm text-nebbia/50">
                        {t('successo.portale_attivo')}
                    </p>
                ) : (
                    <p className="font-body text-sm text-nebbia/50">
                        {t('successo.portale_disattivo')}
                    </p>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label={t('back')} />
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {/* ── Banner contatore clienti (soft / critico / bloccante) ── */}
            <BannerContatoreClienti clienti={clienti} limiteRaggiunto={limiteRaggiunto} />

            <form onSubmit={handleSubmit}>
                <div className="bg-slate border border-white/5 p-6 space-y-5">

                    {/* Tipo soggetto */}
                    <div>
                        <p className="section-label mb-3">{t('sezioni.tipo_soggetto')}</p>
                        <SwitcherTipoSoggetto value={tipo} onChange={setTipo} />
                    </div>

                    {/* Dati anagrafici */}
                    {tipo === 'persona_fisica' ? (
                        <>
                            <p className="section-label">{t('sezioni.dati_anagrafici')}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label={t('pf.nome')} placeholder={t('pf.nome_ph')} {...f('nome')} />
                                <InputField label={t('pf.cognome')} placeholder={t('pf.cognome_ph')} {...f('cognome')} />
                            </div>
                            <InputField label={t('pf.numero_avs')} placeholder="756.1234.5678.97" {...f('numero_avs')} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label={t('pf.data_nascita')} type="date" {...f('data_nascita')} />
                                <InputField label={t('pf.luogo_nascita')} placeholder={t('pf.luogo_nascita_ph')} {...f('luogo_nascita')} />
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="section-label">{t('sezioni.dati_societa')}</p>
                            <InputField label={t('pg.ragione_sociale')} placeholder={t('pg.ragione_sociale_ph')} {...f('ragione_sociale')} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label={t('pg.uid')} placeholder="CHE-123.456.789" {...f('uid')} />
                                <InputField label={t('pg.forma_giuridica')} placeholder={t('pg.forma_giuridica_ph')} {...f('forma_giuridica')} />
                            </div>
                            <InputField label={t('pg.sede_legale')} placeholder={t('pg.sede_legale_ph')} {...f('sede_legale')} />

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.iva_attiva}
                                    onChange={e => setForm(p => ({ ...p, iva_attiva: e.target.checked }))}
                                    className="w-4 h-4 accent-oro shrink-0"
                                />
                                <span className="font-body text-sm text-nebbia/85 group-hover:text-nebbia transition-colors">
                                    {t('pg.iva_attiva')}
                                </span>
                            </label>

                            <div className="border-t border-white/8 pt-5 space-y-4">
                                <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">
                                    {t('pg.rappresentante')}{' '}
                                    <span className="text-nebbia/25 normal-case tracking-normal">{t('pg.rappresentante_opzionale')}</span>
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label={t('pg.rappr_nome')} placeholder={t('pg.rappr_nome_ph')} {...f('rappr_nome')} />
                                    <InputField label={t('pg.rappr_cognome')} placeholder={t('pg.rappr_cognome_ph')} {...f('rappr_cognome')} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label={t('pg.rappr_avs')} placeholder={t('pg.rappr_avs_ph')} {...f('rappr_avs')} />
                                    <InputField label={t('pg.rappr_carica')} placeholder={t('pg.rappr_carica_ph')} {...f('rappr_carica')} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Contatti */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <p className="section-label">{t('sezioni.contatti')}</p>
                        <InputField label={t('contatti.email')} type="email" placeholder="email@esempio.ch" {...f('email')} />
                        <InputField label={t('contatti.telefono')} placeholder="+41 79 123 45 67" {...f('telefono')} />
                    </div>

                    {/* Indirizzo */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <p className="section-label">{t('sezioni.indirizzo')}</p>
                        <InputField
                            label={tipo === 'persona_fisica' ? t('indirizzo.domicilio') : t('indirizzo.sede_operativa')}
                            placeholder={t('indirizzo.via_ph')}
                            {...f('indirizzo')}
                        />
                        <div className="grid grid-cols-3 gap-4">
                            <InputField label={t('indirizzo.localita')} placeholder={t('indirizzo.localita_ph')} {...f('citta')} />
                            <InputField label={t('indirizzo.cantone')} placeholder="TI" {...f('cantone')} />
                            <InputField label={t('indirizzo.npa')} placeholder="6900" {...f('cap')} />
                        </div>
                    </div>

                    {/* Avvocato assegnato */}
                    {isStudio && collaboratori.length > 0 && (
                        <div className="border-t border-white/8 pt-5">
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {t('avvocato.assegnato')}
                            </label>
                            <select
                                value={form.avvocato_id}
                                onChange={e => setForm(p => ({ ...p, avvocato_id: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50"
                            >
                                <option value="">{t('avvocato.tu')}</option>
                                {collaboratori.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Note */}
                    <div className="border-t border-white/8 pt-5">
                        <TextareaField
                            label={t('note.label')}
                            placeholder={t('note.placeholder')}
                            rows={3}
                            {...f('note')}
                        />
                    </div>

                    {/* Accesso portale */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={form.attiva_portale}
                                onChange={e => setForm(p => ({ ...p, attiva_portale: e.target.checked }))}
                                className="mt-1 w-4 h-4 accent-oro shrink-0"
                            />
                            <div className="flex-1">
                                <p className="font-body text-sm text-nebbia/85 group-hover:text-nebbia transition-colors">
                                    {t('portale.attiva')}
                                </p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mt-0.5">
                                    {t('portale.descrizione')}
                                </p>
                            </div>
                        </label>

                        {form.attiva_portale && (
                            <div className="pl-7 space-y-3">
                                <label className="block">
                                    <span className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                        {t('portale.password_label')}
                                    </span>
                                    <div className="relative">
                                        <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                                        <input
                                            type={mostraPassword ? 'text' : 'password'}
                                            value={form.password_iniziale}
                                            onChange={e => setForm(p => ({ ...p, password_iniziale: e.target.value }))}
                                            placeholder={t('portale.password_ph')}
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
                                </label>
                                <div className="flex items-start gap-2 px-3 py-2 bg-oro/5 border border-oro/15">
                                    <AlertCircle size={11} className="text-oro/70 mt-0.5 shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-relaxed">
                                        {t('portale.password_nota')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Errore + bottoni */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/clienti')}
                            className="btn-secondary text-sm flex-1"
                        >
                            {t('azioni.annulla')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || limiteRaggiunto}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            title={limiteRaggiunto ? t('azioni.limite_tooltip') : undefined}
                        >
                            {loading
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : limiteRaggiunto ? t('azioni.limite_raggiunto') : t('azioni.crea')
                            }
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}