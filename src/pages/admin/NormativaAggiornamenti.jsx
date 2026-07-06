import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard } from '@/components/shared'
import { Loader2, Play, History, Flag, Landmark, CheckCircle2, AlertTriangle } from 'lucide-react'

const PAGINA = 25

const ESITO_STYLE = {
    aggiornato:   { label: 'Aggiornato',   cls: 'text-salvia border-salvia/30 bg-salvia/10', icon: CheckCircle2 },
    nuovo:        { label: 'Nuovo',        cls: 'text-oro border-oro/30 bg-oro/10', icon: CheckCircle2 },
    invariato:    { label: 'Invariato',    cls: 'text-nebbia/50 border-white/10 bg-white/5', icon: CheckCircle2 },
    abrogato:     { label: 'Abrogato',     cls: 'text-orange-300 border-orange-300/30 bg-orange-300/10', icon: AlertTriangle },
    rimosso:      { label: 'Rimosso',      cls: 'text-orange-300 border-orange-300/30 bg-orange-300/10', icon: AlertTriangle },
    file_assente: { label: 'File assente', cls: 'text-nebbia/40 border-white/10 bg-white/5', icon: AlertTriangle },
    errore:       { label: 'Da rivedere',  cls: 'text-red-400 border-red-400/30 bg-red-400/10', icon: AlertTriangle },
}

