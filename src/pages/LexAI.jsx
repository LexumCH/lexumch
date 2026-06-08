// src/pages/LexAI.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import {
    ArrowRight, Sparkles, Search, FileText, Brain,
    Shield, Check, ChevronDown, Lock, X, BookOpen,
    Zap, AlertCircle, Scale, MessageSquare,
    Library, Gavel, Globe, FolderOpen, Briefcase
} from 'lucide-react'
import { supabase, supabaseUrl } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import LexAnimatedDemo from '@/components/LexAnimatedDemo'

// Mapping icone (l'ordine corrisponde agli array nel JSON)
const FEATURE_ICONS = [Search, FileText, MessageSquare, Brain]
const FONTI_ICONS = [Gavel, Scale, Globe, Library]

// ─── Scroll animation hook ───────────────────────────────────
function useInView(threshold = 0.12) {
    const ref = useRef(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setInView(true); obs.disconnect() }
        }, { threshold })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])
    return [ref, inView]
}

function FadeIn({ children, delay = 0, className = '' }) {
    const [ref, inView] = useInView()
    return (
        <div ref={ref} className={className} style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'translateY(24px)',
            transition: `opacity 0.75s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.75s cubic-bezier(.4,0,.2,1) ${delay}s`
        }}>
            {children}
        </div>
    )
}

function SectionLabel({ children, color = 'oro' }) {
    const c = color === 'salvia' ? 'text-salvia/70' : 'text-oro/60'
    return <p className={`font-body text-xs ${c} tracking-[0.3em] uppercase mb-3`}>{children}</p>
}

