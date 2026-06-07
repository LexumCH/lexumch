// src/pages/fiduciario/Dashboard.jsx
//
// Dashboard del fiduciario: quadro generale dello STUDIO (non di un cliente).
// Centro = lo studio e ciò che il fiduciario deve fare:
//   - portfolio: clienti, mandati attivi
//   - agenda: scadenze (di tutti i clienti) scadute + prossime, prossimi appuntamenti
//   - soldi DELLO studio: fatturazione ai clienti (fatturato/incassato/da incassare/scaduto)
//   - conto economico PER CLIENTE (per-cliente, MAI sommato): salute di ogni cliente
// Nessuna somma dei libri dei clienti (ogni cliente è a sé). Nessun nuovo SQL.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users, FolderOpen, Receipt, CalendarClock, CalendarDays, AlertTriangle,
    TrendingUp, TrendingDown, Wallet, ChevronRight, Scale,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtCHF } from '@/lib/calcoloSalari'

const oggiISO = () => new Date().toISOString().slice(0, 10)
function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}
function annualizza(s, periodicita) {
    const n = Number(s) || 0
    return periodicita === 'mensile' ? n * 12 : n
}
function giorniA(dataIso) {
    const d = new Date(dataIso); d.setHours(0, 0, 0, 0)
    const o = new Date(); o.setHours(0, 0, 0, 0)
    return Math.round((d - o) / 86400000)
}

