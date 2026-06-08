// src/pages/TerminiServizio.jsx
import { FileText, AlertCircle, Shield, CreditCard } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

// Costanti (identiche in tutte le lingue)
const TERMINI_EMAIL = 'info@lexum.ch'
const COMPANY_NAME = 'Alpi Consulenti Associati SA'
const COMPANY_VAT = 'CHE-243.562.655'
const COMPANY_ADDRESS = 'c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano, Svizzera'
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

export default function TerminiServizio() {
  const { t, i18n } = useTranslation('termini')
  const toArray = (val) => Array.isArray(val) ? val : []

  const descrizioneItems = toArray(t('descrizione.items', { returnObjects: true }))
  const reg32Items = toArray(t('registrazione.sub32_items', { returnObjects: true }))
  const piani47Items = toArray(t('piani.sub47_items', { returnObjects: true }))
  const contenuti54Items = toArray(t('contenuti.sub54_items', { returnObjects: true }))
  const usoItems = toArray(t('uso.items', { returnObjects: true }))
  const responsabilitaItems = toArray(t('responsabilita.items', { returnObjects: true }))
  const risoluzione112Items = toArray(t('risoluzione.sub112_items', { returnObjects: true }))

  const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
  const updated = new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-petrolio text-nebbia pt-20">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <Helmet>
          <title>{t('meta.title')}</title>
          <meta name="description" content={t('meta.description')} />
          <meta name="robots" content="noindex, follow" />
          <link rel="canonical" href="https://www.lexum.ch/termini" />
        </Helmet>

        {/* Header */}
        <div className="space-y-4">
          <p className="font-body text-xs text-salvia/60 tracking-[0.3em] uppercase">{t('header.label')}</p>
          <h1 className="font-display text-5xl font-light text-nebbia">{t('header.h1')}</h1>
          <p className="font-body text-sm text-nebbia/40">
            {t('header.updated_prefix')} {updated}
          </p>
          <div className="bg-slate border border-oro/15 p-4 flex items-start gap-3">
            <AlertCircle size={14} className="text-oro shrink-0 mt-0.5" />
            <p className="font-body text-xs text-nebbia/50 leading-relaxed">
              {t('header.intro')}
            </p>
          </div>
        </div>

        {/* 1. Parti */}
        <Section title={t('parti.title')}>
          <p>{t('parti.p1')}</p>
          <div className="bg-slate border border-white/5 p-5 space-y-1.5">
            <p className="font-medium text-nebbia">{COMPANY_NAME}</p>
            <p>{COMPANY_VAT}</p>
            <p>{COMPANY_ADDRESS}</p>
            <p className="text-nebbia/40 text-xs mt-2">{t('parti.company_suffix')}</p>
          </div>
          <p>{t('parti.p2')}</p>
        </Section>

        {/* 2. Descrizione */}
        <Section title={t('descrizione.title')}>
          <p>{t('descrizione.p1')}</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            {descrizioneItems.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
          <p>{t('descrizione.p2')}</p>
        </Section>

        {/* 3. Registrazione */}
        <Section title={t('registrazione.title')}>
          <Sub title={t('registrazione.sub31_title')}>
            <p>{t('registrazione.sub31_text')}</p>
          </Sub>
          <Sub title={t('registrazione.sub32_title')}>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {reg32Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </Sub>
          <Sub title={t('registrazione.sub33_title')}>
            <p>{t('registrazione.sub33_text')}</p>
          </Sub>
        </Section>

        {/* 4. Piani */}
        <Section title={t('piani.title')}>
          <Sub title={t('piani.sub41_title')}><p>{t('piani.sub41_text')}</p></Sub>
          <Sub title={t('piani.sub42_title')}><p>{t('piani.sub42_text')}</p></Sub>
          <Sub title={t('piani.sub43_title')}><p>{t('piani.sub43_text')}</p></Sub>
          <Sub title={t('piani.sub44_title')}><p>{t('piani.sub44_text')}</p></Sub>
          <Sub title={t('piani.sub45_title')}><p>{t('piani.sub45_text')}</p></Sub>
          <Sub title={t('piani.sub46_title')}><p>{t('piani.sub46_text')}</p></Sub>
          <Sub title={t('piani.sub47_title')}>
            <p>{t('piani.sub47_intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {piani47Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
            <p>{t('piani.sub47_outro')}</p>
          </Sub>
        </Section>

        {/* 5. Contenuti */}
        <Section title={t('contenuti.title')}>
          <Sub title={t('contenuti.sub51_title')}><p>{t('contenuti.sub51_text')}</p></Sub>
          <Sub title={t('contenuti.sub52_title')}><p>{t('contenuti.sub52_text')}</p></Sub>
          <Sub title={t('contenuti.sub53_title')}><p>{t('contenuti.sub53_text')}</p></Sub>
          <Sub title={t('contenuti.sub54_title')}>
            <p>{t('contenuti.sub54_intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {contenuti54Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </Sub>
          <Sub title={t('contenuti.sub55_title')}><p>{t('contenuti.sub55_text')}</p></Sub>
        </Section>

        {/* 6. Uso accettabile */}
        <Section title={t('uso.title')}>
          <p>{t('uso.intro')}</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            {usoItems.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </Section>

        {/* 7. AI */}
        <Section title={t('ai.title')}>
          <Sub title={t('ai.sub71_title')}><p>{t('ai.sub71_text')}</p></Sub>
          <Sub title={t('ai.sub72_title')}><p>{t('ai.sub72_text')}</p></Sub>
          <Sub title={t('ai.sub73_title')}><p>{t('ai.sub73_text')}</p></Sub>
        </Section>

        {/* 8. Disponibilità */}
        <Section title={t('disponibilita.title')}>
          <p>{t('disponibilita.p1')}</p>
          <p>{t('disponibilita.p2')}</p>
          <p>{t('disponibilita.p3')}</p>
        </Section>

        {/* 9. Limitazione responsabilità */}
        <Section title={t('responsabilita.title')}>
          <p>{t('responsabilita.intro')}</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            {responsabilitaItems.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </Section>

        {/* 10. Proprietà intellettuale */}
        <Section title={t('proprieta.title')}>
          <p>{t('proprieta.p1')}</p>
          <p>{t('proprieta.p2')}</p>
        </Section>

        {/* 11. Risoluzione */}
        <Section title={t('risoluzione.title')}>
          <Sub title={t('risoluzione.sub111_title')}><p>{t('risoluzione.sub111_text')}</p></Sub>
          <Sub title={t('risoluzione.sub112_title')}>
            <p>{t('risoluzione.sub112_intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {risoluzione112Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
            <p>{t('risoluzione.sub112_outro')}</p>
          </Sub>
          <Sub title={t('risoluzione.sub113_title')}><p>{t('risoluzione.sub113_text')}</p></Sub>
        </Section>

        {/* 12. Legge applicabile */}
        <Section title={t('legge.title')}>
          <p>{t('legge.p1')}</p>
          <p>{t('legge.p2')}</p>
          <p>{t('legge.p3')}</p>
        </Section>

        {/* 13. Modifiche */}
        <Section title={t('modifiche.title')}>
          <p>{t('modifiche.p1')}</p>
          <p>{t('modifiche.p2')}</p>
        </Section>

        {/* 14. Disposizioni finali */}
        <Section title={t('finali.title')}>
          <p>{t('finali.p1')}</p>
          <p>{t('finali.p2')}</p>
          <p>
            {t('finali.p3_prefix')}{' '}
            <a href={`mailto:${TERMINI_EMAIL}`} className="text-oro hover:text-oro/70 transition-colors">{TERMINI_EMAIL}</a>
          </p>
        </Section>

        {/* Footer */}
        <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
          <FileText size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-nebbia/40 leading-relaxed">
            {COMPANY_NAME} · {COMPANY_VAT} · {COMPANY_ADDRESS} ·
            <a href={`mailto:${TERMINI_EMAIL}`} className="text-oro hover:text-oro/70 transition-colors ml-1">{TERMINI_EMAIL}</a>
          </p>
        </div>

      </div>
    </div>
  )
}
