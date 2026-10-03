// DATI FINTI della tappa 1: leggi, risultati e documenti della Banca dati.
// Dalla tappa 5 arrivano dal database del paese, con un adattatore per paese.

import { normeFinte, type Norma } from './chat';

// norma: la norma che si apre toccando l'articolo; alias: altre norme dello stesso articolo
// (per esempio i singoli capoversi) che Lex può citare.
export type Articolo = { numero: string; rubrica: string; norma: string; alias?: string[] };
export type Gruppo = { titolo: string; aperto: boolean; articoli: Articolo[] };
export type Legge = {
  id: string;
  paese: string;
  sigla: string; // «L. 241/1990»
  titolo: string; // «Legge 241/1990»
  nomeCompleto: string; // «Legge 7 agosto 1990, n. 241»
  descrizione: string;
  sezione: string; // titolo della schermata Sfoglia
  briciole: string[];
  gruppi: Gruppo[];
};

export const leggiFinte: Record<string, Legge> = {
  'l241-1990': {
    id: 'l241-1990',
    paese: 'IT',
    sigla: 'L. 241/1990',
    titolo: 'Legge 241/1990',
    nomeCompleto: 'Legge 7 agosto 1990, n. 241',
    descrizione:
      'Nuove norme in materia di procedimento amministrativo e di diritto di accesso ai documenti amministrativi',
    sezione: 'Leggi e decreti',
    briciole: ['Tutti i tipi', 'Legge'],
    gruppi: [
      {
        titolo: 'Capo IV-bis · Efficacia ed invalidità del provvedimento',
        aperto: false,
        articoli: [
          {
            numero: '21-bis',
            rubrica: 'Efficacia del provvedimento limitativo della sfera giuridica dei privati',
            norma: 'l241-21bis',
          },
          { numero: '21-ter', rubrica: 'Esecutorietà', norma: 'l241-21ter' },
          {
            numero: '21-quater',
            rubrica: 'Efficacia ed esecutività del provvedimento',
            norma: 'l241-21quater',
          },
          { numero: '21-quinquies', rubrica: 'Revoca del provvedimento', norma: 'l241-21quinquies' },
          { numero: '21-sexies', rubrica: 'Recesso dai contratti', norma: 'l241-21sexies' },
          { numero: '21-septies', rubrica: 'Nullità del provvedimento', norma: 'l241-21septies' },
          { numero: '21-octies', rubrica: 'Annullabilità del provvedimento', norma: 'l241-21octies' },
          { numero: '21-nonies', rubrica: "Annullamento d'ufficio", norma: 'l241-21nonies' },
        ],
      },
      {
        titolo: 'Capo V · Accesso ai documenti amministrativi',
        aperto: true,
        articoli: [
          { numero: '22', rubrica: 'Definizioni e principi in materia di accesso', norma: 'l241-22' },
          { numero: '23', rubrica: 'Ambito di applicazione del diritto di accesso', norma: 'l241-23' },
          { numero: '24', rubrica: 'Esclusione dal diritto di accesso', norma: 'l241-24' },
          {
            numero: '25',
            rubrica: 'Modalità di esercizio del diritto di accesso e ricorsi',
            norma: 'l241-25',
          },
          { numero: '26', rubrica: 'Obbligo di pubblicazione', norma: 'l241-26' },
          {
            numero: '27',
            rubrica: "Commissione per l'accesso ai documenti amministrativi",
            norma: 'l241-27',
          },
        ],
      },
    ],
  },
  co: {
    id: 'co',
    paese: 'CH',
    sigla: 'CO',
    titolo: 'Codice delle obbligazioni',
    nomeCompleto: 'Codice delle obbligazioni (RS 220)',
    descrizione:
      'Legge federale di complemento del Codice civile svizzero (Libro quinto: Diritto delle obbligazioni)',
    sezione: 'Federale',
    briciole: ['Federale', 'RS 220'],
    gruppi: [
      {
        titolo: 'Art. 335–335c · Disdetta e termini',
        aperto: false,
        articoli: [
          { numero: '335', rubrica: 'Disdetta in genere', norma: 'co-335' },
          { numero: '335a', rubrica: 'Termini di disdetta in genere', norma: 'co-335a' },
          { numero: '335b', rubrica: 'Termini durante il tempo di prova', norma: 'co-335b' },
          { numero: '335c', rubrica: 'Termini dopo il tempo di prova', norma: 'co-335c' },
        ],
      },
      {
        titolo: 'Art. 336–336d · Protezione dalla disdetta',
        aperto: true,
        articoli: [
          { numero: '336', rubrica: 'Disdetta abusiva: principio', norma: 'co-336' },
          { numero: '336a', rubrica: 'Disdetta abusiva: sanzione', norma: 'co-336a' },
          { numero: '336b', rubrica: 'Disdetta abusiva: procedura', norma: 'co-336b' },
          {
            numero: '336c',
            rubrica: 'Disdetta in tempo inopportuno da parte del datore di lavoro',
            norma: 'co-336c-2',
            alias: ['co-336c-1'],
          },
          {
            numero: '336d',
            rubrica: 'Disdetta in tempo inopportuno da parte del lavoratore',
            norma: 'co-336d',
          },
        ],
      },
    ],
  },
};

// La legge che si apre da «Sfoglia» in ciascun paese.
export const leggePerPaese: Record<string, string> = { IT: 'l241-1990', CH: 'co' };

// Norme citate altrove (documenti) senza testo finto.
const normeSoloTitolo: Record<string, Norma> = {
  'dlgs33-5bis': {
    id: 'dlgs33-5bis',
    legge: 'Decreto legislativo 14 marzo 2013, n. 33',
    articolo: "Art. 5-bis · Esclusioni e limiti all'accesso civico",
  },
  'dlgs50-53': {
    id: 'dlgs50-53',
    legge: 'Decreto legislativo 18 aprile 2016, n. 50',
    articolo: 'Art. 53 · Accesso agli atti e riservatezza',
  },
};

