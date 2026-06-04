// src/components/fiduciario/BoxScadenzeMandato.jsx
//
// Box scadenze dentro il dettaglio mandato.
// Lista le scadenze del mandato + apre NuovaScadenzaFiduciaria per crearne.
// Gestisce: completamento (stato → completata), riapertura, eliminazione.
//
// Props:
//   mandatoId  (string)       - mandato corrente (obbligatorio)
//   clienteId  (string|null)  - cliente del mandato (passato a NuovaScadenza)
//   studioId   (string|null)  - studio (passato a NuovaScadenza)

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    CalendarClock, Plus, Loader2, Check, RotateCcw, Trash2,
    AlertTriangle, Calendar, Clock,
} from 'lucide-react'
import NuovaScadenzaFiduciaria from './NuovaScadenzaFiduciaria'

function fmtData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('it-CH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function giorniAllaScadenza(iso) {
    if (!iso) return null
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso); target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

const STATO_CONFIG = {
    in_corso: { label: 'In corso', classe: 'bg-salvia/10 border-salvia/30 text-salvia' },
    completata: { label: 'Completata', classe: 'bg-oro/10 border-oro/30 text-oro' },
}

export default function BoxScadenzeMandato({ mandatoId, clienteId = null, studioId = null }) {
    const [scadenze, setScadenze] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraModal, setMostraModal] = useState(false)
    const [azione, setAzione] = useState(null) // id in lavorazione

    useEffect(() => {
        if (mandatoId) carica()
    }, [mandatoId])

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('scadenze_fiduciarie')
            .select('*')
            .eq('mandato_id', mandatoId)
            .order('data_scadenza', { ascending: true })
        setScadenze(data ?? [])
        setLoading(false)
    }

    async function completa(s) {
        setAzione(s.id)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase
            .from('scadenze_fiduciarie')
            .update({
                stato: 'completata',
                data_completamento: new Date().toISOString().slice(0, 10),
                aggiornato_da: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', s.id)
        await carica()
        setAzione(null)
    }

    async function riapri(s) {
        setAzione(s.id)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase
            .from('scadenze_fiduciarie')
            .update({
                stato: 'in_corso',
                data_completamento: null,
                aggiornato_da: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', s.id)
        await carica()
        setAzione(null)
    }

    async function elimina(s) {
        if (!confirm(`Eliminare la scadenza "${s.titolo}"?`)) return
        setAzione(s.id)
        await supabase.from('scadenze_fiduciarie').delete().eq('id', s.id)
        await carica()
        setAzione(null)
    }

    return (
        <div className="bg-slate border border-white/5 flex flex-col h-[440px]">
            {/* Header box */}
            <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Scadenze</h2>
                    {scadenze.length > 0 && (
                        <span className="font-body text-xs text-nebbia/30">({scadenze.length})</span>
                    )}
                </div>
                <button
                    onClick={() => setMostraModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                >
                    <Plus size={12} /> Nuova scadenza
                </button>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 size={18} className="animate-spin text-oro" />
                </div>
            ) : scadenze.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="font-body text-xs text-nebbia/30 italic text-center">
                        Nessuna scadenza per questo mandato.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
                    {scadenze.map(s => {
                        const cfg = STATO_CONFIG[s.stato] ?? STATO_CONFIG.in_corso
                        const gg = giorniAllaScadenza(s.data_scadenza)
                        const completata = s.stato === 'completata'
                        const urgente = !completata && gg !== null && gg >= 0 && gg <= 7
                        const scaduta = !completata && gg !== null && gg < 0
                        const inAzione = azione === s.id

                        return (
                            <div
                                key={s.id}
                                className={`border p-3 transition-colors ${completata
                                    ? 'bg-petrolio/20 border-white/5 opacity-60'
                                    : scaduta
                                        ? 'bg-red-900/10 border-red-500/20'
                                        : urgente
                                            ? 'bg-amber-900/10 border-amber-500/20'
                                            : 'bg-petrolio/40 border-white/5'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${cfg.classe}`}>
                                                {cfg.label}
                                            </span>
                                            {s.tipo && (
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/10 text-nebbia/50 uppercase tracking-wider">
                                                    {s.tipo}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`font-body text-sm font-medium mt-1.5 ${completata ? 'text-nebbia/50 line-through' : 'text-nebbia'}`}>
                                            {s.titolo}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                                <Calendar size={10} /> {fmtData(s.data_scadenza)}
                                            </span>
                                            {!completata && gg !== null && (
                                                <span className={`font-body text-xs flex items-center gap-1 ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/40'}`}>
                                                    {scaduta
                                                        ? <><AlertTriangle size={10} /> scaduta da {Math.abs(gg)} gg</>
                                                        : gg === 0
                                                            ? <><Clock size={10} /> oggi</>
                                                            : <><Clock size={10} /> tra {gg} gg</>
                                                    }
                                                </span>
                                            )}
                                            {completata && s.data_completamento && (
                                                <span className="font-body text-xs text-oro/60 flex items-center gap-1">
                                                    <Check size={10} /> completata il {fmtData(s.data_completamento)}
                                                </span>
                                            )}
                                        </div>
                                        {s.note && (
                                            <p className="font-body text-xs text-nebbia/40 mt-1.5 whitespace-pre-wrap">{s.note}</p>
                                        )}
                                    </div>

                                    {/* Azioni */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {inAzione ? (
                                            <Loader2 size={13} className="animate-spin text-oro" />
                                        ) : (
                                            <>
                                                {completata ? (
                                                    <button
                                                        onClick={() => riapri(s)}
                                                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-salvia transition-colors"
                                                        title="Riapri"
                                                    >
                                                        <RotateCcw size={13} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => completa(s)}
                                                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-oro transition-colors"
                                                        title="Segna completata"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => elimina(s)}
                                                    className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-red-400 transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal nuova scadenza */}
            {mostraModal && (
                <NuovaScadenzaFiduciaria
                    mandatoId={mandatoId}
                    clienteId={clienteId}
                    studioId={studioId}
                    onClose={() => setMostraModal(false)}
                    onSaved={() => { setMostraModal(false); carica() }}
                />
            )}
        </div>
    )
}