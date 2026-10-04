import type { Pratica, TipoEvento } from '@/dati-finti/studio';
import { colori } from '@/tema';

import { giorniDaOggi } from './formati';

// La prossima udienza programmata (da oggi in poi) e il prossimo termine ancora da compiere.
export function prossimaUdienza(p: Pratica) {
  return p.udienze
    .filter((u) => u.stato === 'programmata' && giorniDaOggi(u.dataOra) >= 0)
    .sort((a, b) => a.dataOra.localeCompare(b.dataOra))[0];
}

export function prossimoTermine(p: Pratica) {
  return p.termini
    .filter((t) => t.stato === 'in_corso')
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza))[0];
}

// Colori dei tipi di evento, come sul sito: appuntamenti in oro, udienze in rosso, scadenze in ambra.
export const tipiEvento: Record<TipoEvento, { nome: string; colore: string }> = {
  presenza: { nome: 'In presenza', colore: colori.accent },
  videocall: { nome: 'Videocall', colore: colori.accent },
  telefonico: { nome: 'Telefonico', colore: colori.accent },
  udienza: { nome: 'Udienza', colore: colori.danger },
  scadenza: { nome: 'Scadenza', colore: colori.warn },
};

// Cosa propone Lex nella chat della pratica: gli atti dei siti (IT 12, CH 6). Ogni atto costa 1 credito.
export const attiLex: Record<string, string[]> = {
  IT: [
    'Diffida e messa in mora',
    'Parere legale',
    'Atto di citazione civile',
    'Ricorso per decreto ingiuntivo',
    'Comparsa di costituzione e risposta',
    'Memoria istruttoria 171-ter',
    'Istanza di ammissione prove',
    'Istanza di nomina CTU',
    'Atto di precetto',
    'Pignoramento presso terzi',
    'Atto di appello civile',
    'Reclamo cautelare',
  ],
  CH: [
    'Diffida',
    'Parere',
    'Esecuzione LEF',
    "Rigetto dell'opposizione",
    'Istanza di conciliazione',
    'Petizione',
  ],
};

// Ruoli processuali delle controparti (i più usati tra i 16 del sito).
export const ruoliProcessuali = [
  'Convenuto',
  'Attore',
  'Resistente',
  'Ricorrente',
  'Opponente',
  'Opposto',
  'Imputato',
  'Persona offesa',
  'Terzo chiamato',
  'Altro',
];
