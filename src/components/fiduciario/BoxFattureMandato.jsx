// src/components/fiduciario/BoxFattureMandato.jsx
//
// Box "Fatture" del dettaglio mandato (04-10-2026): le fatture collegate al
// mandato (fatture.mandato_id), con fatturato e da incassare. "Nuova fattura"
// apre il modulo gia' collegato a cliente e mandato.
//
// Props:
//   mandatoId  (string)  - mandato di cui mostrare le fatture
//   clienteId  (string)  - cliente del mandato (senza cliente non si fattura)

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Receipt, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/shared'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
const VARIANTE_STATO = { pagata: 'salvia', in_attesa: 'warning', scaduta: 'red', annullata: 'gray' }

function fmtCHF(n) {
    return Number(n ?? 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BoxFattureMandato({ mandatoId, clienteId }) {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation('comp_fid_box_fatture')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [fatture, setFatture] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let attivo = true
        setLoading(true)
        supabase
            .from('fatture')
            .select('id, numero, data_emissione, data_scadenza, totale, valuta, stato')
            .eq('mandato_id', mandatoId)
            .order('data_emissione', { ascending: false })
            .then(({ data }) => {
                if (!attivo) return
                setFatture(data ?? [])
                setLoading(false)
            })
        return () => { attivo = false }
    }, [mandatoId])

    const oggi = new Date().toISOString().slice(0, 10)
    const statoEffettivo = f => (f.stato === 'in_attesa' && f.data_scadenza && f.data_scadenza < oggi) ? 'scaduta' : f.stato
    const valide = fatture.filter(f => f.stato !== 'annullata')
    const fatturato = valide.reduce((s, f) => s + Number(f.totale ?? 0), 0)
    const daIncassare = valide.filter(f => f.stato !== 'pagata').reduce((s, f) => s + Number(f.totale ?? 0), 0)

    return (
        <div className="bg-slate border border-white/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-oro/60" />
                    <p className="section-label !m-0">{t('header.titolo', { count: fatture.length })}</p>
                </div>
                {clienteId ? (
                    <button
                        onClick={() => navigate(`/fatturazione/nuova?cliente_id=${clienteId}&mandato_id=${mandatoId}`)}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                    >
                        <Plus size={11} /> {t('header.nuova')}
                    </button>
                ) : (
                    <p className="font-body text-xs text-nebbia/30 italic">{t('senza_cliente')}</p>
                )}
            </div>

            {valide.length > 0 && (
                <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5">
                    <div className="bg-slate px-4 py-3">
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('riepilogo.fatturato')}</p>
                        <p className="font-body text-sm text-nebbia mt-0.5">CHF {fmtCHF(fatturato)}</p>
                    </div>
                    <div className="bg-slate px-4 py-3">
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('riepilogo.da_incassare')}</p>
                        <p className={`font-body text-sm mt-0.5 ${daIncassare > 0 ? 'text-amber-400' : 'text-salvia'}`}>CHF {fmtCHF(daIncassare)}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : fatture.length === 0 ? (
                <div className="py-8 text-center px-4">
                    <Receipt size={20} className="text-nebbia/20 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/30">{t('vuoto.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/20 mt-1">{t('vuoto.suggerimento')}</p>
                </div>
            ) : (
                <div>
                    {fatture.map(f => {
                        const stato = statoEffettivo(f)
                        return (
                            <Link key={f.id} to={`/fatturazione/${f.id}`}
                                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-petrolio/40 transition-colors">
                                <div className="min-w-0">
                                    <p className="font-body text-sm text-nebbia truncate">{f.numero}</p>
                                    <p className="font-body text-xs text-nebbia/40">
                                        {f.data_emissione ? new Date(f.data_emissione).toLocaleDateString(dateLocale) : '—'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-body text-sm text-oro whitespace-nowrap">{f.valuta ?? 'CHF'} {fmtCHF(f.totale)}</span>
                                    <Badge label={t(`stati.${stato}`)} variant={VARIANTE_STATO[stato] ?? 'gray'} />
                                    <ChevronRight size={13} className="text-nebbia/20" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
