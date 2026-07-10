// ═══════════════════════════════════════════════════════════════
// lex-narra-disegno  (LEXUM CH)
// Layer di NARRAZIONE localizzata sul risultato DETERMINISTICO
// dell'analisi disegno (motore Python: gemello / findings / esiti_normativa).
//
// PRINCIPIO (identico a lex-synthesizer): il motore è la fonte di verità.
// L'AI NON rianalizza, NON inventa, NON ricalcola alcun numero. Si limita a
// ESPRIMERE il risultato nella lingua richiesta.
//
//  - lingua 'it'  → PASSTHROUGH: usa direttamente le stringhe del motore
//                   (già italiane). Nessuna chiamata AI, costo zero, fedeltà totale.
//  - lingua 'de'/'fr' → l'AI localizza SOLO la prosa (messaggio finding / verifica),
//                   copiando OGNI numero verbatim. La SIGLA e il TESTO DI LEGGE
//                   arrivano dal DB (norme_ch / norme_ch_articoli) nella lingua
//                   giusta — MAI tradotti dall'AI.
//
// Auth: JWT utente nell'header Authorization. La proprietà del disegno è
// verificata (progetto_disegni.progettista_id == auth.uid()).
// Cache: progetto_disegni.narrazione[lingua], invalidata se il disegno cambia.
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MODEL_NARRA = Deno.env.get('NARRA_DISEGNO_MODEL') ?? 'claude-sonnet-5'
const MAX_TOKENS = 2600

type Lingua = 'it' | 'de' | 'fr'
const NOME_LINGUA: Record<Lingua, string> = {
  it: 'ITALIANO',
  de: 'TEDESCO (Deutsch)',
  fr: 'FRANCESE (Français)',
}
function linguaSicura(l: any): Lingua {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}

