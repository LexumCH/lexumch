import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import i18n, { LINGUE_SUPPORTATE } from '@/i18n'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data ?? null)

    // ─── Applica la lingua del profilo a i18next ───
    // Il profilo Supabase è la fonte di verità per gli utenti loggati.
    // Sovrascrive eventuali preferenze in localStorage del PC corrente
    // (utile per PC condivisi negli studi).
    if (data?.lingua && LINGUE_SUPPORTATE.includes(data.lingua) && i18n.language !== data.lingua) {
      i18n.changeLanguage(data.lingua)
    }
  }

  useEffect(() => {
    // Controlla sessione iniziale — loading si sblocca subito,
    // il profilo arriva in modo indipendente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    profile,
    loading,
    role: profile?.role ?? null,
    signOut: () => supabase.auth.signOut(),
    reloadProfile: () => user ? loadProfile(user.id) : Promise.resolve(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)