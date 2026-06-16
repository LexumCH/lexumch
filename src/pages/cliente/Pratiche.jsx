// src/pages/cliente/Pratiche.jsx

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, Badge } from '@/components/shared'
import { FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATO_VARIANT = {
    in_corso: 'salvia',
    in_udienza: 'red',
    in_attesa: 'warning',
    chiusa: 'gray',
}

export default function ClientePratiche() {
    const { t, i18n } = useTranslation('cli_pratiche')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(true)
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, created_at, prossima_udienza, note, avvocato:avvocato_id(nome, cognome)')
                .eq('cliente_id', user.id)
                .order('created_at', { ascending: false })
            setPratiche(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = pratiche.filter(p => !statoF || p.stato === statoF)

    return (
        <div className="space-y-5">
            <PageHeader label={t('header.label')} title={t('header.titolo')} />

            <div className="flex gap-3">
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">{t('filtri.tutti')}</option>
                    <option value="in_corso">{t('stati.in_corso')}</option>
                    <option value="in_udienza">{t('stati.in_udienza')}</option>
                    <option value="in_attesa">{t('stati.in_attesa')}</option>
                    <option value="chiusa">{t('stati.chiusa')}</option>
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
                            <FileText size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">{t('vuoto.nessuna_pratica')}</p>
                        </div>
                    ) : rows.map(p => {
                        const variant = STATO_VARIANT[p.stato] ?? STATO_VARIANT.in_corso
                        const statoLabel = t(`stati.${p.stato}`, { defaultValue: t('stati.in_corso') })
                        return (
                            <div key={p.id} className="bg-slate border border-white/5 p-5 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-display text-xl font-semibold text-nebbia">{p.titolo}</h3>
                                        <p className="font-body text-xs text-nebbia/40 mt-1">
                                            {p.tipo ?? '—'}
                                            {p.avvocato ? ` · ${t('scheda.avvocato_prefisso')} ${p.avvocato.nome} ${p.avvocato.cognome}` : ''}
                                        </p>
                                    </div>
                                    <Badge label={statoLabel} variant={variant} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.aperta_il')}</p>
                                        <p className="font-body text-sm text-nebbia">{new Date(p.created_at).toLocaleDateString(dateLocale)}</p>
                                    </div>
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.prossima_udienza')}</p>
                                        <p className="font-body text-sm text-nebbia">
                                            {p.prossima_udienza ? new Date(p.prossima_udienza).toLocaleDateString(dateLocale) : '—'}
                                        </p>
                                    </div>
                                </div>

                                {p.note && (
                                    <div className="border-t border-white/5 pt-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('scheda.note')}</p>
                                        <p className="font-body text-sm text-nebbia/60">{p.note}</p>
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
