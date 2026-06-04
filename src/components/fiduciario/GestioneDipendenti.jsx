// src/components/fiduciario/GestioneDipendenti.jsx
//
// Tab "Dipendenti" della scheda cliente fiduciario.
// Lista il personale del cliente-azienda (clienti_dipendenti) + crea/modifica
// (via modal FormDipendente) + elimina.
// Autonomo: passa solo clienteId; il modal recupera avvocato_id/studio_id da sé.
//
// Props:
//   clienteId (string) - cliente-azienda di cui mostrare i dipendenti

import { useState, useEffect } from 'react'
import {
    Plus, Users, Trash2, Edit2, Briefcase, Building2, Globe, AlertCircle,
    Wallet, CalendarRange, Gift, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FormDipendente from './FormDipendente'

// Formatta il salario per la lista (CHF con 2 decimali, con periodicità)
function fmtSalario(d) {
    if (d.salario === null || d.salario === undefined) return null
    const v = Number(d.salario).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const suffix = d.salario_periodicita === 'mensile' ? '/mese' : '/anno'
    return `CHF ${v}${suffix}`
}

// CHF con 2 decimali per i contatori (contabilità: niente arrotondamento ai franchi)
function fmtCHF(n) {
    return `CHF ${Number(n || 0).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Salario mensile normalizzato. La percentuale NON entra (5000 al 50% = 5000).
// salario null → 0 (non sposta la somma).
function salarioMensile(d) {
    const s = Number(d.salario) || 0
    if (s === 0) return 0
    return d.salario_periodicita === 'mensile' ? s : s / 12
}

// Attivo oggi? (nessuna data_fine, o data_fine futura)
function eAttivoOggi(d) {
    if (!d.data_fine) return true
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(d.data_fine) >= oggi
}

// Mesi lavorati in un dato anno, a mese intero di calendario.
// Cessato ad aprile → 4 (gen-apr). Assunto a settembre → 4 (set-dic).
// Senza assunzione → da gennaio. Senza fine → fino a dicembre.
function mesiLavoratiAnno(d, anno) {
    const inizioAnno = new Date(anno, 0, 1)
    const fineAnno = new Date(anno, 11, 31)

    const ass = d.data_assunzione ? new Date(d.data_assunzione) : inizioAnno
    const inizio = ass > inizioAnno ? ass : inizioAnno

    const fin = d.data_fine ? new Date(d.data_fine) : fineAnno
    const fine = fin < fineAnno ? fin : fineAnno

    if (fine < inizioAnno || inizio > fineAnno) return 0

    const mesi = (fine.getFullYear() - inizio.getFullYear()) * 12
        + (fine.getMonth() - inizio.getMonth()) + 1
    return Math.max(0, mesi)
}

// Attivo in un mese+anno specifico? (il rapporto copre quel mese)
function eAttivoNelMese(d, mese, anno) {
    const fineMese = new Date(anno, mese + 1, 0)   // ultimo giorno del mese
    const inizioMese = new Date(anno, mese, 1)
    // Assunto entro la fine del mese?
    if (d.data_assunzione && new Date(d.data_assunzione) > fineMese) return false
    // Cessato prima dell'inizio del mese?
    if (d.data_fine && new Date(d.data_fine) < inizioMese) return false
    return true
}

// Bonus che cadono in un mese+anno specifico
function bonusDelMese(listaBonus, mese, anno) {
    return listaBonus
        .filter(b => {
            const dt = new Date(b.data_bonus)
            return dt.getMonth() === mese && dt.getFullYear() === anno
        })
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Tutti i bonus di un anno specifico
function bonusDellAnnoX(listaBonus, anno) {
    return listaBonus
        .filter(b => new Date(b.data_bonus).getFullYear() === anno)
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Bonus la cui data cade nel mese+anno correnti
function bonusDelMeseCorrente(listaBonus) {
    const ora = new Date()
    const m = ora.getMonth()
    const a = ora.getFullYear()
    return listaBonus
        .filter(b => {
            const d = new Date(b.data_bonus)
            return d.getMonth() === m && d.getFullYear() === a
        })
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Tutti i bonus dell'anno corrente
function bonusDellAnno(listaBonus) {
    const a = new Date().getFullYear()
    return listaBonus
        .filter(b => new Date(b.data_bonus).getFullYear() === a)
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

export default function GestioneDipendenti({ clienteId, anno = null }) {
    // Anno di riferimento: dal mandato se passato, altrimenti anno corrente
    const annoRif = anno ?? new Date().getFullYear()
    // Mese selezionato per il Box 1 (0-11). Default: mese corrente se siamo
    // nell'anno di riferimento, altrimenti gennaio.
    const meseIniziale = annoRif === new Date().getFullYear() ? new Date().getMonth() : 0

    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [meseSel, setMeseSel] = useState(meseIniziale)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    // Modal: null = chiuso | { mode:'nuovo' } | { mode:'modifica', dipendente }
    const [modal, setModal] = useState(null)
    const [daEliminare, setDaEliminare] = useState(null)
    const [eliminando, setEliminando] = useState(false)

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const [
            { data: dip, error: errDip },
            { data: bon },
        ] = await Promise.all([
            supabase
                .from('clienti_dipendenti')
                .select('*')
                .eq('cliente_id', clienteId)
                .order('cognome', { ascending: true }),
            supabase
                .from('dipendenti_bonus')
                .select('id, dipendente_id, importo, data_bonus')
                .eq('cliente_id', clienteId),
        ])
        if (errDip) setErrore(errDip.message)
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setLoading(false)
    }

    async function eliminaConferma() {
        if (!daEliminare) return
        setEliminando(true)
        const { error } = await supabase
            .from('clienti_dipendenti')
            .delete()
            .eq('id', daEliminare.id)
        setEliminando(false)
        if (error) { setErrore(error.message); return }
        setDaEliminare(null)
        carica()
    }

    // Conteggi per intestazione
    const nDipendenti = dipendenti.filter(d => d.is_dipendente && eAttivoOggi(d)).length
    const nSoci = dipendenti.filter(d => d.is_socio).length
    const nFonte = dipendenti.filter(d => d.imposta_fonte).length

    // Chi entra nei contatori stipendi: dipendenti O soci
    const rilevanti = dipendenti.filter(d => d.is_dipendente || d.is_socio)

    // BOX 2 — Salari fissi mensili: salari di chi è attivo OGGI, NESSUN bonus.
    // (Il "fisso" è il costo ricorrente attuale, indipendente dal mese navigato.)
    const salariFissiMensili = rilevanti
        .filter(eAttivoOggi)
        .reduce((t, d) => t + salarioMensile(d), 0)

    // BOX 1 — Uscita del MESE SELEZIONATO: salari di chi era attivo in quel mese
    // + bonus che cadono in quel mese.
    const salariMeseSel = rilevanti
        .filter(d => eAttivoNelMese(d, meseSel, annoRif))
        .reduce((t, d) => t + salarioMensile(d), 0)
    const bonusMeseSel = bonusDelMese(bonus, meseSel, annoRif)
    const uscitaMeseSel = salariMeseSel + bonusMeseSel

    // BOX 3 — Uscita annua dell'anno di riferimento: salari pro-rata + tutti i bonus dell'anno
    const uscitaAnnua = rilevanti
        .reduce((t, d) => t + salarioMensile(d) * mesiLavoratiAnno(d, annoRif), 0)
        + bonusDellAnnoX(bonus, annoRif)
    const bonusAnno = bonusDellAnnoX(bonus, annoRif)

    // Nome del mese selezionato (per l'etichetta del Box 1)
    const nomeMeseSel = new Date(annoRif, meseSel, 1)
        .toLocaleDateString('it-CH', { month: 'long' })

    // Navigazione mesi (limitata all'anno di riferimento)
    const puoIndietro = meseSel > 0
    const puoAvanti = meseSel < 11

    return (
        <div className="space-y-4">
            {/* Intestazione + azione */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-body text-sm text-nebbia/40">
                    {dipendenti.length} {dipendenti.length === 1 ? 'persona' : 'persone'}
                    {dipendenti.length > 0 && (
                        <span className="ml-2 text-nebbia/25">
                            · {nDipendenti} dipendenti attivi · {nSoci} soci
                            {nFonte > 0 && ` · ${nFonte} a imposta fonte`}
                        </span>
                    )}
                </p>
                <button onClick={() => setModal({ mode: 'nuovo' })}
                    className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} /> Aggiungi dipendente
                </button>
            </div>

            {/* Barra contatori (solo se c'è personale) */}
            {dipendenti.length > 0 && (
                <div className="space-y-3">
                    {/* Conteggi persone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate border border-white/5 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Briefcase size={11} className="text-oro/60" />
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Dipendenti attivi</p>
                            </div>
                            <p className="font-display text-2xl text-nebbia">{nDipendenti}</p>
                        </div>
                        <div className="bg-slate border border-white/5 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Building2 size={11} className="text-salvia/60" />
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Soci</p>
                            </div>
                            <p className="font-display text-2xl text-nebbia">{nSoci}</p>
                        </div>
                    </div>

                    {/* Contatori economici (i 3 box) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* BOX 1 — Uscita del mese selezionato (navigabile) */}
                        <div className="bg-slate border border-oro/30 p-4">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Wallet size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate">
                                        Uscita {nomeMeseSel} {annoRif}
                                    </p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                        onClick={() => setMeseSel(m => Math.max(0, m - 1))}
                                        disabled={!puoIndietro}
                                        className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        title="Mese precedente"
                                    >
                                        <ChevronLeft size={13} />
                                    </button>
                                    <button
                                        onClick={() => setMeseSel(m => Math.min(11, m + 1))}
                                        disabled={!puoAvanti}
                                        className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        title="Mese successivo"
                                    >
                                        <ChevronRight size={13} />
                                    </button>
                                </div>
                            </div>
                            <p className="font-display text-2xl text-oro">{fmtCHF(uscitaMeseSel)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                                {bonusMeseSel > 0
                                    ? `salari + ${fmtCHF(bonusMeseSel)} bonus`
                                    : 'salari del personale del mese'}
                            </p>
                        </div>

                        {/* BOX 2 — Salari fissi mensili */}
                        <div className="bg-slate border border-white/10 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <CalendarRange size={11} className="text-nebbia/50" />
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Salari fissi / mese</p>
                            </div>
                            <p className="font-display text-2xl text-nebbia">{fmtCHF(salariFissiMensili)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">costo ricorrente, senza bonus</p>
                        </div>

                        {/* BOX 3 — Uscita annua */}
                        <div className="bg-slate border border-oro/30 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Gift size={11} className="text-oro" />
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Uscita annua {annoRif}</p>
                            </div>
                            <p className="font-display text-2xl text-oro">{fmtCHF(uscitaAnnua)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                                {bonusAnno > 0
                                    ? `pro-rata salari + ${fmtCHF(bonusAnno)} bonus`
                                    : 'pro-rata mesi lavorati'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : dipendenti.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
                    <Users size={32} className="text-nebbia/15" />
                    <div>
                        <p className="font-body text-sm text-nebbia/40">Nessun dipendente registrato</p>
                        <p className="font-body text-xs text-nebbia/25 mt-1">
                            Aggiungi il personale dell'azienda per poterci ragionare con Lex
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Nome', 'Ruolo', 'Tipo', 'Impiego', 'Salario', 'Fonte', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dipendenti.map(d => {
                                const salario = fmtSalario(d)
                                const cessato = d.data_fine && new Date(d.data_fine) < new Date()
                                return (
                                    <tr key={d.id}
                                        onClick={() => setModal({ mode: 'modifica', dipendente: d })}
                                        className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-body text-sm font-medium text-nebbia">
                                                    {d.nome} {d.cognome}
                                                </span>
                                                {cessato && (
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 border border-white/10 text-nebbia/30">Cessato</span>
                                                )}
                                            </div>
                                            {d.numero_avs && (
                                                <p className="font-body text-[10px] text-nebbia/25 mt-0.5">{d.numero_avs}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50">{d.ruolo ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {d.is_dipendente && (
                                                    <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-oro/30 text-oro">
                                                        <Briefcase size={9} /> Dipendente
                                                    </span>
                                                )}
                                                {d.is_socio && (
                                                    <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-salvia/30 text-salvia">
                                                        <Building2 size={9} /> Socio{d.quota_partecipazione ? ` ${d.quota_partecipazione}%` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50">
                                            {d.percentuale_impiego ? `${d.percentuale_impiego}%` : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                            {salario ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.imposta_fonte
                                                ? <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-amber-400/30 text-amber-400">
                                                    <Globe size={9} /> {d.tipo_permesso ?? 'Sì'}
                                                </span>
                                                : <span className="font-body text-xs text-nebbia/20">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setModal({ mode: 'modifica', dipendente: d }) }}
                                                    title="Modifica"
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/30 hover:text-oro hover:bg-oro/10 transition-colors">
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDaEliminare(d) }}
                                                    title="Elimina"
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal crea/modifica */}
            {modal && (
                <FormDipendente
                    clienteId={clienteId}
                    dipendente={modal.mode === 'modifica' ? modal.dipendente : null}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); carica() }}
                    onBonusCambiato={carica}
                />
            )}

            {/* Conferma eliminazione */}
            {daEliminare && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => { if (!eliminando) setDaEliminare(null) }}>
                    <div className="bg-slate border border-red-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Trash2 size={16} className="text-red-400" />
                            <h2 className="font-display text-lg text-nebbia">Elimina dipendente</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                Eliminare <span className="text-nebbia font-medium">{daEliminare.nome} {daEliminare.cognome}</span> dall'anagrafica?
                                L'operazione è irreversibile.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setDaEliminare(null)} disabled={eliminando}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                                    Annulla
                                </button>
                                <button onClick={eliminaConferma} disabled={eliminando}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                    {eliminando
                                        ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                        : <><Trash2 size={14} /> Elimina</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}