// DATI FINTI della tappa 1: le risposte di Lex e le norme che citano.
// Dalla tappa 3 la risposta arriva da lex-lead, in streaming.

export type Pezzo = string | { cit: string; norma: string };

export type RispostaFinta = {
  titolo: string;
  inBreve?: string;
  punti: { titolo: string; testo: Pezzo[] }[];
  nota?: string;
};

// Le risposte di prova, una per argomento. Lex «sceglie» quella giusta con le parole della domanda.
const accessoAgliAtti: RispostaFinta = {
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
};

const legittimaDifesaIT: RispostaFinta = {
  titolo: 'Legittima difesa in casa',
  inBreve:
    'in casa tua la difesa si presume proporzionata, ma serve un pericolo in corso: contro chi sta scappando non vale.',
  punti: [
    {
      titolo: 'Serve un pericolo attuale.',
      testo: [
        " Ti difendi da un'offesa ingiusta che sta avvenendo, e la difesa deve essere proporzionata all'offesa ",
        { cit: 'c.p., art. 52, c. 1', norma: 'cp-52-1' },
        '.',
      ],
    },
    {
      titolo: 'In casa la proporzione si presume.',
      testo: [
        " Se usi un'arma detenuta legalmente o un altro mezzo adatto per difendere te o altri, o i beni quando il ladro non desiste e c'è pericolo di aggressione ",
        { cit: 'art. 52, c. 2', norma: 'cp-52-2' },
        ". Chi respinge un'intrusione fatta con violenza o minacce è sempre in legittima difesa ",
        { cit: 'art. 52, c. 4', norma: 'cp-52-4' },
        '.',
      ],
    },
    {
      titolo: 'Se esageri per paura.',
      testo: [
        ' Non sei punibile se hai agito in stato di grave turbamento, causato dal pericolo ',
        { cit: 'c.p., art. 55, c. 2', norma: 'cp-55-2' },
        '.',
      ],
    },
  ],
  nota: "Chiama subito il 112 e racconta i fatti: anche quando la difesa è legittima, di solito si apre un'indagine per verificarlo.",
};

const cauzioneIT: RispostaFinta = {
  titolo: "Cauzione dell'affitto",
  inBreve:
    "la cauzione va restituita alla fine dell'affitto, con gli interessi. Il padrone di casa può trattenere solo i danni oltre l'uso normale.",
  punti: [
    {
      titolo: 'La cauzione va restituita.',
      testo: [
        " Ti spetta con gli interessi legali, e non poteva superare tre mensilità dell'affitto ",
        { cit: 'L. 392/1978, art. 11', norma: 'l392-11' },
        '.',
      ],
    },
    {
      titolo: "L'usura normale non si paga.",
      testo: [
        " Devi restituire la casa com'era, ma non rispondi del consumo dovuto all'uso normale ",
        { cit: 'c.c., art. 1590', norma: 'cc-1590' },
        '. I danni deve dimostrarli lui.',
      ],
    },
    {
      titolo: 'Prima, una diffida scritta.',
      testo: [
        " Mandagli una PEC o una raccomandata con un termine per restituirla. Se non basta, per una causa sull'affitto bisogna prima tentare la mediazione ",
        { cit: 'D.Lgs. 28/2010, art. 5', norma: 'dlgs28-5' },
        '.',
      ],
    },
  ],
};

const multaIT: RispostaFinta = {
  titolo: 'Multa arrivata tardi',
  inBreve:
    "se è stata spedita più di 90 giorni dopo l'infrazione puoi contestarla: 30 giorni per il giudice di pace, 60 per il Prefetto.",
  punti: [
    {
      titolo: 'Il termine è di 90 giorni.',
      testo: [
        " Se l'infrazione non ti è stata contestata sul momento, il verbale va notificato entro 90 giorni dall'accertamento ",
        { cit: 'C.d.S., art. 201', norma: 'cds-201' },
        '. Conta la data di spedizione, non quella in cui lo ricevi.',
      ],
    },
    {
      titolo: 'Due strade per contestarla.',
      testo: [
        ' Ricorso al Prefetto entro 60 giorni ',
        { cit: 'art. 203', norma: 'cds-203' },
        ', oppure al giudice di pace entro 30 giorni ',
        { cit: 'art. 204-bis', norma: 'cds-204bis' },
        { cit: 'D.Lgs. 150/2011, art. 7', norma: 'dlgs150-7' },
        '.',
      ],
    },
    {
      titolo: 'Se è valida, pagare presto conviene.',
      testo: [
        ' Entro 5 giorni paghi il 30% in meno; entro 60 giorni il minimo previsto ',
        { cit: 'art. 202', norma: 'cds-202' },
        '.',
      ],
    },
  ],
  nota: 'Se paghi, non puoi più contestarla. E se il Prefetto respinge il ricorso, puoi dover pagare almeno il doppio del minimo.',
};

