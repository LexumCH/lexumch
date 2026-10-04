import type {
  Appuntamento,
  DatiStudio,
  Fattura,
  Pratica,
  ScadenzaMandato,
  Ticket,
  Udienza,
} from '@/dati-finti/studio';

import { statoFattura, totaliConNote } from './calcoli';
import { giorniDaOggi, inizioGiorno } from './formati';
import { prossimaUdienza } from './pratiche';

// I conti della Dashboard dei professionisti, come le pagine «Dashboard» dei siti
// (IT e CH `src/pages/avvocato/Dashboard.jsx`, IT `commercialista/Dashboard.jsx`, CH `fiduciario/Dashboard.jsx`).
// Gli importi sono quelli della pagina Fatture dell'app: netto, meno le note di credito e i pagamenti già
// arrivati, così i numeri delle due schermate coincidono.

// ——— Periodo (solo avvocati: pratiche chiuse e incassato) ———

export type PresetPeriodo = 'mese-corrente' | 'mese-scorso' | 'ultimi-90' | 'personalizzato';
export const presetPeriodo: PresetPeriodo[] = ['mese-corrente', 'mese-scorso', 'ultimi-90', 'personalizzato'];
export type Periodo = { preset: PresetPeriodo; inizio: Date; fine: Date };

// Come `calcolaRange` del sito; «personalizzato» senza date va dall'inizio del mese a oggi.
export function calcolaPeriodo(preset: PresetPeriodo, da?: Date, a?: Date, oggi = new Date()): Periodo {
  let inizio: Date;
  let fine: Date;
  if (preset === 'mese-scorso') {
    inizio = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
    fine = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
  } else if (preset === 'ultimi-90') {
    fine = new Date(oggi);
    inizio = new Date(oggi);
    inizio.setDate(inizio.getDate() - 90);
  } else if (preset === 'personalizzato') {
    inizio = da ? new Date(da) : new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    fine = a ? new Date(a) : new Date(oggi);
  } else {
    inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
  }
  inizio.setHours(0, 0, 0, 0);
  fine.setHours(23, 59, 59, 999);
  return { preset, inizio, fine };
}

const dentro = (iso: string | undefined, p: { inizio: Date; fine: Date }) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= p.inizio.getTime() && t <= p.fine.getTime();
};

// Badge dei giorni, come `badgeUrgenza` del sito: passato e oggi rosso, entro 3 giorni oro,
// entro 7 salvia, oltre neutro.
export type Urgenza = {
  tipo: 'fa' | 'oggi' | 'fra';
  giorni: number;
  tono: 'pericolo' | 'oro' | 'ok' | 'neutro';
};
export function urgenzaGiorni(iso: string): Urgenza {
  const g = giorniDaOggi(iso);
  if (g < 0) return { tipo: 'fa', giorni: -g, tono: 'pericolo' };
  if (g === 0) return { tipo: 'oggi', giorni: 0, tono: 'pericolo' };
  if (g <= 3) return { tipo: 'fra', giorni: g, tono: 'oro' };
  if (g <= 7) return { tipo: 'fra', giorni: g, tono: 'ok' };
  return { tipo: 'fra', giorni: g, tono: 'neutro' };
}

// Saluto secondo l'ora, come sul sito.
export type MomentoGiorno = 'notte' | 'mattino' | 'pomeriggio' | 'sera';
export function momentoGiorno(d = new Date()): MomentoGiorno {
  const h = d.getHours();
  if (h < 6) return 'notte';
  if (h < 13) return 'mattino';
  if (h < 19) return 'pomeriggio';
  return 'sera';
}

const fatturaAperta = (f: Fattura) => f.tipo !== 'TD04' && f.stato === 'in_attesa';
const fatturaContata = (f: Fattura) => f.tipo !== 'TD04' && f.stato !== 'annullata';

// ——— Avvocato (IT e CH) ———

export type PraticaAttenzione = { pratica: Pratica; udienza: Udienza };

