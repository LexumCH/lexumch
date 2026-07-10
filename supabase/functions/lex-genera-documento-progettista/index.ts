// ═══════════════════════════════════════════════════════════════
// lex-genera-documento-progettista  (LEXUM CH)
// Redazione dei documenti tecnici dello studio a partire dai DATI
// dell'analisi (gemello, findings, esiti federali/cantonali, vision):
//   - relazione_conformita : Nachweis con articoli citati dalla banca dati
//   - verbale_analisi      : prova di diligenza (cosa/come/quando verificato)
//   - relazione_tecnica    : Baubeschrieb precompilato + [DA COMPLETARE]
//   - superfici_sia416     : tabelle superfici con proposta categorie SIA 416
//   - programma_locali     : programma dei locali per tavola
//
// PRINCIPIO: ogni numero nel documento viene dai dati forniti (guard di
// sottoinsieme numerico, come narra/checklist); ciò che il sistema non sa
// diventa un campo [DA COMPLETARE: …], mai un'invenzione. Le proposte AI
// (categorie SIA) sono marcate come proposte.
//
// Crediti: self-gated come genera-documento (verifica → 402; scala a documento
// completato, update ottimistico). Output JSON: { documento_markdown, ... }.
// L'output NON viene salvato qui: il frontend lo mostra/edita e lo salva via
// salva-documento-pdf-progettista.
//
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MODEL_DOC = Deno.env.get('GENERA_DOC_PROGETTISTA_MODEL') ?? 'claude-sonnet-5'
const MAX_TOKENS = 6000

type Lingua = 'it' | 'de' | 'fr'
function linguaSicura(l: any): Lingua {
  return (l === 'de' || l === 'fr' || l === 'it') ? l : 'it'
}
const NOME_LINGUA: Record<Lingua, string> = {
  it: 'ITALIANO', de: 'TEDESCO (Deutsch)', fr: 'FRANCESE (Français)',
}

