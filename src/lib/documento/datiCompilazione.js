// src/lib/documento/datiCompilazione.js
//
// 08-10-2026: i dati con cui si compila un documento scritto da Lex («Compila con i dati di una pratica / di
// un mandato»), versione CH di quella IT: numero AVS al posto del codice fiscale, IDI per le imprese, albo
// cantonale, niente PEC. Qui solo trasformazioni, senza database: dalle righe lette con l'accesso
// dell'utente ai valori con le chiavi della funzione lex-compila-documento («cliente.nome»,
// «controparte_1.numero_avs»...). Alla funzione vanno solo le chiavi e il ruolo delle parti, mai i valori.

export const MAX_CONTROPARTI = 10
const FUSO = 'Europe/Zurich'
const LOCALE = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

const pulito = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const unisci = (parti, sep = ' ') => parti.map(pulito).filter(Boolean).join(sep)
const giuridica = (r) => r?.tipo_soggetto === 'persona_giuridica'
const locale = (lingua) => LOCALE[lingua] ?? 'it-CH'

// '1980-03-12' → '12.03.1980'
const dataBreve = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
    return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}
// → '8 ottobre 2026', '8. Oktober 2026', '8 octobre 2026'
const dataLunga = (d, lingua) => new Date(d).toLocaleDateString(locale(lingua), { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSO })
const oraDi = (d, lingua) => new Date(d).toLocaleTimeString(locale(lingua), { hour: '2-digit', minute: '2-digit', timeZone: FUSO })

// 'Via Nassa 5, 6900 Lugano'
function indirizzo({ via, civico, cap, citta }) {
    return unisci([unisci([via, civico]), unisci([cap, citta])], ', ')
}

// Dati di una persona: il cliente (riga di profiles) o una controparte (riga di controparti)
function datiPersona(r, { controparte = false } = {}) {
    if (!r) return {}
    const g = giuridica(r)
    const sede = g ? pulito(r.sede_legale) : ''
    const rappresentante = g ? (unisci([r.rappr_nome, r.rappr_cognome]) || pulito(r.rappresentante_legale)) : ''
    const dati = {
        nome: g ? pulito(r.ragione_sociale) : unisci([r.nome, r.cognome]),
        numero_avs: pulito(r.numero_avs),
        uid: pulito(r.uid),
        data_nascita: g ? '' : dataBreve(r.data_nascita),
        luogo_nascita: g ? '' : pulito(r.luogo_nascita),
        indirizzo: sede || indirizzo({ via: r.indirizzo, civico: r.numero_civico, cap: r.cap, citta: r.citta }),
        via: unisci([r.indirizzo, r.numero_civico]),
        cap: pulito(r.cap),
        citta: pulito(r.citta),
        cantone: pulito(r.cantone),
        email: pulito(r.email),
        telefono: pulito(r.telefono),
        rappresentante,
        rappresentante_carica: rappresentante ? pulito(r.rappr_carica) : '',
        rappresentante_avs: rappresentante ? pulito(r.rappr_avs) : '',
    }
    if (controparte) {
        dati.legale = unisci([r.legale_nome, r.legale_cognome])
        dati.legale_albo = unisci([r.legale_cantone_albo, r.legale_albo])
    }
    return dati
}

// Il professionista che firma: il profilo di chi è collegato
function datiProfessionista(p, titoloAvvocato) {
    if (!p) return {}
    const nome = unisci([p.nome, p.cognome])
    const avvocato = p.role === 'avvocato'
    return {
        nome,
        titolo_nome: nome ? (avvocato ? `${titoloAvvocato} ${nome}` : nome) : '',
        studio: pulito(p.studio) || pulito(p.ragione_sociale),
        indirizzo: indirizzo({ via: p.indirizzo, civico: p.numero_civico, cap: p.cap, citta: p.citta }),
        via: unisci([p.indirizzo, p.numero_civico]),
        cap: pulito(p.cap),
        citta: pulito(p.citta),
        uid: pulito(p.uid),
        email: pulito(p.email),
        telefono: pulito(p.telefono),
        iban: pulito(p.iban),
        albo: avvocato ? pulito(p.cantone_albo) : '',
        numero_albo: avvocato ? pulito(p.numero_albo) : '',
    }
}

function aggiungi(valori, prefisso, dati) {
    for (const [k, v] of Object.entries(dati)) if (v) valori[`${prefisso}.${k}`] = v
}

