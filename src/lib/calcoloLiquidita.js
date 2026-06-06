// src/lib/calcoloLiquidita.js
//
// Motore di proiezione della liquidità (pure functions, niente React).
// Dal saldo di cassa a una data nota, proietta mese per mese il saldo futuro
// fondendo: movimenti previsti (espansi per ricorrenza) + movimenti effettivi
// futuri + salari proiettati. Restituisce i bucket mensili e gli indicatori
// chiave (saldo minimo, primo mese sotto zero).
//
// Regole:
//  - Si parte dal saldo all'ANCORA (dataAncora, saldoAncora).
//  - Contano solo gli elementi con data > dataAncora (il resto è già nel saldo).
//  - Il mese in corso (bucket 0) NON include i salari (assunti già pagati / nel
//    saldo); i salari rientrano dal mese successivo. → imposta il saldo a inizio
//    mese per la massima precisione.

import { salariMeseAttivi, bonusDelMese } from './calcoloSalari'

export const MESI_ABBR = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

// Espande un movimento previsto in occorrenze {data: Date, importo, tipo}
// all'interno della finestra (daDate, aDate]. una_tantum → al massimo una.
export function espandiPrevisto(m, daDate, aDate) {
    const imp = Number(m.importo) || 0
    if (!imp) return []
    const start = new Date(m.data)
    const occ = []

    const step = m.ricorrenza === 'mensile' ? 1
        : m.ricorrenza === 'trimestrale' ? 3
            : m.ricorrenza === 'annuale' ? 12
                : 0

    if (step === 0) {
        if (start > daDate && start <= aDate) occ.push({ data: start, importo: imp, tipo: m.tipo })
        return occ
    }

    const fine = m.ricorrenza_fine ? new Date(m.ricorrenza_fine) : aDate
    let d = new Date(start)
    let guardia = 0
    while (d <= aDate && d <= fine && guardia < 600) {
        if (d > daDate) occ.push({ data: new Date(d), importo: imp, tipo: m.tipo })
        d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate())
        guardia++
    }
    return occ
}

// Proiezione mensile della liquidità.
//   saldoAncora : number   - cassa alla dataAncora
//   dataAncora  : Date     - data del saldo noto
//   movimenti   : array    - movimenti (con stato/ricorrenza)
//   dipendenti  : array    - per i salari proiettati
//   bonus       : array    - bonus dipendenti
//   mesi        : number   - orizzonte (default 12)
export function proiezioneLiquidita({ saldoAncora = 0, dataAncora, movimenti = [], dipendenti = [], bonus = [], mesi = 12 }) {
    const ancora = dataAncora instanceof Date ? dataAncora : new Date(dataAncora)
    // Fine finestra = ultimo giorno dell'ultimo mese proiettato
    const aDate = new Date(ancora.getFullYear(), ancora.getMonth() + mesi, 0)

    // 1) Costruisci le occorrenze di cassa (> ancora, entro la finestra)
    const occ = []
    for (const m of movimenti) {
        const imp = Number(m.importo) || 0
        if (!imp) continue
        const previstoRicorrente = (m.stato ?? 'effettivo') === 'previsto' && m.ricorrenza && m.ricorrenza !== 'una_tantum'
        if (previstoRicorrente) {
            for (const o of espandiPrevisto(m, ancora, aDate)) occ.push(o)
        } else {
            const d = new Date(m.data)
            if (d > ancora && d <= aDate) occ.push({ data: d, importo: imp, tipo: m.tipo })
        }
    }

    // 2) Bucket mensili
    const buckets = []
    let saldo = saldoAncora
    for (let i = 0; i < mesi; i++) {
        const moAbs = ancora.getMonth() + i
        const y = ancora.getFullYear() + Math.floor(moAbs / 12)
        const mo = ((moAbs % 12) + 12) % 12
        const mStart = new Date(y, mo, 1)
        const mEnd = new Date(y, mo + 1, 0)
        const inMese = (d) => d >= mStart && d <= mEnd

        const entrate = occ.filter(o => o.tipo === 'entrata' && inMese(o.data)).reduce((t, o) => t + o.importo, 0)
        const uscite = occ.filter(o => o.tipo === 'uscita' && inMese(o.data)).reduce((t, o) => t + o.importo, 0)
        // Mese in corso (i===0): salari esclusi (già nel saldo). Poi full month.
        const salari = i === 0 ? 0 : salariMeseAttivi(dipendenti, mo, y) + bonusDelMese(bonus, mo, y)
        const netto = entrate - uscite - salari
        saldo += netto
        buckets.push({ anno: y, mese: mo, entrate, uscite, salari, netto, saldoFine: saldo })
    }

    const minBucket = buckets.reduce((min, b) => (b.saldoFine < min.saldoFine ? b : min), buckets[0] ?? null)
    const primaSottoZero = buckets.find(b => b.saldoFine < 0) ?? null

    return {
        buckets,
        saldoIniziale: saldoAncora,
        saldoFinale: buckets.length ? buckets[buckets.length - 1].saldoFine : saldoAncora,
        saldoMin: minBucket ? minBucket.saldoFine : saldoAncora,
        minBucket,
        primaSottoZero,
    }
}
