import type { TonoBadge } from '@/componenti/Elementi';
import type { Cliente, DatiFatturazione, Fattura } from '@/dati-finti/studio';
import { traduci, type Chiave, type Lingua } from '@/lingue';

import { statoFattura, type StatoVisto } from './calcoli';
import { dataBreve, giorniDaOggi } from './formati';

// Regole della fatturazione per paese: dati obbligatori del professionista e del cliente,
// controlli dei formati, metodi di pagamento. Italia e Svizzera hanno due processi diversi:
// IT con CPA, IVA 22% e ritenuta d'acconto; CH con IVA 8,1% (o esente) e QR-fattura.
// I testi sono in src/lingue/sezioni/fatture.ts: le funzioni prendono la lingua per ultima (predefinita: italiano).

// I metodi si salvano in fattura così, in italiano: si traducono solo quando si mostrano (nomeMetodo).
export const metodiPagamento: Record<string, string[]> = {
  IT: ['Bonifico', 'Contanti', 'Carta', 'Assegno'],
  CH: ['QR-fattura', 'Bonifico', 'Contanti'],
};

const chiaviMetodo: Record<string, Chiave> = {
  Bonifico: 'fatture.metodi.bonifico',
  Contanti: 'fatture.metodi.contanti',
  Carta: 'fatture.metodi.carta',
  Assegno: 'fatture.metodi.assegno',
  'QR-fattura': 'fatture.metodi.qr',
};

// «Bonifico» → «Überweisung», «Virement»; un metodo sconosciuto si mostra com'è.
export function nomeMetodo(metodo: string, lingua: Lingua = 'it'): string {
  const chiave = chiaviMetodo[metodo];
  return chiave ? traduci(lingua, chiave) : metodo;
}

export const nomiCassa = {
  TC01: 'Cassa Forense',
  TC04: 'Cassa dottori commercialisti (CNPADC)',
} as const;

// Il contributo che si aggiunge in fattura: per l'avvocato è la CPA, per il commercialista
// il contributo integrativo. Stessa aliquota (4%), stessa posizione nel calcolo.
export function nomeContributo(cassa?: DatiFatturazione['cassa'], lingua: Lingua = 'it'): string {
  return traduci(lingua, cassa === 'TC04' ? 'fatture.contributo.integrativo' : 'fatture.contributo.cpa');
}

// ——— controlli dei formati (solo la forma: il controllo vero lo fa il fisco) ———
const senzaSpazi = (s: string) => s.replace(/\s+/g, '').toUpperCase();

export function pivaValida(s: string): boolean {
  const v = senzaSpazi(s);
  if (!/^\d{11}$/.test(v)) return false;
  // cifra di controllo della partita IVA italiana
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(v[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somma += n;
  }
  return (10 - (somma % 10)) % 10 === Number(v[10]);
}

// Codice fiscale di una persona (16 caratteri) oppure di una società (11 cifre).
export function cfValido(s: string): boolean {
  const v = senzaSpazi(s);
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(v) || /^\d{11}$/.test(v);
}

export function capValido(s: string, paese: string): boolean {
  return paese === 'CH' ? /^\d{4}$/.test(s.trim()) : /^\d{5}$/.test(s.trim());
}

// IBAN: IT 27 caratteri, CH e LI 21. Con il controllo modulo 97.
export function ibanValido(s: string, paese: string): boolean {
  const v = senzaSpazi(s);
  const lunghezza = paese === 'CH' ? 21 : 27;
  const prefissi = paese === 'CH' ? ['CH', 'LI'] : ['IT'];
  if (v.length !== lunghezza || !prefissi.includes(v.slice(0, 2))) return false;
  const riordinato = v.slice(4) + v.slice(0, 4);
  let resto = 0;
  for (const c of riordinato) {
    const n = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const cifra of n) resto = (resto * 10 + Number(cifra)) % 97;
  }
  return resto === 1;
}

// QR-IBAN: IBAN svizzero con l'identificativo della banca tra 30000 e 31999.
export function eQrIban(s: string): boolean {
  const v = senzaSpazi(s);
  const iid = Number(v.slice(4, 9));
  return (v.startsWith('CH') || v.startsWith('LI')) && iid >= 30000 && iid <= 31999;
}

// Numero IVA svizzero: CHE-123.456.789 IVA (in tedesco MWST, in francese TVA).
export function numeroIvaValido(s: string): boolean {
  return /^CHE-?\d{3}\.?\d{3}\.?\d{3}\s*(IVA|MWST|TVA)?$/i.test(s.trim());
}

// ——— dati che mancano ———
// Cosa manca al professionista per emettere una fattura. Vuoto: si può fatturare.
export function mancanoAlProfessionista(d: DatiFatturazione, paese: string, lingua: Lingua = 'it'): string[] {
  const manca: string[] = [];
  const vuoto = (v?: string) => !v || !v.trim();
  const t = (chiave: Chiave) => traduci(lingua, chiave);
  if (paese === 'IT') {
    if (vuoto(d.piva)) manca.push(t('fatture.manca.partitaIva'));
    if (vuoto(d.cf)) manca.push(t('fatture.manca.codiceFiscale'));
    if (vuoto(d.via) || vuoto(d.cap) || vuoto(d.citta) || vuoto(d.provincia))
      manca.push(t('fatture.manca.indirizzoStudio'));
    if (!d.regime) manca.push(t('fatture.manca.regime'));
  } else {
    if (vuoto(d.via) || vuoto(d.cap) || vuoto(d.citta)) manca.push(t('fatture.manca.indirizzoStudio'));
    if (vuoto(d.iban)) manca.push(t('fatture.manca.iban'));
    if (d.assoggettatoIva == null) manca.push(t('fatture.manca.assoggettato'));
    else if (d.assoggettatoIva && vuoto(d.numeroIva)) manca.push(t('fatture.manca.numeroIva'));
  }
  return manca;
}

