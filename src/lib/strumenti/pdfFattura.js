// src/lib/strumenti/pdfFattura.js
//
// 03-11-2026: il PDF dello strumento gratuito, con la sezione di pagamento della QR-fattura. Stessa impaginazione
// della funzione genera-fattura-pdf del gestionale, ma nel browser. jsPDF perché ha Helvetica di serie, uno dei
// caratteri ammessi dalla norma SIX; il modulo si carica solo al clic.

import { jsPDF } from 'jspdf'
import { formattaIban } from '@/lib/fatturazione'
import { formattaRiferimento, matriceQr } from './qrFattura'
import { scaricaBlob } from './scarica'

// Testi del documento nelle tre lingue
export const T = {
    it: {
        fattura: 'FATTURA', data: 'Data', scadenza: 'Scadenza', destinatario: 'DESTINATARIO',
        descrizione: 'Descrizione', qta: 'Qt.', prezzo: 'Prezzo', totaleRiga: 'Totale',
        imponibile: 'Imponibile', iva: 'IVA', totale: 'Totale',
        nonAssoggettato: "Non assoggettato all'IVA", note: 'Note',
        idi: 'IDI', numeroIva: 'N. IVA', suffissoIva: 'IVA',
        footer: 'Creato con Lexum, www.lexum.ch', pagina: 'Pagina', di: 'di',
        ricevuta: 'Ricevuta', sezionePagamento: 'Sezione pagamento', conto: 'Conto / Pagabile a',
        riferimento: 'Riferimento', infoSuppl: 'Informazioni supplementari', pagabileDa: 'Pagabile da',
        pagabileDaVuoto: 'Pagabile da (nome/indirizzo)', valuta: 'Valuta', importo: 'Importo',
        accettazione: 'Punto di accettazione', staccare: 'Da staccare prima del versamento',
        comunicazione: 'Fattura', periodo: 'Data o periodo della prestazione',
    },
    de: {
        fattura: 'RECHNUNG', data: 'Datum', scadenza: 'Fällig am', destinatario: 'EMPFÄNGER',
        descrizione: 'Beschreibung', qta: 'Menge', prezzo: 'Preis', totaleRiga: 'Total',
        imponibile: 'Nettobetrag', iva: 'MWST', totale: 'Total',
        nonAssoggettato: 'Nicht mehrwertsteuerpflichtig', note: 'Bemerkungen',
        idi: 'UID', numeroIva: 'MWST-Nr.', suffissoIva: 'MWST',
        footer: 'Erstellt mit Lexum, www.lexum.ch', pagina: 'Seite', di: 'von',
        ricevuta: 'Empfangsschein', sezionePagamento: 'Zahlteil', conto: 'Konto / Zahlbar an',
        riferimento: 'Referenz', infoSuppl: 'Zusätzliche Informationen', pagabileDa: 'Zahlbar durch',
        pagabileDaVuoto: 'Zahlbar durch (Name/Adresse)', valuta: 'Währung', importo: 'Betrag',
        accettazione: 'Annahmestelle', staccare: 'Vor der Einzahlung abzutrennen',
        comunicazione: 'Rechnung', periodo: 'Datum oder Zeitraum der Leistung',
    },
    fr: {
        fattura: 'FACTURE', data: 'Date', scadenza: 'Échéance', destinatario: 'DESTINATAIRE',
        descrizione: 'Description', qta: 'Qté', prezzo: 'Prix', totaleRiga: 'Total',
        imponibile: 'Montant net', iva: 'TVA', totale: 'Total',
        nonAssoggettato: 'Non assujetti à la TVA', note: 'Remarques',
        idi: 'IDE', numeroIva: 'N° TVA', suffissoIva: 'TVA',
        footer: 'Créé avec Lexum, www.lexum.ch', pagina: 'Page', di: 'sur',
        ricevuta: 'Récépissé', sezionePagamento: 'Section paiement', conto: 'Compte / Payable à',
        riferimento: 'Référence', infoSuppl: 'Informations supplémentaires', pagabileDa: 'Payable par',
        pagabileDaVuoto: 'Payable par (nom/adresse)', valuta: 'Monnaie', importo: 'Montant',
        accettazione: 'Point de dépôt', staccare: 'A détacher avant le versement',
        comunicazione: 'Facture', periodo: 'Date ou période de la prestation',
    },
}

