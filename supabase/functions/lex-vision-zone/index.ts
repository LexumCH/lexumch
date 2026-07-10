// ═══════════════════════════════════════════════════════════════
// lex-vision-zone  (LEXUM CH)
// Interpretazione VISION delle zone di dettaglio non verificate.
//
// CORSIA IN QUARANTENA: il motore deterministico marca "zona non verificata";
// /api/rendi_zone (Vercel, deterministico) ne ritaglia il PNG; QUESTA funzione
// mostra il ritaglio a un modello vision (default Opus 4.8) che dice COSA
// contiene (es. "dettaglio rampa scala, indicata scala 1:20") — SENZA misurare,
// SENZA verificare quote, SENZA verdetti di conformità. L'output è puramente
// descrittivo, etichettato in UI "Interpretazione AI — non misurata".
//
// Guard sull'output: tipo da enum chiuso, scala nel formato 1:N o null,
// lunghezze massime, niente linguaggio di conformità (fail-closed → scarto).
// Cache in progetto_disegni.zone_dettaglio.interpretazioni[lingua]
// (invalidata su cambio disegno/lingua/modello). Log in lex_logs.
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Default Opus 4.8: il compito è vision su disegni tecnici, il valore sta
// nella qualità dell'interpretazione. Overridabile per A/B (es. claude-sonnet-5).
const MODEL_VISION = Deno.env.get('VISION_ZONE_MODEL') ?? 'claude-opus-4-8'
const MAX_TOKENS = 1200

type Lingua = 'it' | 'de' | 'fr'
function linguaSicura(l: any): Lingua {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}
const NOME_LINGUA: Record<Lingua, string> = {
  it: 'ITALIANO', de: 'TEDESCO (Deutsch)', fr: 'FRANCESE (Français)',
}

const TIPI_AMMESSI = new Set([
  'dettaglio_costruttivo', 'scala', 'serramento', 'locale_tecnico',
  'bagno', 'legenda', 'sezione', 'altro',
])

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
      p_endpoint: 'vision_zone', p_azione: p.azione ?? null,
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

