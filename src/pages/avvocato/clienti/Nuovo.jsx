// src/pages/avvocato/clienti/Nuovo.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, InputField, TextareaField } from '@/components/shared'
import { AlertCircle, CheckCircle, User, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG
// ─────────────────────────────────────────────────────────────
function SwitcherTipoSoggetto({ value, onChange, disabled = false }) {
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
                <User size={13} /> Persona fisica
            </button>
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_giuridica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Building2 size={13} /> Persona giuridica
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO CLIENTE
// ─────────────────────────────────────────────────────────────
export default function AvvocatoClientiNuovo() {
    const navigate = useNavigate()
    const [tipo, setTipo] = useState('persona_fisica')
    const [form, setForm] = useState({
        // PF
        nome: '', cognome: '', cf: '',
        // PG
        ragione_sociale: '', partita_iva: '', sede_legale: '',
        rappr_nome: '', rappr_cognome: '', rappr_cf: '', rappr_carica: '',
        // Comuni
        email: '', telefono: '', pec: '',
        indirizzo: '',
        note: '',
        avvocato_id: '',
    })
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [success, setSuccess] = useState(false)
    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    useEffect(() => {
        async function caricaContesto() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setForm(p => ({ ...p, avvocato_id: user.id }))
            const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
            if ((profilo?.posti_acquistati ?? 1) <= 1) return
            setIsStudio(true)
            const { data: collabs } = await supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
            setCollaboratori(collabs ?? [])
        }
        caricaContesto()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault(); setErrore('')

        if (tipo === 'persona_fisica') {
            if (!form.nome.trim()) return setErrore('Il nome e obbligatorio')
            if (!form.cognome.trim()) return setErrore('Il cognome e obbligatorio')
        } else {
            if (!form.ragione_sociale.trim()) return setErrore('La ragione sociale e obbligatoria')
        }
        if (!form.email.trim()) return setErrore("L'email e obbligatoria")
        if (!/\S+@\S+\.\S+/.test(form.email)) return setErrore('Email non valida')

        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const payload = {
                tipo_soggetto: tipo,
                email: form.email.trim().toLowerCase(),
                telefono: form.telefono.trim() || null,
                pec: form.pec.trim() || null,
                cf: form.cf.trim() || null,
                indirizzo: form.indirizzo.trim() || null,
                note: form.note.trim() || null,
                avvocato_id: form.avvocato_id || null,
            }

            if (tipo === 'persona_fisica') {
                payload.nome = form.nome.trim()
                payload.cognome = form.cognome.trim()
            } else {
                payload.ragione_sociale = form.ragione_sociale.trim()
                payload.partita_iva = form.partita_iva.trim() || null
                payload.sede_legale = form.sede_legale.trim() || null
                payload.rappr_nome = form.rappr_nome.trim() || null
                payload.rappr_cognome = form.rappr_cognome.trim() || null
                payload.rappr_cf = form.rappr_cf.trim() || null
                payload.rappr_carica = form.rappr_carica.trim() || null
            }

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cliente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setSuccess(true)
            setTimeout(() => navigate('/clienti'), 1500)
        } catch (err) { setErrore(err.message) } finally { setLoading(false) }
    }

    if (success) return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label="Tutti i clienti" />
            <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
                <CheckCircle size={40} className="text-salvia" />
                <h2 className="font-display text-2xl text-nebbia">Cliente creato</h2>
                <p className="font-body text-sm text-nebbia/50">Le credenziali saranno inviate via email al cliente.</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label="Tutti i clienti" />
            <PageHeader label="Clienti" title="Nuovo cliente" />
            <form onSubmit={handleSubmit}>
                <div className="bg-slate border border-white/5 p-6 space-y-5">
                    <div>
                        <p className="section-label mb-3">Tipo di soggetto</p>
                        <SwitcherTipoSoggetto value={tipo} onChange={setTipo} />
                    </div>

                    {tipo === 'persona_fisica' ? (
                        <>
                            <p className="section-label">Dati anagrafici</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Nome *" placeholder="Anna" {...f('nome')} />
                                <InputField label="Cognome *" placeholder="Rossi" {...f('cognome')} />
                            </div>
                            <InputField label="Codice fiscale" placeholder="RSSMRA80A01H501Z" {...f('cf')} />
                        </>
                    ) : (
                        <>
                            <p className="section-label">Dati societa</p>
                            <InputField label="Ragione sociale *" placeholder="Alfa Srl" {...f('ragione_sociale')} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Partita IVA" placeholder="12345678901" {...f('partita_iva')} />
                                <InputField label="Codice fiscale" placeholder="se diverso da P.IVA" {...f('cf')} />
                            </div>
                            <InputField label="Sede legale" placeholder="Via Roma 1, Milano" {...f('sede_legale')} />

                            <div className="border-t border-white/8 pt-5 space-y-4">
                                <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Rappresentante legale <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span></p>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Nome" placeholder="Mario" {...f('rappr_nome')} />
                                    <InputField label="Cognome" placeholder="Bianchi" {...f('rappr_cognome')} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Codice fiscale" placeholder="CF rappresentante" {...f('rappr_cf')} />
                                    <InputField label="Carica" placeholder="Es. Amministratore Unico" {...f('rappr_carica')} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <p className="section-label">Contatti</p>
                        <InputField label="Email *" type="email" placeholder="email@esempio.it" {...f('email')} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Telefono" placeholder="+39 333 000 1111" {...f('telefono')} />
                            <InputField label="PEC" placeholder="cliente@pec.it" {...f('pec')} />
                        </div>
                        <InputField label="Indirizzo" placeholder={tipo === 'persona_fisica' ? 'Residenza' : 'Sede operativa (se diversa dalla sede legale)'} {...f('indirizzo')} />
                    </div>

                    {isStudio && collaboratori.length > 0 && (
                        <div className="border-t border-white/8 pt-5">
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Avvocato assegnato *</label>
                            <select value={form.avvocato_id} onChange={e => setForm(p => ({ ...p, avvocato_id: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                                <option value="">Tu</option>
                                {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="border-t border-white/8 pt-5">
                        <TextareaField label="Note iniziali" placeholder="Primo contatto, situazione generale..." rows={3} {...f('note')} />
                    </div>

                    {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => navigate('/clienti')} className="btn-secondary text-sm flex-1">Annulla</button>
                        <button type="submit" disabled={loading} className="btn-primary text-sm flex-1 justify-center">
                            {loading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Crea cliente'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}