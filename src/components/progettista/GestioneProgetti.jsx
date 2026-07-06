// src/components/progettista/GestioneProgetti.jsx
//
// Tab "Progetti" della scheda cliente (ruolo progettista).
// Lista i progetti del cliente (tabella progetti) + crea (via modal NuovoProgetto).
// Il click su una riga porta al dettaglio progetto (/progetti/:id).
// Speculare a fiduciario/GestioneMandati.
//
// Props:
//   clienteId (string) - cliente/committente di cui mostrare i progetti

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, DraftingCompass, AlertCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NuovoProgetto from './NuovoProgetto'

const STATO_CONFIG = {
  aperto: { label: 'Aperto', cls: 'border-salvia/40 text-salvia' },
  in_corso: { label: 'In corso', cls: 'border-oro/40 text-oro' },
  sospeso: { label: 'Sospeso', cls: 'border-amber-400/40 text-amber-400' },
  chiuso: { label: 'Chiuso', cls: 'border-white/15 text-nebbia/40' },
  archiviato: { label: 'Archiviato', cls: 'border-white/15 text-nebbia/40' },
}

export default function GestioneProgetti({ clienteId }) {
  const navigate = useNavigate()
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [modalAperto, setModalAperto] = useState(false)

  useEffect(() => { carica() }, [clienteId])

  async function carica() {
    setLoading(true); setErrore('')
    const { data, error } = await supabase
      .from('progetti')
      .select('id, nome, comune, cantone, destinazione, stato, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    if (error) setErrore(error.message)
    setProgetti(data ?? [])
    setLoading(false)
  }

  const nAttivi = progetti.filter(p => ['aperto', 'in_corso'].includes(p.stato)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-body text-sm text-nebbia/40">
          {progetti.length} {progetti.length === 1 ? 'progetto' : 'progetti'}
          {progetti.length > 0 && (
            <span className="ml-2 text-nebbia/25">· {nAttivi} attivi</span>
          )}
        </p>
        <button onClick={() => setModalAperto(true)}
          className="btn-primary text-sm flex items-center gap-2">
          <Plus size={14} /> Nuovo progetto
        </button>
      </div>

      {errore && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : progetti.length === 0 ? (
        <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
          <DraftingCompass size={32} className="text-nebbia/15" />
          <div>
            <p className="font-body text-sm text-nebbia/40">Nessun progetto per questo committente</p>
            <p className="font-body text-xs text-nebbia/25 mt-1">
              Crea il primo progetto e carica i disegni PDF per l'analisi.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {progetti.map(p => {
            const sc = STATO_CONFIG[p.stato] ?? STATO_CONFIG.aperto
            return (
              <button key={p.id} onClick={() => navigate(`/progetti/${p.id}`)}
                className="w-full text-left bg-slate border border-white/5 hover:border-oro/30 hover:bg-petrolio/40 transition-colors p-4 flex items-center gap-3 group">
                <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                  <DraftingCompass size={15} className="text-oro" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm font-medium text-nebbia truncate">{p.nome}</span>
                    <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {[p.comune, p.cantone, p.destinazione].filter(Boolean).length > 0 && (
                      <span className="font-body text-xs text-nebbia/40">
                        {[p.comune, p.cantone, p.destinazione].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="font-body text-xs text-nebbia/25">
                      dal {new Date(p.created_at).toLocaleDateString('it-CH')}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {modalAperto && (
        <NuovoProgetto
          clienteId={clienteId}
          onClose={() => setModalAperto(false)}
          onSaved={(nuovoId) => {
            setModalAperto(false)
            if (nuovoId) navigate(`/progetti/${nuovoId}`)
            else carica()
          }}
        />
      )}
    </div>
  )
}