const TIPI: Record<string, { nome: Record<Lingua, string>; istruzioni: string }> = {
  relazione_conformita: {
    nome: {
      it: 'Relazione di conformità normativa',
      de: 'Konformitätsnachweis',
      fr: 'Attestation de conformité',
    },
    istruzioni: `Struttura: titolo; dati del progetto; metodo (analisi deterministica delle tavole con Lexum, versione motore indicata); per OGNI tavola una sezione con le verifiche NORMATIVE (federali e cantonali): per ciascuna riporta riferimento normativo, esito, motivazione (dalla "verifica" fornita) e, se presente, il testo dell'articolo in citazione (blockquote). Chiudi con: elenco dei punti che restano da verificare su altri documenti (planimetria di situazione, regolamento comunale, piano di evacuazione) e una dichiarazione finale PRUDENTE: le verifiche automatiche non sostituiscono la responsabilità del progettista. NON dichiarare mai una conformità complessiva del progetto: riporta gli esiti verifica per verifica.`,
  },
  verbale_analisi: {
    nome: {
      it: "Verbale d'analisi del disegno",
      de: 'Prüfprotokoll des Plans',
      fr: "Procès-verbal d'analyse du plan",
    },
    istruzioni: `Struttura: titolo; dati del progetto; data di redazione e versione del motore; per OGNI tavola: statistiche delle quote (lette/verificate/altezze aperture/fuori tavola/zona dettaglio/senza riscontro), catene verificate, elenco delle segnalazioni del motore con l'eventuale seconda opinione AI (marcata come tale), zone interpretate dalla vision (marcate "interpretazione AI — non misurata"). Tono fattuale e asciutto: è la prova di diligenza dello studio per il fascicolo. Chiudi con la nota: il verbale documenta i controlli automatici eseguiti alla data indicata.`,
  },
  relazione_tecnica: {
    nome: {
      it: 'Relazione tecnica (Baubeschrieb)',
      de: 'Baubeschrieb',
      fr: 'Descriptif de construction',
    },
    istruzioni: `Struttura: titolo; 1. Ubicazione e dati catastali (comune, mappale, zona edificatoria); 2. Descrizione dell'intervento (dalla descrizione del progetto; se assente [DA COMPLETARE: descrizione dell'intervento]); 3. Programma dei locali e superfici (tabella per tavola: locale · superficie BF); 4. Materiali e finiture: riporta le finiture presenti nei dati dei locali (campi B/W/D) dove disponibili, altrimenti [DA COMPLETARE: …]; 5. Impianti [DA COMPLETARE: riscaldamento, ventilazione, sanitari, elettrico]; 6. Sicurezza e prevenzione incendi: cita SOLO le verifiche fornite; 7. Osservazioni. Usa MOLTI campi [DA COMPLETARE: …] dove i dati non ci sono: è una bozza da completare, non un documento finito.`,
  },
  superfici_sia416: {
    nome: {
      it: 'Calcolo delle superfici (SIA 416)',
      de: 'Flächenberechnung (SIA 416)',
      fr: 'Calcul des surfaces (SIA 416)',
    },
    istruzioni: `Struttura: titolo; nota metodologica (superfici BF lette dai timbri dei locali delle tavole analizzate; la classificazione SIA 416 è una PROPOSTA da confermare da parte del progettista); per OGNI tavola una tabella markdown: Locale · Superficie BF (m²) · Categoria SIA 416 proposta (HNF/NNF/VF/FF/KF) — proponi la categoria dal NOME del locale (es. uffici→HNF, corridoi→VF, tecnica→FF, WC→NNF), sempre nella colonna "proposta"; riga di totale per tavola (somma delle BF fornite — usa il totale già fornito nei dati, non ricalcolarlo). Chiudi con: la classificazione va verificata e le superfici derivano dai timbri delle tavole, non da un computo SIA completo (mancano superfici di costruzione e quote non timbrate).`,
  },
  programma_locali: {
    nome: {
      it: 'Programma dei locali',
      de: 'Raumprogramm',
      fr: 'Programme des locaux',
    },
    istruzioni: `Struttura: titolo; dati del progetto; per OGNI tavola una tabella markdown: Locale · Superficie BF (m²) · Finiture (B/W/D se presenti); riga di totale (usa il totale fornito). Breve nota di chiusura: il programma deriva dai timbri dei locali delle tavole analizzate.`,
  },
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
      p_endpoint: 'genera_documento_progettista', p_azione: p.azione ?? null,
      p_domanda: null, p_conversazione_id: null,
      p_modello: p.modello ?? MODEL_DOC, p_token_input: p.token_input ?? 0,
      p_token_output: p.token_output ?? 0, p_token_cached: 0,
      p_durata_ms: p.durata_ms ?? null, p_iterazioni: p.iterazioni ?? 1,
      p_tool_usati: null, p_esito: p.esito ?? 'ok', p_errore: p.errore ?? null,
      p_qualita_retrieval: null, p_principali_count: null,
      p_credito_scalato: p.credito_scalato ?? false,
      p_metadati: p.metadati ?? null, p_risposta_text: null,
    })
  } catch (_) { /* il log non deve mai far fallire la richiesta */ }
}

// ─── Crediti (self-gated, pattern piattaforma con update ottimistico) ───
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
      const totale = data.reduce((acc, r) => {
        const res = r.crediti_totali - r.crediti_usati
        const sc = r.periodo_fine && new Date(r.periodo_fine) < now
        return acc + (res > 0 && !sc ? res : 0)
      }, 0)
      return { disponibili: true, crediti_rimasti: totale, crediti_row_id: row.id, crediti_usati: row.crediti_usati }
    }
  }
  return { disponibili: false, crediti_rimasti: 0 }
}

