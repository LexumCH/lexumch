import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase, supabaseUrl, getAccessToken } from '@/lib/supabase'
import ConsensoRecesso, { useConsensoRecesso } from '@/components/ConsensoRecesso'
import CodiceSconto, { useCodiceSconto, PrezzoScontato } from '@/components/CodiceSconto'
import { useContoPrivato, RiquadroConto, SezionePiani, SezioneArchivioInPiu, FinestraGestisci, gestisciAbbonamento } from '@/components/ContoPrivato'
import { ricordaRitorno } from '@/lib/ritornoCassa'
import { AvvisoDatiFatturazione, mancantiAcquisto, useDatiFatturazione } from '@/lib/datiFatturazione'
import { vociPiano, etichettaDurata, periodoPrezzo } from '@/lib/vociPiano'
import {
    Sparkles, CreditCard, ArrowRight, CheckCircle,
    AlertCircle, Loader2, Shield
} from 'lucide-react'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export default function Acquista() {
    const { t } = useTranslation('user_acquista')
    const { t: tc } = useTranslation('comp_conto_privato')
    const { profile } = useAuth()
    const location = useLocation()

    // Crediti, archivio e abbonamento (28-10-2026): il riquadro «Crediti e archivio» (src/components/ContoPrivato.jsx)
    const conto = useContoPrivato(profile)

    // Prodotti: i tre piani personali e l'archivio in più (abbonamenti che si rinnovano ogni mese), i pacchetti di
    // crediti (una volta, non scadono) e, per chi è verificato, i piani per lo studio.
    const [piani, setPiani] = useState([])
    const [archivioMensile, setArchivioMensile] = useState([])
    const [pacchettiCrediti, setPacchettiCrediti] = useState([])
    const [abbonamenti, setAbbonamenti] = useState([])
    const [seatAddon, setSeatAddon] = useState([])
    const [loadingProdotti, setLoadingProdotti] = useState(true)
    // Codice sconto: vale per i prodotti di questa pagina che l'admin ha scelto (src/components/CodiceSconto.jsx)
    const sconto = useCodiceSconto([
        ...piani.map(p => p.id), ...archivioMensile.map(p => p.id), ...pacchettiCrediti.map(p => p.id),
        ...abbonamenti.map(p => p.id), ...seatAddon.map(p => p.id),
    ])

    // Acquisto in corso
    const [acquistando, setAcquistando] = useState(null)
    const [errore, setErrore] = useState('')
    const [avviso, setAvviso] = useState('')
    const [gestisciAperta, setGestisciAperta] = useState(false)
    const consenso = useConsensoRecesso()
    const datiFatt = useDatiFatturazione()

    const isApproved = profile?.verification_status === 'approved'
    const haPianoStudio = profile?.posti_acquistati > 1

    // Ritorno dalla cassa
    const isSuccess = new URLSearchParams(location.search).get('success') === '1'

    useEffect(() => {
        if (isSuccess) {
            window.history.replaceState({}, '', '/area/acquista')
        }
        if (profile?.id) caricaProdotti()
    }, [profile?.id])

    // Al ritorno dalla cassa l'acquisto lo accredita il webhook, spesso qualche secondo DOPO il ritorno: senza
    // questo controllo il saldo restava quello vecchio (30/09/2026).
    useEffect(() => {
        if (!isSuccess || !profile?.id) return
        let volte = 0
        const timer = setInterval(() => {
            volte += 1
            conto.ricarica()
            if (volte >= 10) clearInterval(timer)
        }, 3000)
        return () => clearInterval(timer)
    }, [isSuccess, profile?.id])

    async function caricaProdotti() {
        setLoadingProdotti(true)
        setErrore('')
        try {
            const { data: tutti, error } = await supabase
                .from('prodotti')
                .select('id, nome, tipo, prezzo, durata_mesi, crediti_ai_mensili, spazio_gb, target_role, codice')
                .eq('attivo', true)
                .in('tipo', ['piano_privato', 'spazio_archiviazione', 'crediti_ai'])
                .order('prezzo')
            if (error) throw new Error(`Errore caricamento prodotti: ${error.message}`)
            setPiani((tutti ?? []).filter(p => p.tipo === 'piano_privato'))
            setArchivioMensile((tutti ?? []).filter(p => p.tipo === 'spazio_archiviazione' && p.target_role === 'user'))
            setPacchettiCrediti((tutti ?? []).filter(p => p.tipo === 'crediti_ai'))

            // Piani per lo studio (solo se verificato) — filtrati per direzione professionale
            if (isApproved) {
                const direzione = profile?.tipo_richiesta ?? 'avvocato'
                const { data: abb, error: errAbb } = await supabase
                    .from('prodotti')
                    .select('*')
                    .eq('tipo', 'abbonamento')
                    .eq('attivo', true)
                    .eq('target_role', direzione)
                    .order('prezzo')
                if (errAbb) throw new Error(`Errore caricamento abbonamenti: ${errAbb.message}`)
                setAbbonamenti(abb ?? [])

                // Posti aggiuntivi (solo se ha un piano studio)
                if (haPianoStudio) {
                    const { data: seats, error: errSeats } = await supabase
                        .from('prodotti')
                        .select('id, nome, prezzo')
                        .eq('tipo', 'seat_addon')
                        .eq('attivo', true)
                        .order('prezzo')
                    if (errSeats) throw new Error(`Errore caricamento posti: ${errSeats.message}`)
                    setSeatAddon(seats ?? [])
                }
            }
        } catch (err) {
            setErrore(err.message)
            console.error('caricaProdotti:', err)
        } finally {
            setLoadingProdotti(false)
        }
    }

    async function acquista(prodottoId) {
        setErrore('')
        setAvviso('')
        if (!consenso.ok) {
            setErrore(consenso.errore)
            document.getElementById('consenso-recesso')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        // indirizzo di fatturazione: lo chiediamo noi prima della cassa (src/lib/datiFatturazione.jsx)
        const mancanti = mancantiAcquisto(profile)
        if (mancanti.length) {
            setErrore(datiFatt.messaggio(mancanti))
            document.getElementById('dati-fatturazione')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        setAcquistando(prodottoId)
        try {
            const accessToken = await getAccessToken()
            const res = await fetch(
                `${supabaseUrl}/functions/v1/tagada-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        prodotto_id: prodottoId,
                        ...consenso.campo,
                        ...sconto.campo(prodottoId),
                        success_url: `${window.location.origin}/area/acquista?success=1`,
                        cancel_url: `${window.location.origin}/area/acquista`,
                    }),
                }
            )
            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.ok) throw new Error(json?.error || `Errore checkout (HTTP ${res.status})`)
            // dopo il pagamento Tagadapay manda a /pagamento/esito, che riporta qui (src/lib/ritornoCassa.js)
            ricordaRitorno('/area/acquista?success=1')
            window.location.href = json.url
        } catch (err) {
            setErrore(err.message)
            setAcquistando(null)
        }
    }

    // Piano più piccolo: dal mese dopo, se i file ci stanno (abbonamento-gestisci)
    async function passaA(piano) {
        if (!conto.piano) return
        setErrore('')
        setAvviso('')
        const r = await gestisciAbbonamento('cambia', conto.piano.id, piano.id)
        if (r.checkout) return acquista(piano.id)
        if (!r.ok) { setErrore(r.error ?? tc('errore_generico')); return }
        setAvviso(r.messaggio)
        conto.ricarica()
    }

    async function gestisciArchivio(a) {
        setErrore('')
        setAvviso('')
        const r = await gestisciAbbonamento(a.stato === 'disdetto' ? 'riattiva' : 'disdici', a.id)
        if (!r.ok) { setErrore(r.error ?? tc('errore_generico')); return }
        setAvviso(r.messaggio)
        conto.ricarica()
    }

    const vai = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    return (
        <div className="space-y-6 max-w-5xl">

            {/* Header */}
            <div>
                <p className="section-label mb-2">{t('header.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia">{tc('titolo_pagina')}</h1>
            </div>

            {/* Banner successo */}
            {isSuccess && (
                <div className="flex items-center gap-3 p-4 bg-salvia/10 border border-salvia/25">
                    <CheckCircle size={18} className="text-salvia shrink-0" />
                    <p className="font-body text-sm font-medium text-salvia">{t('successo.messaggio')}</p>
                </div>
            )}

            <RiquadroConto
                conto={conto}
                prezzoDa={piani[0]?.prezzo}
                onAggiungiCrediti={() => vai('crediti')}
                onAggiungiArchivio={() => vai('archivio-in-piu')}
                onAbbonamento={() => vai('abbonamenti')}
                onGestisci={() => setGestisciAperta(true)}
            />

            {/* Prima dei prodotti: dati di fatturazione e codice sconto */}
            <AvvisoDatiFatturazione profile={profile} />

            <CodiceSconto sconto={sconto} className="bg-slate border border-white/5 p-4" />

            {/* Errore e avvisi */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}
            {avviso && (
                <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/10 border border-salvia/25">
                    <CheckCircle size={14} /> {avviso}
                </div>
            )}

            {piani.length > 0 && (
                <SezionePiani
                    piani={piani}
                    conto={conto}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    onCambia={passaA}
                    paga={consenso.pulsante}
                    sconto={sconto}
                    PrezzoScontato={PrezzoScontato}
                />
            )}

            <SezioneArchivioInPiu
                prodotti={archivioMensile}
                conto={conto}
                acquistando={acquistando}
                onAcquista={acquista}
                onGestisciUno={gestisciArchivio}
                paga={consenso.pulsante}
                sconto={sconto}
                PrezzoScontato={PrezzoScontato}
            />

            <div id="crediti" className="space-y-3 scroll-mt-24">
                <p className="section-label">{tc('sez_crediti')}</p>
                <SezioneCrediti
                    pacchetti={pacchettiCrediti}
                    loading={loadingProdotti}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    sconto={sconto}
                    paga={consenso.pulsante}
                />
            </div>

            {/* La frase sul recesso accompagna i pulsanti «Paga e attiva subito»: in piccolo, sotto gli acquisti
                (28-10-2026, deciso da Antonino: prima stava in mezzo alla pagina) */}
            <div id="consenso-recesso">
                <ConsensoRecesso consenso={consenso} />
            </div>

            {/* Piani per lo studio (solo se verificato) */}
            {isApproved && abbonamenti.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">{tc('sez_studio')}</p>
                    <SezioneAbbonamenti
                        piani={abbonamenti}
                        loading={loadingProdotti}
                        acquistando={acquistando}
                        onAcquista={acquista}
                        piano_attivo={false}
                        sconto={sconto}
                        paga={consenso.pulsante}
                    />
                </div>
            )}
            {isApproved && haPianoStudio && seatAddon.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">{tc('sez_posti')}</p>
                    <SezioneSeat
                        seats={seatAddon}
                        loading={loadingProdotti}
                        acquistando={acquistando}
                        onAcquista={acquista}
                        posti_acquistati={profile?.posti_acquistati}
                        posti_usati={profile?.posti_usati}
                        sconto={sconto}
                        paga={consenso.pulsante}
                    />
                </div>
            )}

            {/* CTA verifica — varia in base allo stato */}
            {!isApproved && (() => {
                const stato = profile?.verification_status
                if (stato === 'pending') {
                    return (
                        <div className="bg-slate border border-amber-500/20 p-6 flex items-start gap-3">
                            <Shield size={18} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-amber-400 mb-1">{t('verifica.pending_titolo')}</p>
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-3">
                                    {t('verifica.pending_testo')}
                                </p>
                                <Link to="/verifica/stato" className="font-body text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5">
                                    {t('verifica.pending_link')} <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    )
                }
                if (stato === 'rejected') {
                    return (
                        <div className="bg-slate border border-red-500/20 p-6 flex items-start gap-3">
                            <Shield size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-red-400 mb-1">{t('verifica.rejected_titolo')}</p>
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-3">
                                    {profile?.verification_note
                                        ? t('verifica.rejected_motivo', { nota: profile.verification_note })
                                        : t('verifica.rejected_default')}
                                </p>
                                <Link to="/verifica" className="font-body text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5">
                                    {t('verifica.rejected_link')} <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    )
                }
                return (
                    <div className="bg-slate border border-oro/20 p-6">
                        <div className="flex items-start gap-3">
                            <Shield size={18} className="text-oro shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-nebbia mb-1">{t('verifica.cta_titolo')}</p>
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-3">
                                    {t('verifica.cta_testo')}
                                </p>
                                <Link to="/verifica" className="btn-primary text-xs">
                                    {t('verifica.cta_link')} <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Footer trust */}
            <p className="font-body text-xs text-nebbia/20 text-center pt-4">
                {t('footer.trust')}
            </p>

            <FinestraGestisci
                conto={conto}
                aperta={gestisciAperta}
                onChiudi={() => setGestisciAperta(false)}
                onFatto={() => conto.ricarica()}
                onScegliPiano={() => { setGestisciAperta(false); vai('abbonamenti') }}
            />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE PACCHETTI CREDITI
// ═══════════════════════════════════════════════════════════════
function SezioneCrediti({ pacchetti, loading, acquistando, onAcquista, sconto, paga }) {
    const { t } = useTranslation('user_acquista')

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-salvia" />
        </div>
    )

    if (pacchetti.length === 0) return (
        <div className="bg-slate border border-white/5 p-10 text-center">
            <p className="font-body text-sm text-nebbia/30">{t('crediti.vuoto')}</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pacchetti.map(p => {
                const isLoading = acquistando === p.id
                const prezzoPerCredito = p.crediti_ai_mensili > 0 ? (p.prezzo / p.crediti_ai_mensili).toFixed(2) : '—'
                return (
                    <div key={p.id} className="bg-slate border border-white/5 hover:border-salvia/30 p-5 flex flex-col transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} className="text-salvia" />
                            <p className="font-body text-sm font-medium text-nebbia">{p.nome}</p>
                        </div>
                        <p className="font-display text-3xl font-light text-salvia mt-2"><PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} /></p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {t('crediti.dettaglio', { crediti: p.crediti_ai_mensili, prezzo: prezzoPerCredito })}
                        </p>
                        <p className="font-body text-[10px] text-nebbia/30 mt-3 italic flex-1">{t('crediti.non_scadono')}</p>
                        <button
                            onClick={() => onAcquista(p.id)}
                            disabled={isLoading}
                            className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                        >
                            {isLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <>{paga(t('crediti.acquista'))} <ArrowRight size={12} /></>
                            }
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE ABBONAMENTI
// ═══════════════════════════════════════════════════════════════
function SezioneAbbonamenti({ piani, loading, acquistando, onAcquista, piano_attivo, sconto, paga }) {
    const { t, i18n } = useTranslation('user_acquista')
    // Voci della scheda dai dati del prodotto (lib/vociPiano), testi in comp_voci_piano
    const { t: tv } = useTranslation('comp_voci_piano')
    const locale = DATE_LOCALES[i18n.language] ?? 'it-CH'

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-oro" />
        </div>
    )

    if (piani.length === 0) return (
        <div className="bg-slate border border-white/5 p-10 text-center">
            <p className="font-body text-sm text-nebbia/30">{t('abbonamenti.vuoto')}</p>
        </div>
    )

    return (
        <>
            {piano_attivo && (
                <div className="flex items-center gap-2 p-3 bg-salvia/5 border border-salvia/15 mb-4">
                    <CheckCircle size={13} className="text-salvia" />
                    <p className="font-body text-xs text-salvia/80">
                        {t('abbonamenti.piano_attivo')}
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {piani.map(p => {
                    const isLoading = acquistando === p.id
                    const periodo = periodoPrezzo(p, tv)
                    return (
                        <div key={p.id} className="bg-slate border border-white/5 hover:border-oro/30 transition-colors p-6 flex flex-col">
                            <h3 className="font-display text-xl font-semibold text-nebbia mb-2">{p.nome}</h3>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                <span className="font-body text-[10px] px-2 py-0.5 border border-oro/30 text-oro">{etichettaDurata(p, tv)}</span>
                            </div>

                            <p className="font-display text-4xl font-light text-oro mb-4">
                                <PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} />
                                {periodo && <span className="font-body text-sm text-nebbia/40 ml-2">{periodo}</span>}
                            </p>

                            <ul className="space-y-2 mb-5 flex-1">
                                {vociPiano(p, tv, locale).map(feat => (
                                    <li key={feat} className="flex items-start gap-2 font-body text-xs text-nebbia/60">
                                        <CheckCircle size={11} className="text-salvia shrink-0 mt-0.5" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => onAcquista(p.id)}
                                disabled={isLoading}
                                className="w-full justify-center text-sm flex items-center gap-2 py-2.5 font-body disabled:opacity-40 bg-oro text-petrolio hover:bg-oro/90 transition-colors"
                            >
                                {isLoading
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <>{paga(t('abbonamenti.acquista'))} <ArrowRight size={12} /></>
                                }
                            </button>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE SEAT ADDON (avvocati con piano studio)
// ═══════════════════════════════════════════════════════════════
function SezioneSeat({ seats, loading, acquistando, onAcquista, posti_acquistati, posti_usati, sconto, paga }) {
    const { t } = useTranslation('user_acquista')

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-oro" />
        </div>
    )

    return (
        <>
            <div className="bg-slate border border-white/5 p-4 mb-4">
                <p className="font-body text-xs text-nebbia/50 mb-1">{t('seat.posti_studio')}</p>
                <p className="font-body text-base text-nebbia">
                    <span className="text-oro font-semibold">{posti_usati ?? 1}</span>
                    <span className="text-nebbia/40">{t('seat.di')}</span>
                    <span className="text-oro font-semibold">{posti_acquistati ?? 1}</span>
                    <span className="text-nebbia/40">{t('seat.posti_utilizzati')}</span>
                </p>
            </div>

            {seats.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <p className="font-body text-sm text-nebbia/30">{t('seat.vuoto')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {seats.map(s => {
                        const isLoading = acquistando === s.id
                        return (
                            <div key={s.id} className="bg-slate border border-white/5 hover:border-oro/30 p-5 flex flex-col transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard size={13} className="text-oro" />
                                    <p className="font-body text-sm font-medium text-nebbia">{s.nome}</p>
                                </div>
                                <p className="font-display text-3xl font-light text-oro mt-2 flex-1"><PrezzoScontato prezzo={s.prezzo} scontato={sconto.prezzo(s.id, s.prezzo)} /></p>
                                <button
                                    onClick={() => onAcquista(s.id)}
                                    disabled={isLoading}
                                    className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {isLoading
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <>{paga(t('seat.acquista'))} <ArrowRight size={12} /></>
                                    }
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </>
    )
}