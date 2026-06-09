// src/components/AssegnaDocumento.jsx
//
// Picker bifronte per assegnare un documento (archivio_documenti) a:
//   - Cliente            (cliente_id)
//   - Dipendente         (dipendente_id) — gated: disponibile solo se il doc ha un cliente
//   - Pratica / Mandato  (pratica_id avvocato / mandato_id fiduciario)
//
// Regola gerarchica: il dipendente dipende dal cliente.
//   - cambiando/rimuovendo il cliente, il dipendente viene azzerato (cascata).
//   - il dipendente è selezionabile solo dopo aver assegnato un cliente.
// Assegnare un dipendente NON tocca il cliente (è già presente per definizione).
//
// Auto-determinante: legge cliente_id/dipendente_id/pratica_id/mandato_id dal `doc`.
// Carica clienti/pratiche/mandati in lazy (all'apertura del picker), dipendenti
// solo se il doc ha un cliente.
//
// Props:
//   doc           - il documento (deve avere id, cliente_id, dipendente_id, pratica_id, mandato_id)
//   onAggiornato  - callback dopo ogni modifica (ricarica la lista nel parent)

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { User, Users, FolderOpen, FileText, Search, X, ChevronDown } from 'lucide-react'

// Config bifronte per il legame pratica/mandato
const PM_CONFIG = {
    avvocato: {
        tabella: 'pratiche', fk: 'pratica_id', filtroStato: ['stato', 'aperta'],
        label: 'pratica', labelVuoto: 'Nessuna pratica aperta', icona: FileText,
    },
    fiduciario: {
        tabella: 'mandati', fk: 'mandato_id', filtroStato: ['stato', 'attivo'],
        label: 'mandato', labelVuoto: 'Nessun mandato attivo', icona: FolderOpen,
    },
}

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// ─── Picker generico a tendina ───
function Picker({ label, icona: Icona, valore, valoreLabel, disabled, disabledHint, children, onApri, aperto, onChiudi }) {
    const ref = useRef(null)
    useEffect(() => {
        if (!aperto) return
        function onClick(e) { if (ref.current && !ref.current.contains(e.target)) onChiudi() }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [aperto, onChiudi])

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={disabled ? undefined : onApri}
                disabled={disabled}
                title={disabled ? disabledHint : undefined}
                className={`flex items-center gap-1.5 px-2 py-1 font-body text-xs transition-colors ${valore
                    ? 'bg-oro/10 border border-oro/30 text-oro hover:bg-oro/20'
                    : disabled
                        ? 'border border-dashed border-white/8 text-nebbia/20 cursor-not-allowed'
                        : 'border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro'
                    }`}
            >
                <Icona size={10} />
                <span className="max-w-[140px] truncate">{valore ? valoreLabel : label}</span>
                {!disabled && <ChevronDown size={10} className="opacity-50" />}
            </button>
            {aperto && (
                <div className="absolute z-40 top-full left-0 mt-1 w-72 bg-slate border border-white/10 shadow-2xl">
                    {children}
                </div>
            )}
        </div>
    )
}

