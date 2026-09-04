// src/lib/testi/forma.js
//
// Dà forma ai testi: appiattisce i JSON annidati in percorsi leggibili,
// li ricompone, e classifica ogni frase per capire cosa si può cambiare.
// Lo usano sia la sincronizzazione dal codice sia lo scarico dei file.

import { pezzi } from './percorso.js'

export const LINGUE = ['it', 'de', 'fr']

// ── Le due schede del pannello ──────────────────────────────────────────────
export const NS_VETRINA = [
  'home', 'per_avvocati', 'per_fiduciari', 'per_progettisti', 'lex_ai',
  'contatti', 'privacy', 'termini', 'archivio_demo', 'lex_demo',
  'comp_footer', 'common', 'auth',
]

const ETICHETTE = {
  home: 'Home', per_avvocati: 'Per avvocati', per_fiduciari: 'Per fiduciari',
  per_progettisti: 'Per progettisti', lex_ai: 'Lex AI', contatti: 'Contatti',
  privacy: 'Informativa privacy', termini: 'Termini di servizio',
  archivio_demo: 'Dimostrazione archivio', lex_demo: 'Dimostrazione Lex',
  comp_footer: 'Piè di pagina', common: 'Voci comuni (menu, pulsanti)',
  auth: 'Accesso e registrazione', istituzioni: 'Mappa istituzioni',
}

const AREE = [
  ['comp_layout_', 'Menu · '], ['comp_fid_', 'Componente fiduciario · '],
  ['comp_progettista_', 'Componente progettista · '], ['comp_modal_', 'Finestra · '],
  ['comp_', 'Componente · '], ['avv_', 'Avvocato · '], ['fid_', 'Fiduciario · '],
  ['cli_', 'Portale cliente · '], ['user_', 'Utente · '],
]

