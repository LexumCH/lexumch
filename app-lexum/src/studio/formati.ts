// Date e ore in italiano, tedesco e francese, scritte a mano: non dipendono dal supporto Intl del telefono.
// Ogni funzione prende la lingua per ultima (predefinita: italiano).

import type { Lingua } from '@/lingue';

const mesi: Record<Lingua, string[]> = {
  it: [
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
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
};
const giorniSettimana: Record<Lingua, string[]> = {
  it: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
};
// la settimana parte dal lunedì
const inizialiGiorni: Record<Lingua, string[]> = {
  it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  de: ['M', 'D', 'M', 'D', 'F', 'S', 'S'],
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
};
export const iniziali = inizialiGiorni.it;
export function inizialiIn(lingua: Lingua = 'it'): string[] {
  return inizialiGiorni[lingua];
}

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

const mesiBrevi: Record<Lingua, string[]> = {
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};

// Il giorno del mese: in francese il primo si scrive «1er».
function giornoDelMese(d: Date, lingua: Lingua): string {
  return lingua === 'fr' && d.getDate() === 1 ? '1er' : String(d.getDate());
}

// «4 ott» · «4. Okt.» · «4 oct.»
export function dataBreve(iso: string, lingua: Lingua = 'it'): string {
  const d = new Date(iso);
  return `${giornoDelMese(d, lingua)}${lingua === 'de' ? '.' : ''} ${mesiBrevi[lingua][d.getMonth()]}`;
}

// «4 ottobre 2026» · «4. Oktober 2026» · «4 octobre 2026»
export function dataCompleta(iso: string, lingua: Lingua = 'it'): string {
  const d = new Date(iso);
  const punto = lingua === 'de' ? '.' : '';
  return `${giornoDelMese(d, lingua)}${punto} ${mesi[lingua][d.getMonth()]} ${d.getFullYear()}`;
}

export function dataNumerica(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function ora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const parole: Record<Lingua, { oggi: string; domani: string; ieri: string }> = {
  it: { oggi: 'Oggi', domani: 'Domani', ieri: 'Ieri' },
  de: { oggi: 'Heute', domani: 'Morgen', ieri: 'Gestern' },
  fr: { oggi: "Aujourd'hui", domani: 'Demain', ieri: 'Hier' },
};

// «Oggi · sabato 4 ottobre», «Domani · …», altrimenti «lunedì 6 ottobre».
export function titoloGiorno(iso: string, lingua: Lingua = 'it'): string {
  const d = new Date(iso);
  const punto = lingua === 'de' ? '.' : '';
  const base = `${giorniSettimana[lingua][d.getDay()]} ${giornoDelMese(d, lingua)}${punto} ${mesi[lingua][d.getMonth()]}`;
  const g = giorniDaOggi(iso);
  const p = parole[lingua];
  if (g === 0) return `${p.oggi} · ${base}`;
  if (g === 1) return `${p.domani} · ${base}`;
  if (g === -1) return `${p.ieri} · ${base}`;
  return base;
}

export function nomeMese(anno: number, mese: number, lingua: Lingua = 'it'): string {
  const m = mesi[lingua][mese];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${anno}`;
}

// Urgenza di un termine, come sul sito: scaduto, oggi o entro 3 giorni rosso; entro 7 ambra;
// entro 30 verde; oltre grigio.
export type Urgenza = { testo: string; tono: 'pericolo' | 'avviso' | 'ok' | 'neutro' };
const testiUrgenza: Record<Lingua, { scaduto: string; tra: (g: number) => string }> = {
  it: { scaduto: 'Scaduto', tra: (g) => `Tra ${g} giorni` },
  de: { scaduto: 'Abgelaufen', tra: (g) => `In ${g} Tagen` },
  fr: { scaduto: 'Échu', tra: (g) => `Dans ${g} jours` },
};
export function urgenza(iso: string, lingua: Lingua = 'it'): Urgenza {
  const g = giorniDaOggi(iso);
  const u = testiUrgenza[lingua];
  const p = parole[lingua];
  if (g < 0) return { testo: u.scaduto, tono: 'pericolo' };
  if (g === 0) return { testo: p.oggi, tono: 'pericolo' };
  if (g === 1) return { testo: p.domani, tono: 'pericolo' };
  if (g <= 3) return { testo: u.tra(g), tono: 'pericolo' };
  if (g <= 7) return { testo: u.tra(g), tono: 'avviso' };
  if (g <= 30) return { testo: u.tra(g), tono: 'ok' };
  return { testo: dataBreve(iso, lingua), tono: 'neutro' };
}
