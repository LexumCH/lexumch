// src/lib/contoAnnuale.js
//
// 09-10-2026: i numeri del conto annuale (art. 958-959b CO) dal libro mastro, sempre uguali a parità di
// registrazioni: niente intelligenza artificiale qui. Bilancio per poste dell'art. 959a, conto economico
// per natura (art. 959b cpv. 2) con i risultati intermedi, esercizi con date libere, anno precedente,
// controlli prima della firma.
//
// Convenzioni:
//   - le date sono stringhe ISO 'AAAA-MM-GG' (si confrontano come testo);
//   - conto economico: ricavi positivi, costi negativi (forma scalare), come si stampa;
//   - bilancio: ogni posta col suo segno naturale (attivi in dare, passivi in avere); le poste negative
//     (perdite, quote proprie) restano negative;
//   - utile dell'esercizio = risultato del conto economico del periodo; tutto il resto dei conti di risultato
//     (2891/2970 e 2979, più i conti economici non ancora chiusi degli anni prima) è utile riportato. Così il
//     bilancio è giusto prima e dopo la chiusura e anche se l'utile dell'anno prima non è stato ancora
//     ripartito.

import { STRUTTURA_BILANCIO, STRUTTURA_CE, POSTE_CE, POSTE_BILANCIO, tipoDiPosta } from './pianoContiKMU'

export const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100

// ─── Date ───

const comeData = (s) => new Date(`${s}T00:00:00Z`)
const comeIso = (d) => d.toISOString().slice(0, 10)

export const isoOggi = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function giornoDopo(iso) { const d = comeData(iso); d.setUTCDate(d.getUTCDate() + 1); return comeIso(d) }
export function giornoPrima(iso) { const d = comeData(iso); d.setUTCDate(d.getUTCDate() - 1); return comeIso(d) }
// Lo stesso giorno spostato di `anni` (il 29 febbraio di un anno non bisestile diventa il 1° marzo)
function spostaAnni(iso, anni) {
    const d = comeData(iso)
    return comeIso(new Date(Date.UTC(d.getUTCFullYear() + anni, d.getUTCMonth(), d.getUTCDate())))
}
// Fine di un esercizio di 12 mesi che comincia il giorno `inizio` (01.01.2025 → 31.12.2025)
export const fineDodiciMesi = (inizio) => giornoPrima(spostaAnni(inizio, 1))
// Inizio dell'esercizio di 12 mesi che finisce il giorno `fine` (30.06.2026 → 01.07.2025)
export const inizioDodiciMesi = (fine) => spostaAnni(giornoDopo(fine), -1)
export const dataCH = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '')

export function esercizioSolare(e) {
    return e.inizio.slice(5) === '01-01' && e.fine.slice(5) === '12-31' && e.inizio.slice(0, 4) === e.fine.slice(0, 4)
}
// «2025» per l'anno solare, «2025/26» per gli altri
export function etichettaEsercizio(e) {
    if (!e) return ''
    const a = e.inizio.slice(0, 4)
    const b = e.fine.slice(0, 4)
    return esercizioSolare(e) ? a : (a === b ? `${dataCH(e.inizio)}–${dataCH(e.fine)}` : `${a}/${b.slice(2)}`)
}

// ─── Esercizi ───

