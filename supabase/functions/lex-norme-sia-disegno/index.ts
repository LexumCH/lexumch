// ═══════════════════════════════════════════════════════════════
// lex-norme-sia-disegno  (LEXUM CH)
// Ponte disegno ↔ NORME TECNICHE SIA — modello BYO-license.
//
// Le norme SIA sono sotto licenza: Lexum NON le possiede. È il progettista
// che carica le SUE norme SIA licenziate nel proprio archivio privato
// (categoria con chiave 'norme_sia'); questa funzione le recupera via
// retrieval semantico e le fa collidere col disegno.
//
// PRINCIPIO (identico a lex-normativa-cantonale): l'AI SELEZIONA e SPIEGA,
// il codice VERIFICA. Nessun verdetto viene dall'AI, e — cruciale per la
// licenza — l'AI non inventa MAI testo di norma: cita solo requisiti presenti
// nei chunk realmente recuperati dai documenti del progettista.
//   - Retrieval (CODICE): embedding del profilo-disegno → cerca_archivio_simili_cat
//     ristretta alla categoria SIA del titolare. Zero AI se non ci sono norme.
//   - Stage AI (Sonnet): dato il profilo del progetto e i PASSAGGI recuperati
//     (testo licenziato del progettista), spiega quali requisiti applicare a
//     questa pianta e classifica la verificabilità.
//     GUARD: ogni numero della prosa è sottoinsieme di (passaggi + profilo);
//     niente citazioni testuali (virgolette vietate).
//   - Verifica deterministica (CODICE): solo larghezze aperture vs soglia in
//     metri/cm presente VERBATIM nel passaggio → conforme; resto da_verificare.
//
// Fa parte del bundle "Analizza" (1 credito): gate = consumoRecente, nessun
// credito extra. Cache in progetto_disegni.esiti_sia, invalidata su cambio
// disegno / lingua / modello / impronta dell'archivio SIA.
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MODEL_SIA = Deno.env.get('NORME_SIA_MODEL') ?? 'claude-sonnet-5'
const EMBED_MODEL = 'text-embedding-3-small'
const MATCH_THRESHOLD = 0.42
const MATCH_COUNT = 12
const MAX_NORME = 10
const CHIAVE_CATEGORIA_SIA = 'norme_sia'

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

// ─── lex_logs (inline) ───────────────────────────────────────────
async function logLexCall(p: Record<string, any>): Promise<void> {
  try {
    await supabase.rpc('lex_logs_insert', {
      p_user_id: p.user_id ?? null, p_studio_id: null,
      p_request_id: p.request_id, p_parent_log_id: null,
      p_endpoint: 'norme_sia', p_azione: p.azione ?? null,
      p_domanda: p.domanda ?? null, p_conversazione_id: null,
      p_modello: p.modello, p_token_input: p.token_input ?? 0,
      p_token_output: p.token_output ?? 0, p_token_cached: p.token_cached ?? 0,
      p_durata_ms: p.durata_ms ?? null, p_iterazioni: p.iterazioni ?? 1,
      p_tool_usati: null, p_esito: p.esito ?? 'ok', p_errore: p.errore ?? null,
      p_qualita_retrieval: null, p_principali_count: p.principali_count ?? null,
      p_credito_scalato: false, p_metadati: p.metadati ?? null, p_risposta_text: null,
    })
  } catch (_) { /* il log non deve mai far fallire la richiesta */ }
}

