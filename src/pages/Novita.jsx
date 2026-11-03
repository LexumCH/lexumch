// src/pages/Novita.jsx
//
// Vetrina, pagina «Novità»: l'elenco degli articoli pubblicati dall'admin nella
// lingua della pagina (/it/novita, /de/novita, /fr/novita).

import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Newspaper } from 'lucide-react'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'
import { elencoNovita, firmaAutore, fmtDataLunga } from '@/lib/novita'
import { ARGOMENTI, argomentoDaSlug } from '@/lib/argomenti'
import StaticoPronto from '@/components/StaticoPronto'

const SITO = 'https://www.lexum.ch'
const OG_LOCALE = { it: 'it_CH', de: 'de_CH', fr: 'fr_CH' }

// preArticoli: già letti da chi prepara il testo dentro l'HTML (src/seo/entry-seo.jsx)
export default function Novita({ preArticoli = null }) {
    const { lang, argomento: slugArgomento } = useParams()
    const lingua = LINGUE_SUPPORTATE.includes(lang) ? lang : LINGUA_DEFAULT
    const { t } = useTranslation('novita')
    const argomento = argomentoDaSlug(slugArgomento)
    const [tutti, setTutti] = useState(preArticoli ?? [])
    const [loading, setLoading] = useState(!preArticoli)

    useEffect(() => {
        if (!tutti.length) setLoading(true)
        elencoNovita(lingua).then(righe => {
            setTutti(righe)
            setLoading(false)
        })
    }, [lingua])

    if (slugArgomento && !argomento) return <Navigate to={`/${lingua}/novita`} replace />
    // Cambio lingua dal menu: si passa all'indirizzo di quella lingua
    if (argomento && argomento.slug[lingua] !== slugArgomento) {
        return <Navigate to={`/${lingua}/novita/argomento/${argomento.slug[lingua]}`} replace />
    }

    const articoli = argomento ? tutti.filter(a => a.argomenti?.includes(argomento.id)) : tutti
    const argomentiConArticoli = ARGOMENTI.filter(x => tutti.some(a => a.argomenti?.includes(x.id)))
    const percorsoDi = (l) => (argomento ? `/novita/argomento/${argomento.slug[l]}` : '/novita')
    const url = `${SITO}/${lingua}${percorsoDi(lingua)}`
    const titolo = argomento ? `${t(`argomenti.${argomento.id}.titolo`)} — Lexum` : t('meta.title')
    const descrizione = argomento ? t(`argomenti.${argomento.id}.descrizione`) : t('meta.description')

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <StaticoPronto quando={!loading} />
            <Helmet>
                <html lang={lingua} />
                <title>{titolo}</title>
                <meta name="description" content={descrizione} />
                <link rel="canonical" href={url} />
                {LINGUE_SUPPORTATE.map(l => (
                    <link key={l} rel="alternate" hrefLang={l} href={`${SITO}/${l}${percorsoDi(l)}`} />
                ))}
                <link rel="alternate" hrefLang="x-default" href={`${SITO}/${LINGUA_DEFAULT}${percorsoDi(LINGUA_DEFAULT)}`} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={url} />
                <meta property="og:title" content={titolo} />
                <meta property="og:description" content={descrizione} />
                <meta property="og:image" content={`${SITO}/logo.png`} />
                <meta property="og:locale" content={OG_LOCALE[lingua]} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={titolo} />
                <meta name="twitter:description" content={descrizione} />
                <meta name="twitter:image" content={`${SITO}/logo.png`} />
            </Helmet>

            {/* Testata */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-salvia/[0.04] rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-6">
                        <Newspaper size={11} className="text-oro/60" />
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
                    </div>
                    {argomento ? (
                        <>
                            <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.1] mb-5">{t(`argomenti.${argomento.id}.nome`)}</h1>
                            <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-2xl mx-auto">{t(`argomenti.${argomento.id}.descrizione`)}</p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-display text-4xl md:text-6xl font-light leading-[1.1] mb-5">
                                {t('hero.title_part1')} <span className="text-oro-shimmer">{t('hero.title_highlight')}</span>{t('hero.title_part2')}
                            </h1>
                            <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-2xl mx-auto">
                                {t('hero.subtitle')}
                            </p>
                        </>
                    )}
                </div>
            </section>

            {/* Gli argomenti: compaiono solo quelli che hanno già articoli */}
            {argomentiConArticoli.length > 0 && (
                <nav aria-label={t('hero.badge')} className="max-w-5xl mx-auto px-6 pb-8 flex flex-wrap justify-center gap-2">
                    <Link to={`/${lingua}/novita`}
                        className={`font-body text-xs px-3 py-1.5 border transition-colors ${!argomento ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro'}`}>
                        {t('argomenti_tutti')}
                    </Link>
                    {argomentiConArticoli.map(x => (
                        <Link key={x.id} to={`/${lingua}/novita/argomento/${x.slug[lingua]}`}
                            className={`font-body text-xs px-3 py-1.5 border transition-colors ${argomento?.id === x.id ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro'}`}>
                            {t(`argomenti.${x.id}.nome`)}
                        </Link>
                    ))}
                </nav>
            )}

            {/* Elenco */}
            <section className="max-w-5xl mx-auto px-6 pb-24">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : articoli.length === 0 ? (
                    <div className="text-center py-16">
                        <Newspaper size={34} className="mx-auto text-nebbia/10 mb-4" />
                        <p className="font-display text-xl font-light text-nebbia/40">{t('vuoto.title')}</p>
                        <p className="font-body text-sm text-nebbia/25 mt-2">{t('vuoto.text')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {articoli.map(a => (
                            <Link
                                key={a.slug}
                                to={`/${lingua}/novita/${a.slug}`}
                                className="group flex flex-col bg-slate border border-white/5 hover:border-oro/30 transition-colors overflow-hidden"
                            >
                                {a.copertina_url && (
                                    <img
                                        src={a.copertina_url}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-44 object-cover border-b border-white/5"
                                    />
                                )}
                                <div className="flex-1 flex flex-col p-5">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {a.categoria && (
                                            <span className="font-body text-xs px-2 py-0.5 border border-salvia/30 text-salvia bg-salvia/10">
                                                {a.categoria}
                                            </span>
                                        )}
                                        <span className="font-body text-xs text-nebbia/30">{fmtDataLunga(a.pubblicato_il, lingua)}</span>
                                    </div>
                                    <h2 className="font-display text-xl font-light text-nebbia leading-snug group-hover:text-oro transition-colors">
                                        {a.titolo}
                                    </h2>
                                    {a.sommario && (
                                        <p className="font-body text-sm text-nebbia/45 leading-relaxed mt-2 flex-1">{a.sommario}</p>
                                    )}
                                    <span className="flex items-center gap-2 font-body text-xs text-nebbia/30 mt-4">
                                        {firmaAutore(a.autore)}
                                        <ArrowRight size={12} className="text-oro/50 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
