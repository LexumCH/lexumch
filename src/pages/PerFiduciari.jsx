// src/pages/PerFiduciari.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Vetrina per fiduciari svizzeri.
// Stesso design system di PerAvvocati (palette petrolio/oro/salvia,
// FadeIn / VisualBlock / FeatureRow), contenuto adattato al fiduciario:
//   - unità di lavoro = MANDATO (non pratica)
//   - cuore: Lex AI compila/genera atti dai DATI dell'azienda cliente
//   - fatturazione: il fiduciario fattura le proprie prestazioni (CHF, IVA 8.1%)
//   - banca dati: corpus CH (Fedlex, prassi AFC/cantonale, norme tributarie, TF)
//   - multi-accesso spostato in basso (molti fiduciari lavorano in singolo)
//   - NIENTE monetizzazione sentenze (il fiduciario non produce sentenze)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, BookOpen, Users, Sparkles,
    Check, ChevronDown, Brain, Star, Zap,
    FileText, FileSignature, Calendar, FolderOpen, Search,
    EyeOff, UserCheck, Briefcase, CreditCard,
    Bookmark, FolderSearch, Scale, ShieldCheck, Activity,
    Library, Receipt, Calculator, BarChart3, Building2,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

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

// VisualBlock con cornice tipo finestra
function VisualBlock({ label, children, accent = 'oro' }) {
    const border = accent === 'salvia' ? 'border-salvia/15' : 'border-oro/15'
    return (
        <div className={`bg-slate border ${border} overflow-hidden`}>
            <div className="px-4 py-2.5 border-b border-white/5 bg-petrolio/40 flex items-center gap-2">
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="font-body text-xs text-nebbia/25 ml-2">{label}</span>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    )
}

