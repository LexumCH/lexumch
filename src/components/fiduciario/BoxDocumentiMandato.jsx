// src/components/fiduciario/BoxDocumentiMandato.jsx
//
// Box "Documenti" del dettaglio mandato.
// A differenza del box pratica (che fonde documenti_pratiche + archivio),
// il mandato ha UNA sola fonte: archivio_documenti filtrati per mandato_id.
// I documenti si caricano dall'archivio (pulsante → /archivio?mandato_id=...&cliente_id=...).
//
// Props:
//   mandatoId  (string)  - mandato di cui mostrare i documenti
//   clienteId  (string)  - cliente del mandato (per pre-impostare l'upload)

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Download, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BoxDocumentiMandato({ mandatoId, clienteId, refreshTrigger }) {
    const [documenti, setDocumenti] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { caricaDocumenti() }, [mandatoId, refreshTrigger])

    async function caricaDocumenti() {
        setLoading(true)
        const { data } = await supabase
            .from('archivio_documenti')
            .select('id, titolo, storage_path, dimensione, tipo_file, tipo, ocr_status, created_at, metadati, autore:autore_id(nome, cognome)')
            .eq('mandato_id', mandatoId)
            .order('created_at', { ascending: false })

        const docs = (data ?? []).map(d => ({
            id: d.id,
            nome_file: d.titolo,
            storage_path: d.storage_path,
            dimensione: d.dimensione,
            created_at: d.created_at,
            autore: d.autore,
            ocr_status: d.ocr_status,
            riepilogo: d.metadati?.suggeriti?.riepilogo ?? null,
        }))
        setDocumenti(docs)
        setLoading(false)
    }

    async function scaricaDocumento(doc) {
        const { data } = await supabase.storage
            .from('archivio')
            .createSignedUrl(doc.storage_path, 3600)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    async function scollegaDocumento(doc) {
        if (!confirm(`Rimuovere "${doc.nome_file}" dal mandato?\n\nIl documento resterà nell'archivio dello studio, perderà solo il collegamento a questo mandato.`)) return
        await supabase
            .from('archivio_documenti')
            .update({ mandato_id: null })
            .eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => d.id !== doc.id))
    }

    const linkArchivio = clienteId
        ? `/archivio?mandato_id=${mandatoId}&cliente_id=${clienteId}`
        : `/archivio?mandato_id=${mandatoId}`

    return (
        <div className="bg-slate border border-white/5 flex flex-col h-[560px]">
            <div className="px-5 pt-5 pb-3 shrink-0">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="section-label">Documenti mandato ({documenti.length})</p>
                    <Link
                        to={linkArchivio}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                    >
                        <Plus size={11} /> Aggiungi documento
                    </Link>
                </div>
                <p className="font-body text-xs text-nebbia/30">
                    I documenti vengono salvati nell'archivio dello studio, indicizzati per la ricerca con Lex e collegati a questo mandato.
                </p>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : documenti.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-1 text-nebbia/30 text-center">
                    <FileText size={20} className="mb-2 text-nebbia/20" />
                    <span className="font-body text-xs">Nessun documento collegato a questo mandato</span>
                    <span className="font-body text-xs text-nebbia/25 mt-1">Usa "Aggiungi documento" qui sopra per caricarlo</span>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                    {documenti.map(doc => (
                        <div key={doc.id} className="flex items-start justify-between gap-3 p-3 bg-petrolio border border-white/5">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <FileText size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-body text-sm text-nebbia truncate">{doc.nome_file}</p>
                                        <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia uppercase tracking-wider">
                                            Archivio
                                        </span>
                                    </div>
                                    {doc.riepilogo && (
                                        <p className="font-body text-xs text-nebbia/50 mt-1 line-clamp-2 leading-relaxed">
                                            {doc.riepilogo}
                                        </p>
                                    )}
                                    <p className="font-body text-xs text-nebbia/30 mt-0.5">
                                        {doc.autore ? `${doc.autore.nome} ${doc.autore.cognome}` : '—'} · {new Date(doc.created_at).toLocaleDateString('it-CH')}
                                        {doc.dimensione && ` · ${(doc.dimensione / 1024 / 1024).toFixed(1)} MB`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => scaricaDocumento(doc)} className="text-nebbia/30 hover:text-oro transition-colors" title="Scarica">
                                    <Download size={13} />
                                </button>
                                <button onClick={() => scollegaDocumento(doc)} className="text-nebbia/30 hover:text-red-400 transition-colors" title="Rimuovi dal mandato">
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}