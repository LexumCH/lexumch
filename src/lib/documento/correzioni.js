// src/lib/documento/correzioni.js
//
// 08-10-2026: «Correggi un dettaglio» nei documenti scritti da Lex (versione CH di quella IT). La funzione
// lex-correggi-documento (gratis) risponde solo con le sostituzioni «trova → sostituisci»; qui si applicano al
// testo. I messaggi d'errore della funzione arrivano nella lingua dell'utente (x-lingua).

import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { applicaSostituzioni } from './testoDocumento'

/** @returns {Promise<{ testo: string, applicate: number, scartate: number, messaggio: string }>} */
export async function correggiDocumento({ testo, richiesta, lingua, messaggioErrore }) {
    const { data, error } = await supabase.functions.invoke('lex-correggi-documento', {
        headers: { 'x-lingua': lingua },
        body: { testo, richiesta },
    })
    if (error) {
        let corpo = null
        try { corpo = await error.context?.json?.() } catch { corpo = null }
        throw new Error(sanitizzaErrore(corpo?.error, messaggioErrore) ?? messaggioErrore)
    }
    if (!data?.ok) throw new Error(sanitizzaErrore(data?.error, messaggioErrore) ?? messaggioErrore)
    const esito = applicaSostituzioni(testo, data.sostituzioni)
    return { ...esito, scartate: (data.scartate ?? 0) + (data.sostituzioni?.length ?? 0) - esito.applicate, messaggio: data.messaggio ?? '' }
}
