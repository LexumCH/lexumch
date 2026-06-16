// src/components/fiduciario/PianificazioneLiquidita.jsx
//
// Pianificazione della liquidità: dal saldo di cassa noto, proietta i prossimi
// 12 mesi fondendo movimenti previsti (espansi per ricorrenza) + movimenti
// effettivi futuri + salari proiettati. Mostra il saldo progressivo con un
// grafico divergente (sopra/sotto lo zero) e l'alert del primo mese in negativo.
//
// Il saldo iniziale vive in `saldi_cassa` (per cliente): si aggiorna nel tempo,
// la proiezione riparte sempre dall'ultimo saldo noto.
//
// Props:
//   clienteId  (string)       - cliente-azienda (obbligatorio)
//   mandatoId  (string|null)  - se presente, usa i movimenti del mandato;
//                               altrimenti tutti i movimenti del cliente

import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Wallet, AlertTriangle, Edit2, Check, X, Loader2, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtCHF } from '@/lib/calcoloSalari'
import { proiezioneLiquidita } from '@/lib/calcoloLiquidita'

const oggiISO = () => new Date().toISOString().slice(0, 10)
const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export default function PianificazioneLiquidita({ clienteId, mandatoId = null, refreshTrigger = 0 }) {
    const { t, i18n } = useTranslation('comp_fid_pianificazione_liquidita')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const MESI_ABBR = t('mesi_abbr', { returnObjects: true })
    const [saldo, setSaldo] = useState(null)        // { data, importo } | null
    const [movimenti, setMovimenti] = useState([])
    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [loading, setLoading] = useState(true)
    const [tabellaMancante, setTabellaMancante] = useState(false)
    const [errore, setErrore] = useState('')

    // Editor saldo
    const [editing, setEditing] = useState(false)
    const [importoEdit, setImportoEdit] = useState('')
    const [dataEdit, setDataEdit] = useState(oggiISO())
    const [salvando, setSalvando] = useState(false)

    useEffect(() => { carica() }, [clienteId, mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true); setErrore('')
        let qMov = supabase.from('movimenti').select('*')
        qMov = mandatoId ? qMov.eq('mandato_id', mandatoId) : qMov.eq('cliente_id', clienteId)

        const [{ data: sal, error: errSal }, { data: mov }, { data: dip }, { data: bon }] = await Promise.all([
            supabase.from('saldi_cassa').select('data, importo').eq('cliente_id', clienteId).order('data', { ascending: false }).limit(1),
            qMov,
            supabase.from('clienti_dipendenti').select('*').eq('cliente_id', clienteId),
            supabase.from('dipendenti_bonus').select('id, importo, data_bonus').eq('cliente_id', clienteId),
        ])

        setTabellaMancante(!!errSal && (errSal.code === '42P01' || /saldi_cassa/i.test(errSal.message ?? '')))
        setSaldo(sal && sal[0] ? sal[0] : null)
        setMovimenti(mov ?? [])
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setLoading(false)
    }

    function apriEditor() {
        setImportoEdit(saldo ? String(saldo.importo) : '')
        setDataEdit(saldo?.data ?? oggiISO())
        setErrore('')
        setEditing(true)
    }

    async function salvaSaldo() {
        const n = Number(String(importoEdit).replace(',', '.'))
        if (importoEdit === '' || isNaN(n)) { setErrore(t('errori.importo_non_valido')); return }
        if (!dataEdit) { setErrore(t('errori.data_mancante')); return }
        setSalvando(true); setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErrore(t('errori.sessione_scaduta')); setSalvando(false); return }
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const { error } = await supabase.from('saldi_cassa').insert({
            cliente_id: clienteId,
            data: dataEdit,
            importo: n,
            avvocato_id: user.id,
            studio_id: profilo?.studio_id ?? null,
            creato_da: user.id,
            aggiornato_da: user.id,
        })
        setSalvando(false)
        if (error) { setErrore(error.message); return }
        setEditing(false)
        carica()
    }

    // ─── Proiezione ───
    const dataAncora = saldo ? new Date(saldo.data) : new Date()
    const saldoAncora = saldo ? Number(saldo.importo) : 0
    const proj = proiezioneLiquidita({ saldoAncora, dataAncora, movimenti, dipendenti, bonus, mesi: 12 })
    const maxAbs = Math.max(1, ...proj.buckets.map(b => Math.abs(b.saldoFine)))

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-5">
            {/* Header + saldo iniziale */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Activity size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">{t('titolo')}</h2>
                    <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">{t('badge_12_mesi')}</span>
                </div>

                {/* Saldo iniziale: vista / editor */}
                {editing ? (
                    <div className="flex items-end gap-2 flex-wrap">
                        <div>
                            <label className="block font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{t('saldo_cassa_label')}</label>
                            <input value={importoEdit} onChange={e => setImportoEdit(e.target.value)} inputMode="decimal" placeholder="0.00" autoFocus
                                className="w-32 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50" />
                        </div>
                        <div>
                            <label className="block font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{t('alla_data')}</label>
                            <input type="date" value={dataEdit} onChange={e => setDataEdit(e.target.value)}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50" />
                        </div>
                        <button onClick={salvaSaldo} disabled={salvando}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {t('salva')}
                        </button>
                        <button onClick={() => setEditing(false)} disabled={salvando}
                            className="p-1.5 text-nebbia/40 hover:text-nebbia transition-colors"><X size={16} /></button>
                    </div>
                ) : (
                    <button onClick={apriEditor}
                        className="flex items-center gap-2 px-3 py-1.5 border border-white/10 hover:border-oro/30 transition-colors group">
                        <Wallet size={13} className="text-oro/60" />
                        <span className="font-body text-sm text-nebbia">
                            {saldo ? fmtCHF(saldo.importo) : t('imposta_saldo_cassa')}
                        </span>
                        {saldo && <span className="font-body text-[11px] text-nebbia/30">{t('al_data', { data: new Date(saldo.data).toLocaleDateString(dateLocale) })}</span>}
                        <Edit2 size={11} className="text-nebbia/30 group-hover:text-oro transition-colors" />
                    </button>
                )}
            </div>

            {tabellaMancante && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-body p-3 bg-amber-900/10 border border-amber-500/20">
                    <AlertTriangle size={14} className="shrink-0" />
                    <Trans t={t} i18nKey="tabella_mancante" components={{ code: <code className="font-mono" /> }} />
                </div>
            )}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertTriangle size={14} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : !saldo ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <Wallet size={28} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">{t('vuoto.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1">{t('vuoto.descrizione')}</p>
                </div>
            ) : (
                <>
                    {/* KPI */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('kpi.saldo_oggi')}</p>
                            <p className="font-display text-xl text-nebbia">{fmtCHF(proj.saldoIniziale)}</p>
                        </div>
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('kpi.saldo_fra_12_mesi')}</p>
                            <p className={`font-display text-xl ${proj.saldoFinale >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(proj.saldoFinale)}</p>
                        </div>
                        <div className={`bg-slate border p-4 ${proj.saldoMin < 0 ? 'border-red-500/40' : 'border-white/10'}`}>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('kpi.punto_minimo')}</p>
                            <p className={`font-display text-xl ${proj.saldoMin < 0 ? 'text-red-400' : 'text-nebbia'}`}>{fmtCHF(proj.saldoMin)}</p>
                            {proj.minBucket && (
                                <p className="font-body text-[10px] text-nebbia/25 mt-0.5 capitalize">{MESI_ABBR[proj.minBucket.mese]} {proj.minBucket.anno}</p>
                            )}
                        </div>
                    </div>

                    {/* Alert sotto zero */}
                    {proj.primaSottoZero && (
                        <div className="flex items-start gap-2 text-red-400 text-sm font-body p-3 bg-red-900/10 border border-red-500/25">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            <span>
                                <Trans
                                    t={t}
                                    i18nKey="alert_sotto_zero"
                                    values={{ mese: MESI_ABBR[proj.primaSottoZero.mese], anno: proj.primaSottoZero.anno, importo: fmtCHF(proj.primaSottoZero.saldoFine) }}
                                    components={{ evid: <span className="font-medium capitalize" /> }}
                                />
                            </span>
                        </div>
                    )}

                    {/* Grafico divergente */}
                    <div>
                        <div className="flex items-stretch gap-1 h-32">
                            {proj.buckets.map((b, i) => {
                                const h = Math.round(Math.abs(b.saldoFine) / maxAbs * 56)
                                const pos = b.saldoFine >= 0
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center"
                                        title={t('grafico_title', { mese: MESI_ABBR[b.mese], anno: b.anno, saldo: fmtCHF(b.saldoFine), netto: fmtCHF(b.netto) })}>
                                        <div className="flex-1 w-full flex items-end justify-center">
                                            {pos && <div className="w-3/5 bg-salvia/50 hover:bg-salvia/80 transition-colors" style={{ height: `${h}px` }} />}
                                        </div>
                                        <div className="w-full border-t border-white/15" />
                                        <div className="flex-1 w-full flex items-start justify-center">
                                            {!pos && <div className="w-3/5 bg-red-500/50 hover:bg-red-500/80 transition-colors" style={{ height: `${h}px` }} />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex gap-1 mt-1">
                            {proj.buckets.map((b, i) => (
                                <div key={i} className="flex-1 text-center font-body text-[9px] text-nebbia/30 capitalize">{MESI_ABBR[b.mese]}</div>
                            ))}
                        </div>
                    </div>

                    {/* Dettaglio mensile */}
                    <div className="max-h-56 overflow-y-auto border border-white/5">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-slate">
                                <tr className="border-b border-white/5">
                                    {t('colonne', { returnObjects: true }).map(h => (
                                        <th key={h} className="px-3 py-2 text-right first:text-left font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {proj.buckets.map((b, i) => (
                                    <tr key={i} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2 font-body text-xs text-nebbia/70 capitalize">{MESI_ABBR[b.mese]} {b.anno}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-salvia/80">{b.entrate ? fmtCHF(b.entrate) : '—'}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-oro/70">{b.uscite ? fmtCHF(b.uscite) : '—'}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-oro/70">{b.salari ? fmtCHF(b.salari) : '—'}</td>
                                        <td className={`px-3 py-2 text-right font-body text-xs ${b.netto >= 0 ? 'text-nebbia/60' : 'text-red-400/80'}`}>{fmtCHF(b.netto)}</td>
                                        <td className={`px-3 py-2 text-right font-display text-sm ${b.saldoFine >= 0 ? 'text-nebbia' : 'text-red-400'}`}>{fmtCHF(b.saldoFine)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="font-body text-[11px] text-nebbia/25">
                        {t('nota')}
                    </p>
                </>
            )}
        </div>
    )
}
