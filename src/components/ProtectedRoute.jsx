// src/components/ProtectedRoute.jsx

import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function ProtectedRoute({ roles, children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [aalLoaded, setAalLoaded] = useState(false)
  const [needsMfaVerify, setNeedsMfaVerify] = useState(false)

  useEffect(() => {
    async function checkAal() {
      // Se l'utente non ha MFA attivo, niente da verificare
      if (!profile?.mfa_attivo) {
        setNeedsMfaVerify(false)
        setAalLoaded(true)
        return
      }

      // L'utente ha MFA: controlla il livello sessione
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        // currentLevel = aal1 e nextLevel = aal2 -> deve verificare
        const deveVerificare = data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2'
        setNeedsMfaVerify(deveVerificare)
      } catch (e) {
        console.error('AAL check:', e)
        setNeedsMfaVerify(false)
      } finally {
        setAalLoaded(true)
      }
    }

    if (!loading && user) {
      checkAal()
    } else if (!loading && !user) {
      setAalLoaded(true)
    }
  }, [user, profile, loading])

  if (loading || !aalLoaded || (user && !profile)) {
    return (
      <div className="min-h-screen bg-petrolio flex items-center justify-center">
        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
      </div>
    )
  }

  // Non loggato -> login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // MFA attivo ma sessione aal1 -> deve verificare
  // (eccezione: la pagina /verifica-2fa stessa)
  if (needsMfaVerify && location.pathname !== '/verifica-2fa') {
    return <Navigate to="/verifica-2fa" replace />
  }

  // ADMIN senza MFA attivato: forza setup
  // Eccezione: pagina /admin/profilo (deve poterla aprire per attivarlo)
  if (profile?.role === 'admin' && !profile?.mfa_attivo && location.pathname !== '/admin/profilo') {
    return <Navigate to="/admin/profilo?setup_mfa=1" replace />
  }

  // Check ruolo
  if (roles && !roles.includes(profile?.role)) {
    // Se profile e' caricato ma il ruolo non matcha, vai alla home.
    // Se profile e' null per qualche errore, vai al login (piu' chiaro).
    return <Navigate to={profile ? '/' : '/login'} replace />
  }

  return children
}