// Guard: l'interpretazione è DESCRITTIVA. Linguaggio di conformità/verdetto
// (it/de/fr) → scarto dell'item (fail-closed), mai mostrato. Pattern ancorati
// per non colpire parole legittime (conformazione, autorisation, conformément).
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
function descrizioneAmmessa(s: string): boolean {
  if (!s) return false
  if (/[«»“”„"]/.test(s)) return false
  return !RE_VERDETTO.test(s)
}

const SYSTEM_VISION = `Sei l'assistente vision di Lexum per studi di progettazione svizzeri. Ricevi il RITAGLIO di una tavola tecnica (pianta) che il motore deterministico NON ha potuto verificare: il tuo compito è dire COSA contiene, per orientare il progettista.

REGOLE FERREE:
1. DESCRIVI SOLTANTO ciò che è visibile nel ritaglio. Non dedurre ciò che non si vede.
2. NON misurare, NON verificare quote, NON confrontare valori, NON esprimere giudizi di conformità o regolarità. Sono compiti del motore deterministico o del progettista.
3. Se nel ritaglio è INDICATA una scala (es. "1:20" scritto nel disegno), riportala in "scala_indicata". Se non è scritta, null — MAI dedurla dalle dimensioni.
4. Se il ritaglio è illeggibile o ambiguo, dillo ("leggibile": false) invece di tirare a indovinare.
5. Niente virgolette di citazione nel testo.

Per OGNI immagine ricevuta (nell'ordine), un elemento in "zone".
Rispondi con UN SOLO oggetto JSON:
{"zone":[{"idx":<indice immagine da 0>,"tipo":"dettaglio_costruttivo|scala|serramento|locale_tecnico|bagno|legenda|sezione|altro","scala_indicata":"1:N o null","titolo":"<max 8 parole nella lingua richiesta>","descrizione":"<2-3 frasi nella lingua richiesta: cosa si vede e cosa dovrebbe controllare a mano il progettista>","leggibile":true|false}]}`

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

    // Auth + proprietà
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
      .select('id, stato_analisi, zone_dettaglio, updated_at')
      .eq('id', disegno_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (dErr) throw new Error(dErr.message)
    if (!disegno) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno non trovato o non accessibile' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const crops = disegno.zone_dettaglio?.crops
    // Solo i ritagli 'zona' vanno interpretati dall'AI: quelli 'finding'/'porta'
    // sono ancore visive deterministiche mostrate direttamente in UI.
    const itemsZona = ((crops?.items ?? []) as any[]).filter(it => (it.tipo ?? 'zona') === 'zona')
    if (!crops || crops.fonte_updated_at !== disegno.updated_at || !itemsZona.length) {
      // I ritagli vanno generati prima da /api/rendi_zone (deterministico).
      return new Response(JSON.stringify({ ok: false, error: 'crops_mancanti' }),
        { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Cache
    const cache = disegno.zone_dettaglio?.interpretazioni?.[lingua] ?? null
    if (!forza && cache && cache.fonte_updated_at === disegno.updated_at && cache.modello === MODEL_VISION) {
      return new Response(JSON.stringify({ ok: true, cached: true, interpretazione: cache }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Scarica i ritagli (service role) e componi il messaggio vision.
    // Cap numerico e dimensionale: il jsonb è manipolabile dal client.
    const items = itemsZona.slice(0, 6)
    const MAX_BLOB = 4 * 1024 * 1024
    const contenuto: any[] = []
    for (const it of items) {
      const path = String(it.path ?? '')
      // SICUREZZA: il path arriva da un jsonb scrivibile dal client, ma il download
      // usa il service role → confinare al prefisso dell'utente (anti cross-tenant).
      if (!path.startsWith(`${user.id}/`)) throw new Error('path ritaglio fuori dal prefisso utente')
      const { data: blob, error: sErr } = await supabase.storage.from('disegni').download(path)
      if (sErr || !blob) throw new Error(`download ritaglio: ${sErr?.message ?? 'vuoto'}`)
      if (blob.size > MAX_BLOB) throw new Error('ritaglio oltre il limite dimensionale')
      const buf = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      const CHUNK = 32768
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
      }
      contenuto.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: btoa(bin) },
      })
    }
    contenuto.push({
      type: 'text',
      text: `LINGUA RICHIESTA per titolo e descrizione: ${NOME_LINGUA[lingua]}.\n` +
        `Ricevi ${items.length} ritaglio/i di zone che il motore non ha potuto verificare ` +
        `(cluster di quote a scala non riconosciuta). Descrivi cosa contengono secondo le regole.`,
    })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_VISION, max_tokens: MAX_TOKENS,
        system: SYSTEM_VISION,
        messages: [{ role: 'user', content: contenuto }],
      }),
    })
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`)
    const j = await resp.json()
    const parsed = estraiJson(j.content?.[0]?.text ?? '')

    // Guard + normalizzazione (enum chiuso, formato scala, lunghezze, anti-verdetto)
    const zoneAi: any[] = parsed?.zone ?? []
    const byIdx: Record<number, any> = {}
    for (const z of zoneAi) if (typeof z?.idx === 'number') byIdx[z.idx] = z
    const interpretati = items.map((it: any) => {
      const z = byIdx[it.idx] ?? {}
      const tipo = TIPI_AMMESSI.has(z.tipo) ? z.tipo : 'altro'
      const scala = (typeof z.scala_indicata === 'string' && /^1:\d{1,4}$/.test(z.scala_indicata.trim()))
        ? z.scala_indicata.trim() : null
      const titolo = String(z.titolo ?? '').slice(0, 80)
      const descrizione = String(z.descrizione ?? '').slice(0, 500)
      const ok = descrizioneAmmessa(descrizione) && titolo.length > 0
      return {
        idx: it.idx,
        tipo: ok ? tipo : 'altro',
        scala_indicata: ok ? scala : null,
        titolo: ok ? titolo : null,
        descrizione: ok ? descrizione : null,
        leggibile: ok ? (z.leggibile !== false) : false,
      }
    })

    const record = {
      modello: MODEL_VISION,
      lingua,
      generato_il: new Date().toISOString(),
      fonte_updated_at: disegno.updated_at,
      items: interpretati,
    }

    // Merge su lettura FRESCA (riduce a ~ms la finestra di race con rendi_zone
    // o altre lingue; il residuo è comunque coperto dal check fonte_updated_at).
    const { data: rowFresca } = await supabase
      .from('progetto_disegni').select('zone_dettaglio').eq('id', disegno.id).maybeSingle()
    const zdFresco = rowFresca?.zone_dettaglio ?? disegno.zone_dettaglio ?? {}
    const nuovo = {
      ...zdFresco,
      interpretazioni: { ...(zdFresco.interpretazioni ?? {}), [lingua]: record },
    }
    const { error: uErr } = await supabase
      .from('progetto_disegni').update({ zone_dettaglio: nuovo }).eq('id', disegno.id)
    if (uErr) throw new Error(`salvataggio interpretazione: ${uErr.message}`)

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: `vision_${lingua}`,
      modello: MODEL_VISION,
      token_input: j.usage?.input_tokens ?? 0, token_output: j.usage?.output_tokens ?? 0,
      durata_ms: Date.now() - t0, esito: 'ok', principali_count: interpretati.length,
      metadati: { disegno_id, lingua, zone: items.length },
    })

    return new Response(JSON.stringify({ ok: true, cached: false, interpretazione: record }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await logLexCall({
      user_id: userIdEsterno, request_id: requestId, modello: MODEL_VISION,
      esito: 'error', errore: String(err?.message ?? err).slice(0, 500),
      durata_ms: Date.now() - t0,
    })
    return new Response(JSON.stringify({ ok: false, error: 'interpretazione non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