// Importi in formato svizzero: 1'234.50 (apostrofo ASCII: Helvetica non ha lo spazio stretto francese)
export function fmtNum(n) {
    const v = Math.round(Number(n ?? 0) * 100) / 100
    const [int, dec] = Math.abs(v).toFixed(2).split('.')
    return `${v < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${dec}`
}
const fmtImporto = (n, valuta) => `${fmtNum(n)} ${valuta}`
// Importo nella sezione di pagamento: spazio come separatore delle migliaia
const fmtImportoQR = (n) => {
    const [int, dec] = Number(n).toFixed(2).split('.')
    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec}`
}
export function fmtData(iso, lingua) {
    if (!iso) return ''
    const [a, m, g] = iso.split('-')
    return lingua === 'fr' ? `${g}/${m}/${a}` : `${g}.${m}.${a}`
}

function righeStampate(a) {
    const via = [a.via, a.civico].filter(Boolean).join(' ')
    const loc = [a.npa, a.localita].filter(Boolean).join(' ') + (a.paese && a.paese !== 'CH' ? ` (${a.paese})` : '')
    return [a.nome, via, loc].filter((s) => s && s.trim())
}

function misuraImmagine(src) {
    return new Promise((ok) => {
        const img = new Image()
        img.onload = () => ok({ w: img.width, h: img.height })
        img.onerror = () => ok(null)
        img.src = src
    })
}

// Il QR (46 mm, disegnato in vettoriale) con la croce svizzera al centro
function disegnaQR(doc, payload, x, y, size) {
    const { n, scuro } = matriceQr(payload)
    const cell = size / n
    doc.setFillColor(0, 0, 0)
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (scuro(r, c)) doc.rect(x + c * cell, y + r * cell, cell, cell, 'F')
        }
    }
    // Croce svizzera 7 x 7 mm: bordo bianco, quadrato nero, croce bianca
    const k = size / 46
    const esterno = 7 * k
    const interno = 6 * k
    const cx = x + size / 2
    const cy = y + size / 2
    doc.setFillColor(255, 255, 255)
    doc.rect(cx - esterno / 2, cy - esterno / 2, esterno, esterno, 'F')
    doc.setFillColor(0, 0, 0)
    doc.rect(cx - interno / 2, cy - interno / 2, interno, interno, 'F')
    const braccio = interno * 0.19
    const lunghezza = interno * 0.62
    doc.setFillColor(255, 255, 255)
    doc.rect(cx - braccio / 2, cy - lunghezza / 2, braccio, lunghezza, 'F')
    doc.rect(cx - lunghezza / 2, cy - braccio / 2, lunghezza, braccio, 'F')
}

// d: { lingua, logo, emittente: { nome, via, civico, npa, localita, paese, uid, ivaAttiva, email, telefono },
//      cliente: { nome, via, civico, npa, localita, paese, email }, numero, data, scadenza, periodo, valuta,
//      righe: [{descrizione, quantita, prezzo_unitario, totale}], aliquota, imponibile, ivaImporto, totale, note, qr, avvertenza, nomeFile }
export async function scaricaPdfFattura(d) {
    const t = T[d.lingua] ?? T.it
    const valuta = d.valuta
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    const W = 210, H = 297, M = 15
    let y = M

    // ─── Intestazione: chi emette ───
    if (d.logo) {
        const dim = await misuraImmagine(d.logo)
        if (dim) {
            const scala = Math.min(55 / dim.w, 18 / dim.h)
            doc.addImage(d.logo, 'PNG', M, y, dim.w * scala, dim.h * scala)
            y += dim.h * scala + 4
        }
    }
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(doc.splitTextToSize(d.emittente.nome, W - 2 * M - 72)[0], M, y + 4)
    y += 9
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    const indirizzoEm = [
        [d.emittente.via, d.emittente.civico].filter(Boolean).join(' '),
        [d.emittente.npa, d.emittente.localita].filter(Boolean).join(' ') + (d.emittente.paese && d.emittente.paese !== 'CH' ? ` (${d.emittente.paese})` : ''),
    ].filter((s) => s && s.trim()).join(', ')
    if (indirizzoEm) { doc.text(indirizzoEm, M, y); y += 4 }
    if (d.emittente.uid) {
        doc.text(d.emittente.ivaAttiva ? `${t.numeroIva} ${d.emittente.uid} ${t.suffissoIva}` : `${t.idi}: ${d.emittente.uid}`, M, y)
        y += 4
    }
    const contatti = [d.emittente.email, d.emittente.telefono].filter(Boolean).join(' · ')
    if (contatti) { doc.text(contatti, M, y); y += 4 }

    // ─── Box documento a destra ───
    doc.setTextColor(0)
    doc.setDrawColor(180)
    doc.setLineWidth(0.3)
    doc.rect(W - M - 65, M, 65, 28)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(t.fattura, W - M - 60, M + 6)
    doc.setFontSize(14)
    doc.text(String(d.numero || '-'), W - M - 60, M + 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    doc.text(`${t.data}: ${fmtData(d.data, d.lingua)}`, W - M - 60, M + 19)
    if (d.scadenza) doc.text(`${t.scadenza}: ${fmtData(d.scadenza, d.lingua)}`, W - M - 60, M + 24)

    y = Math.max(y, M + 32) + 5

    // ─── Destinatario ───
    doc.setTextColor(0)
    doc.setFillColor(245, 245, 245)
    doc.rect(M, y, W - 2 * M, 22, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(t.destinatario, M + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(d.cliente.nome, M + 3, y + 11)
    doc.setFontSize(8)
    doc.setTextColor(80)
    const indirizzoCl = [
        [d.cliente.via, d.cliente.civico].filter(Boolean).join(' '),
        [d.cliente.npa, d.cliente.localita].filter(Boolean).join(' ') + (d.cliente.paese && d.cliente.paese !== 'CH' ? ` (${d.cliente.paese})` : ''),
    ].filter((s) => s && s.trim()).join(', ')
    if (indirizzoCl) doc.text(indirizzoCl, M + 3, y + 16)
    if (d.cliente.email) doc.text(d.cliente.email, M + 3, y + 20)
    y += 28

    // ─── Data o periodo della prestazione (art. 26 cpv. 2 LIVA) ───
    if (d.periodo) {
        doc.setTextColor(0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        const etichetta = `${t.periodo}:`
        doc.text(etichetta, M, y)
        const xPeriodo = M + doc.getTextWidth(etichetta) + 2
        doc.setFont('helvetica', 'normal')
        const linee = doc.splitTextToSize(d.periodo, W - M - xPeriodo)
        doc.text(linee, xPeriodo, y)
        y += linee.length * 4 + 3
    }

    // ─── Tabella righe ───
    const colDescrX = M
    const colQtaX = W - M - 80
    const colPrzX = W - M - 55
    const colTotX = W - M - 25
    doc.setTextColor(244, 247, 248)
    doc.setFillColor(11, 31, 42)
    doc.rect(M, y, W - 2 * M, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t.descrizione, colDescrX + 2, y + 5)
    doc.text(t.qta, colQtaX + 2, y + 5)
    doc.text(t.prezzo, colPrzX + 2, y + 5)
    doc.text(t.totaleRiga, colTotX + 2, y + 5)
    y += 9

    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const r of d.righe) {
        const linee = doc.splitTextToSize(r.descrizione, colQtaX - colDescrX - 5)
        const altezza = Math.max(linee.length * 4 + 2, 6)
        if (y + altezza > H - 30) { doc.addPage(); y = M }
        doc.text(linee, colDescrX + 2, y + 4)
        doc.text(Number(r.quantita).toFixed(2), colQtaX + 2, y + 4)
        doc.text(fmtNum(r.prezzo_unitario), colPrzX + 2, y + 4)
        doc.text(fmtNum(r.totale), colTotX + 2, y + 4)
        y += altezza
        doc.setDrawColor(220)
        doc.line(M, y, W - M, y)
        y += 2
    }

    // ─── Totali ───
    y += 3
    if (y > H - 45) { doc.addPage(); y = M }
    const labelX = W - M - 80
    const valX = W - M
    const rigaTotale = (etichetta, valore, grassetto = false) => {
        doc.setFont('helvetica', grassetto ? 'bold' : 'normal')
        doc.text(etichetta, labelX, y)
        if (valore) doc.text(valore, valX, y, { align: 'right' })
        y += 5
    }
    doc.setFontSize(9)
    doc.setTextColor(80)
    rigaTotale(t.imponibile, fmtImporto(d.imponibile, valuta))
    if (d.emittente.ivaAttiva) rigaTotale(`${t.iva} ${Number(d.aliquota)}%`, fmtImporto(d.ivaImporto, valuta))
    else rigaTotale(t.nonAssoggettato, '')
    doc.setDrawColor(150)
    doc.line(labelX, y, valX, y)
    y += 4
    doc.setTextColor(0)
    doc.setFontSize(11)
    rigaTotale(t.totale, fmtImporto(d.totale, valuta), true)
    y += 4

    // ─── Note ───
    if (d.note) {
        if (y > H - 30) { doc.addPage(); y = M }
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text(`${t.note}:`, M, y)
        y += 4
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80)
        const linee = doc.splitTextToSize(d.note, W - 2 * M)
        doc.text(linee, M, y)
        y += linee.length * 4 + 3
    }

    // ─── QR-fattura: ricevuta + sezione pagamento (105 mm in fondo alla pagina) ───
    const altezzaQR = 105
    const yQR = H - altezzaQR
    const q = d.qr
    if (q) {
        // La sezione di pagamento vuole la parte bassa della pagina libera
        if (y > yQR - 12) { doc.addPage(); y = M }

        doc.setDrawColor(0)
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([1.5, 1], 0)
        doc.line(0, yQR, W, yQR)
        doc.line(62, yQR, 62, H)
        doc.setLineDashPattern([], 0)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120)
        doc.text(t.staccare, W / 2, yQR - 1.5, { align: 'center' })

        doc.setTextColor(0)
        const intestazione = (testo, x, yy, size) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size); doc.text(testo, x, yy) }
        const valore = (testo, x, yy, size) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.text(testo, x, yy) }
        const contoRighe = [formattaIban(q.iban), ...righeStampate(q.creditore)]

        // Ricevuta (0-62 mm)
        let ry = yQR + 8
        intestazione(t.ricevuta, 5, ry, 11)
        ry += 7
        intestazione(t.conto, 5, ry, 6); ry += 3.2
        for (const l of contoRighe) { valore(doc.splitTextToSize(l, 52)[0], 5, ry, 8); ry += 3.5 }
        ry += 1.5
        intestazione(t.riferimento, 5, ry, 6); ry += 3.2
        valore(formattaRiferimento(q.tipoRif, q.riferimento), 5, ry, 8); ry += 5
        if (q.debitore) {
            intestazione(t.pagabileDa, 5, ry, 6); ry += 3.2
            for (const l of righeStampate(q.debitore)) { valore(doc.splitTextToSize(l, 52)[0], 5, ry, 8); ry += 3.5 }
        } else {
            intestazione(t.pagabileDaVuoto, 5, ry, 6); ry += 1.5
            doc.setDrawColor(0); doc.setLineWidth(0.2)
            doc.rect(5, ry, 52, 20)
        }
        const yImporto = yQR + 68
        intestazione(t.valuta, 5, yImporto, 6)
        intestazione(t.importo, 22, yImporto, 6)
        valore(q.valuta, 5, yImporto + 4, 8)
        valore(fmtImportoQR(q.importo), 22, yImporto + 4, 8)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6)
        doc.text(t.accettazione, 57, yQR + 82, { align: 'right' })

        // Sezione pagamento (62-210 mm)
        intestazione(t.sezionePagamento, 67, yQR + 8, 11)
        disegnaQR(doc, q.payload, 67, yQR + 17, 46)
        intestazione(t.valuta, 67, yImporto, 8)
        intestazione(t.importo, 87, yImporto, 8)
        valore(q.valuta, 67, yImporto + 5, 10)
        valore(fmtImportoQR(q.importo), 87, yImporto + 5, 10)

        let py = yQR + 8
        const px = 118
        intestazione(t.conto, px, py, 8); py += 4
        for (const l of contoRighe) { valore(doc.splitTextToSize(l, 87)[0], px, py, 10); py += 4.2 }
        py += 1.5
        intestazione(t.riferimento, px, py, 8); py += 4
        valore(formattaRiferimento(q.tipoRif, q.riferimento), px, py, 10); py += 5.5
        if (q.comunicazione) {
            intestazione(t.infoSuppl, px, py, 8); py += 4
            valore(doc.splitTextToSize(q.comunicazione, 87)[0], px, py, 10); py += 5.5
        }
        if (q.debitore) {
            intestazione(t.pagabileDa, px, py, 8); py += 4
            for (const l of righeStampate(q.debitore)) { valore(doc.splitTextToSize(l, 87)[0], px, py, 10); py += 4.2 }
        } else {
            intestazione(t.pagabileDaVuoto, px, py, 8); py += 1.5
            doc.setDrawColor(0); doc.setLineWidth(0.2)
            doc.rect(px, py, 65, 25)
        }
    }

    // ─── Piè di pagina su ogni pagina (sopra la sezione di pagamento) ───
    const pagine = doc.getNumberOfPages()
    for (let i = 1; i <= pagine; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150)
        const yPiede = i === pagine && q ? H - altezzaQR - 6 : H - 8
        doc.text(t.footer, M, yPiede)
        doc.text(`${t.pagina} ${i} ${t.di} ${pagine}`, W - M, yPiede, { align: 'right' })
    }

    scaricaBlob(doc.output('blob'), d.nomeFile)
}
