// src/pages/cliente/Scadenze.jsx
//
// Portale cliente (studio fiduciario): scadenze del cliente in sola lettura.
// Il cliente vede le proprie scadenze via RLS
// (scadenze_fiduciarie.cliente_id = auth.uid()). Lo stato "scaduta"/"urgente" è
// calcolato lato client rispetto a oggi (stessa logica di BoxScadenzeMandato).

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared'
import { CalendarClock, AlertTriangle, Check, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

function giorniAllaScadenza(iso) {
    if (!iso) return null
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso); target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

export default function ClienteScadenze() {
    const { t, i18n } = useTranslation('cli_scadenze')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [scadenze, setScadenze] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('aperte')

    const fmtData = (iso) => !iso ? '—'
        : new Date(iso).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('scadenze_fiduciarie')
                .select('id, titolo, tipo, data_scadenza, stato, note, mandato:mandato_id(titolo)')
                .eq('cliente_id', user.id)
                .order('data_scadenza', { ascending: true })
            setScadenze(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const FILTRI = [
        { key: 'aperte', label: t('filtri.aperte') },
        { key: 'completate', label: t('filtri.completate') },
        { key: 'tutte', label: t('filtri.tutte') },
    ]

    const rows = scadenze.filter(s => {
        if (filtro === 'aperte') return s.stato !== 'completata'
        if (filtro === 'completate') return s.stato === 'completata'
        return true
    })

    const nAperte = scadenze.filter(s => s.stato !== 'completata').length
    const nScadute = scadenze.filter(s => {
        const gg = giorniAllaScadenza(s.data_scadenza)
        return s.stato !== 'completata' && gg !== null && gg < 0
    }).length

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.titolo')} />

            {/* Riepilogo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate border border-white/5 p-4">
                    <CalendarClock size={16} className="text-salvia mb-2" strokeWidth={1.5} />
                    <p className="font-display text-3xl font-semibold text-salvia mb-1">{nAperte}</p>
                    <p className="font-body text-xs text-nebbia/40">{t('riepilogo.da_completare')}</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <AlertTriangle size={16} className={`${nScadute > 0 ? 'text-red-400' : 'text-nebbia/30'} mb-2`} strokeWidth={1.5} />
                    <p className={`font-display text-3xl font-semibold ${nScadute > 0 ? 'text-red-400' : 'text-nebbia/30'} mb-1`}>{nScadute}</p>
                    <p className="font-body text-xs text-nebbia/40">{t('riepilogo.scadute')}</p>
                </div>
            </div>

            {/* Filtri */}
            <div className="flex gap-2">
                {FILTRI.map(({ key, label }) => (
                    <button key={key} onClick={() => setFiltro(key)}
                        className={`font-body text-sm px-4 py-2 border transition-colors ${filtro === key
                            ? 'bg-oro/10 border-oro/40 text-oro'
                            : 'bg-slate border-white/10 text-nebbia/50 hover:text-nebbia'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : rows.length === 0 ? (
                <div className="py-12 text-center">
                    <CalendarClock size={36} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/30">{t('vuoto')}</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {rows.map(s => {
                        const gg = giorniAllaScadenza(s.data_scadenza)
                        const completata = s.stato === 'completata'
                        const urgente = !completata && gg !== null && gg >= 0 && gg <= 7
                        const scaduta = !completata && gg !== null && gg < 0
                        return (
                            <div key={s.id}
                                className={`border p-4 ${completata ? 'bg-slate border-white/5'
                                    : scaduta ? 'bg-red-900/10 border-red-500/20'
                                        : urgente ? 'bg-amber-900/10 border-amber-500/20'
                                            : 'bg-slate border-white/5'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {s.tipo && (
                                                <span className="font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider bg-petrolio border-white/10 text-nebbia/50">
                                                    {s.tipo}
                                                </span>
                                            )}
                                            {s.mandato?.titolo && (
                                                <span className="font-body text-[11px] text-nebbia/35">{s.mandato.titolo}</span>
                                            )}
                                        </div>
                                        <p className={`font-body text-sm font-medium mt-1.5 ${completata ? 'text-nebbia/50 line-through' : 'text-nebbia'}`}>
                                            {s.titolo}
                                        </p>
                                        {s.note && <p className="font-body text-xs text-nebbia/40 mt-1">{s.note}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-body text-sm text-nebbia">{fmtData(s.data_scadenza)}</p>
                                        {completata ? (
                                            <span className="font-body text-xs text-oro flex items-center gap-1 justify-end mt-1">
                                                <Check size={12} /> {t('stato.completata')}
                                            </span>
                                        ) : gg !== null && (
                                            <span className={`font-body text-xs flex items-center gap-1 justify-end mt-1 ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/40'}`}>
                                                <Clock size={11} />
                                                {scaduta ? t('giorni.scaduta', { count: Math.abs(gg) }) : gg === 0 ? t('giorni.oggi') : t('giorni.tra', { count: gg })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
