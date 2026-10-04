// src/lib/fatturazione.js — Lexum CH
//
// Regole comuni della fatturazione svizzera (04-10-2026): conti per la
// QR-fattura (IBAN e QR-IBAN), numero IDI / IVA, cantoni, lettura degli errori
// delle funzioni. Gli stessi controlli stanno in genera-fattura-pdf.

export const CANTONI = ['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH']

// Aliquote IVA dal 2024: normale, ridotta, settore alberghiero
export const ALIQUOTE_IVA = [8.1, 2.6, 3.8]

export function pulisciIban(iban) {
    return String(iban ?? '').replace(/\s+/g, '').toUpperCase()
}

export function formattaIban(iban) {
    return pulisciIban(iban).replace(/(.{4})/g, '$1 ').trim()
}

// Cifre di controllo (modulo 97), per un IBAN di qualunque paese
export function ibanValido(iban) {
    const s = pulisciIban(iban)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(s)) return false
    const riordinato = s.slice(4) + s.slice(0, 4)
    let resto = 0
    for (const ch of riordinato) {
        const cifre = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch
        for (const d of cifre) resto = (resto * 10 + Number(d)) % 97
    }
    return resto === 1
}

// La QR-fattura accetta solo conti svizzeri o del Liechtenstein (21 caratteri)
export function ibanSvizzero(iban) {
    const s = pulisciIban(iban)
    return /^(CH|LI)[0-9]{7}[0-9A-Z]{12}$/.test(s) && ibanValido(s)
}

// QR-IBAN: identificativo della banca (posizioni 5-9) tra 30000 e 31999.
// Si usa solo con il riferimento QR: per i bonifici normali serve l'IBAN.
export function isQrIban(iban) {
    const s = pulisciIban(iban)
    if (!/^(CH|LI)[0-9]{7}/.test(s)) return false
    const iid = Number(s.slice(4, 9))
    return iid >= 30000 && iid <= 31999
}

// Numero IDI (UID): CHE-123.456.789, l'ultima cifra e' di controllo (modulo 11).
// Torna il numero nella forma ufficiale, senza il suffisso IVA/MWST/TVA (lo
// aggiunge il PDF), oppure null se non e' valido.
export function normalizzaUid(valore) {
    const s = String(valore ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/(MWST|TVA|IVA|VAT)$/, '')
    const m = /^CHE([0-9]{9})$/.exec(s)
    if (!m) return null
    const d = m[1].split('').map(Number)
    const somma = [5, 4, 3, 2, 7, 6, 5, 4].reduce((tot, peso, i) => tot + peso * d[i], 0)
    const controllo = (11 - (somma % 11)) % 11
    if (controllo === 10 || controllo !== d[8]) return null
    return `CHE-${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6)}`
}

// Cosa manca a chi emette perche' la fattura esca con la QR-fattura
export function mancanzeQr(emittente) {
    const e = emittente ?? {}
    const mancano = []
    if (!e.indirizzo) mancano.push('indirizzo')
    if (!e.cap) mancano.push('cap')
    if (!e.citta) mancano.push('citta')
    if (!ibanSvizzero(e.iban) && !ibanSvizzero(e.qr_iban)) mancano.push('iban')
    return mancano
}

// supabase.functions.invoke: con una risposta non 2xx l'errore ha un messaggio
// generico, il testo vero sta nel corpo della risposta.
export async function messaggioErroreFunzione(error, data, predefinito = 'Errore') {
    if (data?.error) return data.error
    try {
        const corpo = await error?.context?.json?.()
        if (corpo?.error) return corpo.error
    } catch { /* corpo non JSON */ }
    return error?.message ?? predefinito
}

// Come sopra, ma con il codice (es. GIA_EMESSA) per tradurre il messaggio
export async function erroreFunzione(error, data) {
    if (data && data.ok === false) return { codice: data.code ?? null, messaggio: data.error ?? null }
    try {
        const corpo = await error?.context?.json?.()
        if (corpo) return { codice: corpo.code ?? null, messaggio: corpo.error ?? null }
    } catch { /* corpo non JSON */ }
    return { codice: null, messaggio: error?.message ?? null }
}
