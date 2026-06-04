import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import {
    Tag, Search, Loader2, BookOpen, Sparkles, Landmark, ScrollText,
    Trash2, X, ExternalLink, MessageSquare, ArrowLeft, AlertCircle,
    FolderOpen, Save, Check, Plus, FileText, MapPin, Globe, Scale,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const TIPI = [
    { id: 'tutti', label: 'Tutti', icon: Tag },
    { id: 'ricerca_ai', label: 'Ricerche', icon: Sparkles },
    { id: 'norma_federale', label: 'Norme fed.', icon: Landmark },
    { id: 'norma_cantonale', label: 'Norme cant.', icon: MapPin },
    { id: 'norma_ue', label: 'Norme UE', icon: Globe },
    { id: 'giurisprudenza', label: 'Giurisprudenza', icon: Scale },
    { id: 'sentenza_ue', label: 'Sentenze UE', icon: Globe },
    { id: 'prassi', label: 'Prassi', icon: ScrollText },
]

const TIPI_RICERCA = ['ricerca_ai', 'ricerca_manuale', 'chat_lex']

// ── Risoluzione multilingua (replicata dalle pagine dettaglio CH) ──
const ORDINE_LINGUE = ['it', 'de', 'fr', 'en', 'rm']

function risolviJsonb(campo, linguaPref) {
    if (campo && typeof campo === 'object') {
        if (linguaPref && campo[linguaPref]) return campo[linguaPref]
        for (const k of ORDINE_LINGUE) if (campo[k]) return campo[k]
    }
    return null
}

function risolviTitoloGiur(s, linguaPref) {
    const ordine = [linguaPref, 'it', 'de', 'fr'].filter(Boolean)
    for (const l of ordine) {
        const v = s[`titolo_${l}`]
        if (v && v.trim()) return v
    }
    return s.signature ?? s.reference ?? '—'
}

const FONTI_FEDERALI = {
    TF: 'Tribunale federale',
    CH_BGE: 'DTF — Raccolta ufficiale',
    TAF: 'Tribunale amministrativo federale',
    TPF: 'Tribunale penale federale',
}
const CAMERA_LABEL = {
    OG: 'Obergericht',
    VG: 'Verwaltungsgericht',
    SVG: 'Sozialversicherungsgericht',
    BR: 'Baurekursgericht',
    SR: 'Steuerrekursgericht',
    FI: 'Tribunal',
}
function labelFonteGiur(fonte) {
    if (!fonte) return '—'
    if (FONTI_FEDERALI[fonte]) return FONTI_FEDERALI[fonte]
    const m = /^CANT_([A-Z]{2})_(.+)$/.exec(fonte)
    if (m) {
        const cam = CAMERA_LABEL[m[2]] ?? m[2]
        return `${m[1]} · ${cam}`
    }
    return fonte
}

const EMITTENTI_FEDERALI = {
    estv: 'AFC — Contribuzioni federali',
    ufas: 'UFAS — Assicurazioni sociali',
    seco: 'SECO — Economia',
    finma: 'FINMA — Vigilanza finanziaria',
    udsc: 'UDSC — Dogane',
    sem: 'SEM — Migrazione',
    ufg: 'UFG — Giustizia',
    weko: 'COMCO — Concorrenza',
    ifpdt: 'IFPDT — Protezione dati',
    mros: 'MROS — Riciclaggio',
}
function troncaEmittente(nome) {
    if (!nome) return ''
    const primo = nome.split(/[\/|;]/)[0].trim()
    return primo.length > 60 ? primo.slice(0, 60) + '…' : primo
}
function labelFontePrassi(p) {
    if (p.fonte === 'fisco_cant') {
        return p.cantone ? `Fisco cantonale · ${p.cantone}` : 'Fisco cantonale'
    }
    return EMITTENTI_FEDERALI[p.fonte] ?? (p.emittente_nome ? troncaEmittente(p.emittente_nome) : (p.fonte ?? '—'))
}

function linkCorpus(kind, id, basePathBancaDati) {
    if (kind === 'norma_federale') return `${basePathBancaDati}/norma-federale/${id}`
    if (kind === 'norma_cantonale') return `${basePathBancaDati}/norma-cantonale/${id}`
    if (kind === 'norma_ue') return `${basePathBancaDati}/norma-ue/${id}`
    if (kind === 'giurisprudenza') return `${basePathBancaDati}/sentenza-ch/${id}`
    if (kind === 'sentenza_ue') return `${basePathBancaDati}/sentenza-ue/${id}`
    if (kind === 'prassi') return `${basePathBancaDati}/prassi-ch/${id}`
    return null
}

export default function EtichettaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()

    const isPro = profile?.role === 'avvocato' || profile?.role === 'fiduciario'
    const basePathRicerche = isPro ? '/ricerche' : '/area/ricerche'
    const basePathBancaDati = isPro ? '/banca-dati' : '/area'
    const linguaPref = (profile?.lingua ?? 'it')

    const [etichetta, setEtichetta] = useState(null)
    const [contenuti, setContenuti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [etichetteUtente, setEtichetteUtente] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    const [tipoAttivo, setTipoAttivo] = useState('tutti')
    const [cerca, setCerca] = useState('')
    const [eliminando, setEliminando] = useState(null)
    const [contenutoAperto, setContenutoAperto] = useState(null)

    useEffect(() => { caricaTutto() }, [id])

    async function caricaTutto() {
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/login'); return }

            const { data: tag, error: errTag } = await supabase
                .from('etichette')
                .select('id, nome, colore, created_at, updated_at')
                .eq('id', id)
                .single()
            if (errTag) throw new Error(errTag.message)
            setEtichetta(tag)

            const [
                { data: rels, error: errRels },
                { data: prat },
                { data: tutteEt },
            ] = await Promise.all([
                supabase
                    .from('elementi_etichette')
                    .select('id, tipo, elemento_id, created_at')
                    .eq('etichetta_id', id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('pratiche')
                    .select('id, titolo')
                    .order('updated_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('etichette')
                    .select('id, nome, colore')
                    .eq('user_id', user.id)
                    .order('nome'),
            ])

            if (errRels) throw new Error(errRels.message)

            setPratiche(prat ?? [])
            setEtichetteUtente(tutteEt ?? [])

            const arricchiti = await Promise.all((rels ?? []).map(rel => arricchisciContenuto(rel, linguaPref)))
            setContenuti(arricchiti.filter(Boolean))
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function arricchisciContenuto(rel, lingua) {
        try {
            if (TIPI_RICERCA.includes(rel.tipo)) {
                const { data } = await supabase
                    .from('ricerche')
                    .select('id, titolo, contenuto, metadati, tipo, created_at, pratica_id, pratica:pratica_id(id, titolo)')
                    .eq('id', rel.elemento_id)
                    .maybeSingle()
                return data ? { ...rel, dati: data, kindFiltro: 'ricerca_ai' } : null
            }

            if (rel.tipo === 'norma_federale') {
                const { data: art } = await supabase
                    .from('norme_ch_articoli')
                    .select('id, norma_id, articolo_label, rubrica_articolo, testo')
                    .eq('id', rel.elemento_id).maybeSingle()
                if (!art) return null
                let attoTit = ''
                if (art.norma_id) {
                    const { data: atto } = await supabase
                        .from('norme_ch')
                        .select('titolo, titolo_short, rs_numero')
                        .eq('id', art.norma_id).maybeSingle()
                    if (atto) attoTit = risolviJsonb(atto.titolo_short, lingua) || risolviJsonb(atto.titolo, lingua) || atto.rs_numero || ''
                }
                return { ...rel, dati: { ...art, atto_titolo: attoTit }, kindFiltro: 'norma_federale' }
            }

            if (rel.tipo === 'norma_cantonale') {
                const { data: art } = await supabase
                    .from('norme_cantonali_ch_articoli')
                    .select('id, norma_id, article_num, article_suffix, rubrica, testo')
                    .eq('id', rel.elemento_id).maybeSingle()
                if (!art) return null
                let attoTit = '', canton = null
                if (art.norma_id) {
                    const { data: atto } = await supabase
                        .from('norme_cantonali_ch')
                        .select('title, title_by_lang, abbreviation, canton')
                        .eq('id', art.norma_id).maybeSingle()
                    if (atto) {
                        attoTit = risolviJsonb(atto.title_by_lang, lingua) || atto.title || atto.abbreviation || ''
                        canton = atto.canton ?? null
                    }
                }
                const artLabel = art.article_num ? `Art. ${art.article_num}${art.article_suffix ?? ''}` : null
                return { ...rel, dati: { ...art, atto_titolo: attoTit, canton, articolo_label: artLabel }, kindFiltro: 'norma_cantonale' }
            }

            if (rel.tipo === 'norma_ue') {
                const idNum = Number(rel.elemento_id)
                const { data } = await supabase
                    .from('norme_ue')
                    .select('id, articolo, rubrica, testo, titolo_doc, titolo_breve, celex')
                    .eq('id', Number.isNaN(idNum) ? rel.elemento_id : idNum).maybeSingle()
                if (!data) return null
                const attoTit = data.titolo_breve || data.titolo_doc || data.celex || ''
                const artLabel = data.articolo ? `Art. ${data.articolo}` : null
                return { ...rel, dati: { ...data, atto_titolo: attoTit, articolo_label: artLabel }, kindFiltro: 'norma_ue' }
            }

            if (rel.tipo === 'giurisprudenza') {
                const { data } = await supabase
                    .from('giurisprudenza_ch')
                    .select('id, fonte, camera_codice, signature, reference, anno_deposito, data_decisione, oggetto, principio_diritto, titolo_it, titolo_de, titolo_fr')
                    .eq('id', rel.elemento_id).maybeSingle()
                if (!data) return null
                return {
                    ...rel,
                    dati: {
                        ...data,
                        organo: labelFonteGiur(data.fonte),
                        titolo_risolto: risolviTitoloGiur(data, lingua),
                        numero: data.signature ?? data.reference,
                        anno: data.anno_deposito,
                    },
                    kindFiltro: 'giurisprudenza',
                }
            }

            if (rel.tipo === 'sentenza_ue') {
                const { data } = await supabase
                    .from('eur_lex')
                    .select('id, organo, numero_caso, ecli, celex_id, oggetto, parti, data_decisione')
                    .eq('id', rel.elemento_id).maybeSingle()
                if (!data) return null
                return {
                    ...rel,
                    dati: {
                        ...data,
                        organo: data.organo ?? 'CGUE',
                        numero: data.numero_caso ?? data.ecli ?? data.celex_id,
                    },
                    kindFiltro: 'sentenza_ue',
                }
            }

            if (rel.tipo === 'prassi') {
                const { data } = await supabase
                    .from('prassi_ch')
                    .select('id, fonte, cantone, emittente_nome, numero, anno, oggetto, titolo, data_emanazione')
                    .eq('id', rel.elemento_id).maybeSingle()
                if (!data) return null
                return { ...rel, dati: { ...data, fonte_label: labelFontePrassi(data) }, kindFiltro: 'prassi' }
            }

            return null
        } catch (e) {
            return null
        }
    }

    async function rimuoviContenuto(rel) {
        if (!confirm('Rimuovere questo elemento dall\'etichetta?\n\nL\'elemento originale (ricerca, giurisprudenza, norma, prassi) non viene cancellato.')) return
        setEliminando(rel.id)
        try {
            const { error } = await supabase
                .from('elementi_etichette')
                .delete()
                .eq('id', rel.id)
            if (error) throw new Error(error.message)
            setContenuti(prev => prev.filter(c => c.id !== rel.id))
        } catch (e) {
            setErrore(e.message)
        } finally {
            setEliminando(null)
        }
    }

    const contenutiFiltrati = contenuti.filter(c => {
        if (tipoAttivo !== 'tutti' && c.kindFiltro !== tipoAttivo) return false
        if (!cerca.trim()) return true
        const q = cerca.toLowerCase()
        if (TIPI_RICERCA.includes(c.tipo)) {
            return ((c.dati.titolo ?? '') + ' ' + (c.dati.contenuto ?? '')).toLowerCase().includes(q)
        }
        if (c.tipo === 'norma_federale' || c.tipo === 'norma_cantonale' || c.tipo === 'norma_ue') {
            return (`${c.dati.atto_titolo ?? ''} ${c.dati.articolo_label ?? ''} ${c.dati.rubrica ?? c.dati.rubrica_articolo ?? ''} ${c.dati.testo ?? ''}`).toLowerCase().includes(q)
        }
        if (c.tipo === 'giurisprudenza') {
            return (`${c.dati.oggetto ?? ''} ${c.dati.principio_diritto ?? ''} ${c.dati.organo ?? ''} ${c.dati.titolo_risolto ?? ''}`).toLowerCase().includes(q)
        }
        if (c.tipo === 'sentenza_ue') {
            return (`${c.dati.oggetto ?? ''} ${c.dati.parti ?? ''} ${c.dati.organo ?? ''}`).toLowerCase().includes(q)
        }
        if (c.tipo === 'prassi') {
            return (`${c.dati.oggetto ?? ''} ${c.dati.titolo ?? ''} ${c.dati.fonte_label ?? ''}`).toLowerCase().includes(q)
        }
        return false
    })

    const conteggiPerTipo = {
        tutti: contenuti.length,
        ricerca_ai: contenuti.filter(c => c.kindFiltro === 'ricerca_ai').length,
        norma_federale: contenuti.filter(c => c.kindFiltro === 'norma_federale').length,
        norma_cantonale: contenuti.filter(c => c.kindFiltro === 'norma_cantonale').length,
        norma_ue: contenuti.filter(c => c.kindFiltro === 'norma_ue').length,
        giurisprudenza: contenuti.filter(c => c.kindFiltro === 'giurisprudenza').length,
        sentenza_ue: contenuti.filter(c => c.kindFiltro === 'sentenza_ue').length,
        prassi: contenuti.filter(c => c.kindFiltro === 'prassi').length,
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={20} className="animate-spin text-oro" />
        </div>
    )

    if (errore) return (
        <div className="space-y-5">
            <Link to={basePathRicerche} className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                <ArrowLeft size={11} /> Tutte le ricerche
            </Link>
            <div className="bg-slate border border-red-500/20 p-8 text-center">
                <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                <p className="font-body text-sm text-red-400">{errore}</p>
            </div>
        </div>
    )

    if (!etichetta) return null

    return (
        <div className="space-y-5 px-6 pt-2 pb-6">

            <Link to={basePathRicerche} className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                <ArrowLeft size={11} /> Tutte le ricerche
            </Link>

            {/* Header etichetta */}
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <div className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: etichetta.colore || '#7FA39A' }} />
                <p className="section-label !m-0">Etichetta</p>
                <h1 className="font-display text-3xl font-light text-nebbia leading-none">{etichetta.nome}</h1>
                <p className="font-body text-xs text-nebbia/30">
                    · {contenuti.length} {contenuti.length === 1 ? 'elemento' : 'elementi'} · creata il {new Date(etichetta.created_at).toLocaleDateString('it-CH')}
                </p>
            </div>

            {/* Layout 60/40 */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Contenuti — 60% (3 col su 5) */}
                <div className="lg:col-span-3 space-y-4">

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca dentro questa etichetta..."
                            value={cerca}
                            onChange={e => setCerca(e.target.value)}
                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        {cerca && (
                            <button onClick={() => setCerca('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-1 bg-slate border border-white/5 p-1 overflow-x-auto">
                        {TIPI.map(({ id: tid, label, icon: Icon }) => {
                            const isActive = tipoAttivo === tid
                            const count = conteggiPerTipo[tid]
                            return (
                                <button
                                    key={tid}
                                    onClick={() => setTipoAttivo(tid)}
                                    className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors whitespace-nowrap ${isActive ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                                >
                                    <Icon size={11} />
                                    <span>{label}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] ${isActive ? 'text-oro/60' : 'text-nebbia/30'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {contenutiFiltrati.length === 0 ? (
                        <div className="bg-slate border border-white/5 py-12 text-center">
                            <Tag size={28} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">
                                {contenuti.length === 0
                                    ? 'Nessun contenuto in questa etichetta ancora'
                                    : 'Nessun risultato per questi filtri'}
                            </p>
                            {contenuti.length === 0 && (
                                <p className="font-body text-xs text-nebbia/20 mt-2 max-w-sm mx-auto leading-relaxed">
                                    Per aggiungere contenuti, vai nella banca dati e clicca "Aggiungi a etichetta" su giurisprudenza, norme o prassi. Puoi anche taggare le tue ricerche dalla pagina Ricerche.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contenutiFiltrati.map(c => (
                                <CardContenuto
                                    key={c.id}
                                    contenuto={c}
                                    onRimuovi={() => rimuoviContenuto(c)}
                                    eliminando={eliminando === c.id}
                                    aperto={contenutoAperto === c.id}
                                    onToggleApri={() => setContenutoAperto(contenutoAperto === c.id ? null : c.id)}
                                    basePathBancaDati={basePathBancaDati}
                                    onAggiornata={caricaTutto}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Chat Lex — 40% (2 col su 5) sticky */}
                <div className="lg:col-span-2">
                    <div className="lg:sticky lg:top-6">
                        <ChatEtichetta
                            etichetta={etichetta}
                            contenuti={contenuti}
                            pratiche={pratiche}
                            etichetteUtente={etichetteUtente}
                            onSintesiSalvata={caricaTutto}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CARD CONTENUTO
// ═══════════════════════════════════════════════════════════════
function CardContenuto({ contenuto: c, onRimuovi, eliminando, aperto, onToggleApri, basePathBancaDati, onAggiornata }) {

    if (TIPI_RICERCA.includes(c.tipo)) {
        const Icon = c.tipo === 'chat_lex' ? MessageSquare : c.tipo === 'ricerca_manuale' ? Search : Sparkles
        const colorIcon = c.tipo === 'ricerca_manuale' ? 'text-oro' : 'text-salvia'
        const tipoLabel = c.tipo === 'ricerca_ai' ? 'Ricerca AI'
            : c.tipo === 'chat_lex' ? 'Chat con Lex'
                : 'Ricerca manuale'

        return (
            <div className="bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                <div className="p-4 flex items-start gap-3">
                    <Icon size={14} className={`${colorIcon}/70 shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-nebbia leading-snug">
                            {c.dati.titolo ?? tipoLabel}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap mt-1">
                            <span className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider">{tipoLabel}</span>
                            {c.dati.pratica && (
                                <Link to={`/pratiche/${c.dati.pratica.id}`}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/60 hover:text-oro transition-colors">
                                    <FolderOpen size={10} /> {c.dati.pratica.titolo}
                                </Link>
                            )}
                        </div>
                        {!aperto && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2">
                                {c.dati.contenuto?.replace(/[#*_`]/g, '').slice(0, 200)}
                            </p>
                        )}
                        <p className="font-body text-[10px] text-nebbia/25 mt-2">
                            {new Date(c.dati.created_at).toLocaleDateString('it-CH', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onToggleApri}
                            className="font-body text-xs text-nebbia/30 hover:text-oro px-2 py-1 transition-colors">
                            {aperto ? 'Chiudi' : 'Apri'}
                        </button>
                        <button onClick={onRimuovi} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
                {aperto && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-petrolio/30 space-y-3">
                        <div className="font-body text-sm text-nebbia/70 leading-relaxed">
                            <ReactMarkdown
                                components={{
                                    h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                    h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
                                    strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                    p: ({ children }) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                                    li: ({ children }) => <li className="text-nebbia/60">{children}</li>,
                                }}
                            >
                                {c.dati.contenuto}
                            </ReactMarkdown>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-end">
                            <AggiungiAEtichetta
                                elemento={{ tipo: c.tipo, id: c.dati.id }}
                                variant="compact"
                                onCambio={onAggiornata}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ── Norme (federale / cantonale / UE) ──
    if (c.tipo === 'norma_federale' || c.tipo === 'norma_cantonale' || c.tipo === 'norma_ue') {
        const Icon = c.tipo === 'norma_cantonale' ? MapPin : c.tipo === 'norma_ue' ? Globe : Landmark
        const rubrica = c.dati.rubrica ?? c.dati.rubrica_articolo ?? ''
        const intestazione = [c.dati.atto_titolo, c.dati.articolo_label].filter(Boolean).join(' · ')
        return (
            <Link to={linkCorpus(c.tipo, c.dati.id, basePathBancaDati)}
                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <Icon size={14} className="text-oro/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-body text-xs text-oro font-medium">
                                {intestazione || 'Norma'}
                            </span>
                        </div>
                        {rubrica && (
                            <p className="font-body text-sm text-nebbia/70 group-hover:text-oro transition-colors leading-snug">
                                {rubrica}
                            </p>
                        )}
                        {c.dati.testo && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.testo.slice(0, 200)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    // ── Giurisprudenza CH ──
    if (c.tipo === 'giurisprudenza') {
        const titolo = [c.dati.organo, c.dati.numero && `${c.dati.numero}`, c.dati.anno].filter(Boolean).join(' · ')
        return (
            <Link to={linkCorpus(c.tipo, c.dati.id, basePathBancaDati)}
                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <Scale size={14} className="text-oro/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/50 mb-1">{titolo}</p>
                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">
                            {c.dati.titolo_risolto ?? c.dati.oggetto ?? 'Sentenza'}
                        </p>
                        {c.dati.principio_diritto && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.principio_diritto}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    // ── Sentenze UE (eur_lex) ──
    if (c.tipo === 'sentenza_ue') {
        const titolo = [c.dati.organo, c.dati.numero].filter(Boolean).join(' · ')
        return (
            <Link to={linkCorpus(c.tipo, c.dati.id, basePathBancaDati)}
                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <Globe size={14} className="text-oro/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/50 mb-1">{titolo}</p>
                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">
                            {c.dati.oggetto ?? 'Sentenza UE'}
                        </p>
                        {c.dati.parti && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.parti}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    // ── Prassi CH ──
    if (c.tipo === 'prassi') {
        const intestazione = [c.dati.fonte_label, c.dati.numero && `n. ${c.dati.numero}`, c.dati.anno].filter(Boolean).join(' · ')
        return (
            <Link to={linkCorpus(c.tipo, c.dati.id, basePathBancaDati)}
                className="block bg-slate border border-white/5 hover:border-salvia/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <ScrollText size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/50 mb-1">{intestazione}</p>
                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-salvia transition-colors leading-snug">
                            {c.dati.titolo ?? c.dati.oggetto ?? 'Prassi'}
                        </p>
                        {c.dati.oggetto && c.dati.titolo && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.oggetto}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-salvia transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    return null
}

// ═══════════════════════════════════════════════════════════════
// CHAT ETICHETTA — Suggerimenti rapidi + textarea libera + streaming
// I "chip" non inviano un'azione: pre-compilano la textarea con una frase
// pronta nella lingua dell'avvocato. L'invio è SEMPRE una domanda libera,
// così il Lead riconosce la lingua dal testo digitato.
// ═══════════════════════════════════════════════════════════════

const AZIONI_ETICHETTA = [
    {
        id: 'mappa_concettuale',
        emoji: '📊',
        label: { it: 'Mappa concettuale', de: 'Konzeptkarte', fr: 'Carte conceptuelle' },
        descr: { it: 'Riorganizza per temi', de: 'Nach Themen ordnen', fr: 'Réorganiser par thèmes' },
        prompt: {
            it: 'Crea una mappa concettuale di questa etichetta, riorganizzando gli elementi per temi principali.',
            de: 'Erstelle eine Konzeptkarte dieser Etikette und ordne die Elemente nach Hauptthemen.',
            fr: 'Crée une carte conceptuelle de cette étiquette en réorganisant les éléments par thèmes principaux.',
        },
    },
    {
        id: 'cosa_ho_ragionato',
        emoji: '🔍',
        label: { it: 'Cosa ho ragionato', de: 'Mein Gedankengang', fr: 'Mon raisonnement' },
        descr: { it: 'Traiettoria del pensiero', de: 'Verlauf der Überlegung', fr: 'Trajectoire de la réflexion' },
        prompt: {
            it: 'Ricostruisci la traiettoria del mio ragionamento attraverso gli elementi di questa etichetta.',
            de: 'Rekonstruiere den Verlauf meiner Überlegungen anhand der Elemente dieser Etikette.',
            fr: 'Reconstitue la trajectoire de mon raisonnement à travers les éléments de cette étiquette.',
        },
    },
    {
        id: 'insight',
        emoji: '💡',
        label: { it: 'Insight', de: 'Erkenntnisse', fr: 'Observations' },
        descr: { it: 'Pattern e connessioni', de: 'Muster und Verbindungen', fr: 'Motifs et liens' },
        prompt: {
            it: 'Trova insight, pattern ricorrenti e connessioni inaspettate tra gli elementi di questa etichetta.',
            de: 'Finde Erkenntnisse, wiederkehrende Muster und unerwartete Verbindungen zwischen den Elementen dieser Etikette.',
            fr: 'Trouve des observations, des motifs récurrents et des liens inattendus entre les éléments de cette étiquette.',
        },
    },
    {
        id: 'stato_arte',
        emoji: '📝',
        label: { it: 'Stato dell\'arte', de: 'Sachstand', fr: 'État des lieux' },
        descr: { it: 'Memo strutturato', de: 'Strukturiertes Memo', fr: 'Mémo structuré' },
        prompt: {
            it: 'Redigi un memo sullo stato della ricerca giuridica raccolta in questa etichetta: quadro, orientamenti, aree aperte, direzioni operative.',
            de: 'Verfasse ein Memo zum Stand der in dieser Etikette gesammelten juristischen Recherche: Überblick, Tendenzen, offene Punkte, operative Hinweise.',
            fr: 'Rédige un mémo sur l\'état de la recherche juridique réunie dans cette étiquette : tableau, orientations, points ouverts, pistes opérationnelles.',
        },
    },
]

const FRASI_ETICHETTA = {
    mappa_concettuale: [
        'Sto rileggendo l\'etichetta',
        'Riconosco i temi ricorrenti',
        'Raggruppo per argomento',
        'Identifico le connessioni',
        'Compongo la mappa',
        'Verifico la coerenza',
        'Affino la struttura',
    ],
    cosa_ho_ragionato: [
        'Sto rileggendo l\'etichetta',
        'Ricostruisco il percorso',
        'Identifico le svolte',
        'Cerco i punti consolidati',
        'Riconosco le aree aperte',
        'Compongo la traiettoria',
        'Affino la narrazione',
    ],
    insight: [
        'Sto rileggendo l\'etichetta',
        'Cerco connessioni nascoste',
        'Riconosco i pattern',
        'Identifico le ipotesi nuove',
        'Cerco punti di forza',
        'Verifico le lacune',
        'Compongo gli insight',
    ],
    stato_arte: [
        'Sto rileggendo l\'etichetta',
        'Inquadro il quadro complessivo',
        'Estraggo gli orientamenti',
        'Identifico le tensioni',
        'Articolo le direzioni operative',
        'Strutturo il memo',
        'Rifinisco il documento',
    ],
    libera: [
        'Sto rileggendo l\'etichetta',
        'Analizzo la tua domanda',
        'Cerco i punti rilevanti',
        'Compongo la risposta',
        'Verifico l\'aderenza',
    ],
}

function ChatEtichetta({ etichetta, contenuti, pratiche, etichetteUtente, onSintesiSalvata }) {
    const { profile } = useAuth()
    const lang = (profile?.lingua === 'de' || profile?.lingua === 'fr') ? profile.lingua : 'it'
    const T = {
        it: {
            intro: (n) => `Scegli un suggerimento o scrivi una domanda. Lex ragionerà sui ${n} elementi di questa etichetta.`,
            vuoto: 'Aggiungi elementi all\'etichetta per iniziare a chattare.',
            placeholderNuova: 'Scrivi una domanda su questa etichetta…',
            placeholderSegui: 'Approfondisci o nuova domanda…',
            invia: 'Invia domanda',
        },
        de: {
            intro: (n) => `Wähle einen Vorschlag oder stelle eine Frage. Lex denkt über die ${n} Elemente dieser Etikette nach.`,
            vuoto: 'Füge der Etikette Elemente hinzu, um den Chat zu starten.',
            placeholderNuova: 'Stelle eine Frage zu dieser Etikette…',
            placeholderSegui: 'Vertiefe oder stelle eine neue Frage…',
            invia: 'Frage senden',
        },
        fr: {
            intro: (n) => `Choisis une suggestion ou pose une question. Lex raisonnera sur les ${n} éléments de cette étiquette.`,
            vuoto: 'Ajoute des éléments à l\'étiquette pour commencer à discuter.',
            placeholderNuova: 'Pose une question sur cette étiquette…',
            placeholderSegui: 'Approfondis ou pose une nouvelle question…',
            invia: 'Envoyer la question',
        },
    }
    const tt = T[lang]
    const [conversazione, setConversazione] = useState([])
    const [input, setInput] = useState('')
    const [cercando, setCercando] = useState(false)
    const [azioneCorrente, setAzioneCorrente] = useState('libera')
    const [streamingTesto, setStreamingTesto] = useState('')
    const [erroreLex, setErroreLex] = useState('')
    const [mostraModaleSalva, setMostraModaleSalva] = useState(false)
    const [contenutoSalva, setContenutoSalva] = useState('')
    const abortControllerRef = useRef(null)

    // Costruisce array elementi per backend
    function costruisciElementi() {
        return contenuti.map(c => ({
            kind: c.kindFiltro === 'ricerca_ai' ? c.tipo : c.kindFiltro,  // mantiene chat_lex / ricerca_manuale
            id: c.dati.id,
            titolo: titoloElementoEt(c),
            contenuto: contenutoElementoEt(c),
        }))
    }

    async function eseguiAzioneOLibera({ azione, domandaTesto }) {
        if (cercando) return
        if (contenuti.length === 0) {
            setErroreLex('L\'etichetta è vuota')
            return
        }

        setErroreLex('')
        setStreamingTesto('')
        setAzioneCorrente(azione)

        let etichettaInput = ''
        if (azione === 'libera') {
            etichettaInput = domandaTesto
        } else {
            const meta = AZIONI_ETICHETTA.find(a => a.id === azione)
            etichettaInput = `${meta?.emoji ?? ''} ${meta?.label ?? azione}${domandaTesto ? `\n\nFocus: ${domandaTesto}` : ''}`
        }

        const nuovaConv = [...conversazione, { role: 'user', content: etichettaInput }]
        setConversazione(nuovaConv)
        setInput('')
        setCercando(true)

        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-etichetta`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        azione,
                        domanda: domandaTesto,
                        messaggi: conversazione,
                        etichetta: { id: etichetta.id, nome: etichetta.nome, colore: etichetta.colore },
                        elementi: costruisciElementi(),
                    }),
                    signal: controller.signal,
                }
            )

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error ?? `Errore ${res.status}`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue
                    try {
                        const payload = JSON.parse(line.slice(6).trim())
                        if (payload.text) {
                            testoAccumulato += payload.text
                            setStreamingTesto(testoAccumulato)
                        }
                    } catch {
                        // ignora
                    }
                }
            }

            setConversazione([...nuovaConv, { role: 'assistant', content: testoAccumulato, azione }])
            setStreamingTesto('')
        } catch (e) {
            if (e.name !== 'AbortError') {
                setErroreLex(e.message)
                setConversazione(conversazione)
            }
        } finally {
            setCercando(false)
            abortControllerRef.current = null
        }
    }

    function inviaLibera() {
        if (!input.trim()) return
        eseguiAzioneOLibera({ azione: 'libera', domandaTesto: input.trim() })
    }

    // I chip non inviano: riempiono la textarea con la frase pronta nella
    // lingua dell'avvocato. L'invio resta sempre una domanda libera.
    function precompilaConSuggerimento(azione) {
        const meta = AZIONI_ETICHETTA.find(a => a.id === azione)
        const frase = meta?.prompt?.[lang] ?? meta?.prompt?.it ?? ''
        if (frase) setInput(frase)
    }

    function nuovaSessione() {
        if (abortControllerRef.current) abortControllerRef.current.abort()
        setConversazione([])
        setStreamingTesto('')
        setErroreLex('')
        setInput('')
        setAzioneCorrente('libera')
    }

    function salvaMessaggio(content) {
        setContenutoSalva(content)
        setMostraModaleSalva(true)
    }

    return (
        <div className="bg-slate border border-salvia/20">

            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={13} className="text-salvia shrink-0" />
                    <p className="font-body text-sm font-medium text-nebbia truncate">Lex — Chat etichetta</p>
                    {conversazione.length > 0 && (
                        <span className="font-body text-[10px] text-salvia/60 border border-salvia/20 px-1.5 py-0.5 shrink-0">
                            {Math.floor(conversazione.length / 2) + (cercando || streamingTesto ? 1 : 0)}
                        </span>
                    )}
                </div>
                {(conversazione.length > 0 || cercando) && (
                    <button
                        onClick={nuovaSessione}
                        className="font-body text-[11px] text-nebbia/30 hover:text-red-400 transition-colors shrink-0"
                    >
                        Nuova sessione
                    </button>
                )}
            </div>

            {/* Conversazione + animazione */}
            {(conversazione.length > 0 || cercando || streamingTesto) && (
                <div className="px-4 py-3 space-y-4 max-h-[55vh] overflow-y-auto">
                    {conversazione.map((m, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className={`font-body text-[11px] font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                    {m.role === 'user' ? 'Tu' : 'Lex'}
                                </span>
                                {m.role === 'assistant' && (
                                    <button
                                        onClick={() => salvaMessaggio(m.content)}
                                        className="flex items-center gap-1 font-body text-[11px] text-nebbia/30 hover:text-oro transition-colors"
                                    >
                                        <Save size={10} /> Salva
                                    </button>
                                )}
                            </div>

                            {m.role === 'user' ? (
                                <p className="font-body text-xs text-nebbia/60 leading-relaxed whitespace-pre-line">{m.content}</p>
                            ) : (
                                <div className="font-body text-xs text-nebbia/80 leading-relaxed">
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ children }) => <h2 className="font-display text-sm font-semibold text-nebbia mt-3 mb-1.5">{children}</h2>,
                                            h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-1">{children}</h3>,
                                            strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5">{children}</ol>,
                                            li: ({ children }) => <li className="text-xs">{children}</li>,
                                            p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ))}

                    {streamingTesto && (
                        <div className="space-y-1.5">
                            <span className="font-body text-[11px] font-medium text-salvia/70">Lex</span>
                            <div className="font-body text-xs text-nebbia/80 leading-relaxed">
                                <ReactMarkdown
                                    components={{
                                        h2: ({ children }) => <h2 className="font-display text-sm font-semibold text-nebbia mt-3 mb-1.5">{children}</h2>,
                                        h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-1">{children}</h3>,
                                        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>,
                                        li: ({ children }) => <li className="text-xs">{children}</li>,
                                        p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
                                    }}
                                >
                                    {streamingTesto}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {cercando && !streamingTesto && (
                        <LexAnimazioneEtichetta azione={azioneCorrente} />
                    )}
                </div>
            )}

            {/* Pannello azioni guidate */}
            {!cercando && (
                <div className="px-4 py-3 space-y-2.5">
                    {conversazione.length === 0 && contenuti.length > 0 && (
                        <p className="font-body text-[11px] text-nebbia/30 leading-relaxed">
                            {tt.intro(contenuti.length)}
                        </p>
                    )}

                    {contenuti.length === 0 ? (
                        <p className="font-body text-[11px] text-nebbia/30 text-center py-4">
                            {tt.vuoto}
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-1.5">
                                {AZIONI_ETICHETTA.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => precompilaConSuggerimento(a.id)}
                                        disabled={cercando}
                                        className="group flex items-start gap-1.5 p-2 bg-petrolio border border-white/5 hover:border-salvia/30 transition-colors text-left disabled:opacity-40"
                                    >
                                        <span className="text-sm shrink-0 mt-0.5">{a.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-[11px] font-medium text-nebbia group-hover:text-salvia transition-colors leading-tight">
                                                {a.label[lang] ?? a.label.it}
                                            </p>
                                            <p className="font-body text-[10px] text-nebbia/40 mt-0.5 leading-tight">
                                                {a.descr[lang] ?? a.descr.it}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <textarea
                                rows={2}
                                placeholder={conversazione.length > 0 ? tt.placeholderSegui : tt.placeholderNuova}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) inviaLibera() }}
                                disabled={cercando}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                            />

                            {erroreLex && (
                                <p className="font-body text-[11px] text-red-400 flex items-center gap-1.5">
                                    <AlertCircle size={10} /> {erroreLex}
                                </p>
                            )}

                            <button
                                onClick={inviaLibera}
                                disabled={cercando || !input.trim()}
                                className="flex items-center justify-center gap-1.5 w-full py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-xs hover:bg-salvia/20 transition-colors disabled:opacity-40"
                            >
                                <Sparkles size={11} /> {tt.invia}
                            </button>
                        </>
                    )}
                </div>
            )}

            {mostraModaleSalva && (
                <ModaleSalvaSintesi
                    sintesi={contenutoSalva}
                    etichetta={etichetta}
                    pratiche={pratiche}
                    etichetteUtente={etichetteUtente}
                    onClose={() => setMostraModaleSalva(false)}
                    onSalvata={() => {
                        setMostraModaleSalva(false)
                        if (onSintesiSalvata) onSintesiSalvata()
                    }}
                />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// LEX ANIMAZIONE — Etichetta (frasi personalizzate per azione)
// ═══════════════════════════════════════════════════════════════
function LexAnimazioneEtichetta({ azione }) {
    const frasiRotative = FRASI_ETICHETTA[azione] ?? FRASI_ETICHETTA.libera
    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        setIndiceFrase(0)
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [azione])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-2 py-3 max-w-[420px] mx-auto">
            <style>{`
                .lex-stage-e { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage-e svg { width: 100%; height: 100%; display: block; }

                .lex-e-ray { animation: lexERayCycle 27s ease-in-out infinite; }
                @keyframes lexERayCycle {
                    0%   { transform: translateX(-30px); opacity: 0; }
                    3%   { opacity: 0.8; }
                    8%   { transform: translateX(85px); opacity: 0.9; }
                    12%  { transform: translateX(85px); opacity: 1; }
                    16%  { transform: translateX(85px); opacity: 0; }
                    33%  { transform: translateX(85px); opacity: 0; }
                    34%  { transform: translateX(-30px); opacity: 0; }
                    37%  { opacity: 0.8; }
                    42%  { transform: translateX(180px); opacity: 0.9; }
                    46%  { transform: translateX(180px); opacity: 1; }
                    50%  { transform: translateX(180px); opacity: 0; }
                    66%  { transform: translateX(180px); opacity: 0; }
                    67%  { transform: translateX(-30px); opacity: 0; }
                    70%  { opacity: 0.8; }
                    78%  { transform: translateX(290px); opacity: 0.9; }
                    82%  { transform: translateX(290px); opacity: 1; }
                    86%  { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }

                .lex-e-book-a { animation: lexEBookGlowA 27s ease-in-out infinite; }
                @keyframes lexEBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-e-book-b { animation: lexEBookGlowB 27s ease-in-out infinite; }
                @keyframes lexEBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-e-book-c { animation: lexEBookGlowC 27s ease-in-out infinite; }
                @keyframes lexEBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }

                .lex-e-fade-text { animation: lexEFadeIn 0.6s ease-out; }
                @keyframes lexEFadeIn {
                    0%   { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .lex-e-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-e-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #7FA39A; opacity: 0.4;
                    animation: lexEDotPulse 1.4s ease-in-out infinite;
                }
                .lex-e-dot:nth-child(1) { animation-delay: 0s; }
                .lex-e-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-e-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexEDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage-e">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>Lex sta ragionando</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(127, 163, 154, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-e-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-e-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-e-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <g className="lex-e-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#7FA39A" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#7FA39A" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#7FA39A" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#7FA39A" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-2 min-h-[20px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-e-fade-text font-body text-xs text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-e-dots-container">
                            <span className="lex-e-dot" />
                            <span className="lex-e-dot" />
                            <span className="lex-e-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// HELPER: titolo/contenuto unificato per backend
// ═══════════════════════════════════════════════════════════════
function titoloElementoEt(c) {
    if (TIPI_RICERCA.includes(c.tipo)) return c.dati.titolo ?? '(senza titolo)'
    if (c.tipo === 'norma_federale' || c.tipo === 'norma_cantonale' || c.tipo === 'norma_ue') {
        const rubrica = c.dati.rubrica ?? c.dati.rubrica_articolo ?? ''
        const parti = [c.dati.atto_titolo, c.dati.articolo_label].filter(Boolean)
        return parti.join(' · ') + (rubrica ? ` — ${rubrica}` : '')
    }
    if (c.tipo === 'giurisprudenza') {
        const parti = [c.dati.organo, c.dati.numero, c.dati.anno].filter(Boolean)
        return (c.dati.titolo_risolto ? c.dati.titolo_risolto + ' · ' : '') + parti.join(' · ')
    }
    if (c.tipo === 'sentenza_ue') {
        const parti = [c.dati.organo, c.dati.numero].filter(Boolean)
        return parti.join(' · ')
    }
    if (c.tipo === 'prassi') {
        const parti = [c.dati.fonte_label, c.dati.numero && `n. ${c.dati.numero}`, c.dati.anno].filter(Boolean)
        return parti.join(' · ')
    }
    return ''
}

function contenutoElementoEt(c) {
    if (TIPI_RICERCA.includes(c.tipo)) return c.dati.contenuto ?? ''
    if (c.tipo === 'norma_federale' || c.tipo === 'norma_cantonale' || c.tipo === 'norma_ue') return c.dati.testo ?? ''
    if (c.tipo === 'giurisprudenza') return [c.dati.oggetto, c.dati.principio_diritto].filter(Boolean).join('\n\n')
    if (c.tipo === 'sentenza_ue') return [c.dati.oggetto, c.dati.parti].filter(Boolean).join('\n\n')
    if (c.tipo === 'prassi') return [c.dati.titolo, c.dati.oggetto].filter(Boolean).join('\n\n')
    return ''
}

// ═══════════════════════════════════════════════════════════════
// MODALE SALVA SINTESI (con auto-tag etichetta corrente)
// ═══════════════════════════════════════════════════════════════
function ModaleSalvaSintesi({ sintesi, etichetta, pratiche, etichetteUtente, onClose, onSalvata }) {
    const titoloAuto = `Lex su "${etichetta.nome}"`
    const [titolo, setTitolo] = useState(titoloAuto)
    const [praticaId, setPraticaId] = useState('')
    // Auto-tag etichetta corrente
    const [etichetteSelezionate, setEtichetteSelezionate] = useState([etichetta.id])
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    async function salva() {
        setErrore('')
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const contenutoCompleto = sintesi + '\n\n---\n\n*Sintesi generata da Lex sull\'etichetta "' + etichetta.nome + '".*'

            const { data: ric, error } = await supabase
                .from('ricerche')
                .insert({
                    user_id: user.id,
                    autore_id: user.id,
                    pratica_id: praticaId || null,
                    tipo: 'ricerca_ai',
                    titolo: titolo.trim() || titoloAuto,
                    contenuto: contenutoCompleto,
                    metadati: {
                        ts: new Date().toISOString(),
                        tipo_ricerca: 'etichetta_sintesi',
                        etichetta_origine: { id: etichetta.id, nome: etichetta.nome },
                    }
                })
                .select('id')
                .single()
            if (error) throw new Error(error.message)

            if (etichetteSelezionate.length > 0) {
                const links = etichetteSelezionate.map(eid => ({
                    etichetta_id: eid,
                    elemento_id: ric.id,
                    tipo: 'ricerca_ai',
                    user_id: user.id,
                }))
                await supabase.from('elementi_etichette').insert(links)
            }

            onSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Save size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Salva come ricerca</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Titolo</label>
                        <input
                            value={titolo}
                            onChange={e => setTitolo(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Pratica (opzionale)</label>
                        <select
                            value={praticaId}
                            onChange={e => setPraticaId(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                        >
                            <option value="">Nessuna pratica</option>
                            {pratiche.map(p => (
                                <option key={p.id} value={p.id}>{p.titolo}</option>
                            ))}
                        </select>
                    </div>

                    {etichetteUtente.length > 0 && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">
                                Etichette
                                <span className="text-nebbia/30 normal-case tracking-normal ml-2 text-[11px]">
                                    (l'etichetta corrente è preselezionata)
                                </span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {etichetteUtente.map(e => {
                                    const isAttiva = etichetteSelezionate.includes(e.id)
                                    const isCorrente = e.id === etichetta.id
                                    return (
                                        <button
                                            key={e.id}
                                            type="button"
                                            onClick={() => setEtichetteSelezionate(prev =>
                                                isAttiva ? prev.filter(x => x !== e.id) : [...prev, e.id]
                                            )}
                                            className={`flex items-center gap-1 px-2 py-1 font-body text-xs border transition-colors ${isAttiva
                                                ? 'border-nebbia/40 text-nebbia'
                                                : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                                }`}
                                        >
                                            {isAttiva && <Check size={10} />}
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                                            {e.nome}
                                            {isCorrente && <span className="text-[10px] text-salvia/70 ml-1">(corrente)</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-petrolio/30 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            La sintesi verrà salvata come <strong className="text-nebbia/70">ricerca AI</strong> con
                            l'etichetta <strong className="text-nebbia/70">{etichetta.nome}</strong> già preassegnata.
                        </p>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={salva}
                        disabled={salvando || !titolo.trim()}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                    >
                        {salvando
                            ? <Loader2 size={12} className="animate-spin" />
                            : <><Save size={11} /> Salva ricerca</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}