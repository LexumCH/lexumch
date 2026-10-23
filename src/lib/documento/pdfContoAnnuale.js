// src/lib/documento/pdfContoAnnuale.js
//
// 09-10-2026: il PDF del conto annuale (art. 958 cpv. 2 CO): bilancio, conto economico e allegato, con le cifre
// dell'esercizio precedente (art. 958d cpv. 2), in franchi, nella lingua scelta per il cliente, e il posto per
// le due firme dell'art. 958 cpv. 3. Finché non è definitivo porta la scritta «BOZZA». Niente marchio Lexum:
// è un documento della società. Tabelle in Outfit (cifre leggibili), testi in Cormorant come i documenti di Lex.
// Si carica solo al click.

import pdfMake from 'pdfmake/build/pdfmake'
import outfit300 from '@fontsource/outfit/files/outfit-latin-300-normal.woff?url'
import outfit500 from '@fontsource/outfit/files/outfit-latin-500-normal.woff?url'
import cormorant500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff?url'
import cormorant600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url'
import cormorant500i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff?url'
import cormorant600i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff?url'
import { contenuto } from './pdfDocumento'
import { separaNote, blocchiDaMarkdown } from './testoDocumento'
import { STRUTTURA_BILANCIO, STRUTTURA_CE } from '@/lib/pianoContiKMU'
import { testoCO, etichettaPosta, totaleDi, TESTI_CO } from '@/lib/contoAnnualeTesti'
import { dataCH, etichettaEsercizio, r2 } from '@/lib/contoAnnuale'

const assoluto = (url) => new URL(url, window.location.origin).href
const caratteri = () => ({
    Outfit: { normal: assoluto(outfit300), bold: assoluto(outfit500), italics: assoluto(outfit300), bolditalics: assoluto(outfit500) },
    Cormorant: { normal: assoluto(cormorant500), bold: assoluto(cormorant600), italics: assoluto(cormorant500i), bolditalics: assoluto(cormorant600i) },
})

