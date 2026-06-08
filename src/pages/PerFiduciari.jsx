// src/pages/PerFiduciari.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Vetrina per fiduciari svizzeri. Contenuti via i18n (namespace 'per_fiduciari').
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    ArrowRight, BookOpen, Users, Sparkles,
    Check, ChevronDown, Brain, Star, Zap,
    FileText, FileSignature, Calendar, FolderOpen, Search,
    EyeOff, UserCheck, Briefcase, CreditCard,
    Bookmark, FolderSearch, Scale, ShieldCheck, Activity,
    Library, Receipt, Calculator, BarChart3, Building2,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

// Mapping icone (l'ordine corrisponde agli array nel JSON)
const LEXAI_ICONS = [FileSignature, BarChart3, Scale, Search, Brain, Building2]
const SICUREZZA_ICONS = [ShieldCheck, Building2, Activity, EyeOff]
const MANDATI_ROW_COLORS = [null, 'text-oro', null, 'text-salvia']

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
    const { t } = useTranslation('per_fiduciari')
    const toArray = (val) => Array.isArray(val) ? val : []

    const lexaiFeatures = toArray(t('lexai.features', { returnObjects: true }))
    const lexaiTags = toArray(t('lexai.demo_tags', { returnObjects: true }))
    const mandatiPoints = toArray(t('mandati.points', { returnObjects: true }))
    const mandatiRows = toArray(t('mandati.rows', { returnObjects: true }))
    const mandatiDocs = toArray(t('mandati.docs', { returnObjects: true }))
    const calendarioPoints = toArray(t('calendario.points', { returnObjects: true }))
    const calendarioEventi = toArray(t('calendario.eventi', { returnObjects: true }))
    const archivioPoints = toArray(t('archivio.points', { returnObjects: true }))
    const archivioResults = toArray(t('archivio.results', { returnObjects: true }))
    const fattPoints = toArray(t('fatturazione.points', { returnObjects: true }))
    const fattPrestazioni = toArray(t('fatturazione.prestazioni', { returnObjects: true }))
    const fattTotali = toArray(t('fatturazione.totali', { returnObjects: true }))
    const scadenzarioStati = toArray(t('fatturazione.scadenzario_stati', { returnObjects: true }))
    const pagamentiItems = toArray(t('fatturazione.pagamenti_items', { returnObjects: true }))
    const promemoriaItems = toArray(t('fatturazione.promemoria_items', { returnObjects: true }))
    const lexPagPoints = toArray(t('fatturazione.lex_points', { returnObjects: true }))
    const lexPagFatture = toArray(t('fatturazione.lex_fatture', { returnObjects: true }))
    const teamPoints = toArray(t('team.points', { returnObjects: true }))
    const teamMembers = toArray(t('team.members', { returnObjects: true }))
    const bancaPoints = toArray(t('banca.points', { returnObjects: true }))
    const bancaCategorie = toArray(t('banca.categorie', { returnObjects: true }))
    const sicurezzaCards = toArray(t('sicurezza.cards', { returnObjects: true }))

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta name="description" content={t('meta.description')} />
                <link rel="canonical" href="https://www.lexum.ch/fiduciari" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.ch/fiduciari" />
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

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        {t('hero.no_card')}
                    </p>
                </div>

                <a href="#lex-ai" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* 2. LEX AI — IL CUORE */}
            <section id="lex-ai" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>

                <div className="max-w-5xl mx-auto relative">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('lexai.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('lexai.title_part1')}{' '}
                            <span className="text-salvia">{t('lexai.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('lexai.subtitle')}
                        </p>
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
                                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                {t('lexai.demo_user')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[92%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                <Sparkles size={10} /> Lex AI
                                            </p>
                                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                {t('lexai.demo_risposta')}
                                            </p>
                                            <div className="flex gap-1 pt-1 flex-wrap">
                                                {lexaiTags.map((tag, i) => (
                                                    <span key={i} className={`font-body text-[10px] px-1.5 py-0.5 border ${i === lexaiTags.length - 1 ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-petrolio border-white/8 text-nebbia/30'}`}>{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                        <ShieldCheck size={11} className="text-oro shrink-0 mt-0.5" />
                                        <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                            {t('lexai.demo_note')}
                                        </p>
                                    </div>
                                </div>
                            </VisualBlock>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* 3. MANDATI */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('mandati.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('mandati.title_part1')}{' '}
                            <span className="text-oro">{t('mandati.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('mandati.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={FolderOpen}
                        title={t('mandati.feature_title')}
                        text={t('mandati.feature_text')}
                        points={mandatiPoints}
                    >
                        <VisualBlock label={t('mandati.visual_label')}>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {mandatiRows.map((row, idx) => (
                                        <div key={idx} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{row.l}</span>
                                            <span className={`font-body text-xs ${MANDATI_ROW_COLORS[idx] || 'text-nebbia/70'}`}>{row.v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('mandati.docs_label')}</p>
                                    <div className="space-y-1.5">
                                        {mandatiDocs.map((doc, idx) => {
                                            const col = idx === 0 ? 'oro' : 'salvia'
                                            return (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                    <FileText size={10} className={col === 'oro' ? 'text-oro' : 'text-salvia'} />
                                                    <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{doc.t}</span>
                                                    <span className={`font-body text-[9px] px-1.5 py-0.5 border ${col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>{doc.tag}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* 4. CALENDARIO / SCADENZE FISCALI */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={Calendar}
                        title={t('calendario.feature_title')}
                        text={t('calendario.feature_text')}
                        points={calendarioPoints}
                        reverse
                    >
                        <VisualBlock label={t('calendario.visual_label')} accent="salvia">
                            <div className="space-y-1.5">
                                {calendarioEventi.map((ev, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                        <div className={`font-body text-[10px] font-medium px-2 py-1 border shrink-0 text-center ${ev.col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>{ev.d}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-[11px] text-nebbia/70 truncate">{ev.t}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{ev.sub}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <Zap size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        {t('calendario.promemoria')}
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* 5. ARCHIVIO INTELLIGENTE */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={FolderSearch}
                        title={t('archivio.feature_title')}
                        text={t('archivio.feature_text')}
                        points={archivioPoints}
                    >
                        <VisualBlock label={t('archivio.visual_label')}>
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <div className="w-full bg-petrolio/60 border border-white/10 text-nebbia/60 font-body text-xs pl-8 pr-3 py-2.5">
                                        {t('archivio.search_query')}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {archivioResults.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2.5 bg-petrolio/50 border border-white/5">
                                            <FileText size={11} className="text-oro shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-[11px] text-nebbia/70 truncate">{r.t}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{r.m}</p>
                                            </div>
                                            <span className="font-body text-[10px] text-salvia/70 shrink-0">{r.s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* 6. FATTURAZIONE (CHF, IVA 8.1%) */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('fatturazione.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('fatturazione.title_part1')}{' '}
                            <span className="text-oro">{t('fatturazione.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('fatturazione.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Receipt}
                        title={t('fatturazione.feature_title')}
                        text={t('fatturazione.feature_text')}
                        points={fattPoints}
                    >
                        <VisualBlock label={t('fatturazione.fattura_label')}>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div>
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('fatturazione.numero_label')}</p>
                                        <p className="font-body text-sm text-nebbia">{t('fatturazione.numero_v')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('fatturazione.data_label')}</p>
                                        <p className="font-body text-sm text-nebbia">{t('fatturazione.data_v')}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{t('fatturazione.prestazioni_label')}</p>
                                    {fattPrestazioni.map((p, idx) => (
                                        <div key={idx} className="flex justify-between p-2 bg-petrolio/50 border border-white/5">
                                            <span className="font-body text-[11px] text-nebbia/65 truncate">{p.d}</span>
                                            <span className="font-body text-[11px] text-nebbia/65 shrink-0 ml-2">CHF {p.i}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1 pt-2 border-t border-white/5">
                                    {fattTotali.map((row, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px]">
                                            <span className="font-body text-nebbia/50">{row.l}</span>
                                            <span className="font-body text-nebbia/50">CHF {row.v}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 mt-1 border-t border-white/5">
                                        <span className="font-body text-xs text-nebbia/70">{t('fatturazione.totale_label')}</span>
                                        <span className="font-body text-sm text-oro font-medium">CHF {t('fatturazione.totale_v')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <FileText size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55">
                                        {t('fatturazione.archiviato_prefix')} <span className="text-oro/80">{t('fatturazione.archiviato_path')}</span>
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
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('fatturazione.scadenzario_title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('fatturazione.scadenzario_text')}
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    {scadenzarioStati.map((s, idx) => {
                                        const dot = idx === 0 ? 'bg-salvia' : idx === 1 ? 'bg-oro' : 'bg-red-400'
                                        const amt = idx === 2 ? 'text-red-400/70' : 'text-nebbia/30'
                                        return (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 ${dot} rounded-full`} />
                                                <span className="font-body text-[11px] text-nebbia/50">{s.l}</span>
                                                <span className={`font-body text-[11px] ${amt} ml-auto`}>CHF {s.v}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.15}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <CreditCard size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('fatturazione.pagamenti_title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('fatturazione.pagamenti_text')}
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    {pagamentiItems.map((it, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-2">
                                            <span className={`font-body text-[11px] ${it.open ? 'text-oro' : 'text-nebbia/50'}`}>{it.l}</span>
                                            <span className={`font-body text-[10px] ${it.open ? 'text-oro/60' : 'text-nebbia/30'}`}>{it.d}</span>
                                            <span className={`font-body text-[11px] ${it.open ? 'text-oro' : 'text-nebbia/50'}`}>CHF {it.i}</span>
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
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('fatturazione.promemoria_title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('fatturazione.promemoria_text')}
                                </p>
                                <div className="space-y-2 pt-3 border-t border-white/5">
                                    {promemoriaItems.map((it, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <div className={`w-1.5 h-1.5 ${it.urgent ? 'bg-red-400' : 'bg-oro'} rounded-full mt-1.5 shrink-0`} />
                                            <div>
                                                <p className={`font-body text-[11px] ${it.urgent ? 'text-red-400/80' : 'text-nebbia/55'}`}>{it.tempo}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{it.fattura}</p>
                                            </div>
                                        </div>
                                    ))}
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
                                        {t('fatturazione.lex_title_part1')}{' '}
                                        <span className="text-salvia">{t('fatturazione.lex_title_highlight')}</span>
                                    </h3>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                        {t('fatturazione.lex_text')}
                                    </p>
                                    <ul className="space-y-2 pt-2">
                                        {lexPagPoints.map((p, i) => (
                                            <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                                <div className="w-1 h-1 bg-salvia rounded-full shrink-0" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <VisualBlock label={t('fatturazione.lex_visual_label')} accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    {t('fatturazione.lex_domanda')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                                <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                    <Sparkles size={10} /> Lex AI
                                                </p>
                                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                    {t('fatturazione.lex_risposta')}
                                                </p>
                                                <div className="space-y-1 pt-1">
                                                    {lexPagFatture.map((f, idx) => (
                                                        <div key={idx} className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                            <div>
                                                                <p className="font-body text-[11px] text-nebbia/70">{f.cliente}</p>
                                                                <p className="font-body text-[10px] text-red-400/70">{f.scaduta}</p>
                                                            </div>
                                                            <span className="font-body text-[11px] text-nebbia/70">CHF {f.importo}</span>
                                                        </div>
                                                    ))}
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

            {/* 7. MULTI-ACCESSO / TEAM */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('team.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('team.title_part1')}{' '}
                            <span className="text-oro">{t('team.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('team.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title={t('team.feature_title')}
                        text={t('team.feature_text')}
                        points={teamPoints}
                        reverse
                    >
                        <VisualBlock label={t('team.visual_label')}>
                            <div className="space-y-2">
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">{t('team.team_label')}</p>
                                {teamMembers.map((m, idx) => {
                                    const accessoColor = idx === 0 ? 'oro' : 'salvia'
                                    return (
                                        <div key={m.nome} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                            <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro font-body text-[10px] font-medium shrink-0">
                                                {m.avatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-xs text-nebbia/70 truncate">{m.nome}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{m.ruolo}</p>
                                            </div>
                                            <span className={`font-body text-[10px] px-2 py-0.5 border shrink-0 ${accessoColor === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'}`}>
                                                {m.accesso}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <ShieldCheck size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        {t('team.compartimentazione')}
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* 8. BANCA DATI CH */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={BookOpen}
                        title={t('banca.feature_title')}
                        text={t('banca.feature_text')}
                        points={bancaPoints}
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
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        {t('banca.msg')}
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* 9. SICUREZZA E RISERVATEZZA */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('sicurezza.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            {t('sicurezza.title_part1')}{' '}
                            <span className="text-salvia">{t('sicurezza.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('sicurezza.subtitle')}
                        </p>
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

            {/* 10. CTA FINALE */}
            <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-oro/[0.05] rounded-full blur-3xl" />
                </div>

                <div className="max-w-3xl mx-auto text-center relative">
                    <FadeIn>
                        <SectionLabel>{t('cta.label')}</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            {t('cta.title_part1')}{' '}
                            <span className="text-oro">{t('cta.title_highlight')}</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
                            {t('cta.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                {t('cta.cta_primary')} <ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                {t('cta.cta_secondary')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            {t('cta.no_card')}
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
