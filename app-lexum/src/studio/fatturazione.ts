import type { TonoBadge } from '@/componenti/Elementi';
import type { CassaIT, Cliente, DatiFatturazione, Fattura } from '@/dati-finti/studio';
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
  CH: ['QR-fattura', 'Bonifico', 'Contanti', 'Carta / TWINT'],
};

const chiaviMetodo: Record<string, Chiave> = {
  Bonifico: 'fatture.metodi.bonifico',
  Contanti: 'fatture.metodi.contanti',
  Carta: 'fatture.metodi.carta',
  Assegno: 'fatture.metodi.assegno',
  'QR-fattura': 'fatture.metodi.qr',
  'Carta / TWINT': 'fatture.metodi.twint',
};

// «Bonifico» → «Überweisung», «Virement»; un metodo sconosciuto si mostra com'è.
export function nomeMetodo(metodo: string, lingua: Lingua = 'it'): string {
  const chiave = chiaviMetodo[metodo];
  return chiave ? traduci(lingua, chiave) : metodo;
}

// ——— Italia: casse, regimi, natura IVA (src/lib/fatturazione.js del sito, 04-10-2026) ———
export const casse: CassaIT[] = ['cassa_forense', 'cnpadc', 'cnpr', 'nessuna'];

export function cassaPredefinita(ruolo: string): CassaIT {
  return ruolo === 'commercialista' ? 'cnpadc' : 'cassa_forense';
}

// La riga della cassa in fattura: CPA per l'avvocato, contributo integrativo CNPADC o CNPR.
// Null: nessuna cassa, nessuna riga.
export function nomeContributo(cassa: CassaIT | undefined, lingua: Lingua = 'it'): string | null {
  if (cassa === 'nessuna') return null;
  if (cassa === 'cnpadc') return traduci(lingua, 'fatture.contributo.cnpadc');
  if (cassa === 'cnpr') return traduci(lingua, 'fatture.contributo.cnpr');
  return traduci(lingua, 'fatture.contributo.cpa');
}

// Natura IVA di una fattura con IVA 0 in regime ordinario (codici della fattura elettronica).
// Sono solo italiani: si mostrano sempre in italiano, come nel sito.
export const natureIva = [
  { codice: 'N2.1', etichetta: 'N2.1 – Non soggetta (artt. 7-7septies, es. cliente estero)' },
  { codice: 'N2.2', etichetta: 'N2.2 – Non soggetta, altri casi' },
  { codice: 'N3.1', etichetta: 'N3.1 – Non imponibile, esportazioni' },
  { codice: 'N3.2', etichetta: 'N3.2 – Non imponibile, cessioni intracomunitarie' },
  { codice: 'N4', etichetta: 'N4 – Esente (art. 10 DPR 633/72)' },
  { codice: 'N6.9', etichetta: 'N6.9 – Inversione contabile, altri casi' },
  { codice: 'N7', etichetta: 'N7 – IVA assolta in altro Stato UE' },
] as const;

// «N2.2 Non soggetta, altri casi»; N1 sono le spese anticipate (art. 15).
export function nomeNatura(codice?: string): string {
  if (!codice) return '';
  if (codice === 'N1') return 'N1 Escluse ex art. 15';
  const n = natureIva.find((x) => x.codice === codice);
  return n ? n.etichetta.replace(' – ', ' ') : codice;
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

// IBAN di qualunque paese, con il controllo modulo 97 (come ibanValido dei siti).
export function ibanValido(s: string): boolean {
  const v = senzaSpazi(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  const riordinato = v.slice(4) + v.slice(0, 4);
  let resto = 0;
  for (const c of riordinato) {
    const n = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const cifra of n) resto = (resto * 10 + Number(cifra)) % 97;
  }
  return resto === 1;
}

// La QR-fattura accetta solo conti svizzeri o del Liechtenstein (21 caratteri).
export function ibanSvizzero(s: string): boolean {
  const v = senzaSpazi(s);
  return /^(CH|LI)\d{7}[A-Z0-9]{12}$/.test(v) && ibanValido(v);
}

// QR-IBAN: IBAN svizzero con l'identificativo della banca tra 30000 e 31999.
// Si usa solo con il riferimento QR: per i bonifici serve l'IBAN normale.
export function eQrIban(s: string): boolean {
  const v = senzaSpazi(s);
  if (!/^(CH|LI)\d{7}/.test(v)) return false;
  const iid = Number(v.slice(4, 9));
  return iid >= 30000 && iid <= 31999;
}

// Numero IDI (UID) svizzero: CHE-123.456.789, l'ultima cifra è di controllo (modulo 11).
// Come normalizzaUid del sito svizzero: la forma ufficiale (senza IVA/MWST/TVA), o null.
export function normalizzaUid(s: string): string | null {
  const v = s
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/(MWST|TVA|IVA|VAT)$/, '');
  const m = /^CHE(\d{9})$/.exec(v);
  if (!m) return null;
  const d = m[1].split('').map(Number);
  const somma = [5, 4, 3, 2, 7, 6, 5, 4].reduce((tot, peso, i) => tot + peso * d[i], 0);
  const controllo = (11 - (somma % 11)) % 11;
  if (controllo === 10 || controllo !== d[8]) return null;
  return `CHE-${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6)}`;
}
export function numeroIvaValido(s: string): boolean {
  return normalizzaUid(s) !== null;
}

