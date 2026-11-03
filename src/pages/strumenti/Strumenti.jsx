// src/pages/strumenti/Strumenti.jsx
//
// 03-11-2026: la pagina degli strumenti gratuiti. Si usano senza account e senza AI: portano qui chi cerca
// «crea QR-fattura», e dopo il primo documento c'è l'invito a provare Lex. Il calcolo della parcella del sito
// italiano qui non c'è: in Svizzera le tariffe degli avvocati sono cantonali.
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import { TestataPagina, Apertura } from '@/components/strumenti/Pagina'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'
import { percorsoFattura } from '@/lib/strumenti/percorsi'

export default function Strumenti() {
    const { lang } = useParams()
    const lingua = LINGUE_SUPPORTATE.includes(lang) ? lang : LINGUA_DEFAULT
    const { t } = useTranslation('strumenti')
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina lingua={lingua} percorsoDi={l => `/${l}/strumenti`} titolo={t('hub.meta_title')} descrizione={t('hub.meta_description')} />
            <Apertura etichetta={t('hub.label')} titolo={t('hub.title')} evidenza={t('hub.highlight')} testo={t('hub.text')} />
            <section className="max-w-2xl mx-auto px-6 pb-16">
                <Link to={percorsoFattura(lingua)}
                    className="group flex flex-col bg-slate border border-white/5 hover:border-oro/30 transition-colors p-7">
                    <FileText size={22} className="text-oro mb-5" />
                    <h2 className="font-display text-2xl font-light text-nebbia group-hover:text-oro transition-colors mb-3">{t('fattura.nome')}</h2>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed flex-1">{t('fattura.breve')}</p>
                    <span className="flex items-center gap-2 font-body text-sm text-oro mt-6">
                        {t('hub.apri')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>
            </section>
            <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
                <h2 className="font-display text-3xl font-light mb-4">{t('hub.lex_title')} <span className="text-oro">{t('hub.lex_highlight')}</span></h2>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-7">{t('hub.lex_text')}</p>
                <Link to="/registrati" className="inline-flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                    {t('hub.lex_cta')} <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    )
}
