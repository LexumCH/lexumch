// src/lib/strumenti/qrFattura.js
//
// 03-11-2026: la QR-fattura dello strumento gratuito /:lang/strumenti/...: i controlli e il codice QR
// (Swiss Payment Code 0200, indirizzi strutturati S, Implementation Guidelines SIX 2.3). È la stessa
// logica della funzione genera-fattura-pdf del gestionale, nel browser: i dati non passano dai server.

import qrcode from 'qrcode-generator'
import { ibanSvizzero, isQrIban, pulisciIban } from '@/lib/fatturazione'

// I caratteri ammessi nel codice QR (latino di base, Latin-1, Latin Extended-A e pochi altri)
export function testoQr(testo, max) {
    return String(testo ?? '')
        .normalize('NFC')
        .replace(/[‘’‚‛′]/g, "'")
        .replace(/[“”„‟″]/g, '"')
        .replace(/[‐-―−]/g, '-')
        .replace(/…/g, '...')
        .replace(/[  -​  　]/g, ' ')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/[^\x20-\x7E\xA0-ſȘ-ț€]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
        .trim()
}

function modulo97(s) {
    let resto = 0
    for (const ch of s) {
        const cifre = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch
        for (const d of cifre) resto = (resto * 10 + Number(d)) % 97
    }
    return resto
}

// Riferimento QR: 26 cifre + cifra di controllo (modulo 10 ricorsivo)
export function riferimentoQR(base) {
    const cifre = String(base).replace(/\D/g, '').slice(-26).padStart(26, '0')
    const tabella = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
    let riporto = 0
    for (const c of cifre) riporto = tabella[(riporto + Number(c)) % 10]
    return cifre + String((10 - riporto) % 10)
}

// Riferimento creditore ISO 11649: RF + 2 cifre di controllo + max 21 caratteri
export function riferimentoRF(base) {
    const ref = String(base).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 21) || '0'
    const controllo = 98 - modulo97(`${ref}RF00`)
    return `RF${String(controllo).padStart(2, '0')}${ref}`
}

export function formattaRiferimento(tipo, ref) {
    if (tipo === 'QRR') return `${ref.slice(0, 2)} ${(ref.slice(2).match(/.{1,5}/g) ?? []).join(' ')}`
    if (tipo === 'SCOR') return (ref.match(/.{1,4}/g) ?? []).join(' ')
    return ref
}

// Indirizzo strutturato: { nome, via, civico, npa, localita, paese }
function righeIndirizzo(a) {
    if (!a) return ['', '', '', '', '', '', '']
    return [
        'S',
        testoQr(a.nome, 70),
        testoQr(a.via, 70),
        testoQr(a.civico, 16),
        testoQr(a.npa, 16),
        testoQr(a.localita, 35),
        a.paese,
    ]
}

function indirizzoCompleto(a) {
    return !!(a?.nome?.trim() && a?.npa?.trim() && a?.localita?.trim() && /^[A-Z]{2}$/.test(a?.paese ?? ''))
}

// Tutto quello che serve alla sezione di pagamento, o null se i dati non bastano.
// comunicazione: «Fattura 12» nella lingua del documento
export function datiQr({ iban, creditore, debitore, importo, valuta, numero, anno, comunicazione }) {
    const conto = pulisciIban(iban)
    const totale = Math.round(Number(importo) * 100) / 100
    if (!ibanSvizzero(conto) || !indirizzoCompleto(creditore)) return null
    if (!(totale > 0) || totale > 999999999.99) return null
    const usaQrr = isQrIban(conto)
    const tipoRif = usaQrr ? 'QRR' : 'SCOR'
    const riferimento = usaQrr ? riferimentoQR(`${anno ?? ''}${numero ?? ''}`) : riferimentoRF(numero ?? '')
    const debitoreOk = indirizzoCompleto(debitore) ? debitore : null
    const messaggio = testoQr(comunicazione, 140)
    const payload = [
        'SPC', '0200', '1',
        conto,
        ...righeIndirizzo(creditore),
        '', '', '', '', '', '', '',                 // creditore finale: riservato, vuoto
        totale.toFixed(2),
        valuta,
        ...righeIndirizzo(debitoreOk),
        tipoRif,
        riferimento,
        messaggio,
        'EPD',
    ].join('\r\n')
    return { iban: conto, creditore, debitore: debitoreOk, importo: totale, valuta, tipoRif, riferimento, comunicazione: messaggio, payload }
}

// La matrice del codice QR (correzione M), con i byte UTF-8 del testo
export function matriceQr(payload) {
    const qr = qrcode(0, 'M')
    let binario = ''
    for (const b of new TextEncoder().encode(payload)) binario += String.fromCharCode(b)
    qr.addData(binario, 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    return { n, scuro: (r, c) => qr.isDark(r, c) }
}
