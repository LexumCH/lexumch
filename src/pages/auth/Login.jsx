import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'

const ROLE_HOME = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  fiduciario: '/dashboard',
  progettista: '/dashboard',
  cliente: '/portale',
  user: '/area',
}

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (authErr) throw authErr

      // Carica profilo per redirect
      // Carica profilo per redirect
      // Carica profilo per redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role ?? 'user'
      navigate(ROLE_HOME[role] ?? '/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? t('login.err_invalid')
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
      {/* Logo only */}
      <Link to="/" className="mb-10 group">
        <img src={logo} alt="Lexum" className="h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-slate border border-white/5 p-8">
        <p className="section-label mb-6">{t('login.section_label')}</p>
        <h1 className="font-display text-4xl font-light text-nebbia mb-8">
          {t('login.title')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('login.email_label')}</label>
            <input
              type="email" required autoComplete="email"
              placeholder={t('login.email_placeholder')}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
            />
          </div>

          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('login.password_label')}</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-11 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-oro cursor-pointer"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
            ) : (
              <><ArrowRight size={16} /> {t('login.submit')}</>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 pt-6 border-t border-white/5">
          <Link to="/recupera-password" className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors text-center">
            {t('login.forgot')}
          </Link>
          <p className="font-body text-xs text-nebbia/30 text-center">
            {t('login.no_account')}{' '}
            <Link to="/registrati" className="text-oro hover:text-oro/70 transition-colors">
              {t('login.register_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}