const disdettaMalattiaCH: RispostaFinta = {
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
};

const legittimaDifesaCH: RispostaFinta = {
  titolo: 'Legittima difesa',
  inBreve:
    "puoi respingere l'aggressione, ma in modo adeguato alle circostanze. Se esageri per spavento, il giudice ne tiene conto.",
  punti: [
    {
      titolo: 'Hai il diritto di difenderti.',
      testo: [
        " Da un'aggressione ingiusta, o dalla minaccia di un'aggressione imminente, contro di te o contro altri ",
        { cit: 'CP, art. 15', norma: 'cp-ch-15' },
        '.',
      ],
    },
    {
      titolo: 'In modo adeguato.',
      testo: [
        " La difesa deve essere adeguata alle circostanze e vale finché c'è l'aggressione: contro chi sta scappando non vale più ",
        { cit: 'CP, art. 15', norma: 'cp-ch-15' },
        '.',
      ],
    },
    {
      titolo: 'Se esageri.',
      testo: [
        ' Il giudice attenua la pena; se hai ecceduto per scusabile eccitazione o sbigottimento, non sei colpevole ',
        { cit: 'CP, art. 16', norma: 'cp-ch-16' },
        '.',
      ],
    },
  ],
  nota: 'Chiama subito la polizia (117) e racconta i fatti: sarà il giudice a valutarli.',
};

const garanziaCH: RispostaFinta = {
  titolo: "Garanzia dell'affitto",
  inBreve:
    'la garanzia sta su un conto a tuo nome. Se entro un anno il locatore non fa valere pretese in giudizio, la chiedi direttamente alla banca.',
  punti: [
    {
      titolo: 'È su un conto a tuo nome.',
      testo: [
        ' Il locatore deve depositarla in banca, su un conto intestato a te ',
        { cit: 'CO, art. 257e cpv. 1', norma: 'co-257e-1' },
        '.',
      ],
    },
    {
      titolo: 'Dopo un anno la chiedi alla banca.',
      testo: [
        ' Prima serve il consenso di entrambi o una decisione; dopo un anno dalla fine della locazione senza pretese del locatore in giudizio, basta la tua richiesta ',
        { cit: 'CO, art. 257e cpv. 3', norma: 'co-257e-3' },
        '.',
      ],
    },
    {
      titolo: "Se non siete d'accordo.",
      testo: [
        " Rivolgiti all'autorità di conciliazione in materia di locazione: è il primo passo e di regola non costa ",
        { cit: 'CPC, art. 197', norma: 'cpc-197' },
        '.',
      ],
    },
  ],
};

const decretoAccusaCH: RispostaFinta = {
  titolo: "Contestare un decreto d'accusa",
  inBreve: 'hai 10 giorni per fare opposizione scritta al pubblico ministero. Non devi spiegare perché.',
  punti: [
    {
      titolo: "Dieci giorni per l'opposizione.",
      testo: [
        ' Per iscritto, al pubblico ministero che ha emesso il decreto ',
        { cit: 'CPP, art. 354 cpv. 1', norma: 'cpp-354-1' },
        '.',
      ],
    },
    {
      titolo: 'Non serve motivarla.',
      testo: [
        " L'opposizione dell'imputato non deve essere motivata ",
        { cit: 'cpv. 2', norma: 'cpp-354-2' },
        '.',
      ],
    },
    {
      titolo: 'Se non fai niente, diventa definitivo.',
      testo: [
        ' Senza opposizione il decreto diventa una sentenza passata in giudicato ',
        { cit: 'cpv. 3', norma: 'cpp-354-3' },
        '.',
      ],
    },
  ],
  nota: "Le multe disciplinari fino a 300 franchi seguono un'altra procedura: se non le paghi entro 30 giorni, si passa a quella ordinaria.",
};

