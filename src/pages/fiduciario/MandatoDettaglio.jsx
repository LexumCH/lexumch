// src/pages/fiduciario/MandatoDettaglio.jsx
//
// Pagina dettaglio di un mandato fiduciario (rotta /banco-lavoro/:id).
// Layout a griglia:
//   Riga 1: Anagrafica (cliente + dati + note) + Scadenze   — 2 colonne, h fissa
//   Riga 2: Dipendenti                                      — full width
//   Riga 3: Documenti + Ricerche                            — 2 colonne, h fissa
//   Riga 4: Chat (Lex per il mandato)                       — full width (placeholder)

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
    ArrowLeft, Loader2, AlertCircle, FolderOpen, User, Building2,
    Mail, Phone, MapPin, Users, Sparkles, Edit2, Check, ChevronRight,
} from 'lucide-react'
import BoxScadenzeMandato from '@/components/fiduciario/BoxScadenzeMandato'
import BoxDocumentiMandato from '@/components/fiduciario/BoxDocumentiMandato'
import BoxRicercheMandato from '@/components/fiduciario/BoxRicercheMandato'
import GestioneDipendenti from '@/components/fiduciario/GestioneDipendenti'
import ChatMandato from '@/components/fiduciario/ChatMandato'

// ─── HELPERS ────────────────────────────────────────────────

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

