// src/lib/documento/firmePdf.js
//
// 10-10-2026: le firme elettroniche dentro un PDF, per la versione firmata del conto annuale (facoltativa: «se c'è
// si mette, se no no», decisione dell'utente). Un PDF firmato (PAdES o PKCS#7) ha un dizionario di firma con
// /ByteRange [a b c d]: i byte firmati sono a..a+b e c..c+d, in mezzo c'è la firma (/Contents). Qui si legge chi
// ha firmato e quando (/Name, /M; se /Name manca, il nome del certificato) e si guarda se il file firmato comincia
// esattamente con il PDF definitivo di Lexum (le firme si aggiungono in coda, «incrementali»).
// Lexum NON verifica la validità crittografica né se la firma è qualificata (art. 14 cpv. 2bis CO): per quello c'è
// il validatore della Confederazione, https://www.validator.admin.ch.

// I byte come testo (latin1), a pezzi per non superare i limiti degli argomenti
function comeTesto(byte) {
    let s = ''
    const passo = 0x8000
    for (let i = 0; i < byte.length; i += passo) s += String.fromCharCode.apply(null, byte.subarray(i, i + passo))
    return s
}

// Testo di una stringa PDF: UTF-16BE se comincia con FE FF, altrimenti latin1
function decodifica(grezzo) {
    if (grezzo.charCodeAt(0) === 0xfe && grezzo.charCodeAt(1) === 0xff) {
        let out = ''
        for (let i = 2; i + 1 < grezzo.length; i += 2) out += String.fromCharCode((grezzo.charCodeAt(i) << 8) | grezzo.charCodeAt(i + 1))
        return out
    }
    return grezzo
}

// Una stringa letterale PDF che comincia con «(» in posizione `i`: parentesi annidate e sequenze di escape
function stringaLetterale(s, i) {
    let livello = 0
    let out = ''
    for (let k = i; k < s.length; k++) {
        const ch = s[k]
        if (ch === '\\') {
            const dopo = s[k + 1]
            const mappa = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }
            if (dopo in mappa) { out += mappa[dopo]; k++; continue }
            const ottale = s.slice(k + 1, k + 4).match(/^[0-7]{1,3}/)
            if (ottale) { out += String.fromCharCode(parseInt(ottale[0], 8)); k += ottale[0].length; continue }
            if (dopo === '\r' || dopo === '\n') { k++; continue }
            continue
        }
        if (ch === '(') { livello++; if (livello === 1) continue }
        if (ch === ')') { livello--; if (livello === 0) return out }
        out += ch
    }
    return out
}

// Il valore testuale di una chiave nel dizionario (/Name (Maria Rossi) oppure /Name <FEFF...>)
function leggiChiave(diz, chiave) {
    const m = new RegExp(`${chiave.replace('/', '\\/')}\\s*([(<])`).exec(diz)
    if (!m) return null
    const inizio = m.index + m[0].length - 1
    if (m[1] === '(') return decodifica(stringaLetterale(diz, inizio)).trim() || null
    const fine = diz.indexOf('>', inizio)
    const hex = diz.slice(inizio + 1, fine).replace(/\s+/g, '')
    let grezzo = ''
    for (let i = 0; i + 1 < hex.length; i += 2) grezzo += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
    return decodifica(grezzo).trim() || null
}

// «D:20270315143000+01'00'» → «2027-03-15»
function dataPdf(valore) {
    const m = String(valore ?? '').match(/D:(\d{4})(\d{2})?(\d{2})?/)
    return m ? `${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}` : null
}

// I nomi (CN, OID 2.5.4.3) nei certificati dentro la firma; il primo che non sembra un'autorità di certificazione
function nomeDalCertificato(byte) {
    const nomi = []
    for (let i = 0; i + 6 < byte.length; i++) {
        if (byte[i] === 0x06 && byte[i + 1] === 0x03 && byte[i + 2] === 0x55 && byte[i + 3] === 0x04 && byte[i + 4] === 0x03) {
            const tipo = byte[i + 5]
            const lunghezza = byte[i + 6]
            if (![0x0c, 0x13, 0x14, 0x1e].includes(tipo) || lunghezza > 120) continue
            const valore = byte.subarray(i + 7, i + 7 + lunghezza)
            let testo = ''
            if (tipo === 0x1e) for (let k = 0; k + 1 < valore.length; k += 2) testo += String.fromCharCode((valore[k] << 8) | valore[k + 1])
            else testo = new TextDecoder(tipo === 0x0c ? 'utf-8' : 'latin1').decode(valore)
            nomi.push(testo)
        }
    }
    const autorita = /\b(CA|Root|Authority|Certification|Trust|TSA|Time\s*-?\s*Stamp(ing)?|Issuing|Intermediate|Qualified)\b/i
    return nomi.find((n) => !autorita.test(n)) ?? null
}

/**
 * Le firme di un PDF.
 * @param {Uint8Array} byte
 * @returns {{ firme: Array<{ nome: string|null, data: string|null, formato: string|null, motivo: string|null, luogo: string|null, copreTutto: boolean }>, marche: number }}
 */
export function analizzaFirmePdf(byte) {
    const s = comeTesto(byte)
    const firme = []
    let marche = 0
    const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g
    let m
    while ((m = re.exec(s))) {
        const [, , b, c, d] = m.map(Number)
        if (!(b > 0 && c > b && c <= s.length)) continue
        // Il dizionario della firma sta intorno al /Contents (dal byte b al byte c)
        const prima = s.slice(Math.max(0, b - 4000), b)
        const dopo = s.slice(c, Math.min(s.length, c + 4000))
        const inizioOggetto = prima.lastIndexOf(' obj')
        const fineOggetto = dopo.indexOf('endobj')
        const diz = `${inizioOggetto >= 0 ? prima.slice(inizioOggetto) : prima} ${fineOggetto >= 0 ? dopo.slice(0, fineOggetto) : dopo}`
        const formato = (diz.match(/\/SubFilter\s*\/([A-Za-z0-9.#_-]+)/) ?? [])[1] ?? null
        if (/\/Type\s*\/DocTimeStamp/.test(diz) || formato === 'ETSI.RFC3161') { marche++; continue }
        let nome = leggiChiave(diz, '/Name')
        if (!nome) {
            const hex = s.slice(b, c).replace(/[<>\s]/g, '')
            const contenuto = new Uint8Array(Math.floor(hex.length / 2))
            for (let i = 0; i < contenuto.length; i++) contenuto[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
            nome = nomeDalCertificato(contenuto)
        }
        firme.push({
            nome,
            data: dataPdf(leggiChiave(diz, '/M')),
            formato,
            motivo: leggiChiave(diz, '/Reason'),
            luogo: leggiChiave(diz, '/Location'),
            copreTutto: c + d === byte.length,
        })
    }
    return { firme, marche }
}

// true se il file firmato comincia con tutti i byte del PDF definitivo (firme aggiunte in coda)
export function contieneOriginale(originale, firmato) {
    if (!originale?.length || !firmato?.length || firmato.length <= originale.length) return false
    for (let i = 0; i < originale.length; i++) if (originale[i] !== firmato[i]) return false
    return true
}
