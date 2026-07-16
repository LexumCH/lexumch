// src/pages/cliente/Panoramica.jsx
//
// Dashboard del portale cliente. Role-aware: per un cliente di studio legale
// (o progettista) mostra pratiche; per un cliente di studio fiduciario mostra
// mandati + scadenze. Il tipo di studio è dedotto da useTipoStudio (ruolo del
// professionista collegato via profiles.avvocato_id).

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { useTipoStudio } from '@/hooks/useTipoStudio'
import { Calendar, FileText, Briefcase, CalendarClock, MessageSquare, CreditCard, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATO_PRATICA = {
    in_corso: { color: 'text-salvia', bg: 'bg-salvia/10 border-salvia/20' },
    in_udienza: { color: 'text-red-400', bg: 'bg-red-900/10 border-red-500/20' },
    in_attesa: { color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-500/20' },
    chiusa: { color: 'text-nebbia/30', bg: 'bg-white/5 border-white/5' },
}

function giorniAllaScadenza(iso) {
    if (!iso) return null
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso); target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

export default function ClientePanoramica() {
    const { t, i18n } = useTranslation('cli_panoramica')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const { profile } = useAuth()
    const { isFiduciario, loading: loadingTipo } = useTipoStudio()
    const [pratiche, setPratiche] = useState([])
    const [mandati, setMandati] = useState([])
    const [scadenze, setScadenze] = useState([])
    const [prossimo, setProssimo] = useState(null)
    const [fatture, setFatture] = useState([])
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)

    const profPrefix = isFiduciario ? '' : t('comune.avvocato_prefisso')

    useEffect(() => {
        if (loadingTipo) return
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [{ data: app }, { data: fatt }, { data: tks }] = await Promise.all([
                supabase.from('appuntamenti')
                    .select('id, titolo, tipo, data_ora_inizio, avvocato:avvocato_id(nome, cognome)')
                    .eq('cliente_id', user.id)
                    .eq('stato', 'programmato')
                    .gte('data_ora_inizio', new Date().toISOString())
                    .order('data_ora_inizio', { ascending: true })
                    .limit(1),
                supabase.from('fatture')
                    .select('id, numero, importo, stato, data_scadenza')
                    .eq('cliente_id', user.id)
                    .order('data_emissione', { ascending: false }),
                supabase.from('ticket_assistenza')
                    .select('id, oggetto, stato, created_at, updated_at, mittente_ruolo, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
                    .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
                    .order('updated_at', { ascending: false })
                    .limit(3),
            ])
            setProssimo(app?.[0] ?? null)
            setFatture(fatt ?? [])
            setTickets(tks ?? [])

            if (isFiduciario) {
                const [{ data: mand }, { data: scad }] = await Promise.all([
                    supabase.from('mandati')
                        .select('id, titolo, stato, tipo')
                        .eq('cliente_id', user.id)
                        .order('created_at', { ascending: false }),
                    supabase.from('scadenze_fiduciarie')
                        .select('id, titolo, tipo, data_scadenza, stato')
                        .eq('cliente_id', user.id)
                        .neq('stato', 'completata')
                        .order('data_scadenza', { ascending: true }),
                ])
                setMandati(mand ?? [])
                setScadenze(scad ?? [])
            } else {
                const { data: pr } = await supabase.from('pratiche')
                    .select('id, titolo, stato, tipo, avvocato:avvocato_id(nome, cognome)')
                    .eq('cliente_id', user.id)
                    .order('created_at', { ascending: false })
                setPratiche(pr ?? [])
            }
            setLoading(false)
        }
        carica()
    }, [loadingTipo, isFiduciario])

    const fattureInAttesa = fatture.filter(f => f.stato === 'in_attesa')

    const getUltimoAutore = (ticket) => {
        const msgs = [...(ticket.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return msgs[0]?.autore_tipo ?? null
    }
    // "Nuovo" = ultimo messaggio non scritto dal cliente
    const nMessaggiNuovi = tickets.filter(ticket => {
        const a = getUltimoAutore(ticket)
        return ticket.stato === 'aperto' && a && a !== 'cliente'
    }).length

    const scadenzeScadute = scadenze.filter(s => {
        const gg = giorniAllaScadenza(s.data_scadenza)
        return gg !== null && gg < 0
    }).length

    if (loading || loadingTipo) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    const kpis = isFiduciario ? [
        { label: t('contatori_fiduciario.mandati_attivi'), value: mandati.filter(m => m.stato === 'attivo').length, icon: Briefcase, color: 'text-oro', to: '/portale/mandati' },
        { label: t('contatori_fiduciario.scadenze_da_fare'), value: scadenze.length, icon: CalendarClock, color: scadenzeScadute > 0 ? 'text-red-400' : 'text-salvia', to: '/portale/scadenze' },
        { label: t('contatori.messaggi_nuovi'), value: nMessaggiNuovi, icon: MessageSquare, color: nMessaggiNuovi > 0 ? 'text-oro' : 'text-nebbia/60', to: '/portale/comunicazioni' },
        { label: t('contatori.fatture_aperte'), value: fattureInAttesa.length, icon: CreditCard, color: fattureInAttesa.length > 0 ? 'text-amber-400' : 'text-nebbia/30', to: '/portale/fatture' },
    ] : [
        { label: t('contatori.pratiche_attive'), value: pratiche.filter(p => p.stato !== 'chiusa').length, icon: FileText, color: 'text-oro', to: '/portale/pratiche' },
        { label: t('contatori.appuntamenti'), value: prossimo ? 1 : 0, icon: Calendar, color: 'text-salvia', to: '/portale/appuntamenti' },
        { label: t('contatori.messaggi_nuovi'), value: nMessaggiNuovi, icon: MessageSquare, color: nMessaggiNuovi > 0 ? 'text-oro' : 'text-nebbia/60', to: '/portale/comunicazioni' },
        { label: t('contatori.fatture_aperte'), value: fattureInAttesa.length, icon: CreditCard, color: fattureInAttesa.length > 0 ? 'text-amber-400' : 'text-nebbia/30', to: '/portale/fatture' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-1">{t('header.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia">
                    {profile?.nome ? t('header.bentornato_nome', { nome: profile.nome }) : t('header.bentornato')}
                </h1>
            </div>

            {fattureInAttesa.length > 0 && (
                <div className="bg-amber-900/10 border border-amber-500/20 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <CreditCard size={16} className="text-amber-400 shrink-0" />
                        <p className="font-body text-sm text-amber-400">
                            {t('alert.fatture_attesa', { count: fattureInAttesa.length })}
                        </p>
                    </div>
                    <Link to="/portale/fatture" className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap">
                        {t('alert.visualizza')}
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {kpis.map(({ label, value, icon: Icon, color, to }) => (
                    <Link key={label} to={to} className="bg-slate border border-white/5 p-4 hover:border-oro/20 transition-all">
                        <Icon size={16} className={`${color} mb-2`} strokeWidth={1.5} />
                        <p className={`font-display text-3xl font-semibold ${color} mb-1`}>{value}</p>
                        <p className="font-body text-xs text-nebbia/40">{label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Prossimo appuntamento */}
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="section-label">{t('prossimo.titolo')}</p>
                        <Link to="/portale/appuntamenti" className="font-body text-xs text-oro hover:text-oro/70">{t('prossimo.tutti')}</Link>
                    </div>
                    {prossimo ? (
                        <div className="flex items-start gap-3">
                            <div className="bg-oro/10 border border-oro/20 p-3 text-center min-w-14">
                                <p className="font-display text-2xl font-semibold text-oro leading-none">
                                    {new Date(prossimo.data_ora_inizio).getDate()}
                                </p>
                                <p className="font-body text-[10px] text-oro/60 uppercase">
                                    {new Date(prossimo.data_ora_inizio).toLocaleString(dateLocale, { month: 'short' })}
                                </p>
                            </div>
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia">{prossimo.titolo}</p>
                                {prossimo.avvocato && (
                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">{profPrefix ? `${profPrefix} ` : ''}{prossimo.avvocato.nome} {prossimo.avvocato.cognome}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Clock size={11} className="text-nebbia/30" />
                                    <span className="font-body text-xs text-nebbia/40">
                                        {new Date(prossimo.data_ora_inizio).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                                        {' · '}{prossimo.tipo}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="font-body text-sm text-nebbia/30">{t('prossimo.vuoto')}</p>
                    )}
                </div>

                {/* Destra: pratiche (avvocato) o scadenze (fiduciario) */}
                {isFiduciario ? (
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label">{t('scadenze.titolo')}</p>
                            <Link to="/portale/scadenze" className="font-body text-xs text-oro hover:text-oro/70">{t('scadenze.tutte')}</Link>
                        </div>
                        <div className="space-y-2">
                            {scadenze.length === 0
                                ? <p className="font-body text-sm text-nebbia/30">{t('scadenze.vuoto')}</p>
                                : scadenze.slice(0, 3).map(s => {
                                    const gg = giorniAllaScadenza(s.data_scadenza)
                                    const scaduta = gg !== null && gg < 0
                                    const urgente = gg !== null && gg >= 0 && gg <= 7
                                    return (
                                        <div key={s.id} className={`border p-3 ${scaduta ? 'bg-red-900/10 border-red-500/20' : urgente ? 'bg-amber-900/10 border-amber-500/20' : 'bg-petrolio/40 border-white/5'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-body text-sm font-medium text-nebbia truncate">{s.titolo}</p>
                                                <span className={`font-body text-xs shrink-0 ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/40'}`}>
                                                    {gg !== null && (scaduta ? t('giorni.scaduta') : gg === 0 ? t('giorni.oggi') : t('giorni.tra', { count: gg }))}
                                                </span>
                                            </div>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                {new Date(s.data_scadenza).toLocaleDateString(dateLocale)}{s.tipo ? ` · ${s.tipo}` : ''}
                                            </p>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label">{t('pratiche.titolo')}</p>
                            <Link to="/portale/pratiche" className="font-body text-xs text-oro hover:text-oro/70">{t('pratiche.tutte')}</Link>
                        </div>
                        <div className="space-y-2">
                            {pratiche.filter(p => p.stato !== 'chiusa').length === 0
                                ? <p className="font-body text-sm text-nebbia/30">{t('pratiche.vuoto')}</p>
                                : pratiche.filter(p => p.stato !== 'chiusa').slice(0, 3).map(p => {
                                    const st = STATO_PRATICA[p.stato] ?? STATO_PRATICA.in_corso
                                    const statoLabel = t(`stati.${p.stato}`, { defaultValue: t('stati.in_corso') })
                                    return (
                                        <div key={p.id} className={`border p-3 ${st.bg}`}>
                                            <div className="flex items-center justify-between">
                                                <p className="font-body text-sm font-medium text-nebbia">{p.titolo}</p>
                                                <span className={`font-body text-xs ${st.color}`}>{statoLabel}</span>
                                            </div>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                {p.tipo ?? '—'}{p.avvocato ? ` · ${profPrefix ? `${profPrefix} ` : ''}${p.avvocato.nome} ${p.avvocato.cognome}` : ''}
                                            </p>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Ultime comunicazioni */}
            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="section-label">{t('comunicazioni.titolo')}</p>
                    <Link to="/portale/comunicazioni" className="font-body text-xs text-oro hover:text-oro/70">{t('comunicazioni.tutte')}</Link>
                </div>
                {tickets.length === 0 ? (
                    <p className="font-body text-sm text-nebbia/30">{t('comunicazioni.vuoto')}</p>
                ) : (
                    <div className="space-y-2">
                        {tickets.map(ticket => {
                            const ultimoAutore = getUltimoAutore(ticket)
                            const nonLetto = ticket.stato === 'aperto' && ultimoAutore && ultimoAutore !== 'cliente'
                            return (
                                <Link key={ticket.id} to={`/portale/comunicazioni`}
                                    className="flex items-center justify-between p-3 border border-white/5 hover:border-oro/20 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {nonLetto && <span className="w-2 h-2 rounded-full bg-oro shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="font-body text-sm font-medium text-nebbia truncate">{ticket.oggetto}</p>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                {new Date(ticket.updated_at).toLocaleDateString(dateLocale)}
                                            </p>
                                        </div>
                                    </div>
                                    {nonLetto && (
                                        <span className="font-body text-[10px] text-oro bg-oro/10 px-1.5 py-0.5 shrink-0 ml-3">{t('comunicazioni.nuovo')}</span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
