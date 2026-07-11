// src/components/progettista/GeneraDocumentoProgetto.jsx
//
// Redazione documenti tecnici dal progetto analizzato (5 tipi):
// scelta tipo+lingua → lex-genera-documento-progettista (1 credito, guard
// numerico server-side) → anteprima/modifica markdown → salvataggio PDF via
// salva-documento-pdf-progettista (bucket progetto-documenti + tabella
// progetto_documenti, categoria 'rapporto').
//
// I numeri del documento vengono SOLO dai dati dell'analisi; ciò che manca
// resta un campo [DA COMPLETARE: …] che lo studio riempie prima di firmare.
//
// Props: progettoId (string)

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { invocaLex } from '@/lib/supabase'
import {
  FileText, Loader2, X, ScrollText, ClipboardCheck, Building2,
  Table2, LayoutList, Pencil, Eye, Save, Sparkles,
} from 'lucide-react'

const TIPI_DOC = [
  {
    id: 'relazione_conformita', icon: ScrollText,
    nome: 'Relazione di conformità normativa',
    desc: 'Le verifiche federali e cantonali, articolo per articolo, con i testi di legge citati dalla banca dati.',
  },
  {
    id: 'verbale_analisi', icon: ClipboardCheck,
    nome: "Verbale d'analisi del disegno",
    desc: 'La prova di diligenza per il fascicolo: cosa è stato controllato, quando e con quale versione del motore.',
  },
  {
    id: 'relazione_tecnica', icon: Building2,
    nome: 'Relazione tecnica (Baubeschrieb)',
    desc: "Bozza precompilata con dati catastali, locali e superfici; materiali e impianti da completare.",
  },
  {
    id: 'superfici_sia416', icon: Table2,
    nome: 'Calcolo delle superfici (SIA 416)',
    desc: 'Tabelle delle superfici BF per tavola, con proposta di categoria SIA 416 da confermare.',
  },
  {
    id: 'programma_locali', icon: LayoutList,
    nome: 'Programma dei locali',
    desc: 'Tabella locali, superfici e finiture per ogni tavola analizzata.',
  },
]

const LINGUE_DOC = [
  { id: 'it', label: 'Italiano' },
  { id: 'de', label: 'Deutsch' },
  { id: 'fr', label: 'Français' },
]

const ERRORI = {
  crediti_esauriti: 'Crediti AI esauriti: ricaricali dal tuo piano.',
  nessuna_tavola_analizzata: 'Nessuna tavola analizzata in questo progetto: analizza almeno un disegno prima di generare i documenti.',
  guard_non_superato: 'La bozza non ha superato il controllo anti-invenzione sui numeri. Riprova.',
}

