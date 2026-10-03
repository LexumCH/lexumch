import type { NomeIcona } from '@/componenti/Icona';

import { breve, migliaia, milioni, numeri } from './numeri';

// Testi che cambiano da un paese all'altro. Chi aggiunge un paese al registro
// aggiunge qui anche i suoi testi. I numeri arrivano da numeri.ts.
//
// Il benvenuto svizzero (A1, A2) viene da docs/testi/domande-e-benvenuto.md, sezione 3;
// lì ci sono anche tedesco e francese, per la tappa 2.

export type Fonte = { nome: string; icona: NomeIcona; descrizione: string; sfogliabile: boolean };

export type Contenuti = {
  // grammatica
  conArticolo: string; // «l'Italia»
  a: string; // «all'Italia»
  in: string; // «in Italia»
  aggettivo: string; // «italiano»
  aggettivoFemminile: string; // «italiana»
  aggettivoPlurale: string; // «italiani»

  // A0 · scelta del paese
  diritto: string;
  totaleDocumenti: string;
  elencoFonti: [string, string][];

  // A1 · benvenuto
  benvenuto: {
    titolo: string;
    titoloOro: string;
    sottotitolo: string;
    domanda: string;
    risposta: string;
    citazioni: string[];
  };

  // A2 · le fonti
  fontiTesto: string;
  fontiBenvenuto: { nome: string; icona: NomeIcona; descrizione: string; valore?: string }[];

  // B1 · home
  homeSottotitolo: string;
  esempi: string[];
  consiglio: string;
  passi: string[];

  // C2 · banca dati
  bancaDatiTitolo: string;
  bancaDatiCitazioni: string;
  fonti: Record<string, Fonte>;

  // D4 · profilo
  domandaProfessione: string;
  testoProfessione: string;
};

const IT = numeri.IT;
const CH = numeri.CH;

