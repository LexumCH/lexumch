// src/lib/archivio.js
//
// Spazio dell'archivio (02-10-2026, come su Lexum IT). Lo calcola il DB
// (archivio_spazio): è la stessa regola che il server applica quando si carica
// un file, quindi la pagina e il server non possono dare numeri diversi.
//
// Regole:
//  · privati (ruolo 'user'): 50 MB gratuiti; con il Piano Personale +2 GB
//    finché il piano è attivo. L'archivio resta scrivibile anche senza piano.
//  · professionisti: GB del piano + pacchetti; a piano scaduto sola lettura.

import { supabase, invocaLex } from '@/lib/supabase'

export const MB = 1024 * 1024
export const GB = 1024 * MB

const LOCALI = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// Indirizzi dell'archivio e degli acquisti: i privati stanno sotto /area
export function rottaArchivio(ruolo) {
    return ruolo === 'user' ? '/area/archivio' : '/archivio'
}
export function rottaAcquisti(ruolo) {
    return ruolo === 'user' ? '/area/acquista' : '/studio?tab=acquista'
}

export async function leggiSpazioArchivio(titolareId) {
    const { data, error } = await supabase.rpc('archivio_spazio', { p_titolare: titolareId })
    if (error) throw error
    const r = Array.isArray(data) ? data[0] : data
    const quota = Number(r?.quota_bytes ?? 0)
    const usati = Number(r?.usati_bytes ?? 0)
    return {
        quota,
        usati,
        liberi: Math.max(0, quota - usati),
        pianoAttivo: !!r?.piano_attivo,
        scrivibile: !!r?.scrivibile,
        ruolo: r?.ruolo ?? null,
    }
}

// "48 MB", "1.5 GB", "2 GB" — con il separatore decimale della lingua
export function formattaSpazio(bytes, lingua = 'it') {
    const b = Number(bytes ?? 0)
    const numero = n => new Intl.NumberFormat(LOCALI[lingua] ?? 'it-CH', { maximumFractionDigits: 1 }).format(n)
    if (b >= GB) return `${numero(Math.round((b / GB) * 10) / 10)} GB`
    if (b >= MB) return `${Math.round(b / MB)} MB`
    if (b > 0) return `${Math.max(1, Math.round(b / 1024))} KB`
    return '0 MB'
}

