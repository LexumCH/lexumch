// src/components/progettista/ProgettoDocumenti.jsx
//
// Tab "Documenti" del dettaglio progetto: upload e lista dei documenti
// NON-disegno del progetto (permessi, rapporti, corrispondenza, contratti).
// Stessa meccanica di upload di ProgettoDisegni.jsx ma sul bucket
// 'progetto-documenti' e sulla tabella progetto_documenti.
//
// Props: progettoId (string)

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Loader2, ExternalLink, Trash2, FolderOpen } from 'lucide-react'
import GeneraDocumentoProgetto from './GeneraDocumentoProgetto'

const CATEGORIE = [
  { id: 'permesso', label: 'Permesso' },
  { id: 'rapporto', label: 'Rapporto' },
  { id: 'corrispondenza', label: 'Corrispondenza' },
  { id: 'contratto', label: 'Contratto' },
  { id: 'altro', label: 'Altro' },
]

const CATEGORIA_BADGE = {
  permesso: 'border-oro/40 text-oro',
  rapporto: 'border-salvia/40 text-salvia',
  corrispondenza: 'border-sky-500/40 text-sky-400',
  contratto: 'border-amber-400/40 text-amber-400',
  altro: 'border-white/15 text-nebbia/50',
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function formatDimensione(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatData(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('it-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function ProgettoDocumenti({ progettoId }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState(null)
  const [categoria, setCategoria] = useState('altro')

  const { data: documenti = [] } = useQuery({
    queryKey: ['progetto_documenti', progettoId, profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_documenti')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('progettista_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  async function caricaFile(file) {
    if (!file) return
    setErrore(null)
    setUploading(true)
    try {
      const path = `${profile.id}/${progettoId}/${Date.now()}_${sanitizeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from('progetto-documenti').upload(path, file)
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('progetto_documenti').insert({
        progetto_id: progettoId,
        progettista_id: profile.id,
        nome_file: file.name,
        storage_path: path,
        dimensione: file.size,
        categoria,
      })
      if (insErr) throw insErr
      queryClient.invalidateQueries({ queryKey: ['progetto_documenti', progettoId] })
    } catch (e) {
      setErrore(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function apri(doc) {
    setErrore(null)
    try {
      const { data, error } = await supabase.storage
        .from('progetto-documenti')
        .createSignedUrl(doc.storage_path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setErrore(e.message)
    }
  }

  const elimina = useMutation({
    mutationFn: async (doc) => {
      await supabase.storage.from('progetto-documenti').remove([doc.storage_path])
      const { error } = await supabase.from('progetto_documenti').delete()
        .eq('id', doc.id).eq('progettista_id', profile.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_documenti', progettoId] }),
    onError: (e) => setErrore(e.message),
  })

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-display text-sm text-nebbia">Documenti</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">
              Carica permessi, rapporti, corrispondenza e contratti — oppure genera i
              documenti tecnici (relazioni, verbali, superfici) dalle tavole analizzate.
            </p>
          </div>
          <div className="flex items-end gap-3 shrink-0">
            <GeneraDocumentoProgetto progettoId={progettoId} />
            <div>
              <label className="font-body text-xs text-nebbia/50 block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                disabled={uploading}
                className="w-full bg-petrolio border border-white/10 px-3 py-2 font-body text-sm text-nebbia focus:border-oro/50 focus:outline-none disabled:opacity-50"
              >
                {CATEGORIE.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Carica documento
            </button>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={e => caricaFile(e.target.files?.[0])}
            />
          </div>
        </div>
        {errore && <p className="font-body text-xs text-red-400 mt-3">{errore}</p>}
      </div>

      {/* Lista documenti */}
      <div className="space-y-2">
        {documenti.map(doc => {
          const badgeCls = CATEGORIA_BADGE[doc.categoria] ?? CATEGORIA_BADGE.altro
          const catLabel = CATEGORIE.find(c => c.id === doc.categoria)?.label ?? doc.categoria ?? 'Altro'
          return (
            <div key={doc.id} className="bg-slate border border-white/5 hover:border-oro/30 transition-colors">
              <div className="flex items-center gap-3 px-4 py-3">
                <FileText size={16} className="text-nebbia/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{doc.nome_file}</p>
                  <p className="font-body text-xs text-nebbia/40 truncate">
                    {formatDimensione(doc.dimensione)}
                    {doc.created_at && <span className="text-nebbia/25"> · {formatData(doc.created_at)}</span>}
                  </p>
                </div>
                <span className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider shrink-0 ${badgeCls}`}>
                  {catLabel}
                </span>
                <button
                  onClick={() => apri(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/70 font-body text-xs hover:border-oro/30 transition-colors shrink-0"
                >
                  <ExternalLink size={12} /> Apri
                </button>
                <button
                  onClick={() => { if (confirm(`Eliminare "${doc.nome_file}"?`)) elimina.mutate(doc) }}
                  className="p-1.5 text-nebbia/30 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}

        {documenti.length === 0 && (
          <div className="border border-white/5 bg-slate p-8 text-center">
            <FolderOpen size={26} className="mx-auto text-nebbia/20 mb-3" />
            <p className="font-body text-sm text-nebbia/50">
              Nessun documento caricato. Aggiungi permessi, rapporti, corrispondenza o contratti del progetto.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
