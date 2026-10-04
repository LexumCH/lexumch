import type { NomeIcona } from '@/componenti/Icona';

import type { Lingua } from '@/lingue';

import { milioni, numeri } from './numeri';

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
    titoloDopo?: string;
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
      ['Normativa', 'Costituzione, codici, leggi e decreti, vigenti e storici'],
      ['Giurisprudenza', 'Cassazione, Corte costituzionale, Consiglio di Stato, TAR, Corte dei conti'],
      ['Tributario', 'Corti di giustizia tributaria e Cassazione tributaria (banca dati del MEF)'],
      ['Prassi', 'Agenzia delle Entrate, MEF, INPS, Dogane, Garante privacy, Corte dei conti'],
      ['Unione europea', 'Trattati, regolamenti, direttive e sentenze della Corte di giustizia'],
      ['Corte EDU', 'Convenzione e sentenze di Strasburgo dal 1955 (HUDOC)'],
      ['Diritti umani', 'Dichiarazione universale e leggi di ratifica dei trattati'],
      ['Deontologia', 'Codice deontologico forense e massime del Consiglio nazionale forense'],
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
        descrizione: 'Costituzione, codici, leggi e decreti',
      },
      {
        nome: 'Giurisprudenza',
        icona: 'tribunale',
        descrizione: 'Cassazione, Consulta, Consiglio di Stato, TAR',
      },
      {
        nome: 'Prassi',
        icona: 'documento',
        descrizione: 'Agenzia delle Entrate, MEF, INPS, Dogane',
      },
      {
        nome: 'Europa',
        icona: 'globo',
        descrizione: 'Norme UE, Corte di giustizia, Corte EDU',
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
        descrizione: 'Articolo per articolo',
        sfogliabile: true,
      },
      leggi_decreti: {
        nome: 'Leggi e decreti',
        icona: 'libro',
        descrizione: 'Atti per tipo e anno',
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
        descrizione: 'Entrate, MEF, INPS, Dogane e altri enti',
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
      ['Diritto federale', 'Fedlex: codici, leggi e ordinanze della Confederazione'],
      ['Diritto cantonale', 'Norme e prassi dei 26 cantoni'],
      [
        'Tribunali federali',
        'Tribunale federale e DTF, Tribunale amministrativo federale, Tribunale penale federale',
      ],
      ['Tribunali cantonali', 'Sentenze dei tribunali dei 26 cantoni'],
      [
        'Prassi',
        'AFC, FINMA, SECO, UFAS, IFPDT, UFG, MROS, SUVA, UFSP, SEM, UDSC, UFCOM, COMCO, ComCom, ElCom, CFCG',
      ],
      ['Unione europea', 'Regolamenti, direttive e sentenze della Corte di giustizia'],
      ['Corte EDU', 'Sentenze e decisioni di Strasburgo dal 1955 (HUDOC)'],
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
      { nome: 'Diritto federale', icona: 'libro', descrizione: 'Fedlex: codici, leggi e ordinanze' },
      { nome: 'Diritto cantonale', icona: 'mappa', descrizione: 'Norme e prassi dei 26 cantoni' },
      { nome: 'Giurisprudenza', icona: 'tribunale', descrizione: 'TF e DTF, TAF, TPF e tribunali cantonali' },
      { nome: 'Prassi', icona: 'documento', descrizione: 'AFC, FINMA, SECO e le altre autorità federali' },
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
        descrizione: 'Fedlex: codici, leggi e ordinanze',
        sfogliabile: true,
      },
      cantonale: {
        nome: 'Cantonale',
        icona: 'mappa',
        descrizione: 'Norme e prassi dei 26 cantoni',
        sfogliabile: true,
      },
      giurisprudenza: {
        nome: 'Giurisprudenza',
        icona: 'tribunale',
        descrizione: 'TF e DTF, TAF, TPF e tribunali cantonali',
        sfogliabile: false,
      },
      prassi: {
        nome: 'Prassi',
        icona: 'documento',
        descrizione: 'AFC, FINMA, SECO e le altre autorità',
        sfogliabile: false,
      },
      ue: {
        nome: 'UE',
        icona: 'globo',
        descrizione: 'Regolamenti, direttive e Corte di giustizia',
        sfogliabile: false,
      },
      cedu: {
        nome: 'Corte EDU',
        icona: 'bilancia',
        descrizione: 'Sentenze di Strasburgo dal 1955',
        sfogliabile: false,
      },
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

// ——— Tedesco e francese ———
// Per la Svizzera, e per la scelta del paese (A0) su un telefono in tedesco o in francese.
// Benvenuto A0–A3: testi approvati (docs/testi/domande-e-benvenuto.md). Le fonti nuove del 04-10-2026
// vengono dalla home di lexum.ch (public/locales/de|fr/home.json); le fonti italiane sono da approvare.
// Quello che non c'è qui si mostra in italiano.