// Gli errori del server ridotti a una chiave da tradurre (avv_archivio → errori.*)
export function codiceErroreArchivio(err) {
    const m = `${err?.message ?? ''} ${err?.hint ?? ''} ${err?.error ?? ''}`
    if (/archivio_spazio_esaurito|spazio dell'archivio esaurito/i.test(m)) return 'server_spazio_esaurito'
    if (/archivio_sola_lettura|sola lettura/i.test(m)) return 'server_sola_lettura'
    // La policy di storage rifiuta il file quando lo spazio è finito
    if (/row-level security|violates|unauthorized/i.test(m)) return 'server_rifiutato'
    return 'server_generico'
}

// ─── Banca Dati: salva / scegli un documento (02-10-2026, come su IT) ───

// Lo studio a cui appartiene l'archivio: il titolare, oppure sé stessi
export function titolareDi(profile) {
    return profile?.titolare_id ?? profile?.id ?? null
}

// Perché non si può salvare (null = si può), come chiave da tradurre in
// avv_banca_dati → documento.blocco.*. `bytesNuovi`: quanto si vuole aggiungere.
export function bloccoArchivio(spazio, bytesNuovi = 0) {
    if (!spazio) return null
    if (!spazio.scrivibile) return { codice: 'sola_lettura' }
    if (spazio.quota <= 0) return { codice: 'senza_spazio' }
    if (spazio.usati + bytesNuovi > spazio.quota) {
        return bytesNuovi > 0 && spazio.usati < spazio.quota
            ? { codice: 'spazio_insufficiente', liberi: spazio.liberi, quota: spazio.quota }
            : { codice: 'spazio_esaurito' }
    }
    return null
}

export function tipoDaFile(file) {
    const ext = (file?.name?.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf' || file?.type === 'application/pdf') return 'pdf'
    if (ext === 'txt') return 'txt'
    return 'file'
}

// Errore con la chiave da tradurre (avv_archivio → errori.<codice>)
function erroreArchivio(err) {
    const e = new Error(err?.message ?? 'archivio')
    e.codice = codiceErroreArchivio(err)
    return e
}

// Salva un file nell'archivio dello studio. Se il testo è già stato letto
// (Banca Dati, dopo l'analisi) lo si passa: l'archivio lo indicizza senza
// rileggere il file né rifare l'OCR. In errore lancia un Error con `codice`.
export async function salvaInArchivio({ file, testo = null, titolareId, userId, categoriaId = null, titolo = null }) {
    const ext = (file.name.split('.').pop() || '').toLowerCase() || 'bin'
    const tipo = tipoDaFile(file)
    const path = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage.from('archivio').upload(path, file, {
        contentType: file.type || undefined,
    })
    if (upErr) throw erroreArchivio(upErr)

    const haTesto = typeof testo === 'string' && testo.trim().length > 0
    const { data: doc, error: dbErr } = await supabase
        .from('archivio_documenti')
        .insert({
            autore_id: userId,
            titolare_id: titolareId,
            categoria_id: categoriaId || null,
            tipo,
            titolo: titolo || file.name,
            storage_path: path,
            tipo_file: file.type || null,
            dimensione: file.size,
            tags: [],
            testo_estratto: haTesto ? testo : null,
            ocr_status: (haTesto || tipo === 'pdf' || tipo === 'txt') ? 'pending' : 'skipped',
            metadati: { origine: haTesto ? 'banca_dati' : 'caricamento' },
        })
        .select()
        .single()

    if (dbErr) {
        // Riga rifiutata (es. spazio finito col file appena caricato): niente file orfani
        await supabase.storage.from('archivio').remove([path]).catch(() => { })
        throw erroreArchivio(dbErr)
    }

    // fetch diretta (invocaLex): process-archivio ammette solo le intestazioni
    // authorization e content-type, e su CH non c'è un cron che recuperi i
    // documenti rimasti in attesa.
    if (doc.ocr_status === 'pending') {
        invocaLex('process-archivio', { documento_id: doc.id, usa_testo_presente: haTesto }).catch(() => { })
    }
    return doc
}

export async function leggiCategorieArchivio(titolareId) {
    const { data } = await supabase
        .from('categorie_archivio')
        .select('id, nome, colore')
        .eq('titolare_id', titolareId)
        .order('nome')
    return data ?? []
}

// Documenti dell'archivio già letti (si possono analizzare). Ricerca sul titolo
// lato server e massimo `limite` righe: niente elenchi da migliaia di righe.
export async function cercaDocumentiLetti({ titolareId, userId, cerca = '', categoriaId = '', limite = 50 }) {
    let q = supabase
        .from('archivio_documenti')
        .select('id, titolo, categoria_id, created_at, dimensione, ocr_status')
        .or(`titolare_id.eq.${titolareId},autore_id.eq.${userId}`)
        .eq('ocr_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limite)
    const testo = cerca.trim()
    if (testo) q = q.ilike('titolo', `%${testo.replace(/[%_,()]/g, ' ')}%`)
    if (categoriaId === 'senza') q = q.is('categoria_id', null)
    else if (categoriaId) q = q.eq('categoria_id', categoriaId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
}

// Quanti documenti sono ancora in lettura (per spiegare un elenco vuoto)
export async function contaDocumentiInLettura({ titolareId, userId }) {
    const { count } = await supabase
        .from('archivio_documenti')
        .select('id', { count: 'exact', head: true })
        .or(`titolare_id.eq.${titolareId},autore_id.eq.${userId}`)
        .in('ocr_status', ['pending', 'processing'])
    return count ?? 0
}
