// src/components/fiduciario/BudgetScostamenti.jsx
//
// Budget & scostamenti del conto economico. Il "budget" NON è un concetto a
// parte: sono i movimenti PREVISTI (espansi per ricorrenza nell'anno). Lo
// scostamento confronta, per categoria, l'EFFETTIVO con il PREVISTO.
//
// Categorie: testo libero reso coerente per raggruppamento (trim + lowercase),
// alimentato dall'autocompletamento del form.
//
// Props:
//   clienteId  (string)       - cliente-azienda (obbligatorio)
//   mandatoId  (string|null)  - movimenti del mandato; altrimenti del cliente
//   anno       (number|null)  - anno iniziale

import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Target, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtCHF } from '@/lib/calcoloSalari'
import { espandiPrevisto } from '@/lib/calcoloLiquidita'

export default function BudgetScostamenti({ clienteId, mandatoId = null, anno = null, refreshTrigger = 0 }) {
    const { t } = useTranslation('comp_fid_budget_scostamenti')
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(anno ?? annoCorr)
    const [movimenti, setMovimenti] = useState([])
    const [loading, setLoading] = useState(true)
    const [tabellaMancante, setTabellaMancante] = useState(false)

    useEffect(() => { carica() }, [clienteId, mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        let q = supabase.from('movimenti').select('*')
        q = mandatoId ? q.eq('mandato_id', mandatoId) : q.eq('cliente_id', clienteId)
        const { data, error } = await q
        if (error) {
            setTabellaMancante(error.code === '42P01' || /movimenti/i.test(error.message ?? ''))
            setMovimenti([])
        } else {
            setTabellaMancante(false)
            setMovimenti(data ?? [])
        }
        setLoading(false)
    }

    const daExcl = new Date(annoSel - 1, 11, 31)
    const annoEnd = new Date(annoSel, 11, 31)

    // Righe budget per tipo: { categoria, previsto, effettivo, scost }
    function righe(tipo) {
        const map = new Map()
        const get = (cat) => {
            const key = (cat ?? '').trim().toLowerCase() || '—'
            if (!map.has(key)) map.set(key, { categoria: (cat ?? '').trim() || t('categoria.senza_categoria'), previsto: 0, effettivo: 0 })
            return map.get(key)
        }
        for (const m of movimenti) {
            if (m.tipo !== tipo) continue
            const stato = m.stato ?? 'effettivo'
            if (stato === 'previsto') {
                const tot = espandiPrevisto(m, daExcl, annoEnd).reduce((t, o) => t + o.importo, 0)
                if (tot) get(m.categoria).previsto += tot
            } else if (new Date(m.data).getFullYear() === annoSel) {
                get(m.categoria).effettivo += (Number(m.importo) || 0)
            }
        }
        return [...map.values()]
            .map(r => ({ ...r, scost: r.effettivo - r.previsto }))
            .sort((a, b) => (b.previsto + b.effettivo) - (a.previsto + a.effettivo))
    }

    const righeEntrate = righe('entrata')
    const righeUscite = righe('uscita')
    const haPrevisti = [...righeEntrate, ...righeUscite].some(r => r.previsto > 0)

    // Anni disponibili
    const anniSet = new Set([annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2, annoSel])
    if (anno) anniSet.add(anno)
    movimenti.forEach(m => { if (m.data) anniSet.add(new Date(m.data).getFullYear()) })
    const anniDisponibili = [...anniSet].sort((a, b) => b - a)

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Target size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">{t('titolo')}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('anno')}</span>
                    <select value={annoSel} onChange={e => setAnnoSel(Number(e.target.value))}
                        className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                        {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {tabellaMancante && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-body p-3 bg-amber-900/10 border border-amber-500/20">
                    <AlertCircle size={14} className="shrink-0" />{' '}
                    <Trans i18nKey="tabella_mancante" t={t} components={{ code: <code className="font-mono" /> }} />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : !haPrevisti ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <Target size={26} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">{t('vuoto.titolo', { anno: annoSel })}</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1">
                        <Trans i18nKey="vuoto.descrizione" t={t} components={{ evid: <span className="text-nebbia/40" /> }} />
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-5">
                    {/* lg: affiancate (full width) · xl: impilate (mezza larghezza, evita 4 colonnine) */}
                    <SezioneBudget titolo={t('sezione.entrate')} tipo="entrata" righe={righeEntrate} />
                    <SezioneBudget titolo={t('sezione.uscite')} tipo="uscita" righe={righeUscite} />
                </div>
            )}
        </div>
    )
}

function scostClass(tipo, scost) {
    if (scost === 0) return 'text-nebbia/40'
    const buono = tipo === 'entrata' ? scost > 0 : scost < 0
    return buono ? 'text-salvia' : 'text-red-400'
}

function SezioneBudget({ titolo, tipo, righe }) {
    const { t } = useTranslation('comp_fid_budget_scostamenti')
    const eEntrata = tipo === 'entrata'
    const totPrev = righe.reduce((t, r) => t + r.previsto, 0)
    const totEff = righe.reduce((t, r) => t + r.effettivo, 0)
    const totScost = totEff - totPrev

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {eEntrata ? <TrendingUp size={14} className="text-salvia" /> : <TrendingDown size={14} className="text-oro" />}
                <p className="section-label !m-0">{titolo}</p>
            </div>

            {righe.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-6 text-center font-body text-xs text-nebbia/30">
                    {eEntrata ? t('sezione.vuoto_entrate') : t('sezione.vuoto_uscite')}
                </div>
            ) : (
                <div className="border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {t('colonne', { returnObjects: true }).map((h, i) => (
                                    <th key={h} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {righe.map((r, i) => {
                                const pct = r.previsto ? Math.round((r.scost / r.previsto) * 100) : null
                                return (
                                    <tr key={i} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2 font-body text-xs text-nebbia/70">{r.categoria}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia/50">{r.previsto ? fmtCHF(r.previsto) : '—'}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia">{r.effettivo ? fmtCHF(r.effettivo) : '—'}</td>
                                        <td className={`px-3 py-2 text-right font-body text-xs ${scostClass(tipo, r.scost)}`}>
                                            {r.scost === 0 ? '—' : `${r.scost > 0 ? '+' : '−'}${fmtCHF(Math.abs(r.scost))}`}
                                            {pct !== null && r.scost !== 0 && <span className="text-nebbia/25"> ({pct > 0 ? '+' : ''}{pct}%)</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-white/10 bg-petrolio/40">
                                <td className="px-3 py-2 font-body text-[11px] text-nebbia/50 uppercase tracking-widest">{t('totale')}</td>
                                <td className="px-3 py-2 text-right font-display text-sm text-nebbia/70">{fmtCHF(totPrev)}</td>
                                <td className="px-3 py-2 text-right font-display text-sm text-nebbia">{fmtCHF(totEff)}</td>
                                <td className={`px-3 py-2 text-right font-display text-sm ${scostClass(tipo, totScost)}`}>
                                    {totScost === 0 ? '—' : `${totScost > 0 ? '+' : '−'}${fmtCHF(Math.abs(totScost))}`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    )
}
