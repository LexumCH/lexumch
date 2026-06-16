// src/pages/avvocato/ArchivioDettaglio.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackButton, Badge } from '@/components/shared'
import {
    FileText, File, Check, AlertCircle, Save, Eye, Sparkles,
    EyeOff, Download, Tag, User, FolderOpen, Edit2, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AssegnaMovimento from '@/components/fiduciario/AssegnaMovimento'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATUS_CONFIG = {
    pending: { labelKey: 'status.pending', variant: 'gray' },
    processing: { labelKey: 'status.processing', variant: 'warning' },
    completed: { labelKey: 'status.completed', variant: 'salvia' },
    failed: { labelKey: 'status.failed', variant: 'red' },
    skipped: { labelKey: 'status.skipped', variant: 'gray' },
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ArchivioDettaglio() {
    const { t, i18n } = useTranslation('avv_archivio_dettaglio')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const { id } = useParams()
    const navigate = useNavigate()

    const [doc, setDoc] = useState(null)
    const [loading, setLoading] = useState(true)
    const [pdfUrl, setPdfUrl] = useState(null)
    const [mostraPdf, setMostraPdf] = useState(true)
    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [categorie, setCategorie] = useState([])
    const [titolareId, setTitolareId] = useState(null)

    // Edit metadati
    const [editMode, setEditMode] = useState(false)
    const [formMeta, setFormMeta] = useState({})
    const [salvandoMeta, setSalvandoMeta] = useState(false)

    // Edit testo estratto
    const [testoEdit, setTestoEdit] = useState('')
    const [editTesto, setEditTesto] = useState(false)
    const [salvandoTesto, setSalvandoTesto] = useState(false)

    // Verifica
    const [verificando, setVerificando] = useState(false)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            const { data: prof } = await supabase
                .from('profiles')
                .select('titolare_id')
                .eq('id', user.id)
                .single()

            const tId = prof?.titolare_id ?? user.id
            setTitolareId(tId)

            const { data: d } = await supabase
                .from('archivio_documenti')
                .select('*')
                .eq('id', id)
                .single()

            if (d) {
                setDoc(d)
                setTestoEdit(d.testo_estratto ?? '')
                setFormMeta({
                    titolo: d.titolo,
                    categoria: d.categoria ?? '',
                    tags: (d.tags ?? []).join(', '),
                    cliente_id: d.cliente_id ?? '',
                    pratica_id: d.pratica_id ?? '',
                })

                // Carica URL PDF
                if (d.storage_path) {
                    const { data: url } = await supabase.storage
                        .from('archivio')
                        .createSignedUrl(d.storage_path, 3600)
                    if (url?.signedUrl) setPdfUrl(url.signedUrl)
                }
            }

            // Carica clienti, pratiche, categorie
            const [{ data: cl }, { data: pr }, { data: cat }] = await Promise.all([
                supabase.from('profiles').select('id, nome, cognome').eq('role', 'cliente').eq('avvocato_id', tId),
                supabase.from('pratiche').select('id, titolo').eq('avvocato_id', user.id).eq('stato', 'aperta'),
                supabase.from('categorie_archivio').select('id, nome').eq('titolare_id', tId).order('nome'),
            ])
            setClienti(cl ?? [])
            setPratiche(pr ?? [])
            setCategorie(cat ?? [])

            setLoading(false)
        }
        carica()
    }, [id])

    async function salvaMetadati() {
        setSalvandoMeta(true)
        const aggiornato = {
            titolo: formMeta.titolo,
            categoria: formMeta.categoria || null,
            tags: formMeta.tags ? formMeta.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            cliente_id: formMeta.cliente_id || null,
            pratica_id: formMeta.pratica_id || null,
            updated_at: new Date().toISOString(),
        }
        await supabase.from('archivio_documenti').update(aggiornato).eq('id', id)
        setDoc(prev => ({ ...prev, ...aggiornato }))
        setEditMode(false)
        setSalvandoMeta(false)
    }

    async function salvaTesto() {
        setSalvandoTesto(true)
        await supabase.from('archivio_documenti').update({
            testo_estratto: testoEdit,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        setDoc(prev => ({ ...prev, testo_estratto: testoEdit }))
        setEditTesto(false)
        setSalvandoTesto(false)
    }

    async function verificaDocumento() {
        setVerificando(true)
        await supabase.from('archivio_documenti').update({
            verificato: true,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        setDoc(prev => ({ ...prev, verificato: true }))
        setVerificando(false)
    }

    async function scaricaTesto() {
        const testo = doc?.testo_estratto ?? ''
        const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${doc?.titolo ?? 'documento'}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (!doc) return (
        <div className="space-y-5">
            <BackButton to="/archivio" label={t('back.archivio')} />
            <p className="font-body text-sm text-nebbia/40">{t('loading.non_trovato')}</p>
        </div>
    )

    const sc = STATUS_CONFIG[doc.ocr_status] ?? STATUS_CONFIG.pending
    const cliente = clienti.find(c => c.id === doc.cliente_id)
    const pratica = pratiche.find(p => p.id === doc.pratica_id)

    return (
        <div className="space-y-5">
            <BackButton to="/archivio" label={t('back.archivio')} />

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <p className="section-label mb-2">{t('header.sezione')}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{doc.titolo}</h1>
                    <p className="font-body text-xs text-nebbia/30 mt-1">
                        {new Date(doc.created_at).toLocaleDateString(dateLocale)} · {formatSize(doc.dimensione)}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={t(sc.labelKey)} variant={sc.variant} />
                    {doc.verificato && <Badge label={t('header.verificato')} variant="salvia" />}
                    {/* Tag entrata/uscita (fiduciario): crea il movimento via OCR. Gated sul mandato. */}
                    <AssegnaMovimento doc={doc} />
                </div>
            </div>

            {/* Banner verifica */}
            {doc.ocr_status === 'completed' && !doc.verificato && (
                <div className="flex items-start justify-between gap-4 p-4 bg-amber-900/10 border border-amber-500/25">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-body text-sm font-medium text-amber-400">{t('banner_verifica.titolo')}</p>
                            <p className="font-body text-xs text-nebbia/50 mt-1 leading-relaxed">
                                {t('banner_verifica.testo')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={verificaDocumento}
                        disabled={verificando}
                        className="flex items-center gap-2 px-4 py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 shrink-0"
                    >
                        {verificando
                            ? <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" />
                            : <><Check size={13} /> {t('banner_verifica.segna_verificato')}</>
                        }
                    </button>
                </div>
            )}

            {/* Layout tre colonne */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* ── COLONNA 1: PDF originale (3/12) ── */}
                <div className="lg:col-span-3 space-y-3">
                    <div className="bg-slate border border-white/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="section-label">{t('originale.titolo')}</p>
                            <button
                                onClick={() => setMostraPdf(!mostraPdf)}
                                className="text-nebbia/25 hover:text-nebbia transition-colors"
                            >
                                {mostraPdf ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>

                        {/* Icona tipo file */}
                        <div className="flex items-center gap-2 mb-3 p-2 bg-petrolio/50 border border-white/5">
                            {doc.tipo === 'pdf'
                                ? <FileText size={14} className="text-oro/60" />
                                : <File size={14} className="text-nebbia/30" />
                            }
                            <span className="font-body text-xs text-nebbia/50 truncate">{doc.titolo}</span>
                        </div>

                        {mostraPdf && pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full border border-white/5"
                                style={{ height: 400 }}
                                title={doc.titolo}
                            />
                        ) : mostraPdf && !pdfUrl ? (
                            <div className="flex items-center justify-center py-8 border border-dashed border-white/10">
                                <p className="font-body text-xs text-nebbia/25">{t('originale.nessun_file')}</p>
                            </div>
                        ) : null}

                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 mt-3 font-body text-xs text-nebbia/30 hover:text-oro transition-colors"
                            >
                                <Download size={11} /> {t('originale.apri_nuova_scheda')}
                            </a>
                        )}
                    </div>
                </div>

                {/* ── COLONNA 2: Testo estratto (6/12) ── */}
                <div className="lg:col-span-6">
                    <div className="bg-slate border border-white/5 p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <p className="section-label">{t('testo.titolo')}</p>
                            <div className="flex items-center gap-2">
                                {doc.testo_estratto && (
                                    <button
                                        onClick={scaricaTesto}
                                        className="font-body text-xs text-nebbia/25 hover:text-nebbia transition-colors flex items-center gap-1"
                                    >
                                        <Download size={11} /> .txt
                                    </button>
                                )}
                                {!editTesto ? (
                                    <button
                                        onClick={() => setEditTesto(true)}
                                        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors flex items-center gap-1"
                                    >
                                        <Edit2 size={11} /> {t('common.modifica')}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={salvaTesto}
                                            disabled={salvandoTesto}
                                            className="font-body text-xs text-salvia flex items-center gap-1 disabled:opacity-40"
                                        >
                                            {salvandoTesto
                                                ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" />
                                                : <><Check size={11} /> {t('common.salva')}</>
                                            }
                                        </button>
                                        <button
                                            onClick={() => { setEditTesto(false); setTestoEdit(doc.testo_estratto ?? '') }}
                                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {doc.ocr_status === 'pending' || doc.ocr_status === 'processing' ? (
                            <div className="flex items-center justify-center flex-1 py-12">
                                <div className="text-center space-y-2">
                                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    <p className="font-body text-xs text-nebbia/30">{t('testo.estrazione_in_corso')}</p>
                                </div>
                            </div>
                        ) : doc.ocr_status === 'failed' ? (
                            <div className="flex items-center justify-center flex-1 py-12">
                                <div className="text-center space-y-2">
                                    <AlertCircle size={24} className="text-red-400/50 mx-auto" />
                                    <p className="font-body text-xs text-nebbia/30">{t('testo.estrazione_fallita')}</p>
                                    <p className="font-body text-xs text-nebbia/20">{t('testo.inserisci_manualmente')}</p>
                                </div>
                            </div>
                        ) : doc.ocr_status === 'skipped' ? (
                            <div className="flex flex-col flex-1">
                                <div className="bg-amber-900/10 border border-amber-500/20 p-3 mb-3 flex items-center gap-2">
                                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                                    <p className="font-body text-xs text-nebbia/50">
                                        {t('testo.avviso_non_pdf')}
                                    </p>
                                </div>
                                <textarea
                                    rows={12}
                                    value={testoEdit}
                                    onChange={e => setTestoEdit(e.target.value)}
                                    placeholder={t('testo.placeholder_contenuto')}
                                    className="flex-1 w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/20"
                                />
                                <button
                                    onClick={salvaTesto}
                                    disabled={salvandoTesto}
                                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 w-fit"
                                >
                                    {salvandoTesto
                                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                        : <><Save size={12} /> {t('testo.salva_testo')}</>
                                    }
                                </button>
                            </div>
                        ) : editTesto ? (
                            <textarea
                                rows={16}
                                value={testoEdit}
                                onChange={e => setTestoEdit(e.target.value)}
                                className="flex-1 w-full bg-petrolio border border-oro/30 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none"
                            />
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {doc.testo_estratto ? (
                                    <p className="font-body text-sm text-nebbia/65 leading-relaxed whitespace-pre-line">
                                        {doc.testo_estratto}
                                    </p>
                                ) : (
                                    <div className="flex items-center justify-center py-12">
                                        <p className="font-body text-xs text-nebbia/25">{t('testo.nessun_testo')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── COLONNA 3: Metadati (3/12) ── */}
                <div className="lg:col-span-3">
                    <div className="bg-slate border border-white/5 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="section-label">{t('metadati.titolo')}</p>
                            {!editMode ? (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors flex items-center gap-1"
                                >
                                    <Edit2 size={11} /> {t('common.modifica')}
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={salvaMetadati}
                                        disabled={salvandoMeta}
                                        className="font-body text-xs text-salvia flex items-center gap-1 disabled:opacity-40"
                                    >
                                        {salvandoMeta
                                            ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" />
                                            : <><Check size={11} /> {t('common.salva')}</>
                                        }
                                    </button>
                                    <button
                                        onClick={() => setEditMode(false)}
                                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {editMode ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1.5">{t('metadati.label_titolo')}</label>
                                    <input
                                        value={formMeta.titolo}
                                        onChange={e => setFormMeta(p => ({ ...p, titolo: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                                    />
                                </div>
                                <div>
                                    <label className="block font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1.5">{t('metadati.label_categoria')}</label>
                                    <input
                                        list="categorie-list"
                                        value={formMeta.categoria}
                                        onChange={e => setFormMeta(p => ({ ...p, categoria: e.target.value }))}
                                        placeholder={t('metadati.placeholder_categoria')}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20"
                                    />
                                    <datalist id="categorie-list">
                                        {categorie.map(c => <option key={c.id} value={c.nome} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1.5">{t('metadati.label_tag')}</label>
                                    <input
                                        value={formMeta.tags}
                                        onChange={e => setFormMeta(p => ({ ...p, tags: e.target.value }))}
                                        placeholder={t('metadati.placeholder_tag')}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20"
                                    />
                                </div>
                                <div>
                                    <label className="block font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1.5">{t('metadati.label_cliente')}</label>
                                    <select
                                        value={formMeta.cliente_id}
                                        onChange={e => setFormMeta(p => ({ ...p, cliente_id: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                                    >
                                        <option value="">{t('metadati.nessun_cliente')}</option>
                                        {clienti.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1.5">{t('metadati.label_pratica')}</label>
                                    <select
                                        value={formMeta.pratica_id}
                                        onChange={e => setFormMeta(p => ({ ...p, pratica_id: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                                    >
                                        <option value="">{t('metadati.nessuna_pratica')}</option>
                                        {pratiche.map(p => (
                                            <option key={p.id} value={p.id}>{p.titolo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    [t('metadati.tipo'), doc.tipo?.toUpperCase() ?? '—'],
                                    [t('metadati.dimensione'), formatSize(doc.dimensione)],
                                    [t('metadati.caricato_il'), new Date(doc.created_at).toLocaleDateString(dateLocale)],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                        <span className="font-body text-xs text-nebbia/60">{v}</span>
                                    </div>
                                ))}

                                {doc.categoria && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <FolderOpen size={12} className="text-nebbia/30" />
                                        <span className="font-body text-xs text-nebbia/60">{doc.categoria}</span>
                                    </div>
                                )}

                                {cliente && (
                                    <div className="flex items-center gap-2">
                                        <User size={12} className="text-nebbia/30" />
                                        <span className="font-body text-xs text-nebbia/60">{cliente.nome} {cliente.cognome}</span>
                                    </div>
                                )}

                                {pratica && (
                                    <div className="flex items-center gap-2">
                                        <FileText size={12} className="text-nebbia/30" />
                                        <span className="font-body text-xs text-nebbia/60 truncate">{pratica.titolo}</span>
                                    </div>
                                )}

                                {(doc.tags ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {doc.tags.map(t => (
                                            <span key={t} className="flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                                <Tag size={8} />{t}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {doc.verificato && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <Check size={12} className="text-salvia" />
                                        <span className="font-body text-xs text-salvia/70">{t('metadati.documento_verificato')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}