// Cosa manca al cliente. In Italia: codice fiscale (persona) o partita IVA (società) e indirizzo.
// In Svizzera: l'indirizzo, che va anche nella QR-fattura.
export function mancanoAlCliente(c: Cliente, paese: string, lingua: Lingua = 'it'): string[] {
  const manca: string[] = [];
  const t = (chiave: Chiave) => traduci(lingua, chiave);
  if (paese === 'IT') {
    if (c.giuridica ? !c.piva && !c.cf : !c.cf)
      manca.push(t(c.giuridica ? 'fatture.manca.partitaIva' : 'fatture.manca.codiceFiscale'));
    if (!c.indirizzo || !c.cap || !c.citta) manca.push(t('fatture.manca.indirizzo'));
  } else if (!c.indirizzo || !c.cap || !c.citta) {
    manca.push(t('fatture.manca.indirizzo'));
  }
  return manca;
}

// «partita IVA, codice fiscale e indirizzo» (in tedesco «und», in francese «et»)
export function elenco(voci: string[], lingua: Lingua = 'it'): string {
  if (voci.length <= 1) return voci.join('');
  return `${voci.slice(0, -1).join(', ')} ${traduci(lingua, 'fatture.manca.e')} ${voci[voci.length - 1]}`;
}

// Motivi d'esenzione IVA in Svizzera (art. 10 e 21 LIVA), come si scrivono in fattura.
// Si salvano così, in italiano: si traducono solo quando si mostrano (nomeMotivo).
export const motiviEsenzioneCH = [
  'Non assoggettato all’IVA (cifra d’affari sotto CHF 100’000)',
  'Prestazione a un cliente all’estero (art. 8 LIVA)',
  'Prestazione esclusa dall’imposta (art. 21 LIVA)',
];

const chiaviMotivo: Chiave[] = [
  'fatture.esenzione.sottoSoglia',
  'fatture.esenzione.estero',
  'fatture.esenzione.esclusa',
];

// Il motivo nella lingua chiesta; uno scritto a mano (per esempio sul sito) si mostra com'è.
export function nomeMotivo(motivo: string, lingua: Lingua = 'it'): string {
  const i = motiviEsenzioneCH.indexOf(motivo);
  return i >= 0 ? traduci(lingua, chiaviMotivo[i]) : motivo;
}

export const aliquotaIvaCH = 8.1;

// Il testo dello stato è in fatture.stati (testoStato); lo stato salvato resta quello del database.
export const statiFattura: Record<StatoVisto, { tono: TonoBadge }> = {
  in_attesa: { tono: 'oro' },
  scaduta: { tono: 'pericolo' },
  pagata: { tono: 'ok' },
  annullata: { tono: 'neutro' },
};

// «In attesa», «Ausstehend», «En attente»…
export function testoStato(stato: StatoVisto, lingua: Lingua = 'it'): string {
  return traduci(lingua, `fatture.stati.${stato}`);
}

// «Scade tra 5 giorni», «Scaduta da 30 giorni», «Pagata il 22 set».
export function quandoFattura(f: Fattura, lingua: Lingua = 'it'): string {
  const t = (chiave: Chiave, valori?: Record<string, string | number>) => traduci(lingua, chiave, valori);
  const stato = statoFattura(f);
  if (stato === 'annullata')
    return t('fatture.quando.emessaAnnullata', { data: dataBreve(f.emessa, lingua) });
  if (stato === 'pagata') {
    const ultimo = f.pagamenti[f.pagamenti.length - 1];
    return ultimo
      ? t('fatture.quando.pagataIl', { data: dataBreve(ultimo.data, lingua) })
      : t('fatture.stati.pagata');
  }
  if (!f.scadenza) return t('fatture.quando.emessaIl', { data: dataBreve(f.emessa, lingua) });
  const g = giorniDaOggi(f.scadenza);
  if (g < 0) return g === -1 ? t('fatture.quando.scadutaIeri') : t('fatture.quando.scadutaDa', { n: -g });
  if (g === 0) return t('fatture.quando.scadeOggi');
  if (g === 1) return t('fatture.quando.scadeDomani');
  return g <= 30
    ? t('fatture.quando.scadeTra', { n: g })
    : t('fatture.quando.scadeIl', { data: dataBreve(f.scadenza, lingua) });
}

// Importi scritti a mano: «1.234,50» o «1234,5» in Italia, «1’234.50» o «1234,50» in Svizzera.
export function leggiImporto(testo: string, paese: string): number | null {
  let t = testo.replace(/[\s’'€]|CHF/g, '');
  if (!t) return null;
  if (paese === 'IT') t = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  else t = t.replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}

export function scriviImporto(n: number, paese: string): string {
  const t = n.toFixed(2);
  return paese === 'IT' ? t.replace('.', ',') : t;
}

// 22 → «22%», 8.1 → «8,1%»
export function percento(n: number): string {
  return `${String(n).replace('.', ',')}%`;
}