// FeatureRow generica per le sezioni che alternano testo/visual
function FeatureRow({ icon: Icon, title, text, points, reverse = false, accent = 'oro', children }) {
    const ic = accent === 'salvia' ? 'text-salvia bg-salvia/10 border-salvia/20' : 'text-oro bg-oro/10 border-oro/20'
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <FadeIn delay={0.1} className={reverse ? 'lg:order-2' : ''}>
                <div className="space-y-4">
                    <div className={`w-10 h-10 flex items-center justify-center border ${ic}`}>
                        <Icon size={18} />
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">{title}</h3>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">{text}</p>
                    {points && (
                        <ul className="space-y-2 pt-2">
                            {points.map((p, i) => (
                                <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                    <div className={`w-1 h-1 rounded-full shrink-0 ${accent === 'salvia' ? 'bg-salvia' : 'bg-oro'}`} />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </FadeIn>
            <FadeIn delay={0.2} className={reverse ? 'lg:order-1' : ''}>
                {children}
            </FadeIn>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
export default function PerFiduciari() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>Lexum per Fiduciari — L'AI che compila atti, report e pareri dai dati dei tuoi clienti</title>
                <meta
                    name="description"
                    content="Gestione mandati, calendario delle scadenze fiscali, archivio intelligente, fatturazione in CHF e Lex AI che compila lettere, report e pareri partendo dai dati reali delle aziende che segui. Più la banca dati legale svizzera."
                />
                <link rel="canonical" href="https://www.lexum.ch/fiduciari" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.ch/fiduciari" />
                <meta property="og:title" content="Lexum per Fiduciari — L'assistente che compila dai tuoi dati" />
                <meta
                    property="og:description"
                    content="Mandati, scadenze fiscali, archivio intelligente, fatturazione e un'AI che genera documenti partendo dai dati reali dei tuoi clienti. Più la banca dati legale svizzera."
                />
                <meta property="og:image" content="https://www.lexum.ch/logo.png" />
                <meta property="og:locale" content="it_CH" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Lexum per Fiduciari" />
                <meta
                    name="twitter:description"
                    content="L'AI che compila atti, report e pareri dai dati delle aziende che segui. Per fiduciari svizzeri."
                />
                <meta name="twitter:image" content="https://www.lexum.ch/logo.png" />
            </Helmet>

            {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
            <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pb-12">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-salvia/[0.04] rounded-full blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(#C9A45C 1px, transparent 1px), linear-gradient(90deg, #C9A45C 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-6 text-center" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-8">
                        <Star size={11} className="text-oro/60" />
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Per studi fiduciari e fiduciari indipendenti</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        Tu fornisci i dati,<br />
                        <span className="text-oro-shimmer">Lexum compila il resto.</span>
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        Mandati, scadenze fiscali, archivio intelligente, fatturazione e un'AI che
                        genera lettere, report e pareri partendo dai dati reali delle aziende che segui.
                        Più la banca dati legale svizzera. Tutto in un unico ambiente.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            Prova Lexum una settimana <ArrowRight size={15} />
                        </Link>
                        <Link to="/registrati" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            Richiedi una call dimostrativa
                        </Link>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        Nessuna carta richiesta. Cancellazione libera.
                    </p>
                </div>

                <a href="#lex-ai" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ══════════════════════════════════════════
          2. LEX AI — IL CUORE
      ══════════════════════════════════════════ */}
            <section id="lex-ai" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>

                <div className="max-w-5xl mx-auto relative">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Intelligenza artificiale</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Le dai i dati,{' '}
                            <span className="text-salvia">lei scrive il documento.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Lex non inventa numeri e non improvvisa. Prende i dati reali dell'azienda che segui —
                            cifre, bilanci, dati del mandato — e compila il documento finito: lettere, report,
                            pareri, comunicazioni. Tu controlli e firmi. Il lavoro pesante di scrittura lo fa lei.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <FadeIn delay={0.1}>
                            <div className="space-y-3">
                                {[
                                    { icon: FileSignature, t: 'Atti e lettere compilati dai tuoi dati', d: 'Lettere accompagnatorie, comunicazioni ai clienti, solleciti. Inserisci i dati del mandato e Lex produce il testo pronto da rivedere.' },
                                    { icon: BarChart3, t: 'Report periodici per il cliente', d: 'Dai a Lex le cifre dell\'azienda e genera il report mensile o trimestrale: andamento, commenti, sintesi. I numeri sono i tuoi, le parole le scrive lei.' },
                                    { icon: Scale, t: 'Pareri fiscali scritti', d: 'Imposti la questione e i dati del caso, Lex redige un parere argomentato con riferimenti a norme e prassi svizzere pertinenti.' },
                                    { icon: Search, t: 'Ricerca su norme, prassi e giurisprudenza', d: 'Cerca su Fedlex, prassi AFC e cantonale e giurisprudenza fiscale con linguaggio naturale. Lex capisce il contesto e cita le fonti.' },
                                    { icon: Brain, t: 'Conversazione continua', d: 'Approfondisci, correggi un dato, chiedi una versione più sintetica. Lex ricorda il contesto del mandato e della conversazione.' },
                                    { icon: Building2, t: 'Contesto azienda sempre presente', d: 'Lex lavora sul mandato: conosce l\'azienda, i documenti caricati e le ricerche già fatte. Niente da rispiegare ogni volta.' },
                                ].map(({ icon: I, t, d }, i) => (
                                    <FadeIn key={i} delay={0.1 + i * 0.06}>
                                        <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                                                <I size={13} className="text-salvia" />
                                            </div>
                                            <div>
                                                <p className="font-body text-sm font-medium text-nebbia mb-0.5">{t}</p>
                                                <p className="font-body text-xs text-nebbia/35 leading-relaxed">{d}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <VisualBlock label="Lex AI — Genera documento" accent="salvia">
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <div className="max-w-[88%] bg-petrolio/60 border border-white/5 p-3">
                                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                Per il mandato Müller AG, prepara la lettera di accompagnamento al rendiconto IVA del 2° trimestre. Imposta dovuta CHF 4.820.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[92%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                <Sparkles size={10} /> Lex AI
                                            </p>
                                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                Ho redatto la lettera usando i dati del mandato Müller AG e l'importo che mi hai indicato (CHF 4.820). Ho richiamato il termine di versamento e allegato il riferimento al rendiconto. La cifra è quella che mi hai fornito: ho solo scritto il testo attorno. Pronta per la tua revisione e firma.
                                            </p>
                                            <div className="flex gap-1 pt-1 flex-wrap">
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Müller AG</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">IVA Q2</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia/80">Lettera.docx</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                        <ShieldCheck size={11} className="text-oro shrink-0 mt-0.5" />
                                        <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                            I numeri restano i tuoi. Lex non li ricalcola e non li inventa: scrive il documento attorno ai dati che fornisci.
                                        </p>
                                    </div>
                                </div>
                            </VisualBlock>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          3. MANDATI
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Mandati</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Ogni azienda che segui,{' '}
                            <span className="text-oro">un mandato ordinato.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Anagrafica dell'azienda, documenti, scadenze, ricerche e documenti generati:
                            tutto raccolto nel mandato. Apri il cliente e hai il quadro completo, senza
                            rincorrere cartelle e mail.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={FolderOpen}
                        title="Il mandato tiene insieme tutto il lavoro sul cliente"
                        text="Per ogni azienda seguita raccogli anagrafica, documenti contabili e fiscali, scadenze e tutto ciò che Lex ha generato per quel cliente. Le ricerche che fai e i documenti che produci restano collegati al mandato, sempre ritrovabili."
                        points={[
                            'Anagrafica azienda e dati del mandato',
                            'Documenti del cliente collegati',
                            'Ricerche e documenti generati agganciati al mandato',
                            'Storico ordinato, sempre consultabile',
                        ]}
                    >
                        <VisualBlock label="Mandato — Müller AG">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {[
                                        { l: 'Tipo', v: 'Persona giuridica (SA)' },
                                        { l: 'Mandato', v: 'Contabilità + fiscale', c: 'text-oro' },
                                        { l: 'Cantone', v: 'Ticino' },
                                        { l: 'Stato', v: 'Attivo', c: 'text-salvia' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">Documenti del mandato</p>
                                    <div className="space-y-1.5">
                                        {[
                                            { t: 'Bilancio 2025', tag: 'Contabilità', col: 'oro' },
                                            { t: 'Rendiconto IVA Q1 2026', tag: 'Fiscale', col: 'salvia' },
                                            { t: 'Conteggio oneri sociali', tag: 'Salari', col: 'salvia' },
                                        ].map(({ t, tag, col }) => (
                                            <div key={t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <FileText size={10} className={col === 'oro' ? 'text-oro' : 'text-salvia'} />
                                                <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{t}</span>
                                                <span className={`font-body text-[9px] px-1.5 py-0.5 border ${col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          4. CALENDARIO / SCADENZE FISCALI
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={Calendar}
                        title="Le scadenze fiscali sotto controllo, mandato per mandato"
                        text="Un unico calendario per tutti i tuoi clienti. Termini delle dichiarazioni, rendiconti IVA, versamenti degli oneri sociali, chiusure contabili: ogni scadenza è collegata al mandato di riferimento, con il promemoria al momento giusto."
                        points={[
                            'Termini dichiarazioni e rendiconti IVA',
                            'Scadenze oneri sociali e chiusure',
                            'Eventi collegati al mandato',
                            'Promemoria automatici prima della scadenza',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Calendario — Scadenze in arrivo" accent="salvia">
                            <div className="space-y-1.5">
                                {[
                                    { d: '30 giu', t: 'Rendiconto IVA Q2', sub: 'Müller AG', col: 'oro' },
                                    { d: '15 lug', t: 'Versamento oneri sociali', sub: 'Rossi Sagl', col: 'salvia' },
                                    { d: '31 lug', t: 'Chiusura contabile semestrale', sub: 'Bianchi SA', col: 'salvia' },
                                    { d: '30 set', t: 'Termine dichiarazione imposte', sub: 'Müller AG', col: 'oro' },
                                ].map(({ d, t, sub, col }) => (
                                    <div key={t} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                        <div className={`font-body text-[10px] font-medium px-2 py-1 border shrink-0 text-center ${col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>{d}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-[11px] text-nebbia/70 truncate">{t}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{sub}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <Zap size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Promemoria attivo: ti avvisiamo prima di ogni scadenza, mandato per mandato.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          5. ARCHIVIO INTELLIGENTE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={FolderSearch}
                        title="L'archivio dei tuoi mandati diventa intelligente"
                        text="Carichi i documenti dei clienti, Lex li classifica e li ritrova quando servono. Cerchi con linguaggio naturale e trovi non solo il file giusto, ma il punto preciso del documento che ti interessa. Il faldone cartaceo resta in armadio, il lavoro vero resta digitale."
                        points={[
                            'Documenti collegati al mandato',
                            'Ricerca semantica nel testo',
                            'Classificazione automatica',
                            'Tutto ritrovabile in pochi secondi',
                        ]}
                    >
                        <VisualBlock label="Ricerca nell'archivio">
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <div className="w-full bg-petrolio/60 border border-white/10 text-nebbia/60 font-body text-xs pl-8 pr-3 py-2.5">
                                        rendiconto IVA secondo trimestre Müller
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        { t: 'Rendiconto IVA Q2 2026 — Müller AG', m: 'Corrispondenza nel testo · pag. 1', s: '98%' },
                                        { t: 'Lettera AFC rimborso IVA 2025', m: 'Documento collegato', s: '74%' },
                                        { t: 'Bilancio 2025 — Müller AG', m: 'Riferimento IVA a credito', s: '61%' },
                                    ].map(({ t, m, s }) => (
                                        <div key={t} className="flex items-center gap-2 p-2.5 bg-petrolio/50 border border-white/5">
                                            <FileText size={11} className="text-oro shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-[11px] text-nebbia/70 truncate">{t}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{m}</p>
                                            </div>
                                            <span className="font-body text-[10px] text-salvia/70 shrink-0">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          6. FATTURAZIONE (CHF, IVA 8.1%)
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Fatturazione</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Fatturi le tue prestazioni,{' '}
                            <span className="text-oro">senza uscire da Lexum.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Le fatture per i tuoi onorari nascono collegate al mandato e al cliente.
                            Calcolo automatico dell'IVA svizzera, numerazione progressiva, PDF pronto.
                            Lo scadenzario ti dice chi ha pagato e chi no.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Receipt}
                        title="Fatture professionali in CHF, già pronte"
                        text="Ogni fattura è collegata a un mandato e a un cliente. Lexum calcola automaticamente l'IVA svizzera all'8.1% (o gestisce le prestazioni esenti) e tiene la numerazione progressiva per anno. Il PDF è generato in formato svizzero, pronto per il cliente e per la tua contabilità."
                        points={[
                            'Importi in CHF, IVA svizzera 8.1%',
                            'Gestione prestazioni esenti / aliquote ridotte',
                            'Numerazione progressiva annuale',
                            'PDF in formato svizzero, archiviato nel mandato',
                        ]}
                    >
                        <VisualBlock label="Fattura 2026/048 — Müller AG">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div>
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Numero</p>
                                        <p className="font-body text-sm text-nebbia">2026/048</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Data</p>
                                        <p className="font-body text-sm text-nebbia">15.05.2026</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Prestazioni</p>
                                    {[
                                        { d: 'Tenuta contabilità Q1 2026', i: '1\u2019800.00' },
                                        { d: 'Rendiconto IVA trimestrale', i: '450.00' },
                                        { d: 'Consulenza fiscale', i: '600.00' },
                                    ].map(({ d, i }) => (
                                        <div key={d} className="flex justify-between p-2 bg-petrolio/50 border border-white/5">
                                            <span className="font-body text-[11px] text-nebbia/65 truncate">{d}</span>
                                            <span className="font-body text-[11px] text-nebbia/65 shrink-0 ml-2">CHF {i}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1 pt-2 border-t border-white/5">
                                    {[
                                        { l: 'Imponibile', v: '2\u2019850.00', c: 'text-nebbia/55' },
                                        { l: 'IVA 8.1%', v: '230.85', c: 'text-nebbia/50' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="flex justify-between text-[11px]">
                                            <span className={`font-body ${c}`}>{l}</span>
                                            <span className={`font-body ${c}`}>CHF {v}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 mt-1 border-t border-white/5">
                                        <span className="font-body text-xs text-nebbia/70">Totale fattura</span>
                                        <span className="font-body text-sm text-oro font-medium">CHF 3\u2019080.85</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <FileText size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55">
                                        PDF generato e archiviato in <span className="text-oro/80">Mandato &gt; Müller AG &gt; Fatture</span>
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Grid 3 colonne: scadenzario, pagamenti, promemoria */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">

                        <FadeIn delay={0.1}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <Activity size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">Scadenzario sotto controllo</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    Vedi a colpo d'occhio chi deve pagare, cosa è scaduto, cosa è in arrivo. Stati colorati per ogni fattura: in attesa, pagata, scaduta.
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-salvia rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">Pagata</span>
                                        <span className="font-body text-[11px] text-nebbia/30 ml-auto">CHF 6\u2019400</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-oro rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">In attesa</span>
                                        <span className="font-body text-[11px] text-nebbia/30 ml-auto">CHF 3\u2019080</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">Scaduta</span>
                                        <span className="font-body text-[11px] text-red-400/70 ml-auto">CHF 1\u2019250</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.15}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <CreditCard size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">Pagamenti tracciati</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    Acconti e saldi, bonifici e versamenti. Ogni incasso è registrato sulla fattura giusta e lo stato si aggiorna da solo quando il saldo è completo.
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    {[
                                        { l: 'Bonifico', d: '12.03', i: '1\u2019800.00' },
                                        { l: 'Bonifico', d: '20.04', i: '800.00' },
                                        { l: 'Saldo da incassare', d: '—', i: '480.85', open: true },
                                    ].map(({ l, d, i, open }) => (
                                        <div key={l + d} className="flex items-center justify-between gap-2">
                                            <span className={`font-body text-[11px] ${open ? 'text-oro' : 'text-nebbia/50'}`}>{l}</span>
                                            <span className={`font-body text-[10px] ${open ? 'text-oro/60' : 'text-nebbia/30'}`}>{d}</span>
                                            <span className={`font-body text-[11px] ${open ? 'text-oro' : 'text-nebbia/50'}`}>CHF {i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <Zap size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">Promemoria automatici</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    Lexum ti avvisa prima della scadenza e il giorno in cui una fattura va in ritardo. Niente più solleciti dimenticati.
                                </p>
                                <div className="space-y-2 pt-3 border-t border-white/5">
                                    <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-oro rounded-full mt-1.5 shrink-0" />
                                        <div>
                                            <p className="font-body text-[11px] text-nebbia/55">Tra 3 giorni</p>
                                            <p className="font-body text-[10px] text-nebbia/30">Fattura 2026/048 — Müller AG</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                        <div>
                                            <p className="font-body text-[11px] text-red-400/80">Scaduta oggi</p>
                                            <p className="font-body text-[10px] text-nebbia/30">Fattura 2026/041 — Rossi Sagl</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                    </div>

                    {/* Lex sui pagamenti */}
                    <FadeIn delay={0.25} className="mt-16">
                        <div className="bg-slate border border-salvia/15 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-salvia/[0.04] rounded-full blur-3xl pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/10 text-salvia">
                                        <Sparkles size={18} />
                                    </div>
                                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                                        Chiedi a Lex{' '}
                                        <span className="text-salvia">chi non ha ancora pagato.</span>
                                    </h3>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                        Chiedi in italiano «quali fatture sono scadute da più di trenta giorni?»
                                        o «quanto mi deve ancora il cliente Müller?» e ricevi la risposta in pochi
                                        secondi, con il link diretto alle fatture.
                                    </p>
                                    <ul className="space-y-2 pt-2">
                                        {[
                                            'Domande in linguaggio naturale',
                                            'Risposte immediate con i numeri',
                                            'Link diretti alle fatture rilevanti',
                                            'Nessun report da generare, nessun filtro',
                                        ].map((p, i) => (
                                            <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                                <div className="w-1 h-1 bg-salvia rounded-full shrink-0" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <VisualBlock label="Lex su pagamenti" accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    Quali clienti hanno fatture scadute da più di 30 giorni?
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                                <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                    <Sparkles size={10} /> Lex AI
                                                </p>
                                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                    Ho trovato 2 fatture scadute da oltre 30 giorni, per un totale di CHF 3'050.00.
                                                </p>
                                                <div className="space-y-1 pt-1">
                                                    <div className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                        <div>
                                                            <p className="font-body text-[11px] text-nebbia/70">Rossi Sagl — 2026/041</p>
                                                            <p className="font-body text-[10px] text-red-400/70">Scaduta da 42 giorni</p>
                                                        </div>
                                                        <span className="font-body text-[11px] text-nebbia/70">CHF 1'250.00</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                        <div>
                                                            <p className="font-body text-[11px] text-nebbia/70">Bianchi SA — 2026/035</p>
                                                            <p className="font-body text-[10px] text-red-400/70">Scaduta da 35 giorni</p>
                                                        </div>
                                                        <span className="font-body text-[11px] text-nebbia/70">CHF 1'800.00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </VisualBlock>
                            </div>
                        </div>
                    </FadeIn>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          7. MULTI-ACCESSO / TEAM  (spostato qui: molti fiduciari lavorano in singolo)
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Quando lo studio cresce</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Lavori da solo oggi,{' '}
                            <span className="text-oro">in team domani.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Lexum funziona perfettamente per il fiduciario indipendente. E quando aggiungi
                            collaboratori, hai ruoli, permessi e compartimentazione dei mandati: ognuno vede
                            solo ciò che gli compete.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title="Tu decidi chi vede quali mandati"
                        text="Ogni collaboratore ha il suo profilo. Tu scegli chi accede a tutti i mandati e chi vede solo quelli assegnati. I dati dei clienti restano protetti, anche all'interno del team. Lavori in singolo? Tutto resta tuo, senza configurazioni inutili."
                        points={[
                            'Ruoli e permessi configurabili',
                            'Visibilità mandati per singolo collaboratore',
                            'Compartimentazione dei dati clienti',
                            'Audit interno: chi ha visto e modificato cosa',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Studio — Collaboratori e permessi">
                            <div className="space-y-2">
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">Team studio</p>
                                {[
                                    { nome: 'Anna Keller', ruolo: 'Titolare', avatar: 'AK', accesso: 'Tutto', accessoColor: 'oro' },
                                    { nome: 'Luca Ferrari', ruolo: 'Fiduciario', avatar: 'LF', accesso: 'Mandati assegnati', accessoColor: 'salvia' },
                                    { nome: 'Sara Moretti', ruolo: 'Contabile', avatar: 'SM', accesso: 'Contabilità e documenti', accessoColor: 'salvia' },
                                ].map(({ nome, ruolo, avatar, accesso, accessoColor }) => (
                                    <div key={nome} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                        <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro font-body text-[10px] font-medium shrink-0">
                                            {avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-xs text-nebbia/70 truncate">{nome}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{ruolo}</p>
                                        </div>
                                        <span className={`font-body text-[10px] px-2 py-0.5 border shrink-0 ${accessoColor === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>
                                            {accesso}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <ShieldCheck size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Compartimentazione attiva: 3 collaboratori, 2 livelli di accesso, mandati segmentati.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          8. BANCA DATI CH
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={BookOpen}
                        title="La banca dati legale svizzera, sempre a portata"
                        text="Diritto federale, prassi fiscale federale e cantonale, norme tributarie e giurisprudenza del Tribunale federale. Cerchi con linguaggio naturale e Lex ti porta alla fonte giusta, con il riferimento corretto. La consulti dal primo giorno, senza limiti."
                        points={[
                            'Diritto federale (Fedlex) e cantonale',
                            'Prassi fiscale AFC e cantonale',
                            'Giurisprudenza del Tribunale federale',
                            'Ricerca con linguaggio naturale',
                        ]}
                    >
                        <VisualBlock label="Banca dati Lexum CH">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { v: 'Diritto federale', l: 'Fedlex' },
                                        { v: 'Norme cantonali', l: '26 cantoni' },
                                        { v: 'Prassi fiscale', l: 'AFC e cantonale' },
                                        { v: 'Giurisprudenza', l: 'Tribunale federale' },
                                    ].map(({ v, l }) => (
                                        <div key={l} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-display text-base font-light text-oro-static mb-0.5 leading-tight">{v}</p>
                                            <p className="font-body text-[10px] text-nebbia/35 leading-snug">{l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <Library size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Fonti in italiano, tedesco e francese. Lavoriamo in modo continuo per ampliarle e aggiornarle.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          9. SICUREZZA E RISERVATEZZA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Sicurezza</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Riservatezza{' '}
                            <span className="text-salvia">come standard, non come opzione.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Il lavoro fiduciario tratta dati sensibili delle aziende che segui.
                            Lexum è progettato con la riservatezza al centro di ogni decisione tecnica.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                icon: ShieldCheck,
                                t: 'Compartimentazione dei dati',
                                d: 'Ogni studio è isolato. I dati dei tuoi clienti non sono mai accessibili ad altri studi, né ai collaboratori del tuo team senza il tuo permesso esplicito.',
                            },
                            {
                                icon: Building2,
                                t: 'I tuoi numeri restano i tuoi',
                                d: 'Lex scrive i documenti partendo dai dati che fornisci, ma non li ricalcola e non li altera. Il controllo sulle cifre resta sempre nelle tue mani.',
                            },
                            {
                                icon: Activity,
                                t: 'Audit log completo',
                                d: 'Ogni accesso, ogni modifica, ogni operazione viene registrata. Sai sempre chi ha fatto cosa, quando e su quale mandato.',
                            },
                            {
                                icon: EyeOff,
                                t: 'Dati ospitati in modo sicuro',
                                d: 'Infrastruttura e accessi protetti, con controllo granulare dei permessi. Il segreto professionale del fiduciario è trattato come tale.',
                            },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-salvia/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{t}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          10. CTA FINALE
      ══════════════════════════════════════════ */}
            <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-oro/[0.05] rounded-full blur-3xl" />
                </div>

                <div className="max-w-3xl mx-auto text-center relative">
                    <FadeIn>
                        <SectionLabel>Inizia ora</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            Vedi Lexum{' '}
                            <span className="text-oro">al lavoro nel tuo studio.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
                            Prova Lexum senza vincoli. Oppure prenota una call dimostrativa
                            e ti mostriamo come funziona partendo dal lavoro reale del tuo studio fiduciario.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                Prova Lexum una settimana <ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                Richiedi una call dimostrativa
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            Nessuna carta richiesta. Cancellazione libera in qualsiasi momento.
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