import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { messaggioPassword, messaggioErroreAuthPassword, suggerimentoPassword, messaggioErroreServer } from '@/lib/password'
import { PageHeader, InputField, Badge } from '@/components/shared'
import { Check, CheckCircle, AlertCircle, Scale, Clock, Loader2 } from 'lucide-react'
import SelectLingua from '@/components/SelectLingua'

// Paesi dell'indirizzo di fatturazione: la Svizzera e i vicini (nomi nella lingua del sito).
const PAESI = ['CH', 'LI', 'IT', 'DE', 'FR', 'AT']
function nomePaese(codice, lingua) {
    try { return new Intl.DisplayNames([lingua || 'it'], { type: 'region' }).of(codice) } catch { return codice }
}

export default function UserProfilo() {
    const { t, i18n } = useTranslation('user_profilo')
    const { profile, reloadProfile } = useAuth()

    // ── Dati personali ──
    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
        lingua: profile?.lingua ?? 'it',
        // indirizzo di fatturazione: serve per pagare (src/lib/datiFatturazione.jsx)
        indirizzo: profile?.indirizzo ?? '',
        cap: profile?.cap ?? '',
        citta: profile?.citta ?? '',
        paese: profile?.paese ?? 'CH',
    })
    const [datiOriginali, setDatiOriginali] = useState({ ...form })

    // Sincronizza form quando profile arriva (caso async)
    useEffect(() => {
        if (profile) {
            const init = {
                nome: profile.nome ?? '',
                cognome: profile.cognome ?? '',
                telefono: profile.telefono ?? '',
                lingua: profile.lingua ?? 'it',
                indirizzo: profile.indirizzo ?? '',
                cap: profile.cap ?? '',
                citta: profile.citta ?? '',
                paese: profile.paese ?? 'CH',
            }
            setForm(init)
            setDatiOriginali(init)
        }
    }, [profile])
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)
    const [errDati, setErrDati] = useState('')

    // ── Password ──
    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [editingPwd, setEditingPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    const f = k => ({
        value: form[k],
        onChange: e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrDati('') }
    })

    const isDirty = JSON.stringify(form) !== JSON.stringify(datiOriginali)

    const isApproved = profile?.verification_status === 'approved'
    const isRejected = profile?.verification_status === 'rejected'
    const isPending = profile?.verification_status === 'pending'

    async function handleSalvaDati() {
        setErrDati('')
        setOkDati(false)
        setSalvandoDati(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Sessione scaduta. Effettua di nuovo il login.')
            // clamp lingua al CHECK profiles_lingua_check (it/de/fr)
            const linguaOk = ['it', 'de', 'fr'].includes(form.lingua) ? form.lingua : 'it'
            const { error } = await supabase
                .from('profiles')
                .update({
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    telefono: form.telefono.trim() || null,
                    lingua: linguaOk,
                    indirizzo: form.indirizzo.trim() || null,
                    cap: form.cap.trim() || null,
                    citta: form.citta.trim() || null,
                    paese: form.paese || 'CH',
                })
                .eq('id', user.id)
            // Errore del database: niente testo tecnico, il messaggio generico
            if (error) throw new Error(messaggioErroreServer(error, { generico: t('errore_salvataggio') }))
            setDatiOriginali({ ...form })
            setOkDati(true)
            // il profilo in memoria si aggiorna: i pulsanti «Paga» vedono subito l'indirizzo
            reloadProfile?.()
            try { i18n.changeLanguage(form.lingua); localStorage.setItem('lexum_lingua', form.lingua) } catch { /* noop */ }
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) {
            setErrDati(err.message)
        } finally {
            setSalvandoDati(false)
        }
    }

    function handleAnnullaDati() {
        setForm({ ...datiOriginali })
        setErrDati('')
    }

    async function handleCambiaPwd() {
        setErrPwd('')
        setOkPwd(false)
        const errRegola = messaggioPassword(pwd.nuova, t)
        if (errRegola) return setErrPwd(errRegola)
        if (pwd.nuova !== pwd.conferma) return setErrPwd(t('password.err_mismatch'))
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(messaggioErroreAuthPassword(error, pwd.nuova, t) || error.message)
            setPwd({ nuova: '', conferma: '' })
            setEditingPwd(false)
            setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (err) {
            setErrPwd(err.message)
        } finally {
            setSalvandoPwd(false)
        }
    }

    return (
        <div className="space-y-5 max-w-2xl">
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {/* Stato account */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">{t('stato.titolo')}</p>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('stato.ruolo')}</span>
                    <Badge label={t('stato.ruolo_user')} variant="gray" />
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('stato.email')}</span>
                    <span className="font-body text-sm text-nebbia">{profile?.email ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('stato.verifica')}</span>
                    <div className="flex items-center gap-1.5">
                        {isApproved && <><CheckCircle size={13} className="text-salvia" /><span className="font-body text-sm text-salvia">{t('stato.approvata')}</span></>}
                        {isRejected && <><AlertCircle size={13} className="text-red-400" /><span className="font-body text-sm text-red-400">{t('stato.non_approvata')}</span></>}
                        {isPending && <><Clock size={13} className="text-amber-400" /><span className="font-body text-sm text-amber-400">{t('stato.in_corso')}</span></>}
                        {!profile?.verification_status && <span className="font-body text-sm text-nebbia/30">{t('stato.non_inviata')}</span>}
                    </div>
                </div>

                {isRejected && profile?.verification_note && (
                    <div className="mt-2 bg-red-900/10 border border-red-500/20 p-3">
                        <p className="font-body text-xs text-red-400/80 uppercase tracking-widest mb-1">{t('stato.motivo_rifiuto')}</p>
                        <p className="font-body text-sm text-red-400 leading-relaxed">{profile.verification_note}</p>
                    </div>
                )}
            </div>

            {/* Dati personali */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <p className="section-label">{t('dati.titolo')}</p>
                    {okDati && (
                        <span className="flex items-center gap-1 font-body text-xs text-salvia">
                            <Check size={12} /> {t('dati.salvato')}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField label={t('dati.nome')}    {...f('nome')} />
                    <InputField label={t('dati.cognome')} {...f('cognome')} />
                </div>
                <InputField label={t('dati.telefono')} placeholder={t('dati.telefono_placeholder')} {...f('telefono')} />
                <div className="pt-2 space-y-4">
                    <div>
                        <p className="font-body text-sm text-nebbia">{t('dati.fatturazione_titolo')}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">{t('dati.fatturazione_testo')}</p>
                    </div>
                    <InputField label={t('dati.indirizzo')} placeholder={t('dati.indirizzo_placeholder')} {...f('indirizzo')} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InputField label={t('dati.cap')} placeholder="6900" {...f('cap')} />
                        <InputField label={t('dati.citta')} placeholder="Lugano" {...f('citta')} />
                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('dati.paese')}</label>
                            <select
                                value={form.paese}
                                onChange={e => { setForm(p => ({ ...p, paese: e.target.value })); setErrDati('') }}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50"
                            >
                                {PAESI.map(c => <option key={c} value={c}>{nomePaese(c, i18n.language)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('dati.lingua')}</label>
                    <SelectLingua value={form.lingua} onChange={v => { setForm(p => ({ ...p, lingua: v })); setErrDati('') }} />
                </div>

                {errDati && (
                    <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                        <p className="font-body text-sm text-red-400">{errDati}</p>
                    </div>
                )}

                {isDirty && (
                    <div className="flex gap-3">
                        <button onClick={handleAnnullaDati} className="btn-secondary text-sm flex-1">{t('dati.annulla')}</button>
                        <button
                            onClick={handleSalvaDati}
                            disabled={salvandoDati}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                        >
                            {salvandoDati
                                ? <><Loader2 size={14} className="animate-spin" /> {t('dati.salvataggio')}</>
                                : t('dati.salva')
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* Password */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="section-label">{t('password.titolo')}</p>
                    {okPwd && (
                        <span className="flex items-center gap-1 font-body text-xs text-salvia">
                            <Check size={12} /> {t('password.aggiornata')}
                        </span>
                    )}
                </div>

                {!editingPwd ? (
                    <button onClick={() => setEditingPwd(true)} className="btn-secondary text-sm">
                        {t('password.modifica')}
                    </button>
                ) : (
                    <>
                        <div>
                            <InputField label={t('password.nuova')} type="password" placeholder={t('password.nuova_placeholder')}
                                value={pwd.nuova} onChange={e => setPwd(p => ({ ...p, nuova: e.target.value }))} />
                            <p className="mt-1.5 font-body text-xs text-nebbia/30 leading-relaxed">{suggerimentoPassword(t)}</p>
                        </div>
                        <InputField label={t('password.conferma')} type="password" placeholder={t('password.conferma_placeholder')}
                            value={pwd.conferma} onChange={e => setPwd(p => ({ ...p, conferma: e.target.value }))} />

                        {errPwd && (
                            <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                                <p className="font-body text-sm text-red-400">{errPwd}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                                className="btn-secondary text-sm flex-1"
                            >
                                {t('password.annulla')}
                            </button>
                            <button
                                onClick={handleCambiaPwd}
                                disabled={salvandoPwd || !pwd.nuova || !pwd.conferma}
                                className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                            >
                                {salvandoPwd
                                    ? <><Loader2 size={14} className="animate-spin" /> {t('password.aggiornamento')}</>
                                    : t('password.aggiorna')
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}