// Codice destinatario SDI: 7 caratteri; 6 per la Pubblica Amministrazione (solo come cliente).
export function sdiValido(s: string, ancheSei = true): boolean {
  return (ancheSei ? /^[A-Z0-9]{6,7}$/i : /^[A-Z0-9]{7}$/i).test(s.trim());
}

// ——— dati che mancano ———
// Cosa manca al professionista per emettere una fattura. Vuoto: si può fatturare.
export function mancanoAlProfessionista(d: DatiFatturazione, paese: string, lingua: Lingua = 'it'): string[] {
  const manca: string[] = [];
  const vuoto = (v?: string) => !v || !v.trim();
  const t = (chiave: Chiave) => traduci(lingua, chiave);
  if (paese === 'IT') {
    // come la nuova fattura del sito: partita IVA, codice fiscale, indirizzo (via, CAP, comune)
    if (vuoto(d.piva)) manca.push(t('fatture.manca.partitaIva'));
    if (vuoto(d.cf)) manca.push(t('fatture.manca.codiceFiscale'));
    if (vuoto(d.via) || vuoto(d.cap) || vuoto(d.citta)) manca.push(t('fatture.manca.indirizzoStudio'));
  } else {
    // come mancanzeQr del sito: indirizzo e un IBAN svizzero; con l'IVA anche il numero IDI
    if (vuoto(d.via) || vuoto(d.cap) || vuoto(d.citta)) manca.push(t('fatture.manca.indirizzoStudio'));
    if (!ibanSvizzero(d.iban ?? '') && !ibanSvizzero(d.qrIban ?? '')) manca.push(t('fatture.manca.iban'));
    if (d.assoggettatoIva && vuoto(d.numeroIva)) manca.push(t('fatture.manca.numeroIva'));
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

// Il cliente italiano con partita IVA riceve la fattura elettronica con il codice SDI o la PEC:
// se non ha né l'uno né l'altra, il sito avvisa (senza bloccare).
export function senzaRecapitoSdi(c: Cliente): boolean {
  return !!c.piva && !c.codiceDestinatario && !c.pecFatturazione;
}

// «partita IVA, codice fiscale e indirizzo» (in tedesco «und», in francese «et»)
export function elenco(voci: string[], lingua: Lingua = 'it'): string {
  if (voci.length <= 1) return voci.join('');
  return `${voci.slice(0, -1).join(', ')} ${traduci(lingua, 'fatture.manca.e')} ${voci[voci.length - 1]}`;
}

// Svizzera: aliquote IVA dal 2024 (normale, ridotta, alloggio).
export const aliquoteCH = [8.1, 2.6, 3.8];
export const aliquotaIvaCH = aliquoteCH[0];

// Il motivo dell'esenzione sul sito è un testo libero. Questi sono suggerimenti, si salvano in italiano
// e si traducono quando si mostrano. 'non_assoggettato' lo mette il database quando chi emette
// non è iscritto nel registro IVA (trigger `trg_fatture_iva_assoggettamento`).
export const motiviEsenzioneCH = [
  'Prestazione a un cliente all’estero (art. 8 LIVA)',
  'Prestazione esclusa dall’imposta (art. 21 LIVA)',
];
export const nonAssoggettato = 'non_assoggettato';

const chiaviMotivo: Record<string, Chiave> = {
  [motiviEsenzioneCH[0]]: 'fatture.esenzione.estero',
  [motiviEsenzioneCH[1]]: 'fatture.esenzione.esclusa',
  [nonAssoggettato]: 'fatture.esenzione.nonAssoggettato',
};

// Il motivo nella lingua chiesta; uno scritto a mano si mostra com'è.
export function nomeMotivo(motivo: string, lingua: Lingua = 'it'): string {
  const chiave = chiaviMotivo[motivo];
  return chiave ? traduci(lingua, chiave) : motivo;
}

// Il testo dello stato è in fatture.stati (testoStato); lo stato salvato resta quello del database.
export const statiFattura: Record<StatoVisto, { tono: TonoBadge }> = {
  in_attesa: { tono: 'oro' },
  scaduta: { tono: 'pericolo' },
  pagata: { tono: 'ok' },
  annullata: { tono: 'neutro' },
  emessa: { tono: 'neutro' },
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
  if (stato === 'emessa') return t('fatture.quando.emessaIl', { data: dataBreve(f.emessa, lingua) });
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
