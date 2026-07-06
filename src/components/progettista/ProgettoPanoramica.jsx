// src/components/progettista/ProgettoPanoramica.jsx
//
// Tab "Panoramica" del workspace di progetto: striscia KPI in alto (disegni
// totali, analizzati, semaforo conformità) + form editabile dei campi del
// progetto. Salva su progetti e richiama onSaved().
//
// Props:
//   progetto  (object)  - la riga progetti da editare
//   onSaved() - callback dopo il salvataggio (per invalidare/rinfrescare)

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  FileText, CheckCircle2, AlertTriangle, XCircle, Circle, Save,
} from 'lucide-react'

const CANTONI = ['TI', 'ZH', 'GE', 'VD', 'BE', 'BS', 'BL', 'LU', 'ZG', 'FR', 'SO', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'VS', 'NE', 'JU', 'OW', 'NW', 'UR', 'SZ', 'GL']
const DESTINAZIONI = ['residenziale', 'commerciale', 'industriale', 'misto', 'pubblico']
const STATI = ['aperto', 'in_corso', 'sospeso', 'chiuso', 'archiviato']

const STATO_LABEL = {
  aperto: 'Aperto',
  in_corso: 'In corso',
  sospeso: 'Sospeso',
  chiuso: 'Chiuso',
  archiviato: 'Archiviato',
}

// Semaforo conformità complessiva, appiattendo esiti_normativa (ARRAY) di
// tutti i disegni con analisi completata.
const CONFORMITA = {
  non_conforme: { label: 'Non conforme', icon: XCircle, cls: 'text-red-400', border: 'border-red-400/40' },
  da_verificare: { label: 'Da verificare', icon: AlertTriangle, cls: 'text-amber-400', border: 'border-amber-400/40' },
  conforme: { label: 'Conforme', icon: CheckCircle2, cls: 'text-salvia', border: 'border-salvia/40' },
  da_analizzare: { label: 'Da analizzare', icon: Circle, cls: 'text-nebbia/40', border: 'border-white/15' },
}

function calcolaConformita(disegni) {
  const esiti = disegni
    .filter(d => d.stato_analisi === 'completata')
    .flatMap(d => Array.isArray(d.esiti_normativa) ? d.esiti_normativa : [])
    .map(e => e?.esito)
  if (esiti.includes('non_conforme')) return CONFORMITA.non_conforme
  if (esiti.includes('da_verificare')) return CONFORMITA.da_verificare
  if (esiti.includes('conforme')) return CONFORMITA.conforme
  return CONFORMITA.da_analizzare
}