// Gli esercizi da mostrare: quelli salvati (aperti o chiusi) e quelli proposti (`virtuale`) per coprire le
// registrazioni e l'anno in corso. Senza esercizi salvati: anni solari, come prima. Con esercizi salvati: i
// buchi tra uno e l'altro, gli esercizi di 12 mesi dopo l'ultimo e prima del primo.
export function elencoEsercizi(salvati = [], dateRegistrazioni = [], oggi = isoOggi()) {
    const reali = [...salvati].sort((a, b) => a.inizio.localeCompare(b.inizio)).map(e => ({ ...e, virtuale: false }))
    const date = dateRegistrazioni.filter(Boolean)
    const ultima = date.reduce((m, d) => (d > m ? d : m), oggi)
    const prima = date.reduce((m, d) => (d < m ? d : m), oggi)
    const out = []
    const virtuale = (inizio, fine) => ({ id: null, inizio, fine, stato: 'aperto', virtuale: true })

    if (!reali.length) {
        const anni = new Set([Number(oggi.slice(0, 4))])
        date.forEach(d => anni.add(Number(d.slice(0, 4))))
        ;[...anni].sort((a, b) => a - b).forEach(a => out.push(virtuale(`${a}-01-01`, `${a}-12-31`)))
        return out
    }

    // Prima del primo esercizio salvato
    const prima_ = []
    let primo = reali[0]
    while (prima < primo.inizio) {
        const fine = giornoPrima(primo.inizio)
        const v = virtuale(inizioDodiciMesi(fine), fine)
        prima_.unshift(v)
        primo = v
    }
    out.push(...prima_)

    reali.forEach((e, i) => {
        out.push(e)
        const dopo = reali[i + 1]
        if (dopo && giornoDopo(e.fine) < dopo.inizio) out.push(virtuale(giornoDopo(e.fine), giornoPrima(dopo.inizio)))
    })

    let ultimo = reali[reali.length - 1]
    while (ultimo.fine < ultima) {
        const inizio = giornoDopo(ultimo.fine)
        const v = virtuale(inizio, fineDodiciMesi(inizio))
        out.push(v)
        ultimo = v
    }
    return out
}

// L'esercizio prima di `e` nell'elenco, o i 12 mesi prima se l'elenco non lo contiene
export function esercizioPrecedente(elenco, e) {
    if (!e) return null
    const fine = giornoPrima(e.inizio)
    return elenco.find(x => x.fine === fine) ?? { id: null, inizio: inizioDodiciMesi(fine), fine, stato: 'aperto', virtuale: true }
}

// ─── Calcolo ───

const ceVuoto = () => Object.fromEntries(POSTE_CE.map(p => [p, 0]))
const bilancioVuoto = () => Object.fromEntries(POSTE_BILANCIO.map(p => [p, 0]))
const RISULTATI = new Set(['cp_utile_riportato', 'cp_utile_esercizio'])

/**
 * Valori per posta dal libro mastro.
 * @param {Array<{ data: string, tipo: string, dare: number, avere: number, c: { id, numero, nome, classe, posta_co } }>} righe
 * @param {{ inizio: string, fine: string }} periodo
 */
export function valoriDalMastro(righe, { inizio, fine }) {
    const ce = ceVuoto()
    const bilancio = bilancioVuoto()
    const dettaglio = {}         // posta -> Map(conto_id -> { c, valore })
    const senzaPosta = new Map() // conto_id -> { c, saldo }
    let risultatiCumulati = 0
    let movimentiNelPeriodo = 0

    const dett = (posta, c, v) => {
        if (!dettaglio[posta]) dettaglio[posta] = new Map()
        const m = dettaglio[posta]
        if (!m.has(c.id)) m.set(c.id, { c, valore: 0 })
        m.get(c.id).valore += v
    }

    for (const r of righe) {
        if (!r?.c || r.data > fine) continue
        const posta = r.c.posta_co
        const credito = (Number(r.avere) || 0) - (Number(r.dare) || 0)
        const nelPeriodo = r.data >= inizio && r.tipo !== 'chiusura'
        if (nelPeriodo) movimentiNelPeriodo++

        if (posta && posta.startsWith('ce_')) {
            if (nelPeriodo) { ce[posta] += credito; dett(posta, r.c, credito) }
            risultatiCumulati += credito
        } else if (RISULTATI.has(posta)) {
            risultatiCumulati += credito
        } else if (posta && posta.startsWith('att_')) {
            bilancio[posta] -= credito; dett(posta, r.c, -credito)
        } else if (posta && (posta.startsWith('pas_') || posta.startsWith('cp_'))) {
            bilancio[posta] += credito; dett(posta, r.c, credito)
        } else {
            if (!senzaPosta.has(r.c.id)) senzaPosta.set(r.c.id, { c: r.c, saldo: 0 })
            senzaPosta.get(r.c.id).saldo -= credito
        }
    }

    for (const p of POSTE_CE) ce[p] = r2(ce[p])
    const risultato = r2(POSTE_CE.reduce((s, p) => s + ce[p], 0))
    bilancio.cp_utile_esercizio = risultato
    bilancio.cp_utile_riportato = r2(risultatiCumulati - risultato)
    for (const p of POSTE_BILANCIO) bilancio[p] = r2(bilancio[p])

    const dettaglioOrdinato = Object.fromEntries(Object.entries(dettaglio).map(([p, m]) => [
        p,
        [...m.values()].map(x => ({ ...x, valore: r2(x.valore) })).filter(x => x.valore !== 0)
            .sort((a, b) => String(a.c.numero).localeCompare(String(b.c.numero))),
    ]))
    return {
        ce,
        bilancio,
        dettaglio: dettaglioOrdinato,
        senzaPosta: [...senzaPosta.values()].map(x => ({ ...x, saldo: r2(x.saldo) })).filter(x => x.saldo !== 0),
        movimentiNelPeriodo,
    }
}