const reclamoTassazioneCH: RispostaFinta = {
  titolo: 'Reclamo contro la tassazione',
  inBreve:
    "hai 30 giorni dalla notifica per un reclamo scritto all'autorità di tassazione. Non serve un avvocato.",
  punti: [
    {
      titolo: 'Trenta giorni dalla notifica.',
      testo: [
        " Il reclamo si presenta per iscritto all'autorità che ha emesso la decisione ",
        { cit: 'LIFD, art. 132 cpv. 1', norma: 'lifd-132-1' },
        '. Per le imposte cantonali la regola è la stessa, nella legge del tuo cantone.',
      ],
    },
    {
      titolo: 'Scrivi cosa non va.',
      testo: [
        ' Indica le voci che contesti e allega i documenti (ricevute, certificati): così la decisione si corregge più in fretta.',
      ],
    },
    {
      titolo: "Se è una tassazione d'ufficio.",
      testo: [
        ' Se non avevi consegnato la dichiarazione, puoi contestarla solo se è manifestamente inesatta, spiegando perché e con le prove ',
        { cit: 'art. 132 cpv. 3', norma: 'lifd-132-3' },
        '.',
      ],
    },
  ],
  nota: 'Dopo il reclamo arriva una nuova decisione: contro quella puoi ricorrere alla commissione di ricorso del cantone.',
};

// Argomenti in ordine: vince il primo che ha una parola della domanda (minuscole, senza accenti).
// L'accesso agli atti è in fondo perché «comune» compare anche in altre domande.
const argomenti: Record<string, { parole: string[]; risposta: RispostaFinta }[]> = {
  IT: [
    { parole: ['difes', 'ladr', 'rapin', 'aggress', 'intrus', 'scassin'], risposta: legittimaDifesaIT },
    {
      parole: ['multa', 'multe', 'verbale', 'autovelox', 'contravvenz', 'codice della strada'],
      risposta: multaIT,
    },
    {
      parole: ['cauzion', 'caparra', 'affitt', 'locazion', 'padrone di casa', 'inquilin'],
      risposta: cauzioneIT,
    },
    { parole: ['accesso', 'comune', 'pratica edilizia'], risposta: accessoAgliAtti },
  ],
  CH: [
    {
      parole: ['difes', 'ladr', 'aggress', 'notwehr', 'einbrech', 'legitime defense', 'cambriol'],
      risposta: legittimaDifesaCH,
    },
    {
      parole: ["decreto d'accusa", 'multa', 'multe', 'velocit', 'busse', 'strafbefehl', 'amende', 'radar'],
      risposta: decretoAccusaCH,
    },
    {
      parole: ['garanzi', 'affitt', 'locator', 'pigion', 'kaution', 'miet', 'loyer', 'bailleur'],
      risposta: garanziaCH,
    },
    {
      parole: ['disdett', 'malatt', 'licenzi', 'kundig', 'krank', 'licenci', 'maladie', 'resili'],
      risposta: disdettaMalattiaCH,
    },
    {
      parole: ['tassazion', 'impost', 'tasse', 'steuer', 'impot', 'fiscal', 'veranlagung', 'taxation'],
      risposta: reclamoTassazioneCH,
    },
  ],
};

// Domanda fuori dagli argomenti di prova: lo dice, senza inventare una risposta.
const rispostaFuoriProva: RispostaFinta = {
  titolo: '',
  punti: [],
  nota: "Risposta di prova: in questa versione Lex conosce solo le domande d'esempio (per esempio affitto, multe o tasse). Dalla tappa 3 risponde a tutto.",
};

