// ═══════════════════════════════════════════════════════════════
// lex-normativa-cantonale  (LEXUM CH)
// Ponte disegno ↔ normativa edilizia CANTONALE (26 cantoni).
//
// PRINCIPIO (stesso di lex-narra-disegno): l'AI SELEZIONA e SPIEGA,
// il codice VERIFICA. Nessun verdetto viene dall'AI:
//   - Stage 1 (Sonnet): dato il profilo del progetto (cantone, locali, usi,
//     aperture) e l'INDICE degli articoli (num + rubrica) delle leggi edilizie
//     del cantone (allowlist curata), seleziona gli articoli pertinenti.
//     GUARD: ogni selezione deve esistere nell'indice — mai articoli inventati.
//   - Stage 2 (Sonnet): dato il testo integrale dei selezionati, spiega perché
//     sono pertinenti e classifica la verificabilità (pianta / planimetria di
//     situazione / regolamento comunale / documentazione). Se un articolo fissa
//     una larghezza minima esplicita per porte/passaggi, ne estrae la soglia.
//     GUARD: la soglia deve comparire VERBATIM nel testo di legge; i numeri
//     della prosa devono essere un sottoinsieme di (testo legge + profilo).
//   - Verifica deterministica (CODICE): solo larghezze aperture vs soglia →
//     conforme / non_conforme. Tutto il resto: da_verificare / non_verificabile.
//     Le soglie di superficie sono quasi sempre condizionali → mai verdetto auto.
//
// Il testo di legge mostrato viene SEMPRE dal DB (norme_cantonali_ch_articoli),
// nella lingua del cantone. Cache in progetto_disegni.esiti_cantonali
// (invalidata su cambio disegno/cantone/lingua/modello).
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MODEL_CANT = Deno.env.get('NORMATIVA_CANTONALE_MODEL') ?? 'claude-sonnet-5'
const MAX_SELEZIONI = 12

type Lingua = 'it' | 'de' | 'fr'
function linguaSicura(l: any): Lingua {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}
const NOME_LINGUA: Record<Lingua, string> = {
  it: 'ITALIANO', de: 'TEDESCO (Deutsch)', fr: 'FRANCESE (Français)',
}

