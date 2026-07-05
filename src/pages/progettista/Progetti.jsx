import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Plus, FileText, ChevronRight, X } from 'lucide-react'

const CANTONI = ['TI', 'ZH', 'GE', 'VD', 'BE', 'BS', 'BL', 'LU', 'ZG', 'FR', 'SO', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'VS', 'NE', 'JU', 'OW', 'NW', 'UR', 'SZ', 'GL']
const DESTINAZIONI = ['residenziale', 'commerciale', 'industriale', 'misto', 'pubblico']

const STATI = {
  aperto: { label: 'Aperto', cls: 'text-salvia bg-salvia/10 border-salvia/30' },
  in_corso: { label: 'In corso', cls: 'text-oro bg-oro/10 border-oro/30' },
  sospeso: { label: 'Sospeso', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  chiuso: { label: 'Chiuso', cls: 'text-nebbia/50 bg-white/5 border-white/10' },
  archiviato: { label: 'Archiviato', cls: 'text-nebbia/40 bg-white/5 border-white/10' },
}

const inputCls = 'w-full bg-petrolio border border-white/10 px-3 py-2 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none'

export default function Progetti() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const nuovo = searchParams.get('nuovo') === '1'
  const [form, setForm] = useState({ nome: '', committente: '', indirizzo: '', comune: '', cantone: '', destinazione: '' })
  const [errore, setErrore] = useState(null)

  const { data: progetti = [], isLoading } = useQuery({
    queryKey: ['progetti', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('id, nome, committente, comune, cantone, destinazione, stato, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const crea = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .insert({
          progettista_id: profile.id,
          studio_id: profile.studio_id ?? null,
          nome: form.nome.trim(),
          committente: form.committente.trim() || null,
          indirizzo: form.indirizzo.trim() || null,
          comune: form.comune.trim() || null,
          cantone: form.cantone || null,
          destinazione: form.destinazione || null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['progetti'] })
      navigate(`/progetti/${data.id}`)
    },
    onError: (e) => setErrore(e.message),
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-nebbia">Progetti</h1>
        <button onClick={() => setSearchParams(nuovo ? {} : { nuovo: '1' })}
          className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
          {nuovo ? <><X size={15} /> Annulla</> : <><Plus size={15} /> Nuovo progetto</>}
        </button>
      </div>

      {nuovo && (
        <form
          onSubmit={(e) => { e.preventDefault(); setErrore(null); crea.mutate() }}
          className="bg-slate border border-white/5 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="font-body text-xs text-nebbia/50 block mb-1">Nome progetto *</label>
              <input required value={form.nome} className={inputCls}
                placeholder="es. Gewerbezentrum Waldweg"
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="font-body text-xs text-nebbia/50 block mb-1">Committente</label>
              <input value={form.committente} className={inputCls}
                onChange={e => setForm(f => ({ ...f, committente: e.target.value }))} />
            </div>
            <div>
              <label className="font-body text-xs text-nebbia/50 block mb-1">Indirizzo</label>
              <input value={form.indirizzo} className={inputCls}
                onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))} />
            </div>
            <div>
              <label className="font-body text-xs text-nebbia/50 block mb-1">Comune</label>
              <input value={form.comune} className={inputCls}
                onChange={e => setForm(f => ({ ...f, comune: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-xs text-nebbia/50 block mb-1">Cantone</label>
                <select value={form.cantone} className={inputCls}
                  onChange={e => setForm(f => ({ ...f, cantone: e.target.value }))}>
                  <option value="">—</option>
                  {CANTONI.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-body text-xs text-nebbia/50 block mb-1">Destinazione</label>
                <select value={form.destinazione} className={inputCls}
                  onChange={e => setForm(f => ({ ...f, destinazione: e.target.value }))}>
                  <option value="">—</option>
                  {DESTINAZIONI.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
          {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
          <button type="submit" disabled={crea.isPending}
            className="px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 disabled:opacity-50 transition-colors">
            {crea.isPending ? 'Creazione…' : 'Crea progetto'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : progetti.length === 0 && !nuovo ? (
        <div className="border border-white/5 bg-slate p-10 text-center">
          <p className="font-body text-sm text-nebbia/50">
            Nessun progetto. Creane uno e carica i disegni PDF: Lexum verifica quote e conformità normativa.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {progetti.map(p => {
            const stato = STATI[p.stato] ?? STATI.aperto
            return (
              <Link key={p.id} to={`/progetti/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 bg-slate border border-white/5 hover:border-oro/30 transition-colors group">
                <FileText size={16} className="text-nebbia/30" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
                  <p className="font-body text-xs text-nebbia/40 truncate">
                    {[p.committente, p.comune, p.cantone, p.destinazione].filter(Boolean).join(' · ')}
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
    </div>
  )
}