export const contenuti: Record<string, Contenuti> = {
  IT: {
    conArticolo: "l'Italia",
    a: "all'Italia",
    in: 'in Italia',
    aggettivo: 'italiano',
    aggettivoFemminile: 'italiana',
    aggettivoPlurale: 'italiani',

    diritto: 'Diritto italiano ed europeo',
    totaleDocumenti: `Oltre ${milioni(IT.totale)} di documenti`,
    elencoFonti: [
      ['Codici', `${IT.codici} codici · ${migliaia(IT.codiciArticoli)} articoli`],
      ['Leggi e decreti', `${migliaia(IT.leggiAtti)} atti · ${migliaia(IT.leggiArticoli)} articoli`],
      [
        'Giurisprudenza',
        `${milioni(IT.giurisprudenza)} di decisioni: Cassazione, Corte costituzionale, Consiglio di Stato, TAR, Corte dei conti`,
      ],
      ['Tributario', `${migliaia(IT.tributario)} sentenze delle Corti di giustizia tributaria`],
      [
        'Prassi',
        `${migliaia(IT.prassi)} documenti: Agenzia delle Entrate, INPS, INAIL, ANAC, AGCM e altri enti`,
      ],
      [
        'Europa',
        `${migliaia(IT.europaDecisioni)} decisioni di Corte di giustizia e Corte EDU · ${migliaia(IT.europaArticoli)} articoli di norme UE`,
      ],
    ],

    benvenuto: {
      titolo: "L'AI italiana che ragiona su ",
      titoloOro: 'diritto e fisco.',
      sottotitolo: `Fonti verificate, oltre ${milioni(IT.totale)} di documenti giuridici e fiscali, ragionamento strutturato.`,
      domanda: 'Il Comune non risponde alla mia richiesta di accesso agli atti. Cosa posso fare?',
      risposta: 'Il silenzio vale come rifiuto: hai 30 giorni per chiedere il riesame o fare ricorso al TAR.',
      citazioni: ['L. 241/1990, art. 25', 'c.p.a., art. 116'],
    },

    fontiTesto:
      'Lex cerca in norme, sentenze e prassi e ti dice da dove prende ogni passaggio. La Banca dati puoi sfogliarla anche tu, gratis.',
    fontiBenvenuto: [
      {
        nome: 'Codici, leggi e decreti',
        icona: 'libro',
        descrizione: `${IT.codici} codici · ${migliaia(IT.leggiAtti)} atti`,
      },
      {
        nome: 'Giurisprudenza',
        icona: 'tribunale',
        descrizione: 'Cassazione, Consulta, Consiglio di Stato, TAR',
        valore: breve(IT.giurisprudenza),
      },
      {
        nome: 'Prassi',
        icona: 'documento',
        descrizione: 'Agenzia delle Entrate, INPS, INAIL, ANAC',
        valore: breve(IT.prassi),
      },
      {
        nome: 'Europa',
        icona: 'globo',
        descrizione: 'Norme UE, Corte di giustizia, Corte EDU',
        valore: breve(IT.europaDecisioni),
      },
    ],

    homeSottotitolo: 'Lex consulta norme, sentenze e prassi e ti mostra da dove viene ogni risposta.',
    esempi: [
      'Un ladro entra in casa di notte: fin dove posso difendermi?',
      'Il padrone di casa non mi restituisce la cauzione: cosa posso fare?',
      'Mi è arrivata una multa dopo quattro mesi: devo pagarla?',
    ],
    consiglio: 'Più dettagli dai (date, luogo, chi è coinvolto), più la risposta è precisa.',
    passi: [
      'Analizzo la richiesta',
      'Individuo le fonti da consultare',
      'Cerco tra leggi e decreti',
      'Confronto la giurisprudenza',
      'Verifico la prassi amministrativa',
      'Ragiono sul caso',
      'Compongo la risposta',
    ],

    bancaDatiTitolo: 'Codici, leggi, sentenze e prassi',
    bancaDatiCitazioni: 'Riconosce anche citazioni come «241/1990» o «legge 241 del 1990».',
    fonti: {
      codici: {
        nome: 'Codici',
        icona: 'elenco',
        descrizione: `${IT.codici} codici, articolo per articolo`,
        sfogliabile: true,
      },
      leggi_decreti: {
        nome: 'Leggi e decreti',
        icona: 'libro',
        descrizione: `${migliaia(IT.leggiAtti)} atti per tipo e anno`,
        sfogliabile: true,
      },
      giurisprudenza: {
        nome: 'Giurisprudenza',
        icona: 'tribunale',
        descrizione: 'Cassazione, Consulta, Consiglio di Stato, TAR',
        sfogliabile: false,
      },
      tributario: {
        nome: 'Tributario',
        icona: 'ricevuta',
        descrizione: 'Corti di giustizia tributaria',
        sfogliabile: false,
      },
      prassi: {
        nome: 'Prassi',
        icona: 'documento',
        descrizione: 'Entrate, INPS, INAIL, ANAC e altri enti',
        sfogliabile: false,
      },
      ue: {
        nome: 'Unione europea',
        icona: 'globo',
        descrizione: 'Norme UE, Corte di giustizia, Corte EDU',
        sfogliabile: false,
      },
    },

    domandaProfessione: 'Sei un avvocato o un commercialista?',
    testoProfessione:
      'Con il profilo professionale si aprono pratiche, clienti, scadenze, atti e fatture. Per ora si attiva dal sito.',
  },

  CH: {
    conArticolo: 'la Svizzera',
    a: 'alla Svizzera',
    in: 'in Svizzera',
    aggettivo: 'svizzero',
    aggettivoFemminile: 'svizzera',
    aggettivoPlurale: 'svizzeri',

    diritto: 'Diritto svizzero ed europeo',
    totaleDocumenti: `Oltre ${milioni(CH.totale)} di documenti`,
    elencoFonti: [
      ['Diritto federale', `${migliaia(CH.federaleAtti)} atti · ${migliaia(CH.federaleArticoli)} articoli`],
      [
        'Diritto cantonale',
        `${migliaia(CH.cantonaleAtti)} atti · ${migliaia(CH.cantonaleArticoli)} articoli`,
      ],
      [
        'Giurisprudenza',
        `${migliaia(CH.giurisprudenza)} decisioni: Tribunale federale e tribunali cantonali`,
      ],
      ['Prassi', `${migliaia(CH.prassi)} documenti delle autorità federali e cantonali`],
      [
        'Europa',
        `${migliaia(CH.europaDecisioni)} decisioni di Corte di giustizia e Corte EDU · ${migliaia(CH.europaArticoli)} articoli di norme UE`,
      ],
      ['Lingue', 'App in italiano, tedesco o francese'],
    ],

    benvenuto: {
      titolo: "L'AI svizzera che ragiona su ",
      titoloOro: 'tutto il diritto svizzero.',
      sottotitolo: `Fonti verificate, oltre ${milioni(CH.totale)} di documenti giuridici e fiscali, ragionamento strutturato.`,
      domanda: 'Mi hanno disdetto il contratto mentre ero in malattia. È valido?',
      risposta:
        'Dopo il tempo di prova, la disdetta data durante la malattia è nulla: la protezione dura da 30 a 180 giorni, secondo gli anni di servizio.',
      citazioni: ['CO, art. 336c'],
    },

    fontiTesto:
      'Lex cerca nel diritto federale e cantonale, nella giurisprudenza e nella prassi, e ti dice da dove prende ogni passaggio. La Banca dati puoi sfogliarla anche tu, gratis.',
    fontiBenvenuto: [
      { nome: 'Diritto federale', icona: 'libro', descrizione: 'Leggi e ordinanze della Confederazione' },
      { nome: 'Diritto cantonale', icona: 'mappa', descrizione: 'Le leggi dei cantoni' },
      { nome: 'Giurisprudenza', icona: 'tribunale', descrizione: 'Tribunale federale e tribunali cantonali' },
      { nome: 'Prassi', icona: 'documento', descrizione: 'Autorità federali e cantonali' },
      { nome: 'Europa', icona: 'globo', descrizione: 'Norme UE, Corte di giustizia, Corte EDU' },
    ],

    homeSottotitolo: 'Lex consulta il diritto federale e cantonale, la giurisprudenza e la prassi svizzere.',
    esempi: [
      "Il padrone di casa non mi restituisce la garanzia dell'affitto",
      'Entro quando posso contestare la decisione di tassazione?',
      'Mi hanno disdetto il contratto mentre ero in malattia: è valido?',
    ],
    consiglio: 'Più dettagli dai (cantone, date, chi è coinvolto), più la risposta è precisa.',
    passi: [
      'Analizzo la richiesta',
      'Individuo le fonti da consultare',
      'Cerco nel diritto federale e cantonale',
      'Confronto la giurisprudenza',
      'Verifico la prassi delle autorità',
      'Ragiono sul caso',
      'Compongo la risposta',
    ],

    bancaDatiTitolo: 'Diritto svizzero, giurisprudenza e prassi',
    bancaDatiCitazioni: 'Riconosce anche citazioni come «art. 336c CO» o «RS 220».',
    fonti: {
      federale: {
        nome: 'Federale',
        icona: 'libro',
        descrizione: 'Leggi e ordinanze della Confederazione',
        sfogliabile: true,
      },
      cantonale: {
        nome: 'Cantonale',
        icona: 'mappa',
        descrizione: 'Le leggi dei 26 cantoni',
        sfogliabile: true,
      },
      giurisprudenza: {
        nome: 'Giurisprudenza',
        icona: 'tribunale',
        descrizione: 'Tribunale federale e tribunali cantonali',
        sfogliabile: false,
      },
      prassi: {
        nome: 'Prassi',
        icona: 'documento',
        descrizione: 'Autorità federali e cantonali',
        sfogliabile: false,
      },
      ue: { nome: 'UE', icona: 'globo', descrizione: 'Norme UE e Corte di giustizia', sfogliabile: false },
      cedu: { nome: 'Corte EDU', icona: 'bilancia', descrizione: 'Sentenze e decisioni', sfogliabile: false },
    },

    domandaProfessione: 'Sei avvocato, fiduciario o progettista?',
    testoProfessione:
      'Con il profilo professionale si aprono gli strumenti per lo studio. Per ora si attiva dal sito lexum.ch.',
  },
};

// Le professioni del registro (docs/paesi.json), con icona e descrizione.
export const professioni: Record<string, { nome: string; icona: NomeIcona; descrizione: string }> = {
  avvocato: {
    nome: 'Avvocato',
    icona: 'bilancia',
    descrizione:
      'Pratiche, udienze, termini processuali, banca dati giuridica e generazione di atti con Lex AI.',
  },
  commercialista: {
    nome: 'Commercialista',
    icona: 'calcolatrice',
    descrizione:
      'Mandati, scadenzario fiscale, contabilità clienti, banca dati tributaria e Lex AI per lo studio.',
  },
  fiduciario: {
    nome: 'Fiduciario',
    icona: 'calcolatrice',
    descrizione: 'Mandati, scadenze fiscali, contabilità dei clienti e Lex AI per lo studio.',
  },
  progettista: {
    nome: 'Progettista',
    icona: 'squadra',
    descrizione: 'Analisi dei disegni e verifica delle norme edilizie cantonali con Lex AI.',
  },
};