// ─── Guard anti-invenzione (stessa famiglia di narra/checklist) ─────────
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
function numeriAmmessi(docMd: string, fonte: string): { ok: boolean; estranei: string[] } {
  const src = estraiNumeri(fonte)
  const estranei: string[] = []
  for (const n of estraiNumeri(docMd)) if (!src.has(n)) estranei.push(n)
  return { ok: estranei.length === 0, estranei }
}
function sanTesto(v: any, max: number): string {
  return String(v ?? '').replace(/[`\r\n]/g, ' ').slice(0, max)
}

const SYSTEM_DOC = `Sei Lex, l'assistente di redazione tecnica di Lexum per studi di progettazione svizzeri. Redigi un DOCUMENTO in markdown a partire ESCLUSIVAMENTE dai dati forniti (progetto + analisi delle tavole).

REGOLE FERREE:
1. OGNI numero, quota, superficie, conteggio o riferimento normativo deve comparire VERBATIM nei dati forniti. Non arrotondare, non convertire, non sommare per conto tuo (usa i totali già forniti). Un numero inventato invalida il documento.
2. Ciò che i dati non dicono diventa un campo [DA COMPLETARE: descrizione di cosa manca] — MAI un'invenzione. Usa i campi [DA COMPLETARE] con generosità.
3. NON esprimere giudizi di conformità complessivi né garanzie: riporta gli esiti così come forniti, verifica per verifica. Il documento è una BOZZA che il progettista completa e firma sotto la propria responsabilità.
4. Le interpretazioni della vision AI e le seconde opinioni vanno sempre marcate come tali ("interpretazione AI — non misurata", "seconda opinione AI").
5. Niente virgolette tipografiche « » " " (usa il blockquote markdown > per citare i testi di legge forniti).
6. Scrivi TUTTO nella lingua richiesta (intestazioni comprese). I nomi dei locali e i riferimenti normativi restano come nei dati.
7. Solo markdown pulito: titoli #/##, tabelle, elenchi, blockquote. Nessun preambolo prima del titolo, nessun commento dopo la chiusura.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const t0 = Date.now()
  const requestId = crypto.randomUUID()
  let userIdEsterno: string | null = null

  try {
    const body = await req.json().catch(() => ({}))
    const progetto_id = String(body.progetto_id ?? '')
    const tipo = String(body.tipo ?? '')
    const lingua = linguaSicura(body.lingua)
    if (!progetto_id || !TIPI[tipo]) {
      return new Response(JSON.stringify({ ok: false, error: 'progetto_id o tipo non validi' }),
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

    // Ownership del progetto
    const { data: prog } = await supabase
      .from('progetti')
      .select('id, nome, descrizione, committente, indirizzo, comune, cantone, destinazione, numero_commessa, mappale, zona_edificatoria')
      .eq('id', progetto_id)
      .eq('progettista_id', user.id)
      .maybeSingle()
    if (!prog) {
      return new Response(JSON.stringify({ ok: false, error: 'progetto non trovato o non accessibile' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Gate crediti PRIMA di generare (1 credito a documento)
    const crediti = await verificaCrediti(user.id)
    if (!crediti.disponibili) {
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: tipo,
        esito: 'no_credits', errore: 'Crediti esauriti', durata_ms: Date.now() - t0,
      })
      return new Response(JSON.stringify({ ok: false, error: 'crediti_esauriti' }),
        { status: 402, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Disegni analizzati del progetto
    const { data: disegni } = await supabase
      .from('progetto_disegni')
      .select('id, nome_file, updated_at, findings, esiti_normativa, esiti_cantonali, zone_dettaglio, gemello->locali, gemello->metadata')
      .eq('progetto_id', progetto_id)
      .eq('progettista_id', user.id)
      .eq('stato_analisi', 'completata')
      .order('created_at', { ascending: true })
    const tavole = (disegni ?? [])
    if (tavole.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'nessuna_tavola_analizzata' }),
        { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ── Blocco dati (sanitizzato): è ANCHE la fonte del guard numerico ──
    const oggi = new Date()
    const dataDoc = `${String(oggi.getDate()).padStart(2, '0')}.${String(oggi.getMonth() + 1).padStart(2, '0')}.${oggi.getFullYear()}`
    let dati = `# DATI DEL PROGETTO\n`
    for (const [k, v] of Object.entries({
      Progetto: prog.nome, Descrizione: prog.descrizione, Committente: prog.committente,
      Indirizzo: prog.indirizzo, Comune: prog.comune, Cantone: prog.cantone,
      Destinazione: prog.destinazione, Commessa: prog.numero_commessa,
      Mappale: prog.mappale, 'Zona edificatoria': prog.zona_edificatoria,
    })) {
      if (v) dati += `- ${k}: ${sanTesto(v, 200)}\n`
    }
    dati += `- Data di redazione: ${dataDoc}\n`

    for (const d of tavole) {
      const meta: any = (d as any).metadata ?? {}
      const locali: any[] = Array.isArray((d as any).locali) ? (d as any).locali : []
      const totBf = locali.reduce((s, r) => s + (r.superficie_bf_m2 ?? 0), 0)
      dati += `\n## TAVOLA: ${sanTesto(d.nome_file, 120)}\n`
      dati += `- Scala dichiarata: ${meta.scala_dichiarata ? `1:${meta.scala_dichiarata}` : 'n/d'} · versione motore: ${sanTesto(meta.versione_motore ?? 'n/d', 20)}\n`
      const cV = meta.catene_verificate
      if (typeof cV === 'number') dati += `- Catene di quote verificate: ${cV}\n`
      dati += `- Locali (${locali.length}) — superficie BF totale ${totBf.toFixed(2)} m²:\n`
      for (const r of locali.slice(0, 60)) {
        const fin = r.finiture && Object.keys(r.finiture).length
          ? ` · finiture: ${Object.entries(r.finiture).map(([a, b]) => `${sanTesto(a, 4)}: ${sanTesto(b, 40)}`).join(', ')}`
          : ''
        dati += `  - ${sanTesto(r.nome, 60) || '(senza nome)'} · ${r.superficie_bf_m2 != null ? `${r.superficie_bf_m2} m²` : 'BF n/d'}${fin}\n`
      }
      const findings: any[] = (d.findings ?? []) as any[]
      if (findings.length) {
        dati += `- Segnalazioni del motore (${findings.length}):\n`
        const interp = (d as any).zone_dettaglio?.interpretazioni?.[lingua]
        const opinioni: any[] = (interp && interp.fonte_updated_at === d.updated_at) ? (interp.opinioni ?? []) : []
        findings.forEach((f: any, i: number) => {
          dati += `  - [${sanTesto(f.severita, 10)}] ${sanTesto(f.messaggio, 300)}\n`
          const op = opinioni.find((o: any) => o.ref === i)
          if (op && op.giudizio !== 'non_chiaro') {
            dati += `    - seconda opinione AI: ${op.giudizio === 'possibile_falso_positivo' ? 'possibile falso positivo' : 'coerente col ritaglio'}${op.motivo ? ` — ${sanTesto(op.motivo, 200)}` : ''}\n`
          }
        })
      } else {
        dati += `- Segnalazioni del motore: nessuna\n`
      }
      const interp = (d as any).zone_dettaglio?.interpretazioni?.[lingua]
      const visioni: any[] = (interp && interp.fonte_updated_at === d.updated_at)
        ? (interp.items ?? []).filter((z: any) => z.titolo) : []
      if (visioni.length) {
        dati += `- Zone interpretate dalla vision AI (non misurate):\n`
        for (const z of visioni) dati += `  - ${sanTesto(z.titolo, 90)}${z.scala_indicata ? ` (${sanTesto(z.scala_indicata, 10)})` : ''}\n`
      }
      const esse = [...((d.esiti_normativa ?? []) as any[]).map((e: any) => ({ ...e, livello: 'federale' })),
                    ...((((d as any).esiti_cantonali?.fonte_updated_at === d.updated_at)
                        ? ((d as any).esiti_cantonali?.esiti ?? []) : []) as any[]).map((e: any) => ({ ...e, livello: 'cantonale' }))]
      if (esse.length) {
        dati += `- Verifiche normative (${esse.length}):\n`
        for (const e of esse) {
          dati += `  - [${e.livello}] esito "${sanTesto(e.esito, 20)}" · ${sanTesto(e.riferimento, 120)}\n`
          dati += `    verifica: ${sanTesto(e.verifica, 450)}\n`
          if (e.testo_norma) dati += `    testo norma: ${sanTesto(e.testo_norma, 600)}\n`
        }
      }
    }

    const userMsg = `LINGUA RICHIESTA: ${NOME_LINGUA[lingua]} — scrivi TUTTO il documento in questa lingua.\n` +
      `TIPO DOCUMENTO: ${TIPI[tipo].nome[lingua]}\n\n# ISTRUZIONI DI STRUTTURA\n${TIPI[tipo].istruzioni}\n\n${dati}\n\nProduci SOLO il documento markdown.`

    async function chiamaAi(): Promise<{ md: string; tokIn: number; tokOut: number }> {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL_DOC, max_tokens: MAX_TOKENS,
          system: SYSTEM_DOC,
          messages: [{ role: 'user', content: userMsg }],
        }),
      })
      if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`)
      const j = await resp.json()
      return {
        md: String(j.content?.[0]?.text ?? '').trim(),
        tokIn: j.usage?.input_tokens ?? 0,
        tokOut: j.usage?.output_tokens ?? 0,
      }
    }

    // Generazione + guard numerico (retry una volta: il credito non va sprecato)
    let tokIn = 0, tokOut = 0, iterazioni = 1
    let r = await chiamaAi()
    tokIn += r.tokIn; tokOut += r.tokOut
    let controllo = numeriAmmessi(r.md, dati + ' ' + dataDoc)
    if (!r.md || !controllo.ok) {
      iterazioni = 2
      r = await chiamaAi()
      tokIn += r.tokIn; tokOut += r.tokOut
      controllo = numeriAmmessi(r.md, dati + ' ' + dataDoc)
    }
    if (!r.md || !controllo.ok) {
      await logLexCall({
        user_id: user.id, request_id: requestId, azione: tipo, esito: 'error',
        errore: `guard numerico: ${controllo.estranei.slice(0, 8).join(', ')}`,
        token_input: tokIn, token_output: tokOut, iterazioni,
        durata_ms: Date.now() - t0, metadati: { progetto_id, tipo, lingua },
      })
      return new Response(JSON.stringify({ ok: false, error: 'guard_non_superato' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Scala 1 credito (update ottimistico) a documento valido
    let scalato = false
    const { data: upd } = await supabase
      .from('crediti_ai')
      .update({ crediti_usati: (crediti.crediti_usati ?? 0) + 1 })
      .eq('id', crediti.crediti_row_id)
      .eq('crediti_usati', crediti.crediti_usati ?? 0)
      .select('id')
    scalato = (upd ?? []).length > 0
    if (!scalato) {
      const again = await verificaCrediti(user.id)
      if (again.disponibili) {
        const { data: upd2 } = await supabase
          .from('crediti_ai')
          .update({ crediti_usati: (again.crediti_usati ?? 0) + 1 })
          .eq('id', again.crediti_row_id)
          .eq('crediti_usati', again.crediti_usati ?? 0)
          .select('id')
        scalato = (upd2 ?? []).length > 0
      }
    }

    await logLexCall({
      user_id: user.id, request_id: requestId, azione: tipo,
      esito: 'ok', credito_scalato: scalato,
      token_input: tokIn, token_output: tokOut, iterazioni,
      durata_ms: Date.now() - t0,
      metadati: { progetto_id, tipo, lingua, tavole: tavole.length },
    })

    return new Response(JSON.stringify({
      ok: true,
      documento_markdown: r.md,
      tipo,
      tipo_nome: TIPI[tipo].nome[lingua],
      crediti_rimasti: Math.max(0, crediti.crediti_rimasti - (scalato ? 1 : 0)),
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await logLexCall({
      user_id: userIdEsterno, request_id: requestId, esito: 'error',
      errore: String(err?.message ?? err).slice(0, 500), durata_ms: Date.now() - t0,
    })
    return new Response(JSON.stringify({ ok: false, error: 'generazione non disponibile' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
