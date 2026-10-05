import type { Fattura } from '@/dati-finti/studio';

// Totali delle fatture, con le stesse formule dei trigger dei siti
// (IT `ricalcola_totali_fattura`, CH `ricalcola_totali_fattura_ch`), arrotondando al centesimo.

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type Totali = {
  imponibile: number; // righe senza natura
  esenti: number; // IT: righe con natura N1 (spese anticipate, art. 15), fuori da cassa, IVA e ritenuta
  cpa: number; // IT: contributo cassa (4%)
  iva: number;
  ritenuta: number; // IT: ritenuta d'acconto, se applicata
  bollo: number; // IT: 2 € se il bollo è a carico del cliente
  totale: number; // IT: lordo; CH: totale
  netto: number; // IT: lordo − ritenuta, quello che paga il cliente; CH: il totale
  stornato: number; // IT: note di credito su questa fattura
  daIncassare: number; // netto − note di credito
  pagato: number;
  residuo: number;
};

// IT, come `ricalcola_totali_fattura` (04-10-2026):
//   cassa    = imponibile × cassa%
//   IVA      = (imponibile + cassa) × IVA%
//   ritenuta = imponibile × ritenuta%                 (se applicata)
//   lordo    = imponibile + cassa + IVA + spese esenti + bollo (se a carico del cliente)
//   netto    = lordo − ritenuta
// e come `aggiorna_stato_fattura`: si deve il netto meno le note di credito.
// CH, come `ricalcola_totali_fattura_ch`: IVA = esente ? 0 : imponibile × aliquota.
export function totaliFattura(
  f: Pick<
    Fattura,
    'righe' | 'cpa' | 'iva' | 'ritenuta' | 'esenteIva' | 'pagamenti' | 'bollo' | 'bolloACaricoCliente'
  >,
  paese: string,
  stornato = 0,
): Totali {
  const imponibile = r2(f.righe.filter((r) => !r.natura).reduce((s, r) => s + r2(r.quantita * r.prezzo), 0));
  const esenti = r2(f.righe.filter((r) => r.natura).reduce((s, r) => s + r2(r.quantita * r.prezzo), 0));
  let cpa = 0;
  let iva = 0;
  let ritenuta = 0;
  let bollo = 0;
  if (paese === 'IT') {
    cpa = r2((imponibile * (f.cpa ?? 0)) / 100);
    iva = r2(((imponibile + cpa) * f.iva) / 100);
    ritenuta = f.ritenuta ? r2((imponibile * f.ritenuta) / 100) : 0;
    bollo = f.bollo && f.bolloACaricoCliente !== false ? 2 : 0;
  } else {
    iva = f.esenteIva ? 0 : r2((imponibile * f.iva) / 100);
  }
  const totale = r2(imponibile + cpa + iva + esenti + bollo);
  const netto = r2(totale - ritenuta);
  const daIncassare = r2(netto - stornato);
  const pagato = r2(f.pagamenti.reduce((s, p) => s + p.importo, 0));
  return {
    imponibile,
    esenti,
    cpa,
    iva,
    ritenuta,
    bollo,
    totale,
    netto,
    stornato: r2(stornato),
    daIncassare,
    pagato,
    residuo: r2(Math.max(0, daIncassare - pagato)),
  };
}

// Il totale delle note di credito (TD04) che stornano una fattura.
export function stornatoDa(fatture: Fattura[], fatturaId: string, paese: string): number {
  return r2(
    fatture
      .filter((n) => n.tipo === 'TD04' && n.origineId === fatturaId)
      .reduce((s, n) => s + totaliFattura(n, paese).netto, 0),
  );
}

// I totali di una fattura tenendo conto delle note di credito che la stornano.
export function totaliConNote(f: Fattura, fatture: Fattura[], paese: string): Totali {
  return totaliFattura(f, paese, f.tipo === 'TD04' ? 0 : stornatoDa(fatture, f.id, paese));
}

// Lo stato dopo un pagamento o una nota di credito, come `aggiorna_stato_fattura` del sito:
// stornata tutta → annullata; pagato il dovuto → pagata; altrimenti in attesa.
// Le note di credito restano «emessa»; una fattura annullata resta annullata (se non per uno storno).
export function statoDopo(f: Fattura, fatture: Fattura[], paese: string, daStorno = false): Fattura['stato'] {
  if (f.tipo === 'TD04') return f.stato;
  if (f.stato === 'annullata' && !daStorno) return f.stato;
  const t = totaliConNote(f, fatture, paese);
  if (t.stornato > 0 && t.daIncassare <= 0.01) return 'annullata';
  if (t.pagato > 0 && t.pagato >= t.daIncassare - 0.01) return 'pagata';
  return 'in_attesa';
}

// Imposta di bollo (IT): dovuta quando la parte senza IVA supera 77,47 € (bolloDovuto del sito).
export const sogliaBollo = 77.47;
export function bolloDovuto(t: Pick<Totali, 'esenti' | 'imponibile' | 'cpa'>, ivaPercento: number): boolean {
  return t.esenti + (ivaPercento === 0 ? t.imponibile + t.cpa : 0) > sogliaBollo;
}

export type StatoVisto = 'in_attesa' | 'pagata' | 'scaduta' | 'annullata' | 'emessa';

// «Scaduta» non è salvata: è una fattura in attesa con la scadenza passata (come sul sito).
export function statoFattura(f: Fattura): StatoVisto {
  if (f.stato !== 'in_attesa' || !f.scadenza) return f.stato;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return new Date(f.scadenza) < oggi ? 'scaduta' : 'in_attesa';
}

export function valuta(paese: string): string {
  return paese === 'CH' ? 'CHF' : '€';
}

// 1'234.50 CHF (stile svizzero) oppure 1.234,50 € (stile italiano).
export function importo(n: number, paese: string): string {
  if (paese === 'CH') {
    const [intera, decimali] = n.toFixed(2).split('.');
    return `CHF ${intera.replace(/\B(?=(\d{3})+(?!\d))/g, '’')}.${decimali}`;
  }
  const [intera, decimali] = n.toFixed(2).split('.');
  return `${intera.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimali} €`;
}
