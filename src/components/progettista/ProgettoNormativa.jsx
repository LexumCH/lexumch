// src/components/progettista/ProgettoNormativa.jsx
//
// Tab "Normativa" del dettaglio progetto. Due sezioni:
//   (A) Normativa edilizia cantonale applicabile (norme_cantonali_ch filtrate
//       per cantone del progetto + parole chiave edilizia/pianificazione).
//   (B) Semaforo di conformità: appiattisce gli esiti_normativa di tutti i
//       disegni analizzati e conta per esito, elencando i punti non conformi
//       e da verificare.
//
// Props: progetto (record della tabella progetti)

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { NORME_EDILIZIA_CANTONALE } from '@/lib/normativa-edilizia-cantonale'
import {
  Scale, MapPin, ChevronRight, BookOpen, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, Info, FileText
} from 'lucide-react'

// Esiti di conformità (allineati a ProgettoDisegni: rosso / amber / salvia / nebbia).
const ESITO_CONFIG = {
  non_conforme:     { label: 'Non conforme',    icon: XCircle,       cls: 'text-red-400',    badge: 'border-red-400/40 text-red-400' },
  da_verificare:    { label: 'Da verificare',   icon: AlertTriangle, cls: 'text-amber-400',  badge: 'border-amber-400/40 text-amber-400' },
  conforme:         { label: 'Conforme',        icon: CheckCircle2,  cls: 'text-salvia',     badge: 'border-salvia/40 text-salvia' },
  non_verificabile: { label: 'Non verificabile', icon: Info,         cls: 'text-nebbia/50',  badge: 'border-white/15 text-nebbia/50' },
}

// Filtro parole chiave di FALLBACK (usato solo per cantoni non ancora nella
// mappa curata): identifica norme edilizie/di pianificazione (DE/FR/IT).
const FILTRO_NORME =
  'title.ilike.%baugesetz%,' +
  'title.ilike.%planungs- und bau%,' +
  'title.ilike.%bauverordnung%,' +
  'title.ilike.%baureglement%,' +
  'title.ilike.%baubegriffe%,' +
  'title.ilike.%raumplanung%,' +
  'title.ilike.%raumentwicklung%,' +
  'title.ilike.%aménagement du territoire%,' +
  'title.ilike.%constructions%,' +
  'title.ilike.%pianificazione del territorio%,' +
  'title.ilike.%edilizia%'

// Rumore da escludere dal fallback (atti col nome che contiene "…bau" ma non
// edilizi: opere idrauliche/stradali, promozione alloggi, funivie, ecc.).
const RUMORE = /wasserbau|strassenbau|nationalstrasse|wohnungsbau|seilbahn|kunst und bau|baurechtsvertrag|ausbildungsbeitr|expropriation|sur les communes|laïcit|pflege- und betreuung/i

function titoloNorma(n) {
  return n.title_by_lang?.de ?? n.title_by_lang?.fr ?? n.title_by_lang?.it ?? n.title ?? '—'
}

