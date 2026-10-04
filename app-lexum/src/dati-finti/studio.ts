// DATI FINTI dell'area Studio dei professionisti: clienti, pratiche, appuntamenti, fatture.
// Ricalcano tabelle e campi dei siti (vedi docs/professionisti/). Dalla tappa «Studio» arrivano
// dalle tabelle vere: pratiche, controparti, termini_processuali, udienze, appuntamenti, fatture.
// Le date sono relative a oggi, così l'anteprima resta sempre attuale.

export type Cliente = {
  id: string;
  nome: string; // nome e cognome, oppure ragione sociale
  giuridica?: boolean;
  // dati usati in fattura
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string; // IT
  paese?: string;
  cf?: string; // IT
  piva?: string; // IT
  codiceDestinatario?: string; // IT, SDI
  uid?: string; // CH
};

export const tipiCausa = ['Civile', 'Penale', 'Commerciale', 'Amministrativo', 'Lavoro', 'Famiglia'] as const;
export type TipoCausa = (typeof tipiCausa)[number];

export const esiti = ['Vinta', 'Persa', 'Transatta', 'Archiviata'] as const;
export type Esito = (typeof esiti)[number];

export type Termine = {
  id: string;
  titolo: string;
  scadenza: string; // ISO
  evento?: string; // «Da: notifica della sentenza…»
  stato: 'in_corso' | 'compiuto';
};

export type StatoUdienza = 'programmata' | 'svolta' | 'rinviata' | 'annullata';
export type Udienza = {
  id: string;
  dataOra: string; // ISO
  tipo: string;
  stato: StatoUdienza;
  sede?: string; // tribunale, sezione, aula
  giudice?: string;
  esito?: string;
};

export type Controparte = {
  id: string;
  nome: string;
  giuridica?: boolean;
  ruolo: string; // ruolo processuale
  legale?: string; // legale avversario
};

export type DocumentoPratica = { id: string; titolo: string; quando: string; archivio?: boolean };
export type RicercaPratica = { id: string; titolo: string; tipo: 'Chat con Lex' | 'Ricerca AI' | 'Appunti' };

export type Pratica = {
  id: string;
  titolo: string;
  clienteId: string;
  tipo: TipoCausa;
  stato: 'aperta' | 'chiusa';
  esito?: Esito;
  creata: string; // ISO
  note?: string; // note interne: Lex non le legge
  oreDedicate?: number; // solo IT
  controparti: Controparte[];
  termini: Termine[];
  udienze: Udienza[];
  documenti: DocumentoPratica[];
  ricerche: RicercaPratica[];
};

export type TipoEvento = 'presenza' | 'videocall' | 'telefonico' | 'udienza' | 'scadenza';
export type StatoEvento = 'programmato' | 'concluso' | 'annullato';
export type Appuntamento = {
  id: string;
  titolo: string;
  tipo: TipoEvento;
  stato: StatoEvento;
  inizio: string; // ISO
  fine: string; // ISO
  clienteId?: string;
  praticaId?: string;
  noteInterne?: string; // per l'udienza: tribunale e aula
  noteCliente?: string;
  link?: string;
  origine?: 'termine' | 'udienza' | 'mandato'; // eventi creati da altro, si gestiscono lì
};

export type RigaFattura = { id: string; descrizione: string; quantita: number; prezzo: number };
export type StatoFattura = 'in_attesa' | 'pagata' | 'annullata';
export type Pagamento = { id: string; data: string; importo: number; metodo: string };

export type Fattura = {
  id: string;
  numero: string; // F-AAAA-NNN
  clienteId: string;
  praticaId?: string;
  emessa: string; // ISO
  scadenza?: string; // ISO
  stato: StatoFattura;
  righe: RigaFattura[];
  // IT
  cpa?: number; // %
  iva: number; // % (CH: aliquota IVA; 0 se esente)
  ritenuta?: number; // %, se applicata
  // CH
  esenteIva?: boolean;
  motivoEsenzione?: string;
  periodo?: string; // data o periodo della prestazione (obbligatorio in CH)
  metodo: string;
  iban?: string;
  notePubbliche?: string;
  pagamenti: Pagamento[];
  pdf?: boolean;
};