export type DashboardAvvocato = {
  clienti: number;
  praticheAperte: number;
  praticheChiuse: number; // nel periodo
  oggi: Appuntamento[];
  settimana: Appuntamento[];
  incassato: number; // fatture emesse nel periodo: quanto è già arrivato
  daIncassare: number; // tutte le fatture aperte, a prescindere dal periodo
  scadute: Fattura[];
  inScadenza: Fattura[]; // entro 3 giorni
  fattureInAttesa: number; // scadute + in scadenza, tutte
  messaggi: Ticket[]; // aperti, con l'ultima parola al cliente
  attenzione: PraticaAttenzione[]; // pratiche aperte con un'udienza entro 14 giorni
  sommario: { udienze: number; termini: number; appuntamenti: number };
};

export function dashboardAvvocato(
  d: DatiStudio,
  paese: string,
  periodo: Periodo,
  adesso = new Date(),
): DashboardAvvocato {
  const oggi0 = inizioGiorno(adesso);
  const domani0 = new Date(oggi0);
  domani0.setDate(domani0.getDate() + 1);
  const fra7 = new Date(oggi0);
  fra7.setDate(fra7.getDate() + 8); // fino alla fine del settimo giorno
  const fra3 = new Date(oggi0);
  fra3.setDate(fra3.getDate() + 4);

  const validi = d.appuntamenti
    .filter((a) => a.stato !== 'annullato')
    .sort((a, b) => a.inizio.localeCompare(b.inizio));
  const oggi = validi.filter((a) => {
    const t = new Date(a.inizio).getTime();
    return t >= oggi0.getTime() && t < domani0.getTime();
  });
  const settimana = validi
    .filter((a) => {
      const t = new Date(a.inizio).getTime();
      return t >= domani0.getTime() && t < fra7.getTime();
    })
    .slice(0, 8);

  const tot = (f: Fattura) => totaliConNote(f, d.fatture, paese);
  const incassato = d.fatture
    .filter((f) => fatturaContata(f) && dentro(f.emessa, periodo))
    .reduce((s, f) => s + tot(f).pagato, 0);
  const aperte = d.fatture.filter(fatturaAperta);
  const daIncassare = aperte.reduce((s, f) => s + tot(f).residuo, 0);
  const conScadenza = aperte
    .filter((f) => f.scadenza)
    .sort((a, b) => (a.scadenza ?? '').localeCompare(b.scadenza ?? ''));
  const tutteScadute = conScadenza.filter((f) => new Date(f.scadenza!).getTime() < oggi0.getTime());
  const tutteInScadenza = conScadenza.filter((f) => {
    const t = new Date(f.scadenza!).getTime();
    return t >= oggi0.getTime() && t < fra3.getTime();
  });

  const ultimo = (t: Ticket) => t.messaggi[t.messaggi.length - 1];
  const messaggi = d.comunicazioni
    .filter((t) => t.stato === 'aperto' && ultimo(t)?.da === 'cliente')
    .sort((a, b) => ultimo(b).quando.localeCompare(ultimo(a).quando));

  const attenzione = d.pratiche
    .filter((p) => p.stato === 'aperta')
    .map((p) => ({ pratica: p, udienza: prossimaUdienza(p) }))
    .filter((x): x is PraticaAttenzione => !!x.udienza && giorniDaOggi(x.udienza.dataOra) <= 14)
    .sort((a, b) => a.udienza.dataOra.localeCompare(b.udienza.dataOra))
    .slice(0, 5);

  return {
    clienti: d.clienti.length,
    praticheAperte: d.pratiche.filter((p) => p.stato === 'aperta').length,
    praticheChiuse: d.pratiche.filter((p) => p.stato === 'chiusa' && dentro(p.chiusa, periodo)).length,
    oggi,
    settimana,
    incassato,
    daIncassare,
    scadute: tutteScadute.slice(0, 5),
    inScadenza: tutteInScadenza.slice(0, 4),
    fattureInAttesa: tutteScadute.length + tutteInScadenza.length,
    messaggi: messaggi.slice(0, 5),
    attenzione,
    sommario: {
      udienze: oggi.filter((a) => a.tipo === 'udienza').length,
      termini: oggi.filter((a) => a.tipo === 'scadenza').length,
      appuntamenti: oggi.filter(
        (a) => a.tipo === 'presenza' || a.tipo === 'videocall' || a.tipo === 'telefonico',
      ).length,
    },
  };
}

