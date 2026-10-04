// Date e ore in italiano, scritte a mano: non dipendono dal supporto Intl del telefono.

const mesi = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];
const giorniSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const iniziali = ['L', 'M', 'M', 'G', 'V', 'S', 'D']; // la settimana parte dal lunedì

export function inizioGiorno(d: Date | string): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function stessoGiorno(a: Date | string, b: Date | string): boolean {
  return inizioGiorno(a).getTime() === inizioGiorno(b).getTime();
}

// Giorni da oggi (0 = oggi, 1 = domani, −1 = ieri).
export function giorniDaOggi(iso: string): number {
  return Math.round((inizioGiorno(iso).getTime() - inizioGiorno(new Date()).getTime()) / 86400000);
}

export function dataBreve(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${mesi[d.getMonth()].slice(0, 3)}`;
}

export function dataCompleta(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
}

export function dataNumerica(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function ora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// «Oggi · sabato 4 ottobre», «Domani · …», altrimenti «lunedì 6 ottobre».
export function titoloGiorno(iso: string): string {
  const d = new Date(iso);
  const base = `${giorniSettimana[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  const g = giorniDaOggi(iso);
  if (g === 0) return `Oggi · ${base}`;
  if (g === 1) return `Domani · ${base}`;
  if (g === -1) return `Ieri · ${base}`;
  return base;
}

export function nomeMese(anno: number, mese: number): string {
  const m = mesi[mese];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${anno}`;
}

// Urgenza di un termine, come sul sito: scaduto, oggi o entro 3 giorni rosso; entro 7 ambra;
// entro 30 verde; oltre grigio.
export type Urgenza = { testo: string; tono: 'pericolo' | 'avviso' | 'ok' | 'neutro' };
export function urgenza(iso: string): Urgenza {
  const g = giorniDaOggi(iso);
  if (g < 0) return { testo: 'Scaduto', tono: 'pericolo' };
  if (g === 0) return { testo: 'Oggi', tono: 'pericolo' };
  if (g === 1) return { testo: 'Domani', tono: 'pericolo' };
  if (g <= 3) return { testo: `Tra ${g} giorni`, tono: 'pericolo' };
  if (g <= 7) return { testo: `Tra ${g} giorni`, tono: 'avviso' };
  if (g <= 30) return { testo: `Tra ${g} giorni`, tono: 'ok' };
  return { testo: dataBreve(iso), tono: 'neutro' };
}
