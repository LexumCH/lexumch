// src/components/progettista/ProgettoDisegni.jsx
//
// Tab "Disegni" del dettaglio progetto: upload PDF + lista con filtri per stato
// d'analisi + avvio analisi + risultati espandibili (disegno, normativa, locali).
//
// Localizzazione (IT/DE/FR):
//  - Etichette statiche via i18next (ns comp_progettista_disegni).
//  - Prosa dei risultati (findings/verifiche/testo di legge) localizzata dal layer
//    lex-narra-disegno: il motore resta la fonte di verità, l'AI localizza DE/FR
//    copiando i numeri verbatim e prendendo il testo di legge dal DB. In IT è
//    passthrough (stringhe del motore). Fallback sempre alle stringhe del motore.
//
// Props: progettoId (string)

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase, supabaseUrl, supabaseKey, getAccessToken } from '@/lib/supabase'
import {
  Upload, FileText, Play, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Info, ChevronDown, ChevronUp, Trash2, Languages, Landmark, RefreshCw
} from 'lucide-react'

const STATO_META = {
  caricato: { icon: FileText, cls: 'text-nebbia/50' },
  in_analisi: { icon: Loader2, cls: 'text-oro' },
  completata: { icon: CheckCircle2, cls: 'text-salvia' },
  errore: { icon: XCircle, cls: 'text-red-400' },
}

const BADGE_CLS = {
  caricato: 'border-white/15 text-nebbia/50',
  in_analisi: 'border-oro/40 text-oro',
  completata: 'border-salvia/40 text-salvia',
  errore: 'border-red-400/40 text-red-400',
}

const FILTRI_IDS = ['tutti', 'caricato', 'in_analisi', 'completata', 'errore']

