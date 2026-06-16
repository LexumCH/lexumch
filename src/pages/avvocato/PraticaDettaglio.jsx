// src/pages/avvocato/PraticaDettaglio.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/shared'
import {
    Plus, Search, FileText, Calendar, Sparkles, X, Save, AlertCircle,
    Download, Gavel, ChevronRight, Clock, MapPin, ArrowLeft, StickyNote, Trash2, Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import UdienzaModal from '@/components/UdienzaModal'
import ContropartiBox from '@/components/ContropartiBox'
import ChatPratica from '@/components/ChatPratica'
import BoxUdienzeETermini from '@/components/avvocato/BoxUdienzeETermini'
import ModalEliminaPratica from '@/components/avvocato/ModalEliminaPratica'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const STATI = {
    aperta: { key: 'aperta', variant: 'salvia' },
    chiusa: { key: 'chiusa', variant: 'gray' },
}

async function caricaContesto(userId) {
    const { data: profilo } = await supabase
        .from('profiles').select('posti_acquistati').eq('id', userId).single()
    const haStudio = (profilo?.posti_acquistati ?? 1) > 1
    let collaboratori = []
    if (haStudio) {
        const { data: c } = await supabase
            .from('profiles').select('id, nome, cognome').eq('titolare_id', userId)
        collaboratori = c ?? []
    }
    return { haStudio, collaboratori, ids: [userId, ...collaboratori.map(c => c.id)] }
}

function BackToPratiche() {
    const { t } = useTranslation('avv_pratica_dettaglio')
    return (
        <Link
            to="/pratiche"
            className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
        >
            <ArrowLeft size={11} /> {t('back.tutte_le_pratiche')}
        </Link>
    )
}

// ─────────────────────────────────────────────────────────────
// NOTE MODAL
// ─────────────────────────────────────────────────────────────
function NoteInterneModal({ note, setNote, onSalva, salvando, salvate, ultimaModifica, onClose }) {
    const { t } = useTranslation('avv_pratica_dettaglio')
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <StickyNote size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">{t('note_modal.titolo')}</p>
                        <span className="font-body text-xs text-nebbia/30">{t('note_modal.sottotitolo')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-nebbia/40 hover:text-nebbia transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <textarea
                        rows={12}
                        autoFocus
                        placeholder={t('note_modal.placeholder')}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                    />
                    <p className="font-body text-xs text-nebbia/30 mt-2">
                        {t('note_modal.disclaimer')}
                    </p>

                    {salvate && (
                        <div className="mt-3 p-2.5 bg-salvia/10 border border-salvia/30 flex items-center gap-2 animate-fade-in">
                            <Check size={13} className="text-salvia shrink-0" />
                            <p className="font-body text-xs text-salvia">{t('note_modal.salvate')}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5 shrink-0">
                    <p className="font-body text-xs text-nebbia/30">
                        {ultimaModifica
                            ? t('note_modal.ultima_modifica', { autore: ultimaModifica.autore, data: ultimaModifica.data })
                            : t('note_modal.mai_modificate')}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                        >
                            {t('common.chiudi')}
                        </button>
                        <button
                            onClick={onSalva}
                            disabled={salvando}
                            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                        >
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Save size={11} /> {t('note_modal.salva_note')}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// RICERCA ESPANDIBILE
// ─────────────────────────────────────────────────────────────
function RicercaEspandibile({ contenuto, id, tipo, onSalva }) {
    const { t } = useTranslation('avv_pratica_dettaglio')
    const [espansa, setEspansa] = useState(false)
    const [modifica, setModifica] = useState(false)
    const [contenutoEdit, setContenutoEdit] = useState(contenuto ?? '')
    const [salvando, setSalvando] = useState(false)

    async function salva() {
        setSalvando(true)
        await supabase.from('ricerche').update({ contenuto: contenutoEdit }).eq('id', id)
        setModifica(false)
        if (onSalva) await onSalva()
        setSalvando(false)
    }

    if (modifica) return (
        <div className="ml-5 space-y-2 mt-1">
            <textarea
                rows={5}
                value={contenutoEdit}
                onChange={e => setContenutoEdit(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none"
            />
            <div className="flex gap-2">
                <button
                    onClick={salva}
                    disabled={salvando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                >
                    {salvando
                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Save size={10} /> {t('common.salva')}</>
                    }
                </button>
                <button
                    onClick={() => { setModifica(false); setContenutoEdit(contenuto ?? '') }}
                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                >
                    {t('common.annulla')}
                </button>
            </div>
        </div>
    )

    return (
        <div className="ml-5 mt-1">
            {tipo === 'ricerca_ai' || tipo === 'chat_lex' ? (
                <div className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? '' : 'line-clamp-3'}`}>
                    <ReactMarkdown
                        components={{
                            h2: ({ children }) => <h2 className="font-body text-xs font-semibold text-nebbia mt-2 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/70 mt-1 mb-0.5">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold text-nebbia/70">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="font-body text-xs">{children}</li>,
                            p: ({ children }) => <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-1">{children}</p>,
                        }}
                    >
                        {contenuto}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
                    {contenuto}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1">
                <button
                    onClick={() => setEspansa(!espansa)}
                    className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors"
                >
                    {espansa ? t('ricerca_espandibile.riduci') : t('ricerca_espandibile.espandi')}
                </button>
                {tipo === 'ricerca_manuale' && (
                    <button
                        onClick={() => setModifica(true)}
                        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors"
                    >
                        {t('common.modifica')}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PraticaDettaglio() {
    const { t, i18n } = useTranslation('avv_pratica_dettaglio')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const { id } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [id])

    const [pratica, setPratica] = useState(null)
    const [collabPratica, setCP] = useState([])
    const [collabs, setCollabs] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [meId, setMeId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [salvandoNote, setSalvando] = useState(false)
    const [mostraNoteModal, setMostraNoteModal] = useState(false)
    const [noteSalvate, setNoteSalvate] = useState(false)

    const [mostraEsito, setMostraEsito] = useState(false)
    const [esito, setEsito] = useState('')
    const [mostraEliminaModal, setMostraEliminaModal] = useState(false)

    const [noteEsito, setNoteEsito] = useState('')
    const [salvandoNoteEsito, setSalvandoNoteEsito] = useState(false)

    const [ricerche, setRicerche] = useState([])
    const [loadingRicerche, setLoadingRicerche] = useState(false)
    const [mostraFormRicerca, setMostraForm] = useState(false)
    const [nuovaRicerca, setNuovaRicerca] = useState({ titolo: '', contenuto: '' })
    const [salvandoRicerca, setSalvandoRicerca] = useState(false)
    const [erroreRicerca, setErroreRicerca] = useState(null)

    const [documenti, setDocumenti] = useState([])
    const [loadingDocs, setLoadingDocs] = useState(false)

    async function caricaRicerche() {
        setLoadingRicerche(true)
        const { data } = await supabase
            .from('ricerche')
            .select('id, tipo, titolo, contenuto, metadati, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', id)
            .in('tipo', ['ricerca_ai', 'ricerca_manuale', 'chat_lex'])
            .order('created_at', { ascending: false })
        setRicerche(data ?? [])
        setLoadingRicerche(false)
    }

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: p } = await supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, note, note_esito, esito, created_at, prossima_udienza, avvocato_id, cliente_id, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto), aggiornato_da, aggiornatore:aggiornato_da(nome, cognome), updated_at')
                .eq('id', id).single()
            if (p) { setPratica(p); setNote(p.note ?? ''); setNoteEsito(p.note_esito ?? '') }

            const { data: cp } = await supabase
                .from('pratica_collaboratori')
                .select('avvocato_id, profilo:avvocato_id(id, nome, cognome)')
                .eq('pratica_id', id)
            setCP(cp?.map(c => ({ id: c.profilo.id, nome: `${c.profilo.nome} ${c.profilo.cognome}` })) ?? [])

            const ctx = await caricaContesto(user.id)
            setIsStudio(ctx.haStudio)
            setCollabs(ctx.collaboratori)

            await caricaRicerche()
            await caricaDocumenti()
            setLoading(false)
        }
        load()
    }, [id])

    async function salvaNote() {
        setSalvando(true)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('pratiche').update({
            note,
            aggiornato_da: user.id,
            updated_at: new Date().toISOString()
        }).eq('id', id)
        const { data: p } = await supabase
            .from('pratiche')
            .select('aggiornatore:aggiornato_da(nome, cognome), updated_at')
            .eq('id', id).single()
        if (p) setPratica(prev => ({ ...prev, ...p }))
        setSalvando(false)
        setNoteSalvate(true)
        setTimeout(() => setNoteSalvate(false), 2500)
    }

    async function caricaDocumenti() {
        setLoadingDocs(true)
        const [docPratichePromise, docArchivioPromise] = await Promise.all([
            supabase
                .from('documenti_pratiche')
                .select('id, nome_file, storage_path, dimensione, tipo_file, created_at, autore:autore_id(nome, cognome)')
                .eq('pratica_id', id)
                .order('created_at', { ascending: false }),
            supabase
                .from('archivio_documenti')
                .select('id, titolo, storage_path, dimensione, tipo_file, tipo, ocr_status, created_at, metadati, autore:autore_id(nome, cognome)')
                .eq('pratica_id', id)
                .order('created_at', { ascending: false }),
        ])

        const dpRows = (docPratichePromise.data ?? []).map(d => ({
            ...d,
            fonte: 'pratica',
            bucket: 'documenti',
        }))

        const daRows = (docArchivioPromise.data ?? []).map(d => ({
            id: d.id,
            nome_file: d.titolo,
            storage_path: d.storage_path,
            dimensione: d.dimensione,
            tipo_file: d.tipo_file,
            created_at: d.created_at,
            autore: d.autore,
            fonte: 'archivio',
            bucket: 'archivio',
            ocr_status: d.ocr_status,
            riepilogo: d.metadati?.suggeriti?.riepilogo ?? null,
        }))

        const tutti = [...dpRows, ...daRows].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        )
        setDocumenti(tutti)
        setLoadingDocs(false)
    }

    async function scaricaDocumento(doc) {
        const bucket = doc.bucket ?? 'documenti'
        const { data } = await supabase.storage
            .from(bucket)
            .createSignedUrl(doc.storage_path, 3600)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    async function eliminaDocumento(doc) {
        if (doc.fonte === 'archivio') {
            if (!confirm(t('documenti.conferma_rimuovi_archivio', { nome: doc.nome_file }))) return
            await supabase
                .from('archivio_documenti')
                .update({ pratica_id: null })
                .eq('id', doc.id)
            setDocumenti(prev => prev.filter(d => !(d.id === doc.id && d.fonte === 'archivio')))
            return
        }

        if (!confirm(t('documenti.conferma_elimina', { nome: doc.nome_file }))) return
        const bucket = doc.bucket ?? 'documenti'
        await supabase.storage.from(bucket).remove([doc.storage_path])
        await supabase.from('documenti_pratiche').delete().eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => !(d.id === doc.id && d.fonte === 'pratica')))
    }

    async function salvaRicercaManuale() {
        setErroreRicerca(null)
        if (!nuovaRicerca.contenuto.trim()) return setErroreRicerca(t('ricerche.errore_contenuto_obbligatorio'))
        setSalvandoRicerca(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('ricerche').insert({
                pratica_id: id,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'ricerca_manuale',
                titolo: nuovaRicerca.titolo.trim() || t('ricerche.titolo_default'),
                contenuto: nuovaRicerca.contenuto.trim(),
                metadati: {
                    ts: new Date().toISOString(),
                }
            })
            setNuovaRicerca({ titolo: '', contenuto: '' })
            setMostraForm(false)
            await caricaRicerche()
        } catch (e) {
            setErroreRicerca(e.message)
        } finally {
            setSalvandoRicerca(false)
        }
    }

    async function eliminaRicerca(ricercaId) {
        if (!confirm(t('ricerche.conferma_elimina'))) return
        await supabase.from('ricerche').delete().eq('id', ricercaId)
        setRicerche(prev => prev.filter(r => r.id !== ricercaId))
    }

    async function toggleCollab(membroId) {
        const esiste = collabPratica.find(c => c.id === membroId)
        if (esiste) {
            await supabase.from('pratica_collaboratori').delete().eq('pratica_id', id).eq('avvocato_id', membroId)
            setCP(prev => prev.filter(c => c.id !== membroId))
        } else {
            await supabase.from('pratica_collaboratori').insert({ pratica_id: id, avvocato_id: membroId })
            const m = collabs.find(c => c.id === membroId)
            if (m) setCP(prev => [...prev, { id: m.id, nome: `${m.nome} ${m.cognome}` }])
        }
    }

    function nomeClienteDisplay(c) {
        if (!c) return t('common.trattino')
        if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? t('common.trattino')
        return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || t('common.trattino')
    }

    if (loading) return (
        <div className="flex justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (!pratica) return (
        <div className="space-y-5 px-6 pt-10 pb-24">
            <BackToPratiche />
            <p className="font-body text-sm text-nebbia/40">{t('loading.non_trovata')}</p>
        </div>
    )

    const sc = STATI[pratica.stato] ?? STATI.aperta
    const nomeAvv = pratica.avvocato_id === meId ? t('common.tu')
        : (() => { const c = collabs.find(c => c.id === pratica.avvocato_id); return c ? `${c.nome} ${c.cognome}` : t('common.trattino') })()
    const collabDisp = collabs.filter(c => c.id !== pratica.avvocato_id && !collabPratica.find(cp => cp.id === c.id))
    const haNote = note && note.trim().length > 0
    const ultimaModifica = pratica.aggiornatore
        ? {
            autore: `${pratica.aggiornatore.nome} ${pratica.aggiornatore.cognome}`,
            data: new Date(pratica.updated_at).toLocaleDateString(dateLocale)
        }
        : null

    return (
        <div className="space-y-5 px-6 pb-20">
            {/* ═══════════════ Header ═══════════════ */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="section-label mb-2">{t('header.label')}</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{pratica.titolo}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        {nomeClienteDisplay(pratica.cliente)} · {pratica.tipo ?? t('common.trattino')}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                    <BackToPratiche />
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={() => setMostraNoteModal(true)}
                            className="relative flex items-center gap-1.5 font-body text-xs text-nebbia/60 border border-white/15 hover:border-oro/40 hover:text-oro hover:bg-oro/5 px-3 py-1.5 transition-colors"
                        >
                            <StickyNote size={11} />
                            {t('header.note_interne')}
                            {haNote && (
                                <span className="w-1.5 h-1.5 rounded-full bg-oro ml-0.5" />
                            )}
                        </button>

                        <Badge label={t(`stati.${sc.key}`)} variant={sc.variant} />
                        {pratica.stato === 'aperta' ? (
                            mostraEsito ? (
                                <div className="flex items-center gap-2 bg-slate border border-white/10 p-2">
                                    <select
                                        value={esito}
                                        onChange={e => setEsito(e.target.value)}
                                        className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                                    >
                                        <option value="">{t('header.seleziona_esito')}</option>
                                        <option value="vinta">{t('esiti.vinta')}</option>
                                        <option value="persa">{t('esiti.persa')}</option>
                                        <option value="transatta">{t('esiti.transatta')}</option>
                                        <option value="archiviata">{t('esiti.archiviata')}</option>
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!esito) return
                                            await supabase.from('pratiche').update({ stato: 'chiusa', esito }).eq('id', id)
                                            setPratica(prev => ({ ...prev, stato: 'chiusa', esito }))
                                            setMostraEsito(false)
                                        }}
                                        className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                                    >
                                        {t('header.conferma_chiusura')}
                                    </button>
                                    <button
                                        onClick={() => { setMostraEsito(false); setEsito('') }}
                                        className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors px-2"
                                    >
                                        {t('common.annulla')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setMostraEsito(true)}
                                    className="font-body text-xs text-nebbia/50 hover:text-red-400 border border-white/15 hover:border-red-500/30 hover:bg-red-500/5 px-3 py-1.5 transition-colors"
                                >
                                    {t('header.chiudi_pratica')}
                                </button>
                            )
                        ) : (
                            <button
                                onClick={async () => {
                                    await supabase.from('pratiche').update({ stato: 'aperta', esito: null }).eq('id', id)
                                    setPratica(prev => ({ ...prev, stato: 'aperta', esito: null }))
                                }}
                                className="font-body text-xs text-salvia/70 border border-salvia/30 bg-salvia/5 hover:bg-salvia/15 px-3 py-1.5 transition-colors"
                            >
                                {t('header.riapri_pratica')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════ SEZIONE 1 — Grid 5 colonne ═══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:items-stretch">

                {/* SINISTRA (3/5) */}
                <div className="lg:col-span-3 space-y-5">

                    {/* Riga 1: Dettagli + Controparti affiancati */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Dettagli */}
                        <div className="bg-slate border border-white/5 p-5 space-y-3">
                            <p className="section-label">{t('dettagli.titolo')}</p>
                            {[
                                [t('dettagli.cliente'), nomeClienteDisplay(pratica.cliente)],
                                [t('dettagli.tipo'), pratica.tipo ?? t('common.trattino')],
                                [t('dettagli.creata_il'), new Date(pratica.created_at).toLocaleDateString(dateLocale)],
                                ...(pratica.esito ? [[t('dettagli.esito'), (
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body border ${pratica.esito === 'vinta' ? 'bg-salvia/15 text-salvia border-salvia/30' :
                                        pratica.esito === 'persa' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                            pratica.esito === 'transatta' ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' :
                                                'bg-white/5 text-nebbia/40 border-white/10'
                                        }`}>
                                        {t(`esiti.${pratica.esito}`)}
                                    </span>
                                )]] : []),
                                ...(isStudio ? [[t('dettagli.avvocato'), nomeAvv]] : []),
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                    <span className="font-body text-sm text-nebbia">{v}</span>
                                </div>
                            ))}
                            {isStudio && (
                                <div>
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">{t('dettagli.collaboratori')}</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {collabPratica.length === 0
                                            ? <span className="font-body text-xs text-nebbia/25 italic">{t('dettagli.nessun_collaboratore')}</span>
                                            : collabPratica.map(c => (
                                                <span key={c.id} className="flex items-center gap-1 font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/25 text-salvia">
                                                    {c.nome}
                                                    <button onClick={() => toggleCollab(c.id)} className="text-salvia/50 hover:text-red-400 ml-0.5">×</button>
                                                </span>
                                            ))
                                        }
                                    </div>
                                    {collabDisp.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {collabDisp.map(c => (
                                                <button key={c.id} onClick={() => toggleCollab(c.id)}
                                                    className="font-body text-xs px-2 py-1 border border-white/10 text-nebbia/30 hover:border-salvia/30 hover:text-salvia transition-colors">
                                                    + {c.nome} {c.cognome}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Controparti */}
                        <ContropartiBox praticaId={id} />
                    </div>

                    {/* Riga 2: Udienze + Termini (full-width) */}
                    <BoxUdienzeETermini
                        praticaId={id}
                        clienteId={pratica.cliente_id}
                        praticaTitolo={pratica.titolo}
                        onUdienzaSaved={async () => {
                            const { data: p } = await supabase
                                .from('pratiche')
                                .select('prossima_udienza')
                                .eq('id', id)
                                .single()
                            if (p) setPratica(prev => ({ ...prev, prossima_udienza: p.prossima_udienza }))
                        }}
                    />
                    {/* Riga 3: Documenti (full-width) */}
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <p className="section-label">{t('documenti.titolo', { count: documenti.length })}</p>
                            <Link
                                to="/archivio"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                            >
                                <Plus size={11} /> {t('documenti.aggiungi_documento')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/30 mb-3">
                            {t('documenti.disclaimer')}
                        </p>
                        {loadingDocs ? (
                            <div className="flex justify-center py-6">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : documenti.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-1 text-nebbia/30 text-center">
                                <FileText size={20} className="mb-2 text-nebbia/20" />
                                <span className="font-body text-xs">{t('documenti.vuoto_titolo')}</span>
                                <span className="font-body text-xs text-nebbia/25 mt-1">{t('documenti.vuoto_sottotitolo')}</span>
                            </div>
                        ) : (
                            <div className={`space-y-2 ${documenti.length > 5 ? 'max-h-80 overflow-y-auto -mr-1 pr-1' : ''}`}>
                                {documenti.map(doc => (
                                    <div key={`${doc.fonte}-${doc.id}`} className="flex items-start justify-between gap-3 p-3 bg-petrolio border border-white/5">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <FileText size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-body text-sm text-nebbia truncate">{doc.nome_file}</p>
                                                    {doc.fonte === 'archivio' && (
                                                        <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia uppercase tracking-wider">
                                                            {t('documenti.badge_archivio')}
                                                        </span>
                                                    )}
                                                </div>
                                                {doc.riepilogo && (
                                                    <p className="font-body text-xs text-nebbia/50 mt-1 line-clamp-2 leading-relaxed">
                                                        {doc.riepilogo}
                                                    </p>
                                                )}
                                                <p className="font-body text-xs text-nebbia/30 mt-0.5">
                                                    {doc.autore ? `${doc.autore.nome} ${doc.autore.cognome}` : t('common.trattino')} · {new Date(doc.created_at).toLocaleDateString(dateLocale)}
                                                    {doc.dimensione && ` · ${(doc.dimensione / 1024 / 1024).toFixed(1)} MB`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => scaricaDocumento(doc)} className="text-nebbia/30 hover:text-oro transition-colors" title={t('documenti.scarica')}>
                                                <Download size={13} />
                                            </button>
                                            <button onClick={() => eliminaDocumento(doc)} className="text-nebbia/30 hover:text-red-400 transition-colors"
                                                title={doc.fonte === 'archivio' ? t('documenti.rimuovi_dalla_pratica') : t('documenti.elimina')}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* DESTRA (2/5) — Ricerche: altezza fissa su mobile, allineata alla colonna sinistra su desktop */}
                <div className="lg:col-span-2 bg-slate border border-white/5 flex flex-col h-[600px] lg:h-auto lg:min-h-0">

                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                        <p className="section-label">{t('ricerche.titolo', { count: ricerche.length })}</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/banca-dati')}
                                className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1"
                            >
                                <Search size={11} /> {t('ricerche.cerca_banca_dati')}
                            </button>
                            <button
                                onClick={() => setMostraForm(!mostraFormRicerca)}
                                className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                            >
                                <Plus size={11} /> {t('ricerche.aggiungi')}
                            </button>
                        </div>
                    </div>

                    {mostraFormRicerca && (
                        <div className="px-4 py-3 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                            <input
                                placeholder={t('ricerche.placeholder_titolo')}
                                value={nuovaRicerca.titolo}
                                onChange={e => setNuovaRicerca(p => ({ ...p, titolo: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <textarea
                                rows={4}
                                placeholder={t('ricerche.placeholder_contenuto')}
                                value={nuovaRicerca.contenuto}
                                onChange={e => setNuovaRicerca(p => ({ ...p, contenuto: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                            {erroreRicerca && (
                                <p className="font-body text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} />{erroreRicerca}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={salvaRicercaManuale}
                                    disabled={salvandoRicerca}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {salvandoRicerca
                                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                        : <><Save size={11} /> {t('common.salva')}</>
                                    }
                                </button>
                                <button
                                    onClick={() => { setMostraForm(false); setNuovaRicerca({ titolo: '', contenuto: '' }); setErroreRicerca(null) }}
                                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                                >
                                    {t('common.annulla')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {loadingRicerche ? (
                            <div className="flex justify-center py-8">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : ricerche.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                                <Sparkles size={20} className="text-nebbia/20 mb-2" />
                                <p className="font-body text-sm text-nebbia/30">{t('ricerche.vuoto_titolo')}</p>
                                <p className="font-body text-xs text-nebbia/20 mt-1">
                                    {t('ricerche.vuoto_sottotitolo')}
                                </p>
                            </div>
                        ) : ricerche.map(r => (
                            <div key={r.id} className="border-b border-white/5 last:border-0 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex'
                                            ? <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                            : <Search size={11} className="text-oro shrink-0 mt-0.5" />
                                        }
                                        <p className="font-body text-xs font-medium text-nebbia/70">
                                            {r.titolo ?? (
                                                r.tipo === 'ricerca_ai' ? t('ricerche.tipo_ricerca_ai') :
                                                    r.tipo === 'chat_lex' ? t('ricerche.tipo_chat_lex') : t('ricerche.tipo_ricerca_manuale')
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-body text-xs text-nebbia/25">
                                            {r.autore ? `${r.autore.nome} ${r.autore.cognome}` : t('common.trattino')} · {new Date(r.created_at).toLocaleDateString(dateLocale)}
                                        </span>
                                        <button onClick={() => eliminaRicerca(r.id)} className="text-nebbia/20 hover:text-red-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                <RicercaEspandibile contenuto={r.contenuto} id={r.id} tipo={r.tipo} onSalva={caricaRicerche} />
                                {(r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex') && r.metadati?.sentenze && (
                                    <p className="font-body text-xs text-oro/50 ml-5">{t('ricerche.giurisprudenza_correlata')}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════ Note esito (solo se chiusa) ═══════════════ */}
            {pratica.stato === 'chiusa' && pratica.esito && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">{t('note_esito.titolo')}</p>
                    <p className="font-body text-xs text-nebbia/30 leading-relaxed mb-3">
                        {t('note_esito.descrizione')}
                    </p>
                    <textarea
                        rows={4}
                        placeholder={t('note_esito.placeholder')}
                        value={noteEsito}
                        onChange={e => setNoteEsito(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                    />
                    <button
                        onClick={async () => {
                            setSalvandoNoteEsito(true)
                            await supabase.from('pratiche').update({ note_esito: noteEsito }).eq('id', id)
                            setPratica(prev => ({ ...prev, note_esito: noteEsito }))
                            setSalvandoNoteEsito(false)
                        }}
                        disabled={salvandoNoteEsito}
                        className="font-body text-xs text-nebbia/50 border border-white/10 hover:border-white/25 hover:text-nebbia px-4 py-2 mt-3 transition-colors"
                    >
                        {salvandoNoteEsito
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : t('note_esito.salva')
                        }
                    </button>
                </div>
            )}

            {/* ═══════════════ SEZIONE 2 — Lex per la pratica (box unico) ═══════════════ */}
            <div>
                <ChatPratica praticaId={id} onDocumentoSalvato={caricaDocumenti} />
            </div>

            {/* ═══════════ ZONA PERICOLOSA ═══════════ */}
            <div className="pt-8 mt-8 border-t border-red-500/20">
                <div className="flex items-start justify-between flex-wrap gap-3 bg-red-900/5 border border-red-500/20 p-5">
                    <div>
                        <p className="font-body text-sm font-medium text-red-400 mb-1">{t('zona_pericolosa.titolo')}</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed max-w-xl">
                            {t('zona_pericolosa.descrizione')}
                        </p>
                    </div>
                    <button
                        onClick={() => setMostraEliminaModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/10 transition-colors shrink-0"
                    >
                        <Trash2 size={13} /> {t('zona_pericolosa.bottone')}
                    </button>
                </div>
            </div>

            {/* Modale Note interne */}
            {mostraNoteModal && (
                <NoteInterneModal
                    note={note}
                    setNote={setNote}
                    onSalva={salvaNote}
                    salvando={salvandoNote}
                    salvate={noteSalvate}
                    ultimaModifica={ultimaModifica}
                    onClose={() => setMostraNoteModal(false)}
                />
            )}

            {/* Modale Elimina pratica */}
            {mostraEliminaModal && (
                <ModalEliminaPratica
                    pratica={pratica}
                    onClose={() => setMostraEliminaModal(false)}
                    onEliminata={() => navigate('/pratiche')}
                />
            )}
        </div>
    )
}