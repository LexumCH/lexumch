// src/components/progettista/ProgettoFasi.jsx
//
// Tab "Fasi" del dettaglio progetto: timeline delle fasi SIA 102.
// Elenco canonico fisso; lo stato per-fase vive in progetti.fasi (jsonb, forma
// { [key]: { stato, data } }). Modifica in stato locale + salvataggio unico.
//
// Props:
//   progetto (object) - riga progetti (usa id + fasi)
//   onSaved()         - callback dopo il salvataggio delle fasi

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  ListChecks, CheckCircle2, Circle, Loader2, MinusCircle,
  AlertCircle, Save,
} from 'lucide-react'

// Elenco canonico FISSO delle fasi SIA 102.
const FASI_SIA = [
  { key: 'obiettivi', label: 'Definizione degli obiettivi' },
  { key: 'preliminari', label: 'Studi preliminari' },
  { key: 'massima', label: 'Progetto di massima' },
  { key: 'definitivo', label: 'Progetto definitivo' },
  { key: 'domanda', label: 'Domanda di costruzione' },
  { key: 'appalto', label: 'Appalto' },
  { key: 'esecutivo', label: 'Progetto esecutivo' },
  { key: 'esecuzione', label: 'Esecuzione' },
  { key: 'conclusione', label: 'Messa in servizio / conclusione' },
]

// Stati fase: da_iniziare | in_corso | completata | non_prevista.
const STATI = [
  {
    id: 'da_iniziare',
    label: 'Da iniziare',
    icon: Circle,
    // nebbia/40 (secondario)
    dot: 'border-nebbia/40 text-nebbia/40',
    badge: 'border-nebbia/40 text-nebbia/40',
    btnActive: 'bg-nebbia/10 border-nebbia/40 text-nebbia/60',
  },
  {
    id: 'in_corso',
    label: 'In corso',
    icon: Loader2,
    // oro
    dot: 'border-oro/50 text-oro',
    badge: 'border-oro/40 text-oro',
    btnActive: 'bg-oro/10 border-oro/40 text-oro',
  },
  {
    id: 'completata',
    label: 'Completata',
    icon: CheckCircle2,
    // salvia
    dot: 'border-salvia/50 text-salvia',
    badge: 'border-salvia/40 text-salvia',
    btnActive: 'bg-salvia/10 border-salvia/40 text-salvia',
  },
  {
    id: 'non_prevista',
    label: 'Non prevista',
    icon: MinusCircle,
    // nebbia/25 barrato
    dot: 'border-nebbia/25 text-nebbia/25',
    badge: 'border-nebbia/25 text-nebbia/25 line-through',
    btnActive: 'bg-nebbia/5 border-nebbia/25 text-nebbia/40',
  },
]
const STATO_BY_ID = Object.fromEntries(STATI.map(s => [s.id, s]))

// Normalizza progetto.fasi (jsonb, può essere null) in una mappa completa e
// stabile: ogni fase canonica ha { stato, data } con default sensati.
function normalizzaFasi(fasi) {
  const src = fasi && typeof fasi === 'object' ? fasi : {}
  const out = {}
  for (const f of FASI_SIA) {
    const cur = src[f.key] && typeof src[f.key] === 'object' ? src[f.key] : {}
    const stato = STATO_BY_ID[cur.stato] ? cur.stato : 'da_iniziare'
    out[f.key] = { stato, data: typeof cur.data === 'string' ? cur.data : '' }
  }
  return out
}

