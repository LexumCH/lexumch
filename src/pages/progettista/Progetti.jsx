// src/pages/progettista/Progetti.jsx
//
// Lista globale di TUTTI i progetti dello studio, trasversale ai clienti
// (stile "Banco lavoro" del fiduciario). I progetti si CREANO dentro il
// cliente (tab Progetti): qui è solo consultazione + accesso rapido.

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { DraftingCompass, ChevronRight, Search, Users } from 'lucide-react'

const STATI = {
  aperto: { label: 'Aperto', cls: 'text-salvia bg-salvia/10 border-salvia/30' },
  in_corso: { label: 'In corso', cls: 'text-oro bg-oro/10 border-oro/30' },
  sospeso: { label: 'Sospeso', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  chiuso: { label: 'Chiuso', cls: 'text-nebbia/50 bg-white/5 border-white/10' },
  archiviato: { label: 'Archiviato', cls: 'text-nebbia/40 bg-white/5 border-white/10' },
}

function nomeCliente(c) {
  if (!c) return null
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? null
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
}

export default function Progetti() {
  const { profile } = useAuth()
  const [q, setQ] = useState('')

  const { data: progetti = [], isLoading } = useQuery({
    queryKey: ['progetti_all', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('id, nome, comune, cantone, destinazione, stato, created_at, cliente_id, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const filtrati = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return progetti
    return progetti.filter(p =>
      p.nome?.toLowerCase().includes(s) ||
      p.comune?.toLowerCase().includes(s) ||
      nomeCliente(p.cliente)?.toLowerCase().includes(s))
  }, [progetti, q])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-nebbia">Progetti</h1>
          <p className="font-body text-sm text-nebbia/50 mt-1">
            Tutti i progetti dello studio. Per crearne uno nuovo, aprilo dalla scheda del committente.
          </p>
        </div>
      </div>

      {progetti.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cerca per nome, committente o comune…"
            className="w-full bg-slate border border-white/10 pl-9 pr-3 py-2.5 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none" />
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : progetti.length === 0 ? (
        <div className="border border-white/5 bg-slate p-10 text-center">
          <DraftingCompass size={28} className="mx-auto text-nebbia/20 mb-3" />
          <p className="font-body text-sm text-nebbia/50">
            Nessun progetto. Apri un <Link to="/clienti" className="text-oro/80 hover:text-oro">committente</Link> e
            crea il primo progetto dalla sua scheda.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtrati.map(p => {
            const stato = STATI[p.stato] ?? STATI.aperto
            const cliente = nomeCliente(p.cliente)
            return (
              <Link key={p.id} to={`/progetti/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 bg-slate border border-white/5 hover:border-oro/30 transition-colors group">
                <DraftingCompass size={16} className="text-nebbia/30" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
                  <p className="font-body text-xs text-nebbia/40 truncate flex items-center gap-1.5">
                    {cliente && <><Users size={11} className="shrink-0" />{cliente}</>}
                    {[p.comune, p.cantone, p.destinazione].filter(Boolean).length > 0 && (
                      <span>· {[p.comune, p.cantone, p.destinazione].filter(Boolean).join(' · ')}</span>
                    )}
                  </p>
                </div>
                <span className={`px-2 py-0.5 border font-body text-[11px] ${stato.cls}`}>
                  {stato.label}
                </span>
                <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors" />
              </Link>
            )
          })}
          {filtrati.length === 0 && (
            <div className="border border-white/5 bg-slate p-8 text-center">
              <p className="font-body text-sm text-nebbia/40">Nessun progetto corrisponde alla ricerca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
