// src/components/progettista/NormeSiaLibreria.jsx
//
// Libreria personale di NORME TECNICHE SIA del progettista (modello BYO-license).
// Le norme SIA sono sotto licenza: Lexum NON le possiede. È il progettista che
// carica le SUE norme licenziate qui, UNA volta; l'analisi dei disegni le recupera
// (edge lex-norme-sia-disegno) e le fa collidere con la tavola — in TUTTI i suoi
// progetti. Nessuna condivisione: restano nel suo archivio privato (titolare_id).
//
// Pipeline DB-first (identica ad Archivio.jsx): il browser carica su storage
// 'archivio', inserisce in archivio_documenti (categoria con chiave 'norme_sia'),
// poi invoca process-archivio (testo + embeddings). Il retrieval in analisi
// vede solo i documenti verificato=true di questa categoria.
//
// Localizzazione IT/DE/FR via i18next (ns comp_progettista_norme_sia).

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase, invocaLex } from '@/lib/supabase'
import { BookMarked, Upload, Loader2, CheckCircle2, AlertTriangle, Trash2, FileText, ShieldCheck, RefreshCw } from 'lucide-react'

const CHIAVE_SIA = 'norme_sia'
const COLORE_SIA = '#c9a24b' // oro, coerente con la palette

// Nome canonico della categoria: stabile tra le lingue (il marcatore vero è
// `chiave`, il nome è solo l'etichetta iniziale, il progettista può rinominarla).
const NOME_CATEGORIA_SIA = 'Norme tecniche · SIA'

function useTitolareId() {
  const { profile } = useAuth()
  return profile?.titolare_id ?? profile?.id ?? null
}

