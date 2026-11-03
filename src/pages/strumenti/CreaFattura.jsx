// src/pages/strumenti/CreaFattura.jsx
//
// 03-11-2026: lo strumento gratuito per fare una QR-fattura svizzera: logo, dati, righe, poi il PDF con la
// sezione di pagamento. Niente account, niente AI, niente server: tutto nel browser. Il QR e il PDF seguono
// la stessa logica del gestionale (lib/strumenti/qrFattura.js e pdfFattura.js).
// L'indirizzo cambia con la lingua (lib/strumenti/percorsi.js): dopo il cambio lingua dal menu si passa a quello giusto.
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Download, ImagePlus, Loader2, Plus, QrCode, Trash2 } from 'lucide-react'
import { TestataPagina, Apertura, DomandeFrequenti, CAMPO, ETICHETTA } from '@/components/strumenti/Pagina'
import { usePopupIscrizione } from '@/components/strumenti/PopupIscrizione'
import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'
import { ALIQUOTE_IVA, ibanSvizzero, normalizzaUid } from '@/lib/fatturazione'
import { datiQr, matriceQr } from '@/lib/strumenti/qrFattura'
import { leggi, scrivi } from '@/lib/strumenti/memoria'
import { SLUG_FATTURA } from '@/lib/strumenti/percorsi'

const EMITTENTE_VUOTO = {
    logo: null, tipo: 'persona', denominazione: '', nome: '', cognome: '', via: '', civico: '', npa: '', localita: '',
    paese: 'CH', uid: '', iva_attiva: true, email: '', telefono: '', iban: '',
}
const CLIENTE_VUOTO = { tipo: 'persona', ragione_sociale: '', nome: '', cognome: '', via: '', civico: '', npa: '', localita: '', paese: 'CH', email: '' }
const RIGA_VUOTA = { descrizione: '', quantita: 1, prezzo_unitario: '' }
const NOMI_LINGUA = { it: 'Italiano', de: 'Deutsch', fr: 'Français' }
const CHIAVI_ALIQUOTA = { 8.1: 'aliquota_8', 2.6: 'aliquota_2', 3.8: 'aliquota_3' }

// Stessa etichetta della parola «Fattura» nel documento (lib/strumenti/pdfFattura.js, T.comunicazione)
const COMUNICAZIONE = { it: 'Fattura', de: 'Rechnung', fr: 'Facture' }

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const fmt = (n, valuta) => {
    const v = r2(Number(n ?? 0))
    const [int, dec] = Math.abs(v).toFixed(2).split('.')
    return `${v < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${dec} ${valuta}`
}

function numeroSuccessivo(ultimo) {
    const m = String(ultimo ?? '').match(/^(\D*)(\d+)(.*)$/)
    if (!m) return `${new Date().getFullYear()}-1`
    // Se il numero finisce con delle cifre si aumentano quelle: 2026-1 → 2026-2
    const fine = String(ultimo).match(/^(.*?)(\d+)(\D*)$/)
    return `${fine[1]}${Number(fine[2]) + 1}${fine[3]}`
}

// Qualunque immagine diventa un PNG piccolo: entra nel PDF e sta nella memoria del browser.
function leggiLogo(file, messaggio) {
    return new Promise((ok, ko) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            const scala = Math.min(1, 600 / img.width, 240 / img.height)
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(img.width * scala))
            canvas.height = Math.max(1, Math.round(img.height * scala))
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(url)
            ok(canvas.toDataURL('image/png'))
        }
        img.onerror = () => { URL.revokeObjectURL(url); ko(new Error(messaggio)) }
        img.src = url
    })
}

function Campo({ etichetta, valore, onChange, segnaposto, tipo = 'text', classe = '', ...resto }) {
    return (
        <label className={`block ${classe}`}>
            <span className={ETICHETTA}>{etichetta}</span>
            <input type={tipo} value={valore} onChange={e => onChange(e.target.value)} placeholder={segnaposto} className={CAMPO} {...resto} />
        </label>
    )
}

function Scheda({ titolo, children }) {
    return (
        <div className="bg-slate border border-white/5 p-4 sm:p-6">
            <h2 className="font-display text-xl font-light text-nebbia mb-4">{titolo}</h2>
            {children}
        </div>
    )
}

