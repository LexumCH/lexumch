// src/pages/avvocato/BancaDati.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Banca dati svizzera — SCHELETRO (step 1/N)
//
// Struttura:
//   1. Chat Lex in alto (ricerca semantica AI, chiama il Lead CH via SSE)
//   2. Cinque tab corpus sotto:
//        Federale · Cantonale · Giurisprudenza · Prassi · UE
//      In questo step i tab sono PLACEHOLDER: li riempiamo uno alla volta,
//      ognuno legge la propria materialized view dei conteggi.
//
// Costanti di config in cima (endpoint Lead, lingue) per ritocchi rapidi.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseUrl } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared'
import BottoniSalvataggio from '@/components/BottoniSalvataggio'
import AggiungiAPratica from '@/components/AggiungiAPratica'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import { FONTI_FEDERALI_ORDER, SET_FEDERALI, parseCantonale, labelFonteFederale, labelCamera } from '@/lib/istituzioni'
import {
    Search, Sparkles, ChevronRight, ChevronLeft,
    BookOpen, AlertCircle, X, FileText,
    Landmark, Building2, ScrollText, Globe, Scale, MapPin
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const LEAD_ENDPOINT = 'lex-lead'

// Le "fasi" emesse dal Lead CH via SSE → etichette leggibili.
// Allineate ai 5 subagent svizzeri + fasi di orchestrazione.
// Le chiavi (codici fase) restano costanti; le etichette sono tradotte via i18n.
const FASI_KEYS = [
    'analisi', 'instradamento', 'norme_federali', 'norme_cantonali',
    'giurisprudenza', 'prassi', 'eu', 'sintesi',
]

// ═══════════════════════════════════════════════════════════════
// HOOK CREDITI  (identico all'IT: stessa tabella crediti_ai)
// ═══════════════════════════════════════════════════════════════
function useCreditiAI() {
    const [crediti, setCrediti] = useState(null)

    async function caricaCrediti() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('crediti_ai')
            .select('crediti_totali, crediti_usati, periodo_fine, tipo')
            .eq('user_id', user.id)

        if (!data || data.length === 0) { setCrediti(0); return }

        const now = new Date()
        const totale = data.reduce((acc, row) => {
            const residui = row.crediti_totali - row.crediti_usati
            const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
            return acc + (residui > 0 && !scaduto ? residui : 0)
        }, 0)
        setCrediti(totale)
    }

    useEffect(() => {
        caricaCrediti()
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    return { crediti, setCrediti, refreshCrediti: caricaCrediti }
}

// ═══════════════════════════════════════════════════════════════
// LEX ANIMAZIONE — libri + raggio, frasi rotative (ricerca legale CH)
// Identica a ChatPratica; le frasi default raccontano la consultazione
// del corpus svizzero. Se arriva una fase reale dal Lead, usala come frase.
// ═══════════════════════════════════════════════════════════════
function LexAnimazione({ frasi }) {
    const { t } = useTranslation('avv_banca_dati')
    const toArray = (v) => Array.isArray(v) ? v : []
    const frasiRotative = frasi ?? toArray(t('lex.frasi_animazione', { returnObjects: true }))

    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [frasiRotative.length])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
                .lex-stage { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage svg { width: 100%; height: 100%; display: block; }
                .lex-ray { animation: lexRayCycle 27s ease-in-out infinite; }
                @keyframes lexRayCycle {
                    0% { transform: translateX(-30px); opacity: 0; }
                    3% { opacity: 0.8; }
                    8% { transform: translateX(85px); opacity: 0.9; }
                    12% { transform: translateX(85px); opacity: 1; }
                    16% { transform: translateX(85px); opacity: 0; }
                    33% { transform: translateX(85px); opacity: 0; }
                    34% { transform: translateX(-30px); opacity: 0; }
                    37% { opacity: 0.8; }
                    42% { transform: translateX(180px); opacity: 0.9; }
                    46% { transform: translateX(180px); opacity: 1; }
                    50% { transform: translateX(180px); opacity: 0; }
                    66% { transform: translateX(180px); opacity: 0; }
                    67% { transform: translateX(-30px); opacity: 0; }
                    70% { opacity: 0.8; }
                    78% { transform: translateX(290px); opacity: 0.9; }
                    82% { transform: translateX(290px); opacity: 1; }
                    86% { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }
                .lex-book-a { animation: lexBookGlowA 27s ease-in-out infinite; }
                @keyframes lexBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-b { animation: lexBookGlowB 27s ease-in-out infinite; }
                @keyframes lexBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-c { animation: lexBookGlowC 27s ease-in-out infinite; }
                @keyframes lexBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-fade-text { animation: lexFadeIn 0.6s ease-out; }
                @keyframes lexFadeIn {
                    0% { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .lex-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #C9A45C; opacity: 0.4;
                    animation: lexDotPulse 1.4s ease-in-out infinite;
                }
                .lex-dot:nth-child(1) { animation-delay: 0s; }
                .lex-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>{t('lex.title_consultazione')}</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />

                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-dots-container">
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CHAT LEX — ricerca semantica AI (streaming SSE dal Lead CH)
// Derivata dalla RicercaAI dell'IT. Differenze:
//   - endpoint via LEAD_ENDPOINT
//   - FASI_LABEL svizzere
//   - niente blocco sentenze_marketplace (non esiste su CH)
// ═══════════════════════════════════════════════════════════════
function ChatLex({ crediti, setCrediti, messaggi, onAggiornaMessaggi }) {
    const { t } = useTranslation('avv_banca_dati')
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [conversazione, setConversazione] = useState([])
    const [faseCorrente, setFaseCorrente] = useState(null)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [clientConversationId, setClientConversationId] = useState(() => crypto.randomUUID())
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)
    const abortControllerRef = useRef(null)

    async function cerca(domandaInput, opzioni = {}) {
        const domandaCorrente = domandaInput ?? domanda
        if (!domandaCorrente.trim()) return
        if (crediti !== null && crediti <= 0) { setErrore('crediti_esauriti'); return }

        if (!opzioni.tipoRichiesta || opzioni.tipoRichiesta === 'query_iniziale') setDomanda('')
        setCercando(true); setErrore(null); setFaseCorrente(null); setStreamingTesto('')

        const nuovaConv = [...conversazione, { role: 'user', content: domandaCorrente }]
        setConversazione(nuovaConv)
        abortControllerRef.current = new AbortController()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${supabaseUrl}/functions/v1/${LEAD_ENDPOINT}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        domanda: domandaCorrente,
                        messaggi: messaggi ?? [],
                        tipo_richiesta: opzioni.tipoRichiesta ?? 'query_iniziale',
                        subagent_target: opzioni.subagentTarget,
                        filtro_approfondimento: opzioni.filtroApprofondimento,
                        client_conversation_id: clientConversationId,
                    }),
                    signal: abortControllerRef.current.signal,
                }
            )

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({ error: t('lex.errore_sconosciuto') }))
                setErrore(errBody.crediti_esauriti ? 'crediti_esauriti' : (errBody.error ?? t('lex.errore_http', { status: res.status })))
                setConversazione(conversazione)
                setCercando(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''
            let metaFinale = null
            let tipoRisposta = null

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                let eventoCorrente = null
                for (const line of lines) {
                    if (!line.trim()) continue
                    if (line.startsWith('event: ')) { eventoCorrente = line.slice(7).trim(); continue }
                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        try {
                            const data = JSON.parse(payload)
                            if (eventoCorrente === 'fase') {
                                setFaseCorrente(
                                    (data.fase === 'rigetto' || data.fase === 'no_copertura') ? null : data.fase
                                )
                            }
                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                                if (faseCorrente !== null) setFaseCorrente(null)
                            }
                            if (eventoCorrente === 'done') {
                                metaFinale = data.meta
                                tipoRisposta = data.tipo_risposta
                                if (data.crediti_rimasti !== undefined) setCrediti(data.crediti_rimasti)
                            }
                            if (eventoCorrente === 'error') setErrore(data.error ?? t('lex.errore_streaming'))
                        } catch { /* ignore */ }
                    }
                }
            }

            const convFinale = [...nuovaConv, {
                role: 'assistant', content: testoAccumulato, meta: metaFinale, tipo_risposta: tipoRisposta,
            }]
            setConversazione(convFinale)
            setStreamingTesto('')

            if (onAggiornaMessaggi) onAggiornaMessaggi([
                ...(messaggi ?? []),
                { role: 'user', content: domandaCorrente },
                { role: 'assistant', content: testoAccumulato },
            ])
        } catch (e) {
            if (e.name !== 'AbortError') setErrore(e.message)
            setConversazione(conversazione)
        } finally {
            setCercando(false); setFaseCorrente(null); abortControllerRef.current = null
        }
    }

    function nuovaSessione() {
        if (abortControllerRef.current) abortControllerRef.current.abort()
        setConversazione([]); setStreamingTesto(''); setFaseCorrente(null)
        setClientConversationId(crypto.randomUUID())
        if (onAggiornaMessaggi) onAggiornaMessaggi([])
    }

    function approfondisci(filtro_key, label, subagent_source) {
        cerca(t('lex.approfondisci_prefix', { label }), {
            tipoRichiesta: 'approfondimento',
            subagentTarget: subagent_source,
            filtroApprofondimento: filtro_key,
        })
    }

    const markdownComponents = {
        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
        em: ({ children }) => <em className="italic text-nebbia/80">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/70 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/70 my-2">{children}</ol>,
        li: ({ children }) => <li className="font-body text-sm">{children}</li>,
        p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed">{children}</p>,
        hr: () => <hr className="my-4 border-white/10" />,
        a: ({ href, children }) => {
            if (!href) return <span>{children}</span>
            const isAreaUtente = window.location.pathname.startsWith('/area')
            const prefix = isAreaUtente ? '/area' : '/banca-dati'
            const finalHref = href.startsWith('/banca-dati/') ? href.replace('/banca-dati/', `${prefix}/`) : href
            return (
                <a href={finalHref} target="_blank" rel="noopener noreferrer"
                    className="text-oro hover:text-oro/80 underline decoration-oro/30 hover:decoration-oro transition-colors">
                    {children}
                </a>
            )
        },
    }

    return (
        <div className="bg-slate border border-white/5">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-salvia" />
                    <p className="font-body text-sm font-medium text-nebbia">{t('lex.titolo')}</p>
                    {conversazione.length > 0 && (
                        <span className="font-body text-xs text-salvia/60 border border-salvia/20 px-2 py-0.5">
                            {t('lex.scambi', { count: Math.floor(conversazione.length / 2) })}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {crediti !== null && <span className="font-body text-xs text-nebbia/30">{t('lex.crediti', { count: crediti })}</span>}
                    {conversazione.length > 0 && (
                        <button onClick={nuovaSessione} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors">
                            {t('lex.nuova_sessione')}
                        </button>
                    )}
                </div>
            </div>

            {conversazione.length > 0 && (
                <div className="px-5 py-4 space-y-5">
                    {conversazione.map((m, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                    {m.role === 'user' ? t('lex.ruolo_tu') : t('lex.ruolo_lex')}
                                </span>
                                {m.tipo_risposta === 'rigettata' && (
                                    <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">{t('lex.badge_non_interpretata')}</span>
                                )}
                                {m.tipo_risposta === 'messaggio_standard' && (
                                    <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">{t('lex.badge_nessun_risultato')}</span>
                                )}
                            </div>

                            {m.role === 'user' ? (
                                <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                    <ReactMarkdown components={markdownComponents}>{m.content}</ReactMarkdown>

                                    {m.meta?.approfondimenti_disponibili?.length > 0 && (
                                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={12} className="text-salvia" />
                                                <p className="font-body text-xs font-medium text-salvia uppercase tracking-widest">{t('lex.approfondimenti_suggeriti')}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {m.meta.approfondimenti_disponibili.map((a, idx) => (
                                                    <button key={idx}
                                                        onClick={() => approfondisci(a.filtro_key, a.label, a.subagent_source)}
                                                        disabled={cercando}
                                                        className="text-left bg-petrolio border border-salvia/15 hover:border-salvia/40 p-3 transition-colors disabled:opacity-40 group">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className="font-body text-xs font-medium text-nebbia/80 group-hover:text-salvia transition-colors leading-snug">{a.label}</p>
                                                            <span className="font-body text-[10px] text-salvia/60 shrink-0 mt-0.5">{a.conteggio}</span>
                                                        </div>
                                                        {a.teaser && <p className="font-body text-[11px] text-nebbia/40 line-clamp-2 leading-relaxed">{a.teaser}</p>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {cercando && (
                        <div className="space-y-3">
                            <span className="font-body text-xs font-medium text-salvia/70">{t('lex.ruolo_lex')}</span>
                            {streamingTesto.length === 0 ? (
                                <LexAnimazione
                                    frasi={faseCorrente ? [FASI_KEYS.includes(faseCorrente) ? t(`lex.fasi.${faseCorrente}`) : faseCorrente] : undefined}
                                />
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                    <ReactMarkdown components={markdownComponents}>{streamingTesto}</ReactMarkdown>
                                    <span className="inline-block w-1 h-4 bg-oro/60 align-middle animate-pulse ml-0.5" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Salvataggio della conversazione Lex in pratica + etichetta (tipo ricerca_ai, come IT) */}
            {conversazione.length >= 2 && !cercando && (
                <div className="px-5 pb-3 flex flex-wrap gap-2 [&>div>button]:h-[38px]">
                    <AggiungiAPratica
                        ricerca={{
                            tipo: 'ricerca_ai',
                            domanda: conversazione[0]?.content ?? '',
                            risposta: conversazione.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n'),
                        }}
                        ricercaSalvataId={ricercaSalvataId}
                        setRicercaSalvataId={setRicercaSalvataId}
                    />
                    <AggiungiAEtichetta
                        elemento={{ tipo: 'ricerca_ai' }}
                        domanda={conversazione[0]?.content ?? ''}
                        risposta={conversazione.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n')}
                        ricercaIdEsterno={ricercaSalvataId}
                        onRicercaCreata={setRicercaSalvataId}
                    />
                </div>
            )}

            <div className="px-5 py-4 space-y-3 border-t border-white/5">
                {conversazione.length === 0 && (
                    <p className="font-body text-xs text-nebbia/30">
                        {t('lex.suggerimento_cantone')}
                    </p>
                )}
                <textarea
                    rows={3}
                    placeholder={conversazione.length > 0 ? t('lex.placeholder_continua') : t('lex.placeholder_iniziale')}
                    value={domanda}
                    onChange={e => setDomanda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) cerca() }}
                    disabled={cercando}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                />

                {errore && errore !== 'crediti_esauriti' && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={11} />{errore}</p>
                )}
                {errore === 'crediti_esauriti' && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={13} className="text-oro shrink-0" />
                            <p className="font-body text-xs text-nebbia/60">{t('lex.crediti_esauriti')}</p>
                        </div>
                        <a href="/studio?tab=acquista" target="_blank" rel="noopener noreferrer"
                            className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap">
                            {t('lex.acquista_crediti')}
                        </a>
                    </div>
                )}

                <button onClick={() => cerca()} disabled={cercando || !domanda.trim()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40">
                    {cercando
                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> {t('lex.lavorando')}</>
                        : <><Sparkles size={13} /> {conversazione.length > 0 ? t('lex.continua') : t('lex.cerca')}</>}
                </button>
            </div>
        </div>
    )
}


// ═══════════════════════════════════════════════════════════════
// DEFINIZIONE TAB CORPUS
// ═══════════════════════════════════════════════════════════════
const TABS = [
    { key: 'federale', icon: Landmark },
    { key: 'cantonale', icon: MapPin },
    { key: 'giurisprudenza', icon: Scale },
    { key: 'ue', icon: Globe },
]

// Tipi di atto CEDU per il filtro della sezione "Corte EDU" (dentro la tab UE)
const TIPI_CEDU = ['sentenza_cedu', 'decisione_cedu', 'grande_camera', 'parere_cedu', 'altro_cedu']

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export function BancaDati() {
    const { t } = useTranslation('avv_banca_dati')
    const { crediti, setCrediti } = useCreditiAI()
    const [messaggiConversazione, setMessaggiConversazione] = useState([])
    const [tabAttivo, setTabAttivo] = useState('federale')

    return (
        <div className="space-y-5 pb-24">
            <PageHeader
                label={t('header.label')}
                title={t('header.title')}
                subtitle={t('header.subtitle')}
            />

            {/* Chat Lex — sempre in alto, cross-fonte */}
            <ChatLex
                crediti={crediti}
                setCrediti={setCrediti}
                messaggi={messaggiConversazione}
                onAggiornaMessaggi={setMessaggiConversazione}
            />

            {/* Tab corpus */}
            <div className="!mt-10 pt-6 border-t border-white/5 space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <p className="section-label !m-0">{t('tabs.sfoglia')}</p>
                    <div className="flex gap-1 bg-slate border border-white/5 p-1 flex-wrap">
                        {TABS.map(tab => {
                            const Icon = tab.icon
                            return (
                                <button key={tab.key} onClick={() => setTabAttivo(tab.key)}
                                    className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${tabAttivo === tab.key ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                                    <Icon size={12} /> {t(`tabs.${tab.key}`)}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {tabAttivo === 'federale' && <TabFederale />}
                {tabAttivo === 'cantonale' && <TabCantonale />}
                {tabAttivo === 'giurisprudenza' && <TabGiurisprudenza />}
                {tabAttivo === 'ue' && <TabUE />}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB FEDERALE (Fedlex) v3  —  blocco 2/N di BancaDati.jsx (CH)
//
// NOVITÀ v3:
//   - SELETTORE LINGUA GLOBALE in cima al tab (IT · DE · FR), default = lingua
//     piattaforma. Governa lista atti + articoli in modo coerente.
//   - TITOLO LISTA da `titolo` (lungo): esiste al 100% in it/de/fr, quindi
//     scegliendo FR si vede tutto in francese senza buchi. `titolo_short`
//     (sigla, presente solo ~20% degli atti) mostrato come complemento.
//   - FALLBACK + BADGE: se un atto/articolo non esiste nella lingua scelta,
//     viene mostrato comunque ripiegando sulla prima lingua disponibile, con
//     badge che indica la lingua reale (opzione A). Sul federale è raro;
//     serve sul cantonale (atto TI solo in italiano, ecc.).
//   - DEDUPLICA anti-fantasma: abrogato=false AND testo non vuoto.
//
// Sostituzione in BancaDati: {tabAttivo === 'federale' && <TabFederale />}
// Icone richieste (già in cima al file): Search, ChevronRight, ChevronLeft, X.
// ═══════════════════════════════════════════════════════════════

// Lingua piattaforma. Isolata: quando caberai l'i18n, sostituisci il corpo.
function linguaPiattaforma() {
    try {
        const ls = localStorage.getItem('i18nextLng') || localStorage.getItem('lingua')
        if (ls) {
            const base = ls.slice(0, 2).toLowerCase()
            if (['it', 'de', 'fr'].includes(base)) return base
        }
    } catch { /* ignore */ }
    return 'it'
}

const LINGUE_LABEL = { it: 'IT', de: 'DE', fr: 'FR', en: 'EN', rm: 'RM' }
const ORDINE_LINGUE = ['it', 'de', 'fr', 'en', 'rm']
const LINGUE_SELETTORE = ['it', 'de', 'fr']   // selettore globale: lingue ufficiali

// Risolve un jsonb multilingua nella lingua scelta; se assente, ripiega in
// ordine e ritorna ANCHE la lingua effettivamente usata (per il badge).
function risolviMultilingua(campoJsonb, linguaScelta) {
    if (!campoJsonb || typeof campoJsonb !== 'object') return { testo: null, lingua: null }
    if (linguaScelta && campoJsonb[linguaScelta]) return { testo: campoJsonb[linguaScelta], lingua: linguaScelta }
    for (const k of ORDINE_LINGUE) {
        if (campoJsonb[k]) return { testo: campoJsonb[k], lingua: k }
    }
    return { testo: null, lingua: null }
}

// Ordine dei tipi atto federali (le label sono tradotte via i18n: federale.tipo_atto.*)
const ORDINE_TIPO_ATTO_FED = [
    'legge_federale', 'ordinanza', 'costituzione', 'decreto',
    'regolamento', 'trattato', 'altro',
]

const PER_PAGINA_ATTI_FED = 50
const PER_PAGINA_ART_FED = 50

function TabFederale() {
    const { t, i18n } = useTranslation('avv_banca_dati')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const navigate = useNavigate()
    const tipoAttoLabel = (k) => ORDINE_TIPO_ATTO_FED.includes(k) ? t(`federale.tipo_atto.${k}`) : k

    const [vista, setVista] = useState('catalogo')

    // Lingua GLOBALE del tab (governa lista + articoli)
    const [lingua, setLingua] = useState(linguaPiattaforma())

    // L1 — catalogo
    const [conteggi, setConteggi] = useState([])
    const [loadingConteggi, setLoadingConteggi] = useState(true)

    // L2 — lista atti
    const [tipoSel, setTipoSel] = useState(null)
    const [atti, setAtti] = useState([])
    const [totaleAtti, setTotaleAtti] = useState(0)
    const [loadingAtti, setLoadingAtti] = useState(false)
    const [paginaAtti, setPaginaAtti] = useState(0)
    const [inputAtti, setInputAtti] = useState('')
    const [cercaAtti, setCercaAtti] = useState('')

    // L3 — articoli
    const [attoSel, setAttoSel] = useState(null)
    const [lingueAtto, setLingueAtto] = useState([])
    const [linguaArt, setLinguaArt] = useState(null)   // lingua effettiva articoli (può ripiegare)
    const [articoli, setArticoli] = useState([])
    const [totaleArt, setTotaleArt] = useState(0)
    const [loadingArt, setLoadingArt] = useState(false)
    const [paginaArt, setPaginaArt] = useState(0)
    const [inputArt, setInputArt] = useState('')
    const [cercaArt, setCercaArt] = useState('')
    const [artAperto, setArtAperto] = useState(null)

    // ── L1: conteggi dalla MV (lista tipi + ordine) ──
    useEffect(() => {
        async function carica() {
            setLoadingConteggi(true)
            const { data } = await supabase
                .from('conteggi_norme_federali_ch')
                .select('tipo_atto')
            const ordine = ORDINE_TIPO_ATTO_FED
            const sorted = (data ?? []).sort((a, b) => {
                const ia = ordine.indexOf(a.tipo_atto); const ib = ordine.indexOf(b.tipo_atto)
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
            })
            setConteggi(sorted)
            setLoadingConteggi(false)
        }
        carica()
    }, [])

    // ── L2: lista atti ──
    useEffect(() => {
        if (vista !== 'tipo' || !tipoSel) return
        async function carica() {
            setLoadingAtti(true)
            let q = supabase
                .from('norme_ch')
                .select('id, rs_numero, titolo, titolo_short, tipo_atto, abrogato, lingue_disponibili', { count: 'exact' })
                .eq('tipo_atto', tipoSel)
            if (cercaAtti.trim()) q = q.ilike('rs_numero', `%${cercaAtti}%`)
            q = q.order('rs_numero', { ascending: true, nullsFirst: false })
                .range(paginaAtti * PER_PAGINA_ATTI_FED, (paginaAtti + 1) * PER_PAGINA_ATTI_FED - 1)
            const { data, count } = await q
            setAtti(data ?? [])
            setTotaleAtti(count ?? 0)
            setLoadingAtti(false)
        }
        carica()
    }, [vista, tipoSel, cercaAtti, paginaAtti])

    // ── L3: articoli (filtro lingua effettiva + deduplica anti-fantasma) ──
    useEffect(() => {
        if (vista !== 'atto' || !attoSel || !linguaArt) return
        async function carica() {
            setLoadingArt(true)
            let q = supabase
                .from('norme_ch_articoli')
                .select('id, norma_id, articolo_label, articolo_num, rubrica_articolo, rubrica_completa, parte_titolo, titolo_titolo, capo_titolo, testo, lingua', { count: 'exact' })
                .eq('norma_id', attoSel.id)
                .eq('lingua', linguaArt)
                .eq('abrogato', false)
                .not('testo', 'is', null)
                .neq('testo', '')
            if (cercaArt.trim()) {
                q = q.or(`articolo_label.ilike.%${cercaArt}%,rubrica_articolo.ilike.%${cercaArt}%,testo.ilike.%${cercaArt}%`)
            }
            q = q.order('articolo_num', { ascending: true, nullsFirst: false })
                .range(paginaArt * PER_PAGINA_ART_FED, (paginaArt + 1) * PER_PAGINA_ART_FED - 1)
            const { data, count } = await q
            setArticoli(data ?? [])
            setTotaleArt(count ?? 0)
            setLoadingArt(false)
        }
        carica()
    }, [vista, attoSel, linguaArt, cercaArt, paginaArt])

    // ── navigazione ──
    function apriTipo(tipo) {
        setTipoSel(tipo); setVista('tipo')
        setInputAtti(''); setCercaAtti(''); setPaginaAtti(0)
    }
    function apriAtto(atto) {
        setAttoSel(atto); setVista('atto')
        setInputArt(''); setCercaArt(''); setPaginaArt(0); setArtAperto(null)
        // Lingue disponibili dell'atto, ordinate
        const disp = Array.isArray(atto.lingue_disponibili)
            ? atto.lingue_disponibili.filter(l => ORDINE_LINGUE.includes(l))
                .sort((a, b) => ORDINE_LINGUE.indexOf(a) - ORDINE_LINGUE.indexOf(b))
            : []
        setLingueAtto(disp)
        // Lingua articoli = lingua globale se l'atto la offre, altrimenti ripiega (opzione A)
        setLinguaArt(disp.includes(lingua) ? lingua : (disp[0] ?? lingua))
    }
    function tornaCatalogo() { setVista('catalogo'); setTipoSel(null); setAttoSel(null) }
    function tornaTipo() { setVista('tipo'); setAttoSel(null) }

    // Cambio lingua GLOBALE dal selettore in cima
    function cambiaLinguaGlobale(l) {
        if (l === lingua) return
        setLingua(l)
        // Se sto guardando un atto, riallineo la lingua articoli (con fallback)
        if (vista === 'atto' && lingueAtto.length) {
            setLinguaArt(lingueAtto.includes(l) ? l : lingueAtto[0])
            setPaginaArt(0); setArtAperto(null)
        }
    }
    // Cambio lingua articoli SOLO per l'atto corrente (mini-selettore)
    function cambiaLinguaArt(l) {
        if (l === linguaArt) return
        setLinguaArt(l); setPaginaArt(0); setArtAperto(null)
    }

    function evidenzia(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }
    function collocazione(a) {
        return [a.parte_titolo, a.titolo_titolo, a.capo_titolo].filter(Boolean).join(' › ')
    }

    const pagineArt = Math.ceil(totaleArt / PER_PAGINA_ART_FED)
    const pagineAtti = Math.ceil(totaleAtti / PER_PAGINA_ATTI_FED)

    // Titolo atto risolto nella lingua globale (con lingua effettiva per il badge)
    const attoTit = attoSel ? risolviMultilingua(attoSel.titolo, lingua) : { testo: null, lingua: null }
    const attoSigla = attoSel ? risolviMultilingua(attoSel.titolo_short, lingua).testo : null

    // Selettore lingua globale — componente inline riusato in cima ai vari livelli
    const SelettoreLinguaGlobale = () => (
        <div className="flex items-center gap-2">
            <span className="font-body text-xs text-nebbia/30">{t('comune.lingua')}</span>
            <div className="flex gap-1 bg-slate border border-white/5 p-1">
                {LINGUE_SELETTORE.map(l => (
                    <button key={l} onClick={() => cambiaLinguaGlobale(l)}
                        className={`px-2.5 py-1 font-body text-xs transition-colors ${lingua === l ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                        {LINGUE_LABEL[l]}
                    </button>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-5">

            {/* ═════ L1 — CATALOGO ═════ */}
            {vista === 'catalogo' && (
                <>
                    <div className="flex items-center justify-end">
                        <SelettoreLinguaGlobale />
                    </div>
                    {loadingConteggi ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {conteggi.map(c => (
                                <button key={c.tipo_atto} onClick={() => apriTipo(c.tipo_atto)}
                                    className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors">
                                            {tipoAttoLabel(c.tipo_atto)}
                                        </p>
                                        <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═════ L2 — LISTA ATTI ═════ */}
            {vista === 'tipo' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button onClick={tornaCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                            <ChevronLeft size={13} /> {t('federale.tutti_tipi_atto')}
                        </button>
                        <div className="flex items-center gap-4">
                            <SelettoreLinguaGlobale />
                            <p className="font-display text-xl text-nebbia">{tipoAttoLabel(tipoSel)}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={t('federale.cerca_rs_placeholder')}
                                value={inputAtti}
                                onChange={e => setInputAtti(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setPaginaAtti(0); setCercaAtti(inputAtti) } }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={() => { setPaginaAtti(0); setCercaAtti(inputAtti) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> {t('comune.cerca')}
                        </button>
                        {cercaAtti && (
                            <button onClick={() => { setInputAtti(''); setCercaAtti(''); setPaginaAtti(0) }}
                                className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                <X size={11} /> {t('comune.pulisci')}
                            </button>
                        )}
                    </div>

                    {cercaAtti && <p className="font-body text-xs text-nebbia/30">{t('federale.atti_per', { count: totaleAtti, n: totaleAtti.toLocaleString(dateLocale), q: cercaAtti })}</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('federale.col_rs')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.titolo')}</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingAtti ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : atti.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">{t('federale.nessun_atto')}</p>
                                    </td></tr>
                                ) : atti.map(a => {
                                    const titoloRis = risolviMultilingua(a.titolo, lingua)
                                    const sigla = risolviMultilingua(a.titolo_short, lingua).testo
                                    const fallback = titoloRis.lingua && titoloRis.lingua !== lingua
                                    return (
                                        <tr key={a.id}
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                            onClick={() => apriAtto(a)}>
                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                {a.rs_numero ?? '—'}
                                                {a.abrogato && <span className="ml-2 font-body text-[10px] text-red-400/70 border border-red-400/20 px-1.5 py-0.5 uppercase">{t('federale.badge_abrogato')}</span>}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/70 leading-snug">
                                                <span className="flex items-center gap-2 flex-wrap">
                                                    {sigla && <span className="text-nebbia/40 font-medium">{sigla}</span>}
                                                    <span>{titoloRis.testo ?? t('comune.senza_titolo')}</span>
                                                    {fallback && (
                                                        <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 uppercase">
                                                            {LINGUE_LABEL[titoloRis.lingua]}
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={13} className="text-nebbia/20" />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {pagineAtti > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {t('comune.range_paginazione', { from: paginaAtti * PER_PAGINA_ATTI_FED + 1, to: Math.min((paginaAtti + 1) * PER_PAGINA_ATTI_FED, totaleAtti), total: totaleAtti.toLocaleString(dateLocale) })}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPaginaAtti(p => Math.max(0, p - 1))} disabled={paginaAtti === 0}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                    <button onClick={() => setPaginaAtti(p => Math.min(pagineAtti - 1, p + 1))} disabled={paginaAtti >= pagineAtti - 1}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═════ L3 — ARTICOLI ═════ */}
            {vista === 'atto' && attoSel && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={tornaCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                <ChevronLeft size={13} /> {t('federale.tutti_tipi')}
                            </button>
                            <span className="text-nebbia/20">/</span>
                            <button onClick={tornaTipo} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                {tipoAttoLabel(tipoSel)}
                            </button>
                        </div>
                        <p className="font-display text-lg text-nebbia text-right">
                            {attoSel.rs_numero ? `RS ${attoSel.rs_numero}` : ''}
                        </p>
                    </div>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed -mt-2 flex items-center gap-2 flex-wrap">
                        {attoSigla && <span className="text-nebbia/40 font-medium">{attoSigla}</span>}
                        <span>{attoTit.testo ?? t('comune.senza_titolo')}</span>
                        {attoTit.lingua && attoTit.lingua !== lingua && (
                            <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 uppercase">{LINGUE_LABEL[attoTit.lingua]}</span>
                        )}
                    </p>

                    {/* Mini-selettore lingua dell'atto: salta tra le lingue di QUESTO atto */}
                    {lingueAtto.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs text-nebbia/30">{t('federale.versione')}</span>
                            <div className="flex gap-1 bg-slate border border-white/5 p-1">
                                {lingueAtto.map(l => (
                                    <button key={l} onClick={() => cambiaLinguaArt(l)}
                                        className={`px-2.5 py-1 font-body text-xs transition-colors ${linguaArt === l ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                                        {LINGUE_LABEL[l] ?? l.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {linguaArt && linguaArt !== lingua && (
                                <span className="font-body text-[10px] text-nebbia/30">
                                    {t('federale.non_disponibile_in', { lingua: LINGUE_LABEL[lingua] })}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={t('comune.cerca_articolo_placeholder')}
                                value={inputArt}
                                onChange={e => setInputArt(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setPaginaArt(0); setCercaArt(inputArt) } }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={() => { setPaginaArt(0); setCercaArt(inputArt) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> {t('comune.cerca')}
                        </button>
                        {cercaArt && (
                            <button onClick={() => { setInputArt(''); setCercaArt(''); setPaginaArt(0) }}
                                className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                <X size={11} /> {t('comune.pulisci')}
                            </button>
                        )}
                    </div>

                    {cercaArt && <p className="font-body text-xs text-nebbia/30">{t('comune.risultati_per', { count: totaleArt, n: totaleArt.toLocaleString(dateLocale), q: cercaArt })}</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_articolo')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_rubrica_anteprima')}</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingArt ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : articoli.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">{t('federale.nessun_articolo_lingua')}</p>
                                    </td></tr>
                                ) : articoli.map(n => (
                                    <Fragment key={n.id}>
                                        <tr
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                            onClick={() => setArtAperto(artAperto?.id === n.id ? null : n)}>
                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                {n.articolo_label ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                {n.rubrica_articolo && <p className="font-medium text-nebbia/80 mb-0.5" dangerouslySetInnerHTML={{ __html: evidenzia(n.rubrica_articolo, cercaArt) }} />}
                                                {cercaArt && n.testo && <p className="text-xs text-nebbia/40 line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenzia(n.testo.slice(0, 200), cercaArt) }} />}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${artAperto?.id === n.id ? 'rotate-90' : ''}`} />
                                            </td>
                                        </tr>
                                        {artAperto?.id === n.id && (
                                            <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                <td colSpan={3} className="px-4 py-4">
                                                    {collocazione(n) && (
                                                        <p className="font-body text-[11px] text-nebbia/30 uppercase tracking-wider mb-2">{collocazione(n)}</p>
                                                    )}
                                                    <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: evidenzia(n.testo ?? t('comune.testo_non_disponibile'), cercaArt) }} />
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <BottoniSalvataggio
                                                            tipo="norma_federale"
                                                            id={n.id}
                                                            titolo={[n.articolo_label, n.rubrica_articolo].filter(Boolean).join(' — ')}
                                                            testo={n.testo}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                                                                navigate(`${prefix}/norma-federale/${n.id}`)
                                                            }}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto">
                                                            {t('comune.apri_pagina_dedicata')} <ChevronRight size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                        {pagineArt > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {t('comune.range_paginazione', { from: paginaArt * PER_PAGINA_ART_FED + 1, to: Math.min((paginaArt + 1) * PER_PAGINA_ART_FED, totaleArt), total: totaleArt.toLocaleString(dateLocale) })}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPaginaArt(p => Math.max(0, p - 1))} disabled={paginaArt === 0}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                    <button onClick={() => setPaginaArt(p => Math.min(pagineArt - 1, p + 1))} disabled={paginaArt >= pagineArt - 1}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB CANTONALE  —  blocco 3/N di BancaDati.jsx (CH)
//
// Navigazione 3 livelli:
//   L1 catalogo  → 26 cantoni come quadrati (sigla al centro), ordine alfabetico
//   L2 lista leggi → norme_cantonali_ch del cantone, paginata + ricerca
//   L3 articoli  → norme_cantonali_ch_articoli per norma_id, paginata + ricerca
//
// Schema reale (≠ federale):
//   leggi:    title, title_by_lang(jsonb), abbreviation, is_active,
//             lingue_disponibili(text[]), systematic_number, materia_macro_lbl
//   articoli: article_num, article_num_int, article_suffix, rubrica,
//             testo, gerarchia(jsonb), is_abrogato, lingua
//
// Lingue: selettore SOLO per i 4 bilingui (BE/FR/VS de+fr, GR de+it).
//   Monolingui (altri 22) → niente selettore, solo badge lingua.
// Niente deduplica anti-fantasma: sul cantonale non ci sono righe vuote
//   (verificato). Escludo solo is_abrogato=true (pochi).
//
// Sostituzione in BancaDati: {tabAttivo === 'cantonale' && <TabCantonale />}
// Icone richieste (già in cima al file): Search, ChevronRight, ChevronLeft, X.
// ═══════════════════════════════════════════════════════════════

const LINGUE_LABEL_CANT = { it: 'IT', de: 'DE', fr: 'FR' }
const ORDINE_LINGUE_CANT = ['it', 'de', 'fr']

// Lingue per cantone (dai dati reali). Bilingui: BE/FR/VS de+fr, GR de+it.
// Tutti gli altri monolingui. Serve perché la MV conteggi non porta le lingue.
const LINGUE_CANTONE = {
    AG: ['de'], AI: ['de'], AR: ['de'], BE: ['de', 'fr'], BL: ['de'],
    BS: ['de'], FR: ['de', 'fr'], GE: ['fr'], GL: ['de'], GR: ['de', 'it'],
    JU: ['fr'], LU: ['de'], NE: ['fr'], NW: ['de'], OW: ['de'],
    SG: ['de'], SH: ['de'], SO: ['de'], SZ: ['de'], TG: ['de'],
    TI: ['it'], UR: ['de'], VD: ['fr'], VS: ['de', 'fr'], ZG: ['de'], ZH: ['de'],
}

// Risolve title_by_lang (jsonb) nella lingua scelta; fallback ordinato.
// Ritorna anche la lingua effettiva (per il badge).
function risolviTitoloCant(byLang, fallbackPlain, linguaScelta) {
    if (byLang && typeof byLang === 'object') {
        if (linguaScelta && byLang[linguaScelta]) return { testo: byLang[linguaScelta], lingua: linguaScelta }
        for (const k of ORDINE_LINGUE_CANT) {
            if (byLang[k]) return { testo: byLang[k], lingua: k }
        }
    }
    // fallback sul campo title semplice
    return { testo: fallbackPlain ?? null, lingua: null }
}

const PER_PAGINA_LEGGI = 50
const PER_PAGINA_ART_CANT = 50

function TabCantonale() {
    const { t, i18n } = useTranslation('avv_banca_dati')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const navigate = useNavigate()

    const [vista, setVista] = useState('catalogo')

    // L1 — catalogo cantoni
    const [cantoni, setCantoni] = useState([])      // [{canton, n_leggi, lingue:[]}]
    const [loadingCantoni, setLoadingCantoni] = useState(true)

    // L2 — lista leggi
    const [cantoneSel, setCantoneSel] = useState(null)   // {canton, lingue:[]}
    const [lingua, setLingua] = useState('it')           // lingua attiva (per bilingui)
    const [leggi, setLeggi] = useState([])
    const [totaleLeggi, setTotaleLeggi] = useState(0)
    const [loadingLeggi, setLoadingLeggi] = useState(false)
    const [paginaLeggi, setPaginaLeggi] = useState(0)
    const [inputLeggi, setInputLeggi] = useState('')
    const [cercaLeggi, setCercaLeggi] = useState('')

    // L3 — articoli
    const [leggeSel, setLeggeSel] = useState(null)
    const [articoli, setArticoli] = useState([])
    const [totaleArt, setTotaleArt] = useState(0)
    const [loadingArt, setLoadingArt] = useState(false)
    const [paginaArt, setPaginaArt] = useState(0)
    const [inputArt, setInputArt] = useState('')
    const [cercaArt, setCercaArt] = useState('')
    const [artAperto, setArtAperto] = useState(null)

    // ── L1: cantoni dalla MV ──
    useEffect(() => {
        async function carica() {
            setLoadingCantoni(true)
            // La MV conteggi_norme_cantonali_ch ha (canton, n_leggi, ...). Le lingue
            // per cantone le ricavo dalla MV se presenti, altrimenti da una mappa fissa.
            const { data } = await supabase
                .from('conteggi_norme_cantonali_ch')
                .select('canton, n_leggi')
                .order('canton', { ascending: true })
            setCantoni((data ?? []).map(c => ({
                canton: c.canton,
                n_leggi: c.n_leggi,
                lingue: LINGUE_CANTONE[c.canton] ?? [],
            })))
            setLoadingCantoni(false)
        }
        carica()
    }, [])

    // ── L2: lista leggi ──
    useEffect(() => {
        if (vista !== 'cantone' || !cantoneSel) return
        async function carica() {
            setLoadingLeggi(true)
            let q = supabase
                .from('norme_cantonali_ch')
                .select('id, systematic_number, title, title_by_lang, abbreviation, is_active, lingue_disponibili, materia_macro_lbl', { count: 'exact' })
                .eq('canton', cantoneSel.canton)
            if (cercaLeggi.trim()) {
                q = q.or(`title.ilike.%${cercaLeggi}%,abbreviation.ilike.%${cercaLeggi}%,systematic_number.ilike.%${cercaLeggi}%`)
            }
            q = q.order('systematic_number', { ascending: true, nullsFirst: false })
                .range(paginaLeggi * PER_PAGINA_LEGGI, (paginaLeggi + 1) * PER_PAGINA_LEGGI - 1)
            const { data, count } = await q
            setLeggi(data ?? [])
            setTotaleLeggi(count ?? 0)
            setLoadingLeggi(false)
        }
        carica()
    }, [vista, cantoneSel, cercaLeggi, paginaLeggi])

    // ── L3: articoli ──
    useEffect(() => {
        if (vista !== 'legge' || !leggeSel) return
        async function carica() {
            setLoadingArt(true)
            let q = supabase
                .from('norme_cantonali_ch_articoli')
                .select('id, norma_id, article_num, article_num_int, article_suffix, rubrica, testo, gerarchia, lingua, is_abrogato', { count: 'exact' })
                .eq('norma_id', leggeSel.id)
                .eq('is_abrogato', false)
            // Filtro lingua solo se il cantone è bilingue
            if (cantoneSel?.lingue?.length > 1) {
                q = q.eq('lingua', lingua)
            }
            if (cercaArt.trim()) {
                q = q.or(`article_num.ilike.%${cercaArt}%,rubrica.ilike.%${cercaArt}%,testo.ilike.%${cercaArt}%`)
            }
            q = q.order('article_num_int', { ascending: true, nullsFirst: false })
                .range(paginaArt * PER_PAGINA_ART_CANT, (paginaArt + 1) * PER_PAGINA_ART_CANT - 1)
            const { data, count } = await q
            setArticoli(data ?? [])
            setTotaleArt(count ?? 0)
            setLoadingArt(false)
        }
        carica()
    }, [vista, leggeSel, lingua, cantoneSel, cercaArt, paginaArt])

    // ── navigazione ──
    function apriCantone(c) {
        setCantoneSel(c); setVista('cantone')
        setInputLeggi(''); setCercaLeggi(''); setPaginaLeggi(0)
        // lingua iniziale: se bilingue, prima lingua del cantone; se mono, la sua
        setLingua((c.lingue && c.lingue[0]) ?? 'it')
    }
    function apriLegge(l) {
        setLeggeSel(l); setVista('legge')
        setInputArt(''); setCercaArt(''); setPaginaArt(0); setArtAperto(null)
    }
    function tornaCatalogo() { setVista('catalogo'); setCantoneSel(null); setLeggeSel(null) }
    function tornaCantone() { setVista('cantone'); setLeggeSel(null) }

    function cambiaLingua(l) {
        if (l === lingua) return
        setLingua(l); setPaginaArt(0); setArtAperto(null)
    }

    function evidenzia(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }
    function gerarchiaLabel(g) {
        // gerarchia jsonb: provo a comporre una stringa leggibile dai valori
        if (!g || typeof g !== 'object') return ''
        const vals = Array.isArray(g) ? g : Object.values(g)
        return vals.filter(v => typeof v === 'string' && v.trim()).join(' › ')
    }
    function articoloEtichetta(a) {
        const base = a.article_num ?? (a.article_num_int != null ? String(a.article_num_int) : '—')
        return a.article_suffix ? `Art. ${base}${a.article_suffix}` : `Art. ${base}`
    }

    const pagineArt = Math.ceil(totaleArt / PER_PAGINA_ART_CANT)
    const pagineLeggi = Math.ceil(totaleLeggi / PER_PAGINA_LEGGI)

    const isBilingue = cantoneSel?.lingue?.length > 1

    return (
        <div className="space-y-5">

            {/* ═════ L1 — CATALOGO CANTONI (quadrati) ═════ */}
            {vista === 'catalogo' && (
                <>
                    {loadingCantoni ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {cantoni.map(c => (
                                <button key={c.canton} onClick={() => apriCantone(c)}
                                    className="aspect-square bg-slate border border-white/5 flex flex-col items-center justify-center gap-1.5 hover:border-oro/40 hover:bg-petrolio/60 transition-all group">
                                    <span className="font-display text-3xl font-semibold text-nebbia group-hover:text-oro transition-colors tracking-wide">
                                        {c.canton}
                                    </span>
                                    <span className="font-body text-[10px] text-salvia/50 uppercase tracking-wider">
                                        {(c.lingue ?? []).map(l => LINGUE_LABEL_CANT[l] ?? l.toUpperCase()).join(' · ')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═════ L2 — LISTA LEGGI ═════ */}
            {vista === 'cantone' && cantoneSel && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button onClick={tornaCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                            <ChevronLeft size={13} /> {t('cantonale.tutti_cantoni')}
                        </button>
                        <div className="flex items-center gap-4">
                            {isBilingue && (
                                <div className="flex items-center gap-2">
                                    <span className="font-body text-xs text-nebbia/30">{t('comune.lingua')}</span>
                                    <div className="flex gap-1 bg-slate border border-white/5 p-1">
                                        {cantoneSel.lingue.map(l => (
                                            <button key={l} onClick={() => cambiaLingua(l)}
                                                className={`px-2.5 py-1 font-body text-xs transition-colors ${lingua === l ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                                                {LINGUE_LABEL_CANT[l] ?? l.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="font-display text-2xl text-nebbia tracking-wide">{cantoneSel.canton}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={t('cantonale.cerca_legge_placeholder')}
                                value={inputLeggi}
                                onChange={e => setInputLeggi(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setPaginaLeggi(0); setCercaLeggi(inputLeggi) } }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={() => { setPaginaLeggi(0); setCercaLeggi(inputLeggi) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> {t('comune.cerca')}
                        </button>
                        {cercaLeggi && (
                            <button onClick={() => { setInputLeggi(''); setCercaLeggi(''); setPaginaLeggi(0) }}
                                className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                <X size={11} /> {t('comune.pulisci')}
                            </button>
                        )}
                    </div>

                    {cercaLeggi && <p className="font-body text-xs text-nebbia/30">{t('cantonale.leggi_per', { count: totaleLeggi, n: totaleLeggi.toLocaleString(dateLocale), q: cercaLeggi })}</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('cantonale.col_numero')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.titolo')}</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingLeggi ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : leggi.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">{t('cantonale.nessuna_legge')}</p>
                                    </td></tr>
                                ) : leggi.map(l => {
                                    const titoloRis = risolviTitoloCant(l.title_by_lang, l.title, lingua)
                                    const fallback = isBilingue && titoloRis.lingua && titoloRis.lingua !== lingua
                                    return (
                                        <tr key={l.id}
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                            onClick={() => apriLegge(l)}>
                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                {l.systematic_number ?? '—'}
                                                {l.is_active === false && <span className="ml-2 font-body text-[10px] text-red-400/70 border border-red-400/20 px-1.5 py-0.5 uppercase">{t('cantonale.badge_abrogata')}</span>}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/70 leading-snug">
                                                <span className="flex items-center gap-2 flex-wrap">
                                                    {l.abbreviation && <span className="text-nebbia/40 font-medium">{l.abbreviation}</span>}
                                                    <span>{titoloRis.testo ?? t('comune.senza_titolo')}</span>
                                                    {fallback && (
                                                        <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 uppercase">{LINGUE_LABEL_CANT[titoloRis.lingua]}</span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={13} className="text-nebbia/20" />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {pagineLeggi > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {t('comune.range_paginazione', { from: paginaLeggi * PER_PAGINA_LEGGI + 1, to: Math.min((paginaLeggi + 1) * PER_PAGINA_LEGGI, totaleLeggi), total: totaleLeggi.toLocaleString(dateLocale) })}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPaginaLeggi(p => Math.max(0, p - 1))} disabled={paginaLeggi === 0}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                    <button onClick={() => setPaginaLeggi(p => Math.min(pagineLeggi - 1, p + 1))} disabled={paginaLeggi >= pagineLeggi - 1}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═════ L3 — ARTICOLI ═════ */}
            {vista === 'legge' && leggeSel && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={tornaCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                <ChevronLeft size={13} /> {t('cantonale.tutti_cantoni')}
                            </button>
                            <span className="text-nebbia/20">/</span>
                            <button onClick={tornaCantone} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                {cantoneSel?.canton}
                            </button>
                        </div>
                        <p className="font-display text-lg text-nebbia text-right">
                            {leggeSel.systematic_number ?? ''}
                        </p>
                    </div>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed -mt-2 flex items-center gap-2 flex-wrap">
                        {leggeSel.abbreviation && <span className="text-nebbia/40 font-medium">{leggeSel.abbreviation}</span>}
                        <span>{risolviTitoloCant(leggeSel.title_by_lang, leggeSel.title, lingua).testo ?? t('comune.senza_titolo')}</span>
                    </p>

                    {/* Selettore lingua solo per cantoni bilingui */}
                    {isBilingue && (
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs text-nebbia/30">{t('comune.lingua')}</span>
                            <div className="flex gap-1 bg-slate border border-white/5 p-1">
                                {cantoneSel.lingue.map(l => (
                                    <button key={l} onClick={() => cambiaLingua(l)}
                                        className={`px-2.5 py-1 font-body text-xs transition-colors ${lingua === l ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                                        {LINGUE_LABEL_CANT[l] ?? l.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={t('comune.cerca_articolo_placeholder')}
                                value={inputArt}
                                onChange={e => setInputArt(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setPaginaArt(0); setCercaArt(inputArt) } }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={() => { setPaginaArt(0); setCercaArt(inputArt) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> {t('comune.cerca')}
                        </button>
                        {cercaArt && (
                            <button onClick={() => { setInputArt(''); setCercaArt(''); setPaginaArt(0) }}
                                className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                <X size={11} /> {t('comune.pulisci')}
                            </button>
                        )}
                    </div>

                    {cercaArt && <p className="font-body text-xs text-nebbia/30">{t('comune.risultati_per', { count: totaleArt, n: totaleArt.toLocaleString(dateLocale), q: cercaArt })}</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_articolo')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_rubrica_anteprima')}</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingArt ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : articoli.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">{t('comune.nessun_articolo')}</p>
                                    </td></tr>
                                ) : articoli.map(n => (
                                    <Fragment key={n.id}>
                                        <tr
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                            onClick={() => setArtAperto(artAperto?.id === n.id ? null : n)}>
                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                {articoloEtichetta(n)}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                {n.rubrica && <p className="font-medium text-nebbia/80 mb-0.5" dangerouslySetInnerHTML={{ __html: evidenzia(n.rubrica, cercaArt) }} />}
                                                {cercaArt && n.testo && <p className="text-xs text-nebbia/40 line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenzia(n.testo.slice(0, 200), cercaArt) }} />}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${artAperto?.id === n.id ? 'rotate-90' : ''}`} />
                                            </td>
                                        </tr>
                                        {artAperto?.id === n.id && (
                                            <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                <td colSpan={3} className="px-4 py-4">
                                                    {gerarchiaLabel(n.gerarchia) && (
                                                        <p className="font-body text-[11px] text-nebbia/30 uppercase tracking-wider mb-2">{gerarchiaLabel(n.gerarchia)}</p>
                                                    )}
                                                    <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: evidenzia(n.testo ?? t('comune.testo_non_disponibile'), cercaArt) }} />
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <BottoniSalvataggio
                                                            tipo="norma_cantonale"
                                                            id={n.id}
                                                            titolo={[`Art. ${n.article_num ?? ''}${n.article_suffix ?? ''}`.trim(), n.rubrica].filter(Boolean).join(' — ')}
                                                            testo={n.testo}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                                                                navigate(`${prefix}/norma-cantonale/${n.id}`)
                                                            }}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto">
                                                            {t('comune.apri_pagina_dedicata')} <ChevronRight size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                        {pagineArt > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {t('comune.range_paginazione', { from: paginaArt * PER_PAGINA_ART_CANT + 1, to: Math.min((paginaArt + 1) * PER_PAGINA_ART_CANT, totaleArt), total: totaleArt.toLocaleString(dateLocale) })}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPaginaArt(p => Math.max(0, p - 1))} disabled={paginaArt === 0}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                    <button onClick={() => setPaginaArt(p => Math.min(pagineArt - 1, p + 1))} disabled={paginaArt >= pagineArt - 1}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB GIURISPRUDENZA  —  blocco 4/N di BancaDati.jsx (CH)
//
// Mono-tabella giurisprudenza_ch (no atto→articoli). Navigazione:
//   L1 macro     → 2 card: Tribunali federali / Tribunali cantonali
//   L2a federali → lista tribunali (TF, TAF, TPF, BGE, minori)
//   L2b cantonali→ griglia cantoni (quadrati) — camere appiattite
//   L3 sentenze  → lista paginata, riga espandibile (principio + oggetto)
//
// Lingue:
//   - Federali (TF/TAF/BGE multilingue) → FILTRO lingua IT/DE/FR + badge.
//   - Cantonali (monolingui di fatto)   → solo badge lingua, niente filtro.
//   Titoli titolo_it/_de/_fr sempre valorizzati → uso lingua piattaforma.
//
// Anni: la MV conteggi_giurisprudenza_ch ha anni-spazzatura (8476, 1701…).
//   Filtro a range sensato [ANNO_MIN..anno corrente].
//
// Sostituzione in BancaDati: {tabAttivo === 'giurisprudenza' && <TabGiurisprudenza />}
// Icone richieste (già in cima al file): Search, ChevronRight, ChevronLeft, X.
// ═══════════════════════════════════════════════════════════════

const ANNO_MIN_GIUR = 1900
const ANNO_MAX_GIUR = new Date().getFullYear()
const PER_PAGINA_SENT = 50

// Fonti federali (ordine), SET_FEDERALI e camere → centralizzati in src/lib/istituzioni.js (namespace i18n 'istituzioni')

const LINGUE_FILTRO_GIUR = ['it', 'de', 'fr']
const LINGUE_LABEL_GIUR = { it: 'IT', de: 'DE', fr: 'FR' }

function TabGiurisprudenza() {
    const { t, i18n } = useTranslation('avv_banca_dati')
    const { t: tIst } = useTranslation('istituzioni')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const navigate = useNavigate()

    // vista: 'macro' | 'fed_lista' | 'cant_griglia' | 'sentenze'
    const [vista, setVista] = useState('macro')

    // conteggi MV (per elenco fonti reali + cantoni presenti)
    const [conteggi, setConteggi] = useState([])
    const [loadingConteggi, setLoadingConteggi] = useState(true)

    // selezione corrente per la lista sentenze
    const [ramo, setRamo] = useState(null)          // 'federale' | 'cantonale'
    const [fonteSel, setFonteSel] = useState(null)  // per federali: 'TF'; per cantonali: prefisso 'CANT_TI'
    const [cantoneSel, setCantoneSel] = useState(null)
    const [titoloSel, setTitoloSel] = useState('')  // label header lista sentenze

    // filtri lista sentenze
    const [linguaFiltro, setLinguaFiltro] = useState(null)  // solo ramo federale
    const [annoFiltro, setAnnoFiltro] = useState(null)

    // lista sentenze
    const [sentenze, setSentenze] = useState([])
    const [totaleSent, setTotaleSent] = useState(0)
    const [loadingSent, setLoadingSent] = useState(false)
    const [paginaSent, setPaginaSent] = useState(0)
    const [inputSent, setInputSent] = useState('')
    const [cercaSent, setCercaSent] = useState('')
    const [sentAperta, setSentAperta] = useState(null)

    // ── conteggi MV ──
    useEffect(() => {
        async function carica() {
            setLoadingConteggi(true)
            const { data } = await supabase
                .from('conteggi_giurisprudenza_ch')
                .select('fonte, anno, totale')
            setConteggi(data ?? [])
            setLoadingConteggi(false)
        }
        carica()
    }, [])

    // Cantoni presenti tra le fonti CANT_* (derivati dai conteggi)
    const cantoniPresenti = (() => {
        const set = new Set()
        for (const c of conteggi) {
            if (!SET_FEDERALI.has(c.fonte) && c.fonte.startsWith('CANT_')) {
                const { cantone } = parseCantonale(c.fonte)
                if (cantone) set.add(cantone)
            }
        }
        return Array.from(set).sort()
    })()

    // Anni disponibili per la selezione corrente (puliti dal range)
    const anniDisponibili = (() => {
        const set = new Set()
        for (const c of conteggi) {
            const appartiene = ramo === 'federale'
                ? c.fonte === fonteSel
                : (parseCantonale(c.fonte).cantone === cantoneSel)
            if (appartiene && c.anno >= ANNO_MIN_GIUR && c.anno <= ANNO_MAX_GIUR) {
                set.add(c.anno)
            }
        }
        return Array.from(set).sort((a, b) => b - a)
    })()

    // ── lista sentenze ──
    useEffect(() => {
        if (vista !== 'sentenze') return
        async function carica() {
            setLoadingSent(true)
            const cols = 'id, fonte, signature, reference, anno_deposito, data_decisione, camera_codice, lingua, titolo_it, titolo_de, titolo_fr, oggetto, principio_diritto, is_dtf'
            let q = supabase.from('giurisprudenza_ch').select(cols, { count: 'exact' })

            if (ramo === 'federale') {
                q = q.eq('fonte', fonteSel)
                if (linguaFiltro) q = q.eq('lingua', linguaFiltro)
            } else {
                // cantonale: tutte le camere del cantone → fonte LIKE 'CANT_XX%'
                q = q.like('fonte', `CANT_${cantoneSel}%`)
            }
            if (annoFiltro) q = q.eq('anno_deposito', annoFiltro)
            if (cercaSent.trim()) {
                q = q.or(`signature.ilike.%${cercaSent}%,reference.ilike.%${cercaSent}%,oggetto.ilike.%${cercaSent}%`)
            }
            q = q.order('anno_deposito', { ascending: false, nullsFirst: false })
                .range(paginaSent * PER_PAGINA_SENT, (paginaSent + 1) * PER_PAGINA_SENT - 1)

            const { data, count } = await q
            setSentenze(data ?? [])
            setTotaleSent(count ?? 0)
            setLoadingSent(false)
        }
        carica()
    }, [vista, ramo, fonteSel, cantoneSel, linguaFiltro, annoFiltro, cercaSent, paginaSent])

    // ── navigazione ──
    function apriFederali() { setRamo('federale'); setVista('fed_lista') }
    function apriCantonali() { setRamo('cantonale'); setVista('cant_griglia') }

    function apriFonteFederale(f) {
        setFonteSel(f.fonte); setCantoneSel(null); setTitoloSel(f.label)
        setLinguaFiltro(null); setAnnoFiltro(null)
        setInputSent(''); setCercaSent(''); setPaginaSent(0); setSentAperta(null)
        setVista('sentenze')
    }
    function apriCantone(cant) {
        setCantoneSel(cant); setFonteSel(null); setTitoloSel(t('giurisprudenza.tribunali_cantone', { cant }))
        setLinguaFiltro(null); setAnnoFiltro(null)
        setInputSent(''); setCercaSent(''); setPaginaSent(0); setSentAperta(null)
        setVista('sentenze')
    }
    function tornaMacro() { setVista('macro'); setRamo(null); setFonteSel(null); setCantoneSel(null) }
    function tornaLivello2() { setVista(ramo === 'federale' ? 'fed_lista' : 'cant_griglia'); setSentAperta(null) }

    function titoloSent(s) {
        return s.titolo_it || s.titolo_de || s.titolo_fr || s.signature || s.reference || t('comune.senza_titolo')
    }
    function evidenzia(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }
    function cameraBadge(s) {
        if (!s.fonte) return null
        const { camera } = parseCantonale(s.fonte)
        if (!camera) return null
        return labelCamera(camera, tIst)
    }

    const pagineSent = Math.ceil(totaleSent / PER_PAGINA_SENT)

    return (
        <div className="space-y-5">

            {/* ═════ L1 — MACRO ═════ */}
            {vista === 'macro' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={apriFederali}
                        className="bg-slate border border-white/5 p-8 text-left hover:border-oro/40 hover:bg-petrolio/60 transition-all group">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="font-display text-2xl text-nebbia group-hover:text-oro transition-colors">{t('giurisprudenza.tribunali_federali')}</p>
                            <ChevronRight size={18} className="text-nebbia/20 group-hover:text-oro/60 transition-colors" />
                        </div>
                        <p className="font-body text-sm text-nebbia/40">{t('giurisprudenza.tribunali_federali_desc')}</p>
                    </button>
                    <button onClick={apriCantonali}
                        className="bg-slate border border-white/5 p-8 text-left hover:border-oro/40 hover:bg-petrolio/60 transition-all group">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="font-display text-2xl text-nebbia group-hover:text-oro transition-colors">{t('giurisprudenza.tribunali_cantonali')}</p>
                            <ChevronRight size={18} className="text-nebbia/20 group-hover:text-oro/60 transition-colors" />
                        </div>
                        <p className="font-body text-sm text-nebbia/40">{t('giurisprudenza.tribunali_cantonali_desc')}</p>
                    </button>
                </div>
            )}

            {/* ═════ L2a — LISTA TRIBUNALI FEDERALI ═════ */}
            {vista === 'fed_lista' && (
                <div className="space-y-4">
                    <button onClick={tornaMacro} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                        <ChevronLeft size={13} /> {t('giurisprudenza.federale_cantonale')}
                    </button>
                    {loadingConteggi ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {FONTI_FEDERALI_ORDER
                                .filter(code => conteggi.some(c => c.fonte === code))
                                .map(code => ({ fonte: code, label: labelFonteFederale(code, tIst) }))
                                .map(f => (
                                <button key={f.fonte} onClick={() => apriFonteFederale(f)}
                                    className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group flex items-center justify-between gap-3">
                                    <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors">{f.label}</p>
                                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════ L2b — GRIGLIA CANTONI ═════ */}
            {vista === 'cant_griglia' && (
                <div className="space-y-4">
                    <button onClick={tornaMacro} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                        <ChevronLeft size={13} /> {t('giurisprudenza.federale_cantonale')}
                    </button>
                    {loadingConteggi ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {cantoniPresenti.map(cant => (
                                <button key={cant} onClick={() => apriCantone(cant)}
                                    className="aspect-square bg-slate border border-white/5 flex items-center justify-center hover:border-oro/40 hover:bg-petrolio/60 transition-all group">
                                    <span className="font-display text-3xl font-semibold text-nebbia group-hover:text-oro transition-colors tracking-wide">{cant}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════ L3 — LISTA SENTENZE ═════ */}
            {vista === 'sentenze' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={tornaMacro} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                <ChevronLeft size={13} /> {t('giurisprudenza.federale_cantonale')}
                            </button>
                            <span className="text-nebbia/20">/</span>
                            <button onClick={tornaLivello2} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                {ramo === 'federale' ? t('giurisprudenza.tribunali_federali') : t('giurisprudenza.tribunali_cantonali')}
                            </button>
                        </div>
                        <p className="font-display text-lg text-nebbia text-right">{titoloSel}</p>
                    </div>

                    {/* Filtri */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Filtro lingua: solo ramo federale (multilingue) */}
                        {ramo === 'federale' && (
                            <div className="flex items-center gap-2">
                                <span className="font-body text-xs text-nebbia/30">{t('comune.lingua')}</span>
                                <div className="flex gap-1 bg-slate border border-white/5 p-1">
                                    <button onClick={() => { setLinguaFiltro(null); setPaginaSent(0) }}
                                        className={`px-2.5 py-1 font-body text-xs transition-colors ${linguaFiltro === null ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>{t('giurisprudenza.tutte_lingue')}</button>
                                    {LINGUE_FILTRO_GIUR.map(l => (
                                        <button key={l} onClick={() => { setLinguaFiltro(l); setPaginaSent(0) }}
                                            className={`px-2.5 py-1 font-body text-xs transition-colors ${linguaFiltro === l ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                                            {LINGUE_LABEL_GIUR[l]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Filtro anno */}
                        {anniDisponibili.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="font-body text-xs text-nebbia/30">{t('giurisprudenza.anno')}</span>
                                <select value={annoFiltro ?? ''}
                                    onChange={e => { setAnnoFiltro(e.target.value ? Number(e.target.value) : null); setPaginaSent(0) }}
                                    className="bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50">
                                    <option value="">{t('giurisprudenza.tutti_anni')}</option>
                                    {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Ricerca */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={t('giurisprudenza.cerca_sentenza_placeholder')}
                                value={inputSent}
                                onChange={e => setInputSent(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setPaginaSent(0); setCercaSent(inputSent) } }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={() => { setPaginaSent(0); setCercaSent(inputSent) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> {t('comune.cerca')}
                        </button>
                        {cercaSent && (
                            <button onClick={() => { setInputSent(''); setCercaSent(''); setPaginaSent(0) }}
                                className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                <X size={11} /> {t('comune.pulisci')}
                            </button>
                        )}
                    </div>

                    {cercaSent && <p className="font-body text-xs text-nebbia/30">{t('giurisprudenza.sentenze_per', { count: totaleSent, n: totaleSent.toLocaleString(dateLocale), q: cercaSent })}</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('giurisprudenza.col_riferimento')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_oggetto')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase whitespace-nowrap">{t('giurisprudenza.col_anno')}</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingSent ? (
                                    <tr><td colSpan={4} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : sentenze.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">{t('giurisprudenza.nessuna_sentenza')}</p>
                                    </td></tr>
                                ) : sentenze.map(s => {
                                    const cam = cameraBadge(s)
                                    return (
                                        <Fragment key={s.id}>
                                            <tr
                                                className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                                onClick={() => setSentAperta(sentAperta?.id === s.id ? null : s)}>
                                                <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{s.signature || s.reference || '—'}</span>
                                                        <span className="flex items-center gap-1.5">
                                                            {s.is_dtf && <span className="font-body text-[10px] text-oro/70 border border-oro/20 px-1.5 py-0.5 uppercase">DTF</span>}
                                                            {s.lingua && ['it', 'de', 'fr'].includes(s.lingua) && <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 uppercase">{s.lingua}</span>}
                                                            {cam && <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-1.5 py-0.5">{cam}</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                    <p className="line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenzia(s.oggetto || titoloSent(s), cercaSent) }} />
                                                </td>
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/50 whitespace-nowrap align-top">
                                                    {s.anno_deposito && s.anno_deposito >= ANNO_MIN_GIUR && s.anno_deposito <= ANNO_MAX_GIUR ? s.anno_deposito : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${sentAperta?.id === s.id ? 'rotate-90' : ''}`} />
                                                </td>
                                            </tr>
                                            {sentAperta?.id === s.id && (
                                                <tr key={`${s.id}-d`} className="border-b border-white/5 bg-petrolio/20">
                                                    <td colSpan={4} className="px-4 py-4 space-y-3">
                                                        {s.principio_diritto && (
                                                            <div>
                                                                <p className="font-body text-[11px] text-salvia/60 uppercase tracking-wider mb-1">{t('giurisprudenza.principio_diritto')}</p>
                                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{s.principio_diritto}</p>
                                                            </div>
                                                        )}
                                                        {s.oggetto && (
                                                            <div>
                                                                <p className="font-body text-[11px] text-salvia/60 uppercase tracking-wider mb-1">{t('comune.oggetto')}</p>
                                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{s.oggetto}</p>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <BottoniSalvataggio
                                                                tipo="giurisprudenza"
                                                                id={s.id}
                                                                titolo={[s.signature ?? s.reference, s.oggetto].filter(Boolean).join(' — ')}
                                                                testo={s.principio_diritto || s.oggetto || s.testo}
                                                            />
                                                            <button type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                                                                    navigate(`${prefix}/sentenza-ch/${s.id}`)
                                                                }}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto">
                                                                {t('comune.apri_pagina_dedicata')} <ChevronRight size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                        {pagineSent > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {t('comune.range_paginazione', { from: paginaSent * PER_PAGINA_SENT + 1, to: Math.min((paginaSent + 1) * PER_PAGINA_SENT, totaleSent), total: totaleSent.toLocaleString(dateLocale) })}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPaginaSent(p => Math.max(0, p - 1))} disabled={paginaSent === 0}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                    <button onClick={() => setPaginaSent(p => Math.min(pagineSent - 1, p + 1))} disabled={paginaSent >= pagineSent - 1}
                                        className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB UE  —  blocco 6/6 di BancaDati.jsx (CH)
//
// Due corpora distinti, due sezioni nel tab:
//   NORME (norme_ue): REG/DIR/DEC, articoli inline per celex
//     L1 tipo_atto → L2 atti (per celex, titolo_doc) → L3 articoli
//     L3 ha sotto-filtro tipo_elemento: Articoli (default) / Considerando / Allegati
//   SENTENZE (eur_lex): CGUE per organo
//     L1 organo → L2 lista sentenze, riga espandibile (oggetto + parti)
//
// Lingua: per ora SOLO italiano (corpus UE fatto in IT; DE/FR/EN futuri).
//   Il selettore lingua è PREDISPOSTO ma bloccato su IT (le altre lingue
//   appaiono disabilitate finché non ci saranno le traduzioni).
//
// Sostituzione in BancaDati: {tabAttivo === 'ue' && <TabUE />}
// Icone richieste (già in cima al file): Search, ChevronRight, ChevronLeft, X.
// ═══════════════════════════════════════════════════════════════

const PER_PAGINA_UE = 50

// Le label dei tipi atto UE sono tradotte via i18n (ue.tipo_atto.*)
const ORDINE_TIPO_UE = ['REG', 'DIR', 'DEC']

// Le label degli elementi UE sono tradotte via i18n (ue.elemento.*)
const ORDINE_ELEMENTO_UE = ['articolo', 'considerando', 'allegato']

// Selettore lingua predisposto: IT attiva, le altre disabilitate (traduzioni future).
const LINGUE_UE = [
    { code: 'it', label: 'IT', attiva: true },
    { code: 'de', label: 'DE', attiva: false },
    { code: 'fr', label: 'FR', attiva: false },
    { code: 'en', label: 'EN', attiva: false },
]

function SelettoreLinguaUE({ lingua }) {
    const { t } = useTranslation('avv_banca_dati')
    return (
        <div className="flex items-center gap-2">
            <span className="font-body text-xs text-nebbia/30">{t('comune.lingua')}</span>
            <div className="flex gap-1 bg-slate border border-white/5 p-1">
                {LINGUE_UE.map(l => (
                    <button key={l.code}
                        disabled={!l.attiva}
                        title={l.attiva ? '' : t('ue.traduzione_in_arrivo')}
                        className={`px-2.5 py-1 font-body text-xs transition-colors ${lingua === l.code ? 'bg-oro/10 text-oro border border-oro/30'
                            : l.attiva ? 'text-nebbia/40 hover:text-nebbia border border-transparent'
                                : 'text-nebbia/20 border border-transparent cursor-not-allowed'
                            }`}>
                        {l.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function TabUE() {
    const { t, i18n } = useTranslation('avv_banca_dati')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const navigate = useNavigate()
    const tipoAttoUeLabel = (k) => ORDINE_TIPO_UE.includes(k) ? t(`ue.tipo_atto.${k}`) : k
    const elementoUeLabel = (k) => ORDINE_ELEMENTO_UE.includes(k) ? t(`ue.elemento.${k}`) : k

    // sezione attiva: 'norme' | 'sentenze' (CGUE/Tribunali UE) | 'cedu' (Corte EDU)
    const [sezione, setSezione] = useState('norme')
    // lingua (per ora fissa IT, ma predisposta)
    const [lingua] = useState('it')

    const [conteggi, setConteggi] = useState([])
    const [loadingConteggi, setLoadingConteggi] = useState(true)

    // ─── NORME ───
    // vista norme: 'catalogo' | 'tipo' | 'atto'
    const [vistaN, setVistaN] = useState('catalogo')
    const [tipoSel, setTipoSel] = useState(null)
    const [attiUe, setAttiUe] = useState([])
    const [totaleAttiUe, setTotaleAttiUe] = useState(0)
    const [loadingAttiUe, setLoadingAttiUe] = useState(false)
    const [paginaAttiUe, setPaginaAttiUe] = useState(0)
    const [inputAttiUe, setInputAttiUe] = useState('')
    const [cercaAttiUe, setCercaAttiUe] = useState('')

    const [attoUeSel, setAttoUeSel] = useState(null)  // { celex, titolo_doc, tipo_atto }
    const [elementoSel, setElementoSel] = useState('articolo')
    const [articoliUe, setArticoliUe] = useState([])
    const [totaleArtUe, setTotaleArtUe] = useState(0)
    const [loadingArtUe, setLoadingArtUe] = useState(false)
    const [paginaArtUe, setPaginaArtUe] = useState(0)
    const [inputArtUe, setInputArtUe] = useState('')
    const [cercaArtUe, setCercaArtUe] = useState('')
    const [artUeAperto, setArtUeAperto] = useState(null)

    // ─── SENTENZE (CGUE/Tribunali UE) e CORTE EDU — condividono la lista eur_lex ───
    // vista sentenze: 'catalogo' | 'lista'
    const [vistaS, setVistaS] = useState('catalogo')
    const [organoSel, setOrganoSel] = useState(null)
    const [tipoCeduSel, setTipoCeduSel] = useState(null)  // tipo selezionato nella sezione Corte EDU
    const [sentUe, setSentUe] = useState([])
    const [totaleSentUe, setTotaleSentUe] = useState(0)
    const [loadingSentUe, setLoadingSentUe] = useState(false)
    const [paginaSentUe, setPaginaSentUe] = useState(0)
    const [inputSentUe, setInputSentUe] = useState('')
    const [cercaSentUe, setCercaSentUe] = useState('')
    const [sentUeAperta, setSentUeAperta] = useState(null)

    // ── conteggi MV (sezione, chiave, totale) ──
    useEffect(() => {
        async function carica() {
            setLoadingConteggi(true)
            const { data } = await supabase
                .from('conteggi_eu_ch')
                .select('sezione, chiave, totale')
            setConteggi(data ?? [])
            setLoadingConteggi(false)
        }
        carica()
    }, [])

    const tipiNorme = ORDINE_TIPO_UE
        .map(t => conteggi.find(c => c.sezione === 'norme' && c.chiave === t))
        .filter(Boolean)
    const organiSentenze = conteggi
        .filter(c => c.sezione === 'sentenze' && c.chiave !== 'CEDU')
        .sort((a, b) => Number(b.totale) - Number(a.totale))

    // ── NORME L2: atti per tipo (raggruppati per celex) ──
    useEffect(() => {
        if (sezione !== 'norme' || vistaN !== 'tipo' || !tipoSel) return
        async function carica() {
            setLoadingAttiUe(true)
            // Un atto = un celex. Prendo le righe distinte per celex con titolo_doc.
            // PostgREST non fa DISTINCT diretto: prendo articolo "1" come rappresentante,
            // oppure raggruppo lato client. Qui filtro tipo_elemento='articolo' e
            // deduplico per celex lato client su una finestra ampia.
            let q = supabase
                .from('norme_ue')
                .select('celex, titolo_doc, titolo_breve, tipo_atto, anno_atto, numero_atto, vigente', { count: 'exact' })
                .eq('tipo_atto', tipoSel)
                .eq('tipo_elemento', 'articolo')
            if (cercaAttiUe.trim()) {
                q = q.or(`titolo_doc.ilike.%${cercaAttiUe}%,celex.ilike.%${cercaAttiUe}%,numero_atto.ilike.%${cercaAttiUe}%`)
            }
            q = q.order('anno_atto', { ascending: false, nullsFirst: false })
                .range(0, 1499)  // finestra ampia, poi deduplico per celex
            const { data } = await q

            const visti = new Map()
            for (const r of (data ?? [])) {
                if (!visti.has(r.celex)) visti.set(r.celex, r)
            }
            const lista = Array.from(visti.values())
            setTotaleAttiUe(lista.length)
            const start = paginaAttiUe * PER_PAGINA_UE
            setAttiUe(lista.slice(start, start + PER_PAGINA_UE))
            setLoadingAttiUe(false)
        }
        carica()
    }, [sezione, vistaN, tipoSel, cercaAttiUe, paginaAttiUe])

    // ── NORME L3: articoli dell'atto (per celex) + sotto-filtro elemento ──
    useEffect(() => {
        if (sezione !== 'norme' || vistaN !== 'atto' || !attoUeSel) return
        async function carica() {
            setLoadingArtUe(true)
            let q = supabase
                .from('norme_ue')
                .select('id, celex, articolo, rubrica, testo, tipo_elemento, vigente', { count: 'exact' })
                .eq('celex', attoUeSel.celex)
                .eq('tipo_elemento', elementoSel)
            if (cercaArtUe.trim()) {
                q = q.or(`articolo.ilike.%${cercaArtUe}%,rubrica.ilike.%${cercaArtUe}%,testo.ilike.%${cercaArtUe}%`)
            }
            q = q.order('id', { ascending: true })
                .range(paginaArtUe * PER_PAGINA_UE, (paginaArtUe + 1) * PER_PAGINA_UE - 1)
            const { data, count } = await q
            setArticoliUe(data ?? [])
            setTotaleArtUe(count ?? 0)
            setLoadingArtUe(false)
        }
        carica()
    }, [sezione, vistaN, attoUeSel, elementoSel, cercaArtUe, paginaArtUe])

    // ── SENTENZE/CEDU L2: lista per organo (CGUE) o per tipo (Corte EDU) ──
    useEffect(() => {
        if ((sezione !== 'sentenze' && sezione !== 'cedu') || vistaS !== 'lista' || !organoSel) return
        async function carica() {
            setLoadingSentUe(true)
            let q = supabase
                .from('eur_lex')
                .select('id, celex_id, ecli, tipo, numero_caso, organo, data_decisione, oggetto, parti, relatore, materia, vigente', { count: 'exact' })
                .eq('organo', organoSel)
            if (sezione === 'cedu' && tipoCeduSel) {
                q = q.eq('tipo', tipoCeduSel)
            }
            if (cercaSentUe.trim()) {
                q = q.or(`numero_caso.ilike.%${cercaSentUe}%,oggetto.ilike.%${cercaSentUe}%,parti.ilike.%${cercaSentUe}%,ecli.ilike.%${cercaSentUe}%`)
            }
            q = q.order('data_decisione', { ascending: false, nullsFirst: false })
                .range(paginaSentUe * PER_PAGINA_UE, (paginaSentUe + 1) * PER_PAGINA_UE - 1)
            const { data, count } = await q
            setSentUe(data ?? [])
            setTotaleSentUe(count ?? 0)
            setLoadingSentUe(false)
        }
        carica()
    }, [sezione, vistaS, organoSel, tipoCeduSel, cercaSentUe, paginaSentUe])

    // ── navigazione NORME ──
    function apriTipoUe(tipo) {
        setTipoSel(tipo); setVistaN('tipo'); setPaginaAttiUe(0)
        setInputAttiUe(''); setCercaAttiUe('')
    }
    function apriAttoUe(a) {
        setAttoUeSel(a); setVistaN('atto'); setElementoSel('articolo')
        setInputArtUe(''); setCercaArtUe(''); setPaginaArtUe(0); setArtUeAperto(null)
    }
    function tornaCatalogoN() { setVistaN('catalogo'); setTipoSel(null); setAttoUeSel(null) }
    function tornaTipoN() { setVistaN('tipo'); setAttoUeSel(null) }
    function cambiaElemento(el) {
        if (el === elementoSel) return
        setElementoSel(el); setPaginaArtUe(0); setArtUeAperto(null); setCercaArtUe(''); setInputArtUe('')
    }

    // ── navigazione SENTENZE ──
    function apriOrgano(org) {
        setOrganoSel(org); setVistaS('lista'); setPaginaSentUe(0)
        setInputSentUe(''); setCercaSentUe(''); setSentUeAperta(null)
    }
    function tornaCatalogoS() { setVistaS('catalogo'); setOrganoSel(null) }

    // ── navigazione CORTE EDU (sezione 'cedu') ── catalogo per tipo (card) → lista
    function entraCedu() {
        setOrganoSel('CEDU'); setVistaS('catalogo'); setTipoCeduSel(null)
        setPaginaSentUe(0); setInputSentUe(''); setCercaSentUe(''); setSentUeAperta(null)
    }
    function apriTipoCedu(tp) {
        setTipoCeduSel(tp); setVistaS('lista'); setPaginaSentUe(0)
        setInputSentUe(''); setCercaSentUe(''); setSentUeAperta(null)
    }
    function tornaCatalogoCedu() { setVistaS('catalogo'); setTipoCeduSel(null) }

    function evidenzia(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }
    function attoUeLabel(a) {
        return a.titolo_doc || a.titolo_breve || a.celex || t('comune.senza_titolo')
    }

    const pagineAttiUe = Math.ceil(totaleAttiUe / PER_PAGINA_UE)
    const pagineArtUe = Math.ceil(totaleArtUe / PER_PAGINA_UE)
    const pagineSentUe = Math.ceil(totaleSentUe / PER_PAGINA_UE)

    return (
        <div className="space-y-5">

            {/* Switch sezione: Norme UE · Sentenze CGUE · Corte EDU */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1 bg-slate border border-white/5 p-1 flex-wrap">
                    <button onClick={() => setSezione('norme')}
                        className={`px-4 py-1.5 font-body text-xs transition-colors ${sezione === 'norme' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                        {t('ue.sezione_norme')}
                    </button>
                    <button onClick={() => { setSezione('sentenze'); if (organoSel === 'CEDU') tornaCatalogoS() }}
                        className={`px-4 py-1.5 font-body text-xs transition-colors ${sezione === 'sentenze' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                        {t('ue.sezione_sentenze')}
                    </button>
                    <button onClick={() => { setSezione('cedu'); entraCedu() }}
                        className={`px-4 py-1.5 font-body text-xs transition-colors ${sezione === 'cedu' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                        {t('ue.sezione_cedu')}
                    </button>
                </div>
                <SelettoreLinguaUE lingua={lingua} />
            </div>

            {/* ════════════ SEZIONE NORME ════════════ */}
            {sezione === 'norme' && (
                <>
                    {/* L1 catalogo tipo_atto */}
                    {vistaN === 'catalogo' && (
                        loadingConteggi ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {tipiNorme.map(c => (
                                    <button key={c.chiave} onClick={() => apriTipoUe(c.chiave)}
                                        className="bg-slate border border-white/5 p-5 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-display text-lg text-nebbia group-hover:text-oro transition-colors">{tipoAttoUeLabel(c.chiave)}</p>
                                            <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {/* L2 lista atti */}
                    {vistaN === 'tipo' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <button onClick={tornaCatalogoN} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                    <ChevronLeft size={13} /> {t('ue.tutti_tipi')}
                                </button>
                                <p className="font-display text-xl text-nebbia">{tipoAttoUeLabel(tipoSel)}</p>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <input placeholder={t('ue.cerca_atto_placeholder')}
                                        value={inputAttiUe}
                                        onChange={e => setInputAttiUe(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { setPaginaAttiUe(0); setCercaAttiUe(inputAttiUe) } }}
                                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                </div>
                                <button onClick={() => { setPaginaAttiUe(0); setCercaAttiUe(inputAttiUe) }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                                    <Search size={13} /> {t('comune.cerca')}
                                </button>
                                {cercaAttiUe && (
                                    <button onClick={() => { setInputAttiUe(''); setCercaAttiUe(''); setPaginaAttiUe(0) }}
                                        className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                        <X size={11} /> {t('comune.pulisci')}
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate border border-white/5">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('ue.col_celex')}</th>
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.titolo')}</th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingAttiUe ? (
                                            <tr><td colSpan={3} className="px-4 py-20 text-center"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" /></td></tr>
                                        ) : attiUe.length === 0 ? (
                                            <tr><td colSpan={3} className="px-4 py-20 text-center"><p className="font-body text-sm text-nebbia/30">{t('ue.nessun_atto')}</p></td></tr>
                                        ) : attiUe.map(a => (
                                            <tr key={a.celex} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer" onClick={() => apriAttoUe(a)}>
                                                <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                    {a.celex ?? '—'}
                                                    {a.vigente === false && <span className="ml-2 font-body text-[10px] text-red-400/70 border border-red-400/20 px-1.5 py-0.5 uppercase">{t('ue.badge_abrogato')}</span>}
                                                </td>
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/70 leading-snug">{attoUeLabel(a)}</td>
                                                <td className="px-4 py-3"><ChevronRight size={13} className="text-nebbia/20" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {pagineAttiUe > 1 && (
                                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                        <p className="font-body text-xs text-nebbia/30">{t('comune.range_paginazione', { from: paginaAttiUe * PER_PAGINA_UE + 1, to: Math.min((paginaAttiUe + 1) * PER_PAGINA_UE, totaleAttiUe), total: totaleAttiUe.toLocaleString(dateLocale) })}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaAttiUe(p => Math.max(0, p - 1))} disabled={paginaAttiUe === 0} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                            <button onClick={() => setPaginaAttiUe(p => Math.min(pagineAttiUe - 1, p + 1))} disabled={paginaAttiUe >= pagineAttiUe - 1} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* L3 articoli */}
                    {vistaN === 'atto' && attoUeSel && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button onClick={tornaCatalogoN} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                        <ChevronLeft size={13} /> {t('ue.tutti_tipi')}
                                    </button>
                                    <span className="text-nebbia/20">/</span>
                                    <button onClick={tornaTipoN} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">{tipoAttoUeLabel(tipoSel)}</button>
                                </div>
                                <p className="font-display text-base text-nebbia text-right">{attoUeSel.celex}</p>
                            </div>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed -mt-2">{attoUeLabel(attoUeSel)}</p>

                            {/* Sotto-filtro tipo_elemento */}
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 bg-slate border border-white/5 p-1">
                                    {ORDINE_ELEMENTO_UE.map(el => (
                                        <button key={el} onClick={() => cambiaElemento(el)}
                                            className={`px-3 py-1 font-body text-xs transition-colors ${elementoSel === el ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia border border-transparent'}`}>
                                            {elementoUeLabel(el)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <input placeholder={t('ue.cerca_testo_placeholder')}
                                        value={inputArtUe}
                                        onChange={e => setInputArtUe(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { setPaginaArtUe(0); setCercaArtUe(inputArtUe) } }}
                                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                </div>
                                <button onClick={() => { setPaginaArtUe(0); setCercaArtUe(inputArtUe) }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                                    <Search size={13} /> {t('comune.cerca')}
                                </button>
                                {cercaArtUe && (
                                    <button onClick={() => { setInputArtUe(''); setCercaArtUe(''); setPaginaArtUe(0) }}
                                        className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                        <X size={11} /> {t('comune.pulisci')}
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate border border-white/5">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t(`ue.elemento_singolare.${elementoSel}`)}</th>
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('comune.col_rubrica_anteprima')}</th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingArtUe ? (
                                            <tr><td colSpan={3} className="px-4 py-20 text-center"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" /></td></tr>
                                        ) : articoliUe.length === 0 ? (
                                            <tr><td colSpan={3} className="px-4 py-20 text-center"><p className="font-body text-sm text-nebbia/30">{t('ue.nessun_elemento')}</p></td></tr>
                                        ) : articoliUe.map(n => (
                                            <Fragment key={n.id}>
                                                <tr className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer" onClick={() => setArtUeAperto(artUeAperto?.id === n.id ? null : n)}>
                                                    <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">{n.articolo ?? '—'}</td>
                                                    <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                        {n.rubrica && <p className="font-medium text-nebbia/80 mb-0.5" dangerouslySetInnerHTML={{ __html: evidenzia(n.rubrica, cercaArtUe) }} />}
                                                        {cercaArtUe && n.testo && <p className="text-xs text-nebbia/40 line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenzia(n.testo.slice(0, 200), cercaArtUe) }} />}
                                                    </td>
                                                    <td className="px-4 py-3"><ChevronRight size={13} className={`text-nebbia/20 transition-transform ${artUeAperto?.id === n.id ? 'rotate-90' : ''}`} /></td>
                                                </tr>
                                                {artUeAperto?.id === n.id && (
                                                    <tr key={`${n.id}-t`} className="border-b border-white/5 bg-petrolio/20">
                                                        <td colSpan={3} className="px-4 py-4">
                                                            <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: evidenzia(n.testo ?? t('comune.testo_non_disponibile'), cercaArtUe) }} />
                                                            <div className="mt-3 flex items-center gap-2">
                                                                <BottoniSalvataggio
                                                                    tipo="norma_ue"
                                                                    id={n.id}
                                                                    titolo={[n.articolo, n.rubrica].filter(Boolean).join(' — ')}
                                                                    testo={n.testo}
                                                                />
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'; navigate(`${prefix}/norma-ue/${n.id}`) }}
                                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto">
                                                                    {t('comune.apri_pagina_dedicata')} <ChevronRight size={11} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                                {pagineArtUe > 1 && (
                                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                        <p className="font-body text-xs text-nebbia/30">{t('comune.range_paginazione', { from: paginaArtUe * PER_PAGINA_UE + 1, to: Math.min((paginaArtUe + 1) * PER_PAGINA_UE, totaleArtUe), total: totaleArtUe.toLocaleString(dateLocale) })}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaArtUe(p => Math.max(0, p - 1))} disabled={paginaArtUe === 0} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                            <button onClick={() => setPaginaArtUe(p => Math.min(pagineArtUe - 1, p + 1))} disabled={paginaArtUe >= pagineArtUe - 1} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ════════════ SEZIONE SENTENZE CGUE + CORTE EDU (lista eur_lex condivisa) ════════════ */}
            {(sezione === 'sentenze' || sezione === 'cedu') && (
                <>
                    {/* L1 catalogo CEDU per tipo — card come gli organi CGUE */}
                    {sezione === 'cedu' && vistaS === 'catalogo' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {TIPI_CEDU.map(tp => (
                                <button key={tp} onClick={() => apriTipoCedu(tp)}
                                    className="bg-slate border border-white/5 p-5 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">{t(`cedu.tipo.${tp}`)}</p>
                                        <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* L1 organi (solo CGUE) */}
                    {sezione === 'sentenze' && vistaS === 'catalogo' && (
                        loadingConteggi ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {organiSentenze.map(c => (
                                    <button key={c.chiave} onClick={() => apriOrgano(c.chiave)}
                                        className="bg-slate border border-white/5 p-5 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">{c.chiave}</p>
                                            <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {/* L2 lista (CGUE per organo, oppure CEDU filtrata per tipo) */}
                    {vistaS === 'lista' && organoSel && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                {sezione === 'cedu' ? (
                                <button onClick={tornaCatalogoCedu} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                    <ChevronLeft size={13} /> {t('ue.tutti_tipi')}
                                </button>
                                ) : (
                                <button onClick={tornaCatalogoS} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                                    <ChevronLeft size={13} /> {t('ue.tutti_organi')}
                                </button>
                                )}
                                <p className="font-display text-lg text-nebbia text-right">{sezione === 'cedu' ? t(`cedu.tipo.${tipoCeduSel}`) : organoSel}</p>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <input placeholder={t('ue.cerca_sentenza_placeholder')}
                                        value={inputSentUe}
                                        onChange={e => setInputSentUe(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { setPaginaSentUe(0); setCercaSentUe(inputSentUe) } }}
                                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                </div>
                                <button onClick={() => { setPaginaSentUe(0); setCercaSentUe(inputSentUe) }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                                    <Search size={13} /> {t('comune.cerca')}
                                </button>
                                {cercaSentUe && (
                                    <button onClick={() => { setInputSentUe(''); setCercaSentUe(''); setPaginaSentUe(0) }}
                                        className="px-3 py-2.5 text-nebbia/30 hover:text-red-400 transition-colors font-body text-xs flex items-center gap-1">
                                        <X size={11} /> {t('comune.pulisci')}
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate border border-white/5">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('ue.col_caso')}</th>
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('ue.col_oggetto_parti')}</th>
                                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase whitespace-nowrap">{t('ue.col_data')}</th>
                                            <th className="px-4 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingSentUe ? (
                                            <tr><td colSpan={4} className="px-4 py-20 text-center"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" /></td></tr>
                                        ) : sentUe.length === 0 ? (
                                            <tr><td colSpan={4} className="px-4 py-20 text-center"><p className="font-body text-sm text-nebbia/30">{t('ue.nessuna_sentenza')}</p></td></tr>
                                        ) : sentUe.map(s => (
                                            <Fragment key={s.id}>
                                                <tr className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer" onClick={() => setSentUeAperta(sentUeAperta?.id === s.id ? null : s)}>
                                                    <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap align-top">
                                                        {s.numero_caso || s.celex_id || '—'}
                                                        {s.vigente === false && <span className="ml-2 font-body text-[10px] text-red-400/70 border border-red-400/20 px-1.5 py-0.5 uppercase">{t('ue.badge_non_vigente')}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                        <p className="line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenzia(s.oggetto || s.parti || t('ue.senza_oggetto'), cercaSentUe) }} />
                                                    </td>
                                                    <td className="px-4 py-3 font-body text-sm text-nebbia/50 whitespace-nowrap align-top">{s.data_decisione ?? '—'}</td>
                                                    <td className="px-4 py-3"><ChevronRight size={13} className={`text-nebbia/20 transition-transform ${sentUeAperta?.id === s.id ? 'rotate-90' : ''}`} /></td>
                                                </tr>
                                                {sentUeAperta?.id === s.id && (
                                                    <tr key={`${s.id}-d`} className="border-b border-white/5 bg-petrolio/20">
                                                        <td colSpan={4} className="px-4 py-4 space-y-3">
                                                            {s.parti && <div><p className="font-body text-[11px] text-salvia/60 uppercase tracking-wider mb-1">{t('ue.parti')}</p><p className="font-body text-sm text-nebbia/70">{s.parti}</p></div>}
                                                            {s.oggetto && <div><p className="font-body text-[11px] text-salvia/60 uppercase tracking-wider mb-1">{t('comune.oggetto')}</p><p className="font-body text-sm text-nebbia/70 leading-relaxed">{s.oggetto}</p></div>}
                                                            {s.relatore && <p className="font-body text-xs text-nebbia/40">{t('ue.relatore', { relatore: s.relatore })}</p>}
                                                            {Array.isArray(s.materia) && s.materia.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {s.materia.map((m, i) => <span key={i} className="font-body text-[11px] text-salvia/70 bg-salvia/5 border border-salvia/20 px-2 py-0.5">{m}</span>)}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <BottoniSalvataggio
                                                                    tipo="sentenza_ue"
                                                                    id={s.id}
                                                                    titolo={[s.numero_caso, s.oggetto].filter(Boolean).join(' — ')}
                                                                    testo={s.oggetto || s.parti || ''}
                                                                />
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'; navigate(`${prefix}/sentenza-ue/${s.id}`) }}
                                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto">
                                                                    {t('comune.apri_pagina_dedicata')} <ChevronRight size={11} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                                {pagineSentUe > 1 && (
                                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                        <p className="font-body text-xs text-nebbia/30">{t('comune.range_paginazione', { from: paginaSentUe * PER_PAGINA_UE + 1, to: Math.min((paginaSentUe + 1) * PER_PAGINA_UE, totaleSentUe), total: totaleSentUe.toLocaleString(dateLocale) })}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaSentUe(p => Math.max(0, p - 1))} disabled={paginaSentUe === 0} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.prec')}</button>
                                            <button onClick={() => setPaginaSentUe(p => Math.min(pagineSentUe - 1, p + 1))} disabled={paginaSentUe >= pagineSentUe - 1} className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">{t('comune.succ')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}