// ─── GUARD ANTI-INVENZIONE (il motore è la fonte di verità) ─────
// Estrae i valori numerici da un testo, normalizzati a un token canonico.
// Un token per numero: niente spazi/virgole-elenco dentro il token, così
// "90, 120 e 140" dà tre numeri distinti e "cpv. 2 0.90" non li fonde.
// "3.40", "3,40 m", "0,88 m", "1'250.50", "822.114" restano confrontabili.
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
// La prosa AI è valida SOLO se non introduce numeri assenti nella fonte
// (sottoinsieme: l'AI può ometterne, mai inventarne) e non contiene virgolette
// da citazione legale. Se fallisce → si scarta la prosa AI e si torna al motore.
function prosaValida(aiText: string, fonte: string): boolean {
  if (!aiText) return false
  if (/[«»“”„"]/.test(aiText)) return false
  const src = estraiNumeri(fonte)
  for (const n of estraiNumeri(aiText)) if (!src.has(n)) return false
  return true
}
// Estrae il primo oggetto JSON bilanciato da una risposta AI (fence, prosa extra…).
function estraiJson(raw: string): any | null {
  const i = raw.indexOf('{'), j = raw.lastIndexOf('}')
  if (i < 0 || j < 0 || j < i) return null
  try { return JSON.parse(raw.slice(i, j + 1)) } catch { return null }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── lex_logs (inline, come negli altri agent) ──────────────────
async function logLexCall(p: Record<string, any>): Promise<void> {
  try {
    await supabase.rpc('lex_logs_insert', {
      p_user_id: p.user_id ?? null,
      p_studio_id: p.studio_id ?? null,
      p_request_id: p.request_id,
      p_parent_log_id: null,
      p_endpoint: 'narra_disegno',
      p_azione: p.azione ?? null,
      p_domanda: p.domanda ?? null,
      p_conversazione_id: null,
      p_modello: p.modello,
      p_token_input: p.token_input ?? 0,
      p_token_output: p.token_output ?? 0,
      p_token_cached: p.token_cached ?? 0,
      p_durata_ms: p.durata_ms ?? null,
      p_iterazioni: 1,
      p_tool_usati: null,
      p_esito: p.esito ?? 'ok',
      p_errore: p.errore ?? null,
      p_qualita_retrieval: null,
      p_principali_count: null,
      p_credito_scalato: false,
      p_metadati: p.metadati ?? null,
      p_risposta_text: null,
    })
  } catch (_) { /* il log non deve mai far fallire la richiesta */ }
}

// ─── Parsing riferimento normativo ──────────────────────────────
// I riferimenti del motore hanno forma "RS 822.114 (OLL 4) art. 7 cpv. 2",
// "RS 822.113 (OLL 3) art. 32", "UR 40.1117 ... (PBG)".
function estraiRs(riferimento: string): string | null {
  const m = riferimento.match(/RS\s+(\d+(?:\.\d+)*)/i)
  return m ? m[1] : null
}
function estraiArticolo(riferimento: string): number | null {
  const m = riferimento.match(/art\.\s*(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}
// Sostituisce la sigla tra parentesi con quella localizzata dal DB.
function riferimentoLocalizzato(riferimento: string, siglaLoc: string | null, lingua: Lingua): string {
  let out = riferimento
  // Sostituisci SOLO la sigla tra parentesi che segue il numero RS (non altre parentesi/note).
  if (siglaLoc) out = out.replace(/(RS\s+[\d.]+\s*)\([^)]+\)/, `$1(${siglaLoc})`)
  if (lingua === 'de') out = out.replace(/\bart\./g, 'Art.').replace(/\bcpv\./g, 'Abs.')
  if (lingua === 'fr') out = out.replace(/\bcpv\./g, 'al.')
  return out
}

// Risolve dal DB, per ogni riferimento federale (RS), sigla + testo articolo
// nella lingua richiesta. Ritorna una mappa riferimento → {sigla, testo, rubrica}.
async function risolviNorme(
  riferimenti: string[], lingua: Lingua,
): Promise<Record<string, { sigla: string | null; testo: string | null; rubrica: string | null }>> {
  const out: Record<string, any> = {}
  const rsUnici = [...new Set(riferimenti.map(estraiRs).filter(Boolean))] as string[]
  if (rsUnici.length === 0) return out

  const { data: norme } = await supabase
    .from('norme_ch')
    .select('id, rs_numero, titolo_short')
    .in('rs_numero', rsUnici)
  const byRs: Record<string, { id: string; sigla: string | null }> = {}
  for (const n of (norme ?? [])) {
    byRs[n.rs_numero] = { id: n.id, sigla: (n.titolo_short && n.titolo_short[lingua]) || null }
  }

  const normaIds = Object.values(byRs).map(v => v.id)
  const { data: articoli } = normaIds.length
    ? await supabase
        .from('norme_ch_articoli')
        .select('norma_id, articolo_num, lingua, testo, rubrica_articolo')
        .in('norma_id', normaIds)
        .eq('lingua', lingua)
    : { data: [] as any[] }
  const artByKey: Record<string, { testo: string | null; rubrica: string | null }> = {}
  for (const a of (articoli ?? [])) {
    artByKey[`${a.norma_id}:${a.articolo_num}`] = { testo: a.testo ?? null, rubrica: a.rubrica_articolo ?? null }
  }

  for (const rif of riferimenti) {
    const rs = estraiRs(rif)
    const art = estraiArticolo(rif)
    if (!rs || !byRs[rs]) { out[rif] = { sigla: null, testo: null, rubrica: null }; continue }
    const norma = byRs[rs]
    const a = (art != null) ? artByKey[`${norma.id}:${art}`] : null
    out[rif] = { sigla: norma.sigla, testo: a?.testo ?? null, rubrica: a?.rubrica ?? null }
  }
  return out
}

// ─── System prompt (DE/FR) ──────────────────────────────────────
const SYSTEM_PROMPT = `# RUOLO
Sei Lex, assistente di uno studio di progettazione svizzero. Ricevi il RISULTATO GIÀ CALCOLATO di un'analisi tecnica di un disegno (misure verificate da un motore deterministico). Il tuo compito è ESPRIMERE questo risultato nella LINGUA RICHIESTA, non rianalizzarlo.

# REGOLE FERREE
1. NON inventare, modificare, arrotondare o ricalcolare ALCUN numero, quota, misura, superficie, tolleranza, coordinata o conteggio. Copiali ESATTAMENTE come compaiono nel testo di partenza.
2. NON inventare né parafrasare testo di legge. Il testo di legge e la sigla della norma ti sono forniti dal sistema, GIÀ nella lingua giusta: usali verbatim, non tradurli tu.
3. Non aggiungere fatti non presenti nei dati. Se un dato manca, non riempirlo.
4. Registro professionale, come un collega a un progettista. Frasi brevi e chiare. Spiega COSA significa la segnalazione per chi progetta, restando ancorato ai numeri dati.

# COMPITO
Per ogni "finding" e ogni "esito normativo" fornito, riscrivi la frase nella lingua richiesta preservando ogni numero. Per gli esiti, se ti è dato un TESTO DI LEGGE UFFICIALE nella lingua, NON riscriverlo (lo mostra il sistema): produci solo la spiegazione.
Se il messaggio indica MODALITÀ SOLO CHECKLIST, NON riscrivere findings/esiti (sono già nella lingua giusta): produci solo "sommario" e "checklist" e lascia gli array findings/esiti vuoti.
Nella "spiegazione" NON usare virgolette di citazione (« » “ ” „) e NON introdurre numeri di articolo, RS o capoverso che non compaiano già nella verifica di partenza o nel riferimento.

# CHECKLIST OPERATIVA
Produci anche "checklist": massimo 6 azioni concrete, nella lingua richiesta, che il progettista deve fare prima di depositare la domanda di costruzione, ordinate per importanza. Ogni azione discende ESCLUSIVAMENTE dai finding e dagli esiti forniti (federali e cantonali): copia i numeri verbatim, indica quale documento serve quando la verifica non si fa sulla pianta (planimetria di situazione, regolamento comunale, piano di evacuazione). Se non c'è nulla da fare su un fronte, non inventare azioni. Frasi imperative brevi ("Verifica se…", "Porta a…", "Conferma…").

# OUTPUT
Rispondi con UN SOLO oggetto JSON valido, senza testo prima o dopo, di questa forma esatta:
{
  "findings": [ { "idx": <numero>, "testo": "<frase localizzata con i numeri verbatim>" } ],
  "esiti":    [ { "idx": <numero>, "spiegazione": "<spiegazione localizzata della verifica, numeri verbatim>" } ],
  "sommario": "<1-2 frasi nella lingua richiesta che riassumono l'esito complessivo del disegno, senza inventare numeri>",
  "checklist": [ "<azione operativa>", ... ]
}
Includi un elemento per OGNI finding e OGNI esito ricevuto, con lo stesso idx (salvo modalità solo checklist).`

function costruisciMessaggio(
  lingua: Lingua,
  nomeFile: string,
  findings: any[],
  esiti: any[],
  norme: Record<string, { sigla: string | null; testo: string | null; rubrica: string | null }>,
  cantEsiti: any[] = [],
  soloChecklist = false,
): string {
  let m = `LINGUA RICHIESTA: ${NOME_LINGUA[lingua]} — scrivi TUTTO in questa lingua.\n`
  if (soloChecklist) {
    m += `MODALITÀ SOLO CHECKLIST: findings ed esiti sono già nella lingua giusta, NON riscriverli (lascia gli array findings/esiti vuoti). Produci solo "sommario" e "checklist".\n`
  }
  m += `Disegno: ${nomeFile}\n\n`

  m += `## FINDINGS (${findings.length})\n`
  if (findings.length === 0) m += `Nessun finding: nessuna incoerenza rilevata dal motore.\n`
  findings.forEach((f, i) => {
    m += `- idx ${i} · severità "${f.severita}" · tipo "${f.tipo}"\n  testo di partenza: "${f.messaggio}"\n`
  })

  m += `\n## ESITI NORMATIVI (${esiti.length})\n`
  esiti.forEach((e, i) => {
    const n = norme[e.riferimento] || { sigla: null, testo: null }
    m += `- idx ${i} · esito "${e.esito}" · riferimento "${e.riferimento}"\n`
    m += `  verifica di partenza: "${e.verifica}"\n`
    if (n.testo) {
      m += `  (testo di legge ufficiale già in lingua — NON riscriverlo, lo mostra il sistema)\n`
    } else if (e.testo_norma) {
      m += `  testo descrittivo da localizzare: "${e.testo_norma}"\n`
    }
  })

  if (cantEsiti.length > 0) {
    m += `\n## ESITI NORMATIVA CANTONALE (${cantEsiti.length}) — entrano nella checklist\n`
    cantEsiti.forEach((e: any) => {
      m += `- esito "${e.esito}" · ${e.riferimento}${e.verificabilita ? ` · ${e.verificabilita}` : ''}\n  ${e.verifica}\n`
    })
  }

  m += `\nProduci l'oggetto JSON come da istruzioni.${soloChecklist ? '' : ' Un elemento per ogni idx sopra.'}`
  return m
}

// ─── Chiamata AI condivisa (rami IT-solo-checklist e DE/FR completi) ──
async function chiamaNarraAi(userMsg: string): Promise<{ parsed: any; tokIn: number; tokOut: number }> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL_NARRA,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
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

// ─── Costruzione narrazione IT (passthrough, zero AI) ───────────
function narrazioneIt(findings: any[], esiti: any[]): any {
  return {
    findings: findings.map((f: any, i: number) => ({ idx: i, testo: f.messaggio })),
    esiti: esiti.map((e: any, i: number) => ({
      idx: i,
      riferimento: e.riferimento,
      testo_norma: e.testo_norma ?? null,
      spiegazione: e.verifica,
    })),
    sommario: null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const t0 = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json().catch(() => ({}))
    const disegno_id = body.disegno_id
    const lingua = linguaSicura(body.lingua)
    const forza = body.forza === true // ignora cache
    if (!disegno_id) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno_id obbligatorio' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Auth: identifica l'utente dal JWT
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: 'token mancante' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const { data: userData } = await supabase.auth.getUser(jwt)
    const user = userData?.user
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'utente non autenticato' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Disegno di proprietà dell'utente, già analizzato
    const { data: disegno, error: dErr } = await supabase
      .from('progetto_disegni')
      .select('id, nome_file, stato_analisi, findings, esiti_normativa, esiti_cantonali, narrazione, updated_at, progettista_id')
      .eq('id', disegno_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (dErr) throw new Error(dErr.message)
    if (!disegno) {
      return new Response(JSON.stringify({ ok: false, error: 'disegno non trovato o non accessibile' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    if (disegno.stato_analisi !== 'completata') {
      return new Response(JSON.stringify({ ok: false, error: 'analisi non completata' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const findings: any[] = disegno.findings ?? []
    const esiti: any[] = disegno.esiti_normativa ?? []
    // Esiti cantonali (se già generati): entrano nella checklist operativa.
    // La cache cantonale è per-disegno: la si usa solo se fresca.
    const cant = disegno.esiti_cantonali
    const cantEsiti: any[] = (cant && cant.fonte_updated_at === disegno.updated_at)
      ? (cant.esiti ?? []) : []

    // Cache valida? (stessa fonte, stessa lingua, stesso modello, stessa
    // disponibilità cantonale — se il cantonale arriva dopo, la checklist va rifatta)
    const cache = (disegno.narrazione && disegno.narrazione[lingua]) || null
    if (!forza && cache && cache.fonte_updated_at === disegno.updated_at &&
        cache.modello === MODEL_NARRA && (cache.con_cantonale === (cantEsiti.length > 0))) {
      return new Response(JSON.stringify({ ok: true, lingua, cached: true, narrazione: cache }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // solo_cache: il frontend legge senza mai generare — la generazione avviene
    // esclusivamente nel bundle "Analisi AI" (che scala il credito).
    if (body.solo_cache === true) {
      return new Response(JSON.stringify({ ok: true, lingua, cached: false, narrazione: null }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    let narr: any
    const modelloUsato = MODEL_NARRA
    let tokIn = 0, tokOut = 0
    let skipCache = false

    const nomeSafe = (disegno.nome_file || '').replace(/[`\r\n]/g, ' ').slice(0, 120)
    // Fonte per il guard di sommario e checklist: TUTTE le stringhe del motore
    // (federali + cantonali) — la checklist non può introdurre numeri nuovi.
    const fonteTot = [
      ...findings.map((f: any) => f.messaggio),
      // riferimento incluso: la checklist può citare "art. 10 OLL 4" senza
      // che il guard scarti la voce per i numeri dell'articolo
      ...esiti.map((e: any) => `${e.verifica ?? ''} ${e.riferimento ?? ''}`),
      ...cantEsiti.map((e: any) => `${e.verifica ?? ''} ${e.riferimento ?? ''}`),
    ].join(' ')
    const estraiChecklist = (parsed: any) =>
      (Array.isArray(parsed?.checklist) ? parsed.checklist : [])
        .map((x: any) => String(x ?? '').slice(0, 240))
        .filter((x: string) => prosaValida(x, fonteTot))
        .slice(0, 6)
    const nienteDaNarrare = findings.length === 0 && esiti.length === 0 && cantEsiti.length === 0

    if (lingua === 'it') {
      // Prosa nativa dal motore (passthrough); l'AI produce SOLO sommario+checklist.
      narr = { ...narrazioneIt(findings, esiti), checklist: [] }
      if (!nienteDaNarrare) {
        const userMsg = costruisciMessaggio(lingua, nomeSafe, findings, esiti, {}, cantEsiti, true)
        let r = await chiamaNarraAi(userMsg)
        tokIn += r.tokIn; tokOut += r.tokOut
        if (!r.parsed) {
          // un retry interno: il credito è già stato speso, non va sprecato
          r = await chiamaNarraAi(userMsg)
          tokIn += r.tokIn; tokOut += r.tokOut
        }
        if (!r.parsed) {
          skipCache = true  // retry successivo potrà rigenerare la checklist
        } else {
          narr.sommario = prosaValida(r.parsed.sommario, fonteTot) ? r.parsed.sommario : null
          narr.checklist = estraiChecklist(r.parsed)
        }
      }
    } else {
      // Testo di legge + sigla dal DB nella lingua richiesta.
      const norme = await risolviNorme(esiti.map((e: any) => e.riferimento).filter(Boolean), lingua)

      if (nienteDaNarrare) {
        narr = { findings: [], esiti: [], sommario: null, checklist: [] }
      } else {
        const userMsg = costruisciMessaggio(lingua, nomeSafe, findings, esiti, norme, cantEsiti, false)
        let r = await chiamaNarraAi(userMsg)
        tokIn += r.tokIn; tokOut += r.tokOut
        if (!r.parsed) {
          // un retry interno: il credito è già stato speso, non va sprecato
          r = await chiamaNarraAi(userMsg)
          tokIn += r.tokIn; tokOut += r.tokOut
        }
        const parsed = r.parsed

        // riferimento localizzato (deterministico) + testo di legge dal DB: MAI dall'AI.
        const esitiBase = esiti.map((e: any) => {
          const n = norme[e.riferimento] || { sigla: null, testo: null }
          return {
            riferimento: riferimentoLocalizzato(e.riferimento, n.sigla, lingua),
            testo_norma: n.testo ?? e.testo_norma ?? null,
          }
        })

        if (!parsed) {
          // Output AI non interpretabile → mostra il risultato deterministico (stringhe
          // motore), NON un errore. Non cachiamo: un retry potrà rigenerare.
          narr = {
            findings: findings.map((f: any, i: number) => ({ idx: i, testo: f.messaggio })),
            esiti: esiti.map((e: any, i: number) => ({
              idx: i, riferimento: esitiBase[i].riferimento, testo_norma: esitiBase[i].testo_norma, spiegazione: e.verifica,
            })),
            sommario: null,
            checklist: [],
          }
          skipCache = true
        } else {
          const fMap: Record<number, string> = {}
          for (const f of (parsed.findings ?? [])) fMap[f.idx] = f.testo
          const eMap: Record<number, string> = {}
          for (const e of (parsed.esiti ?? [])) eMap[e.idx] = e.spiegazione

          // GUARD: la prosa AI passa solo se non introduce numeri assenti nella fonte
          // e non contiene virgolette da citazione; altrimenti fallback alla stringa motore.
          narr = {
            checklist: estraiChecklist(parsed),
            findings: findings.map((f: any, i: number) => ({
              idx: i, testo: prosaValida(fMap[i], f.messaggio) ? fMap[i] : f.messaggio,
            })),
            esiti: esiti.map((e: any, i: number) => {
              const fonte = `${e.verifica ?? ''} ${e.riferimento ?? ''}`
              return {
                idx: i,
                riferimento: esitiBase[i].riferimento,
                testo_norma: esitiBase[i].testo_norma,
                spiegazione: prosaValida(eMap[i], fonte) ? eMap[i] : e.verifica,
              }
            }),
            sommario: prosaValida(parsed.sommario, fonteTot) ? parsed.sommario : null,
          }
        }
      }
    }

    const record = {
      ...narr,
      generata_il: new Date().toISOString(),
      modello: modelloUsato,
      fonte_updated_at: disegno.updated_at,
      con_cantonale: cantEsiti.length > 0,
    }

    // Scrivi la cache: merge nella colonna narrazione senza toccare le altre lingue.
    // Su fallback (output AI non interpretabile) NON cachiamo, così un retry rigenera.
    if (!skipCache) {
      const nuovaNarr = { ...(disegno.narrazione ?? {}), [lingua]: record }
      await supabase.from('progetto_disegni').update({ narrazione: nuovaNarr }).eq('id', disegno.id)
    }

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: `narra_${lingua}`,
      modello: modelloUsato, token_input: tokIn, token_output: tokOut,
      durata_ms: Date.now() - t0, esito: 'ok',
      metadati: { lingua, disegno_id, findings: findings.length, esiti: esiti.length },
    })

    return new Response(JSON.stringify({ ok: true, lingua, cached: false, narrazione: record }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await logLexCall({
      request_id: requestId, modello: MODEL_NARRA, esito: 'error',
      errore: String(err?.message ?? err).slice(0, 500), durata_ms: Date.now() - t0,
    })
    // Messaggio generico al client; il dettaglio resta solo nei lex_logs.
    return new Response(JSON.stringify({ ok: false, error: 'narrazione non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
