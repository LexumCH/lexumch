// src/pages/fiduciario/Dashboard.jsx
//
// Dashboard del fiduciario: quadro generale dello studio (tutti i clienti).
// Aggrega: clienti, mandati attivi, monte salari, conto economico (movimenti
// effettivi dell'anno), scadenze imminenti/scadute, e una vista per cliente.
// Solo dati esistenti, nessun nuovo SQL.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users, FolderOpen, Wallet, Scale, CalendarClock, AlertTriangle,
    TrendingUp, TrendingDown, ChevronRight,
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
        if (ids.length === 0) { setDati({ clienti: [], mandati: [], scadenze: [], movimenti: [], dip: [] }); setLoading(false); return }

        const [{ data: mandati }, { data: scadenze }, { data: movimenti }, { data: dip }] = await Promise.all([
            supabase.from('mandati').select('id, cliente_id, stato').in('cliente_id', ids),
            supabase.from('scadenze_fiduciarie').select('id, cliente_id, mandato_id, titolo, tipo, data_scadenza, stato').in('cliente_id', ids).eq('stato', 'in_corso').order('data_scadenza', { ascending: true }),
            supabase.from('movimenti').select('cliente_id, tipo, importo, data, stato').in('cliente_id', ids).gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`),
            supabase.from('clienti_dipendenti').select('cliente_id, salario, salario_periodicita, is_socio, is_dipendente, data_fine').in('cliente_id', ids),
        ])
        setDati({
            clienti: clienti ?? [],
            mandati: mandati ?? [],
            scadenze: scadenze ?? [],
            movimenti: (movimenti ?? []).filter(m => (m.stato ?? 'effettivo') === 'effettivo'),
            dip: dip ?? [],
        })
        setLoading(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    )

    const D = dati ?? { clienti: [], mandati: [], scadenze: [], movimenti: [], dip: [] }
    const oggi = oggiISO()
    const nomeById = Object.fromEntries(D.clienti.map(c => [c.id, nomeCliente(c)]))

    const mandatiAttivi = D.mandati.filter(m => m.stato === 'attivo').length

    const attivi = D.dip.filter(d => (d.is_dipendente || d.is_socio) && (!d.data_fine || d.data_fine >= oggi))
    const monteSalari = attivi.reduce((t, d) => t + annualizza(d.salario, d.salario_periodicita), 0)
    const salariByCliente = {}
    attivi.forEach(d => { salariByCliente[d.cliente_id] = (salariByCliente[d.cliente_id] || 0) + annualizza(d.salario, d.salario_periodicita) })

    const entrate = D.movimenti.filter(m => m.tipo === 'entrata').reduce((t, m) => t + Number(m.importo || 0), 0)
    const costi = D.movimenti.filter(m => m.tipo === 'uscita').reduce((t, m) => t + Number(m.importo || 0), 0)
    const saldo = entrate - costi - monteSalari

    const scadute = D.scadenze.filter(s => s.data_scadenza && s.data_scadenza < oggi)
    const prossime = D.scadenze.filter(s => s.data_scadenza && s.data_scadenza >= oggi).slice(0, 8)

    const perCliente = D.clienti.map(c => {
        const me = D.movimenti.filter(m => m.cliente_id === c.id)
        const e = me.filter(m => m.tipo === 'entrata').reduce((t, m) => t + Number(m.importo || 0), 0)
        const u = me.filter(m => m.tipo === 'uscita').reduce((t, m) => t + Number(m.importo || 0), 0)
        const sal = salariByCliente[c.id] || 0
        return { id: c.id, nome: nomeById[c.id], entrate: e, costi: u, stipendi: sal, saldo: e - u - sal }
    }).filter(r => r.entrate || r.costi || r.stipendi).sort((a, b) => a.saldo - b.saldo).slice(0, 15)

    const linkScad = (s) => s.mandato_id ? `/banco-lavoro/${s.mandato_id}` : `/clienti/${s.cliente_id}`

    return (
        <div className="space-y-6 pb-20">
            <div>
                <p className="section-label"><Scale size={11} className="inline" /> Studio fiduciario</p>
                <h1 className="font-display text-3xl text-nebbia leading-tight">Quadro generale{nome ? `, ${nome}` : ''}</h1>
                <p className="font-body text-sm text-nebbia/40 mt-1">Anno {anno} · {D.clienti.length} {D.clienti.length === 1 ? 'cliente' : 'clienti'}</p>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi icon={Users} label="Clienti" value={D.clienti.length} />
                <Kpi icon={FolderOpen} label="Mandati attivi" value={mandatiAttivi} />
                <Kpi icon={Wallet} label={`Monte salari ${anno}`} value={fmtCHF(monteSalari)} small />
                <Kpi icon={Scale} label={`Saldo ${anno}`} value={fmtCHF(saldo)} small accent={saldo >= 0 ? 'salvia' : 'red'} />
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
                            <Link key={s.id} to={linkScad(s)} className="flex items-center justify-between gap-3 group">
                                <span className="font-body text-xs text-nebbia/70 truncate">{s.titolo} · <span className="text-nebbia/40">{nomeById[s.cliente_id] ?? '—'}</span></span>
                                <span className="font-body text-xs text-red-400/80 shrink-0">{new Date(s.data_scadenza).toLocaleDateString('it-CH')}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Prossime scadenze */}
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarClock size={15} className="text-oro/60" />
                        <p className="section-label !m-0">Prossime scadenze</p>
                    </div>
                    {prossime.length === 0 ? (
                        <p className="font-body text-xs text-nebbia/30 italic">Nessuna scadenza in arrivo.</p>
                    ) : (
                        <div className="space-y-2">
                            {prossime.map(s => {
                                const gg = giorniA(s.data_scadenza)
                                return (
                                    <Link key={s.id} to={linkScad(s)} className="flex items-center justify-between gap-3 p-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors group">
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

                {/* Conto economico studio */}
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={15} className="text-oro/60" />
                        <p className="section-label !m-0">Conto economico studio {anno}</p>
                    </div>
                    <div className="space-y-2.5">
                        <Riga label="Entrate" value={fmtCHF(entrate)} accent="salvia" icon={TrendingUp} />
                        <Riga label="Costi registrati" value={fmtCHF(costi)} accent="oro" icon={TrendingDown} />
                        <Riga label="Stipendi (annuo)" value={fmtCHF(monteSalari)} accent="oro" icon={Wallet} />
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                            <span className="font-body text-sm text-nebbia/60 uppercase tracking-widest text-[11px]">Saldo</span>
                            <span className={`font-display text-xl ${saldo >= 0 ? 'text-salvia' : 'text-red-400'}`}>{fmtCHF(saldo)}</span>
                        </div>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/25 mt-3">Solo movimenti effettivi dell'anno; stipendi annualizzati dai dipendenti attivi.</p>
                </div>
            </div>

            {/* Per cliente */}
            {perCliente.length > 0 && (
                <div className="bg-slate border border-white/5">
                    <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                        <Users size={14} className="text-oro/60" />
                        <p className="section-label !m-0">Conto economico per cliente {anno}</p>
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

function Riga({ label, value, accent, icon: Icon }) {
    const col = accent === 'salvia' ? 'text-salvia' : 'text-oro'
    return (
        <div className="flex items-center justify-between">
            <span className={`font-body text-xs flex items-center gap-1.5 ${col}/80`}><Icon size={12} /> {label}</span>
            <span className="font-display text-base text-nebbia">{value}</span>
        </div>
    )
}
