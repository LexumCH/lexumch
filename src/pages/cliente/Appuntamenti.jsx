// src/pages/cliente/Appuntamenti.jsx

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, Badge } from '@/components/shared'
import { Calendar, Clock, Video, Phone, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATO_VARIANT = {
    programmato: 'salvia',
    concluso: 'gray',
    annullato: 'red',
}

const TIPO_ICON = {
    presenza: MapPin,
    videocall: Video,
    telefonico: Phone,
    udienza: Calendar,
}

export default function ClienteAppuntamenti() {
    const { t, i18n } = useTranslation('cli_appuntamenti')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [appuntamenti, setAppuntamenti] = useState([])
    const [loading, setLoading] = useState(true)
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('appuntamenti')
                .select('id, titolo, tipo, stato, data_ora_inizio, data_ora_fine, note_cliente, link_videocall, avvocato:avvocato_id(nome, cognome)')
                .eq('cliente_id', user.id)
                .order('data_ora_inizio', { ascending: false })
            setAppuntamenti(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = appuntamenti.filter(a => !statoF || a.stato === statoF)

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.titolo')} />

            <div className="flex gap-3">
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">{t('filtri.tutti')}</option>
                    <option value="programmato">{t('filtri.programmati')}</option>
                    <option value="concluso">{t('filtri.conclusi')}</option>
                    <option value="annullato">{t('filtri.annullati')}</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <Calendar size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">{t('vuoto.nessun_appuntamento')}</p>
                        </div>
                    ) : rows.map(a => {
                        const variant = STATO_VARIANT[a.stato] ?? STATO_VARIANT.programmato
                        const statoLabel = t(`stati.${a.stato}`, { defaultValue: t('stati.programmato') })
                        const tipoLabel = t(`tipi.${a.tipo}`, { defaultValue: a.tipo })
                        const Icon = TIPO_ICON[a.tipo] ?? Calendar
                        const inizio = new Date(a.data_ora_inizio)
                        const fine = a.data_ora_fine ? new Date(a.data_ora_fine) : null
                        return (
                            <div key={a.id} className="bg-slate border border-white/5 p-5">
                                <div className="flex items-start gap-4">
                                    <div className="bg-oro/10 border border-oro/20 p-3 text-center min-w-14 shrink-0">
                                        <p className="font-display text-2xl font-semibold text-oro leading-none">{inizio.getDate()}</p>
                                        <p className="font-body text-[10px] text-oro/60 uppercase">
                                            {inizio.toLocaleString(dateLocale, { month: 'short' })}
                                        </p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-body text-sm font-medium text-nebbia">{a.titolo}</h3>
                                            <Badge label={statoLabel} variant={variant} />
                                        </div>
                                        {a.avvocato && (
                                            <p className="font-body text-xs text-nebbia/40 mt-1">{t('scheda.avvocato_prefisso')} {a.avvocato.nome} {a.avvocato.cognome}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={11} className="text-nebbia/30" />
                                                <span className="font-body text-xs text-nebbia/50">
                                                    {inizio.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                                                    {fine ? ` - ${fine.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Icon size={11} className="text-nebbia/30" />
                                                <span className="font-body text-xs text-nebbia/50 capitalize">{tipoLabel}</span>
                                            </div>
                                        </div>
                                        {a.note_cliente && (
                                            <div className="mt-3 bg-petrolio/40 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.note')}</p>
                                                <p className="font-body text-xs text-nebbia/60">{a.note_cliente}</p>
                                            </div>
                                        )}
                                        {a.link_videocall && a.stato === 'programmato' && (
                                            <a href={a.link_videocall} target="_blank" rel="noreferrer"
                                                className="mt-2 inline-flex items-center gap-1.5 font-body text-xs text-oro hover:text-oro/70">
                                                <Video size={12} /> {t('scheda.entra_videocall')}
                                            </a>
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
