// src/pages/progettista/Dashboard.jsx
//
// Dashboard del progettista: quadro generale dello STUDIO (non di un cliente).
// Centro = lo studio e ciò che il progettista deve tenere d'occhio:
//   - portfolio: committenti, progetti attivi/totali, disegni in analisi
//   - lavorazioni: disegni in analisi / in errore (alert), ultime analisi completate
//   - ultimi progetti (con committente, comune, cantone) come scorciatoia
//   - snapshot PER COMMITTENTE (n. progetti attivi/totali per cliente), mai sommato
//
// VINCOLO: solo tabelle/colonne reali (progetti, progetto_disegni, profiles).
// Niente fatturato / scadenze / appuntamenti: non esistono per il progettista.
// RLS: progetti e progetto_disegni filtrano già per progettista_id = auth.uid()
// (+ studio_id), quindi una SELECT semplice torna solo le proprie righe.

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Users, DraftingCompass, FolderOpen, FileStack, ChevronRight,
  CheckCircle2, Loader2, AlertTriangle, ScrollText,
} from 'lucide-react'

const STATO_CONFIG = {
  aperto: { label: 'Aperto', cls: 'text-salvia bg-salvia/10 border-salvia/30' },
  in_corso: { label: 'In corso', cls: 'text-oro bg-oro/10 border-oro/30' },
  sospeso: { label: 'Sospeso', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  chiuso: { label: 'Chiuso', cls: 'text-nebbia/50 bg-white/5 border-white/10' },
  archiviato: { label: 'Archiviato', cls: 'text-nebbia/40 bg-white/5 border-white/10' },
}

const ESITO_CONFIG = {
  conforme: { label: 'Conforme', cls: 'text-salvia' },
  non_conforme: { label: 'Non conforme', cls: 'text-red-400' },
  da_verificare: { label: 'Da verificare', cls: 'text-amber-400' },
  non_verificabile: { label: 'Non verificabile', cls: 'text-nebbia/40' },
}

const ATTIVI = ['aperto', 'in_corso']

function nomeCliente(c) {
  if (!c) return null
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? null
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
}

// Nome committente del progetto: prima il cliente collegato (profiles),
// poi il campo libero committente, altrimenti niente.
function committenteProgetto(p) {
  return nomeCliente(p.cliente) ?? (p.committente?.trim() || null)
}

// esiti_normativa è un ARRAY di verifiche (una per articolo). Ne ricavo l'esito
// complessivo del disegno con priorità: non conforme > da verificare > conforme.
function esitoDisegno(d) {
  const esiti = Array.isArray(d?.esiti_normativa) ? d.esiti_normativa : []
  if (!esiti.length) return null
  if (esiti.some(e => e?.esito === 'non_conforme')) return 'non_conforme'
  if (esiti.some(e => e?.esito === 'da_verificare')) return 'da_verificare'
  if (esiti.some(e => e?.esito === 'conforme')) return 'conforme'
  return 'non_verificabile'
}

export default function ProgettistaDashboard() {
  const { profile } = useAuth()

  // ── Progetti (RLS-safe: torna solo i progetti del progettista/studio) ──
  const { data: progetti = [], isLoading: loadingProg } = useQuery({
    queryKey: ['progetti_dashboard', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('id, nome, comune, cantone, destinazione, committente, stato, created_at, cliente_id, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // ── Disegni (RLS-safe): stato analisi + esito normativa + progetto collegato ──
  const { data: disegni = [], isLoading: loadingDis } = useQuery({
    queryKey: ['disegni_dashboard', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_disegni')
        .select('id, nome_file, stato_analisi, esiti_normativa, errore, updated_at, created_at, progetto_id, progetto:progetto_id(id, nome)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    // finché un'analisi è in corso, aggiorna ogni 4 secondi
    refetchInterval: (query) =>
      (query.state.data ?? []).some(d => d.stato_analisi === 'in_analisi') ? 4000 : false,
  })

  const loading = loadingProg || loadingDis

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
    </div>
  )

  // ── Derivati portfolio ──
  const attivi = progetti.filter(p => ATTIVI.includes(p.stato))
  const committentiCount = new Set(
    progetti.map(p => committenteProgetto(p)).filter(Boolean)
  ).size

  // ── Derivati disegni ──
  const inLavorazione = disegni.filter(d => d.stato_analisi === 'in_analisi')
  const inErrore = disegni.filter(d => d.stato_analisi === 'errore')
  const daMonitorare = [...inErrore, ...inLavorazione].slice(0, 6)
  const completati = disegni.filter(d => d.stato_analisi === 'completata')
  const ultimeAnalisi = completati.slice(0, 6)
  const nonConformi = completati.filter(d => esitoDisegno(d) === 'non_conforme').length

  const ultimiProgetti = progetti.slice(0, 6)

  // ── Snapshot PER COMMITTENTE (per-cliente, mai sommato) ──
  // n. progetti totali/attivi + n. disegni per ogni committente distinto.
  const disegniPerProgetto = disegni.reduce((acc, d) => {
    if (d.progetto_id) acc[d.progetto_id] = (acc[d.progetto_id] || 0) + 1
    return acc
  }, {})
  const perCommittente = Object.values(
    progetti.reduce((acc, p) => {
      const nome = committenteProgetto(p) || '—'
      const key = p.cliente_id || `libero:${nome}`
      if (!acc[key]) acc[key] = { key, clienteId: p.cliente_id, nome, totali: 0, attivi: 0, disegni: 0 }
      acc[key].totali += 1
      if (ATTIVI.includes(p.stato)) acc[key].attivi += 1
      acc[key].disegni += disegniPerProgetto[p.id] || 0
      return acc
    }, {})
  ).sort((a, b) => b.attivi - a.attivi || b.totali - a.totali).slice(0, 15)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Hero */}
      <div>
        <p className="section-label"><DraftingCompass size={11} className="inline" /> Studio di progettazione</p>
        <h1 className="font-display text-3xl text-nebbia leading-tight mt-1">
          {profile?.nome ? `Benvenuto, ${profile.nome}` : 'Benvenuto'}
        </h1>
        <p className="font-body text-sm text-nebbia/40 mt-1">
          Quadro generale dello studio · {committentiCount} {committentiCount === 1 ? 'committente' : 'committenti'}
        </p>
      </div>

      {/* KPI: portfolio + lavorazioni */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Committenti" value={committentiCount} to="/clienti" />
        <Kpi icon={DraftingCompass} label="Progetti attivi" value={attivi.length} to="/progetti" />
        <Kpi icon={FolderOpen} label="Progetti totali" value={progetti.length} to="/progetti" />
        <Kpi icon={FileStack} label="Disegni analizzati" value={completati.length} accent={nonConformi > 0 ? 'oro' : 'nebbia'} />
      </div>

      {/* Alert: disegni in errore / in analisi */}
      {daMonitorare.length > 0 && (
        <div className={`border p-4 ${inErrore.length > 0 ? 'bg-red-900/10 border-red-500/25' : 'bg-slate border-oro/25'}`}>
          <div className="flex items-center gap-2 mb-2">
            {inErrore.length > 0
              ? <AlertTriangle size={15} className="text-red-400" />
              : <Loader2 size={15} className="text-oro animate-spin" />}
            <p className={`font-body text-sm font-medium ${inErrore.length > 0 ? 'text-red-400' : 'text-oro'}`}>
              {inErrore.length > 0
                ? `${inErrore.length} analisi in errore`
                : `${inLavorazione.length} analisi in corso`}
              {inErrore.length > 0 && inLavorazione.length > 0 && ` · ${inLavorazione.length} in corso`}
            </p>
          </div>
          <div className="space-y-1.5">
            {daMonitorare.map(d => {
              const isErr = d.stato_analisi === 'errore'
              return (
                <Link
                  key={d.id}
                  to={d.progetto_id ? `/progetti/${d.progetto_id}` : '/progetti'}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-body text-xs text-nebbia/70 truncate">
                    {d.nome_file}
                    {d.progetto?.nome && <span className="text-nebbia/40"> · {d.progetto.nome}</span>}
                  </span>
                  <span className={`font-body text-xs shrink-0 ${isErr ? 'text-red-400/80' : 'text-oro/80'}`}>
                    {isErr ? 'errore' : 'in corso'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Lavorazioni: ultimi progetti + ultime analisi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Ultimi progetti */}
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DraftingCompass size={15} className="text-oro/60" />
              <p className="section-label !m-0">Ultimi progetti</p>
            </div>
            {progetti.length > 0 && (
              <Link to="/progetti" className="font-body text-[11px] text-oro/70 hover:text-oro flex items-center gap-1">
                Tutti <ChevronRight size={12} />
              </Link>
            )}
          </div>
          {ultimiProgetti.length === 0 ? (
            <div className="text-center py-6">
              <DraftingCompass size={26} className="mx-auto text-nebbia/20 mb-3" />
              <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                Nessun progetto ancora. Apri un{' '}
                <Link to="/clienti" className="text-oro/80 hover:text-oro">committente</Link>{' '}
                e crea il primo progetto dalla sua scheda.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimiProgetti.map(p => {
                const stato = STATO_CONFIG[p.stato] ?? STATO_CONFIG.aperto
                const cliente = committenteProgetto(p)
                const luogo = [p.comune, p.cantone].filter(Boolean).join(', ')
                return (
                  <Link
                    key={p.id}
                    to={`/progetti/${p.id}`}
                    className="flex items-center gap-3 p-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
                      <p className="font-body text-[11px] text-nebbia/35 truncate">
                        {[cliente, luogo, p.destinazione].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 border font-body text-[10px] shrink-0 ${stato.cls}`}>
                      {stato.label}
                    </span>
                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Ultime analisi completate */}
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ScrollText size={15} className="text-oro/60" />
            <p className="section-label !m-0">Ultime analisi</p>
          </div>
          {ultimeAnalisi.length === 0 ? (
            <div className="text-center py-6">
              <ScrollText size={26} className="mx-auto text-nebbia/20 mb-3" />
              <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                Nessuna analisi completata. Carica i disegni PDF di un progetto per avviare
                la verifica di quote e conformità normativa.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimeAnalisi.map(d => {
                const esito = esitoDisegno(d)
                const cfg = esito ? ESITO_CONFIG[esito] : null
                return (
                  <Link
                    key={d.id}
                    to={d.progetto_id ? `/progetti/${d.progetto_id}` : '/progetti'}
                    className="flex items-center gap-3 p-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors group"
                  >
                    <CheckCircle2 size={15} className="text-salvia shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-nebbia truncate">{d.nome_file}</p>
                      <p className="font-body text-[11px] text-nebbia/35 truncate">
                        {d.progetto?.nome ?? '—'}
                      </p>
                    </div>
                    {cfg && (
                      <span className={`font-body text-[10px] shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                    )}
                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot PER COMMITTENTE (ogni committente a sé) */}
      {perCommittente.length > 0 && (
        <div className="bg-slate border border-white/5">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <Users size={14} className="text-oro/60" />
            <p className="section-label !m-0">Progetti per committente</p>
            <span className="font-body text-[10px] text-nebbia/30 ml-1">ogni committente è a sé</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Committente', 'Attivi', 'Totali', 'Disegni', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-2.5 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : i === 4 ? '' : 'text-right'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perCommittente.map(r => (
                  <tr key={r.key} className="border-b border-white/5 last:border-0 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-2.5">
                      {r.clienteId ? (
                        <Link to={`/clienti/${r.clienteId}`} className="font-body text-sm text-nebbia hover:text-oro transition-colors">
                          {r.nome}
                        </Link>
                      ) : (
                        <span className="font-body text-sm text-nebbia/70">{r.nome}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-display text-sm text-salvia">{r.attivi || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-body text-xs text-nebbia/60">{r.totali}</td>
                    <td className="px-4 py-2.5 text-right font-body text-xs text-oro/70">{r.disegni || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.clienteId && (
                        <Link to={`/clienti/${r.clienteId}`} className="text-nebbia/20 hover:text-oro transition-colors inline-flex">
                          <ChevronRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, to, accent = 'nebbia' }) {
  const col = accent === 'salvia' ? 'text-salvia' : accent === 'oro' ? 'text-oro' : accent === 'red' ? 'text-red-400' : 'text-nebbia'
  const inner = (
    <>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className="text-oro/60" />
        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className={`font-display text-2xl ${col}`}>{value}</p>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="bg-slate border border-white/5 hover:border-oro/30 p-4 transition-colors block">
        {inner}
      </Link>
    )
  }
  return <div className="bg-slate border border-white/5 p-4">{inner}</div>
}