function Scelta({ opzioni, valore, onChange }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {opzioni.map(o => (
                <button key={o.id} type="button" onClick={() => onChange(o.id)}
                    className={`font-body text-xs px-3 py-2 border transition-colors ${valore === o.id ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:text-nebbia'}`}>
                    {o.nome}
                </button>
            ))}
        </div>
    )
}

function Indirizzo({ dati, aggiorna, t }) {
    return (
        <div className="grid grid-cols-6 gap-3">
            <Campo classe="col-span-4" etichetta={t('fattura.via')} valore={dati.via} onChange={via => aggiorna({ via })} />
            <Campo classe="col-span-2" etichetta={t('fattura.civico')} valore={dati.civico} onChange={civico => aggiorna({ civico })} />
            <Campo classe="col-span-2" etichetta={t('fattura.npa')} valore={dati.npa} onChange={npa => aggiorna({ npa })} />
            <Campo classe="col-span-3" etichetta={t('fattura.localita')} valore={dati.localita} onChange={localita => aggiorna({ localita })} />
            <Campo classe="col-span-1" etichetta={t('fattura.paese')} valore={dati.paese} onChange={paese => aggiorna({ paese: paese.toUpperCase() })} maxLength={2} />
        </div>
    )
}

// Il codice QR anche nell'anteprima, in un SVG: stessa matrice del PDF
function AnteprimaQr({ payload }) {
    const percorso = useMemo(() => {
        const { n, scuro } = matriceQr(payload)
        let d = ''
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (scuro(r, c)) d += `M${c} ${r}h1v1h-1z`
        return { n, d }
    }, [payload])
    return (
        <svg viewBox={`0 0 ${percorso.n} ${percorso.n}`} className="w-20 h-20 shrink-0" shapeRendering="crispEdges" aria-hidden="true">
            <path d={percorso.d} fill="#000" />
        </svg>
    )
}