export default function NormativaAggiornamentiCH() {
    const [righe, setRighe] = useState([])
    const [totale, setTotale] = useState(0)
    const [pagina, setPagina] = useState(0)
    const [stats, setStats] = useState({ ultimo: null, aggiornati: 0, invariati: 0, errori: 0 })
    const [richiestaPendente, setRichiestaPendente] = useState(null)
    const [inviando, setInviando] = useState(false)
    const [msg, setMsg] = useState(null)
    const [loading, setLoading] = useState(true)

    async function caricaTutto() {
        setLoading(true)
        try {
            const q = supabase.from('norme_ch_aggiornamenti')
                .select('id, ambito, eli_uri, rs_numero, titolo, versione_eli, esito, n_nuovo, n_modificato, n_rimosso, n_invariato, messaggio, eseguito_il', { count: 'exact' })
                .order('eseguito_il', { ascending: false })
                .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1)
            const { data, count } = await q
            setRighe(data ?? [])
            setTotale(count ?? 0)

            const da = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
            const conta = async (esiti) => {
                const { count: c } = await supabase.from('norme_ch_aggiornamenti')
                    .select('id', { count: 'exact', head: true })
                    .in('esito', esiti).gte('eseguito_il', da)
                return c ?? 0
            }
            const { count: apertiOra } = await supabase.from('norme_ch_aggiornamenti_ultimo')
                .select('id', { count: 'exact', head: true }).eq('esito', 'errore')
            const { data: ultimoRow } = await supabase.from('norme_ch_aggiornamenti')
                .select('eseguito_il').order('eseguito_il', { ascending: false }).limit(1)
            setStats({
                ultimo: ultimoRow?.[0]?.eseguito_il ?? null,
                aggiornati: await conta(['aggiornato', 'nuovo']),
                invariati: await conta(['invariato']),
                errori: apertiOra ?? 0,
            })

            const { data: rich } = await supabase.from('norme_ch_update_richieste')
                .select('id, stato, richiesta_il, fase, progresso, aggiornato_il')
                .in('stato', ['in_attesa', 'in_corso'])
                .order('richiesta_il', { ascending: false }).limit(1)
            setRichiestaPendente(rich?.[0] ?? null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { caricaTutto() }, [pagina])

    // avanzamento in diretta mentre un aggiornamento e' in coda/in corso
    useEffect(() => {
        if (!richiestaPendente) return
        const t = setInterval(() => { caricaTutto() }, 5000)
        return () => clearInterval(t)
    }, [richiestaPendente?.id])

    async function richiediAggiornamento() {
        setInviando(true); setMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('norme_ch_update_richieste')
                .insert({ richiesta_da: user?.id, nota: 'richiesta dal pannello admin' })
            if (error) throw error
            setMsg({ ok: true, testo: 'Richiesta inviata: l\'aggiornamento partirà al prossimo controllo (entro ~30 minuti).' })
            await caricaTutto()
        } catch (e) {
            setMsg({ ok: false, testo: `Errore: ${e.message}` })
        } finally {
            setInviando(false)
        }
    }

    const fmtData = (iso) => iso ? new Date(iso).toLocaleString('it-CH', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—'

    const titoloRiga = (r) => r.titolo || r.rs_numero ||
        (r.eli_uri ? r.eli_uri.split('admin.ch/').pop() : '—')

    return (
        <div className="space-y-5">
            <PageHeader label="Admin" title="Aggiornamenti normativa"
                subtitle="Registro delle sincronizzazioni con Fedlex: cosa è cambiato e quando" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Ultimo aggiornamento" value={fmtData(stats.ultimo)} colorClass="text-oro" />
                <StatCard label="Atti aggiornati (30gg)" value={stats.aggiornati} colorClass="text-salvia" />
                <StatCard label="Verificati invariati (30gg)" value={stats.invariati} colorClass="text-nebbia" />
                <StatCard label="Da rivedere (aperti ora)" value={stats.errori}
                    colorClass={stats.errori > 0 ? 'text-red-400' : 'text-salvia'} />
            </div>

            <div className="flex items-center gap-4 bg-slate border border-white/5 p-4">
                {richiestaPendente ? (
                    <div className="flex flex-col gap-1 text-oro font-body text-sm">
                        <div className="flex items-center gap-2">
                            <Loader2 size={15} className="animate-spin" />
                            Aggiornamento {richiestaPendente.stato === 'in_corso' ? 'in corso' : 'in coda'}
                            <span className="text-nebbia/40">(richiesto il {fmtData(richiestaPendente.richiesta_il)})</span>
                        </div>
                        {richiestaPendente.stato === 'in_corso' && richiestaPendente.fase && (
                            <div className="pl-6 text-xs text-nebbia/60">
                                {richiestaPendente.fase}
                                {richiestaPendente.progresso ? ` — ${richiestaPendente.progresso}` : ''}
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={richiediAggiornamento} disabled={inviando}
                        className="flex items-center gap-2 px-4 py-2 font-body text-sm bg-oro/10 text-oro border border-oro/30 hover:bg-oro/20 transition-colors disabled:opacity-50">
                        {inviando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Lancia aggiornamento
                    </button>
                )}
                {msg && (
                    <span className={`font-body text-xs ${msg.ok ? 'text-salvia' : 'text-red-400'}`}>{msg.testo}</span>
                )}
            </div>

            <div className="bg-slate border border-white/5">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 font-body text-xs text-nebbia/40 uppercase tracking-wider">
                            <th className="px-4 py-3">Quando</th>
                            <th className="px-4 py-3">Atto</th>
                            <th className="px-4 py-3">Esito</th>
                            <th className="px-4 py-3 text-right">Nuovi</th>
                            <th className="px-4 py-3 text-right">Modificati</th>
                            <th className="px-4 py-3 text-right">Rimossi</th>
                            <th className="px-4 py-3">Note</th>
                        </tr>
                    </thead>
                    <tbody className="font-body text-sm">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-nebbia/40">
                                <Loader2 size={18} className="animate-spin inline" /></td></tr>
                        ) : righe.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-nebbia/40">
                                Nessun aggiornamento registrato.</td></tr>
                        ) : righe.map(r => {
                            const st = ESITO_STYLE[r.esito] ?? ESITO_STYLE.errore
                            const AmbitoIcon = r.ambito === 'cantonale' ? Landmark : Flag
                            return (
                                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-nebbia/60 whitespace-nowrap">{fmtData(r.eseguito_il)}</td>
                                    <td className="px-4 py-3 text-nebbia max-w-[320px]">
                                        <span className="flex items-center gap-2">
                                            <AmbitoIcon size={12} className="text-nebbia/30 shrink-0" />
                                            <span className="truncate" title={titoloRiga(r)}>
                                                {r.rs_numero && <span className="text-oro/70 mr-2">{r.rs_numero}</span>}
                                                {titoloRiga(r)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-xs ${st.cls}`}>
                                            <st.icon size={11} /> {st.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-oro/80">{r.n_nuovo || ''}</td>
                                    <td className="px-4 py-3 text-right text-salvia/80">{r.n_modificato || ''}</td>
                                    <td className="px-4 py-3 text-right text-orange-300/80">{r.n_rimosso || ''}</td>
                                    <td className="px-4 py-3 text-nebbia/40 text-xs max-w-[260px] truncate" title={r.messaggio}>
                                        {r.messaggio}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {totale > PAGINA && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 font-body text-xs text-nebbia/40">
                        <span>{totale} registrazioni</span>
                        <span className="flex gap-2">
                            <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}
                                className="px-2 py-1 border border-white/10 disabled:opacity-30 hover:bg-white/5">←</button>
                            <span className="px-2 py-1">pag. {pagina + 1} / {Math.ceil(totale / PAGINA)}</span>
                            <button disabled={(pagina + 1) * PAGINA >= totale} onClick={() => setPagina(p => p + 1)}
                                className="px-2 py-1 border border-white/10 disabled:opacity-30 hover:bg-white/5">→</button>
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
