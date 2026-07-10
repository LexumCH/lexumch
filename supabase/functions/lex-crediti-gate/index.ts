// ═══════════════════════════════════════════════════════════════
// lex-crediti-gate  (LEXUM CH)
// Gate + consumo crediti AI per il bundle "Analisi AI" del disegno
// (narrazione+checklist · normativa cantonale · vision zone/raster = 1 credito).
//
// Replica ESATTAMENTE la logica di lex-lead (verificaCrediti/scalaCredito):
//  - borsellino: prima riga di crediti_ai per created_at ascendente con
//    residui > 0 e periodo non scaduto; crediti_rimasti = somma dei residui validi
//  - consumo: update non atomico crediti_usati = usati_letti + 1 (stesso pattern
//    della piattaforma; il valore letto è di questa richiesta)
//  - esauriti → 402 { error: 'crediti_esauriti' }
//
// Body: { consuma?: boolean }  — con consuma=false verifica soltanto.
// Log in lex_logs (endpoint 'analisi_disegno_ai', credito_scalato sul consumo).
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function linguaSicura(l: any): string {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}

async function logLexCall(p: Record<string, any>): Promise<void> {
  try {
    await supabase.rpc('lex_logs_insert', {
      p_user_id: p.user_id ?? null, p_studio_id: null,
      p_request_id: p.request_id, p_parent_log_id: null,
      p_endpoint: 'analisi_disegno_ai', p_azione: p.azione ?? null,
      p_domanda: null, p_conversazione_id: null,
      p_modello: 'bundle', p_token_input: 0, p_token_output: 0, p_token_cached: 0,
      p_durata_ms: p.durata_ms ?? null, p_iterazioni: 1,
      p_tool_usati: null, p_esito: p.esito ?? 'ok', p_errore: p.errore ?? null,
      p_qualita_retrieval: null, p_principali_count: null,
      p_credito_scalato: p.credito_scalato ?? false,
      p_metadati: p.metadati ?? null, p_risposta_text: null,
    })
  } catch (_) { /* il log non deve mai far fallire la richiesta */ }
}

