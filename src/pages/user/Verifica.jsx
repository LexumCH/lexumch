import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator, DraftingCompass, ChevronDown, Sparkles, MessageSquare, Unlock } from 'lucide-react'

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

// ── Cosa si apre con un abbonamento (29-10-2026, come su IT) ──
// Per ogni professione le voci della lista; quelle con la spiegazione (nota) hanno testo e nota in
// user_verifica.json → strumenti.<chiave>.{testo,nota}. Scritte su quello che il sito CH fa davvero:
// lex-pratica e lex-mandato leggono pratica/mandato come su IT; calendario senza Google Calendar; fatture con
// QR-fattura; portale clienti per avvocati e fiduciari (per i progettisti non c'è).
const DIREZIONI = [
    {
        chiave: 'avvocato',
        icona: Scale,
        strumenti: ['avv_pratiche', 'avv_calendario', 'avv_clienti', 'avv_chat', 'fatture', 'assistenza', 'crediti'],
    },
    {
        chiave: 'fiduciario',
        icona: Calculator,
        strumenti: ['fid_mandati', 'fid_calendario', 'fid_contabilita', 'fid_chat', 'fatture', 'assistenza', 'crediti'],
    },
    {
        chiave: 'progettista',
        icona: DraftingCompass,
        strumenti: ['prg_progetti', 'prg_disegni', 'prg_documenti', 'prg_clienti', 'fatture', 'assistenza', 'crediti'],
    },
]

// una voce della lista: il testo e, se c'è, la sua spiegazione
function useVoce() {
    const { t } = useTranslation('user_verifica')
    return (k) => ({ testo: t(`strumenti.${k}.testo`), nota: t(`strumenti.${k}.nota`, { defaultValue: '' }) })
}

// La consulenza: un ticket già scritto, come «Richiedi il tuo codice»
function linkConsulenza(t, chiave) {
    const richiesta = new URLSearchParams({
        oggetto: t('vantaggi.consulenza_oggetto'),
        messaggio: t('vantaggi.consulenza_messaggio', { titolo: t(`scelta.${chiave}.titolo`) }),
    })
    return `/area/assistenza/nuovo?${richiesta}`
}

