// src/hooks/useTipoStudio.js
//
// Determina il tipo di studio a cui il cliente è collegato leggendo il ruolo del
// professionista di riferimento (profiles.avvocato_id → profiles.role). Serve a
// rendere il portale cliente consapevole del tipo di studio: menu, etichette,
// KPI. Ruoli CH: 'avvocato' | 'fiduciario' | 'progettista'.
//
// Il cliente PUÒ leggere il profilo del proprio professionista grazie alla policy
// RLS `profiles_select_mio_professionista`.
//
// Ritorna default null finché il tipo non è determinato o se manca il
// collegamento, così il portale resta retrocompatibile (fallback = avvocato).

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function useTipoStudio() {
  const { profile } = useAuth()
  const [tipoStudio, setTipoStudio] = useState(null) // 'avvocato' | 'fiduciario' | 'progettista' | null
  const [professionista, setProfessionista] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let attivo = true
    async function carica() {
      if (!profile?.avvocato_id) {
        if (attivo) { setTipoStudio(null); setProfessionista(null); setLoading(false) }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, cognome, role')
        .eq('id', profile.avvocato_id)
        .single()
      if (!attivo) return
      if (data) {
        setTipoStudio(data.role ?? null)
        setProfessionista(data)
      }
      setLoading(false)
    }
    carica()
    return () => { attivo = false }
  }, [profile?.avvocato_id])

  const isFiduciario = tipoStudio === 'fiduciario'
  const isAvvocato = tipoStudio === 'avvocato'
  const isProgettista = tipoStudio === 'progettista'

  return {
    tipoStudio,
    isFiduciario,
    isAvvocato,
    isProgettista,
    professionista,
    loading,
  }
}

export default useTipoStudio
