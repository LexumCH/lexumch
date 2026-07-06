// src/pages/progettista/Progetti.jsx
//
// Tabella globale di TUTTI i progetti dello studio, trasversale ai committenti.
// Stessa struttura della tabella Pratiche (avvocato): PageHeader + barra filtri
// (ricerca, stato, cantone, intervallo date su created_at, reset) + tabella con
// colonne e data di creazione. Creazione dalla lista (selettore committente) o
// dalla scheda del cliente (tab Progetti).

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, Badge } from '@/components/shared'
import { Plus, Search, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NuovoProgetto from '@/components/progettista/NuovoProgetto'

const STATI_VARIANT = {
  aperto: 'salvia',
  in_corso: 'oro',
  sospeso: 'warning',
  chiuso: 'gray',
  archiviato: 'gray',
}
const STATI_LABEL = {
  aperto: 'Aperto',
  in_corso: 'In corso',
  sospeso: 'Sospeso',
  chiuso: 'Chiuso',
  archiviato: 'Archiviato',
}
function nomeCliente(c) {
  if (!c) return null
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? null
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
}
function committenteProgetto(p) {
  return nomeCliente(p.cliente) ?? (p.committente?.trim() || null)
}

export function Progetti() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [cantoneF, setCantoneF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [modalAperto, setModalAperto] = useState(false)

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const { data, error } = await supabase
      .from('progetti')
      .select('id, nome, comune, cantone, destinazione, committente, stato, created_at, cliente_id, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto)')
      .order('created_at', { ascending: false })
    if (error) setErrore('Impossibile caricare i progetti.')
    else setProgetti(data ?? [])
    setLoading(false)
  }

  const rows = progetti.filter(p => {
    if (statoF && p.stato !== statoF) return false
    if (cantoneF && p.cantone !== cantoneF) return false
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(p.created_at) > new Date(dateTo + 'T23:59:59')) return false
    if (search) {
      const q = search.toLowerCase()
      return (p.nome ?? '').toLowerCase().includes(q) ||
        (committenteProgetto(p) ?? '').toLowerCase().includes(q) ||
        (p.comune ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const hasFilters = search || statoF || cantoneF || dateFrom || dateTo
  const cantoniPresenti = [...new Set(progetti.map(p => p.cantone).filter(Boolean))].sort()

  const intestazioni = ['Progetto', 'Committente', 'Luogo', 'Destinazione', 'Stato', 'Creato il', '']

  return (
    <div className="space-y-5">
      <PageHeader label="Studio di progettazione" title="Progetti"
        action={
          <button onClick={() => setModalAperto(true)} className="btn-primary text-sm">
            <Plus size={15} /> Nuovo progetto
          </button>
        } />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca per nome, committente o comune…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={statoF} onChange={e => setStatoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti gli stati</option>
          {Object.keys(STATI_LABEL).map(k => <option key={k} value={k}>{STATI_LABEL[k]}</option>)}
        </select>
        {cantoniPresenti.length > 1 && (
          <select value={cantoneF} onChange={e => setCantoneF(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
            <option value="">Tutti i cantoni</option>
            {cantoniPresenti.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30">Dal</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30">Al</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatoF(''); setCantoneF(''); setDateFrom(''); setDateTo('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 px-3 py-2.5 border border-white/5 hover:border-red-500/30 transition-colors">
            Azzera
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : errore ? (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {intestazioni.map((h, idx) => (
                  <th key={h || `col-${idx}`} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    {progetti.length === 0
                      ? 'Nessun progetto. Crea il primo con «Nuovo progetto» o dalla scheda di un committente.'
                      : 'Nessun progetto corrisponde ai filtri.'}
                  </td>
                </tr>
              ) : rows.map(p => {
                const variant = STATI_VARIANT[p.stato] ?? 'salvia'
                const statoLabel = STATI_LABEL[p.stato] ?? STATI_LABEL.aperto
                const committente = committenteProgetto(p)
                const luogo = [p.comune, p.cantone].filter(Boolean).join(', ')
                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{p.nome}</td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {committente
                        ? (p.cliente_id
                          ? <Link to={`/clienti/${p.cliente_id}`} className="hover:text-oro transition-colors">{committente}</Link>
                          : committente)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50">{luogo || '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/40 capitalize">{p.destinazione ?? '—'}</td>
                    <td className="px-4 py-3"><Badge label={statoLabel} variant={variant} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('it-CH')}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/progetti/${p.id}`} className="font-body text-xs text-oro hover:text-oro/70">Dettaglio</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAperto && (
        <NuovoProgetto
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

export default Progetti