export default function ProgettoNormativa({ progetto }) {
  const cantone = progetto?.cantone ?? ''
  const curata = NORME_EDILIZIA_CANTONALE[cantone] ?? null

  // (A) Normativa cantonale applicabile — elenco CURATO se il cantone è in mappa,
  // altrimenti fallback per parole chiave ripulito dal rumore.
  const { data: norme = [], isLoading: normeLoading, error: normeError } = useQuery({
    queryKey: ['norme_cantonali', cantone, curata ? 'curata' : 'auto'],
    enabled: !!cantone,
    queryFn: async () => {
      if (curata) {
        const { data, error } = await supabase
          .from('norme_cantonali_ch')
          .select('id, systematic_number, abbreviation, title, title_by_lang, is_active')
          .eq('canton', cantone)
          .in('systematic_number', curata)
        if (error) throw error
        // Ordina secondo l'ordine curato (legge → regolamento → IVHB → …).
        return (data ?? []).sort(
          (a, b) => curata.indexOf(a.systematic_number) - curata.indexOf(b.systematic_number)
        )
      }
      const { data, error } = await supabase
        .from('norme_cantonali_ch')
        .select('id, systematic_number, abbreviation, title, title_by_lang, is_active')
        .eq('canton', cantone)
        .or(FILTRO_NORME)
        .order('is_active', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []).filter(n => !RUMORE.test(`${n.title ?? ''} ${titoloNorma(n)}`))
    },
  })

  // (B) Esiti di conformità dai disegni analizzati
  const { data: disegni = [], isLoading: disegniLoading } = useQuery({
    queryKey: ['progetto_disegni_esiti', progetto?.id],
    enabled: !!progetto?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progetto_disegni')
        .select('id, nome_file, stato_analisi, esiti_normativa')
        .eq('progetto_id', progetto.id)
      if (error) throw error
      return data ?? []
    },
  })

  const disegniCompletati = disegni.filter(d => d.stato_analisi === 'completata')

  // Appiattisce tutti gli esiti (esiti_normativa È UN ARRAY per disegno).
  const esitiPiatti = disegniCompletati.flatMap(d =>
    (Array.isArray(d.esiti_normativa) ? d.esiti_normativa : []).map(e => ({
      ...e,
      nome_file: d.nome_file,
    }))
  )

  const conteggi = {
    non_conforme:     esitiPiatti.filter(e => e.esito === 'non_conforme').length,
    da_verificare:    esitiPiatti.filter(e => e.esito === 'da_verificare').length,
    conforme:         esitiPiatti.filter(e => e.esito === 'conforme').length,
    non_verificabile: esitiPiatti.filter(e => e.esito === 'non_verificabile').length,
  }

  const daRisolvere = esitiPiatti.filter(e => ['non_conforme', 'da_verificare'].includes(e.esito))

  return (
    <div className="space-y-4">
      {/* ── (A) Normativa cantonale applicabile ─────────────────────── */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-oro shrink-0" />
          <div>
            <h2 className="font-display text-sm text-nebbia">Normativa edilizia applicabile</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">
              Atti cantonali di edilizia e pianificazione del territorio rilevanti per il progetto.
              {cantone && (curata
                ? <span className="text-salvia/70"> · elenco curato per {cantone}</span>
                : <span className="text-amber-400/70"> · risultati automatici per parole chiave</span>)}
            </p>
          </div>
        </div>

        {!cantone ? (
          <div className="flex items-start gap-2 p-3 bg-petrolio border border-amber-400/20">
            <MapPin size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="font-body text-sm text-nebbia/70">
              Imposta il cantone nella Panoramica per vedere la normativa applicabile.
            </p>
          </div>
        ) : normeLoading ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
          </div>
        ) : normeError ? (
          <p className="font-body text-xs text-red-400">{normeError.message}</p>
        ) : norme.length === 0 ? (
          <div className="p-6 text-center border border-white/5 bg-petrolio">
            <BookOpen size={22} className="mx-auto text-nebbia/20 mb-2" />
            <p className="font-body text-sm text-nebbia/50">
              Nessuna norma edilizia cantonale trovata per {cantone}.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {norme.map(n => (
              <Link key={n.id} to={`/banca-dati/norma-cantonale/${n.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors group">
                {n.abbreviation && (
                  <span className="font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider border-oro/30 text-oro shrink-0">
                    {n.abbreviation}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-nebbia truncate">{titoloNorma(n)}</p>
                  {n.systematic_number && (
                    <p className="font-body text-xs text-nebbia/40 truncate">{n.systematic_number}</p>
                  )}
                </div>
                {!n.is_active && (
                  <span className="font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider border-white/15 text-nebbia/40 shrink-0">
                    Abrogata
                  </span>
                )}
                <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── (B) Semaforo di conformità ──────────────────────────────── */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-oro shrink-0" />
          <div>
            <h2 className="font-display text-sm text-nebbia">Conformità del progetto</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">
              Riepilogo delle verifiche normative sui disegni analizzati.
            </p>
          </div>
        </div>

        {disegniLoading ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
          </div>
        ) : disegniCompletati.length === 0 ? (
          <div className="p-6 text-center border border-white/5 bg-petrolio">
            <FileText size={22} className="mx-auto text-nebbia/20 mb-2" />
            <p className="font-body text-sm text-nebbia/50">
              Nessun disegno analizzato: carica e analizza i disegni nel tab Disegni.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Semaforo conteggi */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['non_conforme', 'da_verificare', 'conforme', 'non_verificabile'].map(k => {
                const cfg = ESITO_CONFIG[k]
                const Icon = cfg.icon
                return (
                  <div key={k} className="bg-petrolio border border-white/5 p-3 flex items-center gap-3">
                    <Icon size={18} className={`${cfg.cls} shrink-0`} />
                    <div className="min-w-0">
                      <p className={`font-display text-2xl font-semibold ${cfg.cls}`}>{conteggi[k]}</p>
                      <p className="font-body text-[11px] text-nebbia/40 leading-tight">{cfg.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="font-body text-xs text-nebbia/40">
              {disegniCompletati.length} {disegniCompletati.length === 1 ? 'disegno analizzato' : 'disegni analizzati'}
              {' · '}{esitiPiatti.length} {esitiPiatti.length === 1 ? 'verifica' : 'verifiche'}
            </p>

            {/* Elenco punti da risolvere (non conformi + da verificare) */}
            {daRisolvere.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-display text-xs uppercase tracking-wider text-nebbia/40">
                  Punti da risolvere
                </h3>
                {daRisolvere.map((e, i) => {
                  const cfg = ESITO_CONFIG[e.esito] ?? ESITO_CONFIG.non_verificabile
                  const Icon = cfg.icon
                  return (
                    <div key={i} className="bg-petrolio border border-white/5 p-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon size={14} className={`${cfg.cls} shrink-0`} />
                        <span className={`font-body text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                        {e.riferimento && (
                          <span className="font-body text-xs text-nebbia/40">— {e.riferimento}</span>
                        )}
                        {e.nome_file && (
                          <span className="font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider border-white/10 text-nebbia/40 shrink-0 ml-auto">
                            {e.nome_file}
                          </span>
                        )}
                      </div>
                      {e.verifica && (
                        <p className="font-body text-sm text-nebbia/80">{e.verifica}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="font-body text-sm text-salvia flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                Nessun punto critico: tutte le verifiche risultano conformi o non applicabili.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
