// src/components/fiduciario/EntrateUscite.jsx
//
// Conto economico del cliente-azienda: entrate e uscite, con 3 contatori in alto.
//   - Box 1: mese navigabile — entrate e uscite del mese selezionato
//   - Box 2: Totale Uscite dell'anno = salari (pro-rata) + bonus + costi registrati
//   - Box 3: Totale Entrate dell'anno
//
// Gli STIPENDI non sono righe di questa tabella: si calcolano da clienti_dipendenti
// (logica condivisa in @/lib/calcoloSalari, la stessa di GestioneDipendenti).
// Qui vivono solo i movimenti manuali — entrate + altri costi — nella tabella
// `movimenti`. L'importo sta sul movimento; il documento allegato NON tocca i totali.
//
// Props:
//   clienteId  (string)       - cliente-azienda (obbligatorio)
//   mandatoId  (string|null)  - se presente, i movimenti sono del mandato;
//                               altrimenti vista cliente (tutti i suoi movimenti)
//   anno       (number|null)  - anno di riferimento iniziale (dal mandato)

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight,
    Users, Trash2, Edit2, AlertCircle, Scale, Paperclip, ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    fmtCHF, bonusDelMese, bonusDellAnnoX, salariMeseAttivi, salariProRataAnno,
} from '@/lib/calcoloSalari'
import FormMovimento from './FormMovimento'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const sum = (arr) => arr.reduce((t, m) => t + (Number(m.importo) || 0), 0)