export default function NormeSiaLibreria() {
  const { profile } = useAuth()
  const { t } = useTranslation('comp_progettista_norme_sia')
  const titolareId = useTitolareId()
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [errore, setErrore] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [riprovandoTutti, setRiprovandoTutti] = useState(false)

  // Categoria SIA + suoi documenti (una sola query, poll durante l'indicizzazione).
  const { data } = useQuery({
    queryKey: ['norme_sia_lista', titolareId],
    enabled: !!titolareId,
    queryFn: async () => {
      const { data: cat } = await supabase
        .from('categorie_archivio')
        .select('id')
        .eq('titolare_id', titolareId)
        .eq('chiave', CHIAVE_SIA)
        .maybeSingle()
      if (!cat?.id) return { catId: null, docs: [] }
      const { data: docs } = await supabase
        .from('archivio_documenti')
        .select('id, titolo, ocr_status, dimensione, created_at, metadati')
        .eq('categoria_id', cat.id)
        .order('created_at', { ascending: false })
      return { catId: cat.id, docs: docs ?? [] }
    },
    refetchInterval: (query) =>
      (query.state.data?.docs ?? []).some(d => ['pending', 'processing'].includes(d.ocr_status)) ? 3000 : false,
  })
  const docs = data?.docs ?? []
  const docsFalliti = docs.filter(d => d.ocr_status === 'failed')

  // Risolvi-o-crea la categoria SIA (idempotente: l'unique index (titolare,chiave)
  // protegge da doppioni concorrenti).
  async function assicuraCategoria() {
    const { data: cat } = await supabase
      .from('categorie_archivio')
      .select('id')
      .eq('titolare_id', titolareId)
      .eq('chiave', CHIAVE_SIA)
      .maybeSingle()
    if (cat?.id) return cat.id
    const { data: creata, error } = await supabase
      .from('categorie_archivio')
      .insert({ titolare_id: titolareId, nome: NOME_CATEGORIA_SIA, colore: COLORE_SIA, chiave: CHIAVE_SIA })
      .select('id')
      .single()
    if (error) {
      // corsa persa: rileggi la riga creata dall'altro upload
      const { data: esiste } = await supabase
        .from('categorie_archivio')
        .select('id').eq('titolare_id', titolareId).eq('chiave', CHIAVE_SIA).maybeSingle()
      if (esiste?.id) return esiste.id
      throw error
    }
    return creata.id
  }

  async function carica(files) {
    const lista = Array.from(files ?? [])
    if (lista.length === 0) return
    if (lista.some(f => f.type !== 'application/pdf')) { setErrore(t('solo_pdf')); return }
    setErrore(null)
    setUploading(true)
    try {
      const catId = await assicuraCategoria()
      for (const file of lista) {
        const rand = Math.random().toString(36).slice(2, 8)
        const path = `${titolareId}/${Date.now()}_${rand}.pdf`
        const { error: upErr } = await supabase.storage.from('archivio').upload(path, file)
        if (upErr) throw upErr
        const { data: doc, error: insErr } = await supabase
          .from('archivio_documenti')
          .insert({
            autore_id: profile.id,
            titolare_id: titolareId,
            categoria_id: catId,
            tipo: 'pdf',
            titolo: file.name,
            storage_path: path,
            tipo_file: file.type,
            dimensione: file.size,
            ocr_status: 'pending',
            metadati: { origine: 'norme_sia_progettista' },
          })
          .select('id')
          .single()
        if (insErr) { await supabase.storage.from('archivio').remove([path]); throw insErr }
        // Estrazione testo + embeddings (fire-and-forget: il poll segue ocr_status)
        invocaLex('process-archivio', { documento_id: doc.id }).catch(() => {})
      }
      queryClient.invalidateQueries({ queryKey: ['norme_sia_lista', titolareId] })
    } catch (e) {
      setErrore(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const elimina = useMutation({
    mutationFn: async (doc) => {
      const { data: row } = await supabase
        .from('archivio_documenti').select('storage_path').eq('id', doc.id).maybeSingle()
      if (row?.storage_path) await supabase.storage.from('archivio').remove([row.storage_path])
      const { error } = await supabase.from('archivio_documenti').delete().eq('id', doc.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['norme_sia_lista', titolareId] }),
    onError: (e) => setErrore(e.message),
  })

  // Ottimistico → 'processing' così il poll della lista segue lo stato reale.
  const segnaInCorso = (predicato) =>
    queryClient.setQueryData(['norme_sia_lista', titolareId], (old) =>
      old ? { ...old, docs: old.docs.map(d => predicato(d) ? { ...d, ocr_status: 'processing' } : d) } : old)

  // Ri-lancia process-archivio (ora con fallback OCR) su un documento in errore.
  const riprova = useMutation({
    mutationFn: async (doc) => { await invocaLex('process-archivio', { documento_id: doc.id }) },
    onMutate: (doc) => segnaInCorso(d => d.id === doc.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['norme_sia_lista', titolareId] }),
    onError: (e) => setErrore(e.message),
  })

  async function riprovaTutti() {
    const falliti = docs.filter(d => d.ocr_status === 'failed')
    if (falliti.length === 0 || riprovandoTutti) return
    setRiprovandoTutti(true)
    setErrore(null)
    segnaInCorso(d => d.ocr_status === 'failed')
    // Batch throttled: invocaLex attende la fine di ogni OCR → max BATCH concorrenti.
    const BATCH = 4
    for (let i = 0; i < falliti.length; i += BATCH) {
      await Promise.all(falliti.slice(i, i + BATCH).map(d =>
        invocaLex('process-archivio', { documento_id: d.id }).catch(() => {})))
      if (i + BATCH < falliti.length) await new Promise(r => setTimeout(r, 1500))
    }
    setRiprovandoTutti(false)
    queryClient.invalidateQueries({ queryKey: ['norme_sia_lista', titolareId] })
  }

  const statoBadge = (s) =>
    s === 'completed' ? { txt: t('badge_pronta'), cls: 'border-salvia/40 text-salvia', Icon: CheckCircle2 }
      : s === 'failed' ? { txt: t('badge_errore'), cls: 'border-red-400/40 text-red-400', Icon: AlertTriangle }
        : { txt: t('badge_in_corso'), cls: 'border-oro/40 text-oro', Icon: Loader2 }

  // Drag-and-drop: trascinare i PDF dentro il box è il modo più intuitivo di
  // "metterli lì". Il click resta come alternativa.
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    if (!uploading && titolareId) carica(e.dataTransfer.files)
  }

  return (
    // Contenitore DEDICATO, distinto dagli altri: accento oro + etichetta
    // "l'analisi legge da qui". È il posto unico e riconoscibile delle norme SIA.
    <div className="border border-oro/25 bg-gradient-to-b from-oro/[0.05] to-transparent p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 grid place-items-center bg-oro/10 border border-oro/30 rounded">
            <BookMarked size={17} className="text-oro" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-sm text-nebbia">{t('titolo')}</h2>
              <span className="font-body text-[10px] px-1.5 py-0.5 border border-oro/30 text-oro/80 uppercase tracking-wider">
                {t('badge_fonte')}
              </span>
            </div>
            <p className="font-body text-xs text-oro/70 mt-0.5">{t('sottotitolo')}</p>
            <p className="font-body text-xs text-nebbia/40 mt-1">{t('helper')}</p>
          </div>
        </div>
        {docs.length > 0 && (
          <button onClick={() => fileInput.current?.click()} disabled={uploading || !titolareId}
            className="flex items-center gap-2 px-3 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {t('aggiungi')}
          </button>
        )}
      </div>

      {errore && <p className="font-body text-xs text-red-400 mb-3">{errore}</p>}

      {docs.length === 0 ? (
        // CTA grande e inequivocabile: drop-zone tratteggiata (trascina o clicca).
        <button
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={uploading || !titolareId}
          className={`w-full flex flex-col items-center gap-2 py-9 px-4 border-2 border-dashed transition-colors disabled:opacity-50 ${
            dragOver ? 'border-oro/60 bg-oro/[0.10]' : 'border-oro/30 bg-oro/[0.03] hover:bg-oro/[0.07]'}`}
        >
          {uploading ? <Loader2 size={24} className="animate-spin text-oro" /> : <Upload size={24} className="text-oro/80" />}
          <span className="font-body text-sm text-nebbia">{t('cta_vuoto')}</span>
          <span className="font-body text-xs text-nebbia/40">{t('cta_hint')}</span>
        </button>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`space-y-2 ${dragOver ? 'outline-dashed outline-2 outline-oro/40 outline-offset-4' : ''}`}
        >
          {docsFalliti.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-red-500/5 border border-red-400/20">
              <span className="font-body text-[11px] text-nebbia/55 flex items-center gap-1.5 min-w-0">
                <AlertTriangle size={12} className="text-red-400/70 shrink-0" />
                <span className="truncate">{t('falliti_info', { count: docsFalliti.length })}</span>
              </span>
              <button onClick={riprovaTutti} disabled={riprovandoTutti}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-oro/10 border border-oro/30 text-oro font-body text-[11px] hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0">
                {riprovandoTutti ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {t('riprova_tutti')}
              </button>
            </div>
          )}
          {docs.map(d => {
            const b = statoBadge(d.ocr_status)
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 bg-petrolio border border-white/5">
                <FileText size={15} className="text-nebbia/40 shrink-0" />
                <p className="font-body text-sm text-nebbia truncate flex-1 min-w-0">{d.titolo}</p>
                <span title={d.ocr_status === 'failed' ? (d.metadati?.errore || '') : undefined}
                  className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider shrink-0 flex items-center gap-1 ${b.cls}`}>
                  <b.Icon size={11} className={['pending', 'processing'].includes(d.ocr_status) ? 'animate-spin' : ''} />
                  {b.txt}
                </span>
                {d.ocr_status === 'failed' && (
                  <button onClick={() => riprova.mutate(d)} disabled={riprova.isPending}
                    title={t('riprova')}
                    className="p-1.5 text-nebbia/30 hover:text-oro transition-colors shrink-0 disabled:opacity-40">
                    <RefreshCw size={14} />
                  </button>
                )}
                <button onClick={() => { if (confirm(t('conferma_elimina', { nome: d.titolo }))) elimina.mutate(d) }}
                  className="p-1.5 text-nebbia/30 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          <p className="font-body text-[11px] text-nebbia/30 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={12} className="text-salvia/50 shrink-0" /> {t('privacy')}
          </p>
        </div>
      )}
      <input ref={fileInput} type="file" accept="application/pdf" multiple className="hidden"
        onChange={e => carica(e.target.files)} />
    </div>
  )
}