// ─── Guard anti-invenzione (identico a lex-normativa-cantonale) ─────
function estraiNumeri(s: string): Set<string> {
  const out = new Set<string>()
  if (!s) return out
  const m = s.match(/\d+(?:['’]\d{3})*(?:[.,]\d+)?/g) ?? []
  for (let tok of m) {
    tok = tok.replace(/['’]/g, '').replace(',', '.')
    if (tok.includes('.')) tok = tok.replace(/0+$/, '').replace(/\.$/, '')
    if (tok) out.add(tok)
  }
  return out
}
function prosaValida(aiText: string, fonte: string): boolean {
  if (!aiText) return false
  if (/[«»“”„"]/.test(aiText)) return false
  const src = estraiNumeri(fonte)
  for (const n of estraiNumeri(aiText)) if (!src.has(n)) return false
  return true
}
function sogliaConUnitaNelTesto(s: number, testo: string): boolean {
  const forme = [s.toFixed(2)]
  if (Math.abs(Math.round(s * 10) - s * 10) < 1e-9) forme.push(s.toFixed(1))
  for (const f of forme) {
    const re = new RegExp(`(?<![\\d.,])${f.replace('.', '[.,]')}\\s*m(?![\\w²³])`, 'i')
    if (re.test(testo)) return true
  }
  const cm = Math.round(s * 100)
  return new RegExp(`(?<![\\d.,])${cm}\\s*cm(?![\\w²³])`, 'i').test(testo)
}
function estraiJson(raw: string): any | null {
  const i = raw.indexOf('{'), j = raw.lastIndexOf('}')
  if (i < 0 || j < 0 || j < i) return null
  try { return JSON.parse(raw.slice(i, j + 1)) } catch { return null }
}

// Lasciapassare pagato (identico alle altre funzioni del bundle): il lavoro AI
// gira solo dopo un consumo credito loggato server-side negli ultimi 15 minuti.
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
    if (!d || d === disegnoId) return 'ok'
  }
  return 'assente'
}

// ─── Misure dal gemello (convenzione svizzera: '1.60' m, '90' cm) ──
function parseValore(t: any): number | null {
  const s = String(t ?? '').trim()
  if (!s) return null
  if (s.includes('.')) { const v = parseFloat(s); return isNaN(v) ? null : v }
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n / 100
}
function larghezzeAperture(gemello: any): number[] {
  const testi = gemello?.quote?.testi ?? []
  return testi
    .filter((t: any) => t.stato === 'altezza_apertura' && t.abbinata_a)
    .map((t: any) => parseValore(t.abbinata_a))
    .filter((v: any) => v != null && v > 0.3 && v < 4) as number[]
}

// ─── Frasi deterministiche (CODICE, mai AI) ─────────────────────
const FRASI: Record<Lingua, Record<string, (n: number, min: string, s: string) => string>> = {
  it: {
    ok: (n, min, s) => `Verifica sulla tavola: ${n} aperture lette, larghezza minima ${min} m ≥ soglia ${s} m.`,
    ko: (n, min, s) => `Verifica sulla tavola: ${n} aperture lette, larghezza minima ${min} m < soglia ${s} m.`,
    nodata: () => `Nessuna larghezza di apertura leggibile su questa tavola: verifica manuale.`,
    fallback: () => `Requisito tecnico pertinente per questo progetto; vedi il testo della tua norma.`,
  },
  de: {
    ok: (n, min, s) => `Prüfung am Plan: ${n} gelesene Öffnungen, kleinste Breite ${min} m ≥ Grenzwert ${s} m.`,
    ko: (n, min, s) => `Prüfung am Plan: ${n} gelesene Öffnungen, kleinste Breite ${min} m < Grenzwert ${s} m.`,
    nodata: () => `Keine lesbare Öffnungsbreite auf diesem Plan: manuelle Prüfung erforderlich.`,
    fallback: () => `Technische Anforderung relevant für dieses Projekt; siehe Ihren Normtext.`,
  },
  fr: {
    ok: (n, min, s) => `Vérification sur le plan : ${n} ouvertures lues, largeur minimale ${min} m ≥ seuil ${s} m.`,
    ko: (n, min, s) => `Vérification sur le plan : ${n} ouvertures lues, largeur minimale ${min} m < seuil ${s} m.`,
    nodata: () => `Aucune largeur d'ouverture lisible sur ce plan : vérification manuelle.`,
    fallback: () => `Exigence technique pertinente pour ce projet ; voir le texte de votre norme.`,
  },
}

// ─── Prompt AI ──────────────────────────────────────────────────
const SYSTEM_ANALISI = `Sei un assistente tecnico per progettisti svizzeri. Ricevi il profilo di un progetto (destinazione, locali e misure estratti da una pianta) e alcuni PASSAGGI di norme tecniche (testo delle norme SIA licenziate dal progettista, recuperati dal suo archivio). Per i requisiti PRESENTI nei passaggi che si applicano a questa pianta, scrivi nella LINGUA RICHIESTA una breve spiegazione operativa (2-3 frasi) di cosa deve controllare il progettista, e classifica DOVE si verifica.

REGOLE FERREE:
1. Usa SOLO i requisiti che compaiono nei PASSAGGI forniti. Non aggiungere norme, articoli o valori che non siano nel testo dato. Se un passaggio non contiene un requisito verificabile, ignoralo.
2. NON inventare numeri: ogni numero nella tua prosa deve comparire nei PASSAGGI o nel profilo del progetto. Non arrotondare, non convertire.
3. NON citare testualmente la norma (niente virgolette «» “” "): il testo lo mostra il sistema dal documento del progettista.
4. NON esprimere verdetti di conformità (mai "conforme"/"non conforme"): la verifica la fa il sistema o il progettista.
5. "verificabilita" — DOVE si verifica; scegli il bucket PIÙ preciso: "pianta" (locali, superfici, larghezze aperture sulla pianta), "sezione" (altezze libere, altezza di piano — serve la sezione), "planimetria" (distanze, accessi esterni — serve la planimetria di situazione), "documentazione" (calcoli, concetti, procedure — serve altra documentazione), "regolamento_comunale" (valori specifici di zona).
6. "soglia_larghezza_m": SOLO se il passaggio fissa esplicitamente una larghezza minima in metri o centimetri per porte/uscite/passaggi, riporta il valore in metri copiato dal testo (es. 0.80). Altrimenti null.
7. "fonte_idx": l'indice [n] del passaggio da cui hai tratto il requisito.

Rispondi con UN SOLO oggetto JSON:
{"norme":[{"titolo":"<breve etichetta del requisito, max 8 parole>","verifica":"<prosa nella lingua richiesta>","verificabilita":"pianta|sezione|planimetria|documentazione|regolamento_comunale","soglia_larghezza_m":<numero o null>,"fonte_idx":<n>}]}
Massimo ${'${MAX}'} elementi, i più pertinenti. Se nessun passaggio contiene requisiti applicabili, rispondi {"norme":[]}.`

async function generaEmbedding(testo: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: testo.slice(0, 8000) }),
  })
  const data = await res.json()
  if (!data.data?.[0]?.embedding) {
    throw new Error(`OpenAI: ${JSON.stringify(data.error ?? data).slice(0, 200)}`)
  }
  return data.data[0].embedding
}

async function chiamaSonnet(system: string, user: string, maxTokens: number) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL_SIA, max_tokens: maxTokens,
      system, messages: [{ role: 'user', content: user }],
    }),
  })
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`)
  const j = await resp.json()
  return {
    parsed: estraiJson(j.content?.[0]?.text ?? ''),
    tokIn: j.usage?.input_tokens ?? 0,
    tokOut: j.usage?.output_tokens ?? 0,
  }
}

function jsonOut(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

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
    if (!disegno_id) return jsonOut({ ok: false, error: 'disegno_id obbligatorio' }, 400)

    // Auth
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } }
    const user = userData?.user
    if (!user) return jsonOut({ ok: false, error: 'utente non autenticato' }, 401)
    userIdEsterno = user.id

    // Disegno di proprietà, analisi completata
    const { data: disegno, error: dErr } = await supabase
      .from('progetto_disegni')
      .select('id, nome_file, stato_analisi, gemello, esiti_sia, updated_at, progetto_id')
      .eq('id', disegno_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (dErr) throw new Error(dErr.message)
    if (!disegno) return jsonOut({ ok: false, error: 'disegno non trovato o non accessibile' }, 404)
    if (disegno.stato_analisi !== 'completata' || !disegno.gemello) {
      return jsonOut({ ok: false, error: 'analisi non completata' }, 400)
    }

    // Titolare (scope archivio) e categoria SIA del progettista
    const { data: prof } = await supabase
      .from('profiles').select('titolare_id').eq('id', user.id).maybeSingle()
    const titolareId = prof?.titolare_id ?? user.id

    const { data: catSia } = await supabase
      .from('categorie_archivio')
      .select('id')
      .eq('titolare_id', titolareId)
      .eq('chiave', CHIAVE_CATEGORIA_SIA)
      .maybeSingle()

    // Documenti SIA verificati (impronta per invalidare la cache su nuovi upload)
    let docSia: any[] = []
    if (catSia?.id) {
      const { data } = await supabase
        .from('archivio_documenti')
        .select('id, titolo, updated_at')
        .eq('categoria_id', catSia.id)
        .eq('verificato', true)
      docSia = data ?? []
    }

    // Nessuna norma SIA caricata / indicizzata → short-circuit GRATIS (no AI, no embedding).
    if (!catSia?.id || docSia.length === 0) {
      return jsonOut({
        ok: true, cached: false,
        esiti_sia: { disponibile: false, lingua, modello: MODEL_SIA, norme: [], fonti: [], generato_il: new Date().toISOString() },
      })
    }

    const impronta = `${docSia.length}:${docSia.map(d => d.updated_at).sort().slice(-1)[0] ?? ''}`

    // Cache valida?
    const cache = disegno.esiti_sia || null
    if (!forza && cache && cache.disponibile && cache.fonte_updated_at === disegno.updated_at &&
        cache.lingua === lingua && cache.modello === MODEL_SIA && cache.impronta === impronta) {
      return jsonOut({ ok: true, cached: true, esiti_sia: cache })
    }

    // Lavoro AI solo dopo consumo pagato (gate).
    const cons = await consumoRecente(user.id, disegno_id)
    if (cons !== 'ok') {
      return jsonOut({ ok: false, error: cons === 'assente' ? 'consumo_mancante' : 'gate non disponibile' },
        cons === 'assente' ? 402 : 500)
    }

    // ── Profilo progetto dal gemello (fonte per i guard) ──
    const { data: progetto } = await supabase
      .from('progetti').select('destinazione, nome').eq('id', disegno.progetto_id).maybeSingle()
    const gemello = disegno.gemello
    const locali = (gemello?.locali ?? []) as any[]
    const supTot = locali.reduce((s, r) => s + (r.superficie_bf_m2 ?? 0), 0)
    const aperture = larghezzeAperture(gemello)
    const safe = (v: any, max = 120) => String(v ?? '').replace(/[`\r\n]/g, ' ').slice(0, max)

    let profilo = (progetto?.destinazione ? `Destinazione: ${safe(progetto.destinazione, 80)}\n` : '')
    profilo += `Tavola: ${safe(disegno.nome_file)} (pianta di piano)\n`
    profilo += `Locali riconosciuti: ${locali.length} — superficie BF totale ${supTot.toFixed(2)} m²\n`
    for (const r of locali.slice(0, 40)) {
      profilo += `- ${safe(r.nome, 60) || '(senza nome)'}${r.superficie_bf_m2 ? ` · ${r.superficie_bf_m2.toFixed(2)} m²` : ''}\n`
    }
    if (aperture.length) {
      profilo += `Larghezze aperture lette (m): ${aperture.map(v => v.toFixed(2)).join(', ')}\n`
    }

    // ── Retrieval sull'archivio SIA del progettista ──
    const queryTxt =
      `Requisiti tecnici costruttivi per: ${safe(progetto?.destinazione, 80) || 'edificio'}. ` +
      `Locali: ${locali.slice(0, 20).map(r => safe(r.nome, 40)).filter(Boolean).join(', ')}. ` +
      `Requisiti da verificare su pianta e sezione: altezze libere dei locali, larghezze di porte e passaggi, ` +
      `superfici minime e illuminazione naturale, accessibilità senza barriere architettoniche, servizi igienici, ` +
      `sicurezza, vie di fuga, isolamento termico e acustico.`
    const embedding = await generaEmbedding(queryTxt)

    const { data: chunks, error: rErr } = await supabase.rpc('cerca_archivio_simili_cat', {
      query_embedding: embedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
      p_titolare_id: titolareId,
      p_categoria_id: catSia.id,
    })
    if (rErr) throw new Error(`retrieval SIA: ${rErr.message}`)

    const titoloById: Record<string, string> = {}
    for (const d of docSia) titoloById[d.id] = d.titolo

    const passaggi = (chunks ?? []).slice(0, MATCH_COUNT)
    if (passaggi.length === 0) {
      // Norme presenti ma nessuna corrispondenza semantica: onesto, e cachiamo.
      const rec = {
        disponibile: true, lingua, modello: MODEL_SIA, impronta,
        generato_il: new Date().toISOString(), fonte_updated_at: disegno.updated_at,
        norme: [], fonti: docSia.map(d => ({ titolo: d.titolo })),
      }
      await supabase.from('progetto_disegni').update({ esiti_sia: rec }).eq('id', disegno.id)
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: 'retrieval_vuoto', modello: MODEL_SIA,
        durata_ms: Date.now() - t0, esito: 'ok', principali_count: 0,
        metadati: { disegno_id, docs_sia: docSia.length, chunks: 0 },
      })
      return jsonOut({ ok: true, cached: false, esiti_sia: rec })
    }

    // ── Corpo passaggi (numerati) → guard fonte = testo passaggi + profilo ──
    let corpo = `LINGUA RICHIESTA per "verifica": ${NOME_LINGUA[lingua]}\n\n# PROFILO PROGETTO\n${profilo}\n# PASSAGGI DALLE TUE NORME SIA\n`
    passaggi.forEach((p: any, i: number) => {
      const t = titoloById[p.documento_id] ?? 'Norma SIA'
      corpo += `\n--- [${i}] (da: ${safe(t, 80)})\n${safe(p.testo_chunk, 1500)}\n`
    })
    const fonteGuard = passaggi.map((p: any) => p.testo_chunk ?? '').join('\n') + '\n' + profilo

    let ana = await chiamaSonnet(SYSTEM_ANALISI.replace('${MAX}', String(MAX_NORME)), corpo, 4000)
    if (!ana.parsed) ana = await chiamaSonnet(SYSTEM_ANALISI.replace('${MAX}', String(MAX_NORME)), corpo, 4000)
    const grezze: any[] = (ana.parsed?.norme ?? []).slice(0, MAX_NORME)

    // ── Composizione esiti: verdetti SOLO dal codice ──
    const F = FRASI[lingua]
    const minAp = aperture.length ? Math.min(...aperture) : null
    const norme = grezze.map((x: any) => {
      const idx = typeof x?.fonte_idx === 'number' ? x.fonte_idx : -1
      const p = passaggi[idx] ?? null
      const fonteTitolo = p ? (titoloById[p.documento_id] ?? null) : null
      const verificaAi = prosaValida(String(x.verifica ?? ''), fonteGuard) ? String(x.verifica) : F.fallback(0, '', '')
      const vb = ['pianta', 'sezione', 'planimetria', 'regolamento_comunale', 'documentazione'].includes(x.verificabilita)
        ? x.verificabilita : 'documentazione'

      let esito = vb === 'pianta' ? 'da_verificare' : 'non_verificabile'
      let verifica = verificaAi
      const sRaw = x.soglia_larghezza_m
      const s = (typeof sRaw === 'number' && sRaw > 0.3 && sRaw < 4) ? sRaw : null
      const testoFonte = p ? String(p.testo_chunk ?? '') : ''
      if (s != null && vb === 'pianta' && sogliaConUnitaNelTesto(s, testoFonte)) {
        if (minAp != null) {
          const sopra = minAp >= s
          esito = sopra ? 'conforme' : 'da_verificare'
          verifica = `${verificaAi} ${sopra ? F.ok(aperture.length, minAp.toFixed(2), s.toFixed(2)) : F.ko(aperture.length, minAp.toFixed(2), s.toFixed(2))}`
        } else {
          esito = 'da_verificare'
          verifica = `${verificaAi} ${F.nodata(0, '', '')}`
        }
      }

      const titolo = safe(x.titolo, 90) || (lingua === 'de' ? 'Technische Anforderung' : lingua === 'fr' ? 'Exigence technique' : 'Requisito tecnico')
      return {
        esito,
        titolo,
        verifica,
        verificabilita: vb,
        fonte: fonteTitolo,
        origine: 'sia_byo',
      }
    })

    const record = {
      disponibile: true, lingua, modello: MODEL_SIA, impronta,
      generato_il: new Date().toISOString(), fonte_updated_at: disegno.updated_at,
      norme, fonti: docSia.map(d => ({ titolo: d.titolo })),
    }
    await supabase.from('progetto_disegni').update({ esiti_sia: record }).eq('id', disegno.id)

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: 'analisi', modello: MODEL_SIA,
      token_input: ana.tokIn, token_output: ana.tokOut,
      durata_ms: Date.now() - t0, esito: 'ok', principali_count: norme.length,
      metadati: { disegno_id, docs_sia: docSia.length, chunks: passaggi.length, norme: norme.length },
    })

    return jsonOut({ ok: true, cached: false, esiti_sia: record })

  } catch (err: any) {
    await logLexCall({
      user_id: userIdEsterno, request_id: requestId, modello: MODEL_SIA,
      esito: 'error', errore: String(err?.message ?? err).slice(0, 500), durata_ms: Date.now() - t0,
    })
    return jsonOut({ ok: false, error: 'analisi SIA non disponibile' }, 500)
  }
})
