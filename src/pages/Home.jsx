// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ArchivioAnimatedDemo from '@/components/ArchivioAnimatedDemo'
import ClientiLexAnimatedDemo from '@/components/ClientiLexAnimatedDemo'
import {
  ArrowRight, Sparkles, FolderOpen, Users, FileText,
  BookOpen, Shield, Zap, ChevronDown, Check, Scale,
  Search, Brain, Lock, FileSignature, Library, Bookmark,
  FolderSearch, Briefcase, Globe2
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

// Mapping icone per le mini-card (l'ordine corrisponde all'array mini_cards nel JSON)
const MINI_CARD_ICONS = [Search, Bookmark, FolderSearch, Briefcase, FileSignature, Users]
const MINI_CARD_ANCHORS = ['#lexai', '#ricerche', '#archivio', '#lexai', '#lexai', '#cliente']

// Mapping icone per le lexai features (stesso pattern)
const LEXAI_FEATURE_ICONS = [Search, Scale, Brain, Sparkles, BookOpen, FileSignature]

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

function FadeIn({ children, delay = 0, className = '', up = true }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : up ? 'translateY(28px)' : 'translateY(0)',
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

function Divider() {
  return (
    <div className="flex items-center gap-4 my-12">
      <div className="flex-1 h-px bg-white/5" />
      <div className="w-1 h-1 bg-oro/40 rotate-45" />
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

function FeatureRow({ icon: Icon, title, text, points, reverse = false, accent = 'oro', badge, children }) {
  const ic = accent === 'salvia' ? 'text-salvia bg-salvia/10 border-salvia/20' : 'text-oro bg-oro/10 border-oro/20'
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center`}>
      <FadeIn delay={0.1} className={reverse ? 'lg:order-2' : ''}>
        <div className="space-y-4">
          {badge && <span className="inline-block font-body text-xs px-3 py-1 bg-salvia/10 border border-salvia/20 text-salvia">{badge}</span>}
          <div className={`w-10 h-10 flex items-center justify-center border ${ic}`}>
            <Icon size={18} />
          </div>
          <h3 className="font-display text-2xl font-light text-nebbia">{title}</h3>
          <p className="font-body text-sm text-nebbia/50 leading-relaxed">{text}</p>
          {points && (
            <ul className="space-y-2">
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

function MiniCard({ icon: Icon, title, text, anchor }) {
  return (
    <a
      href={anchor}
      className="block group bg-slate/60 border border-white/8 p-5 hover:border-oro/25 hover:bg-slate transition-all"
    >
      <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4 group-hover:bg-oro/15 transition-colors">
        <Icon size={15} />
      </div>
      <p className="font-body text-sm font-medium text-nebbia mb-1.5">{title}</p>
      <p className="font-body text-xs text-nebbia/40 leading-relaxed">{text}</p>
    </a>
  )
}

// Hero card banca dati svizzera
function HeroDatabaseCard({ t }) {
  const items = Array.isArray(t('database_hero.items', { returnObjects: true }))
    ? t('database_hero.items', { returnObjects: true })
    : []

  return (
    <div className="block bg-slate/70 border border-oro/20 p-7 md:p-9 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-center relative">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Library size={16} className="text-oro" />
            <span className="font-body text-xs text-oro/60 tracking-[0.25em] uppercase">{t('database_hero.label')}</span>
          </div>
          <p className="font-display text-5xl md:text-6xl font-light text-oro-shimmer leading-none mb-3">
            {t('database_hero.count')}<span className="text-oro/60 text-3xl md:text-4xl ml-1">{t('database_hero.count_plus')}</span>
          </p>
          <p className="font-display text-xl font-light text-nebbia mb-3">
            {t('database_hero.headline')}
          </p>
          <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-3">
            {t('database_hero.description')}
          </p>
          <p className="font-body text-sm text-oro/80 leading-relaxed">
            {t('database_hero.open_access')}
          </p>
        </div>
        <div className="space-y-2">
          {items.map(({ t: title, s }) => (
            <div key={title} className="px-3 py-2.5 bg-petrolio/50 border border-white/5">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-1 rounded-full bg-oro/60 shrink-0" />
                <span className="font-body text-xs text-nebbia/75 font-medium">{title}</span>
              </div>
              <p className="font-body text-[11px] text-nebbia/40 leading-snug pl-3">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Banner separato corpus IT
function CorpusItalianoCard({ t }) {
  // Per il <span> dentro la description usiamo dangerouslySetInnerHTML
  // perché il testo contiene tag inline (il numero in salvia)
  const descriptionHtml = t('corpus_it_card.description')

  return (
    <div className="bg-slate/40 border border-salvia/15 p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia shrink-0">
          <Globe2 size={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-body text-sm font-medium text-nebbia">{t('corpus_it_card.title')}</p>
            <span className="font-body text-[10px] px-2 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest">{t('corpus_it_card.badge')}</span>
          </div>
          <p
            className="font-body text-xs text-nebbia/45 leading-relaxed [&_span]:text-salvia/80"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { t } = useTranslation('home')

  // Helper: forza qualsiasi valore a essere un array (protezione contro stringa o undefined)
  const toArray = (val) => Array.isArray(val) ? val : []

  const miniCards = toArray(t('mini_cards', { returnObjects: true }))
  const problemaOggiTags = toArray(t('problema.oggi_tags', { returnObjects: true }))
  const problemaLexumTags = toArray(t('problema.lexum_tags', { returnObjects: true }))
  const praticaRows = toArray(t('gestionale.pratica_rows', { returnObjects: true }))
  const ricerchePraticaItems = toArray(t('gestionale.ricerche_items', { returnObjects: true }))
  const ricerchePoints = toArray(t('ricerche.points', { returnObjects: true }))
  const ricercheTags = toArray(t('ricerche.tags', { returnObjects: true }))
  const ricercheSavedItems = toArray(t('ricerche.saved_items', { returnObjects: true }))
  const lexaiFeatures = toArray(t('lexai.features', { returnObjects: true }))
  const corpusItPoints = toArray(t('corpus_italiano_section.feature_points', { returnObjects: true }))
  const corpusItResults = toArray(t('corpus_italiano_section.results', { returnObjects: true }))
  const clientePoints = toArray(t('cliente.feature_points', { returnObjects: true }))

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href="https://www.lexum.ch/" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.lexum.ch/" />
        <meta property="og:title" content={t('meta.og_title')} />
        <meta property="og:description" content={t('meta.og_description')} />
        <meta property="og:image" content="https://www.lexum.ch/logo.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('meta.og_title')} />
        <meta name="twitter:description" content={t('meta.twitter_description')} />
        <meta name="twitter:image" content="https://www.lexum.ch/logo.png" />
      </Helmet>

      {/* 1. HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 md:pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-salvia/[0.05] rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: `linear-gradient(#C9A45C 1px, transparent 1px), linear-gradient(90deg, #C9A45C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 w-full" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
              <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
              {t('hero.title_part1')}{' '}
              <br className="hidden md:block" />
              <span className="text-oro-shimmer">{t('hero.title_highlight')}</span>
            </h1>

            <p className="font-body text-base md:text-lg text-nebbia/50 leading-relaxed max-w-2xl mx-auto mb-10">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                {t('hero.cta_primary')} <ArrowRight size={15} />
              </Link>
              <a href="#features" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
                {t('hero.cta_secondary')}
              </a>
            </div>
            <p className="font-body text-xs text-nebbia/25 mb-16">
              {t('hero.no_card')}
            </p>
          </div>

          <FadeIn delay={0.15}>
            <div className="space-y-4">
              <HeroDatabaseCard t={t} />

              <CorpusItalianoCard t={t} />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {miniCards.map((card, i) => (
                  <MiniCard
                    key={i}
                    icon={MINI_CARD_ICONS[i]}
                    title={card.title}
                    text={card.text}
                    anchor={MINI_CARD_ANCHORS[i]}
                  />
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        <a href="#problema" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce hidden md:block">
          <ChevronDown size={20} />
        </a>
      </section>

      {/* 2. PROBLEMA */}
      <section id="problema" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="max-w-2xl">
            <SectionLabel>{t('problema.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
              {t('problema.title_part1')}{' '}
              <span className="text-red-400/60">{t('problema.title_highlight')}</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            <FadeIn delay={0.1}>
              <div className="bg-slate border border-white/5 p-6 h-full">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-4">{t('problema.oggi_label')}</p>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-5">
                  {t('problema.oggi_text')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {problemaOggiTags.map(tag => (
                    <span key={tag} className="font-body text-xs px-2 py-1 bg-red-500/8 border border-red-500/15 text-red-400/60">{tag}</span>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-slate border border-oro/20 p-6 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl pointer-events-none" />
                <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-4">{t('problema.lexum_label')}</p>
                <p className="font-body text-sm text-nebbia/60 leading-relaxed mb-5">
                  {t('problema.lexum_text')}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {problemaLexumTags.map(tag => (
                    <span key={tag} className="font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/20 text-salvia">{tag}</span>
                  ))}
                </div>
                <p className="font-body text-sm text-oro flex items-center gap-2">
                  <Check size={14} /> {t('problema.lexum_footer')}
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. FUNZIONALITÀ */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto space-y-24">

          {/* 3.1 Gestionale + Lex */}
          <div id="gestionale" className="scroll-mt-28">
            <FadeIn className="text-center max-w-2xl mx-auto mb-10">
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia mb-3">
                {t('gestionale.title_part1')}{' '}
                <span className="text-oro">{t('gestionale.title_highlight')}</span>
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                {t('gestionale.subtitle')}
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

              {/* SINISTRA — Mockup pratica */}
              <FadeIn delay={0.1}>
                <VisualBlock label={t('gestionale.pratica_label')}>
                  <div className="space-y-2">
                    {praticaRows.map((row, idx) => {
                      const customClass = idx === 2 ? 'text-salvia' : idx === 3 ? 'text-oro' : null
                      return (
                        <div key={row.l} className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{row.l}</span>
                          <span className={`font-body text-xs ${customClass || 'text-nebbia/70'}`}>{row.v}</span>
                        </div>
                      )
                    })}

                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">{t('gestionale.fatturazione_label')}</p>
                      <div className="flex items-center justify-between p-2 bg-petrolio/50 border border-red-400/20">
                        <span className="font-body text-xs text-nebbia/60">{t('gestionale.fattura_numero')}</span>
                        <span className="font-body text-xs text-red-400/80">{t('gestionale.fattura_stato')}</span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">{t('gestionale.ricerche_label')}</p>
                      <div className="space-y-1">
                        {ricerchePraticaItems.map((item, idx) => {
                          const Icon = idx === 0 ? Sparkles : idx === 1 ? Search : Bookmark
                          const iconColor = idx === 0 ? 'text-salvia' : 'text-oro'
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-petrolio/50">
                              <Icon size={9} className={iconColor} />
                              <span className="font-body text-xs text-nebbia/50">{item}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </VisualBlock>
              </FadeIn>

              {/* DESTRA — Demo Lex animato */}
              <ClientiLexAnimatedDemo />

            </div>
          </div>

          <Divider />

          {/* 3.2 Ricerche organizzate */}
          <div id="ricerche" className="scroll-mt-28">
            <FeatureRow
              icon={Bookmark}
              title={t('ricerche.title')}
              text={t('ricerche.text')}
              points={ricerchePoints}
            >
              <VisualBlock label={t('ricerche.visual_label')}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15">
                    <Search size={11} className="text-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/70 flex-1">{t('ricerche.search_query')}</span>
                    <span className="font-body text-[10px] text-nebbia/30 shrink-0">{t('ricerche.results_count')}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ricercheTags.map((tag, idx) => {
                      const isSalvia = idx === 1
                      return (
                        <span key={tag} className={`font-body text-[10px] px-2 py-0.5 border ${isSalvia ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-oro/10 border-oro/25 text-oro/80'}`}>
                          # {tag}
                        </span>
                      )
                    })}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {ricercheSavedItems.map((item, idx) => {
                      const highlight = idx === 0
                      return (
                        <div key={idx} className={`flex items-start gap-2 p-2.5 ${highlight ? 'bg-salvia/5 border border-salvia/15' : 'bg-petrolio/50 border border-white/5'}`}>
                          <Bookmark size={10} className={`mt-0.5 shrink-0 ${highlight ? 'text-salvia' : 'text-nebbia/40'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-xs text-nebbia/70 truncate">{item.t}</p>
                            <p className="font-body text-[10px] text-nebbia/30">{item.sub}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-salvia/5 border border-salvia/15 mt-2">
                    <Sparkles size={11} className="text-salvia shrink-0" />
                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                      {t('ricerche.ai_suggestion_prefix')}
                      <span className="text-salvia">{t('ricerche.ai_suggestion_highlight')}</span>
                      {t('ricerche.ai_suggestion_suffix')}
                    </p>
                  </div>
                </div>
              </VisualBlock>
            </FeatureRow>
          </div>

          <Divider />

          {/* 3.3 Documentale + Archivio */}
          <div id="archivio" className="scroll-mt-28">
            <FadeIn className="text-center max-w-2xl mx-auto -mb-4">
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia mb-3">
                {t('archivio.title_part1')}{' '}
                <span className="text-oro">{t('archivio.title_highlight')}</span>
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                {t('archivio.subtitle')}
              </p>
            </FadeIn>
            <ArchivioAnimatedDemo />
          </div>

        </div>
      </section>

      {/* 4. LEX AI */}
      <section id="lexai" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden scroll-mt-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-salvia/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <FadeIn className="text-center mb-16">
            <SectionLabel color="salvia">{t('lexai.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-5xl font-light text-nebbia mb-4">
              {t('lexai.title_part1')}<br />
              <span className="text-salvia">{t('lexai.title_highlight')}</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 max-w-xl mx-auto">
              {t('lexai.subtitle')}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <FadeIn delay={0.1}>
              <div className="space-y-3">
                {lexaiFeatures.map((feature, i) => {
                  const I = LEXAI_FEATURE_ICONS[i]
                  return (
                    <FadeIn key={i} delay={0.1 + i * 0.08}>
                      <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors group">
                        <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                          <I size={13} className="text-salvia" />
                        </div>
                        <div>
                          <p className="font-body text-sm font-medium text-nebbia mb-0.5">{feature.t}</p>
                          <p className="font-body text-xs text-nebbia/35 leading-relaxed">{feature.d}</p>
                        </div>
                      </div>
                    </FadeIn>
                  )
                })}
                <FadeIn delay={0.6}>
                  <p className="font-body text-xs text-nebbia/25 italic px-2 mt-2">
                    {t('lexai.quote')}
                  </p>
                </FadeIn>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="h-full">
              <div className="flex flex-col gap-[2.125rem] h-full">
                {/* Chat 1 — Locazione */}
                <VisualBlock label={t('lexai.chat1.label')} accent="salvia">
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-petrolio/60 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                          {t('lexai.chat1.domanda')}
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                        <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                          <Sparkles size={10} /> Lex AI
                        </p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                          {t('lexai.chat1.risposta')}
                        </p>
                        <div className="flex gap-1 pt-1">
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lexai.chat1.tag1')}</span>
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lexai.chat1.tag2')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </VisualBlock>

                {/* Chat 2 — Lavoro */}
                <VisualBlock label={t('lexai.chat2.label')} accent="salvia">
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-petrolio/60 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                          {t('lexai.chat2.domanda')}
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                        <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                          <Sparkles size={10} /> Lex AI
                        </p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                          {t('lexai.chat2.risposta')}
                        </p>
                        <div className="flex gap-1 pt-1">
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lexai.chat2.tag1')}</span>
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lexai.chat2.tag2')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </VisualBlock>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 5. CORPUS ITALIANO */}
      <section id="corpus-italiano" className="py-24 px-6 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">

          <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
            <SectionLabel>{t('corpus_italiano_section.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              {t('corpus_italiano_section.title_part1')}{' '}
              <span className="text-oro">{t('corpus_italiano_section.title_highlight')}</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              {t('corpus_italiano_section.subtitle')}
            </p>
          </FadeIn>

          <FeatureRow
            icon={Globe2}
            title={t('corpus_italiano_section.feature_title')}
            text={t('corpus_italiano_section.feature_text')}
            points={corpusItPoints}
            accent="oro"
          >
            <VisualBlock label={t('corpus_italiano_section.visual_label')}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15">
                  <Globe2 size={11} className="text-oro/60 shrink-0" />
                  <span className="font-body text-xs text-nebbia/70 flex-1">{t('corpus_italiano_section.search_query')}</span>
                  <span className="font-body text-[10px] text-nebbia/30 shrink-0">{t('corpus_italiano_section.search_lang_badge')}</span>
                </div>

                <div className="space-y-1.5">
                  {corpusItResults.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 bg-petrolio/50 border border-white/5">
                      <FileText size={10} className="mt-0.5 shrink-0 text-oro/60" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">{r.t}</p>
                        <p className="font-body text-[10px] text-nebbia/30">{r.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                  <Sparkles size={11} className="text-oro shrink-0" />
                  <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                    {t('corpus_italiano_section.unique_message')}
                  </p>
                </div>
              </div>
            </VisualBlock>
          </FeatureRow>

        </div>
      </section>

      {/* 6. CLIENTE */}
      <section id="cliente" className="py-24 px-6 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">

          <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
            <SectionLabel color="salvia">{t('cliente.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              {t('cliente.title_part1')}{' '}
              <span className="text-salvia">{t('cliente.title_highlight')}</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              {t('cliente.subtitle')}
            </p>
          </FadeIn>

          <FeatureRow
            icon={Users}
            title={t('cliente.feature_title')}
            text={t('cliente.feature_text')}
            points={clientePoints}
            reverse
            accent="salvia"
          >
            <VisualBlock label={t('cliente.visual_label')} accent="salvia">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-salvia/5 border border-salvia/10">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-salvia" />
                    <span className="font-body text-xs text-nebbia/60">{t('cliente.doc_condiviso')}</span>
                  </div>
                  <span className="font-body text-xs text-nebbia/25">{t('cliente.doc_condiviso_badge')}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-petrolio/50 border border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-nebbia/30" />
                    <span className="font-body text-xs text-nebbia/60">{t('cliente.doc_caricato')}</span>
                  </div>
                  <span className="font-body text-xs text-salvia/60">{t('cliente.doc_caricato_badge')}</span>
                </div>
                <div className="p-3 bg-oro/5 border border-oro/15 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-oro animate-pulse" />
                  <span className="font-body text-xs text-nebbia/50">{t('cliente.prossima_udienza')}</span>
                </div>
              </div>
            </VisualBlock>
          </FeatureRow>

        </div>
      </section>

      {/* 7. CTA finale */}
      <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-oro/[0.05] rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <FadeIn>
            <SectionLabel>{t('cta_finale.label')}</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
              {t('cta_finale.title_part1')}{' '}
              <span className="text-oro">{t('cta_finale.title_highlight')}</span>
            </h2>
            <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
              {t('cta_finale.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                {t('cta_finale.cta_primary')} <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                {t('cta_finale.login_link')}
              </Link>
            </div>
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