// ——— Commercialista (IT) e fiduciario (CH): il quadro dello studio ———

export type MeseFatturato = { anno: number; mese: number; totale: number };

export type DashboardStudio = {
  anno: number;
  clienti: number;
  mandatiAttivi: number;
  fatturato: number; // fatture emesse nell'anno
  incassato: number; // di quelle, quanto è già arrivato
  daIncassare: number; // IT: tutte le aperte; CH: le aperte non ancora scadute
  scaduto: number; // aperte con la scadenza passata
  fattureScadute: number;
  scadenzeScadute: ScadenzaMandato[];
  prossimeScadenze: ScadenzaMandato[];
  appuntamenti: Appuntamento[];
  mesi: MeseFatturato[]; // ultimi sei mesi, il più vecchio prima
  conti: { clienteId: string; entrate: number; costi: number; stipendi: number; saldo: number }[];
};

export function dashboardStudio(d: DatiStudio, paese: string, adesso = new Date()): DashboardStudio {
  const anno = adesso.getFullYear();
  const oggi0 = inizioGiorno(adesso);
  const tot = (f: Fattura) => totaliConNote(f, d.fatture, paese);
  const dellAnno = d.fatture.filter((f) => fatturaContata(f) && new Date(f.emessa).getFullYear() === anno);
  const aperte = d.fatture.filter(fatturaAperta);
  const scadute = aperte.filter((f) => statoFattura(f) === 'scaduta');
  const nonScadute = aperte.filter((f) => statoFattura(f) !== 'scaduta');
  const somma = (elenco: Fattura[], fn: (f: Fattura) => number) => elenco.reduce((s, f) => s + fn(f), 0);

  // IT: le prime 8 scadenze aperte (anche scadute); CH: le scadute a parte, poi le prossime 6.
  const aperteScad = (d.scadenze ?? [])
    .filter((s) => s.aperta)
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  const scadenzeScadute =
    paese === 'CH' ? aperteScad.filter((s) => new Date(s.scadenza).getTime() < oggi0.getTime()) : [];
  const prossimeScadenze =
    paese === 'CH'
      ? aperteScad.filter((s) => new Date(s.scadenza).getTime() >= oggi0.getTime()).slice(0, 6)
      : aperteScad.slice(0, 8);

  // IT: appuntamenti programmati dei prossimi 7 giorni; CH: i prossimi, senza le scadenze.
  const fra7 = new Date(adesso.getTime() + 7 * 86400000);
  const appuntamenti = d.appuntamenti
    .filter((a) => {
      const t = new Date(a.inizio).getTime();
      if (t < adesso.getTime() || a.stato === 'annullato') return false;
      if (paese === 'CH') return a.tipo !== 'scadenza';
      return a.stato === 'programmato' && t <= fra7.getTime();
    })
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .slice(0, 6);

  const mesi: MeseFatturato[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(anno, adesso.getMonth() - i, 1);
    mesi.push({ anno: m.getFullYear(), mese: m.getMonth(), totale: 0 });
  }
  for (const f of d.fatture.filter(fatturaContata)) {
    const e = new Date(f.emessa);
    const m = mesi.find((x) => x.anno === e.getFullYear() && x.mese === e.getMonth());
    if (m) m.totale += tot(f).daIncassare;
  }

  const conti = (d.contiClienti ?? [])
    .filter((c) => c.entrate || c.costi || c.stipendi)
    .map((c) => ({ ...c, saldo: c.entrate - c.costi - c.stipendi }))
    .sort((a, b) => a.saldo - b.saldo)
    .slice(0, 15);

  return {
    anno,
    clienti: d.clienti.length,
    mandatiAttivi: (d.mandati ?? []).filter((m) => m.stato === 'attivo').length,
    fatturato: somma(dellAnno, (f) => tot(f).daIncassare),
    incassato: somma(dellAnno, (f) => tot(f).pagato),
    daIncassare: somma(paese === 'CH' ? nonScadute : aperte, (f) => tot(f).residuo),
    scaduto: somma(scadute, (f) => tot(f).residuo),
    fattureScadute: scadute.length,
    scadenzeScadute,
    prossimeScadenze,
    appuntamenti,
    mesi,
    conti,
  };
}