const ESITO_META = {
  conforme: { icon: CheckCircle2, cls: 'text-salvia' },
  non_conforme: { icon: XCircle, cls: 'text-red-400' },
  da_verificare: { icon: AlertTriangle, cls: 'text-amber-400' },
  non_verificabile: { icon: Info, cls: 'text-nebbia/50' },
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function useLingua() {
  const { i18n } = useTranslation()
  const raw = (i18n.resolvedLanguage || i18n.language || 'it').slice(0, 2)
  return ['it', 'de', 'fr'].includes(raw) ? raw : 'it'
}

export default function ProgettoDisegni({ progettoId }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useTranslation('comp_progettista_disegni')
  const fileInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState(null)
  const [aperto, setAperto] = useState(null)
  const [filtro, setFiltro] = useState('tutti')

  const { data: progetto } = useQuery({
    queryKey: ['progetto_cantone', progettoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetti').select('cantone').eq('id', progettoId).single()
      if (error) throw error
      return data
    },
  })

  const { data: disegni = [] } = useQuery({
    queryKey: ['progetto_disegni', progettoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_disegni')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    refetchInterval: (query) =>
      (query.state.data ?? []).some(d => d.stato_analisi === 'in_analisi') ? 3000 : false,
  })

  async function caricaFile(file) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setErrore(t('solo_pdf'))
      return
    }
    setErrore(null)
    setUploading(true)
    try {
      const path = `${profile.id}/${progettoId}/${Date.now()}_${sanitizeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from('disegni').upload(path, file)
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('progetto_disegni').insert({
        progetto_id: progettoId,
        progettista_id: profile.id,
        nome_file: file.name,
        storage_path: path,
        dimensione: file.size,
      })
      if (insErr) throw insErr
      queryClient.invalidateQueries({ queryKey: ['progetto_disegni', progettoId] })
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ disegno_id: disegnoId, supabase_url: supabaseUrl, supabase_anon_key: supabaseKey }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.errore ?? `Errore ${res.status}`)
      return out
    },
    onMutate: () => setErrore(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_disegni', progettoId] }),
    onError: (e) => setErrore(e.message),
  })

  const elimina = useMutation({
    mutationFn: async (disegno) => {
      await supabase.storage.from('disegni').remove([disegno.storage_path])
      const { error } = await supabase.from('progetto_disegni').delete().eq('id', disegno.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_disegni', progettoId] }),
    onError: (e) => setErrore(e.message),
  })

  const counts = {
    caricato: disegni.filter(d => d.stato_analisi === 'caricato').length,
    in_analisi: disegni.filter(d => d.stato_analisi === 'in_analisi').length,
    completata: disegni.filter(d => d.stato_analisi === 'completata').length,
    errore: disegni.filter(d => d.stato_analisi === 'errore').length,
  }
  const disegniFiltrati = filtro === 'tutti' ? disegni : disegni.filter(d => d.stato_analisi === filtro)

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm text-nebbia">{t('titolo')}</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">{t('helper')}</p>
          </div>
          <button onClick={() => fileInput.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 disabled:opacity-50 transition-colors shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {t('carica_pdf')}
          </button>
          <input ref={fileInput} type="file" accept="application/pdf" className="hidden"
            onChange={e => caricaFile(e.target.files?.[0])} />
        </div>
        {errore && <p className="font-body text-xs text-red-400 mt-3">{errore}</p>}
      </div>

      {/* Barra conteggi + filtri */}
      {disegni.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-body text-sm text-nebbia/40">
            {t('disegni', { count: disegni.length })}
            {counts.completata > 0 && <span className="ml-1 text-nebbia/25">· {t('analizzati', { count: counts.completata })}</span>}
          </p>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {FILTRI_IDS.map(id => {
              const n = id === 'tutti' ? disegni.length : counts[id]
              const active = filtro === id
              return (
                <button key={id} onClick={() => setFiltro(id)}
                  className={`font-body text-xs px-2.5 py-1 border transition-colors ${active
                    ? 'bg-oro/10 border-oro/40 text-oro'
                    : 'bg-slate border-white/10 text-nebbia/50 hover:border-oro/20 hover:text-nebbia/80'}`}>
                  {t(`filtri.${id}`)}{n > 0 && <span className="ml-1 opacity-60">{n}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista disegni */}
      <div className="space-y-2">
        {disegniFiltrati.map(d => {
          const meta = STATO_META[d.stato_analisi] ?? STATO_META.caricato
          const StatoIcon = meta.icon
          const espanso = aperto === d.id
          const testi = d.gemello?.quote?.testi ?? []
          const incoerenze = (d.findings ?? []).filter(f => f.severita === 'errore')
          const riepilogo = d.stato_analisi === 'completata' && d.gemello
            ? [
                t('riepilogo_quote', { count: testi.length }),
                t('riepilogo_incoerenze', { count: incoerenze.length }),
                t('riepilogo_locali', { count: (d.gemello.locali ?? []).length }),
              ].join(' · ')
            : d.stato_analisi === 'errore'
              ? (d.errore || t('riepilogo_errore'))
              : d.stato_analisi === 'in_analisi'
                ? t('riepilogo_in_analisi')
                : t('riepilogo_in_attesa')
          return (
            <div key={d.id} className="bg-slate border border-white/5">
              <div className="flex items-center gap-3 px-4 py-3">
                <StatoIcon size={16}
                  className={`${meta.cls} shrink-0 ${d.stato_analisi === 'in_analisi' ? 'animate-spin' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{d.nome_file}</p>
                  <p className={`font-body text-xs truncate ${d.stato_analisi === 'errore' ? 'text-red-400/80' : 'text-nebbia/40'}`}>
                    {riepilogo}
                  </p>
                </div>
                <span className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider shrink-0 ${BADGE_CLS[d.stato_analisi] ?? BADGE_CLS.caricato}`}>
                  {t(`badge.${d.stato_analisi}`)}
                </span>
                {['caricato', 'errore'].includes(d.stato_analisi) && (
                  <button onClick={() => analizza.mutate(d.id)} disabled={analizza.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-xs hover:bg-salvia/20 disabled:opacity-50 transition-colors shrink-0">
                    <Play size={12} /> {t('analizza')}
                  </button>
                )}
                {d.stato_analisi === 'completata' && (
                  <button onClick={() => setAperto(espanso ? null : d.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/70 font-body text-xs hover:border-oro/30 transition-colors shrink-0">
                    {t('risultati')} {espanso ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <button onClick={() => { if (confirm(t('conferma_elimina', { nome: d.nome_file }))) elimina.mutate(d) }}
                  className="p-1.5 text-nebbia/30 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>

              {espanso && d.stato_analisi === 'completata' && (
                <RisultatiDisegno disegno={d} t={t} cantone={progetto?.cantone ?? null} />
              )}
            </div>
          )
        })}
        {disegni.length === 0 ? (
          <div className="border border-white/5 bg-slate p-8 text-center">
            <FileText size={26} className="mx-auto text-nebbia/20 mb-3" />
            <p className="font-body text-sm text-nebbia/50">{t('vuoto_nessun_disegno')}</p>
          </div>
        ) : (filtro !== 'tutti' && disegniFiltrati.length === 0) && (
          <div className="border border-white/5 bg-slate p-6 text-center">
            <p className="font-body text-sm text-nebbia/40">{t('vuoto_stato')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pannello risultati (con narrazione localizzata IT/DE/FR) ────────
function RisultatiDisegno({ disegno: d, t, cantone }) {
  const lingua = useLingua()
  const testi = d.gemello?.quote?.testi ?? []
  const cQ = testi.reduce((a, x) => { a[x.stato] = (a[x.stato] || 0) + 1; return a }, {})
  const verificate = (cQ.ok || 0) + (cQ.ok_dettaglio || 0)
  const incoerenze = (d.findings ?? []).filter(f => f.severita === 'errore')
  const note = (d.findings ?? []).filter(f => f.severita !== 'errore')
  const esiti = d.esiti_normativa ?? []

  // Narrazione DE/FR dal layer AI; IT = passthrough (stringhe del motore).
  const { data: narr, isFetching: narrLoading } = useQuery({
    queryKey: ['narrazione_disegno', d.id, lingua, d.updated_at],
    enabled: lingua !== 'it',
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('lex-narra-disegno', {
        body: { disegno_id: d.id, lingua },
      })
      if (error) throw error
      return data?.narrazione ?? null
    },
  })

  // Indice per idx; fallback SEMPRE alla stringa del motore (mai vuoto)
  const findIdx = (arr, i) => (arr ?? []).find(x => x.idx === i)
  const testoFinding = (f, i) => findIdx(narr?.findings, i)?.testo ?? f.messaggio
  const datiEsito = (e, i) => {
    const n = findIdx(narr?.esiti, i)
    return {
      riferimento: n?.riferimento ?? e.riferimento,
      testo_norma: n?.testo_norma ?? e.testo_norma,
      spiegazione: n?.spiegazione ?? e.verifica,
    }
  }
  // Mappa finding globale (findings mescola errori e note) → idx originale
  const idxOf = (f) => (d.findings ?? []).indexOf(f)

  const chips = [
    ['chip_verificate', verificate, 'salvia'],
    ['chip_altezze', cQ.altezza_apertura || 0, 'nebbia'],
    ['chip_fuori', cQ.fuori_tavola || 0, 'nebbia'],
    ['chip_zona', cQ.zona_non_verificata || 0, 'amber'],
    ['chip_senza', cQ.senza_riscontro || 0, 'red'],
  ]

  return (
    <div className="border-t border-white/5 px-4 py-4 space-y-5">
      {/* Sintesi localizzata (solo se il layer AI l'ha prodotta) */}
      {narr?.sommario && (
        <p className="font-body text-sm text-nebbia/80 bg-petrolio border-l-2 border-oro/40 pl-3 py-2">
          <span className="text-nebbia/40 uppercase text-[10px] tracking-wider mr-2">{t('sommario_label')}</span>
          {narr.sommario}
        </p>
      )}

      <section>
        <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2 flex items-center gap-2">
          {t('sez_analisi')}
          {narrLoading && <Languages size={12} className="text-oro/60 animate-pulse" />}
        </h3>

        {/* Breakdown quote: ogni quota è spiegata, non "fallita" */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {chips.filter(([, n]) => n > 0).map(([key, n, col]) => (
            <span key={key} className={`font-body text-[11px] px-2 py-0.5 border ${col === 'salvia' ? 'border-salvia/30 text-salvia'
              : col === 'amber' ? 'border-amber-400/30 text-amber-400'
                : col === 'red' ? 'border-red-400/30 text-red-400'
                  : 'border-white/10 text-nebbia/45'}`}>
              {n} {t(key)}
            </span>
          ))}
          <span className="font-body text-[11px] text-nebbia/25 ml-0.5">{t('chip_su_quote', { count: testi.length })}</span>
        </div>

        {/* Incoerenze reali (finding gravi) */}
        {incoerenze.length === 0 ? (
          <p className="font-body text-sm text-salvia flex items-center gap-2">
            <CheckCircle2 size={14} /> {t('nessuna_incoerenza')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {incoerenze.map((f, i) => (
              <li key={i} className="flex items-start gap-2 font-body text-sm text-nebbia/80">
                <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                {testoFinding(f, idxOf(f))}
              </li>
            ))}
          </ul>
        )}

        {/* Zone non verificate (note, non errori del disegno) */}
        {note.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="font-body text-[11px] uppercase tracking-wider text-nebbia/30 mb-1.5">{t('zone_non_verificate')}</p>
            <ul className="space-y-1.5">
              {note.map((f, i) => (
                <li key={i} className="flex items-start gap-2 font-body text-sm text-nebbia/70">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  {testoFinding(f, idxOf(f))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2">{t('sez_normativa')}</h3>
        <div className="space-y-2">
          {esiti.map((e, i) => {
            const es = ESITO_META[e.esito] ?? ESITO_META.non_verificabile
            const EsIcon = es.icon
            const dati = datiEsito(e, i)
            return (
              <div key={i} className="bg-petrolio border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <EsIcon size={14} className={es.cls} />
                  <span className={`font-body text-xs font-medium ${es.cls}`}>{t(`esito.${e.esito}`)}</span>
                  <span className="font-body text-xs text-nebbia/40">— {dati.riferimento}</span>
                </div>
                <p className="font-body text-sm text-nebbia/80">{dati.spiegazione}</p>
                {dati.testo_norma && (
                  <p className="font-body text-xs text-nebbia/40 mt-1.5 border-l-2 border-white/10 pl-2">{dati.testo_norma}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <SezioneCantonale disegno={d} cantone={cantone} t={t} lingua={lingua} />

      {(d.gemello?.locali ?? []).length > 0 && (
        <section>
          <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2">
            {t('sez_locali', {
              count: d.gemello.locali.length,
              bf: d.gemello.locali.reduce((s, r) => s + (r.superficie_bf_m2 ?? 0), 0).toFixed(2),
            })}
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
  )
}

// ─── Normativa cantonale (ponte AI: selezione articoli + testo dal DB) ──
// Corsia separata dal motore federale: gli articoli sono SELEZIONATI dall'AI
// (badge "Selezione AI"); i verdetti conforme/non conforme vengono solo dal
// codice della edge function; il testo di legge sempre dal DB cantonale.
function SezioneCantonale({ disegno: d, cantone, t, lingua }) {
  const queryClient = useQueryClient()
  const cache = d.esiti_cantonali ?? null
  const esiti = cache?.esiti ?? []
  const stale = cache && (cache.fonte_updated_at !== d.updated_at || cache.cantone !== cantone || cache.lingua !== lingua)

  const genera = useMutation({
    // forza=true bypassa la cache lato server (es. dopo un cambio modello che
    // il client non può rilevare).
    mutationFn: async ({ forza = false } = {}) => {
      const { data, error } = await supabase.functions.invoke('lex-normativa-cantonale', {
        body: { disegno_id: d.id, lingua, forza },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error ?? 'errore')
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['progetto_disegni'] }),
  })

  return (
    <section>
      <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40 mb-2 flex items-center gap-2">
        <Landmark size={12} className="text-nebbia/30" />
        {t('sez_cantonale', { cantone: cantone ?? '—' })}
        <span className="font-body text-[10px] normal-case tracking-normal px-1.5 py-0.5 border border-oro/30 text-oro/80">
          {t('cant_badge_ai')}
        </span>
      </h3>

      {!cantone ? (
        <p className="font-body text-xs text-nebbia/40">{t('cant_hint_no_cantone')}</p>
      ) : !cache ? (
        <div>
          <button onClick={() => genera.mutate({})} disabled={genera.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 disabled:opacity-50 transition-colors">
            {genera.isPending ? <Loader2 size={13} className="animate-spin" /> : <Landmark size={13} />}
            {genera.isPending ? t('cant_in_corso') : t('cant_analizza')}
          </button>
          {genera.isError && <p className="font-body text-xs text-red-400 mt-2">{t('cant_errore')}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <button onClick={() => genera.mutate({ forza: !stale })} disabled={genera.isPending}
            className={`flex items-center gap-1.5 px-2.5 py-1 border font-body text-[11px] disabled:opacity-50 transition-colors ${stale
              ? 'border-oro/30 text-oro hover:bg-oro/10'
              : 'border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-nebbia/80'}`}>
            <RefreshCw size={11} className={genera.isPending ? 'animate-spin' : ''} /> {t('cant_aggiorna')}
          </button>
          {esiti.length === 0 && (
            <p className="font-body text-xs text-nebbia/40">{t('cant_vuoto')}</p>
          )}
          {esiti.map((e, i) => {
            const es = ESITO_META[e.esito] ?? ESITO_META.non_verificabile
            const EsIcon = es.icon
            return (
              <div key={i} className="bg-petrolio border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <EsIcon size={14} className={es.cls} />
                  <span className={`font-body text-xs font-medium ${es.cls}`}>{t(`esito.${e.esito}`)}</span>
                  <span className="font-body text-xs text-nebbia/40">
                    — {e.norma_id
                      ? <Link to={`/banca-dati/norma-cantonale/${e.norma_id}`} className="hover:text-oro transition-colors underline decoration-white/20 underline-offset-2">{e.riferimento}</Link>
                      : e.riferimento}
                  </span>
                  <span className="font-body text-[10px] px-1.5 py-0.5 border border-white/10 text-nebbia/40 ml-auto shrink-0">
                    {t(`verificabilita.${e.verificabilita}`, { defaultValue: e.verificabilita })}
                  </span>
                </div>
                {e.rubrica && <p className="font-body text-xs text-nebbia/50 mb-1">{e.rubrica}</p>}
                <p className="font-body text-sm text-nebbia/80">{e.verifica}</p>
                {e.testo_norma && (
                  <p className="font-body text-xs text-nebbia/40 mt-1.5 border-l-2 border-white/10 pl-2">{e.testo_norma}</p>
                )}
              </div>
            )
          })}
          {genera.isError && <p className="font-body text-xs text-red-400">{t('cant_errore')}</p>}
        </div>
      )}
    </section>
  )
}