// ── SCELTA DIREZIONE (se tipo_richiesta non ancora impostato) ──
// Tre card a tutta larghezza (29-10-2026, come su IT): «Scopri di più» apre la tendina con quello che si apre
// con un abbonamento, come funziona la verifica, il pulsante per andare avanti e «Richiedi una consulenza».
// Ogni card si apre e si chiude da sola (aprirne una non chiude le altre).
function SceltaDirezione({ onScelta, loading }) {
    const { t } = useTranslation('user_verifica')
    const voce = useVoce()
    const [aperte, setAperte] = useState([])

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-3">{t('scelta.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{t('scelta.titolo')}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    {t('scelta.intro')}
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
                {DIREZIONI.map(({ chiave, icona: Icona, strumenti }) => {
                    const apertaQui = aperte.includes(chiave)
                    return (
                        <div key={chiave} className={`bg-slate border transition-colors ${apertaQui ? 'border-oro/40' : 'border-white/5 hover:border-oro/30'}`}>
                            <div className="p-8">
                                <Icona size={32} className="text-oro mb-5" />
                                <p className="font-display text-2xl text-nebbia mb-2">{t(`scelta.${chiave}.titolo`)}</p>
                                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{t(`scelta.${chiave}.desc`)}</p>
                                <button
                                    onClick={() => setAperte(a => (apertaQui ? a.filter(k => k !== chiave) : [...a, chiave]))}
                                    aria-expanded={apertaQui}
                                    className="mt-6 inline-flex items-center gap-2 font-body text-sm text-oro hover:text-oro/70 transition-colors"
                                >
                                    {t('vantaggi.scopri')}
                                    <ChevronDown size={15} className={`transition-transform ${apertaQui ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {apertaQui && (
                                <div className="border-t border-white/5 px-8 py-6 space-y-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles size={15} className="text-oro" />
                                            <p className="font-body text-sm font-medium text-oro">{t('vantaggi.si_apre')}</p>
                                        </div>
                                        <ul className="space-y-2 font-body text-sm text-nebbia/70 leading-relaxed">
                                            {strumenti.map(voce).map(({ testo, nota }) => (
                                                <li key={testo} className="flex gap-2">
                                                    <CheckCircle size={14} className="text-salvia shrink-0 mt-1" />
                                                    <span>
                                                        {testo}
                                                        {nota && <span className="block mt-0.5 text-xs text-nebbia/45">{nota}</span>}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('vantaggi.come_funziona')}</p>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                        <button
                                            disabled={loading}
                                            onClick={() => onScelta(chiave)}
                                            className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-40"
                                        >
                                            {t('vantaggi.verifica_come', { titolo: t(`scelta.${chiave}.titolo`) })} <ArrowRight size={14} />
                                        </button>
                                        <Link to={linkConsulenza(t, chiave)} className="inline-flex items-center gap-2 font-body text-sm text-nebbia/60 hover:text-oro transition-colors">
                                            <MessageSquare size={14} /> {t('vantaggi.consulenza')}
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── UPLOAD DOCUMENTI ──────────────────────────────────────────
export function UserVerifica() {
    const { t } = useTranslation('user_verifica')
    const voce = useVoce()
    const { profile, reloadProfile } = useAuth()

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
            // i documenti cambiano da una professione all'altra: si ricomincia
            setDocs({})
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

    const strumenti = (DIREZIONI.find(d => d.chiave === direzione) ?? DIREZIONI[0]).strumenti

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-3">{t('upload.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{t(`set.${direzione}.titolo`)}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{t(`set.${direzione}.intro`)}</p>
            </div>

            {/* La professione sempre visibile (29-10-2026, come su IT): quella scelta evidenziata, le altre a un clic */}
            <div className="grid sm:grid-cols-3 gap-4">
                {DIREZIONI.map(({ chiave, icona: Icona }) => {
                    const attiva = chiave === direzione
                    const titolo = t(`scelta.${chiave}.titolo`)
                    return (
                        <button
                            key={chiave}
                            disabled={attiva || salvandoDirezione}
                            onClick={() => handleScelta(chiave)}
                            aria-pressed={attiva}
                            className={`flex items-center gap-4 p-5 border text-left transition-colors ${attiva
                                ? 'bg-slate border-oro/50 cursor-default'
                                : 'bg-slate/40 border-white/5 hover:border-oro/30 disabled:opacity-40'}`}
                        >
                            <Icona size={26} className={attiva ? 'text-oro' : 'text-nebbia/40'} />
                            <div className="flex-1">
                                <p className={`font-display text-xl ${attiva ? 'text-nebbia' : 'text-nebbia/60'}`}>{titolo}</p>
                                <p className="font-body text-xs text-nebbia/40">{attiva ? t('vantaggi.profilo_attivo') : t('vantaggi.passa_a', { titolo })}</p>
                            </div>
                            {attiva && <CheckCircle size={18} className="text-oro shrink-0" />}
                        </button>
                    )
                })}
            </div>

            {/* Cosa hai ora, cosa si apre — il punto della pagina */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Unlock size={15} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">{t('vantaggi.gia_usi')}</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/50 leading-relaxed">
                        {['banca_dati', 'lex', 'archivio', 'ricerche', 'assistenza'].map(k => (
                            <li key={k}>· {t(`vantaggi.gia.${k}`)}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-slate border border-oro/25 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={15} className="text-oro" />
                        <p className="font-body text-sm font-medium text-oro">{t('vantaggi.si_apre')}</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/60 leading-relaxed">
                        {strumenti.map(voce).map(({ testo, nota }) => (
                            <li key={testo}>
                                · {testo}
                                {nota && <span className="block pl-2.5 text-nebbia/40">{nota}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('vantaggi.come_funziona')}</p>

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