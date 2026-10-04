// Copia di `src/lib/parametriForensi/engine.js` del sito italiano (Lexumita/lexumita), 04-10-2026,
// con i tipi TypeScript. Stesse formule: se il sito cambia, va aggiornata anche qui.
//
// Motore di calcolo del compenso avvocato sui parametri forensi (DM 55/2014,
// tabelle 2022 vigenti). Funzioni pure, nessun effetto collaterale.
//
// Il motore produce le RIGHE da inserire nella fattura (una per fase + aumenti/
// riduzioni + spese generali forfettarie). CPA/IVA/ritenuta NON sono aggiunti
// qui: li calcola il wizard fattura (e il trigger DB) sull'imponibile, così la
// catena resta: compenso → +15% spese generali → +4% CPA → +22% IVA, ritenuta
// 20% su (compenso+15%).

import { ACCESSORI, BANDA, LIVELLI, SCAGLIONE_BASE_ID, SCAGLIONI, getCompetenza, getFasi } from './catalogo';
import { TABELLE } from './tabelle';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// Art. 6 DM 55/2014 (coord. DM 147/2022): oltre € 520.000, per ogni raddoppio di valore
// il compenso cresce fino al +30% → fattore composto 1,30^k sull'ultimo scaglione tabulato.
const ART6_INCREMENTO = 0.3;

function scaglioniComputatiOltreBase(scaglioneId: string): number {
  const idx = SCAGLIONI.findIndex((s) => s.id === scaglioneId);
  const baseIdx = SCAGLIONI.findIndex((s) => s.id === SCAGLIONE_BASE_ID);
  if (idx < 0 || baseIdx < 0) return 0;
  return Math.max(0, idx - baseIdx);
}

// Valore medio (euro) per una fase; null se il dato non c'è.
export function valoreMedioFase(
  competenzaKey: string,
  versione: string,
  scaglioneId: string | null,
  faseId: string,
): number | null {
  const tab = TABELLE[versione]?.[competenzaKey];
  if (!tab) return null;
  const competenza = getCompetenza(competenzaKey);

  // Penale: nessuno scaglione di valore, un solo set di valori medi per fase.
  if (competenza?.tipo === 'penale') return tab.valoriMedi?.[faseId] ?? null;

  const scag = SCAGLIONI.find((s) => s.id === scaglioneId);
  if (!scag) return null;
  if (!scag.computato) return tab.scaglioni?.[scag.id]?.[faseId] ?? null;

  // Scaglione oltre € 520.000: progressione art. 6 solo per le tabelle a scaglione.
  if (competenza?.tipo !== 'scaglione') return null;
  const base = tab.scaglioni?.[SCAGLIONE_BASE_ID]?.[faseId];
  if (base == null) return null;
  const k = scaglioniComputatiOltreBase(scag.id);
  return r2(base * Math.pow(1 + ART6_INCREMENTO, k));
}

export type Livello = 'min' | 'medio' | 'max';

export function fattoreLivello(livello: Livello, versione: string): number {
  const banda = BANDA[versione] ?? BANDA['2022'];
  if (livello === 'min') return banda.min;
  if (livello === 'max') return banda.max;
  return 1;
}

// Quali fasi hanno un valore per competenza e scaglione.
export function fasiDisponibili(
  competenzaKey: string,
  versione: string,
  scaglioneId: string | null,
): string[] {
  return getFasi(competenzaKey)
    .filter((f) => valoreMedioFase(competenzaKey, versione, scaglioneId, f.id) != null)
    .map((f) => f.id);
}

// Scaglione dal valore della causa (euro).
export function scaglioneDaValore(valore: number): string | null {
  const v = Number(valore);
  if (!Number.isFinite(v) || v < 0) return null;
  const s = SCAGLIONI.find((sc) => v >= sc.min && (sc.max == null || v <= sc.max));
  return s?.id ?? null;
}

export type InputParcella = {
  versione?: string;
  competenzaKey: string;
  scaglioneId: string | null;
  fasi: Record<string, { incluso: boolean; livello: Livello }>;
  aumenti?: { id: string; label: string; pct: number }[];
  riduzioni?: { id: string; label: string; pct: number }[];
  includiSpeseGenerali?: boolean;
  applicaRitenuta?: boolean;
};

export type RigaParcella = { descrizione: string; quantita: number; prezzo_unitario: number };

export type EsitoParcella = {
  ok: boolean;
  errore: string | null;
  righe: RigaParcella[];
  riepilogo?: {
    compensoFasi: number;
    aumentoTot: number;
    riduzioneTot: number;
    compenso: number;
    speseGenerali: number;
    imponibile: number;
    cpa: number;
    iva: number;
    ritenuta: number;
    totaleLordo: number;
    totaleNetto: number;
  };
  note: string[];
};