// Saldi d'apertura (registrazioni «apertura» nei primi 31 giorni dell'esercizio): il bilancio di fine
// dell'anno precedente, per proporlo quando quell'anno non è in Lexum.
export function bilancioDaApertura(righe, { inizio }) {
    const finestra = (() => { const d = comeData(inizio); d.setUTCDate(d.getUTCDate() + 31); return comeIso(d) })()
    const bilancio = bilancioVuoto()
    let trovate = 0
    for (const r of righe) {
        if (!r?.c || r.tipo !== 'apertura' || r.data < inizio || r.data > finestra) continue
        const posta = r.c.posta_co
        const credito = (Number(r.avere) || 0) - (Number(r.dare) || 0)
        if (posta && posta.startsWith('att_')) { bilancio[posta] -= credito; trovate++ }
        else if (posta && (posta.startsWith('pas_') || posta.startsWith('cp_'))) { bilancio[posta] += credito; trovate++ }
    }
    for (const p of POSTE_BILANCIO) bilancio[p] = r2(bilancio[p])
    return trovate ? bilancio : null
}

/**
 * Risultati intermedi, gruppi e totali da valori per posta (dal mastro o inseriti a mano).
 * @param {{ ce: Object<string, number>, bilancio: Object<string, number> }} valori
 */
export function componi({ ce = {}, bilancio = {} }) {
    const v = (o, p) => r2(o[p] ?? 0)
    const subtotali = {}
    let corrente = 0
    for (const riga of STRUTTURA_CE) {
        if (riga.posta) corrente = r2(corrente + v(ce, riga.posta))
        else subtotali[riga.subtotale] = corrente
    }
    const gruppi = {}
    const sezioni = {}
    for (const s of STRUTTURA_BILANCIO) {
        let totSezione = 0
        for (const g of s.gruppi) {
            const tot = r2(g.poste.reduce((t, p) => t + v(bilancio, p), 0))
            gruppi[g.gruppo] = tot
            totSezione += tot
        }
        sezioni[s.sezione] = r2(totSezione)
    }
    const differenza = r2(sezioni.attivo - sezioni.passivo)
    return {
        ce: Object.fromEntries(POSTE_CE.map(p => [p, v(ce, p)])),
        bilancio: Object.fromEntries(POSTE_BILANCIO.map(p => [p, v(bilancio, p)])),
        subtotali,
        risultato: subtotali.risultato_esercizio ?? 0,
        gruppi,
        totaleAttivo: sezioni.attivo,
        totalePassivo: sezioni.passivo,
        differenza,
        quadra: differenza === 0,
    }
}

