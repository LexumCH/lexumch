// DATI FINTI della tappa 1: le risposte di Lex e le norme che citano.
// Dalla tappa 3 la risposta arriva da lex-lead, in streaming.

export type Pezzo = string | { cit: string; norma: string };

export type RispostaFinta = {
  titolo: string;
  inBreve?: string;
  punti: { titolo: string; testo: Pezzo[] }[];
  nota?: string;
};

export const risposteFinte: Record<string, RispostaFinta> = {
  IT: {
    titolo: 'Accesso agli atti',
    inBreve: 'il silenzio vale come rifiuto. Hai 30 giorni per contestarlo, anche senza avvocato.',
    punti: [
      {
        titolo: 'Il silenzio è un rifiuto.',
        testo: [
          ' Dopo 30 giorni senza risposta la richiesta si intende respinta ',
          { cit: 'L. 241/1990, art. 25', norma: 'l241-25' },
          '. Ti restano circa 20 giorni.',
        ],
      },
      {
        titolo: 'Riesame gratuito.',
        testo: [
          ' Nello stesso termine puoi chiedere al difensore civico di riesaminare il rifiuto ',
          { cit: 'art. 25, c. 4', norma: 'l241-25' },
          '.',
        ],
      },
      {
        titolo: 'Ricorso al TAR.',
        testo: [
          ' Entro 30 giorni, notificato al Comune e agli eventuali controinteressati ',
          { cit: 'c.p.a., art. 116', norma: 'cpa-116' },
          '. Puoi stare in giudizio da solo ',
          { cit: 'c.p.a., art. 23', norma: 'cpa-23' },
          '.',
        ],
      },
    ],
  },
  CH: {
    titolo: 'Disdetta durante la malattia',
    inBreve:
      'se la disdetta ti è arrivata durante la malattia, nel periodo di protezione, è nulla. Il datore di lavoro deve darla di nuovo.',
    punti: [
      {
        titolo: 'La disdetta è nulla.',
        testo: [
          " Data durante l'incapacità al lavoro, nel periodo di protezione, non ha effetto ",
          { cit: 'CO, art. 336c cpv. 2', norma: 'co-336c-2' },
          '.',
        ],
      },
      {
        titolo: 'Quanto dura la protezione.',
        testo: [
          ' Dopo il tempo di prova: 30 giorni nel primo anno di servizio, 90 dal secondo al quinto, 180 dal sesto ',
          { cit: 'CO, art. 336c cpv. 1', norma: 'co-336c-1' },
          '.',
        ],
      },
      {
        titolo: 'Se la disdetta era arrivata prima.',
        testo: [
          ' Il termine di disdetta si ferma durante la malattia e riprende alla fine del periodo di protezione ',
          { cit: 'CO, art. 336c cpv. 2', norma: 'co-336c-2' },
          '.',
        ],
      },
    ],
  },
};

export type Messaggio =
  { id: string; da: 'io'; testo: string } | { id: string; da: 'lex'; risposta: RispostaFinta };

// Risposta alle domande successive: nella tappa 1 Lex non c'è ancora.
export const rispostaDiSeguitoFinta: RispostaFinta = {
  titolo: '',
  punti: [],
  nota: 'Risposta di prova: qui arriverà la risposta vera di Lex (tappa 3).',
};

export type Norma = {
  id: string;
  legge: string;
  articolo: string; // «Art. 25 · Modalità di esercizio …»
  comma?: string;
  prima?: string;
  evidenziato?: string;
  dopo?: string;
  leggeId?: string; // per «Apri la legge»
};

export const normeFinte: Record<string, Norma> = {
  'l241-25': {
    id: 'l241-25',
    legge: 'Legge 7 agosto 1990, n. 241',
    articolo: 'Art. 25 · Modalità di esercizio del diritto di accesso e ricorsi',
    comma: '4.',
    evidenziato: 'Decorsi inutilmente trenta giorni dalla richiesta, questa si intende respinta.',
    dopo: " In caso di diniego dell'accesso, espresso o tacito, o di differimento dello stesso ai sensi dell'articolo 24, comma 4, il richiedente può presentare ricorso al tribunale amministrativo regionale ai sensi del comma 5, ovvero chiedere, nello stesso termine e nei confronti degli atti delle amministrazioni comunali, provinciali e regionali, al difensore civico competente per ambito territoriale, ove costituito, che sia riesaminata la suddetta determinazione.",
    leggeId: 'l241-1990',
  },
  'cpa-116': {
    id: 'cpa-116',
    legge: 'Decreto legislativo 2 luglio 2010, n. 104',
    articolo: 'Art. 116 · Rito in materia di accesso ai documenti amministrativi',
    comma: '1.',
    prima:
      "Contro le determinazioni e contro il silenzio sulle istanze di accesso ai documenti amministrativi, nonché per la tutela del diritto di accesso civico connessa all'inadempimento degli obblighi di trasparenza, ",
    evidenziato:
      "il ricorso è proposto entro trenta giorni dalla conoscenza della determinazione impugnata o dalla formazione del silenzio, mediante notificazione all'amministrazione e agli eventuali controinteressati.",
  },
  'cpa-23': {
    id: 'cpa-23',
    legge: 'Decreto legislativo 2 luglio 2010, n. 104',
    articolo: 'Art. 23 · Parti e difensori',
    comma: '1.',
    evidenziato:
      "Le parti possono stare in giudizio personalmente senza l'assistenza del difensore nei giudizi in materia di accesso ai documenti amministrativi,",
    dopo: " in materia elettorale e nei giudizi relativi al diritto dei cittadini dell'Unione europea e dei loro familiari di circolare e di soggiornare liberamente nel territorio degli Stati membri.",
  },
  'co-336c-1': {
    id: 'co-336c-1',
    legge: 'Codice delle obbligazioni (RS 220)',
    articolo: 'Art. 336c · Disdetta in tempo inopportuno da parte del datore di lavoro',
    comma: 'Cpv. 1',
    prima: 'Dopo il tempo di prova, il datore di lavoro non può disdire il rapporto di lavoro: […] b. ',
    evidenziato:
      "durante un'incapacità al lavoro totale o parziale cagionata da malattia o da infortunio non imputabili al lavoratore, per 30 giorni nel primo anno di servizio, per 90 giorni dal secondo anno di servizio sino al quinto compreso e per 180 giorni dal sesto anno di servizio;",
    leggeId: 'co',
  },
  'co-336c-2': {
    id: 'co-336c-2',
    legge: 'Codice delle obbligazioni (RS 220)',
    articolo: 'Art. 336c · Disdetta in tempo inopportuno da parte del datore di lavoro',
    comma: 'Cpv. 2',
    evidenziato: 'La disdetta data durante uno dei periodi stabiliti nel capoverso 1 è nulla;',
    dopo: ' se data prima, il termine che non sia ancora giunto a scadenza è sospeso e riprende a decorrere soltanto dopo la fine del periodo.',
    leggeId: 'co',
  },
};
