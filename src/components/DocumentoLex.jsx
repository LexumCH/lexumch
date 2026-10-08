// src/components/DocumentoLex.jsx
//
// 08-10-2026: un documento scritto da Lex (modalità atto), versione CH di quella IT, in tre lingue
// (namespace comp_documento_lex): foglio con i segnaposto evidenziati, note per chi firma a parte, Scarica
// Word, Scarica PDF e Copia per tutti. Avvocati, fiduciari e progettisti hanno in più la carta intestata presa
// dal profilo; i privati scaricano senza. Avvocati e fiduciari: «Compila con i dati di una pratica / di un
// mandato». I dati inseriti sono in verde nel foglio, si possono togliere uno per uno o tutti con Annulla, e
// Word, PDF e Copia usano il testo compilato. Dentro una pratica o un mandato (`corrente`) si compila con
// quello, senza scegliere.

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { FileDown, FileText, Copy, Check, Loader2, ChevronDown, ChevronRight, Undo2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { separaNote, blocchiDaMarkdown, numeraSegnaposti, blocchiCompilati, nomeFileDocumento, testoDi } from '@/lib/documento/testoDocumento'
import { cartaIntestata, RUOLI_CARTA_INTESTATA } from '@/lib/documento/cartaIntestata'
import { RUOLI_COMPILAZIONE } from '@/components/CompilaDocumentoLex'
import { creaDocx } from '@/lib/documento/docx'
import CompilaDocumentoLex from '@/components/CompilaDocumentoLex'

// Note per chi firma: le fonti hanno i loro link, interni alla banca dati o esterni, aperti in una nuova scheda
// come nella Banca Dati CH (nell'area utente i link interni passano da /area)
const componentiNote = {
    p: ({ children }) => <p className="mb-1.5">{children}</p>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>,
    strong: ({ children }) => <strong className="font-medium text-nebbia/80">{children}</strong>,
    a: ({ href, children }) => {
        const link = String(href ?? '')
        const prefisso = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
        const finale = link.startsWith('/banca-dati/') ? link.replace('/banca-dati/', `${prefisso}/`) : link
        return <a href={finale} target="_blank" rel="noopener noreferrer" className="text-oro/80 hover:text-oro underline">{children}</a>
    },
}

const aCapo = (testo) => String(testo).split('\n').flatMap((r, k) => (k ? [<br key={`b${k}`} />, r] : [r]))

// I segnaposto ancora da completare in giallo, i dati inseriti dalla pratica o dal mandato in verde
function Pezzi({ pezzi, valori }) {
    return pezzi.map((p, i) => {
        let nodo = (p.segmenti ?? [{ testo: p.testo }]).map((s, j) => {
            if (s.n == null) return <span key={j}>{aCapo(s.testo)}</span>
            const valore = valori?.[s.n]
            return valore != null
                ? <mark key={j} title={s.segnaposto} className="bg-emerald-100 text-emerald-900 px-0.5 rounded-sm">{valore}</mark>
                : <mark key={j} className="bg-amber-100 text-amber-900 px-0.5 rounded-sm">{s.segnaposto}</mark>
        })
        if (p.corsivo) nodo = <em>{nodo}</em>
        if (p.grassetto) nodo = <strong className="font-bold">{nodo}</strong>
        return <span key={i}>{nodo}</span>
    })
}

function Foglio({ blocchi, carta, valori }) {
    return (
        <div className="bg-neutral-300/70 px-2 sm:px-5 py-5">
            <div className="bg-white shadow-xl mx-auto w-full max-w-[680px] text-neutral-900 px-5 sm:px-12 py-8 sm:py-12 font-display">
                {carta && (
                    <div className="text-center border-b border-neutral-400 pb-2 mb-6">
                        <p className="text-[1.05rem] font-bold">{carta.intestatario}</p>
                        {carta.righe.map((r, i) => <p key={i} className="text-[0.72rem] leading-snug text-neutral-600">{r}</p>)}
                    </div>
                )}
                {blocchi.map((b, i) => {
                    if (b.tipo === 'titolo') {
                        const classe = b.livello === 1
                            ? 'text-center text-[1.3rem] font-bold uppercase tracking-wide mb-5 mt-1'
                            : b.livello === 2 ? 'text-[1.05rem] font-bold uppercase tracking-wide mt-6 mb-2' : 'text-[1rem] font-semibold italic mt-4 mb-1.5'
                        return <p key={i} className={classe}><Pezzi pezzi={b.pezzi} valori={valori} /></p>
                    }
                    if (b.tipo === 'linea') return <hr key={i} className="my-5 border-neutral-300" />
                    if (b.tipo === 'citazione') {
                        return <blockquote key={i} className="border-l-2 border-neutral-300 pl-4 my-3 italic text-neutral-700"><Pezzi pezzi={b.pezzi} valori={valori} /></blockquote>
                    }
                    if (b.tipo === 'elenco') {
                        return (
                            <div key={i} className="my-3 space-y-1.5">
                                {b.voci.map((v, j) => (
                                    <div key={j} className="flex gap-2 text-[0.98rem] leading-[1.6] text-justify" style={{ paddingLeft: `${v.livello * 1.25}rem` }}>
                                        <span className="w-6 shrink-0 text-right">{v.segno}</span>
                                        <span className="flex-1"><Pezzi pezzi={v.pezzi} valori={valori} /></span>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                    return <p key={i} className="text-[0.98rem] text-justify leading-[1.7] mb-3.5"><Pezzi pezzi={b.pezzi} valori={valori} /></p>
                })}
            </div>
        </div>
    )
}

function salva(blob, nome) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
}

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const htmlPezzi = (pezzi) => pezzi.map((p) => {
    let t = html(p.testo).replace(/\n/g, '<br>')
    if (p.corsivo) t = `<em>${t}</em>`
    if (p.grassetto) t = `<strong>${t}</strong>`
    return t
}).join('')

// Il documento per gli appunti: HTML (Word tiene titoli e grassetti) e testo semplice
function perAppunti(blocchi) {
    const h = []
    const t = []
    for (const b of blocchi) {
        if (b.tipo === 'titolo') { h.push(`<h${b.livello}>${htmlPezzi(b.pezzi)}</h${b.livello}>`); t.push(testoDi(b.pezzi)) }
        else if (b.tipo === 'linea') { h.push('<hr>'); t.push('') }
        else if (b.tipo === 'elenco') {
            for (const v of b.voci) {
                h.push(`<p style="margin-left:${1 + v.livello * 1.25}em">${v.segno ? `${html(v.segno)} ` : ''}${htmlPezzi(v.pezzi)}</p>`)
                t.push(`${'  '.repeat(v.livello)}${v.segno ? `${v.segno} ` : ''}${testoDi(v.pezzi)}`)
            }
        } else { h.push(`<p>${htmlPezzi(b.pezzi)}</p>`); t.push(testoDi(b.pezzi)) }
    }
    return { html: h.join('\n'), testo: t.join('\n\n') }
}

const LINGUA_WORD = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export default function DocumentoLex({ markdown, tipo, corrente = null }) {
    const { profile } = useAuth()
    const { t, i18n } = useTranslation('comp_documento_lex')
    const lingua = ['de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    const { corpo, note } = useMemo(() => separaNote(markdown), [markdown])
    const blocchi = useMemo(() => blocchiDaMarkdown(corpo), [corpo])
    const { blocchi: numerati, segnaposti } = useMemo(() => numeraSegnaposti(blocchi), [blocchi])
    const carta = useMemo(() => cartaIntestata(profile, {
        titoloAvvocato: t('carta.titolo_avvocato'),
        albo: (cantone, numero) => (numero ? t('carta.albo_numero', { cantone, numero }) : t('carta.albo', { cantone })).trim(),
        tel: t('carta.tel'),
        uid: t('carta.uid'),
        iva: t('carta.iva'),
    }), [profile, t])
    const professionista = RUOLI_CARTA_INTESTATA.includes(profile?.role)
    const [conCarta, setConCarta] = useState(true)
    const [lavoro, setLavoro] = useState(null)        // 'word' | 'pdf' | null
    const [avviso, setAvviso] = useState('')
    const [copiato, setCopiato] = useState(false)
    const [noteAperte, setNoteAperte] = useState(false)
    // { valori: { [n]: testo }, gruppi: [{ segnaposto, valore, numeri }], origine: { ambito, id, titolo } }
    const [compilazione, setCompilazione] = useState(null)
    const [datiAperti, setDatiAperti] = useState(false)

    // Un altro documento: si riparte dai segnaposto
    useEffect(() => { setCompilazione(null); setDatiAperti(false) }, [markdown])

    const valori = useMemo(() => compilazione?.valori ?? {}, [compilazione])
    const finali = useMemo(() => blocchiCompilati(numerati, valori), [numerati, valori])
    const daCompletare = useMemo(() => new Set(segnaposti.filter((s) => valori[s.n] == null).map((s) => s.segnaposto)).size, [segnaposti, valori])

    const cartaUsata = professionista && conCarta ? carta : null
    const titolo = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : t('documento')

    function togliDato(gruppo) {
        setCompilazione((c) => {
            if (!c) return c
            const v = { ...c.valori }
            gruppo.numeri.forEach((n) => { delete v[n] })
            const gruppi = c.gruppi.filter((g) => g !== gruppo)
            return gruppi.length ? { ...c, valori: v, gruppi } : null
        })
    }

    async function scaricaWord() {
        setAvviso('')
        setLavoro('word')
        try {
            salva(creaDocx({ blocchi: finali, carta: cartaUsata, titolo, lingua: LINGUA_WORD[lingua] }), nomeFileDocumento(tipo || t('documento'), 'docx'))
        } catch {
            setAvviso(t('errore_word'))
        } finally {
            setLavoro(null)
        }
    }

    async function scaricaPdf() {
        setAvviso('')
        setLavoro('pdf')
        try {
            const { creaPdfDocumento } = await import('@/lib/documento/pdfDocumento')
            salva(await creaPdfDocumento({ blocchi: finali, carta: cartaUsata, titolo }), nomeFileDocumento(tipo || t('documento'), 'pdf'))
        } catch {
            setAvviso(t('errore_pdf'))
        } finally {
            setLavoro(null)
        }
    }

    async function copia() {
        setAvviso('')
        const { html: h, testo } = perAppunti(finali)
        try {
            if (window.ClipboardItem && navigator.clipboard?.write) {
                await navigator.clipboard.write([new window.ClipboardItem({
                    'text/html': new Blob([h], { type: 'text/html' }),
                    'text/plain': new Blob([testo], { type: 'text/plain' }),
                })])
            } else {
                await navigator.clipboard.writeText(testo)
            }
            setCopiato(true)
            setTimeout(() => setCopiato(false), 2500)
        } catch {
            setAvviso(t('errore_copia'))
        }
    }

    const pulsante = 'flex items-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/40 px-3 py-1.5 transition-colors disabled:opacity-40'
    const inseriti = compilazione?.gruppi.length ?? 0

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5">
                    <FileText size={11} /> {t('badge')}
                </span>
                <span className="font-body text-xs text-nebbia/50">{titolo}</span>
                {daCompletare > 0 && (
                    <span className="font-body text-xs text-amber-400/80">
                        {t('da_completare', { count: daCompletare })}
                    </span>
                )}
            </div>

            {RUOLI_COMPILAZIONE.includes(profile?.role) && segnaposti.length > 0 && (
                <div className="space-y-2">
                    <CompilaDocumentoLex
                        ruolo={profile?.role}
                        profilo={profile}
                        numerati={numerati}
                        segnaposti={segnaposti}
                        corrente={corrente}
                        onCompilato={(c) => { setCompilazione(c); setDatiAperti(false) }}
                        classePulsante={pulsante}
                    />
                    {compilazione && (
                        <div className="border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 space-y-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <p className="font-body text-xs text-nebbia/70">
                                    {compilazione.origine.titolo
                                        ? t(compilazione.origine.ambito === 'mandato' ? 'compilato_con_mandato' : 'compilato_con_pratica', { titolo: compilazione.origine.titolo })
                                        : t(compilazione.origine.ambito === 'mandato' ? 'compilato_questo_mandato' : 'compilato_questa_pratica')}{' '}
                                    {t('inseriti', { count: inseriti })}
                                </p>
                                <button type="button" onClick={() => setDatiAperti((v) => !v)}
                                    className="flex items-center gap-1 font-body text-xs text-emerald-300/80 hover:text-oro transition-colors">
                                    {datiAperti ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {t('vedi_dati')}
                                </button>
                                <button type="button" onClick={() => { setCompilazione(null); setDatiAperti(false) }}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/60 hover:text-oro transition-colors">
                                    <Undo2 size={12} /> {t('annulla')}
                                </button>
                            </div>
                            {datiAperti && (
                                <ul className="space-y-1">
                                    {compilazione.gruppi.map((g) => (
                                        <li key={`${g.segnaposto}|${g.valore}`} className="flex items-start gap-2 font-body text-xs">
                                            <span className="flex-1 min-w-0 break-words">
                                                <span className="text-amber-300/70">{g.segnaposto}</span>
                                                <span className="text-nebbia/40"> → </span>
                                                <span className="text-emerald-200/90">{g.valore}</span>
                                                {g.numeri.length > 1 && <span className="text-nebbia/40"> {t('punti', { count: g.numeri.length })}</span>}
                                            </span>
                                            <button type="button" onClick={() => togliDato(g)} title={t('togli')} aria-label={t('togli')}
                                                className="text-nebbia/40 hover:text-red-300 shrink-0">
                                                <X size={12} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}

            <Foglio blocchi={numerati} carta={cartaUsata} valori={valori} />

            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={scaricaWord} disabled={!!lavoro} className={pulsante}>
                    {lavoro === 'word' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} {t('scarica_word')}
                </button>
                <button type="button" onClick={scaricaPdf} disabled={!!lavoro} className={pulsante}>
                    {lavoro === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} {t('scarica_pdf')}
                </button>
                <button type="button" onClick={copia} className={pulsante}>
                    {copiato ? <Check size={12} /> : <Copy size={12} />} {copiato ? t('copiato') : t('copia')}
                </button>
                {professionista && carta && (
                    <label className="flex items-center gap-1.5 font-body text-xs text-nebbia/60 ml-1 cursor-pointer select-none">
                        <input type="checkbox" checked={conCarta} onChange={(e) => setConCarta(e.target.checked)} className="accent-oro" />
                        {t('con_carta')}
                    </label>
                )}
            </div>
            {professionista && !carta && (
                <p className="font-body text-xs text-nebbia/40">
                    {t('carta_incompleta')}
                </p>
            )}
            {avviso && <p className="font-body text-xs text-red-400/80">{avviso}</p>}

            {note && (
                <div className="border border-white/10 bg-petrolio/40">
                    <button type="button" onClick={() => setNoteAperte((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 font-body text-xs text-nebbia/70 hover:text-oro transition-colors">
                        {noteAperte ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {t('note_titolo')}
                    </button>
                    {noteAperte && (
                        <div className="px-4 pb-3 font-body text-xs text-nebbia/60 leading-relaxed">
                            <ReactMarkdown components={componentiNote}>{note}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