// 1’234.50 / -1’234.50 (separatore svizzero)
export const importoCH = (n) => {
    const v = Math.round((Number(n) || 0) * 100) / 100
    return (v === 0 ? 0 : v).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


// Tabella con righe tipizzate: 'testa', 'sezione', 'gruppo', 'posta', 'totale', 'subtotale'
function tabella(righe, conPrecedente) {
    const larghezze = conPrecedente ? ['*', 82, 82] : ['*', 82]
    const body = righe.map((r) => {
        if (r.tipo === 'testa') {
            return [
                { text: r.etichetta ?? '', style: 'testaTabella' },
                { text: r.attuale, style: 'testaTabella', alignment: 'right' },
                ...(conPrecedente ? [{ text: r.precedente, style: 'testaTabella', alignment: 'right' }] : []),
            ]
        }
        if (r.tipo === 'sezione' || r.tipo === 'gruppo') {
            return [
                { text: r.etichetta, style: r.tipo === 'sezione' ? 'sezioneTabella' : 'gruppoTabella', colSpan: conPrecedente ? 3 : 2 },
                {},
                ...(conPrecedente ? [{}] : []),
            ]
        }
        const forte = r.tipo === 'totale' || r.tipo === 'subtotale'
        return [
            { text: r.etichetta, bold: forte, margin: [r.tipo === 'posta' ? 10 : 0, 0, 0, 0] },
            { text: importoCH(r.attuale), alignment: 'right', bold: forte },
            ...(conPrecedente ? [{ text: r.precedente == null ? '–' : importoCH(r.precedente), alignment: 'right', bold: forte, color: '#555555' }] : []),
        ]
    })
    return {
        table: { headerRows: 1, widths: larghezze, body, dontBreakRows: true },
        style: 'tabella',
        layout: {
            hLineWidth: (i) => {
                if (i === 1) return 0.8
                const r = righe[i]
                if (!r) return i === righe.length ? 0.8 : 0
                if (r.tipo === 'totale' || r.tipo === 'subtotale') return 0.4
                return 0
            },
            vLineWidth: () => 0,
            hLineColor: () => '#888888',
            paddingTop: (i) => (righe[i]?.tipo === 'sezione' ? 8 : righe[i]?.tipo === 'gruppo' ? 5 : 2.5),
            paddingBottom: () => 2.5,
            paddingLeft: () => 2,
            paddingRight: () => 2,
        },
    }
}

/**
 * Il conto annuale come PDF (nel browser, con i caratteri del sito).
 * @param {object} p   vedi definizioneContoAnnuale
 * @returns {Promise<Blob>}
 */
export async function creaPdfContoAnnuale(p) {
    const definizione = definizioneContoAnnuale(p)
    return await Promise.race([
        new Promise((ok) => { pdfMake.createPdf(definizione, null, caratteri()).getBlob(ok) }),
        new Promise((_, ko) => setTimeout(() => ko(new Error('PDF')), 30000)),
    ])
}

/**
 * La definizione pdfmake del conto annuale, senza caratteri: separata per poterla provare fuori dal browser.
 * @param {object} p
 * @param {'it'|'de'|'fr'} p.lingua
 * @param {{ ditta: string, forma: string, sede: string, idi: string }} p.anagrafica
 * @param {string} p.tipoForma        forma giuridica riconosciuta (sa, sagl, ditta, ...)
 * @param {{ inizio: string, fine: string }} p.esercizio
 * @param {{ inizio: string, fine: string }|null} p.precedente
 * @param {object} p.calcolo           calcolaContoAnnuale(...)
 * @param {string|null} p.allegatoMd   allegato in Markdown (le note per la revisione restano fuori)
 * @param {boolean} p.senzaAllegato    impresa individuale o società di persone che non lo redige
 * @param {boolean} p.primoEsercizio
 * @param {Array<{ ruolo: string, nome: string }>} p.firme
 * @param {string} p.luogo
 * @param {string} p.data             ISO
 * @param {boolean} p.bozza
 * @param {object|null} p.impiego     impiegoUtile(...) se la proposta d'impiego dell'utile va nel documento
 * @returns {object}
 */
export function definizioneContoAnnuale(p) {
    const { lingua, anagrafica, tipoForma, esercizio, precedente, calcolo, allegatoMd, senzaAllegato, primoEsercizio, firme = [], luogo, data, bozza, impiego = null } = p
    const T = (k, v) => testoCO(lingua, k, v)
    const a = calcolo.attuale
    const prec = calcolo.precedente
    const conPrecedente = !!prec

    // ─── Bilancio ───
    const visibiliBil = new Set(calcolo.posteBilancioVisibili)
    const righeBil = [{
        tipo: 'testa',
        etichetta: '',
        attuale: dataCH(esercizio.fine),
        precedente: precedente ? dataCH(precedente.fine) : '',
    }]
    for (const s of STRUTTURA_BILANCIO) {
        righeBil.push({ tipo: 'sezione', etichetta: T(`sezioni.${s.sezione}`) })
        for (const g of s.gruppi) {
            const poste = g.poste.filter((x) => visibiliBil.has(x))
            if (!poste.length) continue
            righeBil.push({ tipo: 'gruppo', etichetta: T(`gruppi.${g.gruppo}`) })
            for (const x of poste) {
                righeBil.push({ tipo: 'posta', etichetta: etichettaPosta(lingua, x, tipoForma), attuale: a.bilancio[x], precedente: prec ? prec.bilancio[x] : null })
            }
            righeBil.push({ tipo: 'totale', etichetta: totaleDi(lingua, g.gruppo), attuale: a.gruppi[g.gruppo], precedente: prec ? prec.gruppi[g.gruppo] : null })
        }
        const totS = s.sezione === 'attivo' ? a.totaleAttivo : a.totalePassivo
        const totP = prec ? (s.sezione === 'attivo' ? prec.totaleAttivo : prec.totalePassivo) : null
        righeBil.push({ tipo: 'subtotale', etichetta: totaleDi(lingua, s.sezione), attuale: totS, precedente: totP })
    }

    // ─── Conto economico ───
    const visibiliCe = new Set(calcolo.posteCeVisibili)
    const etichettaPeriodo = (e) => (e ? etichettaEsercizio(e) : '')
    const righeCe = [{ tipo: 'testa', etichetta: '', attuale: etichettaPeriodo(esercizio), precedente: etichettaPeriodo(precedente) }]
    for (const r of STRUTTURA_CE) {
        if (r.posta) {
            if (!visibiliCe.has(r.posta)) continue
            righeCe.push({ tipo: 'posta', etichetta: etichettaPosta(lingua, r.posta, tipoForma), attuale: a.ce[r.posta], precedente: prec ? prec.ce[r.posta] : null })
        } else {
            righeCe.push({ tipo: 'subtotale', etichetta: T(`subtotali.${r.subtotale}`), attuale: a.subtotali[r.subtotale], precedente: prec ? prec.subtotali[r.subtotale] : null })
        }
    }

    // ─── Allegato ───
    const corpoAllegato = allegatoMd ? separaNote(allegatoMd).corpo : ''
    const blocchiAllegato = corpoAllegato ? blocchiDaMarkdown(corpoAllegato) : []

    // ─── Firme ───
    const ruoli = TESTI_CO[lingua]?.ruoli ?? TESTI_CO.it.ruoli
    const firmeValide = firme.filter((f) => f && (f.nome || f.ruolo))
    const blocchiFirme = firmeValide.map((f) => ({
        width: '*',
        stack: [
            { text: ' ', margin: [0, 26, 0, 0] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#444444' }] },
            { text: f.nome || ' ', bold: true, margin: [0, 4, 0, 0] },
            { text: ruoli[f.ruolo] ?? f.ruolo ?? '', fontSize: 9, color: '#555555' },
        ],
    }))

    const intestazioneSocieta = [anagrafica.forma, anagrafica.sede ? `${T('documento.sede')} ${anagrafica.sede}` : '', anagrafica.idi ? `${T('documento.idi')} ${anagrafica.idi}` : '']
        .filter(Boolean).join(' · ')

    const content = [
        { text: anagrafica.ditta || '', style: 'ditta' },
        intestazioneSocieta ? { text: intestazioneSocieta, style: 'datiSocieta' } : null,
        { text: T('documento.titolo'), style: 'titoloDocumento' },
        { text: T('documento.esercizio', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) }), style: 'sottotitolo' },
        { text: T('documento.importi'), style: 'nota' },
        !conPrecedente && primoEsercizio ? { text: T('documento.primo_esercizio'), style: 'nota' } : null,

        { text: T('documento.bilancio', { data: dataCH(esercizio.fine) }), style: 'titoloSezione' },
        tabella(righeBil, conPrecedente),

        { text: T('documento.conto_economico', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) }), style: 'titoloSezione', pageBreak: 'before' },
        { text: T('documento.metodo'), style: 'nota' },
        tabella(righeCe, conPrecedente),
    ].filter(Boolean)

    if (blocchiAllegato.length) {
        content.push({ text: T('documento.allegato'), style: 'titoloSezione', pageBreak: 'before' })
        content.push({ stack: contenuto(blocchiAllegato), style: 'testoAllegato' })
    } else if (senzaAllegato) {
        content.push({ text: T('documento.senza_allegato'), style: 'nota', margin: [0, 18, 0, 0] })
    }

    // ─── Proposta d'impiego dell'utile (art. 698 cpv. 2 n. 4 / 804 cpv. 2 n. 5 CO) ───
    if (impiego) {
        const forma = ['sa', 'sagl', 'cooperativa'].includes(tipoForma) ? tipoForma : 'altro'
        const perdita = impiego.utileBilancio < 0
        const riga = (etichetta, valore, forte = false) => [
            { text: etichetta, bold: forte },
            { text: importoCH(valore), alignment: 'right', bold: forte },
        ]
        const tabellaImpiego = (righe) => ({
            table: { widths: ['*', 100], body: righe, dontBreakRows: true },
            layout: {
                hLineWidth: (i) => (i > 0 && i < righe.length && righe[i]?.[0]?.bold ? 0.4 : 0),
                vLineWidth: () => 0,
                hLineColor: () => '#888888',
                paddingTop: () => 2.5, paddingBottom: () => 2.5, paddingLeft: () => 2, paddingRight: () => 2,
            },
        })
        const sopra = [
            riga(T(impiego.riportato < 0 ? 'impiego.riportato_perdita' : 'impiego.riportato_utile'), impiego.riportato),
            riga(T(impiego.esercizio < 0 ? 'impiego.esercizio_perdita' : 'impiego.esercizio_utile'), impiego.esercizio),
            riga(T(perdita ? 'impiego.bilancio_perdita' : 'impiego.bilancio_utile'), impiego.utileBilancio, true),
        ]
        if (impiego.prelievo > 0) {
            sopra.push(riga(T('impiego.prelievo'), impiego.prelievo))
            sopra.push(riga(T('impiego.disponibile'), r2(impiego.utileBilancio + impiego.prelievo), true))
        }
        const sotto = []
        if (impiego.riserva > 0) sotto.push(riga(T('impiego.riserva'), impiego.riserva))
        if (impiego.dividendo > 0) {
            const perc = impiego.percentualeDividendo != null ? Number(impiego.percentualeDividendo).toLocaleString('de-CH', { maximumFractionDigits: 2 }) : null
            sotto.push(riga(perc ? T('impiego.dividendo_perc', { perc }) : T('impiego.dividendo'), impiego.dividendo))
        }
        if (impiego.facoltative > 0) sotto.push(riga(T('impiego.facoltative'), impiego.facoltative))
        sotto.push(riga(T('impiego.riporto'), impiego.riporto, true))
        content.push({
            unbreakable: true,
            margin: [0, 12, 0, 0],
            stack: [
                { text: T(`impiego.${perdita ? 'titolo_perdita' : 'titolo'}.${forma}`), style: 'titoloSezione' },
                tabellaImpiego(sopra),
                { text: T(`impiego.${perdita ? 'intro_perdita' : 'intro'}.${forma}`), margin: [0, 12, 0, 6] },
                tabellaImpiego(sotto),
            ],
        })
    }

    content.push({
        unbreakable: true,
        stack: [
            { text: T('documento.firme'), style: 'titoloSezione' },
            { text: `${T('documento.luogo_data')}: ${[luogo, data ? dataCH(data) : ''].filter(Boolean).join(', ')}`, margin: [0, 0, 0, 6] },
            blocchiFirme.length ? { columns: blocchiFirme, columnGap: 36 } : { text: ' ' },
        ],
        margin: [0, 24, 0, 0],
    })

    const piede = `${anagrafica.ditta || ''} · ${T('documento.titolo')} ${etichettaEsercizio(esercizio)}`
    const definizione = {
        pageSize: 'A4',
        pageMargins: [60, 56, 60, 60],
        info: { title: `${T('documento.titolo')} ${etichettaEsercizio(esercizio)} – ${anagrafica.ditta || ''}`, author: anagrafica.ditta || '' },
        ...(bozza ? { watermark: { text: T('documento.bozza'), color: '#9a9a9a', opacity: 0.12, bold: true, fontSize: 90 } } : {}),
        content,
        footer: (pagina, pagine) => ({
            columns: [
                { text: piede, fontSize: 8, color: '#777777' },
                { text: T('documento.pagina', { n: pagina, tot: pagine }), fontSize: 8, color: '#777777', alignment: 'right' },
            ],
            margin: [60, 24, 60, 0],
        }),
        defaultStyle: { font: 'Outfit', fontSize: 9.5, lineHeight: 1.15, color: '#1a1a1a' },
        styles: {
            ditta: { font: 'Cormorant', fontSize: 20, bold: true, margin: [0, 0, 0, 2] },
            datiSocieta: { fontSize: 9, color: '#444444', margin: [0, 0, 0, 22] },
            titoloDocumento: { font: 'Cormorant', fontSize: 26, bold: true, margin: [0, 0, 0, 2] },
            sottotitolo: { font: 'Cormorant', fontSize: 13, margin: [0, 0, 0, 4] },
            nota: { fontSize: 8.5, color: '#555555', margin: [0, 0, 0, 4] },
            titoloSezione: { font: 'Cormorant', fontSize: 16, bold: true, margin: [0, 18, 0, 6] },
            tabella: { margin: [0, 4, 0, 0] },
            testaTabella: { bold: true, fontSize: 8.5, color: '#333333' },
            sezioneTabella: { bold: true, fontSize: 10.5 },
            gruppoTabella: { bold: true, fontSize: 9.5, color: '#333333' },
            testoAllegato: { font: 'Cormorant', fontSize: 11.5, lineHeight: 1.2 },
            // gli stili dei blocchi dell'allegato (come i documenti di Lex)
            paragrafo: { alignment: 'justify', margin: [0, 0, 0, 7] },
            titolo1: { fontSize: 14, bold: true, margin: [0, 6, 0, 8] },
            titolo2: { fontSize: 12.5, bold: true, margin: [0, 9, 0, 4] },
            titolo3: { fontSize: 11.5, bold: true, italics: true, margin: [0, 6, 0, 3] },
            citazione: { italics: true, margin: [20, 0, 0, 7] },
        },
    }
    return definizione
}

