import { Link } from 'react-router-dom'
import { Mail, Shield, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logo.png'

export default function Footer() {
  const { t } = useTranslation('comp_footer')

  const navLinks = [
    { to: '/', key: 'home' },
    { to: '/per-avvocati', key: 'lawyers' },
    { to: '/#lexai', key: 'lex_ai' },
    { to: '/contatti', key: 'contacts' },
  ]

  const trustItems = [
    { icon: Shield, text: t('trust.encrypted') },
    { icon: Lock, text: t('trust.compliance') },
    { icon: Mail, text: 'info@lexum.it' },
  ]

  return (
    <footer className="border-t border-white/5 bg-petrolio">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand */}
          <div>
            <img src={logo} alt="Lexum" className="h-12 w-auto mb-4" />
            <p className="font-body text-sm text-nebbia/35 leading-relaxed max-w-xs">
              {t('brand.description')}
            </p>
            <div className="flex items-center gap-1.5 mt-5">
              <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
              <span className="font-body text-xs text-nebbia/25">{t('brand.status')}</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="font-body text-xs text-nebbia/30 tracking-[0.25em] uppercase mb-5">{t('nav.title')}</p>
            <ul className="space-y-3">
              {navLinks.map(({ to, key }) => (
                <li key={to}>
                  <Link to={to} className="font-body text-sm text-nebbia/40 hover:text-oro transition-colors">
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust */}
          <div>
            <p className="font-body text-xs text-nebbia/30 tracking-[0.25em] uppercase mb-5">{t('trust.title')}</p>
            <ul className="space-y-4">
              {trustItems.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                    <Icon size={12} className="text-salvia" />
                  </div>
                  <span className="font-body text-sm text-nebbia/40">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p className="font-body text-xs text-nebbia/20">
              {t('bottom.copyright', { year: new Date().getFullYear() })}
            </p>
            <span className="hidden sm:block text-nebbia/10">·</span>
            <p className="font-body text-xs text-nebbia/20">
              Alpi Consulenti Associati SA · CHE-243.562.655 · c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="font-body text-xs text-nebbia/20 hover:text-nebbia/40 transition-colors">
              {t('bottom.privacy')}
            </Link>
            <Link to="/termini" className="font-body text-xs text-nebbia/20 hover:text-nebbia/40 transition-colors">
              {t('bottom.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