type ParzialeContenuti = {
  [K in keyof Contenuti]?: Contenuti[K] extends unknown[]
    ? Contenuti[K]
    : Contenuti[K] extends object
      ? Partial<Contenuti[K]>
      : Contenuti[K];
};

// 4200000 → «4,2 Millionen» / «4,2 millions»; 1,8 in francese è singolare: «1,8 million».
function milioniIn(n: number, lingua: Lingua): string {
  const cifra = milioni(n).replace(' milioni', '');
  if (lingua === 'de') return `${cifra} Millionen`;
  if (lingua === 'fr') return `${cifra} ${n < 2_000_000 ? 'million' : 'millions'}`;
  return milioni(n);
}

const traduzioni: Record<string, Partial<Record<Lingua, ParzialeContenuti>>> = {
  IT: {
    de: {
      diritto: 'Italienisches und europäisches Recht',
      totaleDocumenti: `Über ${milioniIn(IT.totale, 'de')} Dokumente`,
      elencoFonti: [
        ['Gesetzgebung', 'Verfassung, Gesetzbücher, Gesetze und Dekrete, geltend und historisch'],
        ['Rechtsprechung', 'Kassationshof, Verfassungsgericht, Staatsrat, TAR, Rechnungshof'],
        ['Steuerrecht', 'Steuergerichte und Steuerkammer des Kassationshofs (Datenbank des MEF)'],
        ['Verwaltungspraxis', 'Agenzia delle Entrate, MEF, INPS, Zoll, Datenschutzbehörde, Rechnungshof'],
        ['Europäische Union', 'Verträge, Verordnungen, Richtlinien und Urteile des EuGH'],
        ['EGMR', 'Konvention und Urteile aus Strassburg seit 1955 (HUDOC)'],
        ['Menschenrechte', 'Allgemeine Erklärung und Gesetze zur Ratifizierung der Verträge'],
        ['Berufsrecht', 'Standesregeln der Anwaltschaft und Leitsätze des Consiglio nazionale forense'],
      ],
    },
    fr: {
      diritto: 'Droit italien et européen',
      totaleDocumenti: `Plus de ${milioniIn(IT.totale, 'fr')} de documents`,
      elencoFonti: [
        ['Législation', 'Constitution, codes, lois et décrets, en vigueur et historiques'],
        ['Jurisprudence', 'Cour de cassation, Cour constitutionnelle, Conseil d’État, TAR, Cour des comptes'],
        ['Droit fiscal', 'Cours de justice fiscale et chambre fiscale de la Cour de cassation (base du MEF)'],
        ['Pratique', 'Agenzia delle Entrate, MEF, INPS, Douanes, Garante privacy, Cour des comptes'],
        ['Union européenne', 'Traités, règlements, directives et arrêts de la Cour de justice'],
        ['Cour EDH', 'Convention et arrêts de Strasbourg depuis 1955 (HUDOC)'],
        ['Droits de l’homme', 'Déclaration universelle et lois de ratification des traités'],
        ['Déontologie', 'Code de déontologie des avocats et maximes du Consiglio nazionale forense'],
      ],
    },
  },
  CH: {
    de: {
      diritto: 'Schweizer und europäisches Recht',
      totaleDocumenti: `Über ${milioniIn(CH.totale, 'de')} Dokumente`,
      elencoFonti: [
        ['Bundesrecht', 'Fedlex: Gesetzbücher, Gesetze und Verordnungen des Bundes'],
        ['Kantonales Recht', 'Erlasse und Praxis der 26 Kantone'],
        ['Bundesgerichte', 'Bundesgericht und BGE, Bundesverwaltungsgericht, Bundesstrafgericht'],
        ['Kantonale Gerichte', 'Urteile der Gerichte der 26 Kantone'],
        [
          'Praxis',
          'ESTV, FINMA, SECO, BSV, EDÖB, BJ, MROS, SUVA, BAG, SEM, BAZG, BAKOM, WEKO, ComCom, ElCom, ESBK',
        ],
        ['Europäische Union', 'Verordnungen, Richtlinien und Urteile des EuGH'],
        ['EGMR', 'Urteile und Entscheidungen aus Strassburg seit 1955 (HUDOC)'],
        ['Sprachen', 'App auf Italienisch, Deutsch oder Französisch'],
      ],
      benvenuto: {
        titolo: 'Die Schweizer KI, die ',
        titoloOro: 'das gesamte Schweizer Recht',
        titoloDopo: ' durchdenkt.',
        sottotitolo: `Geprüfte Quellen, über ${milioniIn(CH.totale, 'de')} juristische und steuerliche Dokumente, strukturierte Argumentation.`,
        domanda: 'Mir wurde während meiner Krankheit gekündigt. Ist das gültig?',
        risposta:
          'Nach der Probezeit ist eine Kündigung während der Krankheit nichtig: Die Sperrfrist dauert je nach Dienstjahren 30 bis 180 Tage.',
        citazioni: ['OR, Art. 336c'],
      },
      fontiTesto:
        'Lex durchsucht Bundes- und Kantonsrecht, Rechtsprechung und Praxis und zeigt Ihnen, woher jede Aussage stammt. Die Datenbank können Sie auch selbst durchsuchen, kostenlos.',
      fontiBenvenuto: [
        {
          nome: 'Bundesrecht',
          icona: 'libro',
          descrizione: 'Fedlex: Gesetzbücher, Gesetze und Verordnungen',
        },
        { nome: 'Kantonales Recht', icona: 'mappa', descrizione: 'Erlasse und Praxis der 26 Kantone' },
        {
          nome: 'Rechtsprechung',
          icona: 'tribunale',
          descrizione: 'BGer und BGE, BVGer, BStGer und kantonale Gerichte',
        },
        { nome: 'Praxis', icona: 'documento', descrizione: 'ESTV, FINMA, SECO und weitere Bundesbehörden' },
        { nome: 'Europa', icona: 'globo', descrizione: 'EU-Recht, EuGH, EGMR' },
      ],
    },
    fr: {
      diritto: 'Droit suisse et européen',
      totaleDocumenti: `Plus de ${milioniIn(CH.totale, 'fr')} de documents`,
      elencoFonti: [
        ['Droit fédéral', 'Fedlex : codes, lois et ordonnances de la Confédération'],
        ['Droit cantonal', 'Normes et pratique des 26 cantons'],
        [
          'Tribunaux fédéraux',
          'Tribunal fédéral et ATF, Tribunal administratif fédéral, Tribunal pénal fédéral',
        ],
        ['Tribunaux cantonaux', 'Arrêts des tribunaux des 26 cantons'],
        [
          'Pratique',
          'AFC, FINMA, SECO, OFAS, PFPDT, OFJ, MROS, SUVA, OFSP, SEM, OFDF, OFCOM, COMCO, ComCom, ElCom, CFMJ',
        ],
        ['Union européenne', 'Règlements, directives et arrêts de la Cour de justice'],
        ['Cour EDH', 'Arrêts et décisions de Strasbourg depuis 1955 (HUDOC)'],
        ['Langues', 'App en italien, allemand ou français'],
      ],
      benvenuto: {
        titolo: "L'IA suisse qui raisonne sur ",
        titoloOro: 'tout le droit suisse.',
        sottotitolo: `Sources vérifiées, plus de ${milioniIn(CH.totale, 'fr')} de documents juridiques et fiscaux, raisonnement structuré.`,
        domanda: "J'ai été licencié pendant mon arrêt maladie. Est-ce valable ?",
        risposta:
          "Après le temps d'essai, un congé donné pendant la maladie est nul : la protection dure de 30 à 180 jours selon les années de service.",
        citazioni: ['CO, art. 336c'],
      },
      fontiTesto:
        "Lex cherche dans le droit fédéral et cantonal, la jurisprudence et la pratique, et vous indique d'où vient chaque passage. Vous pouvez aussi consulter la base de données vous-même, gratuitement.",
      fontiBenvenuto: [
        { nome: 'Droit fédéral', icona: 'libro', descrizione: 'Fedlex : codes, lois et ordonnances' },
        { nome: 'Droit cantonal', icona: 'mappa', descrizione: 'Normes et pratique des 26 cantons' },
        {
          nome: 'Jurisprudence',
          icona: 'tribunale',
          descrizione: 'TF et ATF, TAF, TPF et tribunaux cantonaux',
        },
        {
          nome: 'Pratique administrative',
          icona: 'documento',
          descrizione: 'AFC, FINMA, SECO et les autres autorités fédérales',
        },
        { nome: 'Europe', icona: 'globo', descrizione: "Droit de l'UE, CJUE, CEDH" },
      ],
    },
  },
};

// I testi di un paese nella lingua chiesta: quello che manca resta in italiano.
export function contenutiIn(paese: string, lingua: Lingua): Contenuti {
  const base = contenuti[paese];
  const t = traduzioni[paese]?.[lingua];
  if (!t) return base;
  return { ...base, ...t, benvenuto: { ...base.benvenuto, ...t.benvenuto } } as Contenuti;
}
