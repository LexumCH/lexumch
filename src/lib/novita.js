// src/lib/novita.js
//
// Il blog «Novità» della vetrina: lo scrive l'admin, lo legge chiunque.
// Ogni articolo ha una riga per lingua (it, de, fr) con il suo indirizzo
// (/it/novita/<slug>, /de/novita/<slug>…); le versioni dello stesso articolo
// hanno lo stesso «gruppo». Le bozze restano invisibili fuori dall'admin (RLS).

import { supabase } from '@/lib/supabase'

const CAMPI_ELENCO = 'slug, lingua, gruppo, titolo, sommario, copertina_url, autore, categoria, pubblicato_il'
const CAMPI_ARTICOLO = `${CAMPI_ELENCO}, contenuto, instagram_url, tiktok_url, updated_at`

export const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export async function elencoNovita(lingua, limite = 60) {
    const { data } = await supabase
        .from('novita')
        .select(CAMPI_ELENCO)
        .eq('stato', 'pubblicato')
        .eq('lingua', lingua)
        .order('pubblicato_il', { ascending: false })
        .limit(limite)
    return data ?? []
}

// L'articolo nella lingua chiesta. Se lo slug è di un'altra lingua (per esempio
// dopo il cambio lingua dal menu), restituisce l'indirizzo della versione giusta.
export async function articoloDaSlug(lingua, slug) {
    const { data } = await supabase
        .from('novita')
        .select(CAMPI_ARTICOLO)
        .eq('stato', 'pubblicato')
        .eq('lingua', lingua)
        .eq('slug', slug)
        .maybeSingle()
    if (data) return { articolo: data }

    const { data: altre } = await supabase
        .from('novita')
        .select('gruppo')
        .eq('stato', 'pubblicato')
        .eq('slug', slug)
        .limit(1)
    const gruppo = altre?.[0]?.gruppo
    if (!gruppo) return { articolo: null }
    const { data: tradotto } = await supabase
        .from('novita')
        .select('slug')
        .eq('stato', 'pubblicato')
        .eq('gruppo', gruppo)
        .eq('lingua', lingua)
        .maybeSingle()
    return tradotto ? { vai: `/${lingua}/novita/${tradotto.slug}` } : { articolo: null }
}

// Le versioni pubblicate dello stesso articolo: { it: 'slug', de: 'slug', fr: 'slug' }
export async function versioniArticolo(gruppo) {
    const { data } = await supabase
        .from('novita')
        .select('lingua, slug')
        .eq('stato', 'pubblicato')
        .eq('gruppo', gruppo)
    return Object.fromEntries((data ?? []).map(r => [r.lingua, r.slug]))
}

// Senza autore l'articolo si firma Lexum.
export function firmaAutore(autore) {
    return autore?.trim() || 'Lexum'
}

export function fmtDataLunga(iso, lingua = 'it') {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(DATE_LOCALES[lingua] ?? 'it-CH', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Titolo → indirizzo dell'articolo. Il DB rifinisce comunque lo slug.
export function slugDa(titolo) {
    return (titolo ?? '')
        .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)
}
