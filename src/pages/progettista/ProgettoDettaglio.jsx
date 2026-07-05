import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase, supabaseUrl, supabaseKey, getAccessToken } from '@/lib/supabase'
import {
  ArrowLeft, Upload, FileText, Play, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, Trash2
} from 'lucide-react'

const STATO_ANALISI = {
  caricato: { label: 'Da analizzare', icon: FileText, cls: 'text-nebbia/50' },
  in_analisi: { label: 'Analisi in corso…', icon: Loader2, cls: 'text-oro' },
  completata: { label: 'Analisi completata', icon: CheckCircle2, cls: 'text-salvia' },
  errore: { label: 'Errore analisi', icon: XCircle, cls: 'text-red-400' },
}

const ESITO_NORMATIVA = {
  conforme: { icon: CheckCircle2, cls: 'text-salvia', label: 'Conforme' },
  non_conforme: { icon: XCircle, cls: 'text-red-400', label: 'Non conforme' },
  da_verificare: { icon: AlertTriangle, cls: 'text-amber-400', label: 'Da verificare' },
  non_verificabile: { icon: Info, cls: 'text-nebbia/50', label: 'Non verificabile dalla tavola' },
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export default function ProgettoDettaglio() {
  const { id } = useParams()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState(null)
  const [aperto, setAperto] = useState(null) // id disegno con risultati espansi

  const { data: progetto } = useQuery({
    queryKey: ['progetto', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  const { data: disegni = [] } = useQuery({
    queryKey: ['progetto_disegni', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_disegni')
        .select('*')
        .eq('progetto_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    // finché un'analisi è in corso, aggiorna ogni 3 secondi
    refetchInterval: (query) =>
      (query.state.data ?? []).some(d => d.stato_analisi === 'in_analisi') ? 3000 : false,
  })

  async function caricaFile(file) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setErrore('Sono accettati solo file PDF (export vettoriale da ArchiCAD).')
      return
    }
    setErrore(null)
    setUploading(true)
    try {
      const path = `${profile.id}/${id}/${Date.now()}_${sanitizeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from('disegni').upload(path, file)
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('progetto_disegni').insert({
        progetto_id: id,
        progettista_id: profile.id,
        nome_file: file.name,
        storage_path: path,
        dimensione: file.size,
      })
      if (insErr) throw insErr
      queryClient.invalidateQueries({ queryKey: ['progetto_disegni', id] })
    } catch (e) {
      setErrore(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const analizza = useMutation({
    mutationFn: async (disegnoId) => {
      const token = await getAccessToken()
      const res = await fetch('/api/analizza_disegno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          disegno_id: disegnoId,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseKey,
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.errore ?? `Errore ${res.status}`)
      return out
    },
    onMutate: () => setErrore(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_disegni', id] }),
    onError: (e) => setErrore(e.message),
  })

  const elimina = useMutation({
    mutationFn: async (disegno) => {
      await supabase.storage.from('disegni').remove([disegno.storage_path])
      const { error } = await supabase.from('progetto_disegni').delete().eq('id', disegno.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_disegni', id] }),
    onError: (e) => setErrore(e.message),
  })

  if (!progetto) {
    return (
      <div className="py-16 flex justify-center">
        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/progetti" className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-nebbia mb-3 transition-colors">
          <ArrowLeft size={13} /> Tutti i progetti
        </Link>
        <h1 className="font-display text-2xl text-nebbia">{progetto.nome}</h1>
        <p className="font-body text-sm text-nebbia/50 mt-1">
          {[progetto.committente, progetto.indirizzo, progetto.comune, progetto.cantone, progetto.destinazione]
            .filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Upload */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm text-nebbia">Disegni</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">
              Carica i PDF vettoriali esportati da ArchiCAD: Lexum verifica le quote
              contro la geometria e la conformità normativa (OLL, PBG).
            </p>
          </div>
          <button onClick={() => fileInput.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Carica PDF
          </button>
          <input ref={fileInput} type="file" accept="application/pdf" className="hidden"
            onChange={e => caricaFile(e.target.files?.[0])} />
        </div>
        {errore && <p className="font-body text-xs text-red-400 mt-3">{errore}</p>}
      </div>

      {/* Lista disegni */}
      <div className="space-y-2">
        {disegni.map(d => {
          const stato = STATO_ANALISI[d.stato_analisi] ?? STATO_ANALISI.caricato
          const StatoIcon = stato.icon
          const espanso = aperto === d.id
          const testi = d.gemello?.quote?.testi ?? []
          const quoteOk = testi.filter(t => ['ok', 'ok_dettaglio'].includes(t.stato)).length
          return (
            <div key={d.id} className="bg-slate border border-white/5">
              <div className="flex items-center gap-3 px-4 py-3">
                <StatoIcon size={16}
                  className={`${stato.cls} ${d.stato_analisi === 'in_analisi' ? 'animate-spin' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{d.nome_file}</p>
                  <p className={`font-body text-xs ${stato.cls}`}>
                    {stato.label}
                    {d.stato_analisi === 'completata' && d.gemello &&
                      ` — ${quoteOk}/${testi.length} quote verificate, ${(d.findings ?? []).length} segnalazioni, ${(d.gemello.locali ?? []).length} locali`}
                    {d.stato_analisi === 'errore' && d.errore && ` — ${d.errore}`}
                  </p>
                </div>
                {['caricato', 'errore'].includes(d.stato_analisi) && (
                  <button onClick={() => analizza.mutate(d.id)} disabled={analizza.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-xs hover:bg-salvia/20 disabled:opacity-50 transition-colors">
                    <Play size={12} /> Analizza
                  </button>
                )}
                {d.stato_analisi === 'completata' && (
                  <button onClick={() => setAperto(espanso ? null : d.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/70 font-body text-xs hover:border-oro/30 transition-colors">
                    Risultati {espanso ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <button onClick={() => { if (confirm(`Eliminare "${d.nome_file}"?`)) elimina.mutate(d) }}
                  className="p-1.5 text-nebbia/30 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {espanso && d.stato_analisi === 'completata' && (
                <div className="border-t border-white/5 px-4 py-4 space-y-5">

                  {/* Analisi del disegno */}
                  <section>
                    <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2">
                      Analisi del disegno
                    </h3>
                    {(d.findings ?? []).length === 0 ? (
                      <p className="font-body text-sm text-salvia flex items-center gap-2">
                        <CheckCircle2 size={14} /> Nessuna incoerenza: ogni quota corrisponde alla geometria disegnata.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(d.findings ?? []).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 font-body text-sm text-nebbia/80">
                            {f.severita === 'errore'
                              ? <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                              : <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />}
                            {f.messaggio}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Analisi normativa */}
                  <section>
                    <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2">
                      Analisi normativa
                    </h3>
                    <div className="space-y-2">
                      {(d.esiti_normativa ?? []).map((e, i) => {
                        const es = ESITO_NORMATIVA[e.esito] ?? ESITO_NORMATIVA.non_verificabile
                        const EsIcon = es.icon
                        return (
                          <div key={i} className="bg-petrolio border border-white/5 p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <EsIcon size={14} className={es.cls} />
                              <span className={`font-body text-xs font-medium ${es.cls}`}>{es.label}</span>
                              <span className="font-body text-xs text-nebbia/40">— {e.riferimento}</span>
                            </div>
                            <p className="font-body text-sm text-nebbia/80">{e.verifica}</p>
                            <p className="font-body text-xs text-nebbia/40 mt-1.5 border-l-2 border-white/10 pl-2">
                              {e.testo_norma}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  {/* Locali */}
                  {(d.gemello?.locali ?? []).length > 0 && (
                    <section>
                      <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2">
                        Locali riconosciuti ({d.gemello.locali.length} — {
                          d.gemello.locali.reduce((s, r) => s + (r.superficie_bf_m2 ?? 0), 0).toFixed(2)
                        } m² BF)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {[...d.gemello.locali]
                          .sort((a, b) => (b.superficie_bf_m2 ?? 0) - (a.superficie_bf_m2 ?? 0))
                          .map((r, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-petrolio border border-white/5">
                              <span className="font-body text-sm text-nebbia/80 truncate">{r.nome}</span>
                              <span className="font-body text-xs text-nebbia/50 shrink-0 ml-2">
                                {r.superficie_bf_m2 ? `${r.superficie_bf_m2.toFixed(2)} m²` : '—'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {disegni.length === 0 && (
          <div className="border border-white/5 bg-slate p-8 text-center">
            <p className="font-body text-sm text-nebbia/50">Nessun disegno caricato.</p>
          </div>
        )}
      </div>
    </div>
  )
}
