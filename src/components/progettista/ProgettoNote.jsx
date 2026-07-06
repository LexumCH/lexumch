// src/components/progettista/ProgettoNote.jsx
//
// Tab "Note" del dettaglio progetto: annotazioni interne, private dello studio.
// Textarea + "Aggiungi nota" in alto, lista note (piu recenti prima) sotto.
//
// Props: progettoId (string)

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { StickyNote, Plus, Loader2, Trash2 } from 'lucide-react'

export default function ProgettoNote({ progettoId }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState(null)

  const { data: note = [], isLoading } = useQuery({
    queryKey: ['progetto_note', progettoId, profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_note')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('progettista_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const aggiungi = useMutation({
    mutationFn: async (t) => {
      const { error } = await supabase.from('progetto_note').insert({
        progetto_id: progettoId,
        progettista_id: profile.id,
        testo: t,
      })
      if (error) throw error
    },
    onMutate: () => setErrore(null),
    onSuccess: () => {
      setTesto('')
      queryClient.invalidateQueries({ queryKey: ['progetto_note', progettoId] })
    },
    onError: (e) => setErrore(e.message),
  })

  const elimina = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('progetto_note').delete()
        .eq('id', id).eq('progettista_id', profile.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_note', progettoId] }),
    onError: (e) => setErrore(e.message),
  })

  function submit() {
    const t = testo.trim()
    if (!t || aggiungi.isPending) return
    aggiungi.mutate(t)
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote size={15} className="text-oro" />
          <h2 className="font-display text-sm text-nebbia">Note interne</h2>
        </div>
        <textarea
          value={testo}
          onChange={e => setTesto(e.target.value)}
          rows={3}
          placeholder="Scrivi una nota sul progetto…"
          className="w-full bg-petrolio border border-white/10 px-3 py-2 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none resize-none placeholder:text-nebbia/25"
        />
        <div className="flex items-center justify-between gap-3 mt-3">
          {errore
            ? <p className="font-body text-xs text-red-400">{errore}</p>
            : <p className="font-body text-xs text-nebbia/40">Le note sono private dello studio.</p>}
          <button
            onClick={submit}
            disabled={!testo.trim() || aggiungi.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0"
          >
            {aggiungi.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Aggiungi nota
          </button>
        </div>
      </div>

      {/* Lista note */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : note.length === 0 ? (
        <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
          <StickyNote size={32} className="text-nebbia/15" />
          <div>
            <p className="font-body text-sm text-nebbia/40">Nessuna nota</p>
            <p className="font-body text-xs text-nebbia/25 mt-1">Le note sono private dello studio.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {note.map(n => (
            <div key={n.id} className="bg-slate border border-white/5 hover:border-oro/30 transition-colors p-5 flex items-start gap-3 group">
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-nebbia whitespace-pre-wrap break-words">{n.testo}</p>
                <p className="font-body text-xs text-nebbia/25 mt-2">
                  {new Date(n.created_at).toLocaleString('it-CH')}
                </p>
              </div>
              <button
                onClick={() => { if (confirm('Eliminare questa nota?')) elimina.mutate(n.id) }}
                disabled={elimina.isPending}
                className="p-1.5 text-nebbia/30 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                title="Elimina nota"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