export default function ProgettoPanoramica({ progetto, onSaved }) {
  const [nome, setNome] = useState(progetto?.nome ?? '')
  const [stato, setStato] = useState(progetto?.stato ?? 'aperto')
  const [descrizione, setDescrizione] = useState(progetto?.descrizione ?? '')
  const [committente, setCommittente] = useState(progetto?.committente ?? '')
  const [indirizzo, setIndirizzo] = useState(progetto?.indirizzo ?? '')
  const [comune, setComune] = useState(progetto?.comune ?? '')
  const [cantone, setCantone] = useState(progetto?.cantone ?? '')
  const [destinazione, setDestinazione] = useState(progetto?.destinazione ?? '')
  const [numeroCommessa, setNumeroCommessa] = useState(progetto?.numero_commessa ?? '')
  const [mappale, setMappale] = useState(progetto?.mappale ?? '')
  const [zonaEdificatoria, setZonaEdificatoria] = useState(progetto?.zona_edificatoria ?? '')
  const [dataInizio, setDataInizio] = useState(progetto?.data_inizio ?? '')
  const [scadenzaLicenza, setScadenzaLicenza] = useState(progetto?.scadenza_licenza ?? '')
  const [importo, setImporto] = useState(
    progetto?.importo === null || progetto?.importo === undefined ? '' : String(progetto.importo)
  )

  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState(null)
  const [salvato, setSalvato] = useState(false)

  const { data: disegni = [] } = useQuery({
    queryKey: ['progetto_disegni_kpi', progetto?.id],
    enabled: !!progetto?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_disegni')
        .select('id, stato_analisi, esiti_normativa')
        .eq('progetto_id', progetto.id)
      if (error) throw error
      return data
    },
  })

  const totali = disegni.length
  const analizzati = disegni.filter(d => d.stato_analisi === 'completata').length
  const conformita = calcolaConformita(disegni)
  const ConfIcon = conformita.icon

  async function salva() {
    if (!nome.trim()) { setErrore('Il nome del progetto è obbligatorio'); return }
    setSalvando(true)
    setErrore(null)
    setSalvato(false)

    const txt = v => (v?.toString().trim() ? v.toString().trim() : null)
    const num = v => {
      const s = v?.toString().trim()
      if (!s) return null
      const n = Number(s)
      return Number.isFinite(n) ? n : null
    }

    const { error } = await supabase
      .from('progetti')
      .update({
        nome: nome.trim(),
        stato,
        descrizione: txt(descrizione),
        committente: txt(committente),
        indirizzo: txt(indirizzo),
        comune: txt(comune),
        cantone: cantone || null,
        destinazione: destinazione || null,
        numero_commessa: txt(numeroCommessa),
        mappale: txt(mappale),
        zona_edificatoria: txt(zonaEdificatoria),
        data_inizio: dataInizio || null,
        scadenza_licenza: scadenzaLicenza || null,
        importo: num(importo),
        updated_at: new Date().toISOString(),
      })
      .eq('id', progetto.id)

    setSalvando(false)
    if (error) { setErrore(error.message); return }
    setSalvato(true)
    onSaved?.()
  }

  const inputCls = 'w-full bg-petrolio border border-white/10 px-3 py-2 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none'
  const labelCls = 'font-body text-xs text-nebbia/50 block mb-1'

  return (
    <div className="space-y-4">
      {/* Striscia KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 text-nebbia/40 mb-1.5">
            <FileText size={14} />
            <span className="font-body text-xs uppercase tracking-wider">Disegni totali</span>
          </div>
          <p className="font-display text-2xl text-nebbia">{totali}</p>
        </div>

        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 text-nebbia/40 mb-1.5">
            <CheckCircle2 size={14} />
            <span className="font-body text-xs uppercase tracking-wider">Analizzati</span>
          </div>
          <p className="font-display text-2xl text-nebbia">
            {analizzati}
            <span className="font-body text-sm text-nebbia/30 ml-1">/ {totali}</span>
          </p>
        </div>

        <div className={`bg-slate border ${conformita.border} p-5`}>
          <div className="flex items-center gap-2 text-nebbia/40 mb-1.5">
            <ConfIcon size={14} className={conformita.cls} />
            <span className="font-body text-xs uppercase tracking-wider">Conformità</span>
          </div>
          <p className={`font-display text-2xl ${conformita.cls}`}>{conformita.label}</p>
        </div>
      </div>

      {/* Form editabile */}
      <div className="bg-slate border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-sm text-nebbia">Dati del progetto</h2>
          <span className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider shrink-0 ${
            stato === 'chiuso' || stato === 'archiviato'
              ? 'border-white/15 text-nebbia/50'
              : stato === 'sospeso'
                ? 'border-amber-400/40 text-amber-400'
                : 'border-salvia/40 text-salvia'
          }`}>
            {STATO_LABEL[stato] ?? stato}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Nome progetto *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value)} className={inputCls}>
              {STATI.map(s => <option key={s} value={s}>{STATO_LABEL[s]}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Committente</label>
            <input value={committente} onChange={e => setCommittente(e.target.value)} className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Descrizione</label>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={3}
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className={labelCls}>Numero commessa</label>
            <input value={numeroCommessa} onChange={e => setNumeroCommessa(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Destinazione</label>
            <select value={destinazione} onChange={e => setDestinazione(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {DESTINAZIONI.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Indirizzo</label>
            <input value={indirizzo} onChange={e => setIndirizzo(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Comune</label>
            <input value={comune} onChange={e => setComune(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Cantone</label>
            <select value={cantone} onChange={e => setCantone(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {CANTONI.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Mappale</label>
            <input value={mappale} onChange={e => setMappale(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Zona edificatoria</label>
            <input value={zonaEdificatoria} onChange={e => setZonaEdificatoria(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Onorario/Importo CHF</label>
            <input type="number" value={importo} onChange={e => setImporto(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Data inizio</label>
            <input type="date" value={dataInizio ?? ''} onChange={e => setDataInizio(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Scadenza domanda di costruzione</label>
            <input type="date" value={scadenzaLicenza ?? ''} onChange={e => setScadenzaLicenza(e.target.value)} className={inputCls} />
          </div>
        </div>

        {errore && <p className="font-body text-xs text-red-400">{errore}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={salva} disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors">
            {salvando
              ? <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
              : <Save size={15} />}
            Salva modifiche
          </button>
          {salvato && !salvando && (
            <span className="flex items-center gap-1.5 font-body text-xs text-salvia">
              <CheckCircle2 size={14} /> Salvato
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