/**
 * Dati di una pratica dell'avvocato.
 * @returns {{ valori: Record<string,string>, parti: object, tipo: string, udienza: 'prossima'|'ultima'|null }}
 */
export function datiDaPratica({ pratica, cliente, controparti = [], udienze = [], profilo, lingua = 'it', titoloAvvocato = 'Avv.', adesso = new Date() }) {
    const valori = {}
    aggiungi(valori, 'professionista', datiProfessionista(profilo, titoloAvvocato))
    aggiungi(valori, 'cliente', { ...datiPersona(cliente), iban: pulito(cliente?.iban) })
    const parti = { cliente: { tipo: cliente?.tipo_soggetto ?? null }, controparti: [] }
    controparti.slice(0, MAX_CONTROPARTI).forEach((c, i) => {
        aggiungi(valori, `controparte_${i + 1}`, datiPersona(c, { controparte: true }))
        parti.controparti.push({ n: i + 1, ruolo: pulito(c.ruolo), tipo: c.tipo_soggetto ?? null })
    })
    // L'udienza: la prossima in programma; se non c'è, l'ultima già tenuta
    const tempo = (u) => new Date(u.data_ora).getTime()
    const conData = udienze.filter((u) => u.data_ora)
    const prossima = conData.filter((u) => u.stato === 'programmata' && tempo(u) >= adesso.getTime()).sort((a, b) => tempo(a) - tempo(b))[0]
    const ultima = conData.filter((u) => tempo(u) < adesso.getTime()).sort((a, b) => tempo(b) - tempo(a))[0]
    const u = prossima ?? ultima
    if (u) {
        aggiungi(valori, 'udienza', {
            data: dataLunga(u.data_ora, lingua), ora: oraDi(u.data_ora, lingua), ufficio: pulito(u.tribunale), sezione: pulito(u.sezione), giudice: pulito(u.giudice),
        })
    }
    valori.oggi = dataLunga(adesso, lingua)
    return { valori, parti, tipo: pulito(pratica?.tipo), udienza: u ? (prossima ? 'prossima' : 'ultima') : null }
}

/** Dati di un mandato del fiduciario. */
export function datiDaMandato({ mandato, cliente, profilo, lingua = 'it', titoloAvvocato = 'Avv.', adesso = new Date() }) {
    const valori = {}
    aggiungi(valori, 'professionista', datiProfessionista(profilo, titoloAvvocato))
    aggiungi(valori, 'cliente', { ...datiPersona(cliente), iban: pulito(cliente?.iban) })
    if (mandato?.anno_riferimento) valori['mandato.anno'] = String(mandato.anno_riferimento)
    valori.oggi = dataLunga(adesso, lingua)
    return { valori, parti: { cliente: { tipo: cliente?.tipo_soggetto ?? null } }, tipo: pulito(mandato?.tipo), udienza: null }
}

// «{controparte_1.nome}, AVS {controparte_1.numero_avs}» → testo; null se manca un dato
export function compilaModello(modello, valori) {
    let manca = false
    const testo = String(modello ?? '').replace(/\{([a-z]+(?:_\d{1,2})?(?:\.[a-z_]+)?)\}/g, (_, chiave) => {
        const v = valori[chiave]
        if (!v) manca = true
        return v ?? ''
    })
    return manca ? null : testo.replace(/\s+/g, ' ').trim() || null
}

/**
 * Dalla risposta della funzione ai valori dei segnaposto.
 * @returns {{ valori: Record<number,string>, gruppi: Array<{ segnaposto: string, valore: string, numeri: number[] }> }}
 */
export function applicaAbbinamenti(abbinamenti, valoriDati, segnaposti) {
    const testoDi = new Map(segnaposti.map((s) => [s.n, s.segnaposto]))
    const valori = {}
    const gruppi = []
    for (const a of abbinamenti ?? []) {
        const valore = compilaModello(a.modello, valoriDati)
        const numeri = (a.numeri ?? []).filter((n) => testoDi.has(n) && valori[n] == null)
        if (!valore || !numeri.length) continue
        numeri.forEach((n) => { valori[n] = valore })
        // Un gruppo per segnaposto e valore: lo stesso dato inserito in più punti si vede una volta
        for (const n of numeri) {
            const segnaposto = testoDi.get(n)
            const gruppo = gruppi.find((g) => g.segnaposto === segnaposto && g.valore === valore)
            if (gruppo) gruppo.numeri.push(n)
            else gruppi.push({ segnaposto, valore, numeri: [n] })
        }
    }
    return { valori, gruppi }
}