export function etichettaNs(ns) {
  if (ETICHETTE[ns]) return ETICHETTE[ns]
  for (const [pre, testa] of AREE) {
    if (ns.startsWith(pre)) {
      const resto = ns.slice(pre.length).replace(/_/g, ' ')
      return testa + resto.charAt(0).toUpperCase() + resto.slice(1)
    }
  }
  const r = ns.replace(/_/g, ' ')
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export const gruppoNs = (ns) => (NS_VETRINA.includes(ns) ? 'vetrina' : 'backend')
export const ordineNs = (ns) => {
  const i = NS_VETRINA.indexOf(ns)
  return i >= 0 ? i : 100
}

// ── Appiattire e ricomporre ─────────────────────────────────────────────────

/** { a: { b: [ { c: 'x' } ] } }  →  { 'a.b[0].c': 'x' }, nell'ordine del file. */
export function appiattisci(nodo, prefisso = '', fuori = {}) {
  if (Array.isArray(nodo)) {
    nodo.forEach((v, i) => appiattisci(v, `${prefisso}[${i}]`, fuori))
    return fuori
  }
  if (nodo !== null && typeof nodo === 'object') {
    for (const k of Object.keys(nodo)) {
      appiattisci(nodo[k], prefisso ? `${prefisso}.${k}` : k, fuori)
    }
    return fuori
  }
  fuori[prefisso] = nodo
  return fuori
}

/** L'inverso: da [{percorso, valore}] ordinati torna l'oggetto annidato. */
export function ricomponi(voci) {
  const radice = {}
  for (const { percorso, valore } of voci) {
    const p = pezzi(percorso)
    let n = radice
    for (let i = 0; i < p.length - 1; i++) {
      const passo = p[i]
      const prossimo = p[i + 1]
      if (n[passo] === undefined) n[passo] = typeof prossimo === 'number' ? [] : {}
      n = n[passo]
    }
    n[p[p.length - 1]] = valore
  }
  return radice
}

// ── Classificazione ─────────────────────────────────────────────────────────

const RE_VAR = /\{\{\s*([A-Za-z0-9_]+)/g
const RE_TAG_APERTO = /<\s*([A-Za-z0-9_]+)\s*>/g
// Un discriminatore: stessa parola nelle tre lingue, tutta minuscola, senza spazi.
// NON è un numero: 561 quote o «01» sono cifre mostrate a schermo, e quelle
// devi poterle cambiare.
const RE_DISCRIMINATORE = /^[a-z][a-z0-9_-]{0,23}$/

const estrai = (testo, re, distinti) => {
  const out = []
  re.lastIndex = 0
  let m
  while ((m = re.exec(testo)) !== null) out.push(m[1])
  const ord = out.sort()
  return distinti ? [...new Set(ord)] : ord
}

/** La 'forma' di un percorso: gli indici degli elenchi diventano []. */
export const forma = (ns, percorso) => `${ns}.${percorso.replace(/\[\d+\]/g, '[]')}`

/**
 * Primo giro su tutto il corpus: raccoglie i valori osservati per ogni forma
 * di discriminatore. Serve a sapere che «stato» ammette solo pagato/in_sospeso.
 */
export function costruisciDomini(corpus) {
  const domini = {}
  for (const [ns, lingue] of Object.entries(corpus)) {
    for (const [percorso, it] of Object.entries(lingue.it)) {
      if (typeof it !== 'string') continue
      if (it !== lingue.de[percorso] || it !== lingue.fr[percorso]) continue
      if (!RE_DISCRIMINATORE.test(it)) continue
      ;(domini[forma(ns, percorso)] ??= new Set()).add(it)
    }
  }
  return domini
}

/** La scheda di una frase: cosa è, cosa deve restare uguale, quanto può crescere. */
export function classifica(ns, percorso, ordine, it, de, fr, domini) {
  const chiusura = percorso.match(/^(.*)\[(\d+)\](?:\.[^.[\]]+)?$/)
  const base = {
    percorso,
    ordine,
    array_padre: chiusura ? chiusura[1] : null,
    array_indice: chiusura ? Number(chiusura[2]) : null,
    it: typeof it === 'boolean' ? String(it) : it,
    de: typeof de === 'boolean' ? String(de) : de,
    fr: typeof fr === 'boolean' ? String(fr) : fr,
  }

  if (typeof it === 'boolean') {
    return { ...base, tipo: 'booleano', variabili: [], tag: [], obbligatoria: true, max_caratteri: 5 }
  }

  const testo = String(it ?? '')
  const dominio = domini[forma(ns, percorso)]
  const discriminatore =
    testo === de && testo === fr && RE_DISCRIMINATORE.test(testo) && dominio && dominio.size > 0

  return {
    ...base,
    tipo: discriminatore ? 'enum' : 'testo',
    enum_valori: discriminatore ? [...dominio].sort() : undefined,
    variabili: estrai(testo, RE_VAR, true),
    tag: estrai(testo, RE_TAG_APERTO, false),
    obbligatoria: testo !== '',
    // Spazio per respirare (il tedesco è più lungo dell'italiano), ma non
    // abbastanza per incollare un romanzo dentro l'etichetta di un pulsante.
    max_caratteri: Math.max(120, Math.ceil(testo.length * 3)),
  }
}

// ── Dove si vede, questa sezione ────────────────────────────────────────────
// Le rotte pubbliche sono /:lang/..., quindi l'anteprima porta la lingua giusta.
const ROTTE = {
  home: '', per_avvocati: '/avvocati', per_fiduciari: '/fiduciari',
  per_progettisti: '/progettisti', contatti: '/contatti',
  privacy: '/privacy', termini: '/termini',
  common: '', comp_footer: '', lex_ai: '', archivio_demo: '', lex_demo: '',
}

/** L'indirizzo dove guardare le modifiche non ancora salvate. null se non c'è. */
export function rottaAnteprima(ns, lingua = 'it') {
  if (ns === 'auth') return '/registrati?testi_bozza=1'
  if (!(ns in ROTTE)) return null
  return `/${lingua}${ROTTE[ns]}?testi_bozza=1`
}
