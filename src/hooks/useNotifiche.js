// src/hooks/useNotifiche.js
//
// Hook condiviso per gestione notifiche: fetch iniziale, subscribe
// realtime su nuovi inserimenti, mark-as-read, conteggio non lette.
//
// Uso:
//   const { notifiche, nonLette, loading, marcaLetta, marcaTutteLette, ricarica }
//     = useNotifiche({ limit: 10 });

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifiche({ limit = 10 } = {}) {
    const [notifiche, setNotifiche] = useState([])
    const [loading, setLoading] = useState(true)
    const userIdRef = useRef(null)

    // ─── Conteggio non lette ─────────────────────────────────
    const nonLette = notifiche.filter(n => n.letto_at === null).length

    // ─── Fetch iniziale ──────────────────────────────────────
    const carica = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setNotifiche([])
            setLoading(false)
            return
        }
        userIdRef.current = user.id

        const { data, error } = await supabase
            .from('notifiche')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('useNotifiche fetch error:', error.message)
            setNotifiche([])
        } else {
            setNotifiche(data ?? [])
        }
        setLoading(false)
    }, [limit])

    useEffect(() => { carica() }, [carica])

    // ─── Subscribe realtime ──────────────────────────────────
    useEffect(() => {
        let channel = null

        async function subscribe() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            channel = supabase
                .channel(`notifiche-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifiche',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        setNotifiche(prev => {
                            // Evita duplicati (es. se gia' inserito da fetch)
                            if (prev.some(n => n.id === payload.new.id)) return prev
                            return [payload.new, ...prev].slice(0, limit)
                        })
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifiche',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        setNotifiche(prev =>
                            prev.map(n => (n.id === payload.new.id ? payload.new : n))
                        )
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'notifiche',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        setNotifiche(prev => prev.filter(n => n.id !== payload.old.id))
                    }
                )
                .subscribe()
        }

        subscribe()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [limit])

    // ─── Marca una notifica come letta ───────────────────────
    const marcaLetta = useCallback(async (id) => {
        // Update ottimistico
        setNotifiche(prev =>
            prev.map(n => (n.id === id ? { ...n, letto_at: new Date().toISOString() } : n))
        )

        const { error } = await supabase
            .from('notifiche')
            .update({ letto_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('marcaLetta error:', error.message)
            // Rollback in caso di errore
            carica()
        }
    }, [carica])

    // ─── Marca tutte come lette ──────────────────────────────
    const marcaTutteLette = useCallback(async () => {
        const ora = new Date().toISOString()
        const idsNonLette = notifiche.filter(n => n.letto_at === null).map(n => n.id)
        if (idsNonLette.length === 0) return

        setNotifiche(prev =>
            prev.map(n => (n.letto_at === null ? { ...n, letto_at: ora } : n))
        )

        const { error } = await supabase
            .from('notifiche')
            .update({ letto_at: ora })
            .in('id', idsNonLette)

        if (error) {
            console.error('marcaTutteLette error:', error.message)
            carica()
        }
    }, [notifiche, carica])

    // ─── Elimina una notifica ────────────────────────────────
    const elimina = useCallback(async (id) => {
        setNotifiche(prev => prev.filter(n => n.id !== id))
        const { error } = await supabase.from('notifiche').delete().eq('id', id)
        if (error) {
            console.error('elimina notifica error:', error.message)
            carica()
        }
    }, [carica])

    return {
        notifiche,
        nonLette,
        loading,
        marcaLetta,
        marcaTutteLette,
        elimina,
        ricarica: carica,
    }
}