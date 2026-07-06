// src/pages/progettista/Dashboard.jsx
//
// Dashboard del progettista: quadro generale dello STUDIO (non di un cliente).
// Centro = lo studio e ciò che il progettista deve tenere d'occhio:
//   - portfolio: clienti/committenti, progetti attivi
//   - ultimi progetti (con committente) come scorciatoia
// I progetti si creano DENTRO il cliente (tab Progetti), stile mandati/pratiche.

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Users, DraftingCompass, FolderOpen, ChevronRight, ArrowRight,
} from 'lucide-react'

const STATO_CONFIG = {
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

export default function ProgettistaDashboard() {
  const { profile } = useAuth()

  const { data: progetti = [] } = useQuery({
    queryKey: ['progetti_dashboard', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('id, nome, comune, cantone, stato, created_at, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: nClienti = 0 } = useQuery({
    queryKey: ['clienti_count', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'cliente')
      if (error) throw error
      return count ?? 0
    },
  })

  const attivi = progetti.filter(p => ['aperto', 'in_corso'].includes(p.stato))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl text-nebbia">Benvenuto, {profile?.nome}</h1>
        <p className="font-body text-sm text-nebbia/50 mt-1">Quadro generale dello studio</p>
      </div>

      {/* Portfolio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/clienti"
          className="bg-slate border border-white/5 hover:border-oro/30 p-5 transition-colors group">
          <Users size={20} className="text-nebbia/30 mb-3" />
          <p className="font-display text-3xl text-nebbia">{nClienti}</p>
          <p className="font-body text-xs text-nebbia/40 mt-1 flex items-center gap-1">
            Committenti <ArrowRight size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
          </p>
        </Link>
        <div className="bg-slate border border-white/5 p-5">
          <DraftingCompass size={20} className="text-nebbia/30 mb-3" />
          <p className="font-display text-3xl text-nebbia">{attivi.length}</p>
          <p className="font-body text-xs text-nebbia/40 mt-1">Progetti attivi</p>
        </div>
        <div className="bg-slate border border-white/5 p-5">
          <FolderOpen size={20} className="text-nebbia/30 mb-3" />
          <p className="font-display text-3xl text-nebbia">{progetti.length}</p>
          <p className="font-body text-xs text-nebbia/40 mt-1">Progetti totali</p>
        </div>
      </div>

      {/* Ultimi progetti */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm uppercase tracking-wider text-nebbia/40">Ultimi progetti</h2>
          {progetti.length > 0 && (
            <Link to="/progetti" className="font-body text-xs text-oro/70 hover:text-oro flex items-center gap-1">
              Tutti i progetti <ChevronRight size={12} />
            </Link>
          )}
        </div>
        {progetti.length === 0 ? (
          <div className="border border-white/5 bg-slate p-10 text-center">
            <DraftingCompass size={28} className="mx-auto text-nebbia/20 mb-3" />
            <p className="font-body text-sm text-nebbia/50">
              Nessun progetto ancora. Apri un <Link to="/clienti" className="text-oro/80 hover:text-oro">committente</Link> e
              crea il primo progetto dalla sua scheda, poi carica i disegni PDF per l'analisi.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {progetti.slice(0, 6).map(p => {
              const stato = STATO_CONFIG[p.stato] ?? STATO_CONFIG.aperto
              const cliente = nomeCliente(p.cliente)
              return (
                <Link key={p.id} to={`/progetti/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 bg-slate border border-white/5 hover:border-oro/30 transition-colors group">
                  <DraftingCompass size={16} className="text-nebbia/30" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
                    <p className="font-body text-xs text-nebbia/40 truncate">
                      {[cliente, p.comune, p.cantone].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 border font-body text-[11px] ${stato.cls}`}>
                    {stato.label}
                  </span>
                  <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
