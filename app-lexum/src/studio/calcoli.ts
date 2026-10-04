import type { Fattura } from '@/dati-finti/studio';

// Totali delle fatture, con le stesse formule dei trigger dei siti
// (IT `ricalcola_totali_fattura`, CH `ricalcola_totali_fattura_ch`), arrotondando al centesimo.

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type Totali = {
  imponibile: number;
  cpa: number; // IT: contributo cassa (4%)
  iva: number;
  ritenuta: number; // IT: ritenuta d'acconto, se applicata
  totale: number; // IT: lordo; CH: totale
  daIncassare: number; // quanto paga davvero il cliente: IT lordo − ritenuta
  pagato: number;
  residuo: number;
};

export function totaliFattura(
  f: Pick<Fattura, 'righe' | 'cpa' | 'iva' | 'ritenuta' | 'esenteIva' | 'pagamenti'>,
  paese: string,
): Totali {
  const imponibile = r2(f.righe.reduce((s, r) => s + r2(r.quantita * r.prezzo), 0));
  let cpa = 0;
  let iva = 0;
  let ritenuta = 0;
  if (paese === 'IT') {
    // imponibile → +CPA → +IVA su (imponibile + CPA); ritenuta sull'imponibile
    cpa = r2((imponibile * (f.cpa ?? 0)) / 100);
    iva = r2(((imponibile + cpa) * f.iva) / 100);
    ritenuta = f.ritenuta ? r2((imponibile * f.ritenuta) / 100) : 0;
  } else {
    iva = f.esenteIva ? 0 : r2((imponibile * f.iva) / 100);
  }
  const totale = r2(imponibile + cpa + iva);
  // Il cliente sostituto d'imposta versa la ritenuta al fisco: a noi paga il netto.
  // (Sul sito oggi il confronto è con il lordo: la fattura resterebbe «in attesa».)
  const daIncassare = r2(totale - ritenuta);
  const pagato = r2(f.pagamenti.reduce((s, p) => s + p.importo, 0));
  return {
    imponibile,
    cpa,
    iva,
    ritenuta,
    totale,
    daIncassare,
    pagato,
    residuo: r2(Math.max(0, daIncassare - pagato)),
  };
}

export type StatoVisto = 'in_attesa' | 'pagata' | 'scaduta' | 'annullata';

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