// Stessa selezione del borsellino di lex-lead: prima riga per created_at asc
// con residui e non scaduta; il totale è la somma dei residui validi.
async function verificaCrediti(userId: string) {
  const { data, error } = await supabase
    .from('crediti_ai')
    .select('id, crediti_totali, crediti_usati, tipo, periodo_fine')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error || !data) return { disponibili: false, crediti_rimasti: 0 }
  const now = new Date()
  for (const row of data) {
    const residui = row.crediti_totali - row.crediti_usati
    const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
    if (residui > 0 && !scaduto) {
      const totaleResidui = data.reduce((acc, r) => {
        const res = r.crediti_totali - r.crediti_usati
        const isScaduto = r.periodo_fine && new Date(r.periodo_fine) < now
        return acc + (res > 0 && !isScaduto ? res : 0)
      }, 0)
      return {
        disponibili: true, crediti_rimasti: totaleResidui,
        crediti_row_id: row.id, crediti_usati: row.crediti_usati,
      }
    }
  }
  return { disponibili: false, crediti_rimasti: 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const t0 = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json().catch(() => ({}))
    const consuma = body.consuma === true
    const rimborsa = body.rimborsa === true

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } }
    const user = userData?.user
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'utente non autenticato' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── RIMBORSO — ANCORATO AI LOG (lex_logs è scritto SOLO dal service role:
    // le colonne di progetto_disegni sono client-writable e NON fidabili per il
    // denaro). Si rimborsa solo se: (1) esiste un CONSUMO loggato recente per
    // questo disegno; (2) NESSUN narra riuscito dopo quel consumo (= il bundle
    // ha davvero fallito); (3) nessun rimborso già emesso dopo quel consumo.
    // Il riaccredito va sulla STESSA riga di crediti_ai del consumo.
    if (rimborsa) {
      const disegnoId = String(body.disegno_id ?? '')
      const lingua = linguaSicura(body.lingua)
      if (!disegnoId) {
        return new Response(JSON.stringify({ ok: false, error: 'disegno_id obbligatorio' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      // (1) consumo pagato negli ultimi 30 minuti per questo disegno
      const { data: consumi, error: cErr } = await supabase
        .from('lex_logs')
        .select('id, created_at, metadati')
        .eq('endpoint', 'analisi_disegno_ai')
        .eq('azione', 'consumo')
        .eq('user_id', user.id)
        .eq('credito_scalato', true)
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .contains('metadati', { disegno_id: disegnoId })
        .order('created_at', { ascending: false })
        .limit(1)
      if (cErr) {
        // fail-closed: su un guard di denaro un errore di query non apre nulla
        return new Response(JSON.stringify({ ok: false, error: 'gate non disponibile' }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      const consumo = (consumi ?? [])[0]
      if (!consumo) {
        return new Response(JSON.stringify({ ok: false, error: 'consumo_mancante' }),
          { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      // (2) il bundle NON deve essere riuscito: nessun narra ok dopo il consumo
      const { data: successi, error: nErr } = await supabase
        .from('lex_logs')
        .select('id')
        .eq('endpoint', 'narra_disegno')
        .eq('esito', 'ok')
        .eq('user_id', user.id)
        .gte('created_at', consumo.created_at)
        .contains('metadati', { disegno_id: disegnoId })
        .limit(1)
      if (nErr) {
        return new Response(JSON.stringify({ ok: false, error: 'gate non disponibile' }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      if ((successi ?? []).length > 0) {
        return new Response(JSON.stringify({ ok: false, error: 'analisi_presente' }),
          { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      // (3) idempotenza: un solo rimborso per consumo
      const { data: rimborsi, error: rErr } = await supabase
        .from('lex_logs')
        .select('id')
        .eq('endpoint', 'analisi_disegno_ai')
        .eq('azione', 'rimborso')
        .eq('user_id', user.id)
        .gte('created_at', consumo.created_at)
        .contains('metadati', { disegno_id: disegnoId })
        .limit(1)
      if (rErr) {
        return new Response(JSON.stringify({ ok: false, error: 'gate non disponibile' }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      if ((rimborsi ?? []).length > 0) {
        return new Response(JSON.stringify({ ok: false, error: 'rimborso_recente' }),
          { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
      // (4) riaccredito sulla riga del consumo, con esito verificato
      const rowId = consumo.metadati?.crediti_row_id ?? null
      let rimborsato = false
      if (rowId) {
        const { data: r } = await supabase
          .from('crediti_ai')
          .select('id, crediti_usati')
          .eq('id', rowId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (r && r.crediti_usati > 0) {
          const { data: upd } = await supabase
            .from('crediti_ai')
            .update({ crediti_usati: r.crediti_usati - 1 })
            .eq('id', r.id)
            .eq('crediti_usati', r.crediti_usati)
            .select('id')
          rimborsato = (upd ?? []).length > 0
        }
      }
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: 'rimborso',
        esito: 'ok', credito_scalato: false, durata_ms: Date.now() - t0,
        metadati: { disegno_id: disegnoId, lingua, riaccreditato: rimborsato },
      })
      return new Response(JSON.stringify({ ok: true, rimborsato }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const info = await verificaCrediti(user.id)
    if (!info.disponibili) {
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: consuma ? 'consumo' : 'verifica',
        esito: 'no_credits', errore: 'Crediti esauriti', durata_ms: Date.now() - t0,
      })
      return new Response(JSON.stringify({ ok: false, error: 'crediti_esauriti' }),
        { status: 402, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    let rimasti = info.crediti_rimasti
    if (consuma) {
      // Come scalaCredito in lex-lead, ma con check ottimistico (.eq su
      // crediti_usati letti): due consumi concorrenti non si perdono più.
      let scalato = false
      let corrente: any = info
      for (let tentativo = 0; tentativo < 2 && !scalato; tentativo++) {
        const { data: upd, error: sErr } = await supabase
          .from('crediti_ai')
          .update({ crediti_usati: (corrente.crediti_usati ?? 0) + 1 })
          .eq('id', corrente.crediti_row_id)
          .eq('crediti_usati', corrente.crediti_usati ?? 0)
          .select('id')
        if (sErr) {
          console.log(JSON.stringify({ evento: 'scala_credito_error', errore: sErr.message, request_id: requestId }))
          break
        }
        if ((upd ?? []).length > 0) { scalato = true; break }
        // riga modificata da un consumo concorrente: rileggi e riprova una volta
        const again = await verificaCrediti(user.id)
        if (!again.disponibili) {
          await logLexCall({
            user_id: user.id, request_id: requestId, azione: 'consumo',
            esito: 'no_credits', errore: 'Crediti esauriti (concorrenza)', durata_ms: Date.now() - t0,
          })
          return new Response(JSON.stringify({ ok: false, error: 'crediti_esauriti' }),
            { status: 402, headers: { ...CORS, 'Content-Type': 'application/json' } })
        }
        corrente = again
      }
      if (scalato) {
        rimasti = (corrente.crediti_rimasti ?? info.crediti_rimasti) - 1
        console.log(JSON.stringify({ evento: 'credito_scalato', user_id: user.id, request_id: requestId }))
      }
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: 'consumo',
        esito: 'ok', credito_scalato: scalato, durata_ms: Date.now() - t0,
        // disegno_id + crediti_row_id sono l'ANCORA del rimborso e il lasciapassare
        // delle funzioni AI (consumoRecente): senza, il bundle non parte.
        metadati: {
          crediti_rimasti: rimasti,
          disegno_id: String(body.disegno_id ?? '') || null,
          crediti_row_id: (corrente as any)?.crediti_row_id ?? null,
        },
      })
    }

    return new Response(JSON.stringify({ ok: true, crediti_rimasti: rimasti }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: 'gate non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
