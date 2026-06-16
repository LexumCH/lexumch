import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, Video, Phone, MapPin, ArrowRight } from 'lucide-react'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// ── TIPO ICONS & LABEL KEYS ──────────────────────────────────
// icone/valori enum DB invariati; solo la label è tradotta via i18n
const TIPO_CONFIG = {
  presenza:   { icon: MapPin, labelKey: 'tipo.presenza'   },
  videocall:  { icon: Video,  labelKey: 'tipo.videocall'  },
  telefonico: { icon: Phone,  labelKey: 'tipo.telefonico' },
}

// ── QUERY ────────────────────────────────────────────────────
async function fetchProssimoAppuntamento(clienteId) {
  const { data, error } = await supabase
    .from('appuntamenti')
    .select(`
      id, tipo, stato, data_ora_inizio, data_ora_fine,
      note_cliente, link_videocall,
      avvocato:avvocato_id ( raw_user_meta_data )
    `)
    .eq('cliente_id', clienteId)
    .eq('stato', 'confermato')
    .gt('data_ora_inizio', new Date().toISOString())
    .order('data_ora_inizio', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── HELPERS ──────────────────────────────────────────────────
function fmtDataCompleta(iso, dateLocale) {
  return new Date(iso).toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtOra(iso, dateLocale) {
  return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
}

function giorniMancanti(iso, t) {
  const diff = new Date(iso) - new Date()
  const giorni = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (giorni === 0) return t('countdown.oggi')
  if (giorni === 1) return t('countdown.domani')
  return t('countdown.tra_giorni', { count: giorni })
}

// ── COMPONENT ────────────────────────────────────────────────
/**
 * ProssimoAppuntamento
 * Usato nella Tab "Panoramica" della scheda cliente.
 * Riceve clienteId come prop.
 *
 * Variante "portale": per il portale cliente (/portale)
 * Variante "scheda":  per /clienti/:id (vista avvocato)
 */
export default function ProssimoAppuntamento({ clienteId, variante = 'scheda' }) {
  const { t, i18n } = useTranslation('comp_prossimo_appuntamento')
  const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['prossimo-app', clienteId],
    queryFn:  () => fetchProssimoAppuntamento(clienteId),
    enabled:  !!clienteId,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="bg-slate border border-white/5 p-5 animate-pulse">
        <div className="h-3 w-32 bg-white/5 mb-3" />
        <div className="h-5 w-56 bg-white/5 mb-2" />
        <div className="h-3 w-24 bg-white/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-slate border border-red-500/20 p-5">
        <p className="font-body text-xs text-red-400">{t('errori.caricamento')}</p>
      </div>
    )
  }

  // Nessun appuntamento futuro
  if (!app) {
    return (
      <div className="bg-slate border border-white/5 p-5 flex items-center gap-4">
        <div className="w-10 h-10 border border-white/8 flex items-center justify-center shrink-0">
          <Calendar size={18} className="text-nebbia/20" />
        </div>
        <div>
          <p className="font-body text-xs text-nebbia/30 tracking-widest uppercase mb-1">{t('label.prossimo_appuntamento')}</p>
          <p className="font-body text-sm text-nebbia/40 italic">{t('vuoto.nessuno')}</p>
        </div>
      </div>
    )
  }

  const tipoConf = TIPO_CONFIG[app.tipo] || TIPO_CONFIG.presenza
  const TipoIcon = tipoConf.icon
  const avvNome  = app.avvocato?.raw_user_meta_data
    ? `${app.avvocato.raw_user_meta_data.nome || ''} ${app.avvocato.raw_user_meta_data.cognome || ''}`.trim()
    : null
  const gg = giorniMancanti(app.data_ora_inizio, t)
  const isOggi = gg === t('countdown.oggi')
  const isDomani = gg === t('countdown.domani')

  return (
    <div className={`border p-5 ${isOggi ? 'bg-oro/5 border-oro/30' : 'bg-slate border-white/5'}`}>
      {/* Label + badge countdown */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">{t('label.prossimo_appuntamento')}</p>
        <span className={`font-body text-xs px-2.5 py-1 border ${
          isOggi
            ? 'bg-oro/15 text-oro border-oro/30'
            : isDomani
              ? 'bg-salvia/15 text-salvia border-salvia/30'
              : 'bg-slate text-nebbia/40 border-white/10'
        }`}>
          {gg}
        </span>
      </div>

      {/* Data e ora */}
      <div className="flex items-start gap-4 mb-3">
        {/* Icona giorno */}
        <div className={`shrink-0 w-12 h-12 flex flex-col items-center justify-center border ${isOggi ? 'border-oro/40 bg-oro/10' : 'border-white/10 bg-petrolio'}`}>
          <span className={`font-display text-xl font-semibold leading-none ${isOggi ? 'text-oro' : 'text-nebbia'}`}>
            {new Date(app.data_ora_inizio).getDate()}
          </span>
          <span className="font-body text-[9px] text-nebbia/30 uppercase tracking-widest">
            {new Date(app.data_ora_inizio).toLocaleString(dateLocale, { month: 'short' })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-medium text-nebbia capitalize">
            {fmtDataCompleta(app.data_ora_inizio, dateLocale)}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 text-nebbia/50">
              <Clock size={12} />
              <span className="font-body text-xs">
                {fmtOra(app.data_ora_inizio, dateLocale)} – {fmtOra(app.data_ora_fine, dateLocale)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-nebbia/50">
              <TipoIcon size={12} />
              <span className="font-body text-xs">{t(tipoConf.labelKey)}</span>
            </div>
          </div>
          {avvNome && variante === 'portale' && (
            <p className="font-body text-xs text-nebbia/40 mt-1">
              {t('con_avvocato', { nome: avvNome })}
            </p>
          )}
        </div>
      </div>

      {/* Note visibili al cliente */}
      {app.note_cliente && (
        <div className="bg-petrolio/60 border border-white/5 p-3 mb-3">
          <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('note.titolo')}</p>
          <p className="font-body text-xs text-nebbia/60 leading-relaxed">{app.note_cliente}</p>
        </div>
      )}

      {/* Link videocall (solo se tipo videocall) */}
      {app.tipo === 'videocall' && app.link_videocall && (
        <a
          href={app.link_videocall}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-body text-xs text-salvia hover:text-salvia/70 transition-colors border border-salvia/25 px-3 py-2 hover:bg-salvia/5"
        >
          <Video size={13} />
          {t('azioni.apri_videocall')}
          <ArrowRight size={11} />
        </a>
      )}
    </div>
  )
}
