// src/components/fiduciario/ReportContabili.jsx
//
// Partita doppia — Fase B: report dai saldi dei conti.
//   - Conto economico (flussi dell'anno): Ricavi (cl.3) − Costi (cl.4–8) = Risultato
//   - Bilancio (cumulativo a fine anno): Attivo (cl.1) vs Passivo (cl.2) + Risultato
//   - Bilancio di verifica (trial balance): ogni conto con dare/avere/saldo
//
// Saldo "naturale": attivo/costo = dare − avere; passivo/ricavo = avere − dare.
// Identità: Totale Attivo = Totale Passivo + Risultato (cumulato). Mostra la quadratura.
//
// Props: clienteId (string)

import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { FileBarChart, AlertCircle, Check, AlertTriangle, Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtCHF } from '@/lib/calcoloSalari'
import { NOME_CLASSE } from '@/lib/pianoContiKMU'

export default function ReportContabili({ clienteId, conti = [] }) {
    const { t } = useTranslation('comp_fid_report_contabili')
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(annoCorr)
    const [sub, setSub] = useState('ce')   // 'ce' | 'bilancio' | 'iva' | 'verifica'
    const [righe, setRighe] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [chiusura, setChiusura] = useState(false)
    const [chiudendo, setChiudendo] = useState(false)
    const [esitoChiusura, setEsitoChiusura] = useState('')

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const { data, error } = await supabase.from('registrazioni')
            .select('data, tipo, righe:righe_registrazione(dare, avere, conto:conto_id(id, numero, nome, classe, tipo))')
            .eq('cliente_id', clienteId)
            .order('data', { ascending: true })
        if (error) { setErrore(error.message); setRighe([]); setLoading(false); return }
        const flat = []
        for (const r of (data ?? [])) for (const rg of (r.righe ?? [])) {
            if (rg.conto) flat.push({ data: r.data, tipo: r.tipo, dare: Number(rg.dare) || 0, avere: Number(rg.avere) || 0, c: rg.conto })
        }
        setRighe(flat); setLoading(false)
    }

    const endYear = new Date(annoSel, 11, 31)
    const inYear = (r) => new Date(r.data).getFullYear() === annoSel
    const inYearCE = (r) => r.tipo !== 'chiusura' && new Date(r.data).getFullYear() === annoSel  // CE esclude la chiusura
    const upTo = (r) => new Date(r.data) <= endYear

    function aggrega(pred) {
        const map = new Map()
        for (const r of righe) {
            if (!pred(r)) continue
            if (!map.has(r.c.id)) map.set(r.c.id, { c: r.c, dare: 0, avere: 0 })
            const a = map.get(r.c.id); a.dare += r.dare; a.avere += r.avere
        }
        return [...map.values()].sort((x, y) => String(x.c.numero).localeCompare(String(y.c.numero)))
    }
    const sAtt = (a) => a.dare - a.avere      // attivo/costo
    const sPas = (a) => a.avere - a.dare      // passivo/ricavo

    const anniSet = new Set([annoCorr, annoCorr - 1, annoSel])
    righe.forEach(r => anniSet.add(new Date(r.data).getFullYear()))
    const anni = [...anniSet].sort((a, b) => b - a)

    // ─── Dati per vista ───
    // CE: flussi dell'anno (esclusa la registrazione di chiusura)
    const ceAgg = aggrega(inYearCE)
    const ricavi = ceAgg.filter(a => a.c.classe === 3).map(a => ({ ...a, val: sPas(a) }))
    const costi = ceAgg.filter(a => a.c.classe >= 4 && a.c.classe <= 8).map(a => ({ ...a, val: sAtt(a) }))
    const totRicavi = ricavi.reduce((t, a) => t + a.val, 0)
    const totCosti = costi.reduce((t, a) => t + a.val, 0)
    const risultato = totRicavi - totCosti

    // Bilancio: cumulativo a fine anno
    const balAgg = aggrega(upTo)
    const attivo = balAgg.filter(a => a.c.classe === 1).map(a => ({ ...a, val: sAtt(a) }))
    const passivo = balAgg.filter(a => a.c.classe === 2).map(a => ({ ...a, val: sPas(a) }))
    const totAttivo = attivo.reduce((t, a) => t + a.val, 0)
    const totPassivo = passivo.reduce((t, a) => t + a.val, 0)
    const ricCum = balAgg.filter(a => a.c.classe === 3).reduce((t, a) => t + sPas(a), 0)
    const costiCum = balAgg.filter(a => a.c.classe >= 4 && a.c.classe <= 8).reduce((t, a) => t + sAtt(a), 0)
    const risultatoCum = ricCum - costiCum
    const sbil = Math.round((totAttivo - (totPassivo + risultatoCum)) * 100) / 100
    const quadra = sbil === 0

    // Verifica: cumulativo
    const verAgg = balAgg
    const totVerDare = verAgg.reduce((t, a) => t + a.dare, 0)
    const totVerAvere = verAgg.reduce((t, a) => t + a.avere, 0)
    const verQuadra = Math.round((totVerDare - totVerAvere) * 100) / 100 === 0

    // ─── Rendiconto IVA ───
    const ivaRows = righe.filter(r => r.c.numero === '2200' || r.c.numero === '1170')
    const ivaPeriodo = (pred) => {
        let dovuta = 0, precedente = 0
        for (const r of ivaRows) {
            if (!pred(r)) continue
            if (r.c.numero === '2200') dovuta += r.avere - r.dare
            else precedente += r.dare - r.avere
        }
        return { dovuta: Math.round(dovuta * 100) / 100, precedente: Math.round(precedente * 100) / 100, saldo: Math.round((dovuta - precedente) * 100) / 100 }
    }
    const ivaAnno = ivaPeriodo(inYear)
    const trimestri = [0, 1, 2, 3].map(q => {
        const s = new Date(annoSel, q * 3, 1), e = new Date(annoSel, q * 3 + 3, 0)
        return { q: q + 1, ...ivaPeriodo(r => { const d = new Date(r.data); return d >= s && d <= e }) }
    })

    // ─── Chiusura d'esercizio: azzera i conti economici, risultato → 2979 ───
    async function chiudiEsercizio() {
        setChiudendo(true); setEsitoChiusura(''); setErrore('')
        const id2979 = conti.find(c => c.numero === '2979')?.id
        if (!id2979) { setErrore(t('chiusura.errori.conto2979_assente')); setChiudendo(false); return }
        const { data: gia } = await supabase.from('registrazioni').select('id')
            .eq('cliente_id', clienteId).eq('tipo', 'chiusura')
            .gte('data', `${annoSel}-01-01`).lte('data', `${annoSel}-12-31`).limit(1)
        if (gia && gia.length) { setErrore(t('chiusura.errori.gia_chiuso', { anno: annoSel })); setChiudendo(false); setChiusura(false); return }

        const pl = balAgg.filter(a => a.c.classe >= 3 && a.c.classe <= 8)
        const rows = []
        let result = 0
        for (const a of pl) {
            const raw = Math.round((a.dare - a.avere) * 100) / 100
            if (Math.abs(raw) < 0.005) continue
            if (raw > 0) rows.push({ conto_id: a.c.id, dare: 0, avere: raw })
            else rows.push({ conto_id: a.c.id, dare: -raw, avere: 0 })
            result += -raw
        }
        result = Math.round(result * 100) / 100
        if (rows.length === 0) { setErrore(t('chiusura.errori.nessun_conto', { anno: annoSel })); setChiudendo(false); setChiusura(false); return }
        if (result > 0) rows.push({ conto_id: id2979, dare: 0, avere: result })
        else if (result < 0) rows.push({ conto_id: id2979, dare: -result, avere: 0 })

        const { data: { user } } = await supabase.auth.getUser()
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const { data: reg, error: e1 } = await supabase.from('registrazioni').insert({
            cliente_id: clienteId, data: `${annoSel}-12-31`, descrizione: t('chiusura.descrizione_registrazione', { anno: annoSel }), tipo: 'chiusura',
            avvocato_id: user.id, studio_id: profilo?.studio_id ?? null, creato_da: user.id, aggiornato_da: user.id,
        }).select('id').single()
        if (e1) { setErrore(e1.message); setChiudendo(false); return }
        const payload = rows.map((r, i) => ({ registrazione_id: reg.id, conto_id: r.conto_id, dare: r.dare, avere: r.avere, ordine: i }))
        const { error: e2 } = await supabase.from('righe_registrazione').insert(payload)
        setChiudendo(false); setChiusura(false)
        if (e2) { await supabase.from('registrazioni').delete().eq('id', reg.id); setErrore(e2.message); return }
        setEsitoChiusura(t('chiusura.esito_chiuso', { anno: annoSel, tipo: result >= 0 ? t('chiusura.utile') : t('chiusura.perdita'), importo: fmtCHF(Math.abs(result)) }))
        carica()
    }

    const haDati = righe.length > 0

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex border border-white/10">
                    {[['ce', t('tab.ce')], ['bilancio', t('tab.bilancio')], ['iva', t('tab.iva')], ['verifica', t('tab.verifica')]].map(([v, l]) => (
                        <button key={v} onClick={() => setSub(v)}
                            className={`px-3 py-1.5 font-body text-xs transition-colors ${sub === v ? 'bg-oro/15 text-oro' : 'text-nebbia/40 hover:text-nebbia/70'}`}>{l}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('anno')}</span>
                    <select value={annoSel} onChange={e => setAnnoSel(Number(e.target.value))}
                        className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                        {anni.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : !haDati ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center">
                    <FileBarChart size={26} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">{t('vuoto')}</p>
                </div>
            ) : sub === 'ce' ? (
                <div className="bg-slate border border-white/5">
                    <SezioneConti titolo={t('ce.ricavi')} righe={ricavi} totale={totRicavi} />
                    <SezioneConti titolo={t('ce.costi')} righe={costi} totale={totCosti} raggruppaClasse />
                    <div className="flex items-center justify-between px-4 py-3 border-t-2 border-white/15">
                        <span className="font-display text-sm text-nebbia">{t('ce.risultato', { anno: annoSel })}</span>
                        <span className={`font-display text-lg ${risultato >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(risultato)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/5 flex-wrap">
                        <span className="font-body text-[11px] text-nebbia/30">{t('ce.nota_chiusura')}</span>
                        <button onClick={() => { setErrore(''); setChiusura(true) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-oro transition-colors">
                            <Lock size={12} /> {t('ce.chiudi_esercizio', { anno: annoSel })}
                        </button>
                    </div>
                    {esitoChiusura && <div className="px-4 pb-3"><span className="font-body text-xs text-salvia flex items-center gap-1.5"><Check size={13} /> {esitoChiusura}</span></div>}
                </div>
            ) : sub === 'bilancio' ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-slate border border-white/5">
                            <SezioneConti titolo={t('bilancio.attivo')} righe={attivo} totale={totAttivo} />
                        </div>
                        <div className="bg-slate border border-white/5">
                            <SezioneConti titolo={t('bilancio.passivo')} righe={passivo} totale={totPassivo} />
                            <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                                <span className="font-body text-sm text-nebbia/70">{t('bilancio.risultato_cumulato')}</span>
                                <span className={`font-body text-sm ${risultatoCum >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(risultatoCum)}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-t-2 border-white/15">
                                <span className="font-display text-sm text-nebbia">{t('bilancio.totale_passivo_risultato')}</span>
                                <span className="font-display text-base text-nebbia">{fmtCHF(totPassivo + risultatoCum)}</span>
                            </div>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-body p-3 border ${quadra ? 'text-salvia bg-salvia/5 border-salvia/20' : 'text-red-400 bg-red-900/10 border-red-500/20'}`}>
                        {quadra ? <><Check size={14} /> {t('bilancio.quadrato', { attivo: fmtCHF(totAttivo), passivoRisultato: fmtCHF(totPassivo + risultatoCum) })}</>
                            : <><AlertTriangle size={14} /> {t('bilancio.non_quadrato', { differenza: fmtCHF(sbil) })}</>}
                    </div>
                </>
            ) : sub === 'iva' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('iva.dovuta', { anno: annoSel })}</p>
                            <p className="font-display text-xl text-nebbia">{fmtCHF(ivaAnno.dovuta)}</p>
                        </div>
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('iva.precedente')}</p>
                            <p className="font-display text-xl text-nebbia">{fmtCHF(ivaAnno.precedente)}</p>
                        </div>
                        <div className={`bg-slate border p-4 ${ivaAnno.saldo >= 0 ? 'border-oro/30' : 'border-salvia/30'}`}>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{ivaAnno.saldo >= 0 ? t('iva.da_versare') : t('iva.a_credito')}</p>
                            <p className={`font-display text-xl ${ivaAnno.saldo >= 0 ? 'text-oro' : 'text-salvia'}`}>{fmtCHF(Math.abs(ivaAnno.saldo))}</p>
                        </div>
                    </div>
                    <div className="bg-slate border border-white/5 overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/5">
                                {t('iva.colonne', { returnObjects: true }).map((h, i) => (
                                    <th key={i} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {trimestri.map(tr => (
                                    <tr key={tr.q} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2 font-body text-xs text-nebbia/70">{t('iva.trimestre_riga', { q: tr.q, anno: annoSel })}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia/60">{tr.dovuta ? fmtCHF(tr.dovuta) : '—'}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia/60">{tr.precedente ? fmtCHF(tr.precedente) : '—'}</td>
                                        <td className={`px-3 py-2 text-right font-body text-xs ${tr.saldo >= 0 ? 'text-oro/80' : 'text-salvia'}`}>{tr.saldo ? fmtCHF(tr.saldo) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/25">{t('iva.nota')}</p>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                            {t('verifica.colonne', { returnObjects: true }).map((h, i) => (
                                <th key={i} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {verAgg.map(a => {
                                const saldo = a.dare - a.avere
                                return (
                                    <tr key={a.c.id} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-1.5"><span className="font-mono text-xs text-oro/70 mr-2">{a.c.numero}</span><span className="font-body text-xs text-nebbia/70">{a.c.nome}</span></td>
                                        <td className="px-3 py-1.5 text-right font-body text-xs text-nebbia/60">{a.dare ? fmtCHF(a.dare) : '—'}</td>
                                        <td className="px-3 py-1.5 text-right font-body text-xs text-nebbia/60">{a.avere ? fmtCHF(a.avere) : '—'}</td>
                                        <td className={`px-3 py-1.5 text-right font-body text-xs ${saldo < 0 ? 'text-red-400/80' : 'text-nebbia'}`}>{fmtCHF(saldo)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot><tr className="border-t-2 border-white/15 bg-petrolio/40">
                            <td className="px-3 py-2 font-body text-[11px] uppercase tracking-widest text-nebbia/50">{t('verifica.totali')} {verQuadra ? t('verifica.quadra') : t('verifica.non_quadra')}</td>
                            <td className="px-3 py-2 text-right font-display text-sm text-nebbia">{fmtCHF(totVerDare)}</td>
                            <td className="px-3 py-2 text-right font-display text-sm text-nebbia">{fmtCHF(totVerAvere)}</td>
                            <td></td>
                        </tr></tfoot>
                    </table>
                </div>
            )}

            <p className="font-body text-[11px] text-nebbia/25">
                {t('nota_finale', { anno: annoSel })}
            </p>

            {chiusura && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!chiudendo) setChiusura(false) }}>
                    <div className="bg-slate border border-oro/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Lock size={16} className="text-oro" />
                            <h3 className="font-display text-lg text-nebbia">{t('chiusura.titolo', { anno: annoSel })}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                <Trans
                                    t={t}
                                    i18nKey="chiusura.descrizione"
                                    values={{ anno: annoSel, risultato: fmtCHF(risultatoCum) }}
                                    components={{ risultato: <span className={risultatoCum >= 0 ? 'text-salvia' : 'text-red-400'} /> }}
                                />
                            </p>
                            {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20"><AlertCircle size={13} /> {errore}</div>}
                            <div className="flex gap-2">
                                <button onClick={() => setChiusura(false)} disabled={chiudendo} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">{t('chiusura.annulla')}</button>
                                <button onClick={chiudiEsercizio} disabled={chiudendo} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                                    {chiudendo ? <><Loader2 size={14} className="animate-spin" /> {t('chiusura.in_corso')}</> : <><Lock size={14} /> {t('chiusura.conferma')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Sezione conti con totale (eventuale raggruppamento per classe per i costi)
function SezioneConti({ titolo, righe, totale, raggruppaClasse = false }) {
    const { t } = useTranslation('comp_fid_report_contabili')
    return (
        <div>
            <div className="px-4 py-2 border-b border-white/5 bg-petrolio/30">
                <p className="section-label !m-0">{titolo}</p>
            </div>
            {righe.length === 0 ? (
                <p className="px-4 py-3 font-body text-xs text-nebbia/30">{t('sezione.nessun_movimento')}</p>
            ) : (
                <div className="divide-y divide-white/5">
                    {righe.map(a => (
                        <div key={a.c.id} className="flex items-center justify-between px-4 py-1.5">
                            <span className="min-w-0 truncate">
                                <span className="font-mono text-xs text-oro/70 mr-2">{a.c.numero}</span>
                                <span className="font-body text-xs text-nebbia/70">{a.c.nome}</span>
                                {raggruppaClasse && <span className="font-body text-[10px] text-nebbia/25 ml-2">{NOME_CLASSE[a.c.classe] ?? ''}</span>}
                            </span>
                            <span className={`font-body text-xs ${a.val < 0 ? 'text-red-400/80' : 'text-nebbia'}`}>{fmtCHF(a.val)}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
                <span className="font-body text-xs text-nebbia/50 uppercase tracking-widest">{t('sezione.totale', { sezione: titolo })}</span>
                <span className="font-display text-sm text-nebbia">{fmtCHF(totale)}</span>
            </div>
        </div>
    )
}