export default function CreaFattura() {
    const { lang, strumento } = useParams()
    const lingua = LINGUE_SUPPORTATE.includes(lang) ? lang : LINGUA_DEFAULT
    const { t } = useTranslation('strumenti')

    const [em, setEm] = useState(EMITTENTE_VUOTO)
    const [cl, setCl] = useState(CLIENTE_VUOTO)
    const [doc, setDoc] = useState({
        lingua, numero: '', data: new Date().toISOString().slice(0, 10), scadenza: '', periodo: '', valuta: 'CHF',
        aliquota: 8.1, note: '',
    })
    const [righe, setRighe] = useState([RIGA_VUOTA])
    const [ricorda, setRicorda] = useState(true)
    const [creando, setCreando] = useState(false)
    const [mancano, setMancano] = useState([])
    const [errore, setErrore] = useState('')
    const { dopoDocumento, popup } = usePopupIscrizione('fattura')

    const aggEm = (p) => setEm(x => ({ ...x, ...p }))
    const aggCl = (p) => setCl(x => ({ ...x, ...p }))
    const aggDoc = (p) => setDoc(x => ({ ...x, ...p }))
    const aggRiga = (i, p) => setRighe(rr => rr.map((r, j) => (j === i ? { ...r, ...p } : r)))

    // Quello che il browser ricorda
    useEffect(() => {
        const salvato = leggi('emittente')
        if (salvato) setEm(x => ({ ...x, ...salvato }))
        aggDoc({ numero: numeroSuccessivo(leggi('ultimoNumero')) })
    }, [])

    const righeValide = useMemo(() => righe
        .filter(r => r.descrizione.trim() && (parseFloat(r.prezzo_unitario) || 0) !== 0 && (parseFloat(r.quantita) || 0) > 0)
        .map(r => ({
            descrizione: r.descrizione.trim(),
            quantita: parseFloat(r.quantita),
            prezzo_unitario: parseFloat(r.prezzo_unitario),
            totale: r2(parseFloat(r.quantita) * parseFloat(r.prezzo_unitario)),
        })), [righe])

    const imponibile = r2(righeValide.reduce((s, r) => s + r.totale, 0))
    const ivaImporto = em.iva_attiva ? r2(imponibile * Number(doc.aliquota) / 100) : 0
    const totale = r2(imponibile + ivaImporto)

    const nomeEmittente = em.tipo === 'societa' ? em.denominazione.trim() : `${em.nome} ${em.cognome}`.trim()
    const nomeCliente = cl.tipo === 'azienda' ? cl.ragione_sociale.trim() : `${cl.nome} ${cl.cognome}`.trim()
    const emittentePdf = { nome: nomeEmittente, via: em.via.trim(), civico: em.civico.trim(), npa: em.npa.trim(), localita: em.localita.trim(), paese: em.paese.trim() || 'CH' }
    const clientePdf = { nome: nomeCliente, via: cl.via.trim(), civico: cl.civico.trim(), npa: cl.npa.trim(), localita: cl.localita.trim(), paese: cl.paese.trim() || 'CH' }

    const qr = useMemo(() => datiQr({
        iban: em.iban,
        creditore: emittentePdf,
        debitore: clientePdf,
        importo: totale,
        valuta: doc.valuta,
        numero: doc.numero,
        anno: doc.data.slice(0, 4),
        comunicazione: `${COMUNICAZIONE[doc.lingua]} ${doc.numero}`.trim(),
    }), [em.iban, nomeEmittente, em.via, em.civico, em.npa, em.localita, em.paese, nomeCliente, cl.via, cl.civico, cl.npa, cl.localita, cl.paese, totale, doc.valuta, doc.numero, doc.data, doc.lingua]) // eslint-disable-line react-hooks/exhaustive-deps

    const ibanErrato = em.iban.trim() && !ibanSvizzero(em.iban)
    const uidNormale = em.uid.trim() ? normalizzaUid(em.uid) : null
    const uidErrato = em.uid.trim() && !uidNormale

    // Cambio lingua dal menu: si passa all'indirizzo di quella lingua. Un indirizzo sconosciuto va agli strumenti.
    if (!Object.values(SLUG_FATTURA).includes(strumento)) return <Navigate to={`/${lingua}/strumenti`} replace />
    if (strumento !== SLUG_FATTURA[lingua]) return <Navigate to={`/${lingua}/strumenti/${SLUG_FATTURA[lingua]}`} replace />

    const indirizzoDi = (s) => {
        const via = [s.via, s.civico].filter(Boolean).join(' ')
        const citta = [s.npa, s.localita].filter(Boolean).join(' ')
        return [via, citta].filter(Boolean).join(', ')
    }

    async function scaricaPdf() {
        const m = []
        if (!nomeEmittente) m.push(t('fattura.manca_tuo_nome'))
        if (!nomeCliente) m.push(t('fattura.manca_cliente'))
        if (!righeValide.length) m.push(t('fattura.manca_righe'))
        setMancano(m)
        setErrore('')
        if (m.length || creando) return
        setCreando(true)
        try {
            const { scaricaPdfFattura } = await import('@/lib/strumenti/pdfFattura')
            await scaricaPdfFattura({
                lingua: doc.lingua,
                logo: em.logo,
                emittente: { ...emittentePdf, uid: uidNormale, ivaAttiva: em.iva_attiva, email: em.email.trim(), telefono: em.telefono.trim() },
                cliente: { ...clientePdf, email: cl.email.trim() },
                numero: doc.numero.trim(),
                data: doc.data,
                scadenza: doc.scadenza,
                periodo: doc.periodo.trim(),
                valuta: doc.valuta,
                righe: righeValide,
                aliquota: doc.aliquota,
                imponibile,
                ivaImporto,
                totale,
                note: doc.note.trim(),
                qr,
                nomeFile: `${COMUNICAZIONE[doc.lingua]} ${doc.numero.trim()} ${nomeCliente}.pdf`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' '),
            })
            if (ricorda) scrivi('emittente', em)
            else scrivi('emittente', null)
            if (doc.numero.trim()) scrivi('ultimoNumero', doc.numero.trim())
            dopoDocumento()
        } catch (e) {
            setErrore(t('fattura.errore_pdf'))
        } finally {
            setCreando(false)
        }
    }

    async function caricaLogo(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            aggEm({ logo: await leggiLogo(file, t('fattura.logo_errore')) })
        } catch (err) {
            setErrore(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina lingua={lingua} percorsoDi={l => `/${l}/strumenti/${SLUG_FATTURA[l]}`}
                titolo={t('fattura.meta_title')} descrizione={t('fattura.meta_description')} />
            <Apertura etichetta={t('fattura.label')} titolo={t('fattura.title')} evidenza={t('fattura.highlight')} testo={t('fattura.text')} />

            <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
                <div className="space-y-4 min-w-0">
                    <Scheda titolo={t('fattura.documento')}>
                        <div className="space-y-4">
                            <div>
                                <span className={ETICHETTA}>{t('fattura.lingua_documento')}</span>
                                <Scelta valore={doc.lingua} onChange={l => aggDoc({ lingua: l })}
                                    opzioni={LINGUE_SUPPORTATE.map(l => ({ id: l, nome: NOMI_LINGUA[l] }))} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Campo etichetta={t('fattura.numero')} valore={doc.numero} onChange={numero => aggDoc({ numero })} />
                                <Campo etichetta={t('fattura.data')} tipo="date" valore={doc.data} onChange={data => aggDoc({ data })} />
                                <Campo etichetta={t('fattura.scadenza')} tipo="date" valore={doc.scadenza} onChange={scadenza => aggDoc({ scadenza })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Campo classe="sm:col-span-2" etichetta={t('fattura.periodo')} valore={doc.periodo} onChange={periodo => aggDoc({ periodo })} segnaposto={t('fattura.periodo_esempio')} />
                                <label className="block">
                                    <span className={ETICHETTA}>{t('fattura.valuta')}</span>
                                    <select value={doc.valuta} onChange={e => aggDoc({ valuta: e.target.value })} className={CAMPO}>
                                        <option>CHF</option>
                                        <option>EUR</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    </Scheda>

                    <Scheda titolo={t('fattura.tuoi_dati')}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center justify-center w-36 h-16 shrink-0 border border-dashed border-white/15 hover:border-oro/40 cursor-pointer transition-colors bg-petrolio">
                                    {em.logo
                                        ? <img src={em.logo} alt={t('fattura.logo')} className="max-w-full max-h-full p-1" />
                                        : <span className="flex items-center gap-2 font-body text-xs text-nebbia/40"><ImagePlus size={15} /> {t('fattura.logo')}</span>}
                                    <input type="file" accept="image/*" onChange={caricaLogo} className="sr-only" />
                                </label>
                                {em.logo
                                    ? <button type="button" onClick={() => aggEm({ logo: null })} className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">{t('fattura.logo_togli')}</button>
                                    : <p className="font-body text-xs text-nebbia/30 leading-relaxed">{t('fattura.logo_aiuto')}</p>}
                            </div>
                            <Scelta valore={em.tipo} onChange={tipo => aggEm({ tipo })} opzioni={[
                                { id: 'persona', nome: t('fattura.persona') },
                                { id: 'societa', nome: t('fattura.societa') },
                            ]} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {em.tipo === 'societa' ? (
                                    <Campo classe="sm:col-span-2" etichetta={t('fattura.denominazione')} valore={em.denominazione} onChange={denominazione => aggEm({ denominazione })} />
                                ) : (
                                    <>
                                        <Campo etichetta={t('fattura.nome')} valore={em.nome} onChange={nome => aggEm({ nome })} />
                                        <Campo etichetta={t('fattura.cognome')} valore={em.cognome} onChange={cognome => aggEm({ cognome })} />
                                    </>
                                )}
                            </div>
                            <Indirizzo dati={em} aggiorna={aggEm} t={t} />
                            <div>
                                <Campo etichetta={t('fattura.iban')} valore={em.iban} onChange={iban => aggEm({ iban: iban.toUpperCase() })} />
                                <p className={`font-body text-xs mt-1 ${ibanErrato ? 'text-amber-400/80' : 'text-nebbia/30'}`}>
                                    {ibanErrato ? t('fattura.iban_errore') : t('fattura.iban_aiuto')}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Campo etichetta={t('fattura.uid')} valore={em.uid} onChange={uid => aggEm({ uid })} segnaposto="CHE-123.456.789" />
                                    {uidErrato && <p className="font-body text-xs text-amber-400/80 mt-1">{t('fattura.uid_errore')}</p>}
                                </div>
                                <Campo etichetta={t('fattura.email')} tipo="email" valore={em.email} onChange={email => aggEm({ email })} />
                                <Campo etichetta={t('fattura.telefono')} valore={em.telefono} onChange={telefono => aggEm({ telefono })} />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={ricorda} onChange={e => setRicorda(e.target.checked)} className="w-4 h-4 accent-oro" />
                                <span className="font-body text-xs text-nebbia/60">{t('fattura.ricorda')}</span>
                            </label>
                        </div>
                    </Scheda>

                    <Scheda titolo={t('fattura.cliente')}>
                        <div className="space-y-4">
                            <Scelta valore={cl.tipo} onChange={tipo => aggCl({ tipo })} opzioni={[
                                { id: 'persona', nome: t('fattura.cliente_persona') },
                                { id: 'azienda', nome: t('fattura.cliente_azienda') },
                            ]} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cl.tipo === 'azienda' ? (
                                    <Campo classe="sm:col-span-2" etichetta={t('fattura.ragione_sociale')} valore={cl.ragione_sociale} onChange={ragione_sociale => aggCl({ ragione_sociale })} />
                                ) : (
                                    <>
                                        <Campo etichetta={t('fattura.nome')} valore={cl.nome} onChange={nome => aggCl({ nome })} />
                                        <Campo etichetta={t('fattura.cognome')} valore={cl.cognome} onChange={cognome => aggCl({ cognome })} />
                                    </>
                                )}
                            </div>
                            <Indirizzo dati={cl} aggiorna={aggCl} t={t} />
                            <Campo etichetta={t('fattura.cliente_email')} tipo="email" valore={cl.email} onChange={email => aggCl({ email })} />
                        </div>
                    </Scheda>

                    <Scheda titolo={t('fattura.righe')}>
                        <div className="space-y-3">
                            {righe.map((r, i) => (
                                <div key={i} className="border border-white/5 p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <label className="block flex-1 min-w-0">
                                            <span className={ETICHETTA}>{t('fattura.descrizione')}</span>
                                            <textarea rows={2} value={r.descrizione} onChange={e => aggRiga(i, { descrizione: e.target.value })}
                                                placeholder={t('fattura.descrizione_esempio')} className={`${CAMPO} resize-y`} />
                                        </label>
                                        {righe.length > 1 && (
                                            <button type="button" onClick={() => setRighe(rr => rr.filter((_, j) => j !== i))} aria-label={t('fattura.togli_riga')}
                                                className="p-2 mt-6 text-nebbia/30 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Campo etichetta={t('fattura.quantita')} tipo="number" min="0" step="any" valore={r.quantita} onChange={quantita => aggRiga(i, { quantita })} />
                                        <Campo etichetta={`${t('fattura.prezzo')} (${doc.valuta})`} tipo="number" step="any" valore={r.prezzo_unitario} onChange={prezzo_unitario => aggRiga(i, { prezzo_unitario })} />
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setRighe(rr => [...rr, RIGA_VUOTA])}
                                className="flex items-center gap-2 px-3 py-2 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-oro transition-colors">
                                <Plus size={14} /> {t('fattura.aggiungi_riga')}
                            </button>
                        </div>
                    </Scheda>

                    <Scheda titolo={t('fattura.imposte')}>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={em.iva_attiva} onChange={e => aggEm({ iva_attiva: e.target.checked })} className="w-4 h-4 accent-oro" />
                                <span className="font-body text-xs text-nebbia/60">{t('fattura.iva_attiva')}</span>
                            </label>
                            {em.iva_attiva ? (
                                <label className="block sm:w-1/2">
                                    <span className={ETICHETTA}>{t('fattura.aliquota')}</span>
                                    <select value={doc.aliquota} onChange={e => aggDoc({ aliquota: Number(e.target.value) })} className={CAMPO}>
                                        {ALIQUOTE_IVA.map(a => <option key={a} value={a}>{t(`fattura.${CHIAVI_ALIQUOTA[a]}`)}</option>)}
                                    </select>
                                </label>
                            ) : (
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{t('fattura.iva_non')}</p>
                            )}
                            <label className="block">
                                <span className={ETICHETTA}>{t('fattura.note')}</span>
                                <textarea rows={2} value={doc.note} onChange={e => aggDoc({ note: e.target.value })} className={`${CAMPO} resize-y`} />
                            </label>
                        </div>
                    </Scheda>
                </div>

                {/* Anteprima e azioni */}
                <aside className="lg:sticky lg:top-24 space-y-3">
                    <div className="bg-white text-[#0B1F2A] p-5 font-body text-[11px] leading-snug shadow-2xl shadow-black/40">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                {em.logo && <img src={em.logo} alt="" className="max-h-10 max-w-[130px] mb-2" />}
                                <p className="font-medium text-[13px] break-words">{nomeEmittente || t('fattura.anteprima_tuoi')}</p>
                                {indirizzoDi(em) && <p className="text-[#5C6B73]">{indirizzoDi(em)}</p>}
                                {uidNormale && <p className="text-[#5C6B73]">{uidNormale}</p>}
                            </div>
                            <div className="shrink-0 border border-[#D9DEE1] px-2.5 py-1.5 text-right">
                                <p className="text-[9px] font-medium uppercase">{COMUNICAZIONE[doc.lingua]}</p>
                                <p className="font-medium text-[13px]">{doc.numero || '—'}</p>
                            </div>
                        </div>
                        <div className="bg-[#F4F6F7] px-2.5 py-2 mb-3">
                            <p className="font-medium break-words">{nomeCliente || t('fattura.anteprima_cliente')}</p>
                            {indirizzoDi(cl) && <p className="text-[#5C6B73]">{indirizzoDi(cl)}</p>}
                        </div>
                        <div className="mb-3">
                            {righeValide.length === 0 && <p className="text-[#5C6B73] py-2 border-b border-[#D9DEE1]">{t('fattura.anteprima_righe')}</p>}
                            {righeValide.map((r, i) => (
                                <div key={i} className="flex justify-between gap-3 py-1.5 border-b border-[#D9DEE1]">
                                    <span className="min-w-0 break-words">{r.quantita !== 1 ? `${r.quantita} × ` : ''}{r.descrizione}</span>
                                    <span className="shrink-0">{fmt(r.totale, doc.valuta)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-end justify-between gap-3">
                            {qr ? <AnteprimaQr payload={qr.payload} /> : <span />}
                            <div className="flex-1 space-y-0.5">
                                {em.iva_attiva && (
                                    <div className="flex justify-between gap-3 text-[#5C6B73]"><span>{t('fattura.sigla_iva')} {doc.aliquota}%</span><span className="shrink-0">{fmt(ivaImporto, doc.valuta)}</span></div>
                                )}
                                <div className="flex justify-between gap-3 font-medium text-[13px] pt-1"><span>{t('fattura.totale')}</span><span>{fmt(totale, doc.valuta)}</span></div>
                            </div>
                        </div>
                    </div>

                    <p className={`flex items-start gap-2 font-body text-xs leading-relaxed ${qr ? 'text-salvia' : 'text-nebbia/40'}`}>
                        <QrCode size={14} className="shrink-0 mt-0.5" /> {qr ? t('fattura.qr_ok') : t('fattura.qr_no')}
                    </p>

                    {mancano.length > 0 && (
                        <div className="border border-amber-400/30 bg-amber-400/5 p-3">
                            <p className="flex items-center gap-2 font-body text-xs text-amber-300 mb-1.5"><AlertTriangle size={13} /> {t('fattura.manca')}</p>
                            <ul className="list-disc pl-5 space-y-0.5 font-body text-xs text-nebbia/60">
                                {mancano.map(m => <li key={m}>{m}</li>)}
                            </ul>
                        </div>
                    )}
                    {errore && <p className="font-body text-xs text-red-400">{errore}</p>}

                    <button onClick={scaricaPdf} disabled={creando}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                        {creando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {t('fattura.scarica')}
                    </button>
                </aside>
            </section>

            <section className="max-w-3xl mx-auto px-6 pb-24">
                <h2 className="font-display text-3xl font-light mb-6">{t('fattura.domande_titolo')}</h2>
                <DomandeFrequenti domande={t('fattura.domande', { returnObjects: true })} />
                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-sm text-nebbia/40">{t('fattura.cta_testo')}</p>
                    <Link to="/registrati" className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                        {t('fattura.cta')} <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
            {popup}
        </div>
    )
}
