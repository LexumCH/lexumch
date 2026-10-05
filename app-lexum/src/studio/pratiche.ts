import {
  esiti,
  tipiCausa,
  type Esito,
  type Pratica,
  type TipoCausa,
  type TipoEvento,
} from '@/dati-finti/studio';
import { traduci, type Lingua } from '@/lingue';
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
export const tipiEvento: Record<TipoEvento, { colore: string }> = {
  presenza: { colore: colori.accent },
  videocall: { colore: colori.accent },
  telefonico: { colore: colori.accent },
  udienza: { colore: colori.danger },
  scadenza: { colore: colori.warn },
};

// Il nome del tipo di evento nella lingua dell'app.
export function nomeTipoEvento(tipo: TipoEvento, lingua: Lingua = 'it'): string {
  return traduci(lingua, `studio.tipiEvento.${tipo}`);
}

// Tipo di causa ed esito si salvano in italiano («Civile», «Vinta»): qui solo come si mostrano.
// Un valore che non conosciamo si mostra com'è.
export function nomeTipoCausa(tipo: string, lingua: Lingua = 'it'): string {
  return (tipiCausa as readonly string[]).includes(tipo)
    ? traduci(lingua, `studio.tipiCausa.${tipo as TipoCausa}`)
    : tipo;
}

export function nomeEsito(esito: string, lingua: Lingua = 'it'): string {
  return (esiti as readonly string[]).includes(esito)
    ? traduci(lingua, `studio.esiti.${esito as Esito}`)
    : esito;
}

// Cosa propone Lex nella chat della pratica: gli atti dei siti (IT 12, CH 6). Ogni atto costa 1 credito.
// Quelli italiani restano in italiano; quelli svizzeri sono nella lingua dell'app.
const attiIT = [
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
];
const attiCH = ['diffida', 'parere', 'esecuzione', 'rigetto', 'conciliazione', 'petizione'] as const;

export function attiLex(paese: string, lingua: Lingua = 'it'): string[] {
  if (paese === 'IT') return attiIT;
  if (paese === 'CH') return attiCH.map((a) => traduci(lingua, `studio.attiCH.${a}`));
  return [];
}

// Ruoli processuali delle controparti (i più usati tra i 16 del sito). Si salva il nome italiano.
const ruoli = [
  ['Convenuto', 'convenuto'],
  ['Attore', 'attore'],
  ['Resistente', 'resistente'],
  ['Ricorrente', 'ricorrente'],
  ['Opponente', 'opponente'],
  ['Opposto', 'opposto'],
  ['Imputato', 'imputato'],
  ['Persona offesa', 'personaOffesa'],
  ['Terzo chiamato', 'terzoChiamato'],
  ['Altro', 'altro'],
] as const;

export const ruoliProcessuali: string[] = ruoli.map(([r]) => r);

export function nomeRuolo(ruolo: string, lingua: Lingua = 'it'): string {
  const voce = ruoli.find(([r]) => r === ruolo);
  return voce ? traduci(lingua, `studio.ruoli.${voce[1]}`) : ruolo;
}