export function rispostaPer(paese: string, domanda: string): RispostaFinta {
  const t = domanda
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase();
  const trovato = (argomenti[paese] ?? []).find((a) => a.parole.some((p) => t.includes(p)));
  return trovato?.risposta ?? rispostaFuoriProva;
}

export type Messaggio =
  | { id: string; da: 'io'; testo: string }
  | { id: string; da: 'lex'; risposta: RispostaFinta }
  | { id: string; da: 'errore'; testo: string }; // Lex non ha risposto: il credito non è scalato

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
  'cp-52-1': {
    id: 'cp-52-1',
    legge: 'Codice penale (R.D. 19 ottobre 1930, n. 1398)',
    articolo: 'Art. 52 · Difesa legittima',
    comma: '1.',
    evidenziato:
      "Non è punibile chi ha commesso il fatto, per esservi stato costretto dalla necessità di difendere un diritto proprio od altrui contro il pericolo attuale di un'offesa ingiusta, sempre che la difesa sia proporzionata all'offesa.",
  },
  'cp-52-2': {
    id: 'cp-52-2',
    legge: 'Codice penale (R.D. 19 ottobre 1930, n. 1398)',
    articolo: 'Art. 52 · Difesa legittima',
    comma: '2.',
    prima:
      "Nei casi previsti dall'articolo 614, primo e secondo comma, sussiste sempre il rapporto di proporzione di cui al primo comma del presente articolo se taluno legittimamente presente in uno dei luoghi ivi indicati ",
    evidenziato: "usa un'arma legittimamente detenuta o altro mezzo idoneo al fine di difendere:",
    dopo: " a) la propria o la altrui incolumità; b) i beni propri o altrui, quando non vi è desistenza e vi è pericolo d'aggressione.",
  },
  'cp-52-4': {
    id: 'cp-52-4',
    legge: 'Codice penale (R.D. 19 ottobre 1930, n. 1398)',
    articolo: 'Art. 52 · Difesa legittima',
    comma: '4.',
    prima: 'Nei casi di cui al secondo e al terzo comma ',
    evidenziato:
      "agisce sempre in stato di legittima difesa colui che compie un atto per respingere l'intrusione posta in essere, con violenza o minaccia di uso di armi o di altri mezzi di coazione fisica, da parte di una o più persone.",
  },
  'cp-55-2': {
    id: 'cp-55-2',
    legge: 'Codice penale (R.D. 19 ottobre 1930, n. 1398)',
    articolo: 'Art. 55 · Eccesso colposo',
    comma: '2.',
    prima: "Nei casi di cui ai commi secondo, terzo e quarto dell'articolo 52, ",
    evidenziato:
      "la punibilità è esclusa se chi ha commesso il fatto per la salvaguardia della propria o altrui incolumità ha agito nelle condizioni di cui all'articolo 61, primo comma, n. 5) ovvero in stato di grave turbamento, derivante dalla situazione di pericolo in atto.",
  },
  'l392-11': {
    id: 'l392-11',
    legge: 'Legge 27 luglio 1978, n. 392',
    articolo: 'Art. 11 · Deposito cauzionale',
    evidenziato: 'Il deposito cauzionale non può essere superiore a tre mensilità del canone.',
    dopo: ' Esso è produttivo di interessi legali che debbono essere corrisposti al conduttore alla fine di ogni anno.',
  },
  'cc-1590': {
    id: 'cc-1590',
    legge: 'Codice civile (R.D. 16 marzo 1942, n. 262)',
    articolo: 'Art. 1590 · Restituzione della cosa locata',
    comma: '1.',
    prima:
      "Il conduttore deve restituire la cosa al locatore nello stato medesimo in cui l'ha ricevuta, in conformità della descrizione che ne sia stata fatta dalle parti, ",
    evidenziato:
      "salvo il deterioramento o il consumo risultante dall'uso della cosa in conformità del contratto.",
  },
  'dlgs28-5': {
    id: 'dlgs28-5',
    legge: 'Decreto legislativo 4 marzo 2010, n. 28',
    articolo: 'Art. 5 · Condizione di procedibilità e rapporti con il processo',
    comma: '1.',
    prima:
      "Chi intende esercitare in giudizio un'azione relativa a una controversia in materia di condominio, diritti reali, divisione, successioni ereditarie, patti di famiglia, ",
    evidenziato: 'locazione',
    dopo: ', comodato, affitto di aziende, […] è tenuto preliminarmente a esperire il procedimento di mediazione ai sensi del presente capo.',
  },
  'cds-201': {
    id: 'cds-201',
    legge: 'Codice della strada (D.Lgs. 30 aprile 1992, n. 285)',
    articolo: 'Art. 201 · Notificazione delle violazioni',
    comma: '1.',
    prima:
      'Qualora la violazione non possa essere immediatamente contestata, il verbale, con gli estremi precisi e dettagliati della violazione e con la indicazione dei motivi che hanno reso impossibile la contestazione immediata, ',
    evidenziato: "deve, entro novanta giorni dall'accertamento, essere notificato all'effettivo trasgressore",
    dopo: " o, quando questi non sia stato identificato e si tratti di violazione commessa dal conducente di un veicolo a motore, munito di targa, ad uno dei soggetti indicati nell'articolo 196, quali risultano dai pubblici registri alla data dell'accertamento.",
  },
  'cds-202': {
    id: 'cds-202',
    legge: 'Codice della strada (D.Lgs. 30 aprile 1992, n. 285)',
    articolo: 'Art. 202 · Pagamento in misura ridotta',
    comma: '1.',
    prima:
      "Per le violazioni per le quali il presente codice stabilisce una sanzione amministrativa pecuniaria, ferma restando l'applicazione delle eventuali sanzioni accessorie, il trasgressore è ammesso a pagare, entro sessanta giorni dalla contestazione o dalla notificazione, una somma pari al minimo fissato dalle singole norme. ",
    evidenziato:
      'Tale somma è ridotta del 30 per cento se il pagamento è effettuato entro cinque giorni dalla contestazione o dalla notificazione.',
  },
  'cds-203': {
    id: 'cds-203',
    legge: 'Codice della strada (D.Lgs. 30 aprile 1992, n. 285)',
    articolo: 'Art. 203 · Ricorso al prefetto',
    comma: '1.',
    evidenziato:
      "Il trasgressore o gli altri soggetti indicati nell'articolo 196, nel termine di sessanta giorni dalla data di contestazione o di notificazione, qualora non sia stato effettuato il pagamento in misura ridotta nei casi in cui è consentito, possono proporre ricorso al prefetto del luogo della commessa violazione,",
    dopo: " da presentarsi all'ufficio o comando cui appartiene l'organo accertatore ovvero da inviarsi agli stessi con raccomandata con ricevuta di ritorno.",
  },
  'cds-204bis': {
    id: 'cds-204bis',
    legge: 'Codice della strada (D.Lgs. 30 aprile 1992, n. 285)',
    articolo: 'Art. 204-bis · Ricorso in sede giurisdizionale',
    comma: '1.',
    evidenziato:
      "Alternativamente alla proposizione del ricorso di cui all'articolo 203, il trasgressore o gli altri soggetti indicati nell'articolo 196, qualora non sia stato effettuato il pagamento in misura ridotta nei casi in cui è consentito, possono proporre opposizione davanti all'autorità giudiziaria ordinaria.",
    dopo: " L'opposizione è regolata dall'articolo 7 del decreto legislativo 1° settembre 2011, n. 150.",
  },
  'dlgs150-7': {
    id: 'dlgs150-7',
    legge: 'Decreto legislativo 1° settembre 2011, n. 150',
    articolo: "Art. 7 · Dell'opposizione al verbale di accertamento di violazione del codice della strada",
    comma: '3.',
    evidenziato:
      'Il ricorso è proposto, a pena di inammissibilità, entro trenta giorni dalla data di contestazione della violazione o di notificazione del verbale di accertamento,',
    dopo: " ovvero entro sessanta giorni se il ricorrente risiede all'estero […].",
  },
  'cp-ch-15': {
    id: 'cp-ch-15',
    legge: 'Codice penale svizzero (RS 311.0)',
    articolo: 'Art. 15 · Legittima difesa esimente',
    evidenziato:
      "Ognuno ha il diritto di respingere in modo adeguato alle circostanze un'aggressione ingiusta o la minaccia ingiusta di un'aggressione imminente fatta a sé o ad altri.",
  },
  'cp-ch-16': {
    id: 'cp-ch-16',
    legge: 'Codice penale svizzero (RS 311.0)',
    articolo: 'Art. 16 · Legittima difesa discolpante',
    comma: 'Cpv. 2',
    evidenziato:
      'Chi eccede i limiti della legittima difesa per scusabile eccitazione o sbigottimento non agisce in modo colpevole.',
  },
  'co-257e-1': {
    id: 'co-257e-1',
    legge: 'Codice delle obbligazioni (RS 220)',
    articolo: 'Art. 257e · Garanzie prestate dal conduttore',
    comma: 'Cpv. 1',
    prima:
      "Se il conduttore di locali d'abitazione o commerciali presta una garanzia in contanti o in titoli, ",
    evidenziato:
      'il locatore deve depositarla presso una banca, su un conto di risparmio o di deposito intestato al conduttore.',
    leggeId: 'co',
  },
  'co-257e-3': {
    id: 'co-257e-3',
    legge: 'Codice delle obbligazioni (RS 220)',
    articolo: 'Art. 257e · Garanzie prestate dal conduttore',
    comma: 'Cpv. 3',
    prima:
      'La banca può restituire la garanzia soltanto con il consenso di entrambe le parti oppure in base a un precetto esecutivo o a una sentenza passata in giudicato. ',
    evidenziato:
      'Se entro un anno dalla fine della locazione il locatore non ha fatto valere legalmente alcuna pretesa nei confronti del conduttore, questi può esigere dalla banca la restituzione della garanzia.',
    leggeId: 'co',
  },
  'cpc-197': {
    id: 'cpc-197',
    legge: 'Codice di diritto processuale civile svizzero (RS 272)',
    articolo: 'Art. 197 · Principio',
    evidenziato:
      "La procedura decisionale è preceduta da un tentativo di conciliazione davanti a un'autorità di conciliazione.",
  },
  'cpp-354-1': {
    id: 'cpp-354-1',
    legge: 'Codice di diritto processuale penale svizzero (RS 312.0)',
    articolo: 'Art. 354 · Opposizione',
    comma: 'Cpv. 1',
    evidenziato:
      "Possono interporre opposizione scritta al decreto d'accusa presso il pubblico ministero entro dieci giorni:",
    dopo: " a. l'imputato; […]",
  },
  'cpp-354-2': {
    id: 'cpp-354-2',
    legge: 'Codice di diritto processuale penale svizzero (RS 312.0)',
    articolo: 'Art. 354 · Opposizione',
    comma: 'Cpv. 2',
    evidenziato: "Eccettuata quella dell'imputato, l'opposizione deve essere motivata.",
  },
  'cpp-354-3': {
    id: 'cpp-354-3',
    legge: 'Codice di diritto processuale penale svizzero (RS 312.0)',
    articolo: 'Art. 354 · Opposizione',
    comma: 'Cpv. 3',
    evidenziato:
      "Se non è interposta valida opposizione, il decreto d'accusa diviene sentenza passata in giudicato.",
  },
  'lifd-132-1': {
    id: 'lifd-132-1',
    legge: "Legge federale sull'imposta federale diretta (LIFD, RS 642.11)",
    articolo: 'Art. 132 · Presupposti',
    comma: 'Cpv. 1',
    evidenziato:
      "Contro la decisione di tassazione il contribuente può, entro 30 giorni dalla notificazione, presentare reclamo scritto all'autorità di tassazione.",
  },
  'lifd-132-3': {
    id: 'lifd-132-3',
    legge: "Legge federale sull'imposta federale diretta (LIFD, RS 642.11)",
    articolo: 'Art. 132 · Presupposti',
    comma: 'Cpv. 3',
    evidenziato:
      "La tassazione d'ufficio può essere impugnata dal contribuente soltanto perché manifestamente inesatta.",
    dopo: ' Il reclamo deve essere motivato e indicare gli eventuali mezzi di prova.',
  },
};