const STATO_CONFIG = {
    attivo: { label: 'Attivo', classe: 'bg-salvia/15 border-salvia/40 text-salvia' },
    sospeso: { label: 'Sospeso', classe: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    concluso: { label: 'Concluso', classe: 'bg-oro/15 border-oro/40 text-oro' },
    archiviato: { label: 'Archiviato', classe: 'bg-white/5 border-white/15 text-nebbia/40' },
}

const STATI_MANDATO = ['attivo', 'sospeso', 'concluso', 'archiviato']

// ─── PAGINA ──────────────────────────────────────────────────

export default function MandatoDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [mandato, setMandato] = useState(null)
    const [cliente, setCliente] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)

    // Cambio stato inline
    const [cambiandoStato, setCambiandoStato] = useState(false)
    const [menuStato, setMenuStato] = useState(false)

    // Contatore di refresh: quando la chat salva un PDF, incrementa →
    // BoxDocumentiMandato ricarica la lista senza refresh manuale della pagina.
    const [refreshDocumenti, setRefreshDocumenti] = useState(0)

    useEffect(() => {
        caricaMandato()
    }, [id])

    async function caricaMandato() {
        setLoading(true)
        setErrore(null)
        try {
            const { data: m, error } = await supabase
                .from('mandati')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw new Error(error.message)
            if (!m) throw new Error('Mandato non trovato')
            setMandato(m)

            if (m.cliente_id) {
                const { data: c } = await supabase
                    .from('profiles')
                    .select('id, nome, cognome, ragione_sociale, tipo_soggetto, email, telefono, citta, cantone')
                    .eq('id', m.cliente_id)
                    .single()
                setCliente(c ?? null)
            }
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function cambiaStato(nuovoStato) {
        if (!mandato || nuovoStato === mandato.stato) { setMenuStato(false); return }
        setCambiandoStato(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('mandati')
                .update({ stato: nuovoStato, aggiornato_da: user.id, updated_at: new Date().toISOString() })
                .eq('id', mandato.id)
            if (error) throw new Error(error.message)
            setMandato(prev => ({ ...prev, stato: nuovoStato }))
            setMenuStato(false)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setCambiandoStato(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    if (errore || !mandato) return (
        <div className="space-y-4">
            <Link to="/banco-lavoro" className="flex items-center gap-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-sm w-fit">
                <ArrowLeft size={14} /> Banco di lavoro
            </Link>
            <div className="flex items-center gap-2 text-red-400 text-sm font-body p-4 bg-red-900/10 border border-red-500/20">
                <AlertCircle size={15} /> {errore ?? 'Mandato non trovato'}
            </div>
        </div>
    )

    const statoCfg = STATO_CONFIG[mandato.stato] ?? STATO_CONFIG.attivo

    return (
        <div className="space-y-6 pb-64">
            {/* ── Navigazione ── */}
            <Link to="/banco-lavoro" className="flex items-center gap-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-sm w-fit">
                <ArrowLeft size={14} /> Banco di lavoro
            </Link>

            {/* ── Header mandato ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="section-label">
                            <FolderOpen size={11} className="inline" /> Mandato
                        </span>
                        {mandato.tipo && (
                            <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/50 uppercase tracking-wider">
                                {mandato.tipo}
                            </span>
                        )}
                        {mandato.anno_riferimento && (
                            <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/50 uppercase tracking-wider">
                                {mandato.anno_riferimento}
                            </span>
                        )}
                    </div>
                    <h1 className="font-display text-3xl text-nebbia leading-tight">{mandato.titolo}</h1>
                </div>

                {/* Badge stato + cambio stato */}
                <div className="relative">
                    <button
                        onClick={() => setMenuStato(v => !v)}
                        disabled={cambiandoStato}
                        className={`flex items-center gap-2 px-3 py-1.5 border font-body text-xs uppercase tracking-wider transition-opacity hover:opacity-80 ${statoCfg.classe}`}
                    >
                        {cambiandoStato
                            ? <Loader2 size={12} className="animate-spin" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        }
                        {statoCfg.label}
                        <Edit2 size={10} className="opacity-50" />
                    </button>
                    {menuStato && (
                        <div className="absolute z-40 top-full right-0 mt-1 w-44 bg-slate border border-white/10 shadow-2xl">
                            {STATI_MANDATO.map(s => {
                                const cfg = STATO_CONFIG[s]
                                const attivo = s === mandato.stato
                                return (
                                    <button
                                        key={s}
                                        onClick={() => cambiaStato(s)}
                                        disabled={cambiandoStato}
                                        className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${attivo ? 'bg-oro' : 'bg-nebbia/20'}`} />
                                        <span className="font-body text-sm text-nebbia/70">{cfg.label}</span>
                                        {attivo && <Check size={12} className="text-oro ml-auto" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ RIGA 1 — Anagrafica + Scadenze (h fissa) ═══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Anagrafica: cliente + dati + note (scroll interno) */}
                <div className="bg-slate border border-white/5 flex flex-col h-[440px]">
                    <div className="px-5 py-3 border-b border-white/5 shrink-0">
                        <p className="section-label">Anagrafica</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">

                        {/* Cliente (cliccabile) */}
                        {cliente ? (
                            <Link
                                to={`/clienti/${cliente.id}`}
                                className="block bg-petrolio border border-white/5 hover:border-oro/30 transition-colors p-4 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                                        {cliente.tipo_soggetto === 'persona_giuridica'
                                            ? <Building2 size={15} className="text-oro" />
                                            : <User size={15} className="text-oro" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-0.5">Cliente</p>
                                        <p className="font-body text-sm font-medium text-nebbia truncate">{nomeCliente(cliente)}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                                    {cliente.email && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <Mail size={10} /> {cliente.email}
                                        </span>
                                    )}
                                    {cliente.telefono && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <Phone size={10} /> {cliente.telefono}
                                        </span>
                                    )}
                                    {(cliente.citta || cliente.cantone) && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <MapPin size={10} /> {[cliente.citta, cliente.cantone].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <p className="font-body text-xs text-nebbia/30 italic">Nessun cliente collegato al mandato.</p>
                        )}

                        {/* Dati mandato */}
                        <div className="space-y-2">
                            {[
                                ['Tipo', mandato.tipo ?? '—'],
                                ...(mandato.anno_riferimento ? [['Anno di riferimento', String(mandato.anno_riferimento)]] : []),
                                ['Creato il', new Date(mandato.created_at).toLocaleDateString('it-CH')],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                    <span className="font-body text-sm text-nebbia">{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Note */}
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">Note</p>
                            {mandato.note ? (
                                <p className="font-body text-sm text-nebbia/70 whitespace-pre-wrap leading-relaxed">{mandato.note}</p>
                            ) : (
                                <p className="font-body text-xs text-nebbia/25 italic">Nessuna nota per questo mandato.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scadenze */}
                <BoxScadenzeMandato
                    mandatoId={mandato.id}
                    clienteId={mandato.cliente_id}
                    studioId={mandato.studio_id}
                />
            </div>

            {/* ═══════════ RIGA 2 — Dipendenti (full width) ═══════════ */}
            {mandato.cliente_id ? (
                <div className="bg-slate border border-white/5 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={15} className="text-oro/60" />
                        <h2 className="font-display text-lg text-nebbia">Dipendenti del cliente</h2>
                    </div>
                    <GestioneDipendenti clienteId={mandato.cliente_id} anno={mandato.anno_riferimento} />
                </div>
            ) : (
                <div className="bg-slate border border-white/5 p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={15} className="text-oro/50" />
                        <h2 className="font-display text-lg text-nebbia">Dipendenti del cliente</h2>
                    </div>
                    <p className="font-body text-xs text-nebbia/30 italic">
                        Nessun cliente collegato al mandato — impossibile mostrare i dipendenti.
                    </p>
                </div>
            )}

            {/* ═══════════ RIGA 3 — Documenti + Ricerche (h fissa) ═══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BoxDocumentiMandato mandatoId={mandato.id} clienteId={mandato.cliente_id} refreshTrigger={refreshDocumenti} />
                <BoxRicercheMandato mandatoId={mandato.id} />
            </div>

            {/* ═══════════ RIGA 4 — Chat AI (full width) ═══════════ */}
            <ChatMandato
                mandatoId={mandato.id}
                clienteId={mandato.cliente_id}
                onDocumentoSalvato={() => setRefreshDocumenti(k => k + 1)}
            />
        </div>
    )
}