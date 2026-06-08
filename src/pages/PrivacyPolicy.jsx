// src/pages/PrivacyPolicy.jsx
import { Shield, Lock, Eye, Server, Mail, FileText } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

// Dati del titolare (costanti, identici in tutte le lingue)
const PRIVACY_EMAIL = 'privacy@lexum.ch'
const COMPANY_NAME = 'Alpi Consulenti Associati SA'
const COMPANY_VAT = 'CHE-243.562.655'
const COMPANY_ADDRESS = 'c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano, Svizzera'
const IFPDT_URL = 'https://www.edoeb.admin.ch'
const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

function Section({ title, children }) {
    return (
        <div className="space-y-4">
            <h2 className="font-display text-2xl font-light text-nebbia border-b border-white/5 pb-3">{title}</h2>
            <div className="font-body text-sm text-nebbia/60 leading-relaxed space-y-3">
                {children}
            </div>
        </div>
    )
}

function Sub({ title, children }) {
    return (
        <div className="space-y-2 pl-4 border-l border-white/8">
            <p className="font-body text-sm font-medium text-nebbia/80">{title}</p>
            <div className="font-body text-sm text-nebbia/55 leading-relaxed space-y-2">{children}</div>
        </div>
    )
}

export default function PrivacyPolicy() {
    const { t, i18n } = useTranslation('privacy')
    const toArray = (val) => Array.isArray(val) ? val : []

    const dati21 = toArray(t('dati.sub21_items', { returnObjects: true }))
    const dati22 = toArray(t('dati.sub22_items', { returnObjects: true }))
    const finalitaItems = toArray(t('finalita.items', { returnObjects: true }))
    const destinatariItems = toArray(t('destinatari.items', { returnObjects: true }))
    const conservazioneItems = toArray(t('conservazione.items', { returnObjects: true }))
    const dirittiItems = toArray(t('diritti.items', { returnObjects: true }))
    const sicurezzaItems = toArray(t('sicurezza.items', { returnObjects: true }))

    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const updated = new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-petrolio text-nebbia pt-20">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
                <Helmet>
                    <title>{t('meta.title')}</title>
                    <meta name="description" content={t('meta.description')} />
                    <meta name="robots" content="noindex, follow" />
                    <link rel="canonical" href="https://www.lexum.ch/privacy" />
                </Helmet>

                {/* Header */}
                <div className="space-y-4">
                    <p className="font-body text-xs text-salvia/60 tracking-[0.3em] uppercase">{t('header.label')}</p>
                    <h1 className="font-display text-5xl font-light text-nebbia">{t('header.h1')}</h1>
                    <p className="font-body text-sm text-nebbia/40">
                        {t('header.updated_prefix')} {updated}
                    </p>
                    <div className="bg-slate border border-salvia/15 p-4 flex items-start gap-3">
                        <Shield size={14} className="text-salvia shrink-0 mt-0.5" />
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            {t('header.intro_legal')}
                        </p>
                    </div>
                </div>

                {/* 1. Titolare */}
                <Section title={t('titolare.title')}>
                    <p>{t('titolare.p1')}</p>
                    <div className="bg-slate border border-white/5 p-5 space-y-1.5">
                        <p className="font-medium text-nebbia">{COMPANY_NAME}</p>
                        <p>{COMPANY_VAT}</p>
                        <p>{COMPANY_ADDRESS}</p>
                        <p>{t('titolare.email_label')}: <a href={`mailto:${PRIVACY_EMAIL}`} className="text-oro hover:text-oro/70 transition-colors">{PRIVACY_EMAIL}</a></p>
                    </div>
                    <p>{t('titolare.p2')}</p>
                </Section>

                {/* 2. Dati raccolti */}
                <Section title={t('dati.title')}>
                    <Sub title={t('dati.sub21_title')}>
                        <p>{t('dati.sub21_intro')}</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            {dati21.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                    </Sub>
                    <Sub title={t('dati.sub22_title')}>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            {dati22.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                    </Sub>
                    <Sub title={t('dati.sub23_title')}>
                        <p>{t('dati.sub23_text')}</p>
                    </Sub>
                </Section>

                {/* 3. Finalità */}
                <Section title={t('finalita.title')}>
                    <div className="space-y-4">
                        {finalitaItems.map((item, i) => (
                            <div key={i} className="bg-slate border border-white/5 p-4 space-y-1.5">
                                <p className="font-body text-sm font-medium text-nebbia">{item.finalita}</p>
                                <p className="font-body text-xs text-oro/70">{item.base}</p>
                                <p className="font-body text-xs text-nebbia/45 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 4. Destinatari */}
                <Section title={t('destinatari.title')}>
                    <p>{t('destinatari.intro')}</p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        {destinatariItems.map((it, i) => (
                            <li key={i}><span className="text-nebbia/80">{it.name}</span> — {it.desc}</li>
                        ))}
                    </ul>
                    <p>{t('destinatari.footer')}</p>
                </Section>

                {/* 5. Conservazione */}
                <Section title={t('conservazione.title')}>
                    <div className="space-y-3">
                        {conservazioneItems.map((it, i) => (
                            <div key={i} className="flex justify-between gap-4 py-2 border-b border-white/5">
                                <span className="font-body text-sm text-nebbia/70">{it.tipo}</span>
                                <span className="font-body text-xs text-nebbia/40 text-right max-w-xs">{it.periodo}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 6. Diritti */}
                <Section title={t('diritti.title')}>
                    <p>{t('diritti.intro')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dirittiItems.map((it, i) => (
                            <div key={i} className="bg-slate border border-white/5 p-3 space-y-1">
                                <p className="font-body text-xs font-medium text-nebbia/80">{it.diritto}</p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{it.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p>
                        {t('diritti.footer_a')}{' '}
                        <a href={`mailto:${PRIVACY_EMAIL}`} className="text-oro hover:text-oro/70 transition-colors">{PRIVACY_EMAIL}</a>
                        {t('diritti.footer_b')}{' '}
                        <a href={IFPDT_URL} target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 transition-colors">{t('diritti.ifpdt_link')}</a>
                        {t('diritti.footer_c')}
                    </p>
                </Section>

                {/* 7. Sicurezza */}
                <Section title={t('sicurezza.title')}>
                    <p>{t('sicurezza.p1')}</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        {sicurezzaItems.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                    <p>{t('sicurezza.p2')}</p>
                </Section>

                {/* 8. Cookie */}
                <Section title={t('cookie.title')}>
                    <p>{t('cookie.p1')}</p>
                </Section>

                {/* 9. Modifiche */}
                <Section title={t('modifiche.title')}>
                    <p>{t('modifiche.p1')}</p>
                </Section>

                {/* Footer */}
                <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
                    <Mail size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        {t('footer_box.text_a')}{' '}
                        <a href={`mailto:${PRIVACY_EMAIL}`} className="text-oro hover:text-oro/70 transition-colors">{PRIVACY_EMAIL}</a>
                        {' '}{t('footer_box.text_b')} {COMPANY_NAME}, {COMPANY_ADDRESS}.
                    </p>
                </div>

            </div>
        </div>
    )
}