// Valori inseriti a mano (anno precedente fuori Lexum): { ce: {posta: n}, bilancio: {posta: n} }
export function valoriManuali(cifre) {
    if (!cifre) return null
    const num = (x) => { const n = Number(String(x ?? '').replace(/['’\s]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
    const ce = ceVuoto()
    const bilancio = bilancioVuoto()
    let qualcosa = false
    for (const p of POSTE_CE) if (cifre.ce?.[p] != null && cifre.ce[p] !== '') { ce[p] = r2(num(cifre.ce[p])); qualcosa = true }
    for (const p of POSTE_BILANCIO) if (cifre.bilancio?.[p] != null && cifre.bilancio[p] !== '') { bilancio[p] = r2(num(cifre.bilancio[p])); qualcosa = true }
    return qualcosa ? { ce, bilancio } : null
}

/**
 * Il conto annuale di un esercizio: numeri dell'anno e dell'anno precedente (dal mastro se l'anno prima è in
 * Lexum, altrimenti quelli inseriti a mano), con le poste da mostrare.
 */
export function calcolaContoAnnuale({ righe, esercizio, precedente, cifrePrecedenti = null }) {
    const dalMastro = valoriDalMastro(righe, esercizio)
    const attuale = componi(dalMastro)
    let prec = null
    let fontePrecedente = 'nessuna'
    if (precedente) {
        const mastroPrec = valoriDalMastro(righe, precedente)
        // usaManuali: l'anno prima è in Lexum solo in parte (cliente arrivato a metà anno), valgono le cifre a mano
        if (mastroPrec.movimentiNelPeriodo > 0 && !cifrePrecedenti?.usaManuali) {
            prec = componi(mastroPrec)
            fontePrecedente = 'mastro'
        } else {
            const manuali = valoriManuali(cifrePrecedenti)
            if (manuali) { prec = componi(manuali); fontePrecedente = 'manuale' }
        }
    }
    // Le poste si mostrano se hanno un valore in uno dei due anni (art. 958d cpv. 1: le poste senza valore
    // si possono omettere); il capitale proprio e il risultato sempre.
    const sempre = new Set(['cp_capitale', 'cp_utile_esercizio'])
    const visibile = (sezione, p) => sempre.has(p) || attuale[sezione][p] !== 0 || (prec && prec[sezione][p] !== 0)
    return {
        attuale,
        precedente: prec,
        fontePrecedente,
        dettaglio: dalMastro.dettaglio,
        senzaPosta: dalMastro.senzaPosta,
        movimenti: dalMastro.movimentiNelPeriodo,
        posteCeVisibili: POSTE_CE.filter(p => visibile('ce', p)),
        posteBilancioVisibili: POSTE_BILANCIO.filter(p => visibile('bilancio', p)),
    }
}

// ─── Controlli prima della firma ───
// { livello: 'errore' | 'avviso' | 'info', codice, valori }: i testi sono nella pagina (comp_fid_conto_annuale).
// Solo gli errori impediscono il conto annuale definitivo: sono numeri che non tornano.

export function controlliContoAnnuale(calcolo, { personaGiuridica = true, esercizioChiuso = false, fuoriEsercizio = 0, primoEsercizio = false } = {}) {
    const out = []
    const { attuale: a, precedente: p } = calcolo
    if (!a.quadra) out.push({ livello: 'errore', codice: 'bilancio_non_quadra', valori: { differenza: a.differenza } })
    if (calcolo.senzaPosta.length) out.push({ livello: 'errore', codice: 'conti_senza_posta', valori: { conti: calcolo.senzaPosta.map(x => x.c.numero).join(', ') } })
    if (fuoriEsercizio > 0) out.push({ livello: 'avviso', codice: 'registrazioni_fuori_esercizio', valori: { n: fuoriEsercizio } })

    // Eccedenza di debiti e perdita di capitale (art. 725a e 725b CO): non sono errori dei numeri, ma il
    // consiglio d'amministrazione deve saperlo prima di firmare
    const capitaleProprio = a.gruppi.capitale_proprio
    if (capitaleProprio < 0) {
        out.push({ livello: 'avviso', codice: personaGiuridica ? 'eccedenza_debiti' : 'capitale_negativo', valori: { importo: capitaleProprio } })
    } else if (personaGiuridica) {
        const base = a.bilancio.cp_capitale + a.bilancio.cp_riserva_capitale + a.bilancio.cp_riserva_utili
        if (base > 0 && capitaleProprio < base / 2) out.push({ livello: 'avviso', codice: 'perdita_capitale', valori: { capitale: capitaleProprio, meta: r2(base / 2) } })
    }
    if (a.bilancio.att_liquidita < 0) out.push({ livello: 'avviso', codice: 'liquidita_negativa', valori: { importo: a.bilancio.att_liquidita } })
    const immobilizzi = a.bilancio.att_imm_materiali + a.bilancio.att_imm_immateriali
    if (immobilizzi > 0 && a.ce.ce_ammortamenti === 0) out.push({ livello: 'avviso', codice: 'senza_ammortamenti', valori: { importo: r2(immobilizzi) } })
    if (personaGiuridica && a.subtotali.risultato_prima_imposte > 0 && a.ce.ce_imposte === 0) out.push({ livello: 'avviso', codice: 'senza_imposte', valori: { importo: a.subtotali.risultato_prima_imposte } })
    const straordinari = a.ce.ce_straordinari_costi !== 0 || a.ce.ce_straordinari_ricavi !== 0
    if (straordinari && personaGiuridica) out.push({ livello: 'info', codice: 'spiegare_straordinari', valori: {} })
    if (p && calcolo.fontePrecedente === 'manuale') {
        if (!p.quadra) out.push({ livello: 'avviso', codice: 'precedente_non_quadra', valori: { differenza: p.differenza } })
        if (p.bilancio.cp_utile_esercizio !== p.risultato) out.push({ livello: 'avviso', codice: 'precedente_risultato_diverso', valori: { bilancio: p.bilancio.cp_utile_esercizio, ce: p.risultato } })
    }
    // Cifre dell'anno precedente obbligatorie (art. 958d cpv. 2 CO), salvo il primo esercizio
    if (!p && !primoEsercizio) out.push({ livello: 'avviso', codice: 'senza_precedente', valori: {} })
    if (!esercizioChiuso) out.push({ livello: 'info', codice: 'esercizio_aperto', valori: {} })
    return out
}

// Il tipo del conto per la posta (ricavo/costo...) — usato quando si cambia la posta di un conto
export { tipoDiPosta }

// ─── Proposta d'impiego dell'utile risultante dal bilancio ───
// 10-10-2026, richiesta dell'utente. La propone il consiglio d'amministrazione (i gerenti nella Sagl,
// l'amministrazione nella cooperativa); decide l'assemblea (art. 698 cpv. 2 n. 4, 804 cpv. 2 n. 5 CO).
// Regole: 5% dell'utile d'esercizio alla riserva legale da utili, dopo aver eliminato la perdita riportata, finché
// con la riserva legale da capitale arriva alla metà del capitale (un quinto per le holding) (art. 672, per la
// Sagl art. 801); dividendi solo dall'utile di bilancio e dalle riserve costituite a questo scopo, e solo dopo le
// attribuzioni alle riserve (art. 675 cpv. 2 e 3).

export const FORME_CON_IMPIEGO = ['sa', 'sagl', 'cooperativa', 'altro']

const numero = (x) => { const n = Number(String(x ?? '').replace(/['’\s]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

/**
 * @param {object} attuale   componi(...) dell'esercizio
 * @param {{ holding?: boolean, riserva_legale?, dividendo?, riserve_facoltative?, prelievo_riserve? }} scelte
 */
export function impiegoUtile(attuale, scelte = {}) {
    const b = attuale.bilancio
    const riportato = r2(b.cp_utile_riportato)
    const esercizio = r2(attuale.risultato)
    const utileBilancio = r2(riportato + esercizio)
    const soglia = r2(b.cp_capitale * (scelte.holding ? 0.2 : 0.5))
    const riserveLegali = r2(b.cp_riserva_capitale + b.cp_riserva_utili)
    const base = r2(esercizio + Math.min(0, riportato))
    const riservaMinima = base > 0 && riserveLegali < soglia ? r2(Math.min(base * 0.05, soglia - riserveLegali)) : 0
    const valore = (k, predefinito = 0) => (scelte[k] == null || String(scelte[k]).trim() === '' ? predefinito : r2(numero(scelte[k])))
    const riserva = valore('riserva_legale', riservaMinima)
    const dividendo = valore('dividendo')
    const facoltative = valore('riserve_facoltative')
    const prelievo = valore('prelievo_riserve')
    const riporto = r2(utileBilancio + prelievo - riserva - dividendo - facoltative)
    const errori = []
    const avvisi = []
    if ([riserva, dividendo, facoltative, prelievo].some(x => x < 0)) errori.push('importi_negativi')
    if (prelievo > r2(b.cp_riserve_facoltative)) errori.push('prelievo_oltre_riserve')
    if (riporto < 0 && (riserva > 0 || dividendo > 0 || facoltative > 0)) errori.push('supera_disponibile')
    if (riserva < riservaMinima) (dividendo > 0 ? errori : avvisi).push('riserva_sotto_minimo')
    return {
        riportato, esercizio, utileBilancio, riservaMinima, riserva, dividendo, facoltative, prelievo, riporto,
        percentualeDividendo: b.cp_capitale > 0 && dividendo > 0 ? r2((dividendo / b.cp_capitale) * 100) : null,
        perdita: utileBilancio < 0,
        errori,
        avvisi,
    }
}

/**
 * Le righe della registrazione che esegue l'impiego deciso dall'assemblea, alla data `data`: azzera i conti
 * dell'utile d'esercizio (2979) e porta gli importi sulla riserva legale da utili (2950), sui dividendi deliberati
 * (2261), sulle riserve facoltative (2960) e sull'utile riportato (2891 o 2970). Il riporto a nuovo è quello che
 * resta, calcolato sui saldi del giorno: la registrazione quadra sempre.
 * @returns {{ righe: Array<{ conto, dare, avere }>, mancanti: string[], disponibile: number, riporto: number }}
 */
export function righeImpiego({ righe, conti, data, scelte = {} }) {
    const saldo = (conto) => r2(righe.filter(r => r.c.id === conto.id && r.data <= data).reduce((s, r) => s + (Number(r.avere) || 0) - (Number(r.dare) || 0), 0))
    const perNumero = (n) => conti.find(c => c.numero === n)
    const perPosta = (p) => conti.filter(c => c.posta_co === p)
    const contiEsercizio = perPosta('cp_utile_esercizio')
    const riportati = perPosta('cp_utile_riportato')
    const contoRiporto = perNumero('2891') ?? perNumero('2970') ?? riportati[0]
    const contoRiserva = perNumero('2950') ?? perPosta('cp_riserva_utili')[0]
    const contoDividendi = perNumero('2261')
    const contoFacoltative = perNumero('2960') ?? perPosta('cp_riserve_facoltative')[0]
    const importo = (k) => r2(numero(scelte[k]))
    const riserva = importo('riserva_legale')
    const dividendo = importo('dividendo')
    const facoltative = importo('riserve_facoltative')
    const prelievo = importo('prelievo_riserve')

    const mancanti = []
    if (!contiEsercizio.length) mancanti.push('2979')
    if (!contoRiporto) mancanti.push('2891')
    if (riserva > 0 && !contoRiserva) mancanti.push('2950')
    if (dividendo > 0 && !contoDividendi) mancanti.push('2261')
    if ((facoltative > 0 || prelievo > 0) && !contoFacoltative) mancanti.push('2960')

    const utileEsercizio = r2(contiEsercizio.reduce((s, c) => s + saldo(c), 0))
    const utileRiportato = r2(riportati.reduce((s, c) => s + saldo(c), 0))
    const disponibile = r2(utileEsercizio + utileRiportato + prelievo)
    const riporto = r2(disponibile - riserva - dividendo - facoltative)
    if (mancanti.length) return { righe: [], mancanti, disponibile, riporto }

    const out = []
    const riga = (conto, valore) => {           // valore > 0 = avere, < 0 = dare
        const v = r2(valore)
        if (v > 0) out.push({ conto, dare: 0, avere: v })
        else if (v < 0) out.push({ conto, dare: -v, avere: 0 })
    }
    for (const c of contiEsercizio) riga(c, -saldo(c))
    if (prelievo > 0) riga(contoFacoltative, -prelievo)
    if (riserva > 0) riga(contoRiserva, riserva)
    if (dividendo > 0) riga(contoDividendi, dividendo)
    if (facoltative > 0) riga(contoFacoltative, facoltative)
    riga(contoRiporto, riporto - utileRiportato)
    return { righe: out, mancanti, disponibile, riporto }
}
