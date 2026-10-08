// src/lib/documento/caricaDatiCompilazione.js
//
// 08-10-2026: «Compila con i dati di una pratica / di un mandato» (versione CH di quella IT). Le letture si
// fanno qui, nel browser, con l'accesso dell'utente: ognuno vede solo pratiche, clienti e controparti che vede
// già nel gestionale. I valori non lasciano il browser: alla funzione lex-compila-documento vanno solo le
// chiavi dei dati presenti e il ruolo delle parti; risponde con i modelli e qui diventano testo.

import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { datiDaPratica, datiDaMandato, applicaAbbinamenti, MAX_CONTROPARTI } from './datiCompilazione'
import { testoNumerato } from './testoDocumento'

const COLONNE_CLIENTE = 'tipo_soggetto, nome, cognome, ragione_sociale, numero_avs, uid, data_nascita, luogo_nascita, indirizzo, numero_civico, cap, citta, cantone, sede_legale, email, telefono, rappr_nome, rappr_cognome, rappr_avs, rappr_carica, iban'
const COLONNE_CONTROPARTE = 'tipo_soggetto, ruolo, nome, cognome, ragione_sociale, numero_avs, uid, data_nascita, luogo_nascita, indirizzo, cap, citta, cantone, sede_legale, rappresentante_legale, rappr_nome, rappr_cognome, rappr_avs, rappr_carica, email, telefono, legale_nome, legale_cognome, legale_cantone_albo, legale_albo'
const CLIENTE_BREVE = 'cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)'

export function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? ''
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
}

// Le pratiche dell'avvocato come nella pagina Pratiche (le sue e, se è titolare di uno studio, quelle dei
// collaboratori), più quelle in cui è collaboratore
export async function elencoPratiche(messaggi) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error(messaggi.sessione)
    const [sotto, condivise] = await Promise.all([
        supabase.from('profiles').select('id').eq('titolare_id', user.id),
        supabase.from('pratica_collaboratori').select('pratica_id').eq('avvocato_id', user.id),
    ])
    const ids = [user.id, ...(sotto.data ?? []).map((r) => r.id)]
    const condiviseIds = (condivise.data ?? []).map((r) => r.pratica_id)
    let q = supabase.from('pratiche').select(`id, titolo, stato, updated_at, ${CLIENTE_BREVE}`)
    q = condiviseIds.length ? q.or(`avvocato_id.in.(${ids.join(',')}),id.in.(${condiviseIds.join(',')})`) : q.in('avvocato_id', ids)
    const { data, error } = await q.order('updated_at', { ascending: false }).limit(200)
    if (error) throw new Error(messaggi.lettura)
    return data ?? []
}

// I mandati del fiduciario come nel Banco di lavoro
export async function elencoMandati(messaggi) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error(messaggi.sessione)
    const { data, error } = await supabase
        .from('mandati')
        .select(`id, titolo, stato, anno_riferimento, updated_at, ${CLIENTE_BREVE}`)
        .eq('avvocato_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(200)
    if (error) throw new Error(messaggi.lettura)
    return data ?? []
}

async function clienteDi(id) {
    if (!id) return { data: null }
    return supabase.from('profiles').select(COLONNE_CLIENTE).eq('id', id).maybeSingle()
}

export async function datiPratica(id, { profilo, lingua, titoloAvvocato, messaggi }) {
    const { data: pratica, error } = await supabase.from('pratiche').select('id, titolo, tipo, cliente_id').eq('id', id).maybeSingle()
    if (error || !pratica) throw new Error(messaggi.non_trovata)
    const [cliente, controparti, udienze] = await Promise.all([
        clienteDi(pratica.cliente_id),
        supabase.from('controparti').select(COLONNE_CONTROPARTE).eq('pratica_id', id)
            .order('ordine', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }).limit(MAX_CONTROPARTI),
        supabase.from('udienze').select('data_ora, tribunale, sezione, giudice, stato').eq('pratica_id', id)
            .order('data_ora', { ascending: false }).limit(50),
    ])
    if ([cliente, controparti, udienze].some((r) => r.error)) throw new Error(messaggi.lettura)
    return datiDaPratica({ pratica, cliente: cliente.data, controparti: controparti.data ?? [], udienze: udienze.data ?? [], profilo, lingua, titoloAvvocato })
}

export async function datiMandato(id, { profilo, lingua, titoloAvvocato, messaggi }) {
    const { data: mandato, error } = await supabase.from('mandati').select('id, titolo, tipo, anno_riferimento, cliente_id').eq('id', id).maybeSingle()
    if (error || !mandato) throw new Error(messaggi.non_trovato_mandato)
    const cliente = await clienteDi(mandato.cliente_id)
    if (cliente.error) throw new Error(messaggi.lettura)
    return datiDaMandato({ mandato, cliente: cliente.data, profilo, lingua, titoloAvvocato })
}

/**
 * Chiede alla funzione quali segnaposto si completano con quali dati e mette i valori.
 * @returns {Promise<{ valori: Record<number,string>, gruppi: Array<{ segnaposto, valore, numeri }> }>}
 */
export async function abbinaSegnaposti({ ambito, numerati, segnaposti, dati, lingua, messaggi }) {
    const { data, error } = await supabase.functions.invoke('lex-compila-documento', {
        headers: { 'x-lingua': lingua },
        body: {
            ambito,
            testo: testoNumerato(numerati),
            segnaposti: segnaposti.map((s) => ({ n: s.n, testo: s.segnaposto })),
            campi: Object.keys(dati.valori),
            parti: dati.parti,
            tipo_pratica: dati.tipo,
            udienza: dati.udienza,
        },
    })
    if (error) {
        let corpo = null
        try { corpo = await error.context?.json?.() } catch { corpo = null }
        throw new Error(sanitizzaErrore(corpo?.error, messaggi.errore) ?? messaggi.errore)
    }
    if (!data?.ok) throw new Error(sanitizzaErrore(data?.error, messaggi.errore) ?? messaggi.errore)
    return applicaAbbinamenti(data.abbinamenti, dati.valori, segnaposti)
}
