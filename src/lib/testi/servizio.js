// src/lib/testi/servizio.js
//
// Tutto ciò che il pannello "Testi" fa verso il database e verso Storage.
//
// Il gesto è UNO SOLO: salvi, e la frase va online. Non esiste un secondo
// passaggio di pubblicazione: ogni salvataggio ricompone l'overlay della sua
// lingua e lo carica subito.

import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'
import { aggiornaOverlayLocale } from '@/i18n/overlay'
import {
  LINGUE, NS_VETRINA, appiattisci, ricomponi, classifica,
  costruisciDomini, etichettaNs, gruppoNs, ordineNs,
} from './forma'

const SECONDI_CACHE = '30'   // quanto la rete tiene in memoria l'overlay

/** Carica su Storage l'overlay di una lingua e lo applica anche qui, subito. */
async function pubblica(lingua, mappa) {
  const corpo = new Blob([JSON.stringify(mappa ?? {})], { type: 'application/json' })
  const { error } = await supabase.storage
    .from('testi')
    .upload(`overlay/${lingua}.json`, corpo, {
      upsert: true, contentType: 'application/json', cacheControl: SECONDI_CACHE,
    })
  if (error) throw new Error(`Salvato nel database, ma non è arrivato online: ${error.message}`)
  aggiornaOverlayLocale(i18n, lingua, mappa ?? {})
}

/** Salva una frase e la manda online. */
export async function salvaFrase(chiaveId, lingua, valore, vistoIl) {
  const { data, error } = await supabase.rpc('testi_salva', {
    p_chiave_id: chiaveId, p_lingua: lingua, p_valore: valore, p_visto_il: vistoIl,
  })
  if (error) throw new Error(error.message)
  await pubblica(lingua, data?.overlay ?? {})
  return data?.visto ?? null
}

/** Riporta una frase al testo che sta nel codice. */
export async function ripristinaFrase(chiaveId, lingua) {
  const { data, error } = await supabase.rpc('testi_ripristina', {
    p_chiave_id: chiaveId, p_lingua: lingua,
  })
  if (error) throw new Error(error.message)
  await pubblica(lingua, data?.overlay ?? {})
  return { visto: data?.visto ?? null, valore: data?.valore ?? '' }
}

/** L'interruttore generale: spento, il sito torna all'ultimo deploy. */
export async function impostaAttivo(attivo) {
  const { data, error } = await supabase.rpc('testi_imposta_attivo', { p_attivo: attivo })
  if (error) throw new Error(error.message)
  for (const l of LINGUE) await pubblica(l, data?.[l] ?? {})
}

/**
 * Rilegge i testi dal codice (i file /locales già serviti da questo deploy) e
 * riallinea il catalogo. Le modifiche fatte dal pannello NON vengono toccate:
 * si sposta solo la base sotto di loro.
 */
export async function sincronizzaDalCodice(elencoNs, avanzamento) {
  const corpus = {}
  let fatti = 0

  for (const ns of elencoNs) {
    const per = {}
    for (const l of LINGUE) {
      const r = await fetch(`/locales/${l}/${ns}.json`, { cache: 'no-cache' })
      if (!r.ok) throw new Error(`Non trovo /locales/${l}/${ns}.json`)
      per[l] = appiattisci(await r.json())
    }
    corpus[ns] = per
    avanzamento?.(++fatti, elencoNs.length, `lettura ${ns}`)
  }

  const domini = costruisciDomini(corpus)
  const esito = { nuove: 0, base_aggiornata: 0, modifiche_tenute: 0, sparite: 0 }
  fatti = 0

  for (const ns of elencoNs) {
    const it = corpus[ns].it
    const voci = Object.keys(it).map((percorso, i) =>
      classifica(ns, percorso, i, it[percorso], corpus[ns].de[percorso],
                 corpus[ns].fr[percorso], domini))

    const { data, error } = await supabase.rpc('testi_sincronizza_ns', {
      p_ns: ns, p_etichetta: etichettaNs(ns), p_gruppo: gruppoNs(ns),
      p_ordine: ordineNs(ns), p_voci: voci,
    })
    if (error) throw new Error(`${ns}: ${error.message}`)
    for (const k of Object.keys(esito)) esito[k] += data?.[k] ?? 0
    avanzamento?.(++fatti, elencoNs.length, `scrittura ${ns}`)
  }

  // Dopo una sincronizzazione l'overlay può essere cambiato (frasi spente,
  // basi riallineate): lo si ricompone e si ricarica.
  for (const l of LINGUE) {
    const { data } = await supabase.rpc('testi_overlay', { p_lingua: l })
    await pubblica(l, data ?? {})
  }
  return esito
}

/**
 * Scarica un file unico con TUTTI i testi correnti, pronto per essere riversato
 * nei file del repo con `node scripts/testi-applica.mjs <file>`.
 *
 * Serve perché i file restano la base che Google indica e che si vede se il
 * database non risponde: se invecchiano, peggiorano entrambe le cose.
 */
export async function esportaFile() {
  const { data, error } = await supabase.rpc('testi_tutti')
  if (error) throw new Error(error.message)

  const per = {}
  for (const r of data ?? []) {
    ;(per[r.ns] ??= []).push(r)
  }
  const fuori = { it: {}, de: {}, fr: {} }
  for (const [ns, righe] of Object.entries(per)) {
    righe.sort((a, b) => a.ordine - b.ordine)
    for (const l of LINGUE) {
      fuori[l][ns] = ricomponi(righe.map(r => ({ percorso: r.percorso, valore: r[l] })))
    }
  }

  const blob = new Blob([JSON.stringify(fuori, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lexum-testi.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  await supabase.rpc('testi_segna_export')
  return Object.keys(per).length
}

export const TUTTI_NS_VETRINA = NS_VETRINA
