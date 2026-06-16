// src/pages/avvocato/Profilo.jsx

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeader, Badge } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Scale, ArrowRight, Shield, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ModalAttiva2FA from '@/components/sicurezza/ModalAttiva2FA'
import ModalBackupCodes from '@/components/sicurezza/ModalBackupCodes'
import SelectLingua, { nomeLingua } from '@/components/SelectLingua'

function Campo({ label, value, placeholder = '—', type = 'text', disabled = false, editing, onChange, notEditableLabel }) {
    if (!editing || disabled) {
        return (
            <div>
                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-1">{label}</label>
                <p className={`font-body text-sm py-2 border-b border-white/8 ${value ? 'text-nebbia' : 'text-nebbia/25 italic'}`}>
                    {value || placeholder}
                </p>
                {disabled && editing && <p className="font-body text-xs text-nebbia/20 mt-1">{notEditableLabel}</p>}
            </div>
        )
    }
    return (
        <div>
            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
    )
}

export default function AvvocatoProfilo() {
    const { t, i18n } = useTranslation('avv_profilo')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [loading, setLoading] = useState(true)
    const [tipoAccount, setTipoAccount] = useState(null)
    const [verificato, setVerificato] = useState(false)

    // Dati piano da profiles
    const [pianoDati, setPianoDati] = useState(null)

    // Dati personali
    const [dati, setDati] = useState({ nome: '', cognome: '', telefono: '', email: '', lingua: 'it', specializzazioni: '', studio: '' })
    const [datiOriginali, setDatiOriginali] = useState({})
    const [editingDati, setEditingDati] = useState(false)
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)
    const [errDati, setErrDati] = useState('')

    // Dati professionali per atti
    const [atti, setAtti] = useState({ cantone_albo: '', numero_albo: '', data_iscrizione_albo: '' })
    const [attiOriginali, setAttiOriginali] = useState({})
    const [editingAtti, setEditingAtti] = useState(false)
    const [salvandoAtti, setSalvandoAtti] = useState(false)
    const [okAtti, setOkAtti] = useState(false)
    const [errAtti, setErrAtti] = useState('')

    // Password
    const [editingPwd, setEditingPwd] = useState(false)
    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    // 2FA
    const [mfaAttivo, setMfaAttivo] = useState(false)
    const [mfaAttivatoAt, setMfaAttivatoAt] = useState(null)
    const [codiciRestanti, setCodiciRestanti] = useState(null)
    const [modal2FA, setModal2FA] = useState(false)
    const [codiciDaMostrare, setCodiciDaMostrare] = useState(null)
    const [rigenerando, setRigenerando] = useState(false)
    const [disattivando, setDisattivando] = useState(false)
    const [err2FA, setErr2FA] = useState('')

    useEffect(() => {
        async function carica() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                const { data: profilo } = await supabase
                    .from('profiles')
                    .select('nome, cognome, email, telefono, lingua, specializzazioni, studio, tipo_account, verification_status, piano_id, abbonamento_tipo, abbonamento_scadenza, posti_acquistati, include_banca_dati, include_monetizzazione, cantone_albo, numero_albo, data_iscrizione_albo, mfa_attivo, mfa_attivato_at')
                    .eq('id', user.id)
                    .single()

                if (profilo) {
                    const d = {
                        nome: profilo.nome ?? '',
                        cognome: profilo.cognome ?? '',
                        telefono: profilo.telefono ?? '',
                        email: profilo.email ?? user.email ?? '',
                        lingua: profilo.lingua ?? 'it',
                        specializzazioni: Array.isArray(profilo.specializzazioni)
                            ? profilo.specializzazioni.join(', ')
                            : (profilo.specializzazioni ?? ''),
                        studio: profilo.studio ?? '',
                    }
                    setDati(d)
                    setDatiOriginali(d)

                    const a = {
                        cantone_albo: profilo.cantone_albo ?? '',
                        numero_albo: profilo.numero_albo ?? '',
                        data_iscrizione_albo: profilo.data_iscrizione_albo ?? '',
                    }
                    setAtti(a)
                    setAttiOriginali(a)

                    setTipoAccount(profilo.tipo_account ?? null)
                    setVerificato(profilo.verification_status === 'approved')

                    if (profilo.piano_id) {
                        setPianoDati({
                            nome: profilo.abbonamento_tipo ?? '—',
                            scadenza: profilo.abbonamento_scadenza ?? null,
                            posti: profilo.posti_acquistati ?? 1,
                            include_banca_dati: profilo.include_banca_dati ?? false,
                            include_monetizzazione: profilo.include_monetizzazione ?? false,
                        })
                    }

                    // 2FA
                    setMfaAttivo(profilo.mfa_attivo ?? false)
                    setMfaAttivatoAt(profilo.mfa_attivato_at ?? null)

                    if (profilo.mfa_attivo) {
                        try {
                            const { data } = await supabase.functions.invoke('mfa-backup-codes', {
                                body: { action: 'status' }
                            })
                            if (data?.ok) setCodiciRestanti(data.restanti)
                        } catch (err) {
                            console.error('Status backup codes:', err)
                        }
                    }
                }
            } catch (err) {
                console.error('Profilo carica:', err)
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [])

    async function handleSalvaDati() {
        setSalvandoDati(true); setErrDati(''); setOkDati(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                nome: dati.nome.trim(),
                cognome: dati.cognome.trim(),
                telefono: dati.telefono.trim() || null,
                lingua: dati.lingua || 'it',
                studio: dati.studio.trim() || null,
                specializzazioni: dati.specializzazioni.trim()
                    ? dati.specializzazioni.split(',').map(s => s.trim()).filter(Boolean)
                    : null,
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali(dati); setEditingDati(false); setOkDati(true)
            // Applica subito la lingua scelta all'interfaccia
            try { i18n.changeLanguage(dati.lingua); localStorage.setItem('lexum_lingua', dati.lingua) } catch { /* noop */ }
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) { setErrDati(err.message) }
        finally { setSalvandoDati(false) }
    }

    function handleAnnullaDati() { setDati(datiOriginali); setEditingDati(false); setErrDati('') }

    async function handleSalvaAtti() {
        setSalvandoAtti(true); setErrAtti(''); setOkAtti(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                cantone_albo: atti.cantone_albo.trim() || null,
                numero_albo: atti.numero_albo.trim() || null,
                data_iscrizione_albo: atti.data_iscrizione_albo || null,
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setAttiOriginali(atti); setEditingAtti(false); setOkAtti(true)
            setTimeout(() => setOkAtti(false), 3000)
        } catch (err) { setErrAtti(err.message) }
        finally { setSalvandoAtti(false) }
    }

    function handleAnnullaAtti() { setAtti(attiOriginali); setEditingAtti(false); setErrAtti('') }

    async function handleCambiaPwd() {
        setErrPwd(''); setOkPwd(false)
        if (pwd.nuova.length < 8) return setErrPwd(t('password.min_caratteri'))
        if (pwd.nuova !== pwd.conferma) return setErrPwd(t('password.non_corrispondono'))
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(error.message)
            setPwd({ nuova: '', conferma: '' }); setEditingPwd(false); setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (err) { setErrPwd(err.message) }
        finally { setSalvandoPwd(false) }
    }

    // ─── 2FA HANDLERS ──────────────────────────────────────────
    async function handleAttiva2FASuccess(codici) {
        setModal2FA(false)
        setMfaAttivo(true)
        setMfaAttivatoAt(new Date().toISOString())
        setCodiciDaMostrare(codici)
        setCodiciRestanti(codici.length)
    }

    async function handleRigeneraCodici() {
        if (!confirm(t('sicurezza.conferma_rigenera'))) return
        setRigenerando(true); setErr2FA('')
        try {
            const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
                body: { action: 'regenerate' }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('sicurezza.errore_generico'))
            setCodiciDaMostrare(data.codici)
            setCodiciRestanti(data.codici.length)
        } catch (err) { setErr2FA(err.message) }
        finally { setRigenerando(false) }
    }

    async function handleDisattiva2FA() {
        if (!confirm(t('sicurezza.conferma_disattiva'))) return
        setDisattivando(true); setErr2FA('')
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            for (const f of (factors?.totp ?? [])) {
                await supabase.auth.mfa.unenroll({ factorId: f.id })
            }
            // Pulisci backup codes
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
            setMfaAttivo(false)
            setMfaAttivatoAt(null)
            setCodiciRestanti(null)
        } catch (err) { setErr2FA(err.message) }
        finally { setDisattivando(false) }
    }

    const isMembro = tipoAccount === 'membro' || tipoAccount === 'referente'
    const tipoLabel = { titolare: t('tipo_label.titolare'), referente: t('tipo_label.referente'), membro: t('tipo_label.membro'), singolo: t('tipo_label.singolo') }[tipoAccount ?? ''] ?? t('tipo_label.default')

    const scaduto = pianoDati?.scadenza && new Date(pianoDati.scadenza) < new Date()

    // Verifica completezza dati per generazione atti
    const campiAttiMancanti = []
    if (!atti.cantone_albo) campiAttiMancanti.push(t('campi_mancanti.cantone_albo'))
    if (!atti.numero_albo) campiAttiMancanti.push(t('campi_mancanti.numero_albo'))
    const profiloCompleto = campiAttiMancanti.length === 0

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {/* BANNER COMPLETAMENTO PROFILO */}
            {!profiloCompleto && (
                <div className="bg-amber-900/10 border border-amber-500/30 p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-amber-400 mb-1">
                            {t('banner.titolo')}
                        </p>
                        <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                            {t('banner.mancano')} <span className="font-medium">{campiAttiMancanti.join(', ')}</span>. {t('banner.testo_pre')} <em>{t('banner.testo_sezione')}</em> {t('banner.testo_post')}
                        </p>
                    </div>
                </div>
            )}

            {/* INFORMAZIONI ACCOUNT */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">{t('info_account.titolo')}</p>
                {[
                    [t('info_account.tipo_account'), tipoLabel, false],
                    dati.studio ? [t('info_account.studio'), dati.studio, false] : null,
                    [t('info_account.verifica_identita'), verificato ? t('info_account.identita_verificata') : t('info_account.in_attesa_verifica'), true],
                ].filter(Boolean).map(([l, v, isVerifica]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className={`font-body text-sm ${isVerifica && verificato ? 'text-salvia' : 'text-nebbia'}`}>{v}</span>
                    </div>
                ))}
                {isMembro && <p className="font-body text-xs text-nebbia/25 italic mt-1">{t('info_account.membro_note')}</p>}
                <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-1">{t('info_account.gestisci_studio')}</Link>
            </div>

            {/* DATI PERSONALI */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <p className="section-label">{t('dati_personali.titolo')}</p>
                    {!editingDati ? (
                        <button onClick={() => setEditingDati(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> {t('dati_personali.modifica')}
                        </button>
                    ) : (
                        <button onClick={handleAnnullaDati} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> {t('dati_personali.annulla')}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <Campo label={t('dati_personali.nome')} value={dati.nome} editing={editingDati} onChange={v => setDati(d => ({ ...d, nome: v }))} />
                    <Campo label={t('dati_personali.cognome')} value={dati.cognome} editing={editingDati} onChange={v => setDati(d => ({ ...d, cognome: v }))} />
                </div>
                <Campo label={t('dati_personali.studio')} value={dati.studio} placeholder={t('dati_personali.studio_placeholder')}
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, studio: v }))} />
                <Campo label={t('dati_personali.telefono')} value={dati.telefono} placeholder={t('dati_personali.telefono_placeholder')}
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, telefono: v }))} />
                <div>
                    <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-1">{t('dati_personali.lingua')}</label>
                    {editingDati ? (
                        <SelectLingua value={dati.lingua} onChange={v => setDati(d => ({ ...d, lingua: v }))} />
                    ) : (
                        <p className={`font-body text-sm py-2 border-b border-white/8 ${dati.lingua ? 'text-nebbia' : 'text-nebbia/25 italic'}`}>{nomeLingua(dati.lingua) || '—'}</p>
                    )}
                </div>
                <Campo label={t('dati_personali.email')} value={dati.email} disabled={true} editing={editingDati} onChange={() => { }} notEditableLabel={t('campo.non_modificabile')} />
                <Campo label={t('dati_personali.specializzazioni')} value={dati.specializzazioni} placeholder={t('dati_personali.specializzazioni_placeholder')}
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, specializzazioni: v }))} />

                {errDati && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errDati}</div>}
                {okDati && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> {t('dati_personali.ok')}</div>}
                {editingDati && (
                    <button onClick={handleSalvaDati} disabled={salvandoDati} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                        {salvandoDati ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> {t('dati_personali.salva')}</>}
                    </button>
                )}
            </div>

            {/* DATI PROFESSIONALI PER ATTI */}
            <div className={`bg-slate border p-6 space-y-5 ${profiloCompleto ? 'border-white/5' : 'border-amber-500/30'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale size={14} className="text-oro/60" />
                        <p className="section-label !m-0">{t('atti.titolo')}</p>
                        {profiloCompleto && (
                            <span className="font-body text-[10px] text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5 uppercase tracking-wider">
                                {t('atti.completo_badge')}
                            </span>
                        )}
                    </div>
                    {!editingAtti ? (
                        <button onClick={() => setEditingAtti(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> {profiloCompleto ? t('atti.modifica') : t('atti.compila')}
                        </button>
                    ) : (
                        <button onClick={handleAnnullaAtti} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> {t('atti.annulla')}
                        </button>
                    )}
                </div>

                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                    {t('atti.descrizione')}
                </p>

                <div className="grid grid-cols-2 gap-5">
                    <Campo label={t('atti.cantone_albo')} value={atti.cantone_albo} placeholder={t('atti.cantone_albo_placeholder')}
                        editing={editingAtti} onChange={v => setAtti(a => ({ ...a, cantone_albo: v }))} />
                    <Campo label={t('atti.numero_albo')} value={atti.numero_albo} placeholder={t('atti.numero_albo_placeholder')}
                        editing={editingAtti} onChange={v => setAtti(a => ({ ...a, numero_albo: v }))} />
                </div>
                <Campo label={t('atti.data_iscrizione')} value={atti.data_iscrizione_albo} placeholder="—" type="date"
                    editing={editingAtti} onChange={v => setAtti(a => ({ ...a, data_iscrizione_albo: v }))} />

                {errAtti && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errAtti}</div>}
                {okAtti && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> {t('atti.ok')}</div>}
                {editingAtti && (
                    <button onClick={handleSalvaAtti} disabled={salvandoAtti} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                        {salvandoAtti ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> {t('atti.salva')}</>}
                    </button>
                )}
            </div>

            {/* ABBONAMENTO */}
            {pianoDati && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">{isMembro ? t('abbonamento.titolo_studio') : t('abbonamento.titolo')}</p>
                    <div className="flex items-center justify-between p-4 bg-oro/8 border border-oro/20">
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">{pianoDati.nome}</p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                {pianoDati.posti} {pianoDati.posti === 1 ? t('abbonamento.accesso') : t('abbonamento.accessi')}
                                {pianoDati.include_banca_dati ? t('abbonamento.banca_dati') : ''}
                            </p>
                            {pianoDati.scadenza && (
                                <p className={`font-body text-xs mt-0.5 ${scaduto ? 'text-red-400' : 'text-nebbia/40'}`}>
                                    {scaduto ? t('abbonamento.scaduto') : t('abbonamento.scade_il', { data: new Date(pianoDati.scadenza).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                                </p>
                            )}
                        </div>
                        <Badge label={scaduto ? t('abbonamento.scaduto') : t('abbonamento.attivo')} variant={scaduto ? 'red' : 'salvia'} />
                    </div>
                    {isMembro
                        ? <p className="font-body text-xs text-nebbia/30 mt-2">{t('abbonamento.gestito_titolare')}</p>
                        : <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-3">{t('abbonamento.gestisci_piano')}</Link>
                    }
                </div>
            )}

            {/* PASSWORD */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="section-label">{t('password.titolo')}</p>
                    {!editingPwd ? (
                        <button onClick={() => setEditingPwd(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> {t('password.cambia')}
                        </button>
                    ) : (
                        <button onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> {t('password.annulla')}
                        </button>
                    )}
                </div>

                {!editingPwd ? (
                    <p className="font-body text-sm text-nebbia/30 py-2 border-b border-white/8">............</p>
                ) : (
                    <>
                        {['nuova', 'conferma'].map(k => (
                            <div key={k}>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
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
                        <button onClick={handleCambiaPwd} disabled={salvandoPwd || !pwd.nuova || !pwd.conferma} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                            {salvandoPwd ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> {t('password.aggiorna')}</>}
                        </button>
                    </>
                )}
                {okPwd && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> {t('password.ok')}</div>}
            </div>

            {/* SICUREZZA — 2FA */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center gap-2">
                    {mfaAttivo
                        ? <ShieldCheck size={14} className="text-salvia" />
                        : <Shield size={14} className="text-nebbia/40" />
                    }
                    <p className="section-label !m-0">{t('sicurezza.titolo')}</p>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-nebbia mb-1">
                            {t('sicurezza.due_fattori')}
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {mfaAttivo
                                ? t('sicurezza.attiva_dal', { data: new Date(mfaAttivatoAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) })
                                : t('sicurezza.descrizione')
                            }
                        </p>
                    </div>
                    <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${mfaAttivo
                        ? 'text-salvia border border-salvia/30 bg-salvia/5'
                        : 'text-nebbia/40 border border-white/10 bg-white/5'
                        }`}>
                        {mfaAttivo ? t('sicurezza.attivo') : t('sicurezza.non_attivo')}
                    </span>
                </div>

                {mfaAttivo && codiciRestanti !== null && (
                    <div className="bg-petrolio border border-white/5 p-4 flex items-center justify-between">
                        <div>
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">{t('sicurezza.codici_recupero')}</p>
                            <p className="font-body text-sm text-nebbia">{t('sicurezza.codici_disponibili', { n: codiciRestanti })}</p>
                            {codiciRestanti <= 3 && (
                                <p className="font-body text-xs text-amber-400 mt-1">
                                    {t('sicurezza.codici_quasi_esauriti')}
                                </p>
                            )}
                        </div>
                        <button onClick={handleRigeneraCodici} disabled={rigenerando}
                            className="font-body text-xs text-oro hover:text-oro/70 border border-oro/30 hover:border-oro/60 px-3 py-1.5 disabled:opacity-40">
                            {rigenerando ? t('sicurezza.rigenero') : t('sicurezza.rigenera')}
                        </button>
                    </div>
                )}

                {err2FA && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {err2FA}
                    </div>
                )}

                <div className="flex gap-2">
                    {!mfaAttivo ? (
                        <button onClick={() => setModal2FA(true)} className="btn-primary text-sm flex items-center gap-2">
                            <Shield size={14} /> {t('sicurezza.attiva_2fa')}
                        </button>
                    ) : (
                        <button onClick={handleDisattiva2FA} disabled={disattivando}
                            className="font-body text-sm text-red-400/80 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-4 py-2.5 disabled:opacity-40">
                            {disattivando ? t('sicurezza.disattivo') : t('sicurezza.disattiva_2fa')}
                        </button>
                    )}
                </div>
            </div>

            {/* MODALS 2FA */}
            {modal2FA && (
                <ModalAttiva2FA
                    onClose={() => setModal2FA(false)}
                    onSuccess={handleAttiva2FASuccess}
                />
            )}
            {codiciDaMostrare && (
                <ModalBackupCodes
                    codici={codiciDaMostrare}
                    onClose={() => setCodiciDaMostrare(null)}
                />
            )}
        </div>
    )
}