// Cerca una norma tra quelle con il testo finto, poi tra gli articoli delle leggi finte.
export function trovaNorma(id: string): Norma | null {
  if (normeFinte[id]) return normeFinte[id];
  if (normeSoloTitolo[id]) return normeSoloTitolo[id];
  for (const legge of Object.values(leggiFinte)) {
    for (const gruppo of legge.gruppi) {
      const art = gruppo.articoli.find((a) => a.norma === id);
      if (art) {
        return {
          id,
          legge: legge.nomeCompleto,
          articolo: `Art. ${art.numero} · ${art.rubrica}`,
          leggeId: legge.id,
        };
      }
    }
  }
  return null;
}

export type TipoRisultato = 'Norma' | 'Sentenza' | 'Prassi' | 'UE';
export type Risultato = {
  id: string;
  tipo: TipoRisultato;
  riferimento: string;
  titolo: string;
  estratto: string;
  norma?: string;
  documento?: string;
};

export const risultatiFinti: Record<string, Risultato[]> = {
  IT: [
    {
      id: 'r1',
      tipo: 'Norma',
      riferimento: 'L. 241/1990 · Art. 25',
      titolo: 'Modalità di esercizio del diritto di accesso e ricorsi',
      estratto:
        "…In caso di diniego dell'accesso, espresso o tacito, o di differimento dello stesso, il richiedente può presentare ricorso…",
      norma: 'l241-25',
    },
    {
      id: 'r2',
      tipo: 'Norma',
      riferimento: 'D.Lgs. 104/2010 · Art. 116',
      titolo: 'Rito in materia di accesso ai documenti amministrativi',
      estratto:
        'Contro le determinazioni e contro il silenzio sulle istanze di accesso ai documenti amministrativi…',
      norma: 'cpa-116',
    },
    {
      id: 'r3',
      tipo: 'Sentenza',
      riferimento: 'Consiglio di Stato · Ad. Plen. · n. 10 · 2020',
      titolo: 'Accesso agli atti e accesso civico generalizzato nei contratti pubblici',
      estratto:
        "…il potere-dovere di esaminare l'istanza di accesso agli atti e ai documenti pubblici, formulata in modo generico…",
      documento: 'cds-ap-10-2020',
    },
    {
      id: 'r4',
      tipo: 'Prassi',
      riferimento: 'ANAC · Delibera n. 1309 · 2016',
      titolo: "Linee guida sulle esclusioni e i limiti all'accesso civico",
      estratto:
        "…indicazioni operative ai fini della definizione delle esclusioni e dei limiti all'accesso civico…",
      documento: 'anac-1309-2016',
    },
  ],
  CH: [
    {
      id: 'r1',
      tipo: 'Norma',
      riferimento: 'CO · Art. 336c',
      titolo: 'Disdetta in tempo inopportuno da parte del datore di lavoro',
      estratto: '…la disdetta data durante uno dei periodi stabiliti nel capoverso 1 è nulla…',
      norma: 'co-336c-2',
    },
    {
      id: 'r2',
      tipo: 'Norma',
      riferimento: 'CO · Art. 336',
      titolo: 'Disdetta abusiva: principio',
      estratto: 'La disdetta è abusiva se data…',
      norma: 'co-336',
    },
  ],
};

export type Documento = {
  id: string;
  tipo: 'Sentenza' | 'Prassi';
  titolo: string;
  riferimento: string;
  data: string;
  principi: string[];
  norme: { cit: string; norma: string }[];
};

export const documentiFinti: Record<string, Documento> = {
  'cds-ap-10-2020': {
    id: 'cds-ap-10-2020',
    tipo: 'Sentenza',
    titolo: 'Accesso agli atti e accesso civico generalizzato nei contratti pubblici',
    riferimento: 'Consiglio di Stato · Adunanza Plenaria · n. 10 · 2020',
    data: 'Pubblicata il 2 aprile 2020',
    principi: [
      "L'amministrazione deve esaminare la richiesta di accesso formulata in modo generico anche come accesso civico generalizzato, salvo che l'interessato si sia riferito soltanto all'accesso documentale.",
      "L'operatore che ha partecipato alla gara ha un interesse concreto e attuale a conoscere gli atti della fase esecutiva del contratto.",
      "L'accesso civico generalizzato si applica anche agli atti delle gare e dell'esecuzione dei contratti pubblici, nei limiti di legge.",
    ],
    norme: [
      { cit: 'L. 241/1990, art. 22', norma: 'l241-22' },
      { cit: 'D.Lgs. 33/2013, art. 5-bis', norma: 'dlgs33-5bis' },
      { cit: 'D.Lgs. 50/2016, art. 53', norma: 'dlgs50-53' },
    ],
  },
  'anac-1309-2016': {
    id: 'anac-1309-2016',
    tipo: 'Prassi',
    titolo: "Linee guida sulle esclusioni e i limiti all'accesso civico",
    riferimento: 'ANAC · Delibera n. 1309 · 2016',
    data: 'Adottata il 28 dicembre 2016',
    principi: [],
    norme: [{ cit: 'D.Lgs. 33/2013, art. 5-bis', norma: 'dlgs33-5bis' }],
  },
};

export const cercateDiRecenteFinte: Record<string, string[]> = {
  IT: ['accesso agli atti silenzio', 'detrazione spese badante'],
  CH: ['disdetta durante la malattia', 'garanzia affitto restituzione'],
};
