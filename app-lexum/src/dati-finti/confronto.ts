// DATI FINTI della tappa 1: il confronto tra 2 o 3 elementi di Ricerche.
// Dalla tappa 4 la risposta arriva da lex-confronta, come sul sito (src/pages/user/Ricerche.jsx).

import type { RispostaFinta } from './chat';
import type { Elemento } from './ricerche';

export const MAX_CONFRONTO = 3;

// Le stesse quattro richieste del sito (AZIONI_CONFRONTO), senza emoji.
export const azioniConfronto = [
  {
    id: 'sintesi_unificata',
    titolo: 'Sintesi unificata',
    descrizione: 'Fonde gli elementi in un quadro unitario',
  },
  { id: 'conflitti', titolo: 'Conflitti & tensioni', descrizione: 'Evidenzia divergenze e contraddizioni' },
  { id: 'comuni', titolo: 'Punti in comune', descrizione: 'Estrae il filo che li unisce' },
  { id: 'parere', titolo: 'Parere completo', descrizione: 'Documento strutturato pronto da copiare' },
] as const;

export type AzioneConfronto = (typeof azioniConfronto)[number];

export const passiConfronto = [
  'Leggo gli elementi che hai scelto',
  'Cerco i punti di contatto',
  'Compongo la risposta',
];

export function rispostaConfronto(azione: AzioneConfronto, elementi: Elemento[]): RispostaFinta {
  return {
    titolo: azione.titolo,
    inBreve: `risposta di prova sui ${elementi.length} elementi che hai scelto.`,
    punti: elementi.map((e) => ({ titolo: `${e.titolo}.`, testo: [` ${e.estratto}`] })),
    nota: 'Confronto di prova: dalla tappa 4 qui arriva quello vero di Lex, come sul sito.',
  };
}