// Il testo del conto annuale per l'archivio (ricerca e Lex): titolo, numeri principali e allegato
export function testoPerArchivio({ lingua, anagrafica, esercizio, calcolo, allegatoMd, tipoForma, impiego = null }) {
    const T = (k, v) => testoCO(lingua, k, v)
    const a = calcolo.attuale
    const righe = [
        `${anagrafica.ditta} — ${T('documento.titolo')} ${etichettaEsercizio(esercizio)}`,
        T('documento.esercizio', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) }),
        '',
        T('documento.bilancio', { data: dataCH(esercizio.fine) }),
        ...calcolo.posteBilancioVisibili.map((x) => `${etichettaPosta(lingua, x, tipoForma)}: CHF ${importoCH(a.bilancio[x])}`),
        `${totaleDi(lingua, 'attivo')}: CHF ${importoCH(a.totaleAttivo)}`,
        '',
        T('documento.conto_economico', { inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) }),
        ...calcolo.posteCeVisibili.map((x) => `${etichettaPosta(lingua, x, tipoForma)}: CHF ${importoCH(a.ce[x])}`),
        `${T('subtotali.risultato_esercizio')}: CHF ${importoCH(a.risultato)}`,
    ]
    if (allegatoMd) righe.push('', T('documento.allegato'), separaNote(allegatoMd).corpo)
    if (impiego) {
        const forma = ['sa', 'sagl', 'cooperativa'].includes(tipoForma) ? tipoForma : 'altro'
        const perdita = impiego.utileBilancio < 0
        righe.push('', T(`impiego.${perdita ? 'titolo_perdita' : 'titolo'}.${forma}`),
            `${T(perdita ? 'impiego.bilancio_perdita' : 'impiego.bilancio_utile')}: CHF ${importoCH(impiego.utileBilancio)}`,
            ...(impiego.riserva > 0 ? [`${T('impiego.riserva')}: CHF ${importoCH(impiego.riserva)}`] : []),
            ...(impiego.dividendo > 0 ? [`${T('impiego.dividendo')}: CHF ${importoCH(impiego.dividendo)}`] : []),
            ...(impiego.facoltative > 0 ? [`${T('impiego.facoltative')}: CHF ${importoCH(impiego.facoltative)}`] : []),
            `${T('impiego.riporto')}: CHF ${importoCH(impiego.riporto)}`)
    }
    return righe.join('\n')
}
