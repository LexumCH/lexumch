// src/lib/istituzioni.js
// ─────────────────────────────────────────────────────────────
// Etichette dei nomi-istituzione svizzeri (tribunali, autorità emittenti,
// camere cantonali) centralizzate e multilingua.
// Le LABEL vivono in public/locales/<lng>/istituzioni.json (namespace 'istituzioni',
// precaricato in src/i18n/index.js). Qui sta solo la LOGICA (ordine, parsing, fallback).
//
// Uso nelle pagine:
//   import { useTranslation } from 'react-i18next'
//   import { labelFonteGiur, labelFontePrassi } from '@/lib/istituzioni'
//   const { t: tIst } = useTranslation('istituzioni')
//   labelFonteGiur(fonte, tIst)
// ─────────────────────────────────────────────────────────────

// Ordine di visualizzazione delle fonti federali (giurisprudenza) in Banca Dati.
export const FONTI_FEDERALI_ORDER = [
    'TF', 'CH_BGE', 'TAF', 'TPF', 'CH_BPATG', 'CH_WEKO', 'CH_EDOEB',
    'CH_VB', 'CH_BUNDESRAT', 'CH_UNIBE', 'TA_SST', 'MISC_UPLOAD',
]
export const SET_FEDERALI = new Set(FONTI_FEDERALI_ORDER)

// Da 'CANT_XX' o 'CANT_XX_YYY' → { cantone, camera }
export function parseCantonale(fonte) {
    const m = (fonte || '').match(/^CANT_([A-Z]{2})(?:_(.+))?$/)
    if (!m) return { cantone: null, camera: null }
    return { cantone: m[1], camera: m[2] ?? null }
}

// Label di una singola fonte federale per codice (t = useTranslation('istituzioni'))
export function labelFonteFederale(code, t) {
    return t(`fonti.${code}`, { defaultValue: code })
}

// Label di una camera cantonale per codice (fallback = codice grezzo)
export function labelCamera(code, t) {
    if (!code) return ''
    return t(`camere.${code}`, { defaultValue: code })
}

// Label completa di una fonte giurisprudenza: federale oppure 'CANT_XX_camera'.
export function labelFonteGiur(fonte, t) {
    if (!fonte) return '—'
    const fed = t(`fonti.${fonte}`, { defaultValue: '' })
    if (fed) return fed
    const m = /^CANT_([A-Z]{2})_(.+)$/.exec(fonte)
    if (m) return `${m[1]} · ${t(`camere.${m[2]}`, { defaultValue: m[2] })}`
    return fonte
}

// emittente_nome è una stringa lunga (a volte trilingue): prende il primo segmento utile.
export function troncaEmittente(nome) {
    if (!nome) return ''
    const primo = nome.split(/[\/|;]/)[0].trim()
    return primo.length > 60 ? primo.slice(0, 60) + '…' : primo
}

// Label di una fonte prassi: emittente federale oppure fisco cantonale.
// p = { fonte, cantone?, emittente_nome? }
export function labelFontePrassi(p, t) {
    if (!p) return '—'
    if (p.fonte === 'fisco_cant') {
        const base = t('fisco_cant')
        return p.cantone ? `${base} · ${p.cantone}` : base
    }
    const e = t(`emittenti.${p.fonte}`, { defaultValue: '' })
    if (e) return e
    return p.emittente_nome ? troncaEmittente(p.emittente_nome) : (p.fonte ?? '—')
}
