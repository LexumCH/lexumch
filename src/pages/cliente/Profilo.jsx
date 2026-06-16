import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, InputField } from '@/components/shared'
import { Check, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import SelectLingua from '@/components/SelectLingua'

export default function ClienteProfilo() {
    const { t, i18n } = useTranslation('cli_profilo')
    const { profile } = useAuth()

    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
        email: profile?.email ?? '',
        lingua: profile?.lingua ?? 'it',
        indirizzo: profile?.indirizzo ?? '',
    })

    // Sincronizza il form quando il profilo arriva (caso async)
    useEffect(() => {
        if (profile) {
            setForm({
                nome: profile.nome ?? '',
                cognome: profile.cognome ?? '',
                telefono: profile.telefono ?? '',
                email: profile.email ?? '',
                lingua: profile.lingua ?? 'it',
                indirizzo: profile.indirizzo ?? '',
            })
        }
    }, [profile])

    const [salvando, setSalvando] = useState(false)
    const [ok, setOk] = useState(false)
    const [err, setErr] = useState('')

    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    const f = k => ({ value: form[k], onChange: e => { setForm(p => ({ ...p, [k]: e.target.value })); setErr('') } })

    async function handleSalva() {
        setErr(''); setOk(false); setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                nome: form.nome.trim(),
                cognome: form.cognome.trim(),
                telefono: form.telefono.trim() || null,
                indirizzo: form.indirizzo.trim() || null,
                lingua: form.lingua || 'it',
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setOk(true)
            // Applica subito la lingua scelta all'interfaccia
            try { i18n.changeLanguage(form.lingua); localStorage.setItem('lexum_lingua', form.lingua) } catch { /* noop */ }
            setTimeout(() => setOk(false), 3000)
        } catch (e) { setErr(e.message) }
        finally { setSalvando(false) }
    }

    async function handleCambiaPwd() {
        setErrPwd(''); setOkPwd(false)
        if (pwd.nuova.length < 8) return setErrPwd(t('password.min'))
        if (pwd.nuova !== pwd.conferma) return setErrPwd(t('password.mismatch'))
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(error.message)
            setPwd({ nuova: '', conferma: '' }); setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (e) { setErrPwd(e.message) }
        finally { setSalvandoPwd(false) }
    }

    return (
        <div className="space-y-5 max-w-2xl">
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {/* Info account */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">{t('info_account.titolo')}</p>
                {[
                    [t('info_account.ruolo'), t('info_account.cliente')],
                    [t('info_account.studio'), profile?.studio ?? '-'],
                    [t('info_account.avvocato'), profile?.avvocato_id ? t('info_account.assegnato') : '-'],
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
            </div>

            {/* Dati personali */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <p className="section-label">{t('dati_personali.titolo')}</p>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label={t('dati_personali.nome')}    {...f('nome')} />
                    <InputField label={t('dati_personali.cognome')} {...f('cognome')} />
                </div>
                <InputField label={t('dati_personali.telefono')} placeholder={t('dati_personali.telefono_placeholder')} {...f('telefono')} />
                <div>
                    <InputField label={t('dati_personali.email')} type="email" value={form.email} disabled onChange={() => { }} />
                    <p className="mt-1 font-body text-xs text-nebbia/25">{t('dati_personali.email_hint')}</p>
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('dati_personali.lingua')}</label>
                    <SelectLingua value={form.lingua} onChange={v => { setForm(p => ({ ...p, lingua: v })); setErr('') }} />
                </div>
                <InputField label={t('dati_personali.indirizzo')} placeholder={t('dati_personali.indirizzo_placeholder')} {...f('indirizzo')} />
                {err && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {err}</div>}
                {ok && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> {t('dati_personali.ok')}</div>}
                <button onClick={handleSalva} disabled={salvando} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                    {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> {t('dati_personali.salva')}</>}
                </button>
            </div>

            {/* Password */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <p className="section-label">{t('password.titolo')}</p>
                {['nuova', 'conferma'].map(k => (
                    <div key={k}>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                            {k === 'nuova' ? t('password.nuova') : t('password.conferma')}
                        </label>
                        <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} value={pwd[k]}
                                onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                                placeholder={t('password.placeholder')}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-10 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                            {k === 'conferma' && (
                                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {errPwd && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errPwd}</div>}
                {okPwd && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> {t('password.ok')}</div>}
                <button onClick={handleCambiaPwd} disabled={salvandoPwd || !pwd.nuova || !pwd.conferma} className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">
                    {salvandoPwd ? <span className="animate-spin w-4 h-4 border-2 border-nebbia/40 border-t-transparent rounded-full" /> : t('password.aggiorna')}
                </button>
            </div>
        </div>
    )
}
