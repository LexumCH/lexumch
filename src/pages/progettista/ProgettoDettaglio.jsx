// src/pages/progettista/ProgettoDettaglio.jsx
//
// Guscio a tab del workspace di progetto (stile scheda cliente):
//   Panoramica · Fasi (SIA) · Disegni · Normativa · Documenti · Note
// Ogni tab è un componente autonomo in @/components/progettista.

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/shared'
import {
  ArrowLeft, LayoutDashboard, ListChecks, DraftingCompass,
  ScrollText, FileText, StickyNote,
} from 'lucide-react'
import ProgettoPanoramica from '@/components/progettista/ProgettoPanoramica'
import ProgettoFasi from '@/components/progettista/ProgettoFasi'
import ProgettoDisegni from '@/components/progettista/ProgettoDisegni'
import ProgettoNormativa from '@/components/progettista/ProgettoNormativa'
import ProgettoDocumenti from '@/components/progettista/ProgettoDocumenti'
import ProgettoNote from '@/components/progettista/ProgettoNote'

const STATI_VARIANT = {
  aperto: 'salvia', in_corso: 'oro', sospeso: 'warning', chiuso: 'gray', archiviato: 'gray',
}
const STATI_LABEL = {
  aperto: 'Aperto', in_corso: 'In corso', sospeso: 'Sospeso', chiuso: 'Chiuso', archiviato: 'Archiviato',
}

const TABS = [
  { id: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'fasi', label: 'Fasi', icon: ListChecks },
  { id: 'disegni', label: 'Disegni', icon: DraftingCompass },
  { id: 'normativa', label: 'Normativa', icon: ScrollText },
  { id: 'documenti', label: 'Documenti', icon: FileText },
  { id: 'note', label: 'Note', icon: StickyNote },
]

function nomeCliente(c) {
  if (!c) return null
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

export default function ProgettoDettaglio() {
  const { id } = useParams()
  const [tab, setTab] = useState('panoramica')

  const { data: progetto, refetch } = useQuery({
    queryKey: ['progetto', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti')
        .select('*, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto)')
        .eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  if (!progetto) {
    return (
      <div className="py-16 flex justify-center">
        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
      </div>
    )
  }

  const cliente = progetto.cliente
  const nomeC = nomeCliente(cliente)
  const statoVariant = STATI_VARIANT[progetto.stato] ?? 'salvia'
  const statoLabel = STATI_LABEL[progetto.stato] ?? STATI_LABEL.aperto
  const meta = [progetto.numero_commessa, progetto.indirizzo, progetto.comune, progetto.cantone, progetto.destinazione]
    .filter(Boolean).join(' · ')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        {cliente
          ? <Link to={`/clienti/${cliente.id}`} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-nebbia mb-3 transition-colors">
              <ArrowLeft size={13} /> {nomeC}
            </Link>
          : <Link to="/progetti" className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-nebbia mb-3 transition-colors">
              <ArrowLeft size={13} /> Tutti i progetti
            </Link>}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl text-nebbia">{progetto.nome}</h1>
          <Badge label={statoLabel} variant={statoVariant} />
        </div>
        {meta && <p className="font-body text-sm text-nebbia/50 mt-1">{meta}</p>}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid
              ? 'border-oro text-oro'
              : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'panoramica' && <ProgettoPanoramica progetto={progetto} onSaved={refetch} />}
      {tab === 'fasi' && <ProgettoFasi progetto={progetto} onSaved={refetch} />}
      {tab === 'disegni' && <ProgettoDisegni progettoId={id} />}
      {tab === 'normativa' && <ProgettoNormativa progetto={progetto} />}
      {tab === 'documenti' && <ProgettoDocumenti progettoId={id} />}
      {tab === 'note' && <ProgettoNote progettoId={id} />}
    </div>
  )
}
