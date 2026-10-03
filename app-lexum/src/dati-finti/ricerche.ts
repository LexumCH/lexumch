// DATI FINTI della tappa 1: etichette ed elementi salvati in Ricerche, per paese.
// Dalla tappa 4 arrivano dalle tabelle ricerche + elementi_etichette.

import { coloriEtichette } from '@/tema';

import type { Messaggio } from './chat';

export type Etichetta = { id: string; nome: string; colore: string };

export type TipoElemento = 'Chat con Lex' | 'Norma' | 'Sentenza' | 'Appunti';
export type Elemento = {
  id: string;
  etichetta: string;
  tipo: TipoElemento;
  quando: string;
  titolo: string;
  estratto: string;
  norma?: string;
  documento?: string;
  messaggi?: Messaggio[]; // solo per le chat salvate da questa sessione
};

export const etichetteFinte: Record<string, Etichetta[]> = {
  IT: [
    { id: 'casa', nome: 'Casa', colore: coloriEtichette[0] },
    { id: 'fisco', nome: 'Fisco', colore: coloriEtichette[1] },
    { id: 'lavoro', nome: 'Lavoro', colore: coloriEtichette[2] },
  ],
  CH: [
    { id: 'lavoro', nome: 'Lavoro', colore: coloriEtichette[0] },
    { id: 'affitto', nome: 'Affitto', colore: coloriEtichette[1] },
  ],
};

export const elementiFinti: Record<string, Elemento[]> = {
  IT: [
    {
      id: 'e1',
      etichetta: 'casa',
      tipo: 'Norma',
      quando: 'oggi',
      titolo: 'L. 241/1990 · Art. 25',
      estratto: 'Modalità di esercizio del diritto di accesso e ricorsi',
      norma: 'l241-25',
    },
    {
      id: 'e2',
      etichetta: 'casa',
      tipo: 'Sentenza',
      quando: 'oggi',
      titolo: 'Consiglio di Stato · Ad. Plen. · n. 10 · 2020',
      estratto: 'Accesso agli atti e accesso civico generalizzato nei contratti pubblici',
      documento: 'cds-ap-10-2020',
    },
    {
      id: 'e3',
      etichetta: 'casa',
      tipo: 'Appunti',
      quando: 'ieri',
      titolo: "Cosa chiedere all'ufficio tecnico",
      estratto: 'Numero della pratica edilizia, data della richiesta, protocollo…',
    },
    {
      id: 'e4',
      etichetta: 'fisco',
      tipo: 'Chat con Lex',
      quando: '3 ott',
      titolo: 'Detrazione delle spese per la badante',
      estratto: 'Per una persona non autosufficiente puoi detrarre il 19% delle spese, entro un tetto annuo…',
    },
    {
      id: 'e5',
      etichetta: 'fisco',
      tipo: 'Appunti',
      quando: '28 set',
      titolo: 'Ricevute da conservare',
      estratto: 'Ricevute di pagamento della badante, contributi versati, certificato medico…',
    },
    {
      id: 'e6',
      etichetta: 'lavoro',
      tipo: 'Chat con Lex',
      quando: '12 set',
      titolo: 'Ferie non godute alla fine del rapporto',
      estratto: 'Le ferie maturate e non godute vanno pagate quando il rapporto finisce…',
    },
  ],
  CH: [
    {
      id: 'e1',
      etichetta: 'lavoro',
      tipo: 'Norma',
      quando: 'oggi',
      titolo: 'CO · Art. 336c',
      estratto: 'Disdetta in tempo inopportuno da parte del datore di lavoro',
      norma: 'co-336c-2',
    },
    {
      id: 'e2',
      etichetta: 'lavoro',
      tipo: 'Appunti',
      quando: 'ieri',
      titolo: 'Date del certificato medico',
      estratto: 'Inizio della malattia, data della disdetta, anni di servizio…',
    },
    {
      id: 'e3',
      etichetta: 'affitto',
      tipo: 'Chat con Lex',
      quando: '30 set',
      titolo: "Garanzia dell'affitto non restituita",
      estratto: 'Cosa fare se il locatore non libera il deposito di garanzia…',
    },
  ],
};
