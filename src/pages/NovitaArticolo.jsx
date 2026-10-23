// src/pages/NovitaArticolo.jsx
//
// Vetrina, il singolo articolo delle Novità (/:lang/novita/:slug). Il testo è
// markdown scritto dall'admin: react-markdown lo rende senza eseguire HTML.
// Se lo slug è di un'altra lingua (cambio lingua dal menu) si va alla versione
// tradotta; le versioni esistenti sono collegate in testa (hreflang) e in pagina.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'
import { articoloDaSlug, versioniArticolo, firmaAutore, fmtDataLunga } from '@/lib/novita'
import { IconaInstagram, IconaTikTok } from '@/components/Social'

const SITO = 'https://www.lexum.ch'
const OG_LOCALE = { it: 'it_CH', de: 'de_CH', fr: 'fr_CH' }
const NOMI_LINGUA = { it: 'Italiano', de: 'Deutsch', fr: 'Français' }

// Il markdown prende i caratteri del sito, non quelli di default del browser.
const TESTO = {
    h1: ({ children }) => <h2 className="font-display text-3xl font-light text-nebbia mt-10 mb-4">{children}</h2>,
    h2: ({ children }) => <h2 className="font-display text-2xl font-light text-nebbia mt-10 mb-4">{children}</h2>,
    h3: ({ children }) => <h3 className="font-display text-xl font-light text-nebbia mt-8 mb-3">{children}</h3>,
    p: ({ children }) => <p className="font-body text-base text-nebbia/70 leading-relaxed mb-5">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-5 font-body text-base text-nebbia/70">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-5 font-body text-base text-nebbia/70">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="text-nebbia font-medium">{children}</strong>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-oro hover:underline">{children}</a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-oro/40 pl-4 my-6 font-body text-base text-nebbia/50 italic">{children}</blockquote>
    ),
    code: ({ children }) => (
        <code className="px-1.5 py-0.5 bg-slate border border-white/10 font-mono text-sm text-salvia">{children}</code>
    ),
    pre: ({ children }) => (
        <pre className="bg-slate border border-white/5 p-4 overflow-x-auto mb-5 text-sm">{children}</pre>
    ),
    img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" className="w-full border border-white/5 my-6" />,
    hr: () => <hr className="border-white/5 my-8" />,
}

export default function NovitaArticolo() {
    const { lang, slug } = useParams()
    const lingua = LINGUE_SUPPORTATE.includes(lang) ? lang : LINGUA_DEFAULT
    const navigate = useNavigate()
    const { t } = useTranslation('novita')
    const [articolo, setArticolo] = useState(null)
    const [versioni, setVersioni] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let vivo = true
        setLoading(true)
        articoloDaSlug(lingua, slug).then(async ({ articolo: a, vai }) => {
            if (!vivo) return
            if (vai) {
                navigate(vai, { replace: true })
                return
            }
            setArticolo(a)
            setVersioni(a ? await versioniArticolo(a.gruppo) : {})
            if (vivo) setLoading(false)
        })
        return () => { vivo = false }
    }, [lingua, slug, navigate])

    if (loading) {
        return (
            <div className="min-h-screen bg-petrolio flex items-center justify-center pt-20">
                <span className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!articolo) {
        return (
            <div className="min-h-screen bg-petrolio text-nebbia pt-32 px-6">
                <Helmet><meta name="robots" content="noindex" /></Helmet>
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="font-display text-3xl font-light mb-3">{t('articolo.non_trovato')}</h1>
                    <p className="font-body text-sm text-nebbia/40 mb-8">{t('articolo.non_trovato_testo')}</p>
                    <Link to={`/${lingua}/novita`} className="inline-flex items-center gap-2 font-body text-sm text-oro hover:underline">
                        <ArrowLeft size={14} /> {t('articolo.torna')}
                    </Link>
                </div>
            </div>
        )
    }

    const url = `${SITO}/${lingua}/novita/${articolo.slug}`
    const immagine = articolo.copertina_url || `${SITO}/logo.png`
    const descrizione = articolo.sommario || articolo.titolo
    const altre = LINGUE_SUPPORTATE.filter(l => l !== lingua && versioni[l])

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <html lang={lingua} />
                <title>{`${articolo.titolo} — Lexum`}</title>
                <meta name="description" content={descrizione} />
                <link rel="canonical" href={url} />
                {LINGUE_SUPPORTATE.filter(l => versioni[l]).map(l => (
                    <link key={l} rel="alternate" hrefLang={l} href={`${SITO}/${l}/novita/${versioni[l]}`} />
                ))}

                <meta property="og:type" content="article" />
                <meta property="og:url" content={url} />
                <meta property="og:title" content={articolo.titolo} />
                <meta property="og:description" content={descrizione} />
                <meta property="og:image" content={immagine} />
                <meta property="og:locale" content={OG_LOCALE[lingua]} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={articolo.titolo} />
                <meta name="twitter:description" content={descrizione} />
                <meta name="twitter:image" content={immagine} />
            </Helmet>

            <article className="max-w-3xl mx-auto px-6 pt-12 pb-24">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                    <Link to={`/${lingua}/novita`} className="inline-flex items-center gap-2 font-body text-sm text-nebbia/40 hover:text-oro transition-colors">
                        <ArrowLeft size={14} /> {t('articolo.indietro')}
                    </Link>
                    {altre.length > 0 && (
                        <p className="font-body text-xs text-nebbia/30">
                            {t('articolo.altre_lingue')}{' '}
                            {altre.map((l, i) => (
                                <span key={l}>
                                    {i > 0 && ' · '}
                                    <Link to={`/${l}/novita/${versioni[l]}`} hrefLang={l} className="text-nebbia/50 hover:text-oro transition-colors">
                                        {NOMI_LINGUA[l]}
                                    </Link>
                                </span>
                            ))}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {articolo.categoria && (
                        <span className="font-body text-xs px-2 py-0.5 border border-salvia/30 text-salvia bg-salvia/10">
                            {articolo.categoria}
                        </span>
                    )}
                    <span className="font-body text-xs text-nebbia/30">
                        {fmtDataLunga(articolo.pubblicato_il, lingua)} · {firmaAutore(articolo.autore)}
                    </span>
                </div>

                <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.15] mb-6">{articolo.titolo}</h1>

                {articolo.sommario && (
                    <p className="font-body text-lg text-nebbia/50 leading-relaxed mb-8">{articolo.sommario}</p>
                )}

                {articolo.copertina_url && (
                    <img src={articolo.copertina_url} alt="" className="w-full border border-white/5 mb-10" />
                )}

                <ReactMarkdown components={TESTO}>{articolo.contenuto ?? ''}</ReactMarkdown>

                {/* Il post collegato: compare solo se l'admin ha messo il collegamento */}
                {(articolo.instagram_url || articolo.tiktok_url) && (
                    <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-3">
                        <p className="font-body text-sm text-nebbia/40">{t('articolo.social')}</p>
                        <div className="flex flex-wrap gap-2">
                            {articolo.instagram_url && (
                                <a href={articolo.instagram_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors">
                                    <IconaInstagram size={15} /> {t('articolo.instagram')}
                                </a>
                            )}
                            {articolo.tiktok_url && (
                                <a href={articolo.tiktok_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors">
                                    <IconaTikTok size={15} /> {t('articolo.tiktok')}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-sm text-nebbia/40">{t('articolo.cta_testo')}</p>
                    <Link
                        to="/registrati"
                        className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                    >
                        {t('articolo.cta')} <ArrowRight size={14} />
                    </Link>
                </div>
            </article>
        </div>
    )
}