export default function FiduciarioDashboard() {
    const annoCorr = new Date().getFullYear()
    const [anno] = useState(annoCorr)
    const [loading, setLoading] = useState(true)
    const [dati, setDati] = useState(null)
    const [nome, setNome] = useState('')

    useEffect(() => { carica() }, [])

    async function carica() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data: prof } = await supabase.from('profiles').select('titolare_id, nome').eq('id', user.id).single()
        setNome(prof?.nome ?? '')
        const titolareId = prof?.titolare_id ?? user.id
        const { data: collab } = await supabase.from('profiles').select('id').eq('titolare_id', titolareId)
        const profIds = [titolareId, ...(collab ?? []).map(c => c.id)]

        const { data: clienti } = await supabase.from('profiles')
            .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
            .eq('role', 'cliente').in('avvocato_id', profIds)
        const ids = (clienti ?? []).map(c => c.id)
        const vuoto = { clienti: clienti ?? [], mandati: [], scadenze: [], appuntamenti: [], fatture: [], movimenti: [], dip: [] }
        if (ids.length === 0) { setDati(vuoto); setLoading(false); return }

        const nowIso = new Date().toISOString()
        const [
            { data: mandati }, { data: scadenze }, { data: appuntamenti },
            { data: fatture }, { data: movimenti }, { data: dip },
        ] = await Promise.all([
            supabase.from('mandati').select('id, cliente_id, stato').in('cliente_id', ids),
            supabase.from('scadenze_fiduciarie').select('id, cliente_id, mandato_id, titolo, tipo, data_scadenza, stato').in('cliente_id', ids).eq('stato', 'in_corso').order('data_scadenza', { ascending: true }),
            supabase.from('appuntamenti').select('id, titolo, tipo, stato, data_ora_inizio, cliente_id').in('avvocato_id', profIds).gte('data_ora_inizio', nowIso).order('data_ora_inizio', { ascending: true }).limit(12),
            supabase.from('fatture').select('cliente_id, totale, stato, data_emissione, data_scadenza, data_pagamento').in('cliente_id', ids).neq('stato', 'annullata'),
            supabase.from('movimenti').select('cliente_id, tipo, importo, data, stato').in('cliente_id', ids).gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`),
            supabase.from('clienti_dipendenti').select('cliente_id, salario, salario_periodicita, is_socio, is_dipendente, data_fine').in('cliente_id', ids),
        ])
        setDati({
            clienti: clienti ?? [],
            mandati: mandati ?? [],
            scadenze: scadenze ?? [],
            appuntamenti: (appuntamenti ?? []).filter(a => a.tipo !== 'scadenza' && a.stato !== 'annullato'),
            fatture: fatture ?? [],
            movimenti: (movimenti ?? []).filter(m => (m.stato ?? 'effettivo') === 'effettivo'),
            dip: dip ?? [],
        })
        setLoading(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    )

    const D = dati ?? { clienti: [], mandati: [], scadenze: [], appuntamenti: [], fatture: [], movimenti: [], dip: [] }
    const oggi = oggiISO()
    const nomeById = Object.fromEntries(D.clienti.map(c => [c.id, nomeCliente(c)]))

    const mandatiAttivi = D.mandati.filter(m => m.stato === 'attivo').length

    // ── Fatturazione DELLO studio (i suoi soldi) ──
    const inAnnoEm = (f) => f.data_emissione && f.data_emissione >= `${anno}-01-01` && f.data_emissione <= `${anno}-12-31`
    const fatturato = D.fatture.filter(inAnnoEm).reduce((t, f) => t + Number(f.totale || 0), 0)
    const incassato = D.fatture.filter(f => f.stato === 'pagata' && inAnnoEm(f)).reduce((t, f) => t + Number(f.totale || 0), 0)
    const daIncassare = D.fatture.filter(f => f.stato === 'in_attesa' && (!f.data_scadenza || f.data_scadenza >= oggi)).reduce((t, f) => t + Number(f.totale || 0), 0)
    const scaduto = D.fatture.filter(f => f.stato === 'scaduta' || (f.stato === 'in_attesa' && f.data_scadenza && f.data_scadenza < oggi)).reduce((t, f) => t + Number(f.totale || 0), 0)

    // ── Agenda ──
    const scadute = D.scadenze.filter(s => s.data_scadenza && s.data_scadenza < oggi)
    const prossimeScad = D.scadenze.filter(s => s.data_scadenza && s.data_scadenza >= oggi).slice(0, 6)
    const prossimiApp = D.appuntamenti.slice(0, 6)
    const linkScad = (s) => s.mandato_id ? `/banco-lavoro/${s.mandato_id}` : `/clienti/${s.cliente_id}`

    // ── Conto economico PER CLIENTE (per-cliente, mai sommato) ──
    const attivi = D.dip.filter(d => (d.is_dipendente || d.is_socio) && (!d.data_fine || d.data_fine >= oggi))
    const salByCli = {}
    attivi.forEach(d => { salByCli[d.cliente_id] = (salByCli[d.cliente_id] || 0) + annualizza(d.salario, d.salario_periodicita) })
    const perCliente = D.clienti.map(c => {
        const me = D.movimenti.filter(m => m.cliente_id === c.id)
        const e = me.filter(m => m.tipo === 'entrata').reduce((t, m) => t + Number(m.importo || 0), 0)
        const u = me.filter(m => m.tipo === 'uscita').reduce((t, m) => t + Number(m.importo || 0), 0)
        const sal = salByCli[c.id] || 0
        return { id: c.id, nome: nomeById[c.id], entrate: e, costi: u, stipendi: sal, saldo: e - u - sal }
    }).filter(r => r.entrate || r.costi || r.stipendi).sort((a, b) => a.saldo - b.saldo).slice(0, 15)

    return (
        <div className="space-y-6 pb-20">
            <div>
                <p className="section-label"><Scale size={11} className="inline" /> Studio fiduciario</p>
                <h1 className="font-display text-3xl text-nebbia leading-tight">Quadro generale{nome ? `, ${nome}` : ''}</h1>
                <p className="font-body text-sm text-nebbia/40 mt-1">Anno {anno} · {D.clienti.length} {D.clienti.length === 1 ? 'cliente' : 'clienti'}</p>
            </div>

            {/* KPI studio: portfolio + soldi dello studio */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi icon={Users} label="Clienti" value={D.clienti.length} />
                <Kpi icon={FolderOpen} label="Mandati attivi" value={mandatiAttivi} />
                <Kpi icon={Receipt} label={`Fatturato ${anno}`} value={fmtCHF(fatturato)} small />
                <Kpi icon={Wallet} label="Da incassare" value={fmtCHF(daIncassare)} small accent={scaduto > 0 ? 'red' : 'nebbia'} />
            </div>

            {/* Scadute */}
            {scadute.length > 0 && (
                <div className="bg-red-900/10 border border-red-500/25 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={15} className="text-red-400" />
                        <p className="font-body text-sm font-medium text-red-400">{scadute.length} {scadute.length === 1 ? 'scadenza scaduta' : 'scadenze scadute'}</p>
                    </div>
                    <div className="space-y-1.5">
                        {scadute.slice(0, 6).map(s => (
                            <Link key={s.id} to={linkScad(s)} className="flex items-center justify-between gap-3">
                                <span className="font-body text-xs text-nebbia/70 truncate">{s.titolo} · <span className="text-nebbia/40">{nomeById[s.cliente_id] ?? '—'}</span></span>
                                <span className="font-body text-xs text-red-400/80 shrink-0">{new Date(s.data_scadenza).toLocaleDateString('it-CH')}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Agenda: scadenze + appuntamenti */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarClock size={15} className="text-oro/60" />
                        <p className="section-label !m-0">Prossime scadenze</p>
                    </div>
                    {prossimeScad.length === 0 ? (
                        <p className="font-body text-xs text-nebbia/30 italic">Nessuna scadenza in arrivo.</p>
                    ) : (
                        <div className="space-y-2">
                            {prossimeScad.map(s => {
                                const gg = giorniA(s.data_scadenza)
                                return (
                                    <Link key={s.id} to={linkScad(s)} className="flex items-center justify-between gap-3 p-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors">
                                        <div className="min-w-0">
                                            <p className="font-body text-sm text-nebbia truncate">{s.titolo}</p>
                                            <p className="font-body text-[11px] text-nebbia/35 truncate">{nomeById[s.cliente_id] ?? '—'}{s.tipo ? ` · ${s.tipo}` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-body text-xs text-nebbia/60">{new Date(s.data_scadenza).toLocaleDateString('it-CH')}</p>
                                            <p className={`font-body text-[10px] ${gg <= 7 ? 'text-oro' : 'text-nebbia/30'}`}>{gg === 0 ? 'oggi' : `tra ${gg} gg`}</p>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarDays size={15} className="text-oro/60" />
                        <p className="section-label !m-0">Prossimi appuntamenti</p>
                    </div>
                    {prossimiApp.length === 0 ? (
                        <p className="font-body text-xs text-nebbia/30 italic">Nessun appuntamento in programma.</p>
                    ) : (
                        <div className="space-y-2">
                            {prossimiApp.map(a => {
                                const d = new Date(a.data_ora_inizio)
                                return (
                                    <Link key={a.id} to="/calendario" className="flex items-center justify-between gap-3 p-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors">
                                        <div className="min-w-0">
                                            <p className="font-body text-sm text-nebbia truncate">{a.titolo ?? '(senza titolo)'}</p>
                                            <p className="font-body text-[11px] text-nebbia/35 truncate">{a.cliente_id ? (nomeById[a.cliente_id] ?? '—') : 'studio'}{a.tipo ? ` · ${a.tipo}` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-body text-xs text-nebbia/60">{d.toLocaleDateString('it-CH')}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{d.toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Fatturazione DELLO studio (i suoi soldi) */}
            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Receipt size={15} className="text-oro/60" />
                    <p className="section-label !m-0">Studio — fatturazione {anno}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MiniStat label="Fatturato" value={fmtCHF(fatturato)} />
                    <MiniStat label="Incassato" value={fmtCHF(incassato)} accent="salvia" />
                    <MiniStat label="Da incassare" value={fmtCHF(daIncassare)} />
                    <MiniStat label="Scaduto" value={fmtCHF(scaduto)} accent={scaduto > 0 ? 'red' : 'nebbia'} />
                </div>
                <p className="font-body text-[11px] text-nebbia/25 mt-3">Fatture emesse dallo studio ai clienti (i ricavi dello studio). Niente a che vedere con i conti economici dei singoli clienti.</p>
            </div>

            {/* Conto economico PER CLIENTE (ogni cliente a sé) */}
            {perCliente.length > 0 && (
                <div className="bg-slate border border-white/5">
                    <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                        <Users size={14} className="text-oro/60" />
                        <p className="section-label !m-0">Conto economico per cliente {anno}</p>
                        <span className="font-body text-[10px] text-nebbia/30 ml-1">— ogni cliente è a sé, non sommato</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/5">
                                {['Cliente', 'Entrate', 'Costi', 'Stipendi', 'Saldo', ''].map((h, i) => (
                                    <th key={h} className={`px-4 py-2.5 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : i === 5 ? '' : 'text-right'}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {perCliente.map(r => (
                                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-2.5"><Link to={`/clienti/${r.id}`} className="font-body text-sm text-nebbia hover:text-oro transition-colors">{r.nome}</Link></td>
                                        <td className="px-4 py-2.5 text-right font-body text-xs text-salvia/80">{r.entrate ? fmtCHF(r.entrate) : '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-body text-xs text-oro/70">{r.costi ? fmtCHF(r.costi) : '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-body text-xs text-oro/70">{r.stipendi ? fmtCHF(r.stipendi) : '—'}</td>
                                        <td className={`px-4 py-2.5 text-right font-display text-sm ${r.saldo >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(r.saldo)}</td>
                                        <td className="px-4 py-2.5 text-right"><Link to={`/clienti/${r.id}`} className="text-nebbia/20 hover:text-oro transition-colors"><ChevronRight size={14} /></Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function Kpi({ icon: Icon, label, value, small = false, accent = 'nebbia' }) {
    const col = accent === 'salvia' ? 'text-salvia' : accent === 'red' ? 'text-red-400' : 'text-nebbia'
    return (
        <div className="bg-slate border border-white/5 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={11} className="text-oro/60" />
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate">{label}</p>
            </div>
            <p className={`font-display ${small ? 'text-lg' : 'text-2xl'} ${col}`}>{value}</p>
        </div>
    )
}

function MiniStat({ label, value, accent = 'nebbia' }) {
    const col = accent === 'salvia' ? 'text-salvia' : accent === 'red' ? 'text-red-400' : 'text-nebbia'
    return (
        <div className="bg-petrolio border border-white/5 p-3">
            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{label}</p>
            <p className={`font-display text-lg ${col}`}>{value}</p>
        </div>
    )
}