// ────────────────────────────────────────────────────────────────────
// LexBoxPublic — invariato, mantenuto per eventuale riuso
// ────────────────────────────────────────────────────────────────────
function LexBoxPublic() {
    const [utente, setUtente] = useState(null)
    const [crediti, setCrediti] = useState(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [conversazione, setConversazione] = useState([])
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const bottomRef = useRef(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtente(user)
            if (user) {
                supabase.from('crediti_ai')
                    .select('crediti_totali, crediti_usati, tipo')
                    .eq('user_id', user.id)
                    .or(`periodo_fine.is.null,periodo_fine.gte.${new Date().toISOString()}`)
                    .then(({ data }) => {
                        const totale = (data ?? []).reduce((acc, c) => acc + c.crediti_totali, 0);
                        const usati = (data ?? []).reduce((acc, c) => acc + c.crediti_usati, 0);
                        setCrediti({ crediti_totali: totale, crediti_usati: usati });
                    })
            }
            setLoadingAuth(false)
        })
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [conversazione, cercando])

    async function cerca() {
        if (!domanda.trim()) return
        const domandaCorrente = domanda
        setDomanda('')
        setCercando(true)
        setErrore(null)
        const nuovaConv = [...conversazione, { role: 'user', content: domandaCorrente }]
        setConversazione(nuovaConv)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${supabaseUrl}/functions/v1/lex-public`,
                {
                    method: 'POST',
                    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domanda: domandaCorrente, messaggi }),
                }
            )
            const json = await res.json()
            if (json.ok) {
                const convAggiornata = [...nuovaConv, { role: 'assistant', content: json.risposta }]
                setConversazione(convAggiornata)
                setMessaggi([...messaggi, { role: 'user', content: domandaCorrente }, { role: 'assistant', content: json.risposta }])
                if (json.crediti_rimasti !== undefined) {
                    setCrediti(prev => prev ? { ...prev, crediti_usati: (prev.crediti_totali - json.crediti_rimasti) } : prev)
                }
            } else if (json.crediti_esauriti) {
                setErrore('crediti_esauriti')
                setConversazione(conversazione)
            } else {
                setErrore(json.error ?? 'Errore nella ricerca')
                setConversazione(conversazione)
            }
        } catch (e) {
            setErrore(e.message)
            setConversazione(conversazione)
        } finally {
            setCercando(false)
        }
    }

    const creditiRimasti = crediti ? crediti.crediti_totali - crediti.crediti_usati : 0

    if (loadingAuth) return (
        <div className="flex items-center justify-center py-12">
            <span className="animate-spin w-5 h-5 border-2 border-salvia border-t-transparent rounded-full" />
        </div>
    )

    if (!utente) return (
        <div className="space-y-5">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 flex items-center justify-center border border-oro/30 bg-oro/10 mx-auto">
                    <Sparkles size={18} className="text-oro" />
                </div>
                <p className="font-display text-xl font-light text-nebbia">3 ricerche gratuite ti aspettano</p>
                <p className="font-body text-sm text-nebbia/40 max-w-sm mx-auto leading-relaxed">
                    Registrati in 30 secondi e inizia subito. Nessuna carta di credito richiesta.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/registrati"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.01]">
                    <Sparkles size={13} /> Prova gratis — 3 ricerche
                </Link>
                <Link to="/login"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                    Ho già un account
                </Link>
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
                {['Senza carta di credito', 'Fonti verificate', 'Risultati immediati'].map(t => (
                    <div key={t} className="flex items-center gap-1.5 font-body text-xs text-nebbia/25">
                        <Check size={10} className="text-salvia" />{t}
                    </div>
                ))}
            </div>
        </div>
    )

    if (errore === 'crediti_esauriti' || creditiRimasti <= 0) return (
        <div className="bg-slate border border-oro/20 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-petrolio/60">
                <Sparkles size={13} className="text-salvia" />
                <span className="font-body text-xs text-salvia">Lex AI</span>
            </div>
            <div className="p-8 text-center space-y-4">
                <p className="font-display text-xl font-light text-nebbia">Hai usato le 3 ricerche gratuite</p>
                <p className="font-body text-sm text-nebbia/45 max-w-sm mx-auto">
                    Per continuare puoi acquistare altri crediti o passare a Lexum completo.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/area-personale"
                        className="flex items-center gap-2 px-6 py-3 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-colors">
                        Acquista crediti
                    </Link>
                    <Link to="/per-avvocati"
                        className="flex items-center gap-2 px-6 py-3 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors">
                        Scopri Lexum completo <ArrowRight size={13} />
                    </Link>
                </div>
            </div>
        </div>
    )

    return (
        <div className="bg-slate border border-salvia/15 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-petrolio/60">
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-salvia" />
                    <span className="font-body text-xs text-salvia">Lex AI</span>
                    {conversazione.length > 0 && (
                        <span className="font-body text-xs text-salvia/40 border border-salvia/20 px-2 py-0.5">
                            {Math.floor(conversazione.length / 2)} scambi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-body text-xs text-nebbia/30">
                        {creditiRimasti} {creditiRimasti === 1 ? 'credito' : 'crediti'} rimasti
                    </span>
                    <Link to="/area-personale" className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors">
                        La mia area
                    </Link>
                </div>
            </div>

            {conversazione.length > 0 && (
                <div className="px-5 py-4 space-y-4 max-h-[500px] overflow-y-auto">
                    {conversazione.map((m, i) => (
                        <div key={i}>
                            <p className={`font-body text-xs mb-1.5 ${m.role === 'user' ? 'text-nebbia/30' : 'text-salvia/50'}`}>
                                {m.role === 'user' ? 'Tu' : 'Lex AI'}
                            </p>
                            {m.role === 'user' ? (
                                <div className="bg-petrolio border border-white/8 px-4 py-3">
                                    <p className="font-body text-sm text-nebbia/65">{m.content}</p>
                                </div>
                            ) : (
                                <div className="bg-salvia/5 border border-salvia/15 px-4 py-4">
                                    <div className="font-body text-sm text-nebbia/70 leading-relaxed">
                                        <ReactMarkdown
                                            components={{
                                                h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                                h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
                                                strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                                p: ({ children }) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                                                li: ({ children }) => <li className="text-sm text-nebbia/60">{children}</li>,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {cercando && (
                        <div className="flex items-center gap-2 text-nebbia/30">
                            <span className="animate-spin w-3 h-3 border-2 border-salvia border-t-transparent rounded-full" />
                            <span className="font-body text-xs">Lex sta cercando...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            <div className="px-5 py-4 border-t border-white/5 space-y-3">
                {conversazione.length === 0 && (
                    <p className="font-body text-xs text-nebbia/25">
                        Fai una domanda su una questione legale o carica un documento da analizzare.
                    </p>
                )}
                {errore && errore !== 'crediti_esauriti' && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} />{errore}
                    </p>
                )}
                <textarea
                    rows={3}
                    placeholder={conversazione.length > 0 ? 'Approfondisci o fai una nuova domanda...' : 'Es. Responsabilità del datore di lavoro in caso di infortunio...'}
                    value={domanda}
                    onChange={e => setDomanda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) cerca() }}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/20"
                />
                <button
                    onClick={cerca}
                    disabled={cercando || !domanda.trim()}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                >
                    {cercando
                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Ricerca in corso...</>
                        : <><Sparkles size={13} /> Cerca con Lex AI</>
                    }
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
export default function LexAI() {
    const { t } = useTranslation('lex_ai')
    const toArray = (val) => Array.isArray(val) ? val : []

    const featureItems = toArray(t('features.items', { returnObjects: true }))
    const featureDemoRefs = toArray(t('features.demo_refs', { returnObjects: true }))
    const fontiCards = toArray(t('fonti.cards', { returnObjects: true }))
    const ragionaSteps = toArray(t('ragiona.steps', { returnObjects: true }))
    const ragionaBlocks = toArray(t('ragiona.blocks', { returnObjects: true }))
    const ragionaChips = toArray(t('ragiona.chips', { returnObjects: true }))
    const genericaItems = toArray(t('diversa.generica_items', { returnObjects: true }))
    const lexItems = toArray(t('diversa.lex_items', { returnObjects: true }))
    const puoFaItems = toArray(t('puo.fa_items', { returnObjects: true }))
    const puoNonFaItems = toArray(t('puo.nonfa_items', { returnObjects: true }))
    const upsellAvvItems = toArray(t('upsell.avvocati_items', { returnObjects: true }))
    const upsellFidItems = toArray(t('upsell.fiduciari_items', { returnObjects: true }))

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta name="description" content={t('meta.description')} />
                <link rel="canonical" href="https://www.lexum.ch/lex-ai" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.ch/lex-ai" />
                <meta property="og:title" content={t('meta.og_title')} />
                <meta property="og:description" content={t('meta.og_description')} />
                <meta property="og:image" content="https://www.lexum.ch/logo.png" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={t('meta.og_title')} />
                <meta name="twitter:description" content={t('meta.twitter_description')} />
                <meta name="twitter:image" content="https://www.lexum.ch/logo.png" />
            </Helmet>

            {/* 1. HERO + BOX ANIMATO */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-10">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-salvia/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-oro/[0.03] rounded-full blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(#7FA39A 1px, transparent 1px), linear-gradient(90deg, #7FA39A 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-6 w-full" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-salvia/25 bg-salvia/5">
                            <Sparkles size={11} className="text-salvia" />
                            <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
                        </div>
                    </div>

                    {/* Titolo */}
                    <div className="max-w-3xl mx-auto text-center mb-10">
                        <h1 className="font-display text-5xl md:text-6xl font-light text-nebbia leading-[1.1] mb-5">
                            {t('hero.title_part1')}
                            <br />
                            <span className="text-salvia">{t('hero.title_highlight')}</span>
                        </h1>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-xl mx-auto">
                            {t('hero.subtitle')}
                        </p>
                    </div>

                    {/* Box animato */}
                    <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-petrolio/60">
                            <div className="flex items-center gap-2">
                                <Sparkles size={13} className="text-salvia" />
                                <span className="font-body text-xs text-salvia">Lex AI</span>
                                <div className="flex items-center gap-1.5 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                    <span className="font-body text-xs text-nebbia/25">{t('hero.box_status')}</span>
                                </div>
                            </div>
                            <span className="font-body text-xs text-nebbia/25">{t('hero.box_session')}</span>
                        </div>
                        <div className="p-6">
                            <LexAnimatedDemo />
                        </div>
                    </div>

                    <p className="text-center font-body text-xs text-nebbia/20 mt-16">
                    </p>
                </div>

                <a href="#cosa-fa" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* 2. COSA FA */}
            <section id="cosa-fa" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel color="salvia">{t('features.label')}</SectionLabel>
                            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
                                {t('features.title_part1')}{' '}
                                <span className="text-salvia">{t('features.title_highlight')}</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-8">
                                {t('features.intro')}
                            </p>
                            <div className="space-y-4">
                                {featureItems.map((item, i) => {
                                    const I = FEATURE_ICONS[i]
                                    return (
                                        <FadeIn key={i} delay={i * 0.08}>
                                            <div className="flex gap-4">
                                                <div className="w-9 h-9 flex items-center justify-center border border-salvia/25 bg-salvia/5 shrink-0">
                                                    {I && <I size={15} className="text-salvia" />}
                                                </div>
                                                <div>
                                                    <p className="font-body text-sm font-medium text-nebbia mb-1">{item.t}</p>
                                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{item.d}</p>
                                                </div>
                                            </div>
                                        </FadeIn>
                                    )
                                })}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-salvia/15 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                                    <Sparkles size={12} className="text-salvia" />
                                    <span className="font-body text-xs text-salvia">Lex AI</span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                        <span className="font-body text-xs text-nebbia/25">{t('hero.box_status')}</span>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                                        <p className="font-body text-xs text-nebbia/40 mb-1">{t('features.demo_user')}</p>
                                        <p className="font-body text-sm text-nebbia/65">
                                            {t('features.demo_question')}
                                        </p>
                                    </div>
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-4 space-y-3">
                                        <p className="font-body text-xs text-salvia/60">Lex AI</p>
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                            {t('features.demo_intro')}
                                        </p>
                                        <div className="space-y-1.5">
                                            {featureDemoRefs.map(ref => (
                                                <div key={ref} className="flex items-start gap-2 font-body text-xs text-nebbia/50">
                                                    <div className="w-1 h-1 bg-salvia rounded-full shrink-0 mt-1.5" />{ref}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="font-body text-xs text-nebbia/40 leading-relaxed pt-1 border-t border-white/5">
                                            {t('features.demo_followup')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* 3. SU QUALI FONTI LAVORA */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel>{t('fonti.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('fonti.title_part1')}{' '}
                            <span className="text-oro">{t('fonti.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            {t('fonti.subtitle')}
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {fontiCards.map((card, i) => {
                            const Icon = FONTI_ICONS[i]
                            return (
                                <FadeIn key={i} delay={i * 0.08}>
                                    <div className="h-full bg-slate border border-white/5 p-6 hover:border-oro/15 transition-colors group">
                                        <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4 group-hover:bg-oro/10 transition-colors">
                                            {Icon && <Icon size={17} />}
                                        </div>
                                        <p className="font-body text-sm font-medium text-nebbia mb-2">{card.t}</p>
                                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">{card.d}</p>
                                    </div>
                                </FadeIn>
                            )
                        })}
                    </div>

                    <FadeIn delay={0.4}>
                        <div className="mt-8 bg-oro/5 border border-oro/15 p-5 flex items-center gap-3 max-w-3xl mx-auto">
                            <Library size={14} className="text-oro shrink-0" />
                            <p className="font-body text-sm text-nebbia/55 leading-relaxed">
                                <span className="text-oro/80 font-medium">{t('fonti.highlight_strong')}</span>{t('fonti.highlight_text')}
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* 4. COME RAGIONA */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('ragiona.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('ragiona.title_part1')}{' '}
                            <span className="text-salvia">{t('ragiona.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            {t('ragiona.subtitle')}
                        </p>
                    </FadeIn>

                    <FadeIn delay={0.2}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* Etichette laterali */}
                            <div className="lg:col-span-3 space-y-3">
                                {ragionaSteps.map((step, i) => (
                                    <FadeIn key={i} delay={0.1 + i * 0.08}>
                                        <div className="flex gap-3 p-3 bg-slate border border-white/5">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/25 bg-salvia/5 text-salvia font-body text-[10px] shrink-0">
                                                {step.n}
                                            </div>
                                            <div>
                                                <p className="font-body text-xs font-medium text-nebbia/80 mb-0.5">{step.t}</p>
                                                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed">{step.d}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>

                            {/* Mockup risposta annotata */}
                            <div className="lg:col-span-9">
                                <div className="bg-slate border border-salvia/15 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                                        <Sparkles size={12} className="text-salvia" />
                                        <span className="font-body text-xs text-salvia">{t('ragiona.demo_label')}</span>
                                    </div>
                                    <div className="p-5 space-y-4">

                                        {/* Domanda */}
                                        <div className="bg-petrolio border border-white/8 px-4 py-3">
                                            <p className="font-body text-xs text-nebbia/40 mb-1">{t('ragiona.demo_user')}</p>
                                            <p className="font-body text-sm text-nebbia/65">
                                                {t('ragiona.demo_question')}
                                            </p>
                                        </div>

                                        {/* Risposta strutturata con annotazioni */}
                                        <div className="bg-salvia/5 border border-salvia/15 p-5 space-y-4">
                                            {ragionaBlocks.map((block, i) => (
                                                <div key={i} className="relative">
                                                    <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                                                    <div className="pl-4">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">{block.tag}</span>
                                                        </div>
                                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                            {block.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Chip fonti citate */}
                                            <div className="flex gap-1 flex-wrap pt-3 border-t border-white/5">
                                                {ragionaChips.map(c => (
                                                    <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/40">{c}</span>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* 5. DIVERSA DA UNA AI GENERICA */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn delay={0.1}>
                            <div className="space-y-4">
                                <div className="bg-slate border border-white/5 p-5 opacity-50">
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">{t('diversa.generica_label')}</p>
                                    <ul className="space-y-2">
                                        {genericaItems.map(item => (
                                            <li key={item} className="flex items-center gap-2 font-body text-xs text-nebbia/30">
                                                <X size={10} className="text-red-400/50 shrink-0" />{item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate border border-salvia/20 p-5">
                                    <p className="font-body text-xs text-salvia/60 uppercase tracking-widest mb-3">Lex AI</p>
                                    <ul className="space-y-2">
                                        {lexItems.map(item => (
                                            <li key={item} className="flex items-center gap-2 font-body text-xs text-nebbia/60">
                                                <Check size={10} className="text-salvia shrink-0" />{item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-salvia/5 border border-salvia/15 p-4 text-center">
                                    <p className="font-body text-sm text-salvia/80">{t('diversa.tagline')}</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn>
                            <SectionLabel color="salvia">{t('diversa.label')}</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                {t('diversa.title_part1')}{' '}
                                <span className="text-salvia">{t('diversa.title_highlight')}</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                {t('diversa.text1')}
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                {t('diversa.text2')}
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* 6. COSA PUÒ E COSA NON PUÒ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel>{t('puo.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('puo.title')}
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            {t('puo.subtitle')}
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FadeIn delay={0.1}>
                            <div className="bg-slate border border-salvia/15 p-6 h-full">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-salvia/25 bg-salvia/10">
                                        <Check size={13} className="text-salvia" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">{t('puo.fa_label')}</p>
                                </div>
                                <ul className="space-y-3">
                                    {puoFaItems.map(item => (
                                        <li key={item} className="flex items-center gap-2.5 font-body text-sm text-nebbia/60">
                                            <div className="w-1.5 h-1.5 rounded-full bg-salvia shrink-0" />{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-white/5 p-6 h-full">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-nebbia/15 bg-nebbia/[0.02]">
                                        <X size={13} className="text-nebbia/40" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">{t('puo.nonfa_label')}</p>
                                </div>
                                <ul className="space-y-3">
                                    {puoNonFaItems.map(item => (
                                        <li key={item} className="flex items-center gap-2.5 font-body text-sm text-nebbia/45">
                                            <div className="w-1.5 h-1.5 rounded-full bg-nebbia/20 shrink-0" />{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>
                    </div>

                    <FadeIn delay={0.3}>
                        <p className="text-center font-body text-sm text-salvia/70 italic mt-8">
                            {t('puo.footer')}
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* 7. UPSELL LEXUM — avvocati + fiduciari */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <div className="bg-slate border border-oro/20 p-8 md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                            <div className="relative">
                                <div className="max-w-2xl mb-8">
                                    <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-3">{t('upsell.label')}</p>
                                    <h2 className="font-display text-3xl font-light text-nebbia mb-4">
                                        {t('upsell.title_part1')}{' '}
                                        <span className="text-oro">{t('upsell.title_highlight')}</span>
                                    </h2>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-3">
                                        {t('upsell.text')}
                                    </p>
                                    <p className="font-body text-xs text-nebbia/30 italic">
                                        {t('upsell.note')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Colonna Avvocati */}
                                    <div className="bg-petrolio/40 border border-oro/15 p-6 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-oro/25 bg-oro/10 text-oro shrink-0">
                                                <Scale size={15} />
                                            </div>
                                            <p className="font-body text-sm font-medium text-nebbia">{t('upsell.avvocati_label')}</p>
                                        </div>
                                        <div className="space-y-2 mb-6 flex-1">
                                            {upsellAvvItems.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <Check size={12} className="text-oro shrink-0 mt-0.5" />
                                                    <span className="font-body text-sm text-nebbia/60 leading-snug">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Link to="/per-avvocati" className="flex items-center justify-center gap-2 w-full py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                                            {t('upsell.avvocati_cta')} <ArrowRight size={14} />
                                        </Link>
                                    </div>

                                    {/* Colonna Fiduciari */}
                                    <div className="bg-petrolio/40 border border-salvia/15 p-6 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/25 bg-salvia/10 text-salvia shrink-0">
                                                <Briefcase size={15} />
                                            </div>
                                            <p className="font-body text-sm font-medium text-nebbia">{t('upsell.fiduciari_label')}</p>
                                        </div>
                                        <div className="space-y-2 mb-6 flex-1">
                                            {upsellFidItems.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <Check size={12} className="text-salvia shrink-0 mt-0.5" />
                                                    <span className="font-body text-sm text-nebbia/60 leading-snug">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Link to="/per-fiduciari" className="flex items-center justify-center gap-2 w-full py-3 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-colors">
                                            {t('upsell.fiduciari_cta')} <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* 8. CTA FINALE */}
            <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-salvia/25 to-transparent" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, #7FA39A, transparent 65%)'
                    }} />
                </div>

                <div className="max-w-2xl mx-auto text-center relative">
                    <FadeIn>
                        <div className="w-12 h-12 flex items-center justify-center border border-salvia/30 bg-salvia/10 mx-auto mb-8">
                            <Sparkles size={20} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-4">
                            {t('cta.title')}
                        </h2>
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-salvia/50 to-transparent mx-auto my-6" />
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-10 max-w-lg mx-auto">
                            {t('cta.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-all hover:scale-[1.02] shadow-xl shadow-salvia/20">
                                {t('cta.cta_primary')} <ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                                {t('cta.secondary_link')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/20 max-w-sm mx-auto">
                            {t('cta.footnote')}
                        </p>
                    </FadeIn>
                </div>
            </section>

            <style>{`
                @keyframes heroIn {
                    from { opacity: 0; transform: translateY(40px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}