// src/pages/avvocato/Assistenza.jsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader, BackButton, Badge, InputField, TextareaField } from '@/components/shared'
import { Plus, Send, Search, AlertCircle, X, User, Building2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const ALIAS_ADMIN_NOME = 'Lexum'
const ALIAS_ADMIN_INIZIALE = 'L'

function displayNome(profilo, ruoloFallback = null) {
    const ruolo = profilo?.role ?? ruoloFallback
    if (ruolo === 'admin') return ALIAS_ADMIN_NOME
    if (!profilo) return '—'
    return `${profilo.nome ?? ''} ${profilo.cognome ?? ''}`.trim() || '—'
}

function ModalNuovoTicketCliente({ onClose, onCreato }) {
    const { t } = useTranslation('avv_assistenza')
    const [titolo, setTitolo] = useState('')
    const [cerca, setCerca] = useState('')
    const [clienti, setClienti] = useState([])
    const [clienteSel, setClienteSel] = useState(null)
    const [loadingClienti, setLoadingClienti] = useState(true)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [creando, setCreando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // Carica clienti dell'avvocato
    useEffect(() => {
        async function caricaClienti() {
            setLoadingClienti(true)
            const { data: { user } } = await supabase.auth.getUser()

            // Recupera anche i clienti dei collaboratori (se sei titolare di studio)
            const { data: profilo } = await supabase
                .from('profiles').select('posti_acquistati').eq('id', user.id).single()

            let avvIds = [user.id]
            if ((profilo?.posti_acquistati ?? 1) > 1) {
                const { data: collabs } = await supabase
                    .from('profiles').select('id').eq('titolare_id', user.id)
                avvIds = [user.id, ...(collabs ?? []).map(c => c.id)]
            }

            const { data } = await supabase
                .from('profiles')
                .select('id, nome, cognome, ragione_sociale, tipo_soggetto, email')
                .eq('role', 'cliente')
                .in('avvocato_id', avvIds)
                .order('cognome', { ascending: true, nullsFirst: false })

            setClienti(data ?? [])
            setLoadingClienti(false)
        }
        caricaClienti()
    }, [])

    function nomeCliente(c) {
        if (!c) return ''
        if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
        return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
    }

    const clientiFiltrati = clienti.filter(c => {
        if (!cerca.trim()) return true
        const q = cerca.toLowerCase()
        return nomeCliente(c).toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
    })

    async function handleCrea() {
        setErrore('')
        if (!clienteSel) return setErrore(t('modal_cliente.err_seleziona_cliente'))
        if (!titolo.trim()) return setErrore(t('modal_cliente.err_titolo_obbligatorio'))

        setCreando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: ticket, error } = await supabase
                .from('ticket_assistenza')
                .insert({
                    mittente_id: user.id,
                    destinatario_id: clienteSel.id,
                    oggetto: titolo.trim(),
                    mittente_ruolo: 'avvocato',
                    stato: 'aperto',
                    ultimo_mittente: 'avvocato',
                })
                .select()
                .single()
            if (error) throw new Error(error.message)
            onCreato(ticket.id)
        } catch (err) {
            setErrore(err.message)
            setCreando(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-lg my-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Plus size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">{t('modal_cliente.titolo')}</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Cliente — dropdown con cerca */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                            {t('modal_cliente.label_cliente')}
                        </label>

                        {clienteSel ? (
                            <div className="flex items-center justify-between bg-petrolio border border-oro/30 px-4 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    {clienteSel.tipo_soggetto === 'persona_giuridica'
                                        ? <Building2 size={13} className="text-oro shrink-0" />
                                        : <User size={13} className="text-oro shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <p className="font-body text-sm text-nebbia truncate">{nomeCliente(clienteSel)}</p>
                                        <p className="font-body text-xs text-nebbia/40 truncate">{clienteSel.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setClienteSel(null); setCerca(''); setDropdownOpen(true) }}
                                    className="text-nebbia/30 hover:text-red-400 transition-colors shrink-0 ml-2"
                                    title={t('modal_cliente.rimuovi')}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                                <input
                                    value={cerca}
                                    onChange={e => { setCerca(e.target.value); setDropdownOpen(true) }}
                                    onFocus={() => setDropdownOpen(true)}
                                    placeholder={t('modal_cliente.cerca_placeholder')}
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />

                                {dropdownOpen && (
                                    <div className="absolute z-10 left-0 right-0 mt-1 bg-slate border border-white/10 max-h-60 overflow-y-auto shadow-xl">
                                        {loadingClienti ? (
                                            <div className="flex justify-center py-6">
                                                <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                            </div>
                                        ) : clientiFiltrati.length === 0 ? (
                                            <p className="font-body text-xs text-nebbia/40 text-center py-6 px-4">
                                                {cerca ? t('modal_cliente.nessun_cliente_trovato') : t('modal_cliente.nessun_cliente_disponibile')}
                                            </p>
                                        ) : (
                                            clientiFiltrati.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setClienteSel(c); setDropdownOpen(false); setCerca('') }}
                                                    className="w-full text-left px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-oro/10 transition-colors flex items-center gap-2"
                                                >
                                                    {c.tipo_soggetto === 'persona_giuridica'
                                                        ? <Building2 size={12} className="text-nebbia/40 shrink-0" />
                                                        : <User size={12} className="text-nebbia/40 shrink-0" />
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="font-body text-sm text-nebbia truncate">{nomeCliente(c)}</p>
                                                        <p className="font-body text-xs text-nebbia/40 truncate">{c.email}</p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Titolo */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                            {t('modal_cliente.label_titolo')}
                        </label>
                        <input
                            value={titolo}
                            onChange={e => setTitolo(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && titolo.trim() && clienteSel && !creando) handleCrea() }}
                            placeholder={t('modal_cliente.titolo_placeholder')}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        <p className="font-body text-xs text-nebbia/25 mt-2">
                            {t('modal_cliente.hint_primo_messaggio')}
                        </p>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            disabled={creando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            {t('modal_cliente.annulla')}
                        </button>
                        <button
                            onClick={handleCrea}
                            disabled={creando || !clienteSel || !titolo.trim()}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {creando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Check size={14} /> {t('modal_cliente.apri_ticket')}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// LISTA TICKET
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenza() {
    const { t, i18n } = useTranslation('avv_assistenza')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const [tab, setTab] = useState('clienti')
    const [meId, setMeId] = useState(null)
    const [ids, setIds] = useState([])           // [meId, ...collaboratoriIds]
    const [ticketClienti, setTicketClienti] = useState([])
    const [ticketLexum, setTicketLexum] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')
    const [mostraModalCliente, setMostraModalCliente] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: profilo } = await supabase
                .from('profiles').select('posti_acquistati').eq('id', user.id).single()

            let allIds = [user.id]
            if ((profilo?.posti_acquistati ?? 1) > 1) {
                const { data: collabs } = await supabase
                    .from('profiles').select('id').eq('titolare_id', user.id)
                allIds = [user.id, ...(collabs ?? []).map(c => c.id)]
            }
            setIds(allIds)
        }
        init()
    }, [])

    const carica = useCallback(async () => {
        if (!meId || ids.length === 0) return
        setLoading(true)

        // Carica TUTTI i ticket che coinvolgono uno degli avvocati dello studio
        // (sia come mittente che come destinatario)
        const idsCsv = ids.join(',')
        const { data: tuttiTicket } = await supabase
            .from('ticket_assistenza')
            .select(`
                id, oggetto, stato, created_at, updated_at, mittente_ruolo,
                mittente_id, destinatario_id,
                mittente:mittente_id(id, nome, cognome, role),
                destinatario:destinatario_id(id, nome, cognome, role),
                messaggi:messaggi_ticket(id, autore_tipo, created_at)
            `)
            .or(`mittente_id.in.(${idsCsv}),destinatario_id.in.(${idsCsv})`)
            .order('updated_at', { ascending: false })

        // Split: clienti vs Lexum
        // - Lexum = quando uno dei nostri avvocati interagisce con un admin
        //   (sia come mittente verso admin, sia come destinatario di un admin)
        // - Clienti = tutto il resto che coinvolge un cliente
        const cl = []
        const lx = []
        for (const t of (tuttiTicket ?? [])) {
            const mittRole = t.mittente?.role
            const destRole = t.destinatario?.role
            const idsSet = new Set(ids)

            // Lexum (uscente): avvocato dello studio scrive all'admin
            if (idsSet.has(t.mittente_id) && destRole === 'admin') {
                // Mostro solo i miei ticket Lexum, non quelli dei collaboratori
                if (t.mittente_id === meId) lx.push(t)
                continue
            }

            // Lexum (entrante): admin scrive all'avvocato dello studio
            if (mittRole === 'admin' && idsSet.has(t.destinatario_id)) {
                // Mostro solo i ticket dove sono il destinatario io, non i collaboratori
                if (t.destinatario_id === meId) lx.push(t)
                continue
            }

            // Clienti: l'altra parte è un cliente
            if (mittRole === 'cliente' || destRole === 'cliente') {
                // Per i collaboratori: mostra il nome del cliente come "mittente" visualizzato
                // Riassegno t.mittente al cliente se l'ho aperto io
                const clientePartecipante = mittRole === 'cliente' ? t.mittente : t.destinatario
                cl.push({ ...t, mittente: clientePartecipante })
            }
        }

        setTicketClienti(cl)
        setTicketLexum(lx)
        setLoading(false)
    }, [meId, ids])

    useEffect(() => { carica() }, [carica])

    const isLexum = tab === 'lexum'
    const source = isLexum ? ticketLexum : ticketClienti

    const rows = source.filter(t => {
        if (statoF && t.stato !== statoF) return false
        if (search) {
            const mittente = t.mittente ? `${t.mittente.nome} ${t.mittente.cognome}` : ''
            if (!`${t.oggetto} ${mittente}`.toLowerCase().includes(search.toLowerCase())) return false
        }
        return true
    })

    const getUltimoAutore = (t) => {
        const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return msgs[0]?.autore_tipo ?? null
    }
    const nApertiClienti = ticketClienti.filter(t => t.stato === 'aperto' && getUltimoAutore(t) === 'cliente').length
    const nApertiLexum = ticketLexum.filter(t => t.stato === 'aperto' && getUltimoAutore(t) === 'admin').length

    return (
        <div className="space-y-5">
            <PageHeader label={t('lista.header_label')} title={t('lista.header_titolo')}
                action={isLexum
                    ? <Link to="/assistenza/nuovo" className="btn-primary text-sm flex items-center gap-2">
                        <Plus size={15} /> {t('lista.nuovo_ticket_lexum')}
                    </Link>
                    : <button
                        onClick={() => setMostraModalCliente(true)}
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        <Plus size={15} /> {t('lista.nuovo_ticket_cliente')}
                    </button>
                }
            />

            <div className="flex gap-0 border-b border-white/8">
                {[
                    { id: 'clienti', label: t('lista.tab_clienti'), badge: nApertiClienti },
                    { id: 'lexum', label: t('lista.tab_lexum'), badge: nApertiLexum },
                ].map(tabItem => (
                    <button key={tabItem.id} onClick={() => { setTab(tabItem.id); setSearch(''); setStatoF('') }}
                        className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === tabItem.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
                        {tabItem.label}
                        {tabItem.badge > 0 && (
                            <span className="w-4 h-4 rounded-full bg-oro/20 text-oro text-[10px] flex items-center justify-center font-medium">
                                {tabItem.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder={t('lista.cerca_placeholder')} value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">{t('lista.filtro_tutti_stati')}</option>
                    <option value="aperto">{t('stati.aperto')}</option>
                    <option value="chiuso">{t('stati.chiuso')}</option>
                </select>
                {(search || statoF) && (
                    <button onClick={() => { setSearch(''); setStatoF('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
                        {t('lista.reset')}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center font-body text-sm text-nebbia/30">
                            {source.length === 0 ? t('lista.nessun_ticket') : t('lista.nessun_risultato')}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 w-6" />
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('lista.col_titolo')}</th>
                                    {!isLexum && <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('lista.col_cliente')}</th>}
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('lista.col_aperto_il')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('lista.col_aggiornato')}</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{t('lista.col_stato')}</th>
                                    <th className="px-4 py-3 w-16" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const ultimoAutore = getUltimoAutore(row)
                                    const nonLetto = row.stato === 'aperto' && (isLexum ? ultimoAutore === 'admin' : ultimoAutore === 'cliente')
                                    return (
                                        <tr key={row.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                            <td className="px-4 py-3">
                                                {nonLetto && <span className="inline-block w-1.5 h-1.5 rounded-full bg-oro" />}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{row.oggetto}</td>
                                            {!isLexum && (
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                                                    {row.mittente ? `${row.mittente.nome} ${row.mittente.cognome}` : '—'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                                                {new Date(row.created_at).toLocaleDateString(dateLocale)}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/30 whitespace-nowrap">
                                                {new Date(row.updated_at).toLocaleDateString(dateLocale)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge label={row.stato === 'aperto' ? t('stati.aperto') : t('stati.chiuso')} variant={row.stato === 'aperto' ? 'salvia' : 'gray'} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link to={`/assistenza/${row.id}`} className="font-body text-xs text-oro hover:text-oro/70">{t('lista.apri')}</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {mostraModalCliente && (
                <ModalNuovoTicketCliente
                    onClose={() => setMostraModalCliente(false)}
                    onCreato={(ticketId) => {
                        setMostraModalCliente(false)
                        navigate(`/assistenza/${ticketId}`)
                    }}
                />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO TICKET → Lexum
// (solo titolo: la chat con l'admin si apre subito dopo)
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenzaNuovo() {
    const { t } = useTranslation('avv_assistenza')
    const navigate = useNavigate()
    const [titolo, setTitolo] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    async function handleCrea() {
        setErrore('')
        if (!titolo.trim()) return setErrore(t('nuovo.err_titolo_obbligatorio'))
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: admin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()

            const { data: ticket, error } = await supabase.from('ticket_assistenza').insert({
                mittente_id: user.id,
                destinatario_id: admin?.id ?? null,
                oggetto: titolo.trim(),
                mittente_ruolo: 'avvocato',
                stato: 'aperto',
                ultimo_mittente: 'avvocato',
            }).select().single()

            if (error) throw new Error(error.message)

            // Apri subito la chat con l'admin per il primo messaggio
            navigate(`/assistenza/${ticket.id}`)
        } catch (err) {
            setErrore(err.message)
            setSalvando(false)
        }
    }

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/assistenza" label={t('comune.assistenza')} />
            <PageHeader label={t('nuovo.header_label')} title={t('nuovo.header_titolo')} />
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('nuovo.label_titolo')}</label>
                    <input
                        value={titolo}
                        onChange={e => setTitolo(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && titolo.trim() && !salvando) handleCrea() }}
                        placeholder={t('nuovo.titolo_placeholder')}
                        autoFocus
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                    <p className="font-body text-xs text-nebbia/25 mt-2">
                        {t('nuovo.hint_messaggio')}
                    </p>
                </div>

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {errore}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={() => navigate('/assistenza')} className="btn-secondary text-sm flex-1">
                        {t('nuovo.annulla')}
                    </button>
                    <button
                        onClick={handleCrea}
                        disabled={salvando || !titolo.trim()}
                        className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                    >
                        {salvando
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : t('nuovo.apri_ticket')
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO TICKET
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenzaDettaglio() {
    const { t, i18n } = useTranslation('avv_assistenza')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const { id } = useParams()
    const bottomRef = useRef(null)
    const [meId, setMeId] = useState(null)
    const [ticket, setTicket] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [loading, setLoading] = useState(true)
    const [isLexum, setIsLexum] = useState(false)
    const [msg, setMsg] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)
            const [{ data: tk }, { data: msgs }] = await Promise.all([
                supabase.from('ticket_assistenza')
                    .select('*, mittente:mittente_id(nome, cognome, role), destinatario:destinatario_id(nome, cognome, role)')
                    .eq('id', id).single(),
                supabase.from('messaggi_ticket')
                    .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                    .eq('ticket_id', id).order('created_at'),
            ])
            setTicket(tk)
            setMessaggi(msgs ?? [])
            // È un ticket "Supporto Lexum" solo se una delle due parti è admin
            setIsLexum(tk?.mittente?.role === 'admin' || tk?.destinatario?.role === 'admin')
            setLoading(false)
        }
        init()
    }, [id])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

    async function handleInvia() {
        if (!msg.trim() || !meId || !ticket) return
        setInviando(true); setErrore('')
        try {
            const { data: nuovoMsg, error } = await supabase.from('messaggi_ticket')
                .insert({ ticket_id: ticket.id, autore_id: meId, autore_tipo: 'avvocato', testo: msg.trim() })
                .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)').single()
            if (error) throw new Error(error.message)
            await supabase.from('ticket_assistenza').update({ ultimo_mittente: 'avvocato' }).eq('id', ticket.id)
            setMessaggi(prev => [...prev, nuovoMsg]); setMsg('')
        } catch (err) { setErrore(err.message) }
        finally { setInviando(false) }
    }

    async function chiudiTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'chiuso' }).eq('id', ticket.id)
        setTicket(t => ({ ...t, stato: 'chiuso' }))
    }

    async function riapriTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'aperto' }).eq('id', ticket.id)
        setTicket(t => ({ ...t, stato: 'aperto' }))
    }

    if (loading) return <div className="flex justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!ticket) return <div className="space-y-5"><BackButton to="/assistenza" label={t('comune.assistenza')} /><p className="font-body text-sm text-nebbia/40">{t('dettaglio.non_trovato')}</p></div>

    // Mostra "Lexum" se il mittente è un admin (alias unificato del supporto)
    const mittente = ticket.mittente
        ? displayNome(ticket.mittente, ticket.mittente_ruolo)
        : t('dettaglio.sconosciuto')

    return (
        <div className="space-y-5">
            <BackButton to="/assistenza" label={t('comune.assistenza')} />

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="section-label mb-2">{isLexum ? t('dettaglio.label_lexum') : t('dettaglio.label_cliente')} · #{ticket.id.slice(0, 8)}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
                    <p className="font-body text-xs text-nebbia/30 mt-1">{mittente} · {new Date(ticket.created_at).toLocaleDateString(dateLocale)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Badge label={ticket.stato === 'aperto' ? t('stati.aperto') : t('stati.chiuso')} variant={ticket.stato === 'aperto' ? 'salvia' : 'gray'} />
                    {ticket.stato === 'aperto' ? (
                        <button onClick={chiudiTicket}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-salvia border border-white/15 hover:border-salvia/30 px-3 py-1.5 transition-colors">
                            <Check size={12} /> {t('dettaglio.chiudi_ticket')}
                        </button>
                    ) : (
                        <button onClick={riapriTicket}
                            className="flex items-center gap-1.5 font-body text-xs text-oro hover:text-oro/80 border border-oro/30 hover:border-oro/50 px-3 py-1.5 transition-colors">
                            {t('dettaglio.riapri')}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate border border-white/5 p-5 space-y-4 min-h-48 max-h-[500px] overflow-y-auto">
                <p className="section-label mb-2">{t('dettaglio.conversazione')}</p>
                {messaggi.length === 0 ? (
                    <p className="font-body text-sm text-nebbia/30 italic">{t('dettaglio.nessun_messaggio')}</p>
                ) : messaggi.map(m => {
                    const isMio = m.autore_tipo === 'avvocato'
                    const nomeAutore = m.autore_tipo === 'admin'
                        ? ALIAS_ADMIN_NOME
                        : (m.autore ? `${m.autore.nome} ${m.autore.cognome}` : m.autore_tipo)
                    return (
                        <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 space-y-1 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio/60 border border-white/8'}`}>
                                <p className={`font-body text-[10px] font-medium ${isMio ? 'text-oro/60' : 'text-nebbia/40'}`}>{nomeAutore}</p>
                                <p className="font-body text-sm text-nebbia leading-relaxed whitespace-pre-wrap">{m.testo}</p>
                                <p className="font-body text-[10px] text-nebbia/25">
                                    {new Date(m.created_at).toLocaleString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {ticket.stato === 'aperto' ? (
                <div className="space-y-2">
                    {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
                    <div className="flex gap-3">
                        <textarea rows={2} value={msg} onChange={e => setMsg(e.target.value)} placeholder={t('dettaglio.scrivi_placeholder')}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInvia() } }}
                            className="flex-1 bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                        <button onClick={handleInvia} disabled={inviando || !msg.trim()} className="btn-primary text-sm self-end px-4 py-3 disabled:opacity-40">
                            {inviando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <Send size={15} />}
                        </button>
                    </div>
                    <p className="font-body text-[10px] text-nebbia/20">{t('dettaglio.hint_invio')}</p>
                </div>
            ) : (
                <div className="bg-petrolio/40 border border-white/5 p-4">
                    <p className="font-body text-sm text-nebbia/30 text-center">{t('dettaglio.ticket_chiuso')}</p>
                </div>
            )}
        </div>
    )
}