// Allowlist curata degli atti edilizi per cantone (systematic_number reali,
// verificati sul DB — stessa fonte di src/lib/normativa-edilizia-cantonale.js;
// se aggiorni uno, aggiorna anche l'altro).
const NORME_EDILIZIA_CANTONALE: Record<string, string[]> = {
  AG: ['713.100', '713.121', '713.010'],
  AI: ['700.000', '700.010', '700.910'],
  AR: ['721.1', '721.11'],
  BE: ['721.0', '721.1', '721.2'],
  BL: ['400', '400.11', '149.72'],
  BS: ['730.100', '730.110', '730.115'],
  FR: ['710.1', '710.11', '710.7'],
  GE: ['L 5 05', 'L 5 05.01', 'L 5 05.06'],
  GL: ['VII B/1/1', 'VII B/1/4'],
  GR: ['801.100', '801.110'],
  JU: ['701.1'],
  LU: ['735', '736', '737'],
  NE: ['720.0', '720.1', '701.0', '720.5'],
  NW: ['611.1', '611.11', '611.2'],
  OW: ['710.1', '710.3'],
  SG: ['731.1', '731.11'],
  SH: ['700.100', '700.101', '700.110'],
  SO: ['711.1', '711.64'],
  SZ: ['400.100', '400.111'],
  TG: ['700', '700.1', '700.2'],
  TI: ['705.100', '705.110', '701.100', '701.110'],
  UR: ['40.1111', '40.1115', '40.1117'],
  VD: ['700.11', '700.11.1'],
  VS: ['705.1', '705.101'],
  ZG: ['721.11', '721.111', '721.7'],
  ZH: ['700.1'],
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── lex_logs (inline) ───────────────────────────────────────────
async function logLexCall(p: Record<string, any>): Promise<void> {
  try {
    await supabase.rpc('lex_logs_insert', {
      p_user_id: p.user_id ?? null, p_studio_id: null,
      p_request_id: p.request_id, p_parent_log_id: null,
      p_endpoint: 'normativa_cantonale', p_azione: p.azione ?? null,
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

// ─── Guard anti-invenzione (come lex-narra-disegno) ─────────────
// Un token per numero: niente spazi/virgole-elenco dentro il token, così
// "90, 120 e 140" dà tre numeri distinti e "cpv. 2 0.90" non li fonde.
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
// GUARD SEMANTICO soglia: valida SOLO se compare nel testo come MISURA con
// unità adiacente ("0,90 m" / "0.9 m" / "90 cm", non m²/m³), mai come numero
// qualsiasi (art. 90, 120 m², 30 giorni). Fail-closed su forme insolite.
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

// ─── Dati misurati dal gemello (stesse convenzioni del motore) ──
// '1.60' = metri, '90' = centimetri (convenzione svizzera dei disegni).
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

// ─── Frasi deterministiche (generate dal CODICE, mai dall'AI) ───
const FRASI: Record<Lingua, Record<string, (n: number, min: string, s: string) => string>> = {
  it: {
    ok: (n, min, s) => `Verifica sulla tavola: ${n} aperture lette, larghezza minima ${min} m ≥ soglia ${s} m.`,
    ko: (n, min, s) => `Verifica sulla tavola: ${n} aperture lette, larghezza minima ${min} m < soglia ${s} m.`,
    nodata: () => `Nessuna larghezza di apertura leggibile su questa tavola: verifica manuale.`,
    fallback: () => `Articolo selezionato come pertinente per questo progetto; vedi il testo della norma.`,
  },
  de: {
    ok: (n, min, s) => `Prüfung am Plan: ${n} gelesene Öffnungen, kleinste Breite ${min} m ≥ Grenzwert ${s} m.`,
    ko: (n, min, s) => `Prüfung am Plan: ${n} gelesene Öffnungen, kleinste Breite ${min} m < Grenzwert ${s} m.`,
    nodata: () => `Keine lesbare Öffnungsbreite auf diesem Plan: manuelle Prüfung erforderlich.`,
    fallback: () => `Artikel als relevant für dieses Projekt ausgewählt; siehe Normtext.`,
  },
  fr: {
    ok: (n, min, s) => `Vérification sur le plan : ${n} ouvertures lues, largeur minimale ${min} m ≥ seuil ${s} m.`,
    ko: (n, min, s) => `Vérification sur le plan : ${n} ouvertures lues, largeur minimale ${min} m < seuil ${s} m.`,
    nodata: () => `Aucune largeur d'ouverture lisible sur ce plan : vérification manuelle.`,
    fallback: () => `Article sélectionné comme pertinent pour ce projet ; voir le texte de la norme.`,
  },
}

// ─── Prompt ─────────────────────────────────────────────────────
const SYSTEM_SELEZIONE = `Sei un assistente di diritto edilizio svizzero per progettisti. Ricevi il profilo di un progetto (cantone, comune, destinazione, locali e misure estratti da una pianta di piano) e l'INDICE degli articoli delle leggi edilizie cantonali applicabili (numero + rubrica).

Seleziona SOLO dall'indice gli articoli che un progettista deve controllare per QUESTO progetto e QUESTA pianta: requisiti su locali, superfici, aperture, scale, igiene, sicurezza, procedura per la destinazione indicata. Escludi articoli su organi/procedure amministrative generiche, definizioni non pertinenti, disposizioni transitorie.

REGOLE FERREE:
- Puoi selezionare ESCLUSIVAMENTE combinazioni (sys, art) presenti nell'indice. Mai inventare numeri di articolo.
- Massimo ${'${MAX}'} selezioni, le più rilevanti.
- Rispondi con UN SOLO oggetto JSON: {"selezioni":[{"sys":"<systematic_number>","art":"<article_num>","motivo":"<max 12 parole>"}]}`

const SYSTEM_ANALISI = `Sei un assistente di diritto edilizio svizzero per progettisti. Per ogni articolo di legge fornito (testo integrale), scrivi nella LINGUA RICHIESTA una breve spiegazione operativa (2-3 frasi) del perché è pertinente per il progetto descritto e cosa deve controllare il progettista, e classifica DOVE si verifica.

REGOLE FERREE:
1. NON inventare numeri: ogni numero nella tua prosa deve comparire nel testo dell'articolo o nel profilo del progetto. Non arrotondare, non convertire.
2. NON citare testualmente la legge (niente virgolette «» “”): il testo ufficiale lo mostra il sistema.
3. NON esprimere verdetti di conformità (mai "conforme"/"non conforme"): la verifica la fa il sistema o il progettista.
4. "verificabilita" ∈ "pianta" (controllabile sulla pianta di piano: locali, superfici, aperture), "planimetria" (serve la planimetria di situazione: distanze, altezze, indici), "regolamento_comunale" (serve la Bauordnung/regolamento comunale), "documentazione" (serve altra documentazione: calcoli, concetti, autorizzazioni).
5. "soglia_larghezza_m": SOLO se l'articolo fissa esplicitamente una larghezza minima in metri o centimetri per porte/uscite/passaggi, riporta il valore in metri copiato dal testo (es. 0.90). Altrimenti null. Mai dedurla da altre grandezze.

Rispondi con UN SOLO oggetto JSON:
{"analisi":[{"sys":"...","art":"...","verifica":"<prosa nella lingua richiesta>","verificabilita":"pianta|planimetria|regolamento_comunale|documentazione","soglia_larghezza_m":<numero o null>}]}
Includi un elemento per OGNI articolo ricevuto.`

async function chiamaSonnet(system: string, user: string, maxTokens: number) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL_CANT, max_tokens: maxTokens,
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

    // Auth
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } }
    const user = userData?.user
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'utente non autenticato' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    userIdEsterno = user.id

    // Disegno di proprietà + progetto (per cantone e profilo)
    const { data: disegno, error: dErr } = await supabase
      .from('progetto_disegni')
      .select('id, nome_file, stato_analisi, gemello, esiti_cantonali, updated_at, progetto_id')
      .eq('id', disegno_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (dErr) throw new Error(dErr.message)
    if (!disegno) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno non trovato o non accessibile' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    if (disegno.stato_analisi !== 'completata' || !disegno.gemello) {
      return new Response(JSON.stringify({ ok: false, error: 'analisi non completata' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const { data: progetto } = await supabase
      .from('progetti')
      .select('cantone, comune, destinazione, zona_edificatoria, nome')
      .eq('id', disegno.progetto_id)
      .maybeSingle()
    const cantone = (progetto?.cantone || '').toUpperCase()
    if (!cantone || !NORME_EDILIZIA_CANTONALE[cantone]) {
      return new Response(JSON.stringify({ ok: false, error: 'cantone_non_impostato' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Cache valida?
    const cache = disegno.esiti_cantonali || null
    if (!forza && cache && cache.fonte_updated_at === disegno.updated_at &&
        cache.cantone === cantone && cache.lingua === lingua && cache.modello === MODEL_CANT) {
      return new Response(JSON.stringify({ ok: true, cached: true, esiti_cantonali: cache }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── Leggi edilizie del cantone (allowlist) + indice articoli ──
    const { data: leggi, error: lErr } = await supabase
      .from('norme_cantonali_ch')
      .select('id, systematic_number, abbreviation, title')
      .eq('canton', cantone)
      .in('systematic_number', NORME_EDILIZIA_CANTONALE[cantone])
      .eq('is_active', true)
    if (lErr) throw new Error(lErr.message)
    if (!leggi || leggi.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'nessuna legge edilizia trovata per il cantone' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const leggeById: Record<string, any> = {}
    for (const l of leggi) leggeById[l.id] = l

    // NB: PostgREST tronca a db-max-rows (default 1000); il cantone peggiore
    // oggi è BE con ~716 righe. Ordine deterministico + log se sfioriamo il cap.
    const { data: artIndex, error: aErr } = await supabase
      .from('norme_cantonali_ch_articoli')
      .select('norma_id, article_num, rubrica, lingua')
      .in('norma_id', leggi.map(l => l.id))
      .or('is_abrogato.is.null,is_abrogato.eq.false')
      .order('norma_id', { ascending: true })
      .order('article_num', { ascending: true })
      .limit(3000)
    if (aErr) throw new Error(aErr.message)
    if ((artIndex ?? []).length >= 1000) {
      console.log(JSON.stringify({ evento: 'indice_possibile_troncamento', cantone, righe: (artIndex ?? []).length }))
    }

    // Una lingua per legge: preferisci quella dell'utente, poi de/fr/it.
    const prefer: string[] = [lingua, 'de', 'fr', 'it']
    const linguaPerLegge: Record<string, string> = {}
    for (const l of leggi) {
      const presenti = new Set((artIndex ?? []).filter(a => a.norma_id === l.id).map(a => (a.lingua || '').trim()))
      linguaPerLegge[l.id] = prefer.find(x => presenti.has(x)) ?? [...presenti][0] ?? 'de'
    }
    const indice = (artIndex ?? []).filter(a => (a.lingua || '').trim() === linguaPerLegge[a.norma_id])

    // Chiave indice per il guard anti-allucinazione dello Stage 1.
    // La mappa conserva l'article_num CANONICO del DB: il fetch dello Stage 2 è
    // case-sensitive ("17A" ≠ "17a"), quindi mai usare la stringa dell'AI.
    const chiave = (sys: string, art: string) => `${sys}::${String(art).trim().toLowerCase()}`
    const indiceByKey: Record<string, { sys: string; article_num: string }> = {}
    for (const a of indice) {
      const sys = leggeById[a.norma_id].systematic_number
      indiceByKey[chiave(sys, a.article_num)] = { sys, article_num: a.article_num }
    }

    // ── Profilo progetto dal gemello (dati misurati → fonte per i guard) ──
    const gemello = disegno.gemello
    const locali = (gemello?.locali ?? []) as any[]
    const supTot = locali.reduce((s, r) => s + (r.superficie_bf_m2 ?? 0), 0)
    const aperture = larghezzeAperture(gemello)
    // Campi liberi dell'utente (nome file, comune, zona, destinazione, nomi locali):
    // sanitizzati prima di entrare nel prompt (anti prompt-injection).
    const safe = (v: any, max = 120) => String(v ?? '').replace(/[`\r\n]/g, ' ').slice(0, max)
    const nomeSafe = safe(disegno.nome_file)

    let profilo = `Cantone: ${cantone}` +
      (progetto?.comune ? ` · Comune: ${safe(progetto.comune, 60)}` : '') +
      (progetto?.zona_edificatoria ? ` · Zona: ${safe(progetto.zona_edificatoria, 60)}` : '') +
      (progetto?.destinazione ? ` · Destinazione: ${safe(progetto.destinazione, 60)}` : '') + `\n`
    profilo += `Tavola: ${nomeSafe} (pianta di piano)\n`
    profilo += `Locali riconosciuti: ${locali.length} — superficie BF totale ${supTot.toFixed(2)} m²\n`
    for (const r of locali.slice(0, 40)) {
      profilo += `- ${safe(r.nome, 60) || '(senza nome)'}${r.superficie_bf_m2 ? ` · ${r.superficie_bf_m2.toFixed(2)} m²` : ''}\n`
    }
    if (aperture.length) {
      profilo += `Larghezze aperture lette (m): ${aperture.map(v => v.toFixed(2)).join(', ')}\n`
    }

    // ── Stage 1: selezione articoli ──
    let indiceTxt = ''
    for (const l of leggi) {
      const arts = indice.filter(a => a.norma_id === l.id)
      indiceTxt += `\n## ${l.abbreviation ?? ''} — ${l.title} (sys ${l.systematic_number}) · ${arts.length} articoli\n`
      for (const a of arts) {
        indiceTxt += `${a.article_num}\t${(a.rubrica ?? '').slice(0, 90)}\n`
      }
    }
    const sel = await chiamaSonnet(
      SYSTEM_SELEZIONE.replace('${MAX}', String(MAX_SELEZIONI)),
      `# PROFILO PROGETTO\n${profilo}\n# INDICE ARTICOLI (uniche selezioni ammesse)\n${indiceTxt}\n\nSeleziona gli articoli pertinenti (max ${MAX_SELEZIONI}).`,
      1200,
    )
    const selezioniRaw: any[] = (sel.parsed?.selezioni ?? [])
    // GUARD: solo combinazioni esistenti nell'indice, dedup, cap.
    // La selezione viene rimappata sull'article_num canonico del DB.
    const viste = new Set<string>()
    const selezioni: { sys: string; art: string }[] = []
    for (const s of selezioniRaw) {
      const k = chiave(String(s.sys ?? ''), String(s.art ?? ''))
      const canon = indiceByKey[k]
      if (!canon || viste.has(k)) continue
      viste.add(k)
      selezioni.push({ sys: canon.sys, art: canon.article_num })
      if (selezioni.length >= MAX_SELEZIONI) break
    }

    if (selezioni.length === 0) {
      // Nessuna selezione valida: risposta onesta, MA cachiamo il record vuoto
      // (altrimenti ogni bundle ripaga la selezione e la UI resta al placeholder).
      const recordVuoto = {
        cantone, lingua, modello: MODEL_CANT,
        generato_il: new Date().toISOString(),
        fonte_updated_at: disegno.updated_at,
        esiti: [],
      }
      await supabase.from('progetto_disegni').update({ esiti_cantonali: recordVuoto }).eq('id', disegno.id)
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: `cantone_${cantone}`,
        modello: MODEL_CANT, token_input: sel.tokIn, token_output: sel.tokOut,
        durata_ms: Date.now() - t0, esito: 'ok', principali_count: 0,
        metadati: { cantone, lingua, disegno_id, fase: 'selezione_vuota', scartate: selezioniRaw.length },
      })
      return new Response(JSON.stringify({ ok: true, cached: false, esiti_cantonali: recordVuoto }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── Testi integrali dei selezionati (dal DB, lingua della legge) ──
    const sysToLegge: Record<string, any> = {}
    for (const l of leggi) sysToLegge[l.systematic_number] = l
    const articoliPieni: any[] = []
    for (const l of leggi) {
      const artNums = selezioni.filter(s => s.sys === l.systematic_number).map(s => s.art)
      if (!artNums.length) continue
      const { data: rows } = await supabase
        .from('norme_cantonali_ch_articoli')
        .select('norma_id, article_num, rubrica, testo, lingua')
        .eq('norma_id', l.id)
        .eq('lingua', linguaPerLegge[l.id])
        .in('article_num', artNums)
        .or('is_abrogato.is.null,is_abrogato.eq.false')
      for (const r of (rows ?? [])) articoliPieni.push({ ...r, sys: l.systematic_number })
    }

    // ── Stage 2: spiegazione + verificabilità + eventuale soglia ──
    let corpoAnalisi = `LINGUA RICHIESTA per "verifica": ${NOME_LINGUA[lingua]}\n\n# PROFILO PROGETTO\n${profilo}\n# ARTICOLI SELEZIONATI\n`
    for (const a of articoliPieni) {
      corpoAnalisi += `\n--- sys ${a.sys} · art ${a.article_num} · ${a.rubrica ?? ''}\n${(a.testo ?? '').slice(0, 3000)}\n`
    }
    const ana = await chiamaSonnet(SYSTEM_ANALISI, corpoAnalisi, 3000)
    const analisi: any[] = (ana.parsed?.analisi ?? [])
    const anaByKey: Record<string, any> = {}
    for (const x of analisi) anaByKey[chiave(String(x.sys ?? ''), String(x.art ?? ''))] = x

    // ── Composizione esiti: guard su prosa e soglia, verdetti SOLO dal codice ──
    const F = FRASI[lingua]
    const minAp = aperture.length ? Math.min(...aperture) : null
    const esiti = articoliPieni.map(a => {
      const l = sysToLegge[a.sys]
      const x = anaByKey[chiave(a.sys, a.article_num)] ?? {}
      const fonteGuard = `${a.testo ?? ''} ${a.rubrica ?? ''} ${profilo}`
      const verificaAi = prosaValida(String(x.verifica ?? ''), fonteGuard) ? String(x.verifica) : F.fallback(0, '', '')
      const vb = ['pianta', 'planimetria', 'regolamento_comunale', 'documentazione'].includes(x.verificabilita)
        ? x.verificabilita : 'documentazione'

      // Soglia larghezza: valida SOLO se compare nel testo di legge COME MISURA
      // con unità ("0,90 m" / "90 cm"), sulla stessa porzione vista dall'AI.
      // Verdetto automatico SOLO nel verso sicuro: 'conforme' se anche l'apertura
      // più stretta supera la soglia. Sotto soglia → 'da_verificare' (come il
      // motore federale: il requisito vale tipicamente per le vie d'evacuazione),
      // MAI 'non_conforme' automatico su tutta la tavola.
      let esito = vb === 'pianta' ? 'da_verificare' : 'non_verificabile'
      let verifica = verificaAi
      const sRaw = x.soglia_larghezza_m
      const s = (typeof sRaw === 'number' && sRaw > 0.3 && sRaw < 4) ? sRaw : null
      const testoVistoAi = (a.testo ?? '').slice(0, 3000)
      if (s != null && vb === 'pianta' && sogliaConUnitaNelTesto(s, testoVistoAi)) {
        if (minAp != null) {
          const sopraSoglia = minAp >= s
          esito = sopraSoglia ? 'conforme' : 'da_verificare'
          verifica = `${verificaAi} ${sopraSoglia
            ? F.ok(aperture.length, minAp.toFixed(2), s.toFixed(2))
            : F.ko(aperture.length, minAp.toFixed(2), s.toFixed(2))}`
        } else {
          esito = 'da_verificare'
          verifica = `${verificaAi} ${F.nodata(0, '', '')}`
        }
      }

      return {
        esito,
        riferimento: `${l.abbreviation ?? l.systematic_number} ${cantone} art. ${a.article_num} (${l.systematic_number})`,
        rubrica: a.rubrica ?? null,
        verifica,
        testo_norma: (a.testo ?? '').slice(0, 900) + ((a.testo ?? '').length > 900 ? ' […]' : ''),
        verificabilita: vb,
        norma_id: a.norma_id,
        origine: 'cantonale_ai',
      }
    })

    const record = {
      cantone, lingua, modello: MODEL_CANT,
      generato_il: new Date().toISOString(),
      fonte_updated_at: disegno.updated_at,
      esiti,
    }
    await supabase.from('progetto_disegni').update({ esiti_cantonali: record }).eq('id', disegno.id)

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: `cantone_${cantone}`,
      modello: MODEL_CANT,
      token_input: sel.tokIn + ana.tokIn, token_output: sel.tokOut + ana.tokOut,
      durata_ms: Date.now() - t0, esito: 'ok', iterazioni: 2,
      principali_count: esiti.length,
      metadati: { cantone, lingua, disegno_id, leggi: leggi.length, indice: indice.length, selezioni: selezioni.length },
    })

    return new Response(JSON.stringify({ ok: true, cached: false, esiti_cantonali: record }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await logLexCall({
      user_id: userIdEsterno, request_id: requestId, modello: MODEL_CANT,
      esito: 'error', errore: String(err?.message ?? err).slice(0, 500),
      durata_ms: Date.now() - t0,
    })
    // Messaggio generico al client; il dettaglio resta nei lex_logs.
    return new Response(JSON.stringify({ ok: false, error: 'analisi cantonale non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