export default function GeneraDocumentoProgetto({ progettoId }) {
  const queryClient = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState(null)
  const [lingua, setLingua] = useState('it')
  const [md, setMd] = useState('')
  const [tipoNome, setTipoNome] = useState('')
  const [modifica, setModifica] = useState(false)
  const [errore, setErrore] = useState(null)

  const chiudi = () => {
    setAperto(false); setTipo(null); setMd(''); setModifica(false); setErrore(null)
  }

  const genera = useMutation({
    mutationFn: async (tipoId) => {
      const out = await invocaLex('lex-genera-documento-progettista', {
        progetto_id: progettoId, tipo: tipoId, lingua,
      })
      if (!out.json?.ok) throw new Error(out.json?.error ?? 'errore')
      return out.json
    },
    onMutate: (tipoId) => { setErrore(null); setTipo(tipoId); setMd('') },
    onSuccess: (data) => { setMd(data.documento_markdown); setTipoNome(data.tipo_nome) },
    onError: (e) => setErrore(ERRORI[e.message] ?? 'Generazione non riuscita. Riprova.'),
  })

  const salva = useMutation({
    mutationFn: async () => {
      const out = await invocaLex('salva-documento-pdf-progettista', {
        progetto_id: progettoId,
        tipo_codice: tipo,
        tipo_nome: tipoNome,
        markdown_finale: md,
        categoria: 'rapporto',
      })
      if (!out.json?.ok) throw new Error(out.json?.error ?? 'errore')
      return out.json
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['progetto_documenti', progettoId] })
      // Deposita il PDF anche nell'archivio privato (cercabile + classificato
      // Haiku), senza bloccare la UI: fire-and-forget, idempotente lato server.
      if (data.documento_id) {
        invocaLex('lex-archivia-documento-progetto', { documento_id: data.documento_id }).catch(() => {})
      }
      chiudi()
      if (data.url) window.open(data.url, '_blank', 'noreferrer')
    },
    onError: () => setErrore('Salvataggio PDF non riuscito. Il testo resta qui: riprova.'),
  })

  return (
    <>
      <button onClick={() => setAperto(true)}
        className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors shrink-0">
        <Sparkles size={15} /> Genera documento
      </button>

      {aperto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !genera.isPending && !salva.isPending) chiudi() }}>
          <div className="bg-slate border border-white/10 w-full max-w-3xl max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
              <FileText size={16} className="text-oro" />
              <h2 className="font-display text-sm text-nebbia flex-1">
                {md ? tipoNome : 'Genera documento dal progetto'}
              </h2>
              {!md && (
                <div className="flex items-center gap-1">
                  {LINGUE_DOC.map(l => (
                    <button key={l.id} onClick={() => setLingua(l.id)}
                      className={`font-body text-[11px] px-2 py-1 border transition-colors ${lingua === l.id
                        ? 'bg-oro/10 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:text-nebbia/70'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={chiudi} disabled={genera.isPending || salva.isPending}
                className="p-1.5 text-nebbia/40 hover:text-nebbia transition-colors disabled:opacity-40">
                <X size={16} />
              </button>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto p-5">
              {!md && !genera.isPending && (
                <div className="space-y-2">
                  <p className="font-body text-xs text-nebbia/40 mb-3">
                    Il documento viene redatto dai dati delle tavole analizzate: ogni numero viene
                    dal disegno o dalla banca dati, ciò che manca resta un campo da completare.
                    Un documento = 1 credito AI.
                  </p>
                  {TIPI_DOC.map(td => {
                    const Icon = td.icon
                    return (
                      <button key={td.id} onClick={() => genera.mutate(td.id)}
                        className="w-full flex items-start gap-3 p-3.5 bg-petrolio border border-white/5 hover:border-oro/30 text-left transition-colors">
                        <Icon size={17} className="text-oro/70 mt-0.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-body text-sm text-nebbia">{td.nome}</span>
                          <span className="block font-body text-xs text-nebbia/40 mt-0.5">{td.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {genera.isPending && (
                <div className="py-16 text-center">
                  <Loader2 size={22} className="animate-spin text-oro mx-auto mb-3" />
                  <p className="font-body text-sm text-nebbia/60">
                    Redazione in corso dai dati dell'analisi…
                  </p>
                  <p className="font-body text-xs text-nebbia/30 mt-1">
                    Il controllo anti-invenzione verifica ogni numero della bozza.
                  </p>
                </div>
              )}

              {md && !genera.isPending && (
                modifica ? (
                  <textarea value={md} onChange={(e) => setMd(e.target.value)}
                    className="w-full h-[52vh] bg-petrolio border border-white/10 p-4 font-mono text-xs text-nebbia/85 leading-relaxed focus:border-oro/40 outline-none resize-none" />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none font-body
                    prose-headings:font-display prose-headings:font-light prose-headings:text-nebbia
                    prose-p:text-nebbia/75 prose-li:text-nebbia/75 prose-strong:text-nebbia
                    prose-blockquote:border-oro/40 prose-blockquote:text-nebbia/55
                    prose-table:text-xs prose-th:text-nebbia/60 prose-td:text-nebbia/75">
                    <ReactMarkdown>{md}</ReactMarkdown>
                  </div>
                )
              )}

              {errore && <p className="font-body text-xs text-red-400 mt-4">{errore}</p>}
            </div>

            {/* Footer azioni */}
            {md && !genera.isPending && (
              <div className="flex items-center gap-2 px-5 py-3 border-t border-white/5">
                <button onClick={() => setModifica(!modifica)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-nebbia transition-colors">
                  {modifica ? <Eye size={13} /> : <Pencil size={13} />}
                  {modifica ? 'Anteprima' : 'Modifica'}
                </button>
                <button onClick={() => { setMd(''); setErrore(null) }}
                  className="px-3 py-1.5 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia/80 transition-colors">
                  ← Altro documento
                </button>
                <div className="flex-1" />
                <button onClick={() => salva.mutate()} disabled={salva.isPending || !md.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-xs hover:bg-salvia/20 disabled:opacity-50 transition-colors">
                  {salva.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Salva PDF nei documenti
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
