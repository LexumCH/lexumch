// ═══════════════════════════════════════════════════════════════
// lex-vision-raster  (LEXUM CH)
// Lettura VISION dei PDF scansionati/raster — che il motore vettoriale
// deterministico non può leggere (nessun layer OCG, nessuna geometria).
//
// CORSIA IN QUARANTENA DURA: la vision TRASCRIVE ciò che vede sulla tavola
// (cartiglio, scala indicata, nomi dei locali con superfici etichettate,
// quante quote sono visibili) — NON misura, NON verifica, NON produce esiti.
// Nulla di ciò che esce da qui entra in gemello/findings/esiti normativi.
// In UI tutto è etichettato "Lettura da immagine — minor affidabilità".
//
// Input: le tessere PNG generate da /api/rendi_pagina (deterministico).
// Guard: formato scala 1:N, cap su liste/lunghezze, anti-verdetto it/de/fr,
// path confinati al prefisso utente (il download usa il service role).
// Cache in progetto_disegni.lettura_raster.letture[lingua]. Log in lex_logs.
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MODEL_RASTER = Deno.env.get('VISION_RASTER_MODEL') ?? 'claude-opus-4-8'
const MAX_TOKENS = 2000
const MAX_LOCALI = 60

type Lingua = 'it' | 'de' | 'fr'
function linguaSicura(l: any): Lingua {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}
const NOME_LINGUA: Record<Lingua, string> = {
  it: 'ITALIANO', de: 'TEDESCO (Deutsch)', fr: 'FRANCESE (Français)',
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function logLexCall(p: Record<string, any>): Promise<void> {
  try {
    await supabase.rpc('lex_logs_insert', {
      p_user_id: p.user_id ?? null, p_studio_id: null,
      p_request_id: p.request_id, p_parent_log_id: null,
      p_endpoint: 'vision_raster', p_azione: p.azione ?? null,
      p_domanda: null, p_conversazione_id: null,
      p_modello: p.modello, p_token_input: p.token_input ?? 0,
      p_token_output: p.token_output ?? 0, p_token_cached: 0,
      p_durata_ms: p.durata_ms ?? null, p_iterazioni: 1,
      p_tool_usati: null, p_esito: p.esito ?? 'ok', p_errore: p.errore ?? null,
      p_qualita_retrieval: null, p_principali_count: p.principali_count ?? null,
      p_credito_scalato: false, p_metadati: p.metadati ?? null, p_risposta_text: null,
    })
  } catch (_) { /* il log non deve mai far fallire la richiesta */ }
}

function estraiJson(raw: string): any | null {
  const i = raw.indexOf('{'), j = raw.lastIndexOf('}')
  if (i < 0 || j < 0 || j < i) return null
  try { return JSON.parse(raw.slice(i, j + 1)) } catch { return null }
}

// Le funzioni AI del bundle esigono un CONSUMO pagato loggato server-side
// (lex_logs è scritto solo dal service role): senza questo lasciapassare,
// chiunque col proprio JWT otterrebbe il lavoro AI gratis. Fail-closed.
async function consumoRecente(userId: string, disegnoId: string): Promise<'ok' | 'assente' | 'errore'> {
  const { data, error } = await supabase
    .from('lex_logs')
    .select('metadati')
    .eq('endpoint', 'analisi_disegno_ai')
    .eq('azione', 'consumo')
    .eq('user_id', userId)
    .eq('credito_scalato', true)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(25)
  if (error) return 'errore'
  for (const r of (data ?? [])) {
    const d = (r as any).metadati?.disegno_id
    // null/assente = frontend PRE-tagging (build vecchia in transizione): accettato
    // finche' il nuovo frontend che tagga disegno_id non e' ovunque in produzione.
    if (!d || d === disegnoId) return 'ok'
  }
  return 'assente'
}

// Anti-verdetto (stessi pattern ancorati di lex-vision-zone): la lettura è
// trascrizione, mai giudizio di conformità.
const RE_VERDETTO = new RegExp([
  '\\bconform(e|i|it[àa]|it[ée])\\b',
  '\\bnon\\s+conform',
  '\\bkonform\\b', 'normkonform', 'normgerecht', 'vorschriftsm[äa]ssig',
  '\\b(un)?zul[äa]ssig\\b',
  'erf[üu]ll\\w*\\s+die\\s+(anforderung|vorschrift|norm)',
  'entspr\\w+\\s+de[rn]\\s+(norm|vorschrift|anforderung)',
  'rispett\\w*\\s+(i\\s+|le\\s+)?(requisit|norm|limit|prescrizion)',
  'soddisf\\w*\\s+(i\\s+)?requisit',
  '\\ba\\s+norma\\b',
  'respect\\w*\\s+(les\\s+)?(exigence|norme|prescription)',
  'r[ée]glementaire',
].join('|'), 'i')
function testoAmmesso(s: string): boolean {
  if (!s) return false
  if (/[«»“”„"]/.test(s)) return false
  return !RE_VERDETTO.test(s)
}

const SYSTEM_RASTER = `Sei l'assistente vision di Lexum per studi di progettazione svizzeri. Ricevi la PANORAMICA e le TESSERE (griglia riga/colonna) di una tavola tecnica SCANSIONATA che il motore deterministico non può leggere. Il tuo compito è TRASCRIVERE ciò che è visibile, per dare al progettista un orientamento.

REGOLE FERREE:
1. TRASCRIVI SOLTANTO ciò che leggi nell'immagine: etichette, nomi di locali, superfici SCRITTE, scala SCRITTA nel cartiglio. Copia i valori come sono scritti, senza convertirli né arrotondarli.
2. NON misurare nulla, NON verificare quote, NON esprimere giudizi di conformità o regolarità.
3. "scala_indicata": SOLO se è scritta sulla tavola (es. "1:50"). MAI dedotta.
4. Le superfici dei locali: SOLO se etichettate sulla tavola (riporta la stringa letta, es. "15.21 m2"); altrimenti null.
5. Se una parte è illeggibile, ometti — non tirare a indovinare. Niente virgolette di citazione.

La prima immagine è la panoramica; le successive sono le tessere in ordine di idx.
Rispondi con UN SOLO oggetto JSON:
{"titolo_tavola":"<dal cartiglio o null>","scala_indicata":"1:N o null","locali":[{"nome":"<etichetta letta>","superficie":"<stringa letta o null>"}],"quote_visibili":<stima intera del numero di quote visibili>,"descrizione":"<2-4 frasi nella lingua richiesta: cosa rappresenta la tavola e cosa si distingue>","leggibile":true|false}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const t0 = Date.now()
  const requestId = crypto.randomUUID()
  let userIdEsterno: string | null = null

  try {
    const body = await req.json().catch(() => ({}))
    const disegno_id = body.disegno_id
    const lingua = linguaSicura(body.lingua)
    const forza = body.forza === true
    if (!disegno_id) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno_id obbligatorio' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } }
    const user = userData?.user
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'utente non autenticato' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    userIdEsterno = user.id

    const { data: disegno, error: dErr } = await supabase
      .from('progetto_disegni')
      .select('id, lettura_raster, updated_at')
      .eq('id', disegno_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (dErr) throw new Error(dErr.message)
    if (!disegno) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno non trovato o non accessibile' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const tiles = disegno.lettura_raster?.tiles
    if (!tiles || tiles.fonte_updated_at !== disegno.updated_at || !(tiles.items ?? []).length) {
      return new Response(JSON.stringify({ ok: false, error: 'tiles_mancanti' }),
        { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const cache = disegno.lettura_raster?.letture?.[lingua] ?? null
    if (!forza && cache && cache.fonte_updated_at === disegno.updated_at && cache.modello === MODEL_RASTER) {
      return new Response(JSON.stringify({ ok: true, cached: true, lettura: cache }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Lavoro AI solo dopo un consumo pagato (gate) negli ultimi 15 minuti.
    const cons = await consumoRecente(user.id, disegno_id)
    if (cons !== 'ok') {
      return new Response(JSON.stringify({ ok: false, error: cons === 'assente' ? 'consumo_mancante' : 'gate non disponibile' }),
        { status: cons === 'assente' ? 402 : 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Scarica panoramica + tessere (path confinati al prefisso utente:
    // il jsonb è scrivibile dal client, il download usa il service role).
    // Cap numerico (1 panoramica + 8 tessere max) e dimensionale (4MB/blob):
    // il jsonb è manipolabile dal client, i tetti proteggono costi e memoria.
    const MAX_IMMAGINI = 9
    const MAX_BLOB = 4 * 1024 * 1024
    const MAX_TOTALE = 20 * 1024 * 1024  // budget cumulativo (limite API 32MB/richiesta)
    const percorsi = [tiles.overview_path, ...(tiles.items as any[]).map(x => x.path)].slice(0, MAX_IMMAGINI)
    const contenuto: any[] = []
    let byteTotali = 0
    for (const p of percorsi) {
      const path = String(p ?? '')
      if (!path.startsWith(`${user.id}/`)) throw new Error('path tessera fuori dal prefisso utente')
      const { data: blob, error: sErr } = await supabase.storage.from('disegni').download(path)
      if (sErr || !blob) throw new Error(`download tessera: ${sErr?.message ?? 'vuoto'}`)
      if (blob.size > MAX_BLOB) throw new Error('tessera oltre il limite dimensionale')
      byteTotali += blob.size
      if (byteTotali > MAX_TOTALE) throw new Error('tavola troppo pesante per la lettura vision')
      const buf = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      const CHUNK = 32768
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
      }
      contenuto.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: path.endsWith('.png') ? 'image/png' : 'image/jpeg',
          data: btoa(bin),
        },
      })
    }
    contenuto.push({
      type: 'text',
      text: `LINGUA RICHIESTA per la descrizione: ${NOME_LINGUA[lingua]}.\n` +
        `Prima immagine: panoramica della tavola. Seguono ${(tiles.items as any[]).length} tessere ` +
        `(griglia ${tiles.griglia?.[0] ?? '?'}×${tiles.griglia?.[1] ?? '?'}, in ordine di idx). Trascrivi secondo le regole.`,
    })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_RASTER, max_tokens: MAX_TOKENS,
        system: SYSTEM_RASTER,
        messages: [{ role: 'user', content: contenuto }],
      }),
    })
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`)
    const j = await resp.json()
    const parsed = estraiJson(j.content?.[0]?.text ?? '')
    if (!parsed) throw new Error('output vision non interpretabile')

    // Guard + normalizzazione: trascrizione pura, cap e formati.
    const scala = (typeof parsed.scala_indicata === 'string' && /^1:\d{1,4}$/.test(parsed.scala_indicata.trim()))
      ? parsed.scala_indicata.trim() : null
    const titolo = testoAmmesso(String(parsed.titolo_tavola ?? '')) ? String(parsed.titolo_tavola).slice(0, 120) : null
    const descrizione = testoAmmesso(String(parsed.descrizione ?? '')) ? String(parsed.descrizione).slice(0, 600) : null
    // superficie: whitelist di formato (numero + eventuale unità), non blacklist —
    // è testo AI mostrato in UI e deve poter essere SOLO una misura trascritta.
    const RE_SUPERFICIE = /^[\d.,'\s]{1,12}\s*(m2|m²|mq)?$/i
    const locali = (Array.isArray(parsed.locali) ? parsed.locali : [])
      .slice(0, MAX_LOCALI)
      .map((l: any) => {
        const sup = l?.superficie != null ? String(l.superficie).trim().slice(0, 20) : null
        return {
          nome: String(l?.nome ?? '').slice(0, 60),
          superficie: sup && RE_SUPERFICIE.test(sup) ? sup : null,
        }
      })
      .filter((l: any) => l.nome && testoAmmesso(l.nome))
    const quoteVisibili = Number.isFinite(parsed.quote_visibili)
      ? Math.max(0, Math.min(5000, Math.round(parsed.quote_visibili))) : null

    const record = {
      modello: MODEL_RASTER,
      lingua,
      generato_il: new Date().toISOString(),
      fonte_updated_at: disegno.updated_at,
      dati: {
        titolo_tavola: titolo,
        scala_indicata: scala,
        locali,
        quote_visibili: quoteVisibili,
        descrizione,
        // se il guard ha scartato sia titolo che descrizione, la lettura non è
        // presentabile: coerenza con lex-vision-zone (fail-closed → illeggibile)
        leggibile: (titolo || descrizione) ? parsed.leggibile !== false : false,
      },
    }

    // Merge su lettura FRESCA (come lex-vision-zone)
    const { data: rowFresca } = await supabase
      .from('progetto_disegni').select('lettura_raster').eq('id', disegno.id).maybeSingle()
    const lrFresco = rowFresca?.lettura_raster ?? disegno.lettura_raster ?? {}
    const nuovo = {
      ...lrFresco,
      letture: { ...(lrFresco.letture ?? {}), [lingua]: record },
    }
    const { error: uErr } = await supabase
      .from('progetto_disegni').update({ lettura_raster: nuovo }).eq('id', disegno.id)
    if (uErr) throw new Error(`salvataggio lettura: ${uErr.message}`)

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: `raster_${lingua}`,
      modello: MODEL_RASTER,
      token_input: j.usage?.input_tokens ?? 0, token_output: j.usage?.output_tokens ?? 0,
      durata_ms: Date.now() - t0, esito: 'ok', principali_count: locali.length,
      metadati: { disegno_id, lingua, tessere: (tiles.items as any[]).length },
    })

    return new Response(JSON.stringify({ ok: true, cached: false, lettura: record }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await logLexCall({
      user_id: userIdEsterno, request_id: requestId, modello: MODEL_RASTER,
      esito: 'error', errore: String(err?.message ?? err).slice(0, 500),
      durata_ms: Date.now() - t0,
    })
    return new Response(JSON.stringify({ ok: false, error: 'lettura non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
