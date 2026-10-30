import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase, supabaseUrl } from '@/lib/supabase'
import { messaggioPassword, messaggioErroreAuthPassword, suggerimentoPassword, messaggioErroreServer } from '@/lib/password'
import { PageHeader, InputField } from '@/components/shared'
import { Check, AlertCircle, Loader2, Receipt, FileText } from 'lucide-react'
import SelectLingua from '@/components/SelectLingua'
import { elencoPaesi } from '@/lib/paesi'

const LOCALE = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// La pagina del profilo (29-10-2026, come su IT): a sinistra dati personali e storico dei pagamenti, a destra
// l'indirizzo di fatturazione; in fondo, affiancate, password ed eliminazione dell'account. Ruolo e verifica
// d'identità non si mostrano più qui: lo stato della verifica sta nel menu e in /verifica/stato.
export default function UserProfilo() {
    const { t, i18n } = useTranslation('user_profilo')
    const { profile, reloadProfile } = useAuth()
    const { hash } = useLocation()

    // dall'avviso «Completa i dati» (Acquista) si arriva dritti all'indirizzo di fatturazione
    useEffect(() => {
        if (hash === '#fatturazione') document.getElementById('fatturazione')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [hash])

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
        // dati aziendali: con questi arriva anche la fattura (30-10-2026)
        ragione_sociale: profile?.ragione_sociale ?? '',
        uid: profile?.uid ?? '',
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
                ragione_sociale: profile.ragione_sociale ?? '',
                uid: profile.uid ?? '',
            }
            setForm(init)
            setDatiOriginali(init)
        }
    }, [profile])
    const [salvandoDati, setSalvandoDati] = useState(false)
    // la sezione in cui si è salvato o c'è l'errore: «personali» o «fatturazione»
    const [okDati, setOkDati] = useState('')
    const [errDati, setErrDati] = useState('')
    const [sezioneErrore, setSezioneErrore] = useState('')

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

    const CAMPI_PERSONALI = ['nome', 'cognome', 'telefono', 'lingua']
    const cambiati = Object.keys(form).filter(k => form[k] !== datiOriginali[k])
    const personaliCambiati = cambiati.some(k => CAMPI_PERSONALI.includes(k))
    const fatturazioneCambiata = cambiati.some(k => !CAMPI_PERSONALI.includes(k))

    async function handleSalvaDati(sezione) {
        setErrDati('')
        setSezioneErrore(sezione)
        setOkDati('')
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
                    ragione_sociale: form.ragione_sociale.trim() || null,
                    uid: form.uid.trim().toUpperCase() || null,
                })
                .eq('id', user.id)
            // Errore del database: niente testo tecnico, il messaggio generico
            if (error) throw new Error(messaggioErroreServer(error, { generico: t('errore_salvataggio') }))
            setDatiOriginali({ ...form })
            setOkDati(sezione)
            // il profilo in memoria si aggiorna: i pulsanti «Paga» vedono subito l'indirizzo
            reloadProfile?.()
            try { i18n.changeLanguage(form.lingua); localStorage.setItem('lexum_lingua', form.lingua) } catch { /* noop */ }
            setTimeout(() => setOkDati(''), 3000)
        } catch (err) {
            setErrDati(err.message)
        } finally {
            setSalvandoDati(false)
        }
    }

    // «Annulla» riporta indietro solo la sezione in cui si preme
    function handleAnnullaDati(sezione) {
        const personali = sezione === 'personali'
        setForm(p => Object.fromEntries(Object.keys(p).map(k =>
            [k, CAMPI_PERSONALI.includes(k) === personali ? datiOriginali[k] : p[k]])))
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

    // i pulsanti di una sezione: compaiono solo se in quella sezione è cambiato qualcosa
    const pulsantiSezione = (sezione) => (
        <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => handleAnnullaDati(sezione)} className="btn-secondary text-sm flex-1 justify-center">{t('dati.annulla')}</button>
            <button
                onClick={() => handleSalvaDati(sezione)}
                disabled={salvandoDati}
                className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
            >
                {salvandoDati
                    ? <><Loader2 size={14} className="animate-spin" /> {t('dati.salvataggio')}</>
                    : t('dati.salva')
                }
            </button>
        </div>
    )

    const erroreSezione = (sezione) => errDati && sezioneErrore === sezione && (
        <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
            <p className="font-body text-sm text-red-400">{errDati}</p>
        </div>
    )

    const salvato = (sezione) => okDati === sezione && (
        <span className="flex items-center gap-1 font-body text-xs text-salvia">
            <Check size={12} /> {t('dati.salvato')}
        </span>
    )

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.title')} />

            {/* Due colonne della stessa altezza: a sinistra dati personali e pagamenti (lo storico prende lo
                spazio che avanza), a destra l'indirizzo di fatturazione */}
            <div className="grid lg:grid-cols-2 gap-5">
                <div className="flex flex-col gap-5">
                    {/* Dati personali, con l'email dell'account */}
                    <div className="bg-slate border border-white/5 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="section-label">{t('dati.titolo')}</p>
                            {salvato('personali')}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 border-b border-white/5 pb-4">
                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{t('stato.email')}</span>
                            <span className="font-body text-sm text-nebbia break-words sm:text-right">{profile?.email ?? '—'}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label={t('dati.nome')}    {...f('nome')} />
                            <InputField label={t('dati.cognome')} {...f('cognome')} />
                        </div>
                        <InputField label={t('dati.telefono')} placeholder={t('dati.telefono_placeholder')} {...f('telefono')} />
                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('dati.lingua')}</label>
                            <SelectLingua value={form.lingua} onChange={v => { setForm(p => ({ ...p, lingua: v })); setErrDati('') }} />
                        </div>

                        {erroreSezione('personali')}
                        {personaliCambiati && pulsantiSezione('personali')}
                    </div>

                    <StoricoPagamenti userId={profile?.id} />
                </div>

                {/* Indirizzo di fatturazione: serve per pagare, compare nella ricevuta. L'avviso di Acquista porta qui. */}
                <div id="fatturazione" className="bg-slate border border-white/5 p-6 space-y-5 scroll-mt-24">
                    <div className="flex items-center justify-between">
                        <p className="section-label">{t('dati.fatturazione_titolo')}</p>
                        {salvato('fatturazione')}
                    </div>
                    <p className="font-body text-xs text-nebbia/40 -mt-2">{t('dati.fatturazione_testo')}</p>

                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('dati.paese')}</label>
                        <select
                            value={form.paese}
                            onChange={e => { setForm(p => ({ ...p, paese: e.target.value })); setErrDati('') }}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50"
                        >
                            {elencoPaesi(i18n.language, 'CH').map(p => <option key={p.codice} value={p.codice}>{p.nome}</option>)}
                        </select>
                    </div>
                    <InputField label={t('dati.indirizzo')} placeholder={t('dati.indirizzo_placeholder')} {...f('indirizzo')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label={t('dati.cap')} placeholder="6900" {...f('cap')} />
                        <InputField label={t('dati.citta')} placeholder="Lugano" {...f('citta')} />
                    </div>

                    {/* Dati aziendali (30-10-2026): con ragione sociale e numero IDI arriva anche la fattura */}
                    <div className="pt-2 space-y-4">
                        <div>
                            <p className="font-body text-sm text-nebbia">{t('dati.fattura_titolo')}</p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">{t('dati.fattura_testo')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label={t('dati.ragione_sociale')} {...f('ragione_sociale')} />
                            <InputField label={t('dati.uid')} placeholder="CHE-123.456.789" {...f('uid')} />
                        </div>
                    </div>

                    {erroreSezione('fatturazione')}
                    {fatturazioneCambiata && pulsantiSezione('fatturazione')}
                </div>
            </div>

            {/* In fondo, affiancate: password ed eliminazione dell'account */}
            <div className="grid lg:grid-cols-2 gap-5">
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
                        <button onClick={() => setEditingPwd(true)} className="btn-secondary text-sm w-full sm:w-auto justify-center">
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

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                                    className="btn-secondary text-sm flex-1 justify-center"
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

                <EliminaAccount />
            </div>
        </div>
    )
}

