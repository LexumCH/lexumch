import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { attivaProvaGratuita, puoAttivareProva } from '@/lib/provaGratuita'
import { mancantiAcquisto, paginaDatiFatturazione, useDatiFatturazione } from '@/lib/datiFatturazione'
import { Upload, Check, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator, DraftingCompass, ChevronDown, Sparkles, MessageSquare, Unlock } from 'lucide-react'

const toArray = (v) => Array.isArray(v) ? v : []

// ── Config set documentale per direzione (solo le chiavi: i testi arrivano da t()) ──
// 05-11-2026: ad avvocati e progettisti documento e iscrizione servono per la prova gratuita, gli stessi che controlla
// il server. Ai fiduciari, che per ora non hanno la prova, restano facoltativi: danno il distintivo.
const SET_DOCUMENTALE = {
    avvocato: { documenti: ['identita', 'albo'] },
    fiduciario: { documenti: ['identita', 'registro', 'affiliazione'] },
    progettista: { documenti: ['identita', 'reg'] },
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
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t(chiave === 'fiduciario' ? 'vantaggi.come_funziona' : 'vantaggi.come_funziona_prova')}</p>
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
// Una riga da completare: il numero diventa una spunta quando è fatta.
function Passo({ numero, fatto, children, azione }) {
    return (
        <div className={`border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ${fatto ? 'border-salvia/30' : 'border-white/5'}`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {numero && (
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-body text-xs ${fatto ? 'bg-salvia/15 border border-salvia/30 text-salvia' : 'bg-oro/15 border border-oro/30 text-oro'}`}>
                        {fatto ? <Check size={12} /> : numero}
                    </span>
                )}
                <div className="min-w-0 flex-1">{children}</div>
            </div>
            {azione}
        </div>
    )
}

// Il documento si carica appena scelto: così resta anche se si va nel Profilo a compilare i dati di fatturazione.
function RigaDocumento({ numero, direzione, chiave, file, inCarico, onFile }) {
    const { t } = useTranslation('user_verifica')
    return (
        <Passo
            numero={numero}
            fatto={!!file}
            azione={(
                <label className={`btn-secondary text-xs px-3 py-3 sm:py-2 w-full sm:w-auto justify-center flex items-center gap-1.5 shrink-0 ${inCarico ? 'opacity-40 cursor-wait' : 'cursor-pointer'}`}>
                    {inCarico
                        ? <><Loader2 size={12} className="animate-spin" /> {t('upload.caricamento')}</>
                        : <><Upload size={12} /> {file ? t('upload.cambia') : t('upload.carica')}</>}
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={inCarico}
                        onChange={e => {
                            const f = e.target.files?.[0]
                            e.target.value = ''
                            if (f) onFile(chiave, f)
                        }}
                    />
                </label>
            )}
        >
            <p className="font-body text-sm text-nebbia mb-0.5">{t(`set.${direzione}.documenti.${chiave}.label`)}</p>
            <p className="font-body text-xs text-nebbia/40">{t(`set.${direzione}.documenti.${chiave}.hint`)}</p>
            {file && (
                <p className="font-body text-xs text-salvia mt-1 break-words">
                    ✓ {file.name}{file.size ? ` (${(file.size / 1024).toFixed(0)} KB)` : ''}
                </p>
            )}
        </Passo>
    )
}

export function UserVerifica() {
    const { t } = useTranslation('user_verifica')
    const voce = useVoce()
    const { profile, reloadProfile } = useAuth()

    // Chi si è registrato dichiarando la professione la trova già scelta: le altre restano a un clic
    const direzione = profile?.tipo_richiesta ?? (['avvocato', 'fiduciario', 'progettista'].includes(profile?.professione) ? profile.professione : null)
    const [caricati, setCaricati] = useState({})
    const [letti, setLetti] = useState(false)
    const [nuovi, setNuovi] = useState(false)
    const [inCarico, setInCarico] = useState(null)
    const [loading, setLoading] = useState(false)
    const [salvandoDirezione, setSalvandoDirezione] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)
    const [attivandoProva, setAttivandoProva] = useState(false)
    const [erroreProva, setErroreProva] = useState('')
    const datiFatt = useDatiFatturazione()
    const mancanti = mancantiAcquisto(profile)

    // I documenti già sul server: gli stessi che controlla attiva_prova_gratuita. Il più recente di ogni tipo.
    useEffect(() => {
        if (!profile?.id) return
        supabase.storage.from('verification-docs').list(profile.id, { sortBy: { column: 'updated_at', order: 'asc' } })
            .then(({ data }) => {
                const presenti = {}
                for (const f of data ?? []) presenti[f.name.split('.')[0]] = { name: f.name, size: f.metadata?.size }
                setCaricati(presenti)
                setLetti(true)
            })
    }, [profile?.id])

    // Il ruolo cambia: la pagina si riapre sullo studio, con il profilo riletto dall'inizio
    async function handleProva() {
        setAttivandoProva(true)
        setErroreProva('')
        try {
            await attivaProvaGratuita()
            window.location.assign('/dashboard')
        } catch (err) {
            setErroreProva(err.message)
            setAttivandoProva(false)
        }
    }

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

    const documenti = (SET_DOCUMENTALE[direzione] ?? SET_DOCUMENTALE.avvocato).documenti
    const stato = profile?.verification_status
    const respinti = stato === 'rejected'
    const approvati = stato === 'approved'
    const provaFermata = !!profile?.prova_fermata_il
    const inAttesaDiRipartire = provaFermata && stato === 'pending'
    const provaDisponibile = !respinti && puoAttivareProva({ ...profile, tipo_richiesta: direzione })
    const documentiMancanti = approvati ? [] : documenti.filter(k => !caricati[k])
    const completo = mancanti.length === 0
    const provaPronta = letti && completo && documentiMancanti.length === 0
    const tuttiCaricati = documenti.every(k => caricati[k])
    const puoInviare = !loading && !inCarico && (respinti
        ? nuovi && tuttiCaricati
        : nuovi || (stato !== 'pending' && Object.keys(caricati).length > 0))

    async function caricaDocumento(key, file) {
        if (file.size > 10 * 1024 * 1024) { setErrore(t('errori.file_grande')); return }
        setErrore('')
        setInCarico(key)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error(t('errori.non_autenticato'))
            const ext = file.name.split('.').pop()
            const { error } = await supabase.storage
                .from('verification-docs')
                .upload(`${user.id}/${key}.${ext}`, file, { upsert: true })
            if (error) throw new Error(`${t('errori.upload')}: ${error.message}`)
            setCaricati(c => ({ ...c, [key]: { name: file.name, size: file.size } }))
            setNuovi(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInCarico(null)
        }
    }

    // I documenti sono già sul server: qui si chiede di guardarli (chi li ricarica dopo un rifiuto, i fiduciari)
    async function handleInvia() {
        if (!puoInviare) return
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error(t('errori.non_autenticato'))

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ verification_status: 'pending' })
                .eq('id', user.id)
            if (updateErr) throw new Error(updateErr.message)

            if (reloadProfile) await reloadProfile()
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
                {t(provaFermata ? 'inviato.desc_ripartenza' : 'inviato.desc')}
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

            {/* Documenti rifiutati (05-11-2026): il motivo prima di tutto, e la strada per rimediare */}
            {respinti && (
                <div className="bg-red-900/10 border border-red-500/25 p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="font-body text-sm font-medium text-nebbia mb-1">
                                {t(provaFermata ? 'rifiuto.titolo_fermata' : 'rifiuto.titolo')}
                            </p>
                            {profile?.verification_note && (
                                <p className="font-body text-sm text-nebbia/70 leading-relaxed break-words">
                                    <span className="text-red-400">{t('rifiuto.motivo')}</span> {profile.verification_note}
                                </p>
                            )}
                            <p className="font-body text-xs text-nebbia/50 leading-relaxed mt-2">
                                {t(provaFermata ? 'rifiuto.testo_fermata' : 'rifiuto.testo')}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {documenti.map(k => (
                            <RigaDocumento key={k} direzione={direzione} chiave={k} file={caricati[k]} inCarico={inCarico === k} onFile={caricaDocumento} />
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <button disabled={!puoInviare} onClick={handleInvia} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <>{t('rifiuto.invia')} <ArrowRight size={14} /></>}
                        </button>
                        <Link to={linkConsulenza(t, direzione)} className="inline-flex items-center gap-2 font-body text-sm text-nebbia/60 hover:text-oro transition-colors">
                            <MessageSquare size={14} /> {t('rifiuto.scrivi')}
                        </Link>
                    </div>
                </div>
            )}

            {inAttesaDiRipartire && (
                <div className="bg-amber-500/8 border border-amber-500/20 px-4 py-3 flex items-center gap-3">
                    <Clock size={15} className="text-amber-400 shrink-0" />
                    <p className="font-body text-xs text-amber-400/90 leading-relaxed">{t('rifiuto.in_attesa')}</p>
                </div>
            )}

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

            {/* La prova (05-11-2026): automatica, ma con documenti e dati di fatturazione, così prova solo chi è
                intenzionato. La consulenza si lascia intendere: è la stessa delle domande frequenti. */}
            {provaDisponibile && (
                <div className="bg-slate border border-oro/25 p-5 sm:p-6 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={15} className="text-oro" />
                            <p className="font-body text-sm font-medium text-oro">{t('prova.titolo')}</p>
                        </div>
                        <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                            {t(direzione === 'progettista' ? 'prova.testo_progettista' : 'prova.testo_avvocato')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        {approvati ? (
                            <Passo numero="1" fatto>
                                <p className="font-body text-sm text-nebbia">{t('upload.documenti_titolo')}</p>
                                <p className="font-body text-xs text-salvia mt-0.5">{t('prova.documenti_verificati')}</p>
                            </Passo>
                        ) : documenti.map((k, i) => (
                            <RigaDocumento key={k} numero={String(i + 1)} direzione={direzione} chiave={k} file={caricati[k]} inCarico={inCarico === k} onFile={caricaDocumento} />
                        ))}
                        {/* I dati di fatturazione si compilano nel Profilo, in un posto solo */}
                        <Passo
                            numero={approvati ? '2' : String(documenti.length + 1)}
                            fatto={completo}
                            azione={(
                                <Link to={paginaDatiFatturazione(profile)} className="btn-secondary text-xs px-3 py-3 sm:py-2 w-full sm:w-auto justify-center flex items-center gap-1.5 shrink-0">
                                    {completo ? t('fatturazione.vedi') : t('prova.completa_profilo')} <ArrowRight size={12} />
                                </Link>
                            )}
                        >
                            <p className="font-body text-sm text-nebbia mb-0.5">{t('fatturazione.titolo')}</p>
                            {completo
                                ? <p className="font-body text-xs text-salvia">{t('prova.dati_completi')}</p>
                                : <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('fatturazione.mancano', { campi: datiFatt.elenco(mancanti) })}</p>}
                        </Passo>
                    </div>

                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('prova.condizioni')}</p>

                    {erroreProva && <p className="font-body text-xs text-red-400">{erroreProva}</p>}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <button onClick={handleProva} disabled={!provaPronta || attivandoProva || !!inCarico} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                            {attivandoProva ? <Loader2 size={14} className="animate-spin" /> : <>{t('prova.attiva')} <ArrowRight size={14} /></>}
                        </button>
                        <Link to={linkConsulenza(t, direzione)} className="inline-flex items-center gap-2 font-body text-sm text-nebbia/60 hover:text-oro transition-colors">
                            <MessageSquare size={14} /> {t('vantaggi.consulenza')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Dati di fatturazione: sono loro a sbloccare i piani, si compilano nel Profilo. Nella prova sono l'ultimo passo. */}
            {!provaDisponibile && (
                <div className="bg-slate border border-white/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <p className="font-body text-sm font-medium text-nebbia mb-1">{t('fatturazione.titolo')}</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {completo ? t('fatturazione.completo') : t('fatturazione.testo')}
                        </p>
                        {!completo && (
                            <p className="font-body text-xs text-nebbia/35 leading-relaxed mt-1">{t('fatturazione.mancano', { campi: datiFatt.elenco(mancanti) })}</p>
                        )}
                    </div>
                    <Link to={completo ? '/area/acquista' : paginaDatiFatturazione(profile)} className="btn-primary text-sm inline-flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {completo ? t('stato.approved.cta') : t('fatturazione.completa')} <ArrowRight size={14} />
                    </Link>
                </div>
            )}

            {provaDisponibile && completo && (
                <Link to="/area/acquista" className="flex items-center gap-3 bg-salvia/8 border border-salvia/25 px-4 py-3 group">
                    <Unlock size={15} className="text-salvia shrink-0" />
                    <p className="font-body text-xs text-salvia flex-1">{t('fatturazione.completo')}</p>
                    <ArrowRight size={13} className="text-salvia group-hover:translate-x-0.5 transition-transform" />
                </Link>
            )}

            {/* Documenti facoltativi: per chi non ha la prova (i fiduciari). Danno il distintivo «Verificato». */}
            {!provaDisponibile && !respinti && !inAttesaDiRipartire && !approvati && (
                <>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('vantaggi.come_funziona')}</p>
                    <div className="bg-slate/40 border border-white/5 p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <Shield size={16} className="text-nebbia/40 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia mb-1">
                                    {t('upload.documenti_titolo')}
                                    <span className="ml-2 font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5">{t('upload.opzionale')}</span>
                                </p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('upload.documenti_testo')}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {documenti.map(k => (
                                <RigaDocumento key={k} direzione={direzione} chiave={k} file={caricati[k]} inCarico={inCarico === k} onFile={caricaDocumento} />
                            ))}
                        </div>
                        <button
                            disabled={!puoInviare}
                            onClick={handleInvia}
                            className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><Loader2 size={16} className="animate-spin" /> {t('upload.caricamento')}</>
                                : <><ArrowRight size={16} /> {t('upload.invia')}</>
                            }
                        </button>
                    </div>
                </>
            )}

            {errore && (
                <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            )}

            {(provaDisponibile || respinti || (!inAttesaDiRipartire && !approvati)) && (
                <div className="bg-slate/40 border border-salvia/15 p-4 flex items-start gap-3">
                    <Shield size={16} className="text-salvia mt-0.5 shrink-0" />
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        {t('upload.privacy')}
                    </p>
                </div>
            )}
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
    const desc = stato === 'pending' && profile?.prova_fermata_il
        ? t('stato.pending.desc_ripartenza')
        : t(`stato.${stato in STATO_META ? stato : 'pending'}.desc`)

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