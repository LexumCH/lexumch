import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { DraftingCompass, Plus, FileText, ChevronRight } from 'lucide-react'

const STATI = {
  aperto: { label: 'Aperto', cls: 'text-salvia bg-salvia/10 border-salvia/30' },
  in_corso: { label: 'In corso', cls: 'text-oro bg-oro/10 border-oro/30' },
  sospeso: { label: 'Sospeso', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  chiuso: { label: 'Chiuso', cls: 'text-nebbia/50 bg-white/5 border-white/10' },
  archiviato: { label: 'Archiviato', cls: 'text-nebbia/40 bg-white/5 border-white/10' },
}

export default function ProgettistaDashboard() {
  const { profile } = useAuth()

  const { data: progetti = [] } = useQuery({
    queryKey: ['progetti', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('id, nome, committente, comune, cantone, stato, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const attivi = progetti.filter(p => ['aperto', 'in_corso'].includes(p.stato))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-nebbia">
            Benvenuto, {profile?.nome}
          </h1>
          <p className="font-body text-sm text-nebbia/50 mt-1">
            {attivi.length} progetti attivi su {progetti.length} totali
          </p>
        </div>
        <Link to="/progetti?nuovo=1"
          className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
          <Plus size={15} /> Nuovo progetto
        </Link>
      </div>

      <section>
        <h2 className="font-display text-sm uppercase tracking-wider text-nebbia/40 mb-3">
          Ultimi progetti
        </h2>
        {progetti.length === 0 ? (
          <div className="border border-white/5 bg-slate p-10 text-center">
            <DraftingCompass size={28} className="mx-auto text-nebbia/20 mb-3" />
            <p className="font-body text-sm text-nebbia/50">
              Nessun progetto ancora. Crea il primo e carica i disegni PDF per l'analisi.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {progetti.slice(0, 6).map(p => {
              const stato = STATI[p.stato] ?? STATI.aperto
              return (
                <Link key={p.id} to={`/progetti/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 bg-slate border border-white/5 hover:border-oro/30 transition-colors group">
                  <FileText size={16} className="text-nebbia/30" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
                    <p className="font-body text-xs text-nebbia/40 truncate">
                      {[p.committente, p.comune, p.cantone].filter(Boolean).join(' · ')}
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
