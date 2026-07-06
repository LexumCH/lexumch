// src/components/progettista/GestioneProgetti.jsx
//
// Tab "Progetti" della scheda cliente (ruolo progettista).
// Tabella filtrabile dei progetti del committente (stessa grammatica di /progetti,
// scalata al cliente) + crea (modal NuovoProgetto). Click riga → /progetti/:id.
//
// Props:
//   clienteId (string) - cliente/committente di cui mostrare i progetti

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, DraftingCompass, AlertCircle, Search } from 'lucide-react'
import { Badge } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import NuovoProgetto from './NuovoProgetto'

const STATI_VARIANT = {
  aperto: 'salvia', in_corso: 'oro', sospeso: 'warning', chiuso: 'gray', archiviato: 'gray',
}
const STATI_LABEL = {
  aperto: 'Aperto', in_corso: 'In corso', sospeso: 'Sospeso', chiuso: 'Chiuso', archiviato: 'Archiviato',
}

export default function GestioneProgetti({ clienteId }) {
  const navigate = useNavigate()
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [modalAperto, setModalAperto] = useState(false)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')

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

  const rows = useMemo(() => progetti.filter(p => {
    if (statoF && p.stato !== statoF) return false
    if (search) {
      const q = search.toLowerCase()
      return (p.nome ?? '').toLowerCase().includes(q) || (p.comune ?? '').toLowerCase().includes(q)
    }
    return true
  }), [progetti, statoF, search])

  const hasFilters = search || statoF

  return (
    <div className="space-y-4">
      {/* Intestazione + azione */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-body text-sm text-nebbia/40">
          {progetti.length} {progetti.length === 1 ? 'progetto' : 'progetti'}
          {progetti.length > 0 && <span className="ml-2 text-nebbia/25">· {nAttivi} attivi</span>}
        </p>
        <button onClick={() => setModalAperto(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={14} /> Nuovo progetto
        </button>
      </div>

      {errore && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      {/* Filtri (solo se c'è più di un progetto) */}
      {progetti.length > 1 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
            <input placeholder="Cerca per nome o comune…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>
          <select value={statoF} onChange={e => setStatoF(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
            <option value="">Tutti gli stati</option>
            {Object.keys(STATI_LABEL).map(k => <option key={k} value={k}>{STATI_LABEL[k]}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setStatoF('') }}
              className="font-body text-xs text-nebbia/30 hover:text-red-400 px-3 py-2.5 border border-white/5 hover:border-red-500/30 transition-colors">
              Azzera
            </button>
          )}
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
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Progetto', 'Luogo', 'Destinazione', 'Stato', 'Creato il'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-body text-sm text-nebbia/30">
                    Nessun progetto corrisponde ai filtri.
                  </td>
                </tr>
              ) : rows.map(p => {
                const luogo = [p.comune, p.cantone].filter(Boolean).join(', ')
                return (
                  <tr key={p.id} onClick={() => navigate(`/progetti/${p.id}`)}
                    className="border-b border-white/5 last:border-0 hover:bg-petrolio/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{p.nome}</td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50">{luogo || '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/40 capitalize">{p.destinazione ?? '—'}</td>
                    <td className="px-4 py-3"><Badge label={STATI_LABEL[p.stato] ?? STATI_LABEL.aperto} variant={STATI_VARIANT[p.stato] ?? 'salvia'} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('it-CH')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