// Lo storico dei pagamenti (29-10-2026, come su IT): crediti, piani e archivio, sul sito e su iPhone (App Store).
// Si vedono gli ultimi 5, gli altri a richiesta. Per ogni pagamento arriva anche la ricevuta via email.
function StoricoPagamenti({ userId }) {
    const { t, i18n } = useTranslation('user_profilo')
    const [righe, setRighe] = useState(null)
    const [tutti, setTutti] = useState(false)
    const locale = LOCALE[i18n.language] ?? 'it-CH'
    const [scaricando, setScaricando] = useState(null)

    // La fattura (30-10-2026): il numero sta nei metadati della transazione, il PDF nel bucket fatture-lexum
    async function scaricaFattura(numero) {
        setScaricando(numero)
        try {
            const { data: f } = await supabase.from('fatture_lexum').select('pdf_path').eq('numero', numero).maybeSingle()
            const { data } = f?.pdf_path
                ? await supabase.storage.from('fatture-lexum').createSignedUrl(f.pdf_path, 60)
                : { data: null }
            if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
        } finally {
            setScaricando(null)
        }
    }

    useEffect(() => {
        if (!userId) return
        supabase
            .from('transazioni')
            .select('id, prodotto_nome, importo, valuta, stato, created_at, metadati')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
            .then(({ data }) => setRighe(data ?? []))
    }, [userId])

    return (
        <div className="flex-1 flex flex-col gap-4 bg-slate border border-white/5 p-6">
            <div className="flex items-center justify-between">
                <p className="section-label">{t('storico.titolo')}</p>
            </div>
            {righe === null ? (
                <Loader2 size={16} className="animate-spin text-nebbia/30" />
            ) : righe.length === 0 ? (
                <p className="font-body text-sm text-nebbia/40">{t('storico.vuoto')}</p>
            ) : (
                <ul className="divide-y divide-white/5">
                    {(tutti ? righe : righe.slice(0, 5)).map(r => {
                        // gli acquisti su iPhone possono essere in un'altra valuta (quella dell'App Store)
                        const valuta = r.valuta ?? r.metadati?.valuta ?? 'CHF'
                        return (
                            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-body text-sm text-nebbia truncate">{r.prodotto_nome}</p>
                                    <p className="font-body text-xs text-nebbia/40">
                                        {new Date(r.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-body text-sm text-nebbia">{valuta} {Number(r.importo ?? 0).toFixed(2)}</p>
                                    {r.stato === 'rimborsato' && <p className="font-body text-xs text-amber-400">{t('storico.rimborsato')}</p>}
                                    {r.metadati?.fattura && (
                                        <button
                                            onClick={() => scaricaFattura(r.metadati.fattura)}
                                            disabled={scaricando === r.metadati.fattura}
                                            className="inline-flex items-center gap-1 font-body text-xs text-oro hover:text-oro/70 transition-colors disabled:opacity-40"
                                        >
                                            <FileText size={11} /> {t('storico.fattura')}
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            {righe?.length > 5 && (
                <button onClick={() => setTutti(v => !v)} className="self-start font-body text-xs text-oro hover:text-oro/70 transition-colors">
                    {tutti ? t('storico.mostra_ultimi') : t('storico.mostra_tutti', { n: righe.length })}
                </button>
            )}
            <p className="mt-auto flex items-start gap-2 font-body text-xs text-nebbia/40 leading-relaxed">
                <Receipt size={13} className="shrink-0 mt-0.5" />
                {t('storico.ricevuta')}
            </p>
        </div>
    )
}

// Elimina account (29-10-2026, come su IT e nell'app): la funzione elimina-account cancella crediti, abbonamento,
// ricerche, etichette e archivio di questo paese e poi l'utente; i pagamenti restano, per la contabilità.
// Un abbonamento che si rinnova sul sito va disdetto prima: altrimenti Tagadapay continuerebbe ad addebitarlo.
// Quello preso su iPhone lo ferma solo Apple, dalle impostazioni dell'iPhone.
function EliminaAccount() {
    const { t } = useTranslation('user_profilo')
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [aperta, setAperta] = useState(false)
    const [rinnovi, setRinnovi] = useState({ sito: false, iphone: false })
    const [eliminando, setEliminando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        if (!aperta || !profile?.id) return
        supabase
            .from('abbonamenti')
            .select('fornitore')
            .eq('user_id', profile.id)
            .in('stato', ['attivo', 'in_ritardo'])
            .then(({ data }) => setRinnovi({
                sito: (data ?? []).some(a => a.fornitore === 'tagada'),
                iphone: (data ?? []).some(a => a.fornitore === 'apple'),
            }))
    }, [aperta, profile?.id])

    async function elimina() {
        setEliminando(true)
        setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`${supabaseUrl}/functions/v1/elimina-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: '{}',
            })
            const esito = await res.json().catch(() => ({}))
            if (res.ok && esito.ok) {
                await signOut()
                navigate('/', { replace: true })
                return
            }
            if (esito.codice === 'serve_aal2') setErrore(t('elimina.err_aal2'))
            else if (res.status === 409) setErrore(t('elimina.err_409'))
            else setErrore(t('elimina.err'))
        } catch {
            setErrore(t('elimina.err'))
        } finally {
            setEliminando(false)
        }
    }

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="section-label">{t('elimina.titolo')}</p>
            </div>
            {!aperta ? (
                <>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('elimina.testo')}</p>
                    <button onClick={() => setAperta(true)} className="font-body text-sm text-red-400 hover:text-red-300 transition-colors">
                        {t('elimina.apri')}
                    </button>
                </>
            ) : (
                <>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed">{t('elimina.domanda')}</p>
                    <p className="font-body text-xs text-nebbia/40">{t('elimina.scarica')}</p>
                    {rinnovi.sito && (
                        <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-500/30 px-4 py-3">
                            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="font-body text-xs text-nebbia/80 leading-relaxed">
                                {t('elimina.rinnovo_prima')}{' '}
                                <Link to="/area/acquista" className="text-oro hover:text-oro/70">{t('elimina.rinnovo_link')}</Link>{t('elimina.rinnovo_dopo')}
                            </p>
                        </div>
                    )}
                    {rinnovi.iphone && (
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">{t('elimina.iphone')}</p>
                    )}
                    {errore && (
                        <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                            <p className="font-body text-sm text-red-400">{errore}</p>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => { setAperta(false); setErrore('') }} className="btn-secondary text-sm flex-1 justify-center">
                            {t('dati.annulla')}
                        </button>
                        <button
                            onClick={elimina}
                            disabled={eliminando || rinnovi.sito}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-900/30 border border-red-500/40 text-red-300 font-body text-sm hover:bg-red-900/50 transition-colors disabled:opacity-40"
                        >
                            {eliminando ? <Loader2 size={14} className="animate-spin" /> : t('elimina.conferma')}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
