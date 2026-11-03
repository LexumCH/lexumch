// La sezione degli strumenti gratuiti nelle pagine della vetrina (03-11-2026).
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'
import { percorsoFattura } from '@/lib/strumenti/percorsi'

export default function SezioneStrumenti() {
    const { t, i18n } = useTranslation('strumenti')
    const lingua = LINGUE_SUPPORTATE.includes(i18n.language) ? i18n.language : LINGUA_DEFAULT
    return (
        <section className="py-24 px-6 border-t border-white/5">
            <div className="max-w-3xl mx-auto text-center">
                <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-3">{t('sezione.label')}</p>
                <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-8">
                    {t('sezione.title')} <span className="text-oro">{t('sezione.highlight')}</span>
                </h2>
                <Link to={percorsoFattura(lingua)} className="group flex flex-col items-center bg-slate border border-white/5 hover:border-oro/30 transition-colors p-7">
                    <FileText size={20} className="text-oro mb-4" />
                    <h3 className="font-display text-xl font-light text-nebbia group-hover:text-oro transition-colors mb-2">{t('fattura.nome')}</h3>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">{t('fattura.breve')}</p>
                    <span className="flex items-center gap-2 font-body text-xs text-oro mt-4">
                        {t('sezione.apri')} <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>
            </div>
        </section>
    )
}
