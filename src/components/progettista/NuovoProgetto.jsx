// src/components/progettista/NuovoProgetto.jsx
//
// Modal per creare un progetto per un cliente (committente).
// Autonomo: recupera progettista_id (utente loggato) e studio_id (profilo) da sé.
// Speculare a fiduciario/NuovoMandato.
//
// Props:
//   clienteId  (string, opzionale)  - committente a cui appartiene il progetto.
//                                      Se assente, il modal mostra un selettore
//                                      committente (apertura dalla lista globale).
//   onClose()  - chiusura modal
//   onSaved(nuovoId) - callback dopo la creazione; riceve l'id del nuovo progetto

import { useState, useEffect } from 'react'
import { X, DraftingCompass, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const CANTONI = ['TI', 'ZH', 'GE', 'VD', 'BE', 'BS', 'BL', 'LU', 'ZG', 'FR', 'SO', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'VS', 'NE', 'JU', 'OW', 'NW', 'UR', 'SZ', 'GL']
const DESTINAZIONI = ['residenziale', 'commerciale', 'industriale', 'misto', 'pubblico']

function nomeCliente(c) {
  if (!c) return null
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? null
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
}

export default function NuovoProgetto({ clienteId, onClose, onSaved }) {
  const [nome, setNome] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [comune, setComune] = useState('')
  const [cantone, setCantone] = useState('')
  const [destinazione, setDestinazione] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState(null)

  // Selettore committente: attivo solo quando il modal è aperto SENZA un
  // committente predeterminato (es. dalla lista globale /progetti).
  const serveSelettore = !clienteId
  const [committenteSel, setCommittenteSel] = useState('')
  const [clienti, setClienti] = useState([])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, salvando])

  useEffect(() => {
    if (!serveSelettore) return
    let attivo = true
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
        .eq('role', 'cliente')
        .order('cognome')
      if (attivo) setClienti(data ?? [])
    })()
    return () => { attivo = false }
  }, [serveSelettore])

  const clienteIdEffettivo = clienteId ?? (committenteSel || null)
  const puoSalvare = nome.trim().length > 0 && !!clienteIdEffettivo

  async function salva() {
    if (!nome.trim()) { setErrore('Il nome del progetto è obbligatorio'); return }
    if (!clienteIdEffettivo) { setErrore('Seleziona il committente'); return }
    setSalvando(true)
    setErrore(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErrore('Sessione scaduta. Effettua di nuovo il login.'); setSalvando(false); return }

    const [{ data: profilo }, { data: cliente }] = await Promise.all([
      supabase.from('profiles').select('studio_id').eq('id', user.id).single(),
      supabase.from('profiles').select('nome, cognome, ragione_sociale, tipo_soggetto').eq('id', clienteIdEffettivo).single(),
    ])
    const committente = nomeCliente(cliente)

    const txt = v => (v?.toString().trim() ? v.toString().trim() : null)

    const { data, error } = await supabase
      .from('progetti')
      .insert({
        progettista_id: user.id,
        cliente_id: clienteIdEffettivo,
        studio_id: profilo?.studio_id ?? null,
        nome: nome.trim(),
        committente,
        indirizzo: txt(indirizzo),
        comune: txt(comune),
        cantone: cantone || null,
        destinazione: destinazione || null,
        descrizione: txt(descrizione),
      })
      .select('id')
      .single()

    setSalvando(false)
    if (error) { setErrore(error.message); return }
    onSaved(data?.id ?? null)
  }

  const inputCls = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25'
  const labelCls = 'block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
      onClick={() => { if (!salvando) onClose() }}>
      <div className="bg-slate border border-white/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <DraftingCompass size={16} className="text-oro" />
            <div>
              <p className="font-display text-lg text-nebbia">Nuovo progetto</p>
              <p className="font-body text-xs text-nebbia/40 mt-0.5">Per questo committente</p>
            </div>
          </div>
          <button onClick={onClose} disabled={salvando}
            className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40">
            <X size={18} className="text-nebbia/60" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {serveSelettore && (
            <div>
              <label className={labelCls}>Committente *</label>
              <select value={committenteSel} onChange={e => setCommittenteSel(e.target.value)} className={inputCls}>
                <option value="">Seleziona committente…</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{nomeCliente(c) ?? '—'}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Nome progetto *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus
              placeholder="es. Gewerbezentrum Waldweg" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Indirizzo <span className="text-nebbia/25 normal-case tracking-normal">opzionale</span></label>
            <input value={indirizzo} onChange={e => setIndirizzo(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Comune <span className="text-nebbia/25 normal-case tracking-normal">opz.</span></label>
              <input value={comune} onChange={e => setComune(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cantone <span className="text-nebbia/25 normal-case tracking-normal">opz.</span></label>
              <select value={cantone} onChange={e => setCantone(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {CANTONI.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Destinazione <span className="text-nebbia/25 normal-case tracking-normal">opzionale</span></label>
            <select value={destinazione} onChange={e => setDestinazione(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {DESTINAZIONI.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Descrizione <span className="text-nebbia/25 normal-case tracking-normal">opzionale</span></label>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={3}
              className={`${inputCls} resize-none`} />
          </div>

          {errore && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {errore}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0">
          <button onClick={onClose} disabled={salvando}
            className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40">
            Annulla
          </button>
          <button onClick={salva} disabled={!puoSalvare || salvando}
            className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {salvando ? <><Loader2 size={14} className="animate-spin" /> Creazione…</> : 'Crea progetto'}
          </button>
        </div>
      </div>
    </div>
  )
}