// Dati di fatturazione del professionista (Profilo → «Dati di fatturazione»).
// Sui siti esistono quasi tutti come colonne di `profiles`, ma non si possono inserire dal Profilo.
export type DatiFatturazione = {
  // IT
  piva?: string;
  cf?: string;
  regime?: 'ordinario' | 'forfettario';
  cassa?: 'TC01' | 'TC04'; // TC01 Cassa Forense, TC04 CNPADC (sui siti questa colonna non c'è)
  // CH
  numeroIva?: string; // CHE-xxx.xxx.xxx IVA
  assoggettatoIva?: boolean;
  // comuni
  via?: string;
  civico?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  paese?: string;
  iban?: string;
};

export type DatiStudio = {
  clienti: Cliente[];
  pratiche: Pratica[];
  appuntamenti: Appuntamento[];
  fatture: Fattura[];
  fatturazione: DatiFatturazione;
};

// ——— date relative a oggi ———
function oggiAlleZero(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function giorno(offset: number, ore = 9, minuti = 0): string {
  const d = oggiAlleZero();
  d.setDate(d.getDate() + offset);
  d.setHours(ore, minuti, 0, 0);
  return d.toISOString();
}
const piu = (iso: string, minuti: number) => new Date(new Date(iso).getTime() + minuti * 60000).toISOString();

// ——— Avvocato, Italia ———
function avvocatoIT(): DatiStudio {
  const udienzaFerrari = giorno(12, 10, 30);
  const udienzaEdilnord = giorno(3, 9, 30);
  return {
    clienti: [
      {
        id: 'c1',
        nome: 'Marco Ferrari',
        indirizzo: 'Via Verdi 14',
        cap: '20121',
        citta: 'Milano',
        provincia: 'MI',
        paese: 'IT',
        cf: 'FRRMRC78C12F205X',
      },
      { id: 'c2', nome: 'Lucia Bianchi', citta: 'Monza', provincia: 'MB', paese: 'IT' },
      {
        id: 'c3',
        nome: 'Edilnord S.r.l.',
        giuridica: true,
        indirizzo: 'Via dei Mille 8',
        cap: '20900',
        citta: 'Monza',
        provincia: 'MB',
        paese: 'IT',
        piva: '04512870967',
        codiceDestinatario: 'M5UXCR1',
      },
      { id: 'c4', nome: 'Giovanni Esposito', citta: 'Milano', provincia: 'MI', paese: 'IT' },
    ],
    pratiche: [
      {
        id: 'p1',
        titolo: 'Ferrari c. Condominio Via Verdi 14',
        clienteId: 'c1',
        tipo: 'Civile',
        stato: 'aperta',
        creata: giorno(-48),
        note: 'Il cliente preferisce essere sentito al telefono dopo le 18.',
        oreDedicate: 12.5,
        controparti: [
          {
            id: 'cp1',
            nome: 'Condominio Via Verdi 14',
            giuridica: true,
            ruolo: 'Convenuto',
            legale: 'Avv. Paolo Neri, foro di Milano',
          },
        ],
        termini: [
          {
            id: 't1',
            titolo: 'Memoria integrativa (art. 171-ter c.p.c.)',
            scadenza: giorno(5),
            evento: 'Udienza di prima comparizione',
            stato: 'in_corso',
          },
          {
            id: 't2',
            titolo: 'Note di trattazione scritta',
            scadenza: giorno(26),
            evento: 'Decreto del giudice',
            stato: 'in_corso',
          },
        ],
        udienze: [
          {
            id: 'u1',
            dataOra: udienzaFerrari,
            tipo: 'Prima comparizione (art. 183 c.p.c.)',
            stato: 'programmata',
            sede: 'Tribunale di Milano · Sez. IV civile · aula 12',
            giudice: 'Dott.ssa Romano',
          },
        ],
        documenti: [
          { id: 'd1', titolo: 'Atto di citazione.pdf', quando: giorno(-40) },
          { id: 'd2', titolo: 'Verbale assemblea 2025.pdf', quando: giorno(-46), archivio: true },
        ],
        ricerche: [
          { id: 'r1', titolo: 'Infiltrazioni dal lastrico solare: chi paga', tipo: 'Chat con Lex' },
          { id: 'r2', titolo: 'Art. 1126 c.c. e giurisprudenza recente', tipo: 'Ricerca AI' },
        ],
      },
      {
        id: 'p2',
        titolo: 'Bianchi: licenziamento per giusta causa',
        clienteId: 'c2',
        tipo: 'Lavoro',
        stato: 'aperta',
        creata: giorno(-9),
        controparti: [{ id: 'cp2', nome: 'Logistica Brianza S.p.A.', giuridica: true, ruolo: 'Resistente' }],
        termini: [
          {
            id: 't3',
            titolo: 'Impugnazione stragiudiziale del licenziamento',
            scadenza: giorno(2),
            evento: 'Comunicazione del licenziamento',
            stato: 'in_corso',
          },
        ],
        udienze: [],
        documenti: [{ id: 'd3', titolo: 'Lettera di licenziamento.pdf', quando: giorno(-9) }],
        ricerche: [],
      },
      {
        id: 'p3',
        titolo: 'Edilnord: recupero crediti',
        clienteId: 'c3',
        tipo: 'Commerciale',
        stato: 'aperta',
        creata: giorno(-75),
        oreDedicate: 6,
        controparti: [{ id: 'cp3', nome: 'Costruzioni Adda S.r.l.', giuridica: true, ruolo: 'Opponente' }],
        termini: [],
        udienze: [
          {
            id: 'u2',
            dataOra: udienzaEdilnord,
            tipo: 'Opposizione a decreto ingiuntivo',
            stato: 'programmata',
            sede: 'Tribunale di Monza · Sez. I civile',
          },
          {
            id: 'u3',
            dataOra: giorno(-30, 11),
            tipo: 'Prima udienza',
            stato: 'rinviata',
            sede: 'Tribunale di Monza · Sez. I civile',
          },
        ],
        documenti: [{ id: 'd4', titolo: 'Decreto ingiuntivo.pdf', quando: giorno(-70) }],
        ricerche: [{ id: 'r3', titolo: 'Provvisoria esecuzione: presupposti', tipo: 'Appunti' }],
      },
      {
        id: 'p4',
        titolo: 'Esposito: separazione consensuale',
        clienteId: 'c4',
        tipo: 'Famiglia',
        stato: 'chiusa',
        esito: 'Transatta',
        creata: giorno(-210),
        controparti: [],
        termini: [],
        udienze: [],
        documenti: [],
        ricerche: [],
      },
    ],
    appuntamenti: [
      {
        id: 'a1',
        titolo: 'Telefonata con Lucia Bianchi',
        tipo: 'telefonico',
        stato: 'programmato',
        inizio: giorno(0, 17, 30),
        fine: giorno(0, 18),
        clienteId: 'c2',
        praticaId: 'p2',
      },
      {
        id: 'a2',
        titolo: 'Incontro con Marco Ferrari',
        tipo: 'presenza',
        stato: 'programmato',
        inizio: giorno(1, 15),
        fine: giorno(1, 16),
        clienteId: 'c1',
        praticaId: 'p1',
        noteCliente: 'Portare i verbali delle ultime due assemblee.',
      },
      {
        id: 'a3',
        titolo: 'Call con Edilnord',
        tipo: 'videocall',
        stato: 'programmato',
        inizio: giorno(1, 11),
        fine: giorno(1, 11, 30),
        clienteId: 'c3',
        praticaId: 'p3',
        link: 'https://meet.example.com/edilnord',
      },
      {
        id: 'a4',
        titolo: 'Udienza: Opposizione a decreto ingiuntivo',
        tipo: 'udienza',
        stato: 'programmato',
        inizio: udienzaEdilnord,
        fine: piu(udienzaEdilnord, 120),
        clienteId: 'c3',
        praticaId: 'p3',
        noteInterne: 'Tribunale di Monza · Sez. I civile',
        origine: 'udienza',
      },
      {
        id: 'a5',
        titolo: 'Udienza: Prima comparizione',
        tipo: 'udienza',
        stato: 'programmato',
        inizio: udienzaFerrari,
        fine: piu(udienzaFerrari, 120),
        clienteId: 'c1',
        praticaId: 'p1',
        noteInterne: 'Tribunale di Milano · Sez. IV civile · aula 12',
        origine: 'udienza',
      },
      {
        id: 'a6',
        titolo: 'SCADENZA: Impugnazione stragiudiziale del licenziamento',
        tipo: 'scadenza',
        stato: 'programmato',
        inizio: giorno(2, 9),
        fine: giorno(2, 9, 30),
        clienteId: 'c2',
        praticaId: 'p2',
        origine: 'termine',
      },
      {
        id: 'a7',
        titolo: 'SCADENZA: Memoria integrativa (art. 171-ter c.p.c.)',
        tipo: 'scadenza',
        stato: 'programmato',
        inizio: giorno(5, 9),
        fine: giorno(5, 9, 30),
        clienteId: 'c1',
        praticaId: 'p1',
        origine: 'termine',
      },
      {
        id: 'a8',
        titolo: 'Primo incontro con Giovanni Esposito',
        tipo: 'presenza',
        stato: 'concluso',
        inizio: giorno(-2, 10),
        fine: giorno(-2, 11),
        clienteId: 'c4',
      },
    ],
    fatture: [
      {
        id: 'f1',
        numero: 'F-2026-008',
        clienteId: 'c3',
        praticaId: 'p3',
        emessa: giorno(-25),
        scadenza: giorno(5),
        stato: 'in_attesa',
        righe: [
          // le righe come le scrive il calcolatore: tribunale, da 5.201 a 26.000 €, valori medi
          {
            id: 'fr1',
            descrizione:
              'Compenso — Fase di studio (Medio) · Tribunale — giudizi ordinari di cognizione, Da 5.201 € a 26.000 €',
            quantita: 1,
            prezzo: 919,
          },
          {
            id: 'fr2',
            descrizione:
              'Compenso — Fase introduttiva (Medio) · Tribunale — giudizi ordinari di cognizione, Da 5.201 € a 26.000 €',
            quantita: 1,
            prezzo: 777,
          },
          {
            id: 'fr3',
            descrizione: 'Spese generali forfettarie 15% (art. 2 DM 55/2014)',
            quantita: 1,
            prezzo: 254.4,
          },
        ],
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
        pagamenti: [],
        pdf: true,
      },
      {
        id: 'f2',
        numero: 'F-2026-007',
        clienteId: 'c1',
        praticaId: 'p1',
        emessa: giorno(-40),
        scadenza: giorno(-10),
        stato: 'pagata',
        righe: [{ id: 'fr4', descrizione: 'Consulenza e parere scritto', quantita: 1, prezzo: 600 }],
        cpa: 4,
        iva: 22,
        metodo: 'Bonifico',
        pagamenti: [{ id: 'pg1', data: giorno(-12), importo: 761.28, metodo: 'Bonifico' }],
        pdf: true,
      },
      {
        id: 'f3',
        numero: 'F-2026-006',
        clienteId: 'c2',
        praticaId: 'p2',
        emessa: giorno(-60),
        scadenza: giorno(-30),
        stato: 'in_attesa',
        righe: [{ id: 'fr5', descrizione: 'Assistenza stragiudiziale', quantita: 2, prezzo: 180 }],
        cpa: 4,
        iva: 22,
        metodo: 'Bonifico',
        pagamenti: [],
      },
    ],
    // Dati già compilati, per mostrare la nuova fattura. Sui siti oggi 0 professionisti su 7 li hanno:
    // commercialista e fiduciario qui sotto mostrano cosa succede quando mancano.
    fatturazione: {
      paese: 'IT',
      cassa: 'TC01',
      regime: 'ordinario',
      piva: '01234567897',
      cf: 'RSSGLI85M41F205Z',
      via: 'Corso di Porta Romana',
      civico: '23',
      cap: '20122',
      citta: 'Milano',
      provincia: 'MI',
      iban: 'IT60X0542811101000000123456',
    },
  };
}

// ——— Avvocato, Svizzera ———
function avvocatoCH(): DatiStudio {
  const conciliazione = giorno(9, 14);
  return {
    clienti: [
      {
        id: 'c1',
        nome: 'Laura Keller',
        indirizzo: 'Via Nassa 12',
        cap: '6900',
        citta: 'Lugano',
        paese: 'CH',
      },
      {
        id: 'c2',
        nome: 'Brunner AG',
        giuridica: true,
        indirizzo: 'Bahnhofstrasse 10',
        cap: '8001',
        citta: 'Zürich',
        paese: 'CH',
        uid: 'CHE-123.456.789',
      },
    ],
    pratiche: [
      {
        id: 'p1',
        titolo: 'Keller: disdetta dell’abitazione',
        clienteId: 'c1',
        tipo: 'Civile',
        stato: 'aperta',
        creata: giorno(-20),
        controparti: [{ id: 'cp1', nome: 'Immobiliare Ceresio SA', giuridica: true, ruolo: 'Convenuto' }],
        termini: [
          {
            id: 't1',
            titolo: 'Contestazione della disdetta',
            scadenza: giorno(8),
            evento: 'Ricevimento della disdetta',
            stato: 'in_corso',
          },
        ],
        udienze: [
          {
            id: 'u1',
            dataOra: conciliazione,
            tipo: 'Udienza di conciliazione',
            stato: 'programmata',
            sede: 'Autorità di conciliazione in materia di locazione, Lugano',
          },
        ],
        documenti: [{ id: 'd1', titolo: 'Disdetta.pdf', quando: giorno(-20) }],
        ricerche: [],
      },
      {
        id: 'p2',
        titolo: 'Brunner AG: esecuzione LEF',
        clienteId: 'c2',
        tipo: 'Commerciale',
        stato: 'aperta',
        creata: giorno(-35),
        controparti: [{ id: 'cp2', nome: 'Muster Bau GmbH', giuridica: true, ruolo: 'Opponente' }],
        termini: [
          {
            id: 't2',
            titolo: 'Domanda di rigetto dell’opposizione',
            scadenza: giorno(15),
            evento: 'Opposizione al precetto esecutivo',
            stato: 'in_corso',
          },
        ],
        udienze: [],
        documenti: [],
        ricerche: [],
      },
    ],
    appuntamenti: [
      {
        id: 'a1',
        titolo: 'Incontro con Laura Keller',
        tipo: 'presenza',
        stato: 'programmato',
        inizio: giorno(1, 10),
        fine: giorno(1, 11),
        clienteId: 'c1',
        praticaId: 'p1',
      },
      {
        id: 'a2',
        titolo: 'Udienza: Udienza di conciliazione',
        tipo: 'udienza',
        stato: 'programmato',
        inizio: conciliazione,
        fine: piu(conciliazione, 90),
        clienteId: 'c1',
        praticaId: 'p1',
        noteInterne: 'Autorità di conciliazione in materia di locazione, Lugano',
        origine: 'udienza',
      },
      {
        id: 'a3',
        titolo: 'SCADENZA: Contestazione della disdetta',
        tipo: 'scadenza',
        stato: 'programmato',
        inizio: giorno(8, 9),
        fine: giorno(8, 9, 30),
        clienteId: 'c1',
        praticaId: 'p1',
        origine: 'termine',
      },
    ],
    fatture: [
      {
        id: 'f1',
        numero: 'F-2026-003',
        clienteId: 'c1',
        praticaId: 'p1',
        emessa: giorno(-6),
        scadenza: giorno(24),
        stato: 'in_attesa',
        righe: [
          { id: 'fr1', descrizione: 'Consulenza e redazione della contestazione', quantita: 3, prezzo: 280 },
        ],
        iva: 8.1,
        periodo: 'Settembre 2026',
        metodo: 'QR-fattura',
        pagamenti: [],
      },
      {
        id: 'f2',
        numero: 'F-2026-002',
        clienteId: 'c2',
        praticaId: 'p2',
        emessa: giorno(-30),
        scadenza: giorno(0),
        stato: 'pagata',
        righe: [{ id: 'fr2', descrizione: 'Precetto esecutivo e corrispondenza', quantita: 1, prezzo: 950 }],
        iva: 8.1,
        periodo: 'Agosto 2026',
        metodo: 'Bonifico',
        pagamenti: [{ id: 'pg1', data: giorno(-3), importo: 1026.95, metodo: 'Bonifico' }],
        pdf: true,
      },
    ],
    fatturazione: {
      paese: 'CH',
      via: 'Via Nassa',
      civico: '5',
      cap: '6900',
      citta: 'Lugano',
      iban: 'CH93 0076 2011 6238 5295 7',
      assoggettatoIva: true,
      numeroIva: 'CHE-216.874.390 IVA',
    },
  };
}

// ——— Commercialista, Italia: per ora calendario e fatture ———
function commercialistaIT(): DatiStudio {
  return {
    clienti: [
      {
        id: 'c1',
        nome: 'Rossi Arredamenti S.r.l.',
        giuridica: true,
        citta: 'Brescia',
        provincia: 'BS',
        paese: 'IT',
      },
      { id: 'c2', nome: 'Anna Conti', citta: 'Bergamo', provincia: 'BG', paese: 'IT' },
    ],
    pratiche: [],
    appuntamenti: [
      {
        id: 'a1',
        titolo: 'SCADENZA: F24 IVA mensile · Rossi Arredamenti',
        tipo: 'scadenza',
        stato: 'programmato',
        inizio: giorno(4, 9),
        fine: giorno(4, 9, 30),
        clienteId: 'c1',
        origine: 'mandato',
      },
      {
        id: 'a2',
        titolo: 'Incontro con Anna Conti: modello 730',
        tipo: 'presenza',
        stato: 'programmato',
        inizio: giorno(2, 16),
        fine: giorno(2, 17),
        clienteId: 'c2',
      },
    ],
    fatture: [
      {
        id: 'f1',
        numero: 'F-2026-012',
        clienteId: 'c1',
        emessa: giorno(-15),
        scadenza: giorno(15),
        stato: 'in_attesa',
        righe: [
          { id: 'fr1', descrizione: 'Tenuta della contabilità: terzo trimestre', quantita: 1, prezzo: 900 },
        ],
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
        pagamenti: [],
      },
    ],
    fatturazione: { paese: 'IT', cassa: 'TC04', regime: 'ordinario' },
  };
}

// ——— Fiduciario, Svizzera: per ora calendario e fatture ———
function fiduciarioCH(): DatiStudio {
  return {
    clienti: [
      {
        id: 'c1',
        nome: 'Famiglia Müller',
        indirizzo: 'Via Cantonale 3',
        cap: '6500',
        citta: 'Bellinzona',
        paese: 'CH',
      },
      {
        id: 'c2',
        nome: 'Tessin Immobili SA',
        giuridica: true,
        indirizzo: 'Riva Paradiso 2',
        cap: '6900',
        citta: 'Lugano',
        paese: 'CH',
      },
    ],
    pratiche: [],
    appuntamenti: [
      {
        id: 'a1',
        titolo: 'SCADENZA: Dichiarazione d’imposta · Famiglia Müller',
        tipo: 'scadenza',
        stato: 'programmato',
        inizio: giorno(6, 9),
        fine: giorno(6, 9, 30),
        clienteId: 'c1',
        origine: 'mandato',
      },
      {
        id: 'a2',
        titolo: 'Chiusura contabile con Tessin Immobili',
        tipo: 'videocall',
        stato: 'programmato',
        inizio: giorno(3, 14),
        fine: giorno(3, 15),
        clienteId: 'c2',
        link: 'https://meet.example.com/tessin',
      },
    ],
    fatture: [],
    fatturazione: { paese: 'CH' },
  };
}

// Chiave: paese e ruolo dell'account (per esempio «IT-avvocato»).
export function studioFinto(paese: string, ruolo: string): DatiStudio {
  const chiave = `${paese}-${ruolo}`;
  if (chiave === 'IT-avvocato') return avvocatoIT();
  if (chiave === 'CH-avvocato') return avvocatoCH();
  if (chiave === 'IT-commercialista') return commercialistaIT();
  if (chiave === 'CH-fiduciario') return fiduciarioCH();
  return { clienti: [], pratiche: [], appuntamenti: [], fatture: [], fatturazione: { paese } };
}
