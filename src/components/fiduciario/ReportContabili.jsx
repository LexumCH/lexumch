// src/components/fiduciario/ReportContabili.jsx
//
// Partita doppia — report dai saldi dei conti. Rifatto il 09-10-2026 per il conto annuale CO (art. 957-959c):
//   - esercizi con date libere (tabella esercizi_contabili); senza esercizi salvati, anni solari come prima
//   - Conto economico per natura (art. 959b cpv. 2) e Bilancio per poste (art. 959a), con l'esercizio
//     precedente accanto (art. 958d cpv. 2): i numeri vengono da src/lib/contoAnnuale.js, sempre uguali
//   - Conto annuale: bilancio + conto economico + allegato scritto da Lex, PDF da firmare (ContoAnnuale.jsx)
//   - IVA per trimestre dentro l'esercizio, Bilancio di verifica
//   - Chiusura (chiudi_esercizio): azzera i conti economici sul 2979 e blocca l'esercizio. Riapertura con un
//     clic e il motivo scritto (riapri_esercizio, decisione dell'utente del 09-10): resta nella Traccia.
//
// Props: clienteId (string). I conti arrivano col libro mastro (leggiMastro), con la loro posta.

import { useState, useEffect, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { FileBarChart, AlertCircle, Check, AlertTriangle, Loader2, Lock, Unlock, CalendarRange, ChevronDown, ChevronRight, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { fmtCHF } from '@/lib/calcoloSalari'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { STRUTTURA_BILANCIO, STRUTTURA_CE } from '@/lib/pianoContiKMU'
import { calcolaContoAnnuale, elencoEsercizi, esercizioPrecedente, etichettaEsercizio, dataCH, isoOggi, fineDodiciMesi, giornoDopo } from '@/lib/contoAnnuale'
import { etichettaPosta, testoCO, totaleDi, tipoForma as riconosciForma } from '@/lib/contoAnnualeTesti'
import { leggiMastro, codiceErroreContabilita, periodoErrore } from '@/lib/contabilitaDati'
import ContoAnnuale from './ContoAnnuale'

const LOCALI = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
const importo = (n) => Number(n || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CONTI_IVA_PRECEDENTE = (c) => c.numero === '1170' || c.numero === '1171' || (c.numero === '1176' && /iva|mwst|tva/i.test(c.nome ?? ''))

export default function ReportContabili({ clienteId }) {
    const { t, i18n } = useTranslation('comp_fid_report_contabili')
    const { user, profile } = useAuth()
    const lingua = ['de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    const locale = LOCALI[lingua]
    const [righe, setRighe] = useState([])
    const [esercizi, setEsercizi] = useState([])
    const [cliente, setCliente] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [esito, setEsito] = useState('')
    const [sub, setSub] = useState('ce')   // 'ce' | 'bilancio' | 'conto_annuale' | 'iva' | 'verifica' | 'traccia'
    const [sel, setSel] = useState(null)   // inizio dell'esercizio scelto
    const [aperte, setAperte] = useState({})
    const [dialogo, setDialogo] = useState(null)   // 'chiudi' | 'riapri' | 'date'
    const [lavoro, setLavoro] = useState(false)
    const [erroreDialogo, setErroreDialogo] = useState('')
    const [motivo, setMotivo] = useState('')
    const [date, setDate] = useState({ inizio: '', fine: '' })

    useEffect(() => { carica() }, [clienteId])

    const messaggio = (e) => {
        const codice = codiceErroreContabilita(e)
        if (codice) {
            const p = periodoErrore(e)
            return t(`errori_db.${codice}`, p ? { inizio: dataCH(p.inizio), fine: dataCH(p.fine) } : {})
        }
        return sanitizzaErrore(e?.message, t('errori_db.generico')) ?? t('errori_db.generico')
    }

    async function carica() {
        setLoading(true); setErrore('')
        try {
            const [mastro, { data: es, error: e1 }, { data: cl }] = await Promise.all([
                leggiMastro(clienteId),
                supabase.from('esercizi_contabili').select('id, inizio, fine, stato, chiuso_il, riaperto_il').eq('cliente_id', clienteId).order('inizio'),
                supabase.from('profiles')
                    .select('id, nome, cognome, ragione_sociale, forma_giuridica, tipo_soggetto, uid, sede_legale, citta, lingua, rappr_nome, rappr_cognome, rappr_carica')
                    .eq('id', clienteId).maybeSingle(),
            ])
            if (e1) throw e1
            setRighe(mastro)
            setEsercizi(es ?? [])
            setCliente(cl ?? null)
        } catch (e) {
            setErrore(messaggio(e))
        } finally {
            setLoading(false)
        }
    }

    const dateRegistrazioni = useMemo(() => [...new Set(righe.map(r => r.data))], [righe])
    const elenco = useMemo(() => elencoEsercizi(esercizi, dateRegistrazioni), [esercizi, dateRegistrazioni])
    const esercizio = useMemo(() => {
        if (!elenco.length) return null
        const scelto = elenco.find(e => e.inizio === sel)
        if (scelto) return scelto
        const oggi = isoOggi()
        return elenco.find(e => e.inizio <= oggi && oggi <= e.fine) ?? elenco[elenco.length - 1]
    }, [elenco, sel])
    const precedente = useMemo(() => esercizioPrecedente(elenco, esercizio), [elenco, esercizio])
    const calcolo = useMemo(() => (esercizio ? calcolaContoAnnuale({ righe, esercizio, precedente }) : null), [righe, esercizio, precedente])
    const tipo = riconosciForma(cliente?.forma_giuridica, cliente?.tipo_soggetto)
    const chiuso = esercizio?.stato === 'chiuso'
    const etichetta = (p) => etichettaPosta(lingua, p, tipo)

    // Bilancio di verifica: saldi cumulati a fine esercizio
    const verifica = useMemo(() => {
        if (!esercizio) return []
        const m = new Map()
        for (const r of righe) {
            if (r.data > esercizio.fine) continue
            if (!m.has(r.c.id)) m.set(r.c.id, { c: r.c, dare: 0, avere: 0 })
            const a = m.get(r.c.id); a.dare += r.dare; a.avere += r.avere
        }
        return [...m.values()].sort((x, y) => String(x.c.numero).localeCompare(String(y.c.numero)))
    }, [righe, esercizio])
    const totVerDare = verifica.reduce((s, a) => s + a.dare, 0)
    const totVerAvere = verifica.reduce((s, a) => s + a.avere, 0)
    const verQuadra = Math.round((totVerDare - totVerAvere) * 100) === 0

    // IVA: i trimestri civili dentro l'esercizio (conto 2200 dovuta, 1170/1171 imposta precedente)
    const iva = useMemo(() => {
        if (!esercizio) return { anno: { dovuta: 0, precedente: 0, saldo: 0 }, trimestri: [] }
        const periodo = (da, a) => {
            let dovuta = 0, prec = 0
            for (const r of righe) {
                if (r.data < da || r.data > a) continue
                if (r.c.numero === '2200') dovuta += r.avere - r.dare
                else if (CONTI_IVA_PRECEDENTE(r.c)) prec += r.dare - r.avere
            }
            return { dovuta: Math.round(dovuta * 100) / 100, precedente: Math.round(prec * 100) / 100, saldo: Math.round((dovuta - prec) * 100) / 100 }
        }
        const trimestri = []
        let anno = Number(esercizio.inizio.slice(0, 4))
        let q = Math.floor((Number(esercizio.inizio.slice(5, 7)) - 1) / 3)
        for (let guardia = 0; guardia < 12; guardia++) {
            const inizioQ = `${anno}-${String(q * 3 + 1).padStart(2, '0')}-01`
            if (inizioQ > esercizio.fine) break
            const fineQ = new Date(Date.UTC(anno, q * 3 + 3, 0)).toISOString().slice(0, 10)
            const da = inizioQ < esercizio.inizio ? esercizio.inizio : inizioQ
            const a = fineQ > esercizio.fine ? esercizio.fine : fineQ
            trimestri.push({ chiave: inizioQ, q: q + 1, anno, ...periodo(da, a) })
            q += 1
            if (q === 4) { q = 0; anno += 1 }
        }
        return { anno: periodo(esercizio.inizio, esercizio.fine), trimestri }
    }, [righe, esercizio])

    // ─── Chiusura, riapertura, date ───

    function apri(d) {
        setErroreDialogo('')
        setMotivo('')
        if (d === 'date' && esercizio) setDate({ inizio: esercizio.inizio, fine: esercizio.fine })
        setDialogo(d)
    }

    async function chiudi() {
        setLavoro(true); setErroreDialogo('')
        const { data, error } = await supabase.rpc('chiudi_esercizio', {
            p_cliente_id: clienteId,
            p_inizio: esercizio.inizio,
            p_fine: esercizio.fine,
            p_descrizione: t('chiusura.descrizione_registrazione', { periodo: `${dataCH(esercizio.inizio)} – ${dataCH(esercizio.fine)}` }),
        })
        setLavoro(false)
        if (error) { setErroreDialogo(messaggio(error)); return }
        const risultato = Number(data?.risultato ?? 0)
        setDialogo(null)
        setEsito(t('chiusura.esito_chiuso', { esercizio: etichettaEsercizio(esercizio), tipo: risultato >= 0 ? t('chiusura.utile') : t('chiusura.perdita'), importo: fmtCHF(Math.abs(risultato)) }))
        await carica()
    }

    async function riapri() {
        if (motivo.trim().length < 10) { setErroreDialogo(t('errori_db.MOTIVO_OBBLIGATORIO')); return }
        setLavoro(true); setErroreDialogo('')
        const { data, error } = await supabase.rpc('riapri_esercizio', { p_esercizio_id: esercizio.id, p_motivo: motivo.trim() })
        setLavoro(false)
        if (error) { setErroreDialogo(messaggio(error)); return }
        setDialogo(null)
        setEsito(t(Number(data?.conti_superati ?? 0) > 0 ? 'riapertura.esito_superato' : 'riapertura.esito', { esercizio: etichettaEsercizio(esercizio) }))
        await carica()
    }

    async function salvaDate() {
        const { inizio, fine } = date
        // Al massimo due anni, come il vincolo del database: il primo esercizio può essere più lungo di 12 mesi
        if (!inizio || !fine || fine <= inizio || fine > fineDodiciMesi(giornoDopo(fineDodiciMesi(inizio)))) {
            setErroreDialogo(t('errori_db.DATE_NON_VALIDE'))
            return
        }
        setLavoro(true); setErroreDialogo('')
        let error
        if (esercizio.id) {
            ({ error } = await supabase.from('esercizi_contabili').update({ inizio, fine }).eq('id', esercizio.id))
        } else {
            ({ error } = await supabase.from('esercizi_contabili').insert({
                cliente_id: clienteId, inizio, fine, avvocato_id: user?.id, studio_id: profile?.studio_id ?? null, creato_da: user?.id,
            }))
        }
        setLavoro(false)
        if (error) { setErroreDialogo(messaggio(error)); return }
        setDialogo(null)
        setSel(inizio)
        setEsito(t('date.esito', { inizio: dataCH(inizio), fine: dataCH(fine) }))
        await carica()
    }

    const haDati = righe.length > 0
    const conPrecedente = !!calcolo?.precedente

    const intestazione = (
        <tr className="border-b border-white/5">
            <th className="px-3 py-2 text-left font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase">{t('colonne.posta')}</th>
            <th className="px-3 py-2 text-right font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase whitespace-nowrap">{esercizio ? etichettaEsercizio(esercizio) : ''}</th>
            {conPrecedente && <th className="px-3 py-2 text-right font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase whitespace-nowrap">{etichettaEsercizio(precedente)}</th>}
        </tr>
    )

    const rigaPosta = (sezione, posta) => {
        const dettaglio = calcolo.dettaglio[posta] ?? []
        const espandibile = dettaglio.length > 0 && posta !== 'cp_utile_esercizio' && posta !== 'cp_utile_riportato'
        const aperta = !!aperte[posta]
        const valore = calcolo.attuale[sezione][posta]
        return [
            <tr key={posta} className={`border-b border-white/5 ${espandibile ? 'cursor-pointer hover:bg-petrolio/40' : ''}`}
                onClick={() => espandibile && setAperte(a => ({ ...a, [posta]: !a[posta] }))}>
                <td className="px-3 py-1.5 font-body text-xs text-nebbia/75">
                    <span className="inline-flex items-start gap-1.5">
                        {espandibile ? (aperta ? <ChevronDown size={12} className="mt-0.5 text-nebbia/40 shrink-0" /> : <ChevronRight size={12} className="mt-0.5 text-nebbia/40 shrink-0" />) : <span className="w-3 shrink-0" />}
                        {etichetta(posta)}
                    </span>
                </td>
                <td className={`px-3 py-1.5 text-right font-body text-xs whitespace-nowrap ${valore < 0 ? 'text-red-400/80' : 'text-nebbia'}`}>{importo(valore)}</td>
                {conPrecedente && <td className="px-3 py-1.5 text-right font-body text-xs text-nebbia/45 whitespace-nowrap">{importo(calcolo.precedente[sezione][posta])}</td>}
            </tr>,
            ...(aperta ? dettaglio.map(d => (
                <tr key={`${posta}-${d.c.id}`} className="border-b border-white/5 bg-petrolio/30">
                    <td className="pl-10 pr-3 py-1 font-body text-[11px] text-nebbia/50"><span className="font-mono text-oro/60 mr-2">{d.c.numero}</span>{d.c.nome}</td>
                    <td className="px-3 py-1 text-right font-body text-[11px] text-nebbia/60 whitespace-nowrap">{importo(d.valore)}</td>
                    {conPrecedente && <td />}
                </tr>
            )) : []),
        ]
    }

    const rigaTotale = (chiave, testo, attuale, prec, forte = false) => (
        <tr key={chiave} className={`border-t ${forte ? 'border-white/20 bg-petrolio/40' : 'border-white/10'}`}>
            <td className={`px-3 py-2 font-body ${forte ? 'text-sm text-nebbia' : 'text-xs text-nebbia/70'} font-medium`}>{testo}</td>
            <td className={`px-3 py-2 text-right font-display whitespace-nowrap ${forte ? 'text-base' : 'text-sm'} ${attuale < 0 ? 'text-red-400' : 'text-nebbia'}`}>{importo(attuale)}</td>
            {conPrecedente && <td className="px-3 py-2 text-right font-display text-sm text-nebbia/45 whitespace-nowrap">{prec == null ? '' : importo(prec)}</td>}
        </tr>
    )

    return (
        <div className="space-y-4">
            {/* Esercizio */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex border border-white/10 flex-wrap">
                    {[['ce', t('tab.ce')], ['bilancio', t('tab.bilancio')], ['conto_annuale', t('tab.conto_annuale')], ['iva', t('tab.iva')], ['verifica', t('tab.verifica')], ['traccia', t('tab.traccia')]].map(([v, l]) => (
                        <button key={v} onClick={() => setSub(v)}
                            className={`px-3 py-1.5 font-body text-xs transition-colors ${sub === v ? 'bg-oro/15 text-oro' : 'text-nebbia/40 hover:text-nebbia/70'}`}>{l}</button>
                    ))}
                </div>
                {esercizio && (
                    <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('esercizio.etichetta')}</span>
                        <select value={esercizio.inizio} onChange={e => { setSel(e.target.value); setEsito('') }}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                            {[...elenco].reverse().map(e => (
                                <option key={e.inizio} value={e.inizio}>{etichettaEsercizio(e)}{e.stato === 'chiuso' ? ` · ${t('esercizio.chiuso_breve')}` : ''}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {esercizio && (
                <div className={`flex items-center justify-between gap-3 flex-wrap px-3 py-2 border ${chiuso ? 'border-salvia/25 bg-salvia/5' : 'border-white/10 bg-petrolio/40'}`}>
                    <span className="flex items-center gap-2 font-body text-xs text-nebbia/60">
                        {chiuso ? <Lock size={13} className="text-salvia" /> : <CalendarRange size={13} className="text-nebbia/40" />}
                        {t('esercizio.periodo', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) })}
                        {' · '}
                        {chiuso
                            ? t('esercizio.stato_chiuso', { data: esercizio.chiuso_il ? new Date(esercizio.chiuso_il).toLocaleDateString(locale) : '' })
                            : t('esercizio.stato_aperto')}
                    </span>
                    <span className="flex items-center gap-2">
                        {!chiuso && (
                            <button onClick={() => apri('date')} className="flex items-center gap-1.5 px-2.5 py-1 border border-white/10 text-nebbia/60 font-body text-[11px] hover:border-oro/30 hover:text-oro transition-colors">
                                <CalendarRange size={11} /> {t('esercizio.date')}
                            </button>
                        )}
                        {chiuso ? (
                            <button onClick={() => apri('riapri')} className="flex items-center gap-1.5 px-2.5 py-1 border border-white/10 text-nebbia/60 font-body text-[11px] hover:border-oro/30 hover:text-oro transition-colors">
                                <Unlock size={11} /> {t('esercizio.riapri')}
                            </button>
                        ) : haDati && (
                            <button onClick={() => apri('chiudi')} className="flex items-center gap-1.5 px-2.5 py-1 border border-oro/30 text-oro font-body text-[11px] hover:bg-oro/10 transition-colors">
                                <Lock size={11} /> {t('esercizio.chiudi')}
                            </button>
                        )}
                    </span>
                </div>
            )}

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}
            {esito && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><Check size={14} /> {esito}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : !haDati && sub !== 'traccia' ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center">
                    <FileBarChart size={26} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">{t('vuoto')}</p>
                </div>
            ) : !esercizio || !calcolo ? null : sub === 'ce' ? (
                <div className="space-y-2">
                    <div className="bg-slate border border-white/5 overflow-x-auto">
                        <table className="w-full">
                            <thead>{intestazione}</thead>
                            <tbody>
                                {STRUTTURA_CE.flatMap(r => r.posta
                                    ? (calcolo.posteCeVisibili.includes(r.posta) ? rigaPosta('ce', r.posta) : [])
                                    : [rigaTotale(r.subtotale, testoCO(lingua, `subtotali.${r.subtotale}`), calcolo.attuale.subtotali[r.subtotale], calcolo.precedente?.subtotali[r.subtotale], r.subtotale === 'risultato_esercizio')])}
                            </tbody>
                        </table>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/30">{t('ce.nota')}</p>
                </div>
            ) : sub === 'bilancio' ? (
                <div className="space-y-2">
                    <div className="bg-slate border border-white/5 overflow-x-auto">
                        <table className="w-full">
                            <thead>{intestazione}</thead>
                            <tbody>
                                {STRUTTURA_BILANCIO.flatMap(s => [
                                    <tr key={s.sezione}><td colSpan={conPrecedente ? 3 : 2} className="px-3 pt-4 pb-1 font-display text-sm text-nebbia">{testoCO(lingua, `sezioni.${s.sezione}`)}</td></tr>,
                                    ...s.gruppi.flatMap(g => {
                                        const poste = g.poste.filter(p => calcolo.posteBilancioVisibili.includes(p))
                                        if (!poste.length) return []
                                        return [
                                            <tr key={g.gruppo}><td colSpan={conPrecedente ? 3 : 2} className="px-3 pt-2 pb-1 font-body text-[10px] uppercase tracking-widest text-nebbia/40">{testoCO(lingua, `gruppi.${g.gruppo}`)}</td></tr>,
                                            ...poste.flatMap(p => rigaPosta('bilancio', p)),
                                            rigaTotale(`tot-${g.gruppo}`, totaleDi(lingua, g.gruppo), calcolo.attuale.gruppi[g.gruppo], calcolo.precedente?.gruppi[g.gruppo]),
                                        ]
                                    }),
                                    rigaTotale(`tot-${s.sezione}`, totaleDi(lingua, s.sezione),
                                        s.sezione === 'attivo' ? calcolo.attuale.totaleAttivo : calcolo.attuale.totalePassivo,
                                        calcolo.precedente ? (s.sezione === 'attivo' ? calcolo.precedente.totaleAttivo : calcolo.precedente.totalePassivo) : null, true),
                                ])}
                            </tbody>
                        </table>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-body p-3 border ${calcolo.attuale.quadra && !calcolo.senzaPosta.length ? 'text-salvia bg-salvia/5 border-salvia/20' : 'text-red-400 bg-red-900/10 border-red-500/20'}`}>
                        {calcolo.attuale.quadra && !calcolo.senzaPosta.length
                            ? <><Check size={14} /> {t('bilancio.quadrato', { totale: fmtCHF(calcolo.attuale.totaleAttivo) })}</>
                            : <><AlertTriangle size={14} /> {calcolo.senzaPosta.length
                                ? t('bilancio.senza_posta', { conti: calcolo.senzaPosta.map(x => x.c.numero).join(', ') })
                                : t('bilancio.non_quadrato', { differenza: fmtCHF(calcolo.attuale.differenza) })}</>}
                    </div>
                </div>
            ) : sub === 'conto_annuale' ? (
                <ContoAnnuale
                    clienteId={clienteId}
                    cliente={cliente}
                    esercizio={esercizio}
                    precedente={precedente}
                    righe={righe}
                    onCambiato={carica}
                    onVaiAChiusura={() => { setSub('ce'); apri('chiudi') }}
                />
            ) : sub === 'iva' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('iva.dovuta')}</p>
                            <p className="font-display text-xl text-nebbia">{fmtCHF(iva.anno.dovuta)}</p>
                        </div>
                        <div className="bg-slate border border-white/10 p-4">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{t('iva.precedente')}</p>
                            <p className="font-display text-xl text-nebbia">{fmtCHF(iva.anno.precedente)}</p>
                        </div>
                        <div className={`bg-slate border p-4 ${iva.anno.saldo >= 0 ? 'border-oro/30' : 'border-salvia/30'}`}>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">{iva.anno.saldo >= 0 ? t('iva.da_versare') : t('iva.a_credito')}</p>
                            <p className={`font-display text-xl ${iva.anno.saldo >= 0 ? 'text-oro' : 'text-salvia'}`}>{fmtCHF(Math.abs(iva.anno.saldo))}</p>
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
                                {iva.trimestri.map(tr => (
                                    <tr key={tr.chiave} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2 font-body text-xs text-nebbia/70">{t('iva.trimestre_riga', { q: tr.q, anno: tr.anno })}</td>
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
            ) : sub === 'verifica' ? (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                            {t('verifica.colonne', { returnObjects: true }).map((h, i) => (
                                <th key={i} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {verifica.map(a => {
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
            ) : (
                <Traccia clienteId={clienteId} elenco={elenco} />
            )}

            {esercizio && sub !== 'traccia' && sub !== 'conto_annuale' && (
                <p className="font-body text-[11px] text-nebbia/25">
                    {t('nota_finale', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) })}
                </p>
            )}

            {/* Dialoghi */}
            {dialogo && esercizio && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!lavoro) setDialogo(null) }}>
                    <div className="bg-slate border border-oro/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            {dialogo === 'riapri' ? <Unlock size={16} className="text-oro" /> : dialogo === 'date' ? <CalendarRange size={16} className="text-oro" /> : <Lock size={16} className="text-oro" />}
                            <h3 className="font-display text-lg text-nebbia">{t(`${dialogo === 'chiudi' ? 'chiusura' : dialogo === 'riapri' ? 'riapertura' : 'date'}.titolo`, { esercizio: etichettaEsercizio(esercizio) })}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {dialogo === 'chiudi' && (
                                <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                    <Trans t={t} i18nKey="chiusura.descrizione"
                                        values={{ fine: dataCH(esercizio.fine), risultato: fmtCHF(calcolo?.attuale.risultato ?? 0) }}
                                        components={{ risultato: <span className={(calcolo?.attuale.risultato ?? 0) >= 0 ? 'text-salvia' : 'text-red-400'} /> }} />
                                </p>
                            )}
                            {dialogo === 'riapri' && (
                                <>
                                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">{t('riapertura.descrizione')}</p>
                                    <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} maxLength={2000} autoFocus
                                        placeholder={t('riapertura.motivo_placeholder')}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/30" />
                                </>
                            )}
                            {dialogo === 'date' && (
                                <>
                                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">{t('date.descrizione')}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['inizio', 'fine'].map(k => (
                                            <label key={k} className="block">
                                                <span className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">{t(`date.${k}`)}</span>
                                                <input type="date" value={date[k]} onChange={e => setDate(d => ({ ...d, [k]: e.target.value }))}
                                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50" />
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                            {erroreDialogo && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20"><AlertCircle size={13} className="shrink-0" /> {erroreDialogo}</div>}
                            <div className="flex gap-2">
                                <button onClick={() => setDialogo(null)} disabled={lavoro} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">{t('azioni.annulla')}</button>
                                <button onClick={dialogo === 'chiudi' ? chiudi : dialogo === 'riapri' ? riapri : salvaDate} disabled={lavoro}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                                    {lavoro ? <Loader2 size={14} className="animate-spin" /> : null}
                                    {t(`${dialogo === 'chiudi' ? 'chiusura' : dialogo === 'riapri' ? 'riapertura' : 'date'}.conferma`)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Traccia: modifiche, cancellazioni, chiusure e riaperture (ordinanza sui libri di commercio, art. 3) ───
function Traccia({ clienteId, elenco }) {
    const { t, i18n } = useTranslation('comp_fid_report_contabili')
    const { user } = useAuth()
    const locale = LOCALI[i18n.language] ?? 'it-CH'
    const [eventi, setEventi] = useState(null)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        let attivo = true
        supabase.from('contabilita_traccia')
            .select('id, evento, dettagli, utente_id, creato_il, esercizio_id')
            .eq('cliente_id', clienteId)
            .order('creato_il', { ascending: false })
            .limit(300)
            .then(({ data, error }) => {
                if (!attivo) return
                if (error) setErrore(sanitizzaErrore(error.message, t('errori_db.generico')) ?? t('errori_db.generico'))
                setEventi(data ?? [])
            })
        return () => { attivo = false }
    }, [clienteId])

    const esercizioDi = (id) => elenco.find(e => e.id === id)
    const righeTesto = (righe) => (righe ?? []).map(r => `${r.conto} ${Number(r.dare) ? `D ${importo(r.dare)}` : `A ${importo(r.avere)}`}`).join(' · ')

    function dettaglio(ev) {
        const d = ev.dettagli ?? {}
        switch (ev.evento) {
            case 'registrazione_eliminata':
                return `${dataCH(d.data)} · ${d.descrizione ?? ''}${d.righe?.length ? ` — ${righeTesto(d.righe)}` : ''}`
            case 'registrazione_modificata':
                return `${dataCH(d.prima?.data)} «${d.prima?.descrizione ?? ''}» → ${dataCH(d.dopo?.data)} «${d.dopo?.descrizione ?? ''}»`
            case 'riga_aggiunta':
            case 'riga_eliminata':
            case 'riga_modificata': {
                const r = (x) => (x ? `${x.conto} ${Number(x.dare) ? `D ${importo(x.dare)}` : `A ${importo(x.avere)}`}` : '')
                const reg = d.registrazione ? `${dataCH(d.registrazione.data)} · ${d.registrazione.descrizione ?? ''} — ` : ''
                return `${reg}${[r(d.prima), r(d.dopo)].filter(Boolean).join(' → ')}`
            }
            case 'esercizio_chiuso':
                return t('traccia.risultato', { importo: fmtCHF(d.risultato ?? 0) })
            case 'esercizio_riaperto':
                return t('traccia.motivo', { motivo: d.motivo ?? '' })
            case 'conto_annuale_firmato':
                return d.tipo === 'elettronica'
                    ? t('traccia.firma_elettronica', { nomi: (d.firme ?? []).map(f => [f.nome, f.data ? dataCH(f.data) : ''].filter(Boolean).join(' ')).join(', ') || '—' })
                    : t('traccia.firma_autografa')
            default:
                return ''
        }
    }

    if (errore) return <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>
    if (!eventi) return <div className="flex items-center justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
    return (
        <div className="space-y-2">
            <p className="font-body text-[11px] text-nebbia/35">{t('traccia.intro')}</p>
            {eventi.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center">
                    <History size={24} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">{t('traccia.vuota')}</p>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 divide-y divide-white/5">
                    {eventi.map(ev => {
                        const es = esercizioDi(ev.esercizio_id)
                        return (
                            <div key={ev.id} className="px-4 py-2.5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <span className="font-body text-xs text-nebbia">{t(`traccia.eventi.${ev.evento}`)}{es ? <span className="text-nebbia/35"> · {etichettaEsercizio(es)}</span> : null}</span>
                                    <span className="font-body text-[11px] text-nebbia/35">
                                        {new Date(ev.creato_il).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                                        {' · '}
                                        {ev.utente_id && ev.utente_id === user?.id ? t('traccia.tu') : ev.utente_id ? t('traccia.altro_utente') : t('traccia.sistema')}
                                    </span>
                                </div>
                                {dettaglio(ev) && <p className="font-body text-[11px] text-nebbia/50 mt-0.5 break-words">{dettaglio(ev)}</p>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
