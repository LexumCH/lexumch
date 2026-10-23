// src/lib/contabilitaDati.js
//
// 09-10-2026 (conto annuale CO): letture e errori comuni della contabilità in partita doppia.
//   - leggiMastro: tutte le righe del libro mastro di un cliente, a pagine. Il server ne restituisce al massimo
//     1000 per volta: senza pagine un cliente con molte registrazioni avrebbe un bilancio sbagliato senza
//     nessun avviso.
//   - codiceErroreContabilita: gli errori del database (esercizio chiuso, esercizi sovrapposti...) ridotti a un
//     codice da tradurre (comp_fid_report_contabili → errori_db.<codice>).

import { supabase } from '@/lib/supabase'

const SELEZIONE = 'id, data, tipo, righe:righe_registrazione(dare, avere, conto:conto_id(id, numero, nome, classe, tipo, posta_co))'

/** @returns {Promise<Array<{ data: string, tipo: string, dare: number, avere: number, c: object }>>} */
export async function leggiMastro(clienteId) {
    const out = []
    for (let da = 0; ; ) {
        const { data, error } = await supabase.from('registrazioni')
            .select(SELEZIONE)
            .eq('cliente_id', clienteId)
            .order('data', { ascending: true })
            .order('id', { ascending: true })
            .range(da, da + 999)
        if (error) throw error
        if (!data?.length) break
        for (const r of data) for (const rg of (r.righe ?? [])) {
            if (rg.conto) out.push({ data: r.data, tipo: r.tipo, dare: Number(rg.dare) || 0, avere: Number(rg.avere) || 0, c: rg.conto })
        }
        da += data.length
    }
    return out
}

const CODICI = [
    'ESERCIZIO_CHIUSO', 'ESERCIZIO_PRECEDENTE_APERTO', 'ESERCIZIO_GIA_CHIUSO', 'ESERCIZIO_SUCCESSIVO_CHIUSO',
    'ESERCIZIO_NON_CHIUSO', 'ESERCIZIO_INESISTENTE', 'ESERCIZI_SOVRAPPOSTI', 'ESERCIZIO_APERTO',
    'CONTO_2979_ASSENTE', 'PIANO_CONTI_ASSENTE', 'MOTIVO_OBBLIGATORIO', 'DATE_NON_VALIDE',
    'CONTO_ANNUALE_DEFINITIVO', 'DATI_MANCANTI', 'STATO_NON_VALIDO', 'NON_AUTORIZZATO',
]

export function codiceErroreContabilita(err) {
    const testo = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`
    const trovato = CODICI.find((c) => testo.includes(c))
    if (trovato) return trovato
    if (/esercizi_contabili_date_check|esercizi_contabili_cliente_inizio_key/.test(testo)) return 'DATE_NON_VALIDE'
    if (/conti_annuali_uno_per_esercizio/.test(testo)) return 'CONTO_ANNUALE_ESISTENTE'
    if (/permission denied|row-level security/i.test(testo)) return 'NON_AUTORIZZATO'
    return null
}

// Il periodo chiuso che ha fermato una scrittura (dettaglio «AAAA-MM-GG|AAAA-MM-GG» di ESERCIZIO_CHIUSO)
export function periodoErrore(err) {
    const [inizio, fine] = String(err?.details ?? '').split('|')
    return inizio && fine ? { inizio, fine } : null
}