export default function EntrateUscite({ clienteId, mandatoId = null, anno = null, onMovimentiChange }) {
    const { t, i18n } = useTranslation('comp_fid_entrate_uscite')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const MESI = t('mesi', { returnObjects: true })
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(anno ?? annoCorr)
    const [meseSel, setMeseSel] = useState((anno ?? annoCorr) === annoCorr ? new Date().getMonth() : 0)
    const [vista, setVista] = useState('effettivo')   // 'effettivo' | 'previsto'

    const [movimenti, setMovimenti] = useState([])
    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [tabellaMancante, setTabellaMancante] = useState(false)

    const [form, setForm] = useState(null)          // { tipo, movimento? } | null
    const [daEliminare, setDaEliminare] = useState(null)
    const [eliminando, setEliminando] = useState(false)

    useEffect(() => { carica() }, [clienteId, mandatoId])

    async function carica() {
        setLoading(true); setErrore('')
        let qMov = supabase
            .from('movimenti')
            // select('*') è resiliente: se la colonna `stato`/`ricorrenza` non è
            // ancora stata aggiunta (ALTER non applicato), non rompe la query.
            .select('*, documento:documento_id(titolo)')
        qMov = mandatoId ? qMov.eq('mandato_id', mandatoId) : qMov.eq('cliente_id', clienteId)

        const [{ data: mov, error: errMov }, { data: dip }, { data: bon }] = await Promise.all([
            qMov.order('data', { ascending: false }),
            supabase.from('clienti_dipendenti').select('*').eq('cliente_id', clienteId),
            supabase.from('dipendenti_bonus').select('id, importo, data_bonus').eq('cliente_id', clienteId),
        ])

        if (errMov) {
            // 42P01 = relation does not exist → migration non ancora applicata.
            // Degradiamo con grazia: solo gli stipendi popolano i contatori.
            setTabellaMancante(errMov.code === '42P01' || /movimenti/i.test(errMov.message ?? ''))
            setMovimenti([])
        } else {
            setTabellaMancante(false)
            setMovimenti(mov ?? [])
        }
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setLoading(false)
    }

    async function elimina() {
        if (!daEliminare) return
        setEliminando(true)
        const { error } = await supabase.from('movimenti').delete().eq('id', daEliminare.id)
        setEliminando(false)
        if (error) { setErrore(error.message); return }
        setDaEliminare(null)
        carica()
        onMovimentiChange?.()   // notifica i box collegati (budget, liquidità, report)
    }

    // ─── Filtri / calcoli (anno + stato della vista) ───
    // La vista filtra per stato: 'effettivo' (consuntivo) o 'previsto' (budget).
    // Gli stipendi entrano solo nel consuntivo: sono realtà ricorrente, non una
    // voce di piano manuale (la proiezione salari sul previsto la farà il motore
    // di liquidità). Movimenti pre-migration (senza `stato`) = 'effettivo'.
    const ePrevisto = vista === 'previsto'
    const eStato = (m) => (m.stato ?? 'effettivo') === vista
    const inMese = (m) => {
        const d = new Date(m.data)
        return d.getFullYear() === annoSel && d.getMonth() === meseSel
    }
    const movAnno = movimenti.filter(m => eStato(m) && new Date(m.data).getFullYear() === annoSel)
    const entrateAnnoList = movAnno.filter(m => m.tipo === 'entrata')
    const usciteAnnoList = movAnno.filter(m => m.tipo === 'uscita')

    // Box 1 — mese navigabile
    const entrateMese = sum(movimenti.filter(m => eStato(m) && m.tipo === 'entrata' && inMese(m)))
    const salariMese = ePrevisto ? 0 : salariMeseAttivi(dipendenti, meseSel, annoSel)
    const bonusMese = ePrevisto ? 0 : bonusDelMese(bonus, meseSel, annoSel)
    const costiMese = sum(movimenti.filter(m => eStato(m) && m.tipo === 'uscita' && inMese(m)))
    const usciteMese = salariMese + bonusMese + costiMese
    const saldoMese = entrateMese - usciteMese

    // Box 2 — Totale Uscite anno = (salari pro-rata + bonus, solo consuntivo) + costi
    const salariAnno = ePrevisto ? 0 : salariProRataAnno(dipendenti, annoSel)
    const bonusAnno = ePrevisto ? 0 : bonusDellAnnoX(bonus, annoSel)
    const stipendiAnno = salariAnno + bonusAnno
    const costiAnno = sum(usciteAnnoList)
    const totaleUscite = stipendiAnno + costiAnno

    // Box 3 — Totale Entrate anno
    const totaleEntrate = sum(entrateAnnoList)
    const saldoAnno = totaleEntrate - totaleUscite

    // Anni disponibili (range + anni che hanno movimenti)
    const anniSet = new Set([annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2, annoSel])
    if (anno) anniSet.add(anno)
    movimenti.forEach(m => anniSet.add(new Date(m.data).getFullYear()))
    const anniDisponibili = [...anniSet].sort((a, b) => b - a)

    const nRilevanti = dipendenti.filter(d => d.is_dipendente || d.is_socio).length

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-5">
            {/* ── Intestazione + selettore anno ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Scale size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">{t('titolo')}</h2>
                    {mandatoId && <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">{t('badge_mandato')}</span>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Toggle vista: effettivo (consuntivo) / previsto (budget) */}
                    <div className="flex border border-white/10">
                        {[
                            { v: 'effettivo', label: t('vista.effettivo') },
                            { v: 'previsto', label: t('vista.previsto') },
                        ].map(({ v, label }) => (
                            <button key={v} onClick={() => setVista(v)}
                                className={`px-3 py-1.5 font-body text-xs transition-colors ${vista === v ? 'bg-oro/15 text-oro' : 'text-nebbia/40 hover:text-nebbia/70'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('anno')}</span>
                        <select
                            value={annoSel}
                            onChange={e => setAnnoSel(Number(e.target.value))}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50"
                        >
                            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── 3 CONTATORI ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Box 1 — mese navigabile */}
                <div className="bg-slate border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate capitalize">
                            {MESI[meseSel]} {annoSel}{ePrevisto ? ` · ${t('previsto_suffisso')}` : ''}
                        </p>
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setMeseSel(m => Math.max(0, m - 1))} disabled={meseSel === 0}
                                className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title={t('mese_precedente')}>
                                <ChevronLeft size={13} />
                            </button>
                            <button onClick={() => setMeseSel(m => Math.min(11, m + 1))} disabled={meseSel === 11}
                                className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title={t('mese_successivo')}>
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-salvia/80 flex items-center gap-1"><TrendingUp size={11} /> {t('entrate')}</span>
                            <span className="font-display text-base text-salvia">{fmtCHF(entrateMese)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-oro/80 flex items-center gap-1"><TrendingDown size={11} /> {t('uscite')}</span>
                            <span className="font-display text-base text-oro">{fmtCHF(usciteMese)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('saldo')}</span>
                            <span className={`font-display text-base ${saldoMese >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(saldoMese)}</span>
                        </div>
                    </div>
                </div>

                {/* Box 2 — Totale Uscite anno */}
                <div className="bg-slate border border-oro/30 p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingDown size={11} className="text-oro" />
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{ePrevisto ? t('box_uscite.titolo_previsto') : t('box_uscite.titolo_effettivo')} {annoSel}</p>
                    </div>
                    <p className="font-display text-2xl text-oro">{fmtCHF(totaleUscite)}</p>
                    <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                        {ePrevisto ? t('box_uscite.dettaglio_previsto') : t('box_uscite.dettaglio_effettivo', { stipendi: fmtCHF(stipendiAnno), uscite: fmtCHF(costiAnno) })}
                    </p>
                </div>

                {/* Box 3 — Totale Entrate anno */}
                <div className="bg-slate border border-salvia/30 p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp size={11} className="text-salvia" />
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{ePrevisto ? t('box_entrate.titolo_previsto') : t('box_entrate.titolo_effettivo')} {annoSel}</p>
                    </div>
                    <p className="font-display text-2xl text-salvia">{fmtCHF(totaleEntrate)}</p>
                    <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                        {t('box_entrate.saldo_label', { anno: annoSel })} <span className={saldoAnno >= 0 ? 'text-salvia' : 'text-red-400'}>{fmtCHF(saldoAnno)}</span>
                    </p>
                </div>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* ── ENTRATE ── */}
                    <SezioneMovimenti
                        titolo={t('entrate')}
                        tipo="entrata"
                        movimenti={entrateAnnoList}
                        onNuovo={() => setForm({ tipo: 'entrata', valoriIniziali: { stato: vista } })}
                        onModifica={(m) => setForm({ tipo: m.tipo, movimento: m })}
                        onElimina={setDaEliminare}
                    />

                    {/* ── USCITE (con riga stipendi computata in testa) ── */}
                    <SezioneMovimenti
                        titolo={t('uscite')}
                        tipo="uscita"
                        movimenti={usciteAnnoList}
                        onNuovo={() => setForm({ tipo: 'uscita', valoriIniziali: { stato: vista } })}
                        onModifica={(m) => setForm({ tipo: m.tipo, movimento: m })}
                        onElimina={setDaEliminare}
                        rigaTesta={ePrevisto ? null : (
                            <div className="flex items-start justify-between gap-3 p-3 bg-petrolio/60 border border-oro/15">
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <Users size={14} className="text-oro/60 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-body text-sm text-nebbia">{t('stipendi.titolo', { anno: annoSel })}</p>
                                        <p className="font-body text-[11px] text-nebbia/30 mt-0.5">
                                            {t('stipendi.dettaglio', { count: nRilevanti })}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-display text-sm text-oro shrink-0">{fmtCHF(stipendiAnno)}</span>
                            </div>
                        )}
                    />
                </div>
            )}

            {/* Modal nuovo/modifica */}
            {form && (
                <FormMovimento
                    tipo={form.tipo}
                    clienteId={clienteId}
                    mandatoId={mandatoId}
                    movimento={form.movimento ?? null}
                    valoriIniziali={form.valoriIniziali ?? null}
                    onClose={() => setForm(null)}
                    onSaved={() => { setForm(null); carica(); onMovimentiChange?.() }}
                />
            )}

            {/* Conferma eliminazione */}
            {daEliminare && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => { if (!eliminando) setDaEliminare(null) }}>
                    <div className="bg-slate border border-red-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Trash2 size={16} className="text-red-400" />
                            <h2 className="font-display text-lg text-nebbia">{t('elimina.titolo')}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                {t('elimina.conferma_pre')} <span className="text-nebbia font-medium">{daEliminare.descrizione}</span> ({fmtCHF(daEliminare.importo)}){t('elimina.conferma_post')}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setDaEliminare(null)} disabled={eliminando}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                                    {t('elimina.annulla')}
                                </button>
                                <button onClick={elimina} disabled={eliminando}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                    {eliminando
                                        ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                        : <><Trash2 size={14} /> {t('elimina.conferma')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Sezione lista (Entrate o Uscite) ───
function SezioneMovimenti({ titolo, tipo, movimenti, onNuovo, onModifica, onElimina, rigaTesta = null }) {
    const { t, i18n } = useTranslation('comp_fid_entrate_uscite')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const eEntrata = tipo === 'entrata'
    const accent = eEntrata ? 'text-salvia' : 'text-oro'
    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {eEntrata ? <TrendingUp size={14} className={accent} /> : <TrendingDown size={14} className={accent} />}
                    <p className="section-label !m-0">{titolo} ({movimenti.length})</p>
                </div>
                <button onClick={onNuovo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors">
                    <Plus size={11} /> {eEntrata ? t('sezione.nuova_entrata') : t('sezione.nuovo_costo')}
                </button>
            </div>

            <div className="space-y-2">
                {rigaTesta}
                {movimenti.length === 0 && !rigaTesta ? (
                    <div className="flex flex-col items-center justify-center py-8 text-nebbia/30 text-center bg-petrolio/40 border border-white/5">
                        {eEntrata ? <TrendingUp size={18} className="mb-2 text-nebbia/20" /> : <TrendingDown size={18} className="mb-2 text-nebbia/20" />}
                        <span className="font-body text-xs">{eEntrata ? t('sezione.vuoto_entrate') : t('sezione.vuoto_uscite')}</span>
                    </div>
                ) : movimenti.map(m => (
                    <div key={m.id} className="group flex items-start justify-between gap-3 p-3 bg-petrolio border border-white/5 hover:border-white/10 transition-colors">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onModifica(m)}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-body text-sm text-nebbia truncate">{m.descrizione}</p>
                                {m.categoria && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-nebbia/40">{m.categoria}</span>
                                )}
                                {m.ricorrenza && m.ricorrenza !== 'una_tantum' && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 border border-oro/20 text-oro/60" title={t('sezione.ricorrente')}>↻ {t(`ricorrenza.${m.ricorrenza}`, { defaultValue: m.ricorrenza })}</span>
                                )}
                                {m.origine === 'ocr' && !m.verificato && (
                                    <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-amber-400/30 text-amber-400" title={t('sezione.ocr_tooltip')}>
                                        <ShieldAlert size={9} /> {t('sezione.da_verificare')}
                                    </span>
                                )}
                            </div>
                            <p className="font-body text-[11px] text-nebbia/30 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>{new Date(m.data).toLocaleDateString(dateLocale)}</span>
                                {m.documento && (
                                    <span className="inline-flex items-center gap-1 text-nebbia/40"><Paperclip size={9} /> {m.documento.titolo}</span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-display text-sm ${accent}`}>{fmtCHF(m.importo)}</span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onModifica(m)} title={t('sezione.modifica')}
                                    className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-oro transition-colors">
                                    <Edit2 size={12} />
                                </button>
                                <button onClick={() => onElimina(m)} title={t('sezione.elimina')}
                                    className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
