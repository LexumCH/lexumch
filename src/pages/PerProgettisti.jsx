// src/pages/PerProgettisti.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Vetrina per progettisti svizzeri (architetti, ingegneri, disegnatori).
// Contenuti via i18n (namespace 'per_progettisti').
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    ArrowRight, BookOpen, Sparkles, ChevronDown, Star, Zap,
    DraftingCompass, ScrollText, ShieldCheck, Ruler, Scale,
    ListChecks, CalendarClock, Search, FileText, CheckCircle2,
    XCircle, AlertTriangle, Building2, EyeOff, Activity, Library,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

const LEXAI_ICONS = [Scale, Ruler, ScrollText, Building2]
const SICUREZZA_ICONS = [ShieldCheck, Building2, Activity, EyeOff]

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
            <div className="p-5">{children}</div>
        </div>
    )
}

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

const ESITO_ICON = { conforme: CheckCircle2, da_verificare: AlertTriangle, non_conforme: XCircle }
const ESITO_CLS = { conforme: 'text-salvia', da_verificare: 'text-amber-400', non_conforme: 'text-red-400' }

// ─────────────────────────────────────────────────────────────
export default function PerProgettisti() {
    const { t } = useTranslation('per_progettisti')
    const toArray = (val) => Array.isArray(val) ? val : []

    const analisiPoints = toArray(t('analisi.points', { returnObjects: true }))
    const analisiFindings = toArray(t('analisi.findings', { returnObjects: true }))
    const conformitaPoints = toArray(t('conformita.points', { returnObjects: true }))
    const conformitaSemaforo = toArray(t('conformita.semaforo', { returnObjects: true }))
    const conformitaNorme = toArray(t('conformita.norme', { returnObjects: true }))
    const progettiPoints = toArray(t('progetti.points', { returnObjects: true }))
    const progettiFasi = toArray(t('progetti.fasi', { returnObjects: true }))
    const documentiPoints = toArray(t('documenti.points', { returnObjects: true }))
    const documentiDocs = toArray(t('documenti.docs', { returnObjects: true }))
    const bancaPoints = toArray(t('banca.points', { returnObjects: true }))
    const bancaCategorie = toArray(t('banca.categorie', { returnObjects: true }))
    const lexaiFeatures = toArray(t('lexai.features', { returnObjects: true }))
    const lexaiTags = toArray(t('lexai.demo_tags', { returnObjects: true }))
    const sicurezzaCards = toArray(t('sicurezza.cards', { returnObjects: true }))

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta name="description" content={t('meta.description')} />
                <link rel="canonical" href="https://www.lexum.ch/progettisti" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.ch/progettisti" />
                <meta property="og:title" content={t('meta.og_title')} />
                <meta property="og:description" content={t('meta.og_description')} />
                <meta property="og:image" content="https://www.lexum.ch/logo.png" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={t('meta.og_title')} />
                <meta name="twitter:description" content={t('meta.twitter_description')} />
                <meta name="twitter:image" content="https://www.lexum.ch/logo.png" />
            </Helmet>

            {/* 1. HERO */}
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
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        {t('hero.title_part1')}<br />
                        <span className="text-oro-shimmer">{t('hero.title_highlight')}</span>
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        {t('hero.subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            {t('hero.cta_primary')} <ArrowRight size={15} />
                        </Link>
                        <Link to="/registrati" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            {t('hero.cta_secondary')}
                        </Link>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">{t('hero.no_card')}</p>
                </div>

                <a href="#analisi" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* 2. ANALISI DEL DISEGNO — IL CUORE */}
            <section id="analisi" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>

                <div className="max-w-5xl mx-auto relative">
                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('analisi.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('analisi.title_part1')}{' '}<span className="text-oro">{t('analisi.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">{t('analisi.subtitle')}</p>
                    </FadeIn>

                    <FeatureRow
                        icon={DraftingCompass}
                        title={t('analisi.feature_title')}
                        text={t('analisi.feature_text')}
                        points={analisiPoints}
                    >
                        <VisualBlock label={t('analisi.visual_label')}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <FileText size={13} className="text-oro shrink-0" />
                                    <span className="font-body text-xs text-nebbia/70 flex-1 truncate">{t('analisi.visual_file')}</span>
                                    <span className="font-body text-[10px] px-2 py-0.5 border border-salvia/30 text-salvia">{t('analisi.visual_stato')}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-petrolio/50 border border-white/5 p-2.5 text-center">
                                        <p className="font-display text-lg text-salvia leading-none">{t('analisi.stat_quote_v')}</p>
                                        <p className="font-body text-[10px] text-nebbia/35 mt-1">{t('analisi.stat_quote_l')}</p>
                                    </div>
                                    <div className="bg-petrolio/50 border border-white/5 p-2.5 text-center">
                                        <p className="font-display text-lg text-oro leading-none">{t('analisi.stat_segnal_v')}</p>
                                        <p className="font-body text-[10px] text-nebbia/35 mt-1">{t('analisi.stat_segnal_l')}</p>
                                    </div>
                                    <div className="bg-petrolio/50 border border-white/5 p-2.5 text-center">
                                        <p className="font-display text-lg text-nebbia/80 leading-none">{t('analisi.stat_locali_v')}</p>
                                        <p className="font-body text-[10px] text-nebbia/35 mt-1">{t('analisi.stat_locali_l')}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {analisiFindings.map((f, idx) => {
                                        const warn = f.sev === 'errore'
                                        return (
                                            <div key={idx} className="flex items-start gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                {warn
                                                    ? <XCircle size={11} className="text-red-400 mt-0.5 shrink-0" />
                                                    : <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />}
                                                <span className="font-body text-[11px] text-nebbia/60 leading-snug">{f.t}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>
                </div>
            </section>

            {/* 3. CONFORMITÀ NORMATIVA */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('conformita.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('conformita.title_part1')}{' '}<span className="text-salvia">{t('conformita.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">{t('conformita.subtitle')}</p>
                    </FadeIn>

                    <FeatureRow
                        icon={ShieldCheck}
                        title={t('conformita.feature_title')}
                        text={t('conformita.feature_text')}
                        points={conformitaPoints}
                        accent="salvia"
                        reverse
                    >
                        <VisualBlock label={t('conformita.visual_label')} accent="salvia">
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {conformitaSemaforo.map((s, idx) => {
                                        const Icon = ESITO_ICON[s.col] ?? CheckCircle2
                                        const cls = ESITO_CLS[s.col] ?? 'text-nebbia/50'
                                        return (
                                            <div key={idx} className="bg-petrolio/50 border border-white/5 p-2.5 flex flex-col items-center text-center gap-1">
                                                <Icon size={15} className={cls} />
                                                <p className={`font-display text-lg leading-none ${cls}`}>{s.v}</p>
                                                <p className="font-body text-[10px] text-nebbia/35 leading-tight">{s.l}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="pt-1">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('conformita.norme_label')}</p>
                                    <div className="space-y-1.5">
                                        {conformitaNorme.map((n, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <span className="font-body text-[10px] px-2 py-0.5 border border-oro/30 text-oro shrink-0">{n.abbr}</span>
                                                <span className="font-body text-[11px] text-nebbia/60 flex-1 truncate">{n.t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-2.5 bg-salvia/5 border border-salvia/15">
                                    <ScrollText size={11} className="text-salvia shrink-0 mt-0.5" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">{t('conformita.msg')}</p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>
                </div>
            </section>

            {/* 4. GESTIONE PROGETTI / FASI SIA */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FeatureRow
                        icon={ListChecks}
                        title={t('progetti.feature_title')}
                        text={t('progetti.feature_text')}
                        points={progettiPoints}
                    >
                        <VisualBlock label={t('progetti.visual_label')}>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {progettiFasi.map((f, idx) => {
                                        const done = f.stato === 'completata'
                                        const active = f.stato === 'in_corso'
                                        const dot = done ? 'bg-salvia' : active ? 'bg-oro' : 'bg-white/15'
                                        const txt = done ? 'text-nebbia/60' : active ? 'text-oro' : 'text-nebbia/35'
                                        return (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-petrolio/50 border border-white/5">
                                                <span className="font-body text-[10px] text-nebbia/25 w-5 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                                <span className={`font-body text-[11px] flex-1 truncate ${txt}`}>{f.t}</span>
                                                {active && <span className="font-body text-[9px] px-1.5 py-0.5 border border-oro/25 text-oro/80 shrink-0">{t('progetti.in_corso_badge')}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <CalendarClock size={11} className="text-oro shrink-0" />
                                    <span className="font-body text-[11px] text-nebbia/60 flex-1">{t('progetti.scadenza_label')}</span>
                                    <span className="font-body text-[11px] text-oro shrink-0">{t('progetti.scadenza_v')}</span>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>
                </div>
            </section>

            {/* 4b. REDAZIONE DOCUMENTI */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('documenti.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('documenti.title_part1')}{' '}<span className="text-oro">{t('documenti.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">{t('documenti.subtitle')}</p>
                    </FadeIn>

                    <FeatureRow
                        icon={FileText}
                        title={t('documenti.feature_title')}
                        text={t('documenti.feature_text')}
                        points={documentiPoints}
                    >
                        <VisualBlock label={t('documenti.visual_label')}>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {documentiDocs.map((d, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 p-2 bg-petrolio/50 border border-white/5">
                                            <FileText size={12} className="text-oro/70 shrink-0" />
                                            <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{d.n}</span>
                                            <span className="font-body text-[9px] px-1.5 py-0.5 border border-salvia/25 text-salvia/80 shrink-0">{d.badge}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-start gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <ScrollText size={11} className="text-oro shrink-0 mt-0.5" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">{t('documenti.msg')}</p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>
                </div>
            </section>

            {/* 5. BANCA DATI EDILIZIA CH */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FeatureRow
                        icon={BookOpen}
                        title={t('banca.feature_title')}
                        text={t('banca.feature_text')}
                        points={bancaPoints}
                        reverse
                    >
                        <VisualBlock label={t('banca.visual_label')}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {bancaCategorie.map((cat, idx) => (
                                        <div key={idx} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-display text-base font-light text-oro-static mb-0.5 leading-tight">{cat.v}</p>
                                            <p className="font-body text-[10px] text-nebbia/35 leading-snug">{cat.l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <Library size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">{t('banca.msg')}</p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>
                </div>
            </section>

            {/* 6. LEX AI — DIRITTO EDILIZIO */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>
                <div className="max-w-5xl mx-auto relative">
                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('lexai.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('lexai.title_part1')}{' '}<span className="text-salvia">{t('lexai.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">{t('lexai.subtitle')}</p>
                    </FadeIn>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <FadeIn delay={0.1}>
                            <div className="space-y-3">
                                {lexaiFeatures.map((feature, i) => {
                                    const I = LEXAI_ICONS[i]
                                    return (
                                        <FadeIn key={i} delay={0.1 + i * 0.06}>
                                            <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                                                <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                                                    {I && <I size={13} className="text-salvia" />}
                                                </div>
                                                <div>
                                                    <p className="font-body text-sm font-medium text-nebbia mb-0.5">{feature.t}</p>
                                                    <p className="font-body text-xs text-nebbia/35 leading-relaxed">{feature.d}</p>
                                                </div>
                                            </div>
                                        </FadeIn>
                                    )
                                })}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <VisualBlock label={t('lexai.visual_label')} accent="salvia">
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <div className="max-w-[88%] bg-petrolio/60 border border-white/5 p-3">
                                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">{t('lexai.demo_user')}</p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[92%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                <Sparkles size={10} /> Lex AI
                                            </p>
                                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">{t('lexai.demo_risposta')}</p>
                                            <div className="flex gap-1 pt-1 flex-wrap">
                                                {lexaiTags.map((tag, i) => (
                                                    <span key={i} className={`font-body text-[10px] px-1.5 py-0.5 border ${i === lexaiTags.length - 1 ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-petrolio border-white/8 text-nebbia/30'}`}>{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                        <ShieldCheck size={11} className="text-oro shrink-0 mt-0.5" />
                                        <p className="font-body text-[11px] text-nebbia/55 leading-snug">{t('lexai.demo_note')}</p>
                                    </div>
                                </div>
                            </VisualBlock>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* 7. SICUREZZA */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('sicurezza.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('sicurezza.title_part1')}{' '}<span className="text-salvia">{t('sicurezza.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">{t('sicurezza.subtitle')}</p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sicurezzaCards.map((card, i) => {
                            const Icon = SICUREZZA_ICONS[i]
                            return (
                                <FadeIn key={i} delay={i * 0.06}>
                                    <div className="bg-slate border border-white/5 p-5 h-full hover:border-salvia/20 transition-colors">
                                        <div className="w-9 h-9 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-3">
                                            {Icon && <Icon size={15} />}
                                        </div>
                                        <p className="font-body text-sm font-medium text-nebbia mb-1.5">{card.t}</p>
                                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">{card.d}</p>
                                    </div>
                                </FadeIn>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* 8. CTA FINALE */}
            <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-oro/[0.05] rounded-full blur-3xl" />
                </div>
                <div className="max-w-3xl mx-auto text-center relative">
                    <FadeIn>
                        <SectionLabel>{t('cta.label')}</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            {t('cta.title_part1')}{' '}<span className="text-oro">{t('cta.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">{t('cta.subtitle')}</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                {t('cta.cta_primary')} <ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                {t('cta.cta_secondary')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">{t('cta.no_card')}</p>
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