export default function AssegnaDocumento({ doc, onAggiornato }) {
    const { profile } = useAuth()
    const pm = PM_CONFIG[profile?.role] ?? null

    // Stato corrente (deriva dal doc, ma teniamo copia locale per UI reattiva)
    const clienteId = doc.cliente_id ?? null
    const dipendenteId = doc.dipendente_id ?? null
    const pmId = pm ? (doc[pm.fk] ?? null) : null

    // Dati caricati lazy
    const [clienti, setClienti] = useState(null)       // null = non caricati
    const [dipendenti, setDipendenti] = useState(null)
    const [pmItems, setPmItems] = useState(null)

    // Quale picker è aperto: 'cliente' | 'dipendente' | 'pm' | null
    const [apertoPicker, setApertoPicker] = useState(null)
    const [cercaCliente, setCercaCliente] = useState('')
    const [salvando, setSalvando] = useState(false)

    // Label correnti (per mostrare il nome assegnato sul bottone)
    const [clienteLabel, setClienteLabel] = useState('')
    const [dipendenteLabel, setDipendenteLabel] = useState('')
    const [pmLabel, setPmLabel] = useState('')

    // Carica le label dei legami già presenti (una volta)
    useEffect(() => {
        let attivo = true
        async function caricaLabel() {
            if (clienteId) {
                const { data } = await supabase.from('profiles')
                    .select('nome, cognome, ragione_sociale, tipo_soggetto').eq('id', clienteId).single()
                if (attivo && data) setClienteLabel(nomeCliente(data))
            } else if (attivo) setClienteLabel('')

            if (dipendenteId) {
                const { data } = await supabase.from('clienti_dipendenti')
                    .select('nome, cognome').eq('id', dipendenteId).single()
                if (attivo && data) setDipendenteLabel(`${data.nome} ${data.cognome}`)
            } else if (attivo) setDipendenteLabel('')

            if (pmId && pm) {
                const { data } = await supabase.from(pm.tabella)
                    .select('titolo').eq('id', pmId).single()
                if (attivo && data) setPmLabel(data.titolo)
            } else if (attivo) setPmLabel('')
        }
        caricaLabel()
        return () => { attivo = false }
    }, [clienteId, dipendenteId, pmId, pm])

    // ─── Caricamenti lazy ───
    async function caricaClienti() {
        if (clienti !== null) return
        const { data: { user } } = await supabase.auth.getUser()
        const { data: prof } = await supabase.from('profiles').select('titolare_id').eq('id', user.id).single()
        const proprietarioId = prof?.titolare_id ?? user.id
        const { data } = await supabase.from('profiles')
            .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
            .eq('role', 'cliente').eq('avvocato_id', proprietarioId)
            .order('cognome')
        setClienti(data ?? [])
    }

    async function caricaDipendenti() {
        if (!clienteId) return
        const { data } = await supabase.from('clienti_dipendenti')
            .select('id, nome, cognome, ruolo').eq('cliente_id', clienteId).order('cognome')
        setDipendenti(data ?? [])
    }

    async function caricaPm() {
        if (pmItems !== null || !pm) return
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from(pm.tabella)
            .select('id, titolo').eq('avvocato_id', user.id)
            .eq(pm.filtroStato[0], pm.filtroStato[1])
            .order('updated_at', { ascending: false }).limit(50)
        setPmItems(data ?? [])
    }

    // ─── Azioni di assegnazione ───
    async function assegnaCliente(id) {
        setSalvando(true)
        // Cascata: cambiando cliente, azzera il dipendente (apparteneva al vecchio cliente)
        const update = { cliente_id: id, updated_at: new Date().toISOString() }
        if (id !== clienteId) update.dipendente_id = null
        await supabase.from('archivio_documenti').update(update).eq('id', doc.id)
        setSalvando(false)
        setApertoPicker(null)
        setDipendenti(null) // forza ricarica dipendenti del nuovo cliente
        if (onAggiornato) await onAggiornato()
    }

    async function rimuoviCliente() {
        setSalvando(true)
        // Rimuovendo il cliente, cade anche il dipendente
        await supabase.from('archivio_documenti')
            .update({ cliente_id: null, dipendente_id: null, updated_at: new Date().toISOString() })
            .eq('id', doc.id)
        setSalvando(false)
        setApertoPicker(null)
        if (onAggiornato) await onAggiornato()
    }

    async function assegnaDipendente(id) {
        setSalvando(true)
        await supabase.from('archivio_documenti')
            .update({ dipendente_id: id, updated_at: new Date().toISOString() })
            .eq('id', doc.id)
        setSalvando(false)
        setApertoPicker(null)
        if (onAggiornato) await onAggiornato()
    }

    async function assegnaPm(id) {
        setSalvando(true)
        await supabase.from('archivio_documenti')
            .update({ [pm.fk]: id, updated_at: new Date().toISOString() })
            .eq('id', doc.id)
        setSalvando(false)
        setApertoPicker(null)
        if (onAggiornato) await onAggiornato()
    }

    // Guard: solo avvocato/fiduciario
    if (!pm) return null

    const clientiFiltrati = (clienti ?? []).filter(c =>
        cercaCliente.trim()
            ? nomeCliente(c).toLowerCase().includes(cercaCliente.toLowerCase())
            : true
    )

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* ── CLIENTE ── */}
            <Picker
                label="Cliente"
                icona={User}
                valore={!!clienteId}
                valoreLabel={clienteLabel || 'Cliente'}
                aperto={apertoPicker === 'cliente'}
                onApri={() => { setApertoPicker('cliente'); caricaClienti() }}
                onChiudi={() => setApertoPicker(null)}
            >
                <div className="p-2 border-b border-white/5">
                    <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            autoFocus value={cercaCliente} onChange={e => setCercaCliente(e.target.value)}
                            placeholder="Cerca cliente..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs pl-7 pr-2 py-1.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {clienteId && (
                        <button onClick={rimuoviCliente} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 border-b border-white/5 disabled:opacity-50">
                            <p className="font-body text-xs text-red-400/70 italic">✕ Rimuovi cliente</p>
                        </button>
                    )}
                    {clienti === null ? (
                        <div className="p-3 flex justify-center"><span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /></div>
                    ) : clientiFiltrati.length === 0 ? (
                        <p className="p-3 text-center font-body text-xs text-nebbia/25">Nessun cliente</p>
                    ) : clientiFiltrati.map(c => (
                        <button key={c.id} onClick={() => assegnaCliente(c.id)} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50">
                            <p className="font-body text-sm text-nebbia/80 truncate">{nomeCliente(c)}</p>
                        </button>
                    ))}
                </div>
            </Picker>

            {/* ── DIPENDENTE (solo fiduciario, gated sul cliente) ── */}
            {profile?.role === 'fiduciario' && (
            <Picker
                label="Dipendente"
                icona={Users}
                valore={!!dipendenteId}
                valoreLabel={dipendenteLabel || 'Dipendente'}
                disabled={!clienteId}
                disabledHint="Assegna prima un cliente"
                aperto={apertoPicker === 'dipendente'}
                onApri={() => { setApertoPicker('dipendente'); caricaDipendenti() }}
                onChiudi={() => setApertoPicker(null)}
            >
                <div className="max-h-64 overflow-y-auto">
                    {dipendenteId && (
                        <button onClick={() => assegnaDipendente(null)} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 border-b border-white/5 disabled:opacity-50">
                            <p className="font-body text-xs text-red-400/70 italic">✕ Rimuovi dipendente</p>
                        </button>
                    )}
                    {dipendenti === null ? (
                        <div className="p-3 flex justify-center"><span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /></div>
                    ) : dipendenti.length === 0 ? (
                        <p className="p-3 text-center font-body text-xs text-nebbia/25">Nessun dipendente per questo cliente</p>
                    ) : dipendenti.map(d => (
                        <button key={d.id} onClick={() => assegnaDipendente(d.id)} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50">
                            <p className="font-body text-sm text-nebbia/80 truncate">{d.nome} {d.cognome}</p>
                            {d.ruolo && <p className="font-body text-xs text-nebbia/30 truncate">{d.ruolo}</p>}
                        </button>
                    ))}
                </div>
            </Picker>
            )}

            {/* ── PRATICA / MANDATO (bifronte) ── */}
            <Picker
                label={pm.label === 'pratica' ? 'Pratica' : 'Mandato'}
                icona={pm.icona}
                valore={!!pmId}
                valoreLabel={pmLabel || (pm.label === 'pratica' ? 'Pratica' : 'Mandato')}
                aperto={apertoPicker === 'pm'}
                onApri={() => { setApertoPicker('pm'); caricaPm() }}
                onChiudi={() => setApertoPicker(null)}
            >
                <div className="max-h-64 overflow-y-auto">
                    {pmId && (
                        <button onClick={() => assegnaPm(null)} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 border-b border-white/5 disabled:opacity-50">
                            <p className="font-body text-xs text-red-400/70 italic">✕ Rimuovi {pm.label}</p>
                        </button>
                    )}
                    {pmItems === null ? (
                        <div className="p-3 flex justify-center"><span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /></div>
                    ) : pmItems.length === 0 ? (
                        <p className="p-3 text-center font-body text-xs text-nebbia/25">{pm.labelVuoto}</p>
                    ) : pmItems.map(p => (
                        <button key={p.id} onClick={() => assegnaPm(p.id)} disabled={salvando}
                            className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50">
                            <p className="font-body text-sm text-nebbia/80 truncate">{p.titolo}</p>
                        </button>
                    ))}
                </div>
            </Picker>
        </div>
    )
}