export function calcolaParcella(input: InputParcella): EsitoParcella {
  const {
    versione = '2022',
    competenzaKey,
    scaglioneId,
    fasi,
    aumenti = [],
    riduzioni = [],
    includiSpeseGenerali = true,
    applicaRitenuta = false,
  } = input;

  const competenza = getCompetenza(competenzaKey);
  const scaglione = SCAGLIONI.find((s) => s.id === scaglioneId) ?? null;
  const note: string[] = [];
  const righe: RigaParcella[] = [];

  if (!competenza) return { ok: false, errore: 'Competenza non valida', righe: [], note };
  if (competenza.tipo !== 'penale' && !scaglione) {
    return { ok: false, errore: 'Scaglione non valido', righe: [], note };
  }

  let compensoFasi = 0;
  for (const f of getFasi(competenzaKey)) {
    const cfg = fasi[f.id];
    if (!cfg?.incluso) continue;
    const medio = valoreMedioFase(competenzaKey, versione, scaglioneId, f.id);
    if (medio == null) {
      note.push(`Fase "${f.sigla}" non disponibile per questa competenza/scaglione.`);
      continue;
    }
    const livello = cfg.livello || 'medio';
    const valore = r2(medio * fattoreLivello(livello, versione));
    compensoFasi += valore;
    const livLabel = LIVELLI.find((l) => l.id === livello)?.label ?? 'Medio';
    const faseTxt = f.id === 'compenso' ? 'Compenso' : `Compenso — ${f.label}`;
    const scagTxt =
      competenza.tipo === 'penale' || !scaglione
        ? competenza.label
        : `${competenza.label}, ${scaglione.label}`;
    righe.push({
      descrizione: `${faseTxt} (${livLabel}) · ${scagTxt}`,
      quantita: 1,
      prezzo_unitario: valore,
    });
  }
  compensoFasi = r2(compensoFasi);

  if (scaglione?.computato) {
    note.push('Scaglione oltre 520.000 €: valori calcolati per progressione (art. 6). Verificare.');
  }

  // Aumenti: percentuale sul compenso delle fasi.
  let aumentoTot = 0;
  for (const a of aumenti) {
    const pct = Number(a.pct) || 0;
    if (pct <= 0) continue;
    const delta = r2((compensoFasi * pct) / 100);
    if (delta === 0) continue;
    aumentoTot += delta;
    righe.push({ descrizione: `Aumento — ${a.label} (+${pct}%)`, quantita: 1, prezzo_unitario: delta });
  }

  // Riduzioni: percentuale sul compenso delle fasi, riga negativa.
  let riduzioneTot = 0;
  for (const rd of riduzioni) {
    const pct = Number(rd.pct) || 0;
    if (pct <= 0) continue;
    const delta = r2((compensoFasi * pct) / 100);
    if (delta === 0) continue;
    riduzioneTot += delta;
    righe.push({ descrizione: `Riduzione — ${rd.label} (−${pct}%)`, quantita: 1, prezzo_unitario: -delta });
  }

  let compenso = r2(compensoFasi + aumentoTot - riduzioneTot);
  if (compenso < 0) compenso = 0;

  // Spese generali forfettarie 15% sul compenso (dopo aumenti e riduzioni).
  const speseGenerali = includiSpeseGenerali ? r2((compenso * ACCESSORI.speseGeneraliPct) / 100) : 0;
  if (includiSpeseGenerali && speseGenerali > 0) {
    righe.push({
      descrizione: `Spese generali forfettarie ${ACCESSORI.speseGeneraliPct}% (art. 2 DM 55/2014)`,
      quantita: 1,
      prezzo_unitario: speseGenerali,
    });
  }

  // Anteprima degli accessori (la fattura li ricalcola sull'imponibile).
  const imponibile = r2(compenso + speseGenerali);
  const cpa = r2((imponibile * ACCESSORI.cpaPct) / 100);
  const iva = r2(((imponibile + cpa) * ACCESSORI.ivaPct) / 100);
  const ritenuta = applicaRitenuta ? r2((imponibile * ACCESSORI.ritenutaPct) / 100) : 0;
  const totaleLordo = r2(imponibile + cpa + iva);
  const totaleNetto = r2(totaleLordo - ritenuta);

  return {
    ok: righe.length > 0,
    errore: righe.length === 0 ? 'Seleziona almeno una fase con valore disponibile' : null,
    righe,
    riepilogo: {
      compensoFasi,
      aumentoTot,
      riduzioneTot,
      compenso,
      speseGenerali,
      imponibile,
      cpa,
      iva,
      ritenuta,
      totaleLordo,
      totaleNetto,
    },
    note,
  };
}
