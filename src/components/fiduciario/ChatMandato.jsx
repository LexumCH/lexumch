// src/components/fiduciario/ChatMandato.jsx — Lexum CH
// Lex per il mandato fiduciario — adattato da ChatPratica.jsx.
//
// Dominio: contabilità / fiscalità / gestione dipendenti / rendiconti, NON forense.
//
// Differenze vs ChatPratica:
// - Props: mandatoId + clienteId (invece di praticaId).
// - Endpoint: lex-mandato (invece di lex-pratica).
// - Body fetch: mandato_id (invece di pratica_id).
// - TIPI_DOCUMENTO_UI: 3 documenti fiduciari (rendiconto, lettera, parere fiscale).
// - Copy svizzerizzato al dominio fiduciario (mandato, scadenze fiscali, dipendenti...).
// - salvaConversazione: insert ricerche con mandato_id (compare nel box ricerche del mandato).
// - BollaDocumento: salva-documento-pdf con mandato_id; testo "Documenti mandato".
//
// CONTRATTO SSE (da lex-mandato CH — da creare, stesso contratto di lex-pratica):
//   event: stato  -> { messaggio }
//   event: chunk  -> { text }
//   event: done   -> { crediti_rimasti, documento_markdown?, tipo_documento?, tipo_nome? }
//   event: error  -> { error }

