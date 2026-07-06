import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator, DraftingCompass } from 'lucide-react'

const toArray = (v) => Array.isArray(v) ? v : []

// ── Config set documentale per direzione (chiavi i18n + flag req) ──
// I testi (titolo/intro/label/hint) arrivano da t(); qui restano solo key e req.
const SET_DOCUMENTALE = {
    avvocato: {
        documenti: [
            { key: 'identita', req: true },
            { key: 'albo', req: true },
            { key: 'laurea', req: false },
        ],
    },
    fiduciario: {
        documenti: [
            { key: 'identita', req: true },
            { key: 'registro', req: true },
            { key: 'affiliazione', req: false },
        ],
    },
    progettista: {
        documenti: [
            { key: 'identita', req: true },
            { key: 'reg', req: true },
            { key: 'diploma', req: false },
        ],
    },
}

// ── SCELTA DIREZIONE (se tipo_richiesta non ancora impostato) ──
function SceltaDirezione({ onScelta, loading }) {
    const { t } = useTranslation('user_verifica')
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">{t('scelta.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{t('scelta.titolo')}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    {t('scelta.intro')}
                </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                    disabled={loading}
                    onClick={() => onScelta('avvocato')}
                    className="bg-slate border border-white/5 hover:border-oro/40 p-6 text-left transition-colors group disabled:opacity-40"
                >
                    <Scale size={28} className="text-oro mb-4" />
                    <p className="font-display text-xl text-nebbia mb-2">{t('scelta.avvocato.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        {t('scelta.avvocato.desc')}
                    </p>
                </button>

                <button
                    disabled={loading}
                    onClick={() => onScelta('fiduciario')}
                    className="bg-slate border border-white/5 hover:border-oro/40 p-6 text-left transition-colors group disabled:opacity-40"
                >
                    <Calculator size={28} className="text-oro mb-4" />
                    <p className="font-display text-xl text-nebbia mb-2">{t('scelta.fiduciario.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        {t('scelta.fiduciario.desc')}
                    </p>
                </button>

                <button
                    disabled={loading}
                    onClick={() => onScelta('progettista')}
                    className="bg-slate border border-white/5 hover:border-oro/40 p-6 text-left transition-colors group disabled:opacity-40"
                >
                    <DraftingCompass size={28} className="text-oro mb-4" />
                    <p className="font-display text-xl text-nebbia mb-2">{t('scelta.progettista.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        {t('scelta.progettista.desc')}
                    </p>
                </button>
            </div>
        </div>
    )
}

// ── UPLOAD DOCUMENTI ──────────────────────────────────────────
export function UserVerifica() {
    const { t } = useTranslation('user_verifica')
    const { profile, reloadProfile } = useAuth()
    const navigate = useNavigate()

    const direzione = profile?.tipo_richiesta ?? null
    const [docs, setDocs] = useState({})
    const [loading, setLoading] = useState(false)
    const [salvandoDirezione, setSalvandoDirezione] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    // Se l'utente non ha ancora scelto la direzione, mostra la scelta
    async function handleScelta(scelta) {
        setSalvandoDirezione(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('profiles')
                .update({ tipo_richiesta: scelta })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            // ricarica il profilo nel context così la pagina si aggiorna
            if (reloadProfile) await reloadProfile()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvandoDirezione(false)
        }
    }

    if (!direzione) {
        return <SceltaDirezione onScelta={handleScelta} loading={salvandoDirezione} />
    }

    const config = SET_DOCUMENTALE[direzione] ?? SET_DOCUMENTALE.avvocato
    const documentiObbligatori = config.documenti.filter(d => d.req).map(d => d.key)
    const allReq = documentiObbligatori.every(k => docs[k])

    async function handleInvia() {
        if (!allReq || loading) return
        setLoading(true)
        setErrore('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error(t('errori.non_autenticato'))

            const uploads = config.documenti
                .filter(d => docs[d.key])
                .map(d => ({ file: docs[d.key], path: `${user.id}/${d.key}` }))

            for (const { file, path } of uploads) {
                const ext = file.name.split('.').pop()
                const { error: upErr } = await supabase.storage
                    .from('verification-docs')
                    .upload(`${path}.${ext}`, file, { upsert: true })
                if (upErr) throw new Error(`${t('errori.upload')}: ${upErr.message}`)
            }

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ verification_status: 'pending' })
                .eq('id', user.id)

            if (updateErr) throw new Error(updateErr.message)

            setInviato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (inviato) return (
        <div className="text-center py-12">
            <CheckCircle size={48} className="text-salvia mx-auto mb-4" />
            <h2 className="font-display text-4xl font-light text-nebbia mb-3">{t('inviato.titolo')}</h2>
            <p className="font-body text-sm text-nebbia/50 mb-6 leading-relaxed max-w-sm mx-auto">
                {t('inviato.desc')}
            </p>
            <Link to="/verifica/stato" className="btn-primary justify-center inline-flex">
                {t('inviato.controlla_stato')} <ArrowRight size={14} />
            </Link>
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">{t('upload.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{t(`set.${direzione}.titolo`)}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{t(`set.${direzione}.intro`)}</p>
            </div>

            <div className="space-y-4">
                {config.documenti.map(({ key, req }) => (
                    <div key={key} className={`bg-slate border p-5 ${docs[key] ? 'border-salvia/30' : 'border-white/5'}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-body text-sm font-medium text-nebbia">{t(`set.${direzione}.documenti.${key}.label`)}</p>
                                    {req
                                        ? <span className="font-body text-[10px] text-red-400 border border-red-500/30 px-1.5 py-0.5">{t('upload.obbligatorio')}</span>
                                        : <span className="font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5">{t('upload.opzionale')}</span>
                                    }
                                </div>
                                <p className="font-body text-xs text-nebbia/40">{t(`set.${direzione}.documenti.${key}.hint`)}</p>
                                {docs[key] && (
                                    <p className="font-body text-xs text-salvia mt-1">
                                        ✓ {docs[key].name} ({(docs[key].size / 1024).toFixed(0)} KB)
                                    </p>
                                )}
                            </div>
                            <label className={`cursor-pointer ${docs[key] ? 'btn-secondary' : 'btn-primary'} text-xs px-3 py-2 flex items-center gap-1.5`}>
                                <Upload size={12} /> {docs[key] ? t('upload.cambia') : t('upload.carica')}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={e => {
                                        const f = e.target.files?.[0]
                                        if (!f) return
                                        if (f.size > 10 * 1024 * 1024) { setErrore(t('errori.file_grande')); return }
                                        setErrore('')
                                        setDocs(d => ({ ...d, [key]: f }))
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                ))}
            </div>

            {errore && (
                <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            )}

            <div className="bg-slate/40 border border-salvia/15 p-4 flex items-start gap-3">
                <Shield size={16} className="text-salvia mt-0.5 shrink-0" />
                <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                    {t('upload.privacy')}
                </p>
            </div>

            <button
                disabled={!allReq || loading}
                onClick={handleInvia}
                className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {loading
                    ? <><Loader2 size={16} className="animate-spin" /> {t('upload.caricamento')}</>
                    : <><ArrowRight size={16} /> {t('upload.invia')}</>
                }
            </button>
        </div>
    )
}

// ── STATO VERIFICA ────────────────────────────────────────────
export function UserVerificaStato() {
    const { t } = useTranslation('user_verifica')
    const { profile } = useAuth()
    const stato = profile?.verification_status ?? 'pending'

    // Icone/colori mai nel JSON: costanti JS indicizzate per chiave-stato.
    const STATO_META = {
        pending: { icon: Clock, color: 'text-amber-400' },
        approved: { icon: CheckCircle, color: 'text-salvia' },
        rejected: { icon: XCircle, color: 'text-red-400' },
    }

    const { icon: Icon, color } = STATO_META[stato] ?? STATO_META.pending
    const title = t(`stato.${stato in STATO_META ? stato : 'pending'}.title`)
    const desc = t(`stato.${stato in STATO_META ? stato : 'pending'}.desc`)

    return (
        <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
            <Icon size={56} className={`mx-auto ${color}`} />
            <div>
                <h1 className="font-display text-4xl font-light text-nebbia mb-3">{title}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{desc}</p>
            </div>

            {stato === 'approved' && (
                <div className="space-y-3">
                    <Link to="/area/acquista" className="btn-primary justify-center inline-flex w-full">
                        {t('stato.approved.cta')} <ArrowRight size={16} />
                    </Link>
                </div>
            )}
            {stato === 'rejected' && (
                <div className="space-y-3">
                    <div className="bg-red-900/10 border border-red-500/20 p-4 text-left">
                        <p className="font-body text-xs text-red-400 mb-1">{t('stato.rejected.motivazione')}</p>
                        <p className="font-body text-sm text-nebbia/60">
                            {profile?.verification_note || profile?.note_iniziali || t('stato.rejected.motivazione_default')}
                        </p>
                    </div>
                    <Link to="/verifica" className="btn-primary justify-center inline-flex">{t('stato.rejected.ricarica')}</Link>
                </div>
            )}
        </div>
    )
}