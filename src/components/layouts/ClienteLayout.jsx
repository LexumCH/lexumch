import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import {
  Home, FolderOpen, Calendar, FileText,
  MessageSquare, CreditCard, User, LogOut, Menu
} from 'lucide-react'
import CampanellaNotifiche from '@/components/shared/CampanellaNotifiche'

const NAV = [
  { path: '/portale', labelKey: 'nav.panoramica', icon: Home },
  { path: '/portale/pratiche', labelKey: 'nav.pratiche', icon: FolderOpen },
  { path: '/portale/appuntamenti', labelKey: 'nav.appuntamenti', icon: Calendar },
  { path: '/portale/documenti', labelKey: 'nav.documenti', icon: FileText },
  { path: '/portale/comunicazioni', labelKey: 'nav.comunicazioni', icon: MessageSquare },
  { path: '/portale/fatture', labelKey: 'nav.fatture', icon: CreditCard },
  { path: '/portale/profilo', labelKey: 'nav.profilo', icon: User },
]

export default function ClienteLayout({ children }) {
  const { t } = useTranslation('comp_layout_cliente')
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-petrolio">
      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-56 bg-slate border-r border-white/5
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-center px-5 py-6 border-b border-white/5">
          <img src={logo} alt="Lexum" className="h-16 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {NAV.map(({ path, labelKey, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/portale'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 font-body text-sm transition-colors ${isActive ? 'bg-oro/10 text-oro border-r-2 border-oro' : 'text-nebbia/50 hover:text-nebbia hover:bg-white/5'
                }`
              }>
              <Icon size={16} strokeWidth={1.5} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-salvia/20 border border-salvia/30 flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-salvia">
                {profile?.nome?.[0] ?? 'C'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-medium text-nebbia truncate">
                {profile?.nome} {profile?.cognome}
              </p>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors px-1 py-1">
            <LogOut size={13} /> {t('azioni.esci')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header desktop con campanella */}
        <header className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-white/5 bg-slate">
          <CampanellaNotifiche />
        </header>

        {/* Header mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia"><Menu size={20} /></button>
          <img src={logo} alt="Lexum" className="h-10 w-auto" />
          <div className="ml-auto">
            <CampanellaNotifiche />
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}