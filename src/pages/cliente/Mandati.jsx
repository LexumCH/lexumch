// src/pages/cliente/Mandati.jsx
//
// Portale cliente (studio fiduciario): elenco read-only dei mandati del cliente.
// Speculare a Pratiche.jsx (studio legale). Il cliente legge solo i propri
// mandati via RLS (mandati.cliente_id = auth.uid()).

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, Badge } from '@/components/shared'
import { Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATO_VARIANT = {
    attivo: 'salvia',
    sospeso: 'warning',
    concluso: 'gray',
    archiviato: 'gray',
}

export default function ClienteMandati() {
    const { t, i18n } = useTranslation('cli_mandati')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [mandati, setMandati] = useState([])
    const [loading, setLoading] = useState(true)
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('mandati')
                .select('id, titolo, tipo, stato, anno_riferimento, note, created_at, professionista:avvocato_id(nome, cognome)')
                .eq('cliente_id', user.id)
                .order('created_at', { ascending: false })
            setMandati(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = mandati.filter(m => !statoF || m.stato === statoF)

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.titolo')} />

            <div className="flex gap-3">
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">{t('filtri.tutti')}</option>
                    <option value="attivo">{t('stati.attivo')}</option>
                    <option value="sospeso">{t('stati.sospeso')}</option>
                    <option value="concluso">{t('stati.concluso')}</option>
                    <option value="archiviato">{t('stati.archiviato')}</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <Briefcase size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">{t('vuoto.nessun_mandato')}</p>
                        </div>
                    ) : rows.map(m => {
                        const variant = STATO_VARIANT[m.stato] ?? STATO_VARIANT.attivo
                        const statoLabel = t(`stati.${m.stato}`, { defaultValue: t('stati.attivo') })
                        return (
                            <div key={m.id} className="bg-slate border border-white/5 p-5 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-display text-xl font-semibold text-nebbia">{m.titolo}</h3>
                                        <p className="font-body text-xs text-nebbia/40 mt-1">
                                            {m.tipo ?? '—'}
                                            {m.professionista ? ` · ${m.professionista.nome} ${m.professionista.cognome}` : ''}
                                        </p>
                                    </div>
                                    <Badge label={statoLabel} variant={variant} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.anno_riferimento')}</p>
                                        <p className="font-body text-sm text-nebbia">{m.anno_riferimento ?? '—'}</p>
                                    </div>
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.aperto_il')}</p>
                                        <p className="font-body text-sm text-nebbia">{new Date(m.created_at).toLocaleDateString(dateLocale)}</p>
                                    </div>
                                </div>

                                {m.note && (
                                    <div className="border-t border-white/5 pt-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.note')}</p>
                                        <p className="font-body text-sm text-nebbia/60">{m.note}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