import { useState, useEffect, useRef, cloneElement, isValidElement, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, supabaseUrl, supabaseKey } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import {
    Sparkles, Send, Save, Plus, AlertCircle, X, CheckCircle,
    Loader2, FileText, HelpCircle, Edit2, Eye, Download, Info
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const ENDPOINT_MANDATO = '/functions/v1/lex-mandato'

// Lista documenti fiduciari per popover (solo display).
// Le chiavi (catKey/key) sono stabili; il testo (categoria/nome/esempio) è tradotto a runtime.
const TIPI_DOCUMENTO_UI = [
    {
        catKey: 'rendiconti', tipi: [
            { key: 'rendiconto_mensile' },
            { key: 'riepilogo_contabile' },
            { key: 'prospetto_personale' },
        ]
    },
    {
        catKey: 'corrispondenza', tipi: [
            { key: 'lettera_accompagnamento' },
            { key: 'sollecito_scadenza' },
        ]
    },
    {
        catKey: 'pareri', tipi: [
            { key: 'parere_fiscale' },
            { key: 'nota_analisi' },
        ]
    },
]

// ─────────────────────────────────────────────────────────────
// LEX ANIMAZIONE — frasi dominio fiduciario
// ─────────────────────────────────────────────────────────────
function LexAnimazione({ frasi }) {
    const { t } = useTranslation('comp_fid_chat_mandato')
    const frasiRotative = frasi ?? t('animazione.frasi', { returnObjects: true })

    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [frasiRotative.length])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
                .lex-stage { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage svg { width: 100%; height: 100%; display: block; }
                .lex-ray { animation: lexRayCycle 27s ease-in-out infinite; }
                @keyframes lexRayCycle {
                    0% { transform: translateX(-30px); opacity: 0; }
                    3% { opacity: 0.8; }
                    8% { transform: translateX(85px); opacity: 0.9; }
                    12% { transform: translateX(85px); opacity: 1; }
                    16% { transform: translateX(85px); opacity: 0; }
                    33% { transform: translateX(85px); opacity: 0; }
                    34% { transform: translateX(-30px); opacity: 0; }
                    37% { opacity: 0.8; }
                    42% { transform: translateX(180px); opacity: 0.9; }
                    46% { transform: translateX(180px); opacity: 1; }
                    50% { transform: translateX(180px); opacity: 0; }
                    66% { transform: translateX(180px); opacity: 0; }
                    67% { transform: translateX(-30px); opacity: 0; }
                    70% { opacity: 0.8; }
                    78% { transform: translateX(290px); opacity: 0.9; }
                    82% { transform: translateX(290px); opacity: 1; }
                    86% { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }
                .lex-book-a { animation: lexBookGlowA 27s ease-in-out infinite; }
                @keyframes lexBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-b { animation: lexBookGlowB 27s ease-in-out infinite; }
                @keyframes lexBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-c { animation: lexBookGlowC 27s ease-in-out infinite; }
                @keyframes lexBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-fade-text { animation: lexFadeIn 0.6s ease-out; }
                @keyframes lexFadeIn {
                    0% { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .lex-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #C9A45C; opacity: 0.4;
                    animation: lexDotPulse 1.4s ease-in-out infinite;
                }
                .lex-dot:nth-child(1) { animation-delay: 0s; }
                .lex-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>{t('animazione.titolo')}</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />

                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-dots-container">
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// HELPER: trascrizione conversazione in Markdown (per salva chat)
// ─────────────────────────────────────────────────────────────
function trascriviConversazione(messaggi, t, dateLocale) {
    return messaggi.map(m => {
        if (m.tipo === 'documento') {
            const ts = m.ts ? new Date(m.ts).toLocaleString(dateLocale, {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : ''
            return `**${t('trascrizione.documentoGenerato')} — ${m.tipo_nome ?? t('trascrizione.documento')}:**${ts ? ` _(${ts})_` : ''}\n\n${m.content}\n`
        }
        const ruolo = m.role === 'user' ? `**${t('trascrizione.fiduciario')}:**` : `**${t('trascrizione.lex')}:**`
        const ts = m.ts ? new Date(m.ts).toLocaleString(dateLocale, {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : ''
        return `${ruolo}${ts ? ` _(${ts})_` : ''}\n\n${m.content}\n`
    }).join('\n---\n\n')
}

// ─────────────────────────────────────────────────────────────
// EVIDENZIA SEGNAPOSTO — [DATO MANCANTE: ...] / [VERIFICA(RE): ...] / [NOTA: ...]
// ─────────────────────────────────────────────────────────────
const RE_SEGNAPOSTO = /\[(?:DATO MANCANTE|VERIFICARE|VERIFICA|NOTA)[^\]]*\]/g

function evidenziaSegnaposto(children) {
    function processa(node, key) {
        if (typeof node === 'string') {
            if (!node.includes('[')) return node
            const out = []
            let last = 0
            let m
            let i = 0
            RE_SEGNAPOSTO.lastIndex = 0
            while ((m = RE_SEGNAPOSTO.exec(node)) !== null) {
                if (m.index > last) out.push(node.slice(last, m.index))
                out.push(
                    <mark key={`${key}-${i++}`} className="bg-yellow-200 text-yellow-900 px-1 rounded-[2px]">
                        {m[0]}
                    </mark>
                )
                last = m.index + m[0].length
            }
            if (out.length === 0) return node
            if (last < node.length) out.push(node.slice(last))
            return out
        }
        if (Array.isArray(node)) {
            return node.map((n, idx) => <Fragment key={`${key}-f${idx}`}>{processa(n, `${key}-${idx}`)}</Fragment>)
        }
        if (isValidElement(node) && node.props && node.props.children != null) {
            return cloneElement(node, undefined, processa(node.props.children, key))
        }
        return node
    }
    return processa(children, 's')
}

// ─────────────────────────────────────────────────────────────
// COMPONENTI MARKDOWN PER FOGLIO A4 (scrittura live)
// ─────────────────────────────────────────────────────────────
const componentiDocumentoA4 = {
    h1: ({ children }) => (
        <h1 className="font-display text-center text-[1.45rem] leading-snug font-bold uppercase tracking-wide text-neutral-900 mb-6 mt-1">
            {evidenziaSegnaposto(children)}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="font-display text-[1.05rem] font-bold uppercase tracking-wide text-neutral-900 mt-7 mb-2">
            {evidenziaSegnaposto(children)}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="font-display text-[0.98rem] font-semibold text-neutral-900 mt-5 mb-1.5">
            {evidenziaSegnaposto(children)}
        </h3>
    ),
    p: ({ children }) => (
        <p className="font-display text-[0.98rem] text-justify text-neutral-900 leading-[1.7] mb-3.5">
            {evidenziaSegnaposto(children)}
        </p>
    ),
    strong: ({ children }) => <strong className="font-bold text-neutral-900">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="list-disc pl-7 space-y-1.5 my-3 text-neutral-900">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-7 space-y-1.5 my-3 text-neutral-900">{children}</ol>,
    li: ({ children }) => <li className="font-display text-[0.98rem] leading-[1.6] text-justify">{evidenziaSegnaposto(children)}</li>,
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-neutral-300 pl-4 my-3 italic text-neutral-700">{children}</blockquote>
    ),
    hr: () => <hr className="my-5 border-neutral-300" />,
    a: ({ children }) => <span className="text-neutral-900 underline">{children}</span>,
}

// Foglio A4 bianco riusabile (scrittura live)
function FoglioA4({ markdown }) {
    return (
        <div className="bg-neutral-300/70 px-3 sm:px-6 py-6">
            <div
                className="bg-white shadow-xl mx-auto w-full max-w-[640px] text-neutral-900 px-6 sm:px-14 py-9 sm:py-14"
                style={{ aspectRatio: '210 / 297' }}
            >
                <ReactMarkdown components={componentiDocumentoA4}>{markdown}</ReactMarkdown>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// POPOVER "Cosa posso chiederti?"
// ─────────────────────────────────────────────────────────────
function PopoverCapacita({ onClose, onEsempio }) {
    const { t } = useTranslation('comp_fid_chat_mandato')

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
                className="bg-slate border border-salvia/20 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">{t('popover.titolo')}</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                        <p className="font-body text-xs text-salvia uppercase tracking-widest mb-2">{t('popover.analisi.titolo')}</p>
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            {t('popover.analisi.descrizione')}
                        </p>
                    </div>

                    <div>
                        <p className="font-body text-xs text-oro uppercase tracking-widest mb-2">{t('popover.generazione.titolo')}</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-3">
                            {t('popover.generazione.descrizione')}
                        </p>
                        <div className="space-y-3">
                            {TIPI_DOCUMENTO_UI.map(gruppo => (
                                <div key={gruppo.catKey}>
                                    <p className="font-body text-[11px] text-nebbia/40 uppercase tracking-wider mb-1.5">{t(`tipiDocumento.categorie.${gruppo.catKey}`)}</p>
                                    <div className="space-y-1">
                                        {gruppo.tipi.map(tipo => {
                                            const nome = t(`tipiDocumento.tipi.${tipo.key}.nome`)
                                            const esempio = t(`tipiDocumento.tipi.${tipo.key}.esempio`)
                                            return (
                                                <button
                                                    key={tipo.key}
                                                    onClick={() => { onEsempio(esempio); onClose() }}
                                                    className="w-full text-left p-2.5 bg-petrolio/40 border border-white/8 hover:border-oro/30 hover:bg-oro/5 transition-colors group"
                                                >
                                                    <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">{nome}</p>
                                                    <p className="font-body text-xs text-nebbia/35 mt-0.5 italic">"{esempio}"</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Gli esempi sopra non sono un elenco chiuso: Lex genera qualsiasi documento. */}
                            <div className="mt-1 p-2.5 bg-salvia/5 border border-salvia/20">
                                <p className="font-body text-sm text-salvia">{t('popover.altro.titolo')}</p>
                                <p className="font-body text-xs text-nebbia/40 mt-0.5 leading-relaxed">
                                    {t('popover.altro.descrizione')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 shrink-0">
                    <p className="font-body text-xs text-nebbia/30">
                        {t('popover.footer')}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// BOLLA DOCUMENTO GENERATO — anteprima PDF reale + modifica + salva
// (chiama l'edge salva-documento-pdf con mandato_id)
// ─────────────────────────────────────────────────────────────
function BollaDocumento({ messaggio, mandatoId, onDocumentoSalvato }) {
    const { t, i18n } = useTranslation('comp_fid_chat_mandato')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [vista, setVista] = useState('preview') // 'preview' | 'edit'
    const [markdown, setMarkdown] = useState(messaggio.content)
    const [markdownAnteprima, setMarkdownAnteprima] = useState(null)
    const [nomeFile, setNomeFile] = useState(
        `${messaggio.tipo_nome ?? t('bolla.documento')} - ${new Date().toLocaleDateString(dateLocale)}`
    )

    const [pdfUrl, setPdfUrl] = useState(null)
    const [generandoPdf, setGenerandoPdf] = useState(false)
    const [errorePdf, setErrorePdf] = useState('')

    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [salvato, setSalvato] = useState(null)

    const objectUrlRef = useRef(null)

    async function generaAnteprima(markdownDaRendere) {
        setGenerandoPdf(true)
        setErrorePdf('')
        try {
            const { data, error } = await supabase.functions.invoke('salva-documento-pdf-fiduciario', {
                body: {
                    mandato_id: mandatoId,
                    tipo_codice: messaggio.tipo_documento ?? 'documento',
                    tipo_nome: messaggio.tipo_nome ?? t('bolla.documento'),
                    markdown_finale: markdownDaRendere,
                    solo_anteprima: true,
                }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('bolla.erroreAnteprima'))
            if (!data.pdf_base64) throw new Error(t('bolla.anteprimaNonDisponibile'))

            const bin = atob(data.pdf_base64)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            const blob = new Blob([bytes], { type: 'application/pdf' })

            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
            const url = URL.createObjectURL(blob)
            objectUrlRef.current = url

            setPdfUrl(url)
            setMarkdownAnteprima(markdownDaRendere)
        } catch (err) {
            setErrorePdf(err.message)
        } finally {
            setGenerandoPdf(false)
        }
    }

    useEffect(() => {
        generaAnteprima(messaggio.content)
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const modificheNonRiflesse = vista === 'edit' && markdown !== markdownAnteprima

    async function salvaPdf() {
        if (!nomeFile.trim()) { setErrore(t('bolla.inserisciNomeFile')); return }
        setSalvando(true)
        setErrore('')
        try {
            const { data, error } = await supabase.functions.invoke('salva-documento-pdf-fiduciario', {
                body: {
                    mandato_id: mandatoId,
                    tipo_codice: messaggio.tipo_documento ?? 'documento',
                    tipo_nome: messaggio.tipo_nome ?? t('bolla.documento'),
                    markdown_finale: markdown,
                    nome_file_personalizzato: nomeFile.trim(),
                }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? t('bolla.erroreSalvataggio'))

            setSalvato({ url: data.url, nome_file: data.nome_file })
            if (onDocumentoSalvato) onDocumentoSalvato()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    function scarica() {
        if (salvato?.url) window.open(salvato.url, '_blank')
    }

    return (
        <div className="border border-oro/30 bg-petrolio/40">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-oro/15 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-oro shrink-0" />
                    <p className="font-body text-sm font-medium text-oro truncate">
                        {messaggio.tipo_nome ?? t('bolla.documentoGenerato')}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setVista('preview')}
                        className={`flex items-center gap-1 px-2.5 py-1 font-body text-xs border transition-colors ${vista === 'preview'
                            ? 'bg-oro/10 border-oro/30 text-oro'
                            : 'border-white/10 text-nebbia/40 hover:text-nebbia'}`}
                    >
                        <Eye size={11} /> {t('bolla.anteprima')}
                    </button>
                    <button
                        onClick={() => setVista('edit')}
                        className={`flex items-center gap-1 px-2.5 py-1 font-body text-xs border transition-colors ${vista === 'edit'
                            ? 'bg-oro/10 border-oro/30 text-oro'
                            : 'border-white/10 text-nebbia/40 hover:text-nebbia'}`}
                        title={t('bolla.modificaTesto')}
                    >
                        <Edit2 size={11} /> {t('bolla.modifica')}
                    </button>
                </div>
            </div>

            {!salvato && (
                <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
                    <p className="font-body text-xs text-amber-400/90 flex items-start gap-1.5">
                        <Info size={11} className="shrink-0 mt-0.5" />
                        <span>{t('bolla.avvisoNonConservato')}</span>
                    </p>
                </div>
            )}

            <div className="max-h-[620px] overflow-y-auto">
                {vista === 'preview' ? (
                    <div className="bg-neutral-300/70 p-3">
                        {generandoPdf ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Loader2 size={22} className="animate-spin text-oro/70 mb-3" />
                                <p className="font-body text-sm text-nebbia/60">{t('bolla.generoAnteprima')}</p>
                            </div>
                        ) : errorePdf ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <AlertCircle size={20} className="text-red-400" />
                                <p className="font-body text-xs text-red-400 max-w-sm">{errorePdf}</p>
                                <button
                                    onClick={() => generaAnteprima(markdown)}
                                    className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                                >
                                    {t('bolla.riprova')}
                                </button>
                            </div>
                        ) : pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                title={t('bolla.anteprimaDocumento')}
                                className="w-full bg-white shadow-xl"
                                style={{ height: '560px', border: 'none' }}
                            />
                        ) : null}
                    </div>
                ) : (
                    <div className="bg-petrolio">
                        <textarea
                            value={markdown}
                            onChange={e => setMarkdown(e.target.value)}
                            disabled={salvando}
                            className="w-full bg-petrolio text-nebbia font-mono text-xs p-4 outline-none resize-none border-0 disabled:opacity-50"
                            style={{ minHeight: '420px' }}
                        />
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-white/10 bg-petrolio/60 flex-wrap">
                            <p className="font-body text-xs text-nebbia/40">
                                {modificheNonRiflesse
                                    ? t('bolla.modificheNonInAnteprima')
                                    : t('bolla.markdownGrezzo')}
                            </p>
                            <button
                                onClick={async () => { await generaAnteprima(markdown); setVista('preview') }}
                                disabled={generandoPdf || !markdown.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 font-body text-xs text-oro border border-oro/30 hover:bg-oro/10 transition-colors disabled:opacity-40"
                            >
                                {generandoPdf
                                    ? <><Loader2 size={11} className="animate-spin" /> {t('bolla.rigenero')}</>
                                    : <><Eye size={11} /> {t('bolla.rigeneraAnteprima')}</>
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {errore && (
                <div className="mx-4 mb-3 mt-3 p-2.5 bg-red-900/10 border border-red-500/30 flex items-start gap-2">
                    <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-red-400">{errore}</p>
                </div>
            )}

            <div className="px-4 py-3 border-t border-oro/15 space-y-3">
                {salvato ? (
                    <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-salvia shrink-0" />
                                <p className="font-body text-xs text-salvia">
                                    {t('bolla.salvatoInDocumenti')} <span className="font-mono">{salvato.nome_file}</span>
                                </p>
                            </div>
                            <button
                                onClick={scarica}
                                className="flex items-center gap-1.5 px-3 py-1.5 font-body text-xs text-oro border border-oro/30 hover:bg-oro/10 transition-colors"
                            >
                                <Download size={11} /> {t('bolla.scaricaPdf')}
                            </button>
                        </div>
                        <button
                            onClick={salvaPdf}
                            disabled={salvando || !nomeFile.trim()}
                            className="flex items-center gap-2 px-4 py-2 border border-oro/30 text-oro font-body text-sm font-medium hover:bg-oro/10 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <><Loader2 size={13} className="animate-spin" /> {t('bolla.salvataggioInCorso')}</>
                                : <><Save size={13} /> {t('bolla.salvaDiNuovo')}</>
                            }
                        </button>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block font-body text-[11px] text-nebbia/50 tracking-widest uppercase mb-1.5">
                                {t('bolla.nomeFile')}
                            </label>
                            <input
                                type="text"
                                value={nomeFile}
                                onChange={e => setNomeFile(e.target.value)}
                                disabled={salvando}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 disabled:opacity-40"
                            />
                        </div>
                        <button
                            onClick={salvaPdf}
                            disabled={salvando || !nomeFile.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <><Loader2 size={13} className="animate-spin" /> {t('bolla.salvataggioInCorso')}</>
                                : <><Save size={13} /> {t('bolla.salvaPdfNelMandato')}</>
                            }
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ChatMandato({ mandatoId, clienteId = null, onDocumentoSalvato, onRicercaSalvata }) {
    const { t, i18n } = useTranslation('comp_fid_chat_mandato')
    const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [conversazione, setConversazione] = useState([])
    const [domandaLibera, setDomandaLibera] = useState('')
    const [inviando, setInviando] = useState(false)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [statoGenerazione, setStatoGenerazione] = useState('')
    const [isDocumentoStreaming, setIsDocumentoStreaming] = useState(false)
    const [errore, setErrore] = useState('')

    const [crediti, setCrediti] = useState(null)

    const [mostraSalva, setMostraSalva] = useState(false)
    const [titoloSalva, setTitoloSalva] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvataConferma, setSalvataConferma] = useState(false)

    const [confermaNuova, setConfermaNuova] = useState(false)
    const [mostraPopover, setMostraPopover] = useState(false)

    const bottomRef = useRef(null)
    const abortRef = useRef(null)

    useEffect(() => {
        if (conversazione.length === 0) return
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [conversazione, streamingTesto, statoGenerazione])

    useEffect(() => {
        async function caricaCrediti() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('crediti_ai')
                .select('crediti_totali, crediti_usati, periodo_fine, tipo')
                .eq('user_id', user.id)
            if (!data || data.length === 0) { setCrediti(0); return }
            const now = new Date()
            const totale = data.reduce((acc, row) => {
                const residui = row.crediti_totali - row.crediti_usati
                const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
                return acc + (residui > 0 && !scaduto ? residui : 0)
            }, 0)
            setCrediti(totale)
        }
        caricaCrediti()
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    // ─────────────────────────────────────────────────────────
    // INVIA: streaming a lex-mandato CH (sempre azione 'libera')
    // ─────────────────────────────────────────────────────────
    async function invia(domandaCustom) {
        if (inviando) return
        if (crediti !== null && crediti <= 0) {
            setErrore('crediti_esauriti')
            return
        }

        const domandaPerEdge = (domandaCustom ?? domandaLibera).trim()
        if (!domandaPerEdge) {
            setErrore(t('errori.scriviDomanda'))
            return
        }

        setErrore('')

        const tsUser = new Date().toISOString()
        const nuovaConv = [
            ...conversazione,
            { role: 'user', content: domandaPerEdge, ts: tsUser },
        ]
        setConversazione(nuovaConv)
        setDomandaLibera('')
        setInviando(true)
        setStreamingTesto('')
        setStatoGenerazione('')
        setIsDocumentoStreaming(false)

        abortRef.current = new AbortController()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error(t('errori.sessioneScaduta'))

            const url = `${supabaseUrl}${ENDPOINT_MANDATO}`

            const storia = conversazione
                .filter(m => m.tipo !== 'documento')
                .map(m => ({ role: m.role, content: m.content }))

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    mandato_id: mandatoId,
                    azione: 'libera',
                    domanda: domandaPerEdge,
                    messaggi: storia,
                }),
                signal: abortRef.current.signal,
            })

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({ error: t('errori.sconosciuto') }))
                if (errBody.crediti_esauriti) setErrore('crediti_esauriti')
                else setErrore(errBody.error ?? t('errori.conCodice', { codice: response.status }))
                setConversazione(conversazione)
                setInviando(false)
                return
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''
            let creditiRimasti = null
            let eventoCorrente = null

            let documentoMarkdown = null
            let tipoDocumento = null
            let tipoNome = null

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.trim()) continue

                    if (line.startsWith('event: ')) {
                        eventoCorrente = line.slice(7).trim()
                        continue
                    }

                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        try {
                            const data = JSON.parse(payload)

                            if (eventoCorrente === 'stato') {
                                setStatoGenerazione(data.messaggio ?? '')
                                setIsDocumentoStreaming(true)
                            }

                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                            }

                            if (eventoCorrente === 'done') {
                                if (data.crediti_rimasti !== undefined) creditiRimasti = data.crediti_rimasti
                                if (data.documento_markdown) {
                                    documentoMarkdown = data.documento_markdown
                                    tipoDocumento = data.tipo_documento ?? null
                                    tipoNome = data.tipo_nome ?? null
                                }
                            }

                            if (eventoCorrente === 'error') {
                                setErrore(data.error ?? t('errori.streaming'))
                            }
                        } catch { /* ignore */ }
                    }
                }
            }

            let messaggioFinale
            if (documentoMarkdown) {
                messaggioFinale = {
                    role: 'assistant',
                    tipo: 'documento',
                    content: documentoMarkdown,
                    tipo_documento: tipoDocumento,
                    tipo_nome: tipoNome,
                    ts: new Date().toISOString(),
                }
            } else {
                messaggioFinale = {
                    role: 'assistant',
                    content: testoAccumulato,
                    ts: new Date().toISOString(),
                }
            }

            setConversazione([...nuovaConv, messaggioFinale])
            setStreamingTesto('')
            setStatoGenerazione('')
            setIsDocumentoStreaming(false)

            if (creditiRimasti !== null) setCrediti(creditiRimasti)

        } catch (err) {
            if (err.name === 'AbortError') {
                setConversazione(conversazione)
            } else {
                setErrore(err.message)
                setConversazione(conversazione)
            }
            setStreamingTesto('')
            setStatoGenerazione('')
            setIsDocumentoStreaming(false)
        } finally {
            setInviando(false)
            abortRef.current = null
        }
    }

    async function salvaConversazione() {
        if (!titoloSalva.trim()) { setErrore(t('errori.inserisciTitolo')); return }
        setSalvando(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const trascrizione = trascriviConversazione(conversazione, t, dateLocale)
            const { error } = await supabase.from('ricerche').insert({
                mandato_id: mandatoId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: titoloSalva.trim(),
                contenuto: trascrizione,
                metadati: {
                    fonte: 'lex_mandato',
                    n_messaggi: conversazione.length,
                    ts: new Date().toISOString(),
                },
            })
            if (error) throw new Error(error.message)
            setSalvataConferma(true)
            if (onRicercaSalvata) onRicercaSalvata()   // aggiorna il box ricerche del mandato
            setMostraSalva(false)
            setTitoloSalva('')
            setTimeout(() => setSalvataConferma(false), 4000)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    function nuovaChat() {
        if (abortRef.current) abortRef.current.abort()
        setConversazione([])
        setDomandaLibera('')
        setStreamingTesto('')
        setStatoGenerazione('')
        setIsDocumentoStreaming(false)
        setErrore('')
        setConfermaNuova(false)
        setMostraSalva(false)
    }

    function richiediNuovaChat() {
        if (conversazione.length === 0) return
        setConfermaNuova(true)
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            invia()
        }
    }

    const haMessaggi = conversazione.length > 0
    const creditiZero = crediti !== null && crediti <= 0

    const markdownComponents = {
        h1: ({ children }) => <h1 className="font-display text-xl font-semibold text-nebbia mb-3 mt-2">{children}</h1>,
        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
        em: ({ children }) => <em className="italic text-nebbia/80">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/80 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/80 my-2">{children}</ol>,
        li: ({ children }) => <li className="font-body text-sm">{children}</li>,
        p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed mb-2">{children}</p>,
        hr: () => <hr className="my-3 border-white/10" />,
    }

    return (
        <div className="bg-slate border border-salvia/20 flex flex-col" style={{ minHeight: haMessaggi || inviando ? 560 : 'auto' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-salvia" />
                    <p className="font-body text-base font-medium text-salvia">{t('header.titolo')}</p>
                    {crediti !== null && (
                        <span className="font-body text-xs text-nebbia/30 ml-2">{t('header.crediti', { count: crediti })}</span>
                    )}
                </div>
                {haMessaggi && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMostraSalva(v => !v)}
                            disabled={inviando}
                            className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors disabled:opacity-40"
                        >
                            <Save size={11} /> {t('header.salvaConversazione')}
                        </button>
                        <button
                            onClick={richiediNuovaChat}
                            disabled={inviando}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 border border-white/10 px-3 py-1.5 hover:text-nebbia hover:border-white/25 transition-colors disabled:opacity-40"
                        >
                            <Plus size={11} /> {t('header.nuovaChat')}
                        </button>
                    </div>
                )}
            </div>

            {/* Conferma nuova chat */}
            {confermaNuova && (
                <div className="px-5 py-3 border-b border-amber-500/30 bg-amber-500/5 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-body text-xs text-amber-400">
                            <AlertCircle size={12} className="inline mr-1" />
                            {t('confermaNuova.messaggio')}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={nuovaChat} className="font-body text-xs text-amber-400 border border-amber-500/40 px-3 py-1 hover:bg-amber-500/10">
                                {t('confermaNuova.conferma')}
                            </button>
                            <button onClick={() => setConfermaNuova(false)} className="font-body text-xs text-nebbia/40 px-3 py-1 hover:text-nebbia">
                                {t('comune.annulla')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conferma salvataggio */}
            {salvataConferma && (
                <div className="px-5 py-3 border-b border-salvia/30 bg-salvia/5 shrink-0">
                    <p className="font-body text-xs text-salvia flex items-center gap-2">
                        <CheckCircle size={12} />
                        {t('confermaSalvataggio')}
                    </p>
                </div>
            )}

            {/* Form salva conversazione */}
            {mostraSalva && (
                <div className="px-5 py-4 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-body text-xs text-oro tracking-widest uppercase">{t('formSalva.titolo')}</p>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="text-nebbia/30 hover:text-nebbia">
                            <X size={13} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={titoloSalva}
                        onChange={e => setTitoloSalva(e.target.value)}
                        placeholder={t('formSalva.placeholder')}
                        autoFocus
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={salvaConversazione}
                            disabled={salvando || !titoloSalva.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Save size={11} /> {t('formSalva.conferma')}</>
                            }
                        </button>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                            {t('comune.annulla')}
                        </button>
                    </div>
                </div>
            )}

            {/* Conversazione */}
            <div className={`overflow-y-auto p-5 space-y-4 ${haMessaggi || inviando ? 'flex-1' : ''}`}>

                {!haMessaggi && !inviando && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <Sparkles size={36} className="text-salvia/40 mb-4" />
                        <p className="font-display text-2xl font-light text-nebbia/80">
                            {t('vuoto.titolo')}
                        </p>
                        <p className="font-body text-sm text-nebbia/50 mt-3 max-w-lg leading-relaxed">
                            {t('vuoto.descrizione')}
                        </p>
                        <button
                            onClick={() => setMostraPopover(true)}
                            className="mt-5 flex items-center gap-2 font-body text-sm text-salvia border border-salvia/40 px-5 py-2.5 hover:bg-salvia/10 transition-colors"
                        >
                            <HelpCircle size={15} /> {t('vuoto.cta')}
                        </button>
                    </div>
                )}

                {conversazione.map((m, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                {m.role === 'user' ? t('ruolo.tu') : t('ruolo.lex')}
                            </span>
                            {m.tipo === 'documento' && (
                                <span className="font-body text-[10px] text-oro/60 border border-oro/20 px-1.5 py-0.5 uppercase tracking-wider">
                                    {t('badge.documento')}
                                </span>
                            )}
                        </div>

                        {m.role === 'user' ? (
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                        ) : m.tipo === 'documento' ? (
                            <BollaDocumento
                                messaggio={m}
                                mandatoId={mandatoId}
                                onDocumentoSalvato={onDocumentoSalvato}
                            />
                        ) : (
                            <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {inviando && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-medium text-salvia/70">{t('ruolo.lex')}</span>
                            {isDocumentoStreaming && (
                                <span className="font-body text-[10px] text-oro/60 border border-oro/20 px-1.5 py-0.5 uppercase tracking-wider">
                                    {t('badge.documento')}
                                </span>
                            )}
                        </div>

                        {isDocumentoStreaming ? (
                            streamingTesto.length === 0 ? (
                                <LexAnimazione frasi={statoGenerazione ? [statoGenerazione] : undefined} />
                            ) : (
                                <div>
                                    {statoGenerazione && (
                                        <p className="font-body text-xs text-nebbia/40 mb-2 flex items-center gap-1.5">
                                            <Loader2 size={11} className="animate-spin text-oro/60" />
                                            {statoGenerazione}
                                        </p>
                                    )}
                                    <FoglioA4 markdown={streamingTesto} />
                                </div>
                            )
                        ) : (
                            streamingTesto.length === 0 ? (
                                <LexAnimazione />
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>
                                        {streamingTesto}
                                    </ReactMarkdown>
                                    <span className="inline-block w-1 h-4 bg-oro/60 align-middle animate-pulse ml-0.5" />
                                </div>
                            )
                        )}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Errore */}
            {errore && errore !== 'crediti_esauriti' && (
                <div className="mx-5 mb-3 p-3 bg-red-900/10 border border-red-500/30">
                    <p className="font-body text-xs text-red-400 flex items-start gap-2">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        <span>{errore}</span>
                    </p>
                </div>
            )}

            {errore === 'crediti_esauriti' && (
                <div className="mx-5 mb-3 flex items-center justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={13} className="text-oro shrink-0" />
                        <p className="font-body text-xs text-nebbia/60">{t('creditiEsauriti.messaggio')}</p>
                    </div>
                    <a
                        href="/studio?tab=acquista"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap"
                    >
                        {t('creditiEsauriti.acquista')}
                    </a>
                </div>
            )}

            {/* Input area */}
            <div className="border-t border-white/5 p-4 space-y-2 shrink-0">
                <div className="flex gap-3 items-end">
                    <textarea
                        rows={2}
                        value={domandaLibera}
                        onChange={e => setDomandaLibera(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={inviando || creditiZero}
                        placeholder={creditiZero
                            ? t('input.placeholderEsauriti')
                            : t('input.placeholder')
                        }
                        className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                        style={{ minHeight: '60px', maxHeight: '200px' }}
                    />
                    <button
                        onClick={() => invia()}
                        disabled={inviando || !domandaLibera.trim() || creditiZero}
                        className="px-4 py-3 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
                        title={creditiZero ? t('input.titleEsauriti') : t('input.titleInvia')}
                    >
                        {inviando
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Send size={15} />
                        }
                    </button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <p className="font-body text-xs text-nebbia/55">
                        {t('input.suggerimento')}
                    </p>
                    <button
                        onClick={() => setMostraPopover(true)}
                        className="flex items-center gap-1.5 font-body text-xs text-salvia hover:text-salvia/80 transition-colors shrink-0 underline underline-offset-2 decoration-salvia/40"
                    >
                        <HelpCircle size={13} /> {t('vuoto.cta')}
                    </button>
                </div>
            </div>

            {mostraPopover && (
                <PopoverCapacita
                    onClose={() => setMostraPopover(false)}
                    onEsempio={(esempio) => setDomandaLibera(esempio)}
                />
            )}
        </div>
    )
}