export default function ProgettoFasi({ progetto, onSaved }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const iniziale = useMemo(() => normalizzaFasi(progetto?.fasi), [progetto?.fasi])
  const [mappa, setMappa] = useState(iniziale)
  const [errore, setErrore] = useState(null)

  // Avanzamento: completate su totale delle previste (esclude non_prevista).
  const previste = FASI_SIA.filter(f => mappa[f.key]?.stato !== 'non_prevista')
  const completate = previste.filter(f => mappa[f.key]?.stato === 'completata').length
  const totaliPreviste = previste.length
  const perc = totaliPreviste > 0 ? Math.round((completate / totaliPreviste) * 100) : 0

  // Dirty check: confronto con lo stato iniziale normalizzato.
  const sporco = useMemo(
    () => JSON.stringify(mappa) !== JSON.stringify(iniziale),
    [mappa, iniziale],
  )

  function setStato(key, stato) {
    setMappa(prev => ({ ...prev, [key]: { ...prev[key], stato } }))
  }
  function setData(key, data) {
    setMappa(prev => ({ ...prev, [key]: { ...prev[key], data } }))
  }

  const salva = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('progetti')
        .update({ fasi: mappa, updated_at: new Date().toISOString() })
        .eq('id', progetto.id)
      if (error) throw error
    },
    onMutate: () => setErrore(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progetto', progetto.id] })
      onSaved?.()
    },
    onError: (e) => setErrore(e.message),
  })

  return (
    <div className="space-y-4">
      {/* Intestazione + avanzamento */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm text-nebbia flex items-center gap-2">
              <ListChecks size={15} className="text-oro" />
              Fasi SIA 102
            </h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">
              Le nove fasi canoniche della prestazione. Aggiorna lo stato di
              ciascuna e la data prevista o di completamento.
            </p>
          </div>
          <button
            onClick={() => salva.mutate()}
            disabled={!sporco || salva.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0"
          >
            {salva.isPending
              ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
              : <Save size={15} />}
            Salva fasi
          </button>
        </div>

        {/* Barra di avanzamento */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs text-nebbia/50">Avanzamento</span>
            <span className="font-body text-xs text-nebbia/70">
              {completate}/{totaliPreviste} previste · {perc}%
            </span>
          </div>
          <div className="h-1.5 bg-petrolio border border-white/5 overflow-hidden">
            <div
              className="h-full bg-salvia transition-all duration-300"
              style={{ width: `${perc}%` }}
            />
          </div>
        </div>

        {errore && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mt-4">
            <AlertCircle size={14} /> {errore}
          </div>
        )}
      </div>

      {/* Timeline verticale */}
      <div className="relative">
        {/* Linea verticale di connessione */}
        <div className="absolute left-[1.375rem] top-4 bottom-4 w-px bg-white/5 pointer-events-none" />

        <div className="space-y-2">
          {FASI_SIA.map((f, i) => {
            const cur = mappa[f.key] ?? { stato: 'da_iniziare', data: '' }
            const st = STATO_BY_ID[cur.stato] ?? STATO_BY_ID.da_iniziare
            const DotIcon = st.icon
            const nonPrevista = cur.stato === 'non_prevista'
            const dataLabel =
              cur.stato === 'completata' ? 'Data completamento' : 'Data prevista'
            return (
              <div
                key={f.key}
                className="relative bg-slate border border-white/5 hover:border-oro/30 transition-colors p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Numero + pallino di stato */}
                  <div className="flex flex-col items-center shrink-0 relative z-10">
                    <div className={`w-9 h-9 flex items-center justify-center border bg-petrolio ${st.dot}`}>
                      <DotIcon
                        size={16}
                        className={cur.stato === 'in_corso' ? 'animate-spin' : ''}
                      />
                    </div>
                    <span className="font-body text-[10px] text-nebbia/30 mt-1 tracking-wider">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-body text-sm font-medium ${nonPrevista ? 'text-nebbia/40 line-through' : 'text-nebbia'}`}>
                        {f.label}
                      </span>
                      <span className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>

                    {/* Selettore stato + data */}
                    <div className="flex items-end gap-3 mt-3 flex-wrap">
                      <div>
                        <label className="font-body text-xs text-nebbia/50 block mb-1">Stato</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {STATI.map(s => {
                            const active = cur.stato === s.id
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setStato(f.key, s.id)}
                                className={`font-body text-xs px-2.5 py-1 border transition-colors ${active
                                  ? s.btnActive
                                  : 'bg-petrolio border-white/10 text-nebbia/50 hover:border-oro/20 hover:text-nebbia/80'}`}
                              >
                                {s.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto">
                        <label className="font-body text-xs text-nebbia/50 block mb-1">
                          {dataLabel} <span className="text-nebbia/25">opz.</span>
                        </label>
                        <input
                          type="date"
                          value={cur.data ?? ''}
                          onChange={e => setData(f.key, e.target.value)}
                          disabled={nonPrevista}
                          className="w-full bg-petrolio border border-white/10 px-3 py-2 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Salva in coda (comodo dopo scroll) */}
      <div className="flex items-center justify-end gap-3">
        {sporco && (
          <span className="font-body text-xs text-amber-400">Modifiche non salvate</span>
        )}
        <button
          onClick={() => salva.mutate()}
          disabled={!sporco || salva.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors"
        >
          {salva.isPending
            ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
            : <Save size={15} />}
          Salva fasi
        </button>
      </div>
    </div>
  )
}
