// DATI FINTI dell'area Studio dei professionisti: clienti, pratiche, appuntamenti, fatture.
// Ricalcano tabelle e campi dei siti (vedi docs/professionisti/). Dalla tappa «Studio» arrivano
// dalle tabelle vere: pratiche, controparti, termini_processuali, udienze, appuntamenti, fatture.
// Le date sono relative a oggi, così l'anteprima resta sempre attuale.

// Il cliente di uno studio: sui siti è un account (`profiles` con role='cliente' e avvocato_id).
// Italia e Svizzera hanno campi diversi: IT codice fiscale, partita IVA, PEC, provincia;
// CH numero AVS, UID, forma giuridica, IVA sì/no, Cantone (vedi docs/professionisti/clienti-e-documenti.md).
export type Rappresentante = {
  nome?: string;
  cognome?: string;
  codice?: string; // IT codice fiscale, CH numero AVS
  carica?: string;
};

export type Cliente = {
  id: string;
  nome: string; // come si mostra: «Nome Cognome», oppure la ragione sociale
  giuridica?: boolean;
  // persona fisica
  nomeProprio?: string;
  cognome?: string;
  dataNascita?: string; // AAAA-MM-GG
  luogoNascita?: string;
  cf?: string; // IT
  avs?: string; // CH, 756.xxxx.xxxx.xx
  // persona giuridica
  piva?: string; // IT (anche per le persone fisiche, dal 04-10-2026)
  uid?: string; // CH, CHE-xxx.xxx.xxx
  formaGiuridica?: string; // CH
  ivaAttiva?: boolean; // CH
  sedeLegale?: string;
  rappresentante?: Rappresentante;
  // contatti
  email?: string;
  telefono?: string;
  pec?: string; // IT
  // indirizzo (anche per le fatture)
  indirizzo?: string; // la via
  numeroCivico?: string;
  cap?: string;
  citta?: string;
  provincia?: string; // IT
  cantone?: string; // CH
  paese?: string;
  codiceDestinatario?: string; // IT, codice destinatario SDI (6 o 7 caratteri)
  pecFatturazione?: string; // IT, PEC per le fatture elettroniche
  // studio
  portale?: boolean; // accesso al portale clienti attivo
  creato?: string; // ISO
  noteIniziali?: string;
};

// Note interne sul cliente (`note_interne`): le vede solo lo studio, Lex non le legge.
export type NotaCliente = {
  id: string;
  clienteId: string;
  testo: string;
  quando: string;
  modificata?: string;
};

// Comunicazioni con il cliente: ticket (`ticket_assistenza`) e messaggi (`messaggi_ticket`).
export type MessaggioTicket = { id: string; da: 'studio' | 'cliente'; testo: string; quando: string };
export type Ticket = {
  id: string;
  clienteId: string;
  oggetto: string;
  stato: 'aperto' | 'chiuso';
  creato: string;
  messaggi: MessaggioTicket[];
};

// Documenti condivisi nel portale del cliente (tabella `documenti`, bucket `documenti`):
// sono separati dall'archivio dello studio.
export type DocumentoPortale = {
  id: string;
  clienteId: string;
  nome: string;
  dimensione: string;
  quando: string;
  da: 'studio' | 'cliente';
};

// Archivio dello studio (`archivio_documenti`, `categorie_archivio`, `sottocategorie_archivio`).
// Un documento può essere collegato a un cliente e a una pratica.
export type Sottocategoria = { id: string; nome: string };
export type CategoriaStudio = { id: string; nome: string; sottocategorie: Sottocategoria[] };
export type DocumentoStudio = {
  id: string;
  titolo: string;
  quando: string; // ISO
  dimensione: string;
  formato: string; // PDF, DOCX, JPG…
  stato: 'Indicizzato' | 'In coda';
  categoriaId?: string;
  sottocategoriaId?: string;
  clienteId?: string;
  praticaId?: string;
  scansione?: boolean;
  origine?: 'atto' | 'fattura'; // atto preparato da Lex, PDF di una fattura
  fatturaId?: string;
  soloPratica?: boolean; // in CH gli atti di Lex vanno nei documenti della pratica, non in archivio
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

export type RicercaPratica = { id: string; titolo: string; tipo: 'Chat con Lex' | 'Ricerca AI' | 'Appunti' };

export type Pratica = {
  id: string;
  titolo: string;
  clienteId: string;
  tipo: TipoCausa;
  stato: 'aperta' | 'chiusa';
  esito?: Esito;
  creata: string; // ISO
  chiusa?: string; // ISO, quando è stata chiusa (sul sito `updated_at` della pratica chiusa)
  note?: string; // note interne: Lex non le legge
  oreDedicate?: number; // solo IT
  controparti: Controparte[];
  termini: Termine[];
  udienze: Udienza[];
  ricerche: RicercaPratica[]; // i documenti stanno nell'archivio dello studio, con praticaId
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

// Una riga con natura (N1, spesa anticipata per conto del cliente, art. 15 DPR 633/72) resta fuori
// da cassa, IVA e ritenuta (solo IT).
export type RigaFattura = {
  id: string;
  descrizione: string;
  quantita: number;
  prezzo: number;
  natura?: 'N1';
};
// «emessa» è lo stato delle note di credito (IT), che non si pagano.
export type StatoFattura = 'in_attesa' | 'pagata' | 'annullata' | 'emessa';
export type Pagamento = { id: string; data: string; importo: number; metodo: string };

// Regime fiscale (IT): RF01 ordinario, RF19 forfettario (niente IVA, natura N2.2, niente ritenuta).
export type RegimeIT = 'RF01' | 'RF19';
// Cassa di previdenza (IT), colonna `cassa_previdenza` con questi valori.
export type CassaIT = 'cassa_forense' | 'cnpadc' | 'cnpr' | 'nessuna';

export type Fattura = {
  id: string;
  numero: string; // F-AAAA-NNN (anche le note di credito, stessa numerazione)
  clienteId: string;
  praticaId?: string;
  emessa: string; // ISO
  scadenza?: string; // ISO
  stato: StatoFattura;
  righe: RigaFattura[];
  // IT
  tipo?: 'TD01' | 'TD04'; // TD04: nota di credito
  origineId?: string; // la fattura stornata da questa nota di credito
  regime?: RegimeIT; // quello di chi emette, al momento della fattura
  cassa?: CassaIT;
  cpa?: number; // % della cassa
  iva: number; // % (CH: aliquota IVA; 0 se esente)
  ritenuta?: number; // %, se applicata
  natura?: string; // natura IVA con IVA 0 (N2.2 nel forfettario, scelta nell'ordinario)
  riferimentoNormativo?: string;
  bollo?: boolean; // imposta di bollo 2 €
  bolloACaricoCliente?: boolean; // di base sì
  // CH
  esenteIva?: boolean;
  motivoEsenzione?: string; // testo libero, oppure 'non_assoggettato' (lo impone il database)
  periodo?: string; // data o periodo della prestazione (obbligatorio in CH)
  lingua?: 'it' | 'de' | 'fr'; // lingua della fattura (CH)
  metodo: string;
  iban?: string;
  notePubbliche?: string;
  pagamenti: Pagamento[];
  pdf?: boolean; // PDF generato: la fattura è emessa
};

// Dati di fatturazione del professionista: dal 04-10-2026 sui siti si scrivono nel Profilo
// («Dati di fatturazione»), colonne di `profiles`.
export type DatiFatturazione = {
  // IT
  piva?: string;
  cf?: string;
  regime?: RegimeIT; // regime_fiscale, di base RF01
  cassa?: CassaIT; // cassa_previdenza: di base cnpadc per i commercialisti, cassa_forense per gli altri
  codiceDestinatario?: string; // codice_destinatario_sdi (7 caratteri)
  // CH
  numeroIva?: string; // numero IDI (`uid`): CHE-123.456.789, obbligatorio se assoggettato
  assoggettatoIva?: boolean; // iva_attiva, di base no: senza, le fatture escono senza IVA
  qrIban?: string; // qr_iban, facoltativo
  cantone?: string;
  // comuni
  via?: string;
  civico?: string;
  cap?: string;
  citta?: string; // IT comune, CH località
  provincia?: string;
  paese?: string;
  iban?: string;
};

// Mandati e scadenze di commercialisti (IT) e fiduciari (CH): nell'app per ora si vedono solo nella
// Dashboard; si gestiscono sul sito («Banco di lavoro»). Tabelle `mandati`, IT `scadenze_mandato`
// (stato 'aperta'), CH `scadenze_fiduciarie` (stato 'in_corso').
export type Mandato = {
  id: string;
  clienteId: string;
  titolo: string;
  stato: 'attivo' | 'sospeso' | 'chiuso';
};
export type TipoScadenzaIT = 'iva' | 'lipe' | 'dichiarativo' | 'acconto' | 'imu';
export type ScadenzaMandato = {
  id: string;
  titolo: string;
  tipo?: string; // IT uno di TipoScadenzaIT; CH testo libero
  scadenza: string; // ISO
  clienteId: string;
  mandatoId?: string;
  aperta: boolean;
};
// Conto economico di un cliente del fiduciario (CH), anno in corso: dai suoi movimenti (`movimenti`,
// solo effettivi) e dagli stipendi dei dipendenti e soci attivi (`clienti_dipendenti`, annualizzati).
// Ogni cliente è a sé: non si somma mai.
export type ContoCliente = { clienteId: string; entrate: number; costi: number; stipendi: number };

export type DatiStudio = {
  clienti: Cliente[];
  pratiche: Pratica[];
  appuntamenti: Appuntamento[];
  fatture: Fattura[];
  fatturazione: DatiFatturazione;
  note: NotaCliente[];
  comunicazioni: Ticket[];
  portale: DocumentoPortale[];
  categorie: CategoriaStudio[];
  documenti: DocumentoStudio[];
  limiteClienti?: number; // clienti del piano più quelli comprati in aggiunta
  mandati?: Mandato[];
  scadenze?: ScadenzaMandato[];
  contiClienti?: ContoCliente[];
};

// Le parti dello studio che non tutti i ruoli hanno ancora nell'app.
const senzaDocumenti = { note: [], comunicazioni: [], portale: [], categorie: [], documenti: [] };

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
        nomeProprio: 'Marco',
        cognome: 'Ferrari',
        dataNascita: '1978-03-12',
        luogoNascita: 'Milano',
        cf: 'FRRMRC78C12F205X',
        email: 'marco.ferrari@example.com',
        telefono: '+39 333 123 4567',
        indirizzo: 'Via Verdi 14',
        cap: '20121',
        citta: 'Milano',
        provincia: 'MI',
        paese: 'IT',
        portale: true,
        creato: giorno(-60),
        noteIniziali: 'Infiltrazioni dal lastrico solare condominiale, danni in cucina e in bagno.',
      },
      {
        id: 'c2',
        nome: 'Lucia Bianchi',
        nomeProprio: 'Lucia',
        cognome: 'Bianchi',
        email: 'lucia.bianchi@example.com',
        telefono: '+39 347 765 4321',
        citta: 'Monza',
        provincia: 'MB',
        paese: 'IT',
        creato: giorno(-10),
      },
      {
        id: 'c3',
        nome: 'Edilnord S.r.l.',
        giuridica: true,
        piva: '04512870967',
        sedeLegale: 'Via dei Mille 8, Monza',
        rappresentante: { nome: 'Paolo', cognome: 'Galli', carica: 'Amministratore unico' },
        email: 'amministrazione@edilnord.example',
        pec: 'edilnord@pec.example',
        telefono: '+39 039 123 456',
        indirizzo: 'Via dei Mille 8',
        cap: '20900',
        citta: 'Monza',
        provincia: 'MB',
        paese: 'IT',
        codiceDestinatario: 'M5UXCR1',
        portale: true,
        creato: giorno(-80),
      },
      {
        id: 'c4',
        nome: 'Giovanni Esposito',
        nomeProprio: 'Giovanni',
        cognome: 'Esposito',
        email: 'g.esposito@example.com',
        citta: 'Milano',
        provincia: 'MI',
        paese: 'IT',
        creato: giorno(-215),
      },
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
        chiusa: giorno(-1, 18),
        controparti: [],
        termini: [],
        udienze: [],
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
    // Archivio dello studio, portale, note e messaggi: come le tabelle dei siti.
    limiteClienti: 25,
    categorie: [
      {
        id: 'k1',
        nome: 'Atti e ricorsi',
        sottocategorie: [
          { id: 's1', nome: 'Atti introduttivi' },
          { id: 's2', nome: 'Memorie' },
        ],
      },
      { id: 'k2', nome: 'Corrispondenza', sottocategorie: [] },
      { id: 'k3', nome: 'Fatture', sottocategorie: [] },
    ],
    documenti: [
      {
        id: 'd1',
        titolo: 'Atto di citazione',
        quando: giorno(-40),
        dimensione: '420 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k1',
        sottocategoriaId: 's1',
        clienteId: 'c1',
        praticaId: 'p1',
      },
      {
        id: 'd2',
        titolo: 'Verbale assemblea 2025',
        quando: giorno(-46),
        dimensione: '1,1 MB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k2',
        clienteId: 'c1',
        praticaId: 'p1',
      },
      {
        id: 'd3',
        titolo: 'Lettera di licenziamento',
        quando: giorno(-9),
        dimensione: '180 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        clienteId: 'c2',
        praticaId: 'p2',
      },
      {
        id: 'd4',
        titolo: 'Decreto ingiuntivo',
        quando: giorno(-70),
        dimensione: '640 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k1',
        sottocategoriaId: 's1',
        clienteId: 'c3',
        praticaId: 'p3',
      },
      {
        id: 'd5',
        titolo: 'Visura camerale Edilnord',
        quando: giorno(-78),
        dimensione: '310 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        clienteId: 'c3',
      },
      {
        id: 'd6',
        titolo: 'Fattura F-2026-008',
        quando: giorno(-25),
        dimensione: '95 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k3',
        clienteId: 'c3',
        praticaId: 'p3',
        origine: 'fattura',
        fatturaId: 'f1',
      },
      {
        id: 'd7',
        titolo: 'Modello di procura alle liti',
        quando: giorno(-120),
        dimensione: '48 KB',
        formato: 'DOCX',
        stato: 'Indicizzato',
        categoriaId: 'k1',
      },
      {
        id: 'd8',
        titolo: 'Ricevuta della raccomandata',
        quando: giorno(0, 9, 40),
        dimensione: '760 KB',
        formato: 'PDF',
        stato: 'In coda',
        clienteId: 'c2',
        scansione: true,
      },
    ],
    portale: [
      {
        id: 'pp1',
        clienteId: 'c1',
        nome: 'Preventivo firmato.pdf',
        dimensione: '220 KB',
        quando: giorno(-55),
        da: 'studio',
      },
      {
        id: 'pp2',
        clienteId: 'c1',
        nome: 'Foto delle infiltrazioni.pdf',
        dimensione: '3,4 MB',
        quando: giorno(-50),
        da: 'cliente',
      },
      {
        id: 'pp3',
        clienteId: 'c3',
        nome: 'Mandato professionale.pdf',
        dimensione: '150 KB',
        quando: giorno(-79),
        da: 'studio',
      },
    ],
    note: [
      {
        id: 'n1',
        clienteId: 'c1',
        testo: 'Preferisce essere sentito al telefono dopo le 18.',
        quando: giorno(-47, 18, 20),
      },
      {
        id: 'n2',
        clienteId: 'c3',
        testo: 'Referente operativo: geom. Galli. Di solito paga a 60 giorni.',
        quando: giorno(-60, 11),
      },
    ],
    comunicazioni: [
      {
        id: 'tk1',
        clienteId: 'c1',
        oggetto: 'Verbali delle assemblee',
        stato: 'aperto',
        creato: giorno(-3, 10),
        messaggi: [
          {
            id: 'm1',
            da: 'studio',
            testo: 'Buongiorno, mi servono i verbali delle ultime due assemblee condominiali.',
            quando: giorno(-3, 10),
          },
          {
            id: 'm2',
            da: 'cliente',
            testo: 'Li cerco e li carico nel portale entro venerdì.',
            quando: giorno(-2, 18, 30),
          },
        ],
      },
      {
        id: 'tk2',
        clienteId: 'c3',
        oggetto: 'Documenti per il ricorso',
        stato: 'chiuso',
        creato: giorno(-74, 9),
        messaggi: [
          {
            id: 'm3',
            da: 'studio',
            testo: 'Per il ricorso servono le fatture non pagate e i DDT firmati.',
            quando: giorno(-74, 9),
          },
          {
            id: 'm4',
            da: 'cliente',
            testo: 'Caricati nel portale. Grazie.',
            quando: giorno(-73, 16),
          },
        ],
      },
    ],
    // Dati già compilati, per mostrare la nuova fattura. Sui siti oggi 0 professionisti su 7 li hanno:
    // commercialista e fiduciario qui sotto mostrano cosa succede quando mancano.
    fatturazione: {
      paese: 'IT',
      cassa: 'cassa_forense',
      regime: 'RF01',
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
        nomeProprio: 'Laura',
        cognome: 'Keller',
        dataNascita: '1985-06-02',
        luogoNascita: 'Lugano',
        avs: '756.1234.5678.97',
        email: 'laura.keller@example.ch',
        telefono: '+41 79 123 45 67',
        indirizzo: 'Via Nassa 12',
        cap: '6900',
        citta: 'Lugano',
        cantone: 'TI',
        paese: 'CH',
        portale: true,
        creato: giorno(-25),
        noteIniziali: 'Disdetta ricevuta per raccomandata, contesta il motivo.',
      },
      {
        id: 'c2',
        nome: 'Brunner AG',
        giuridica: true,
        uid: 'CHE-123.456.788',
        formaGiuridica: 'SA',
        ivaAttiva: true,
        sedeLegale: 'Bahnhofstrasse 10, Zürich',
        rappresentante: { nome: 'Thomas', cognome: 'Brunner', carica: 'Presidente del CdA' },
        email: 'info@brunner.example.ch',
        telefono: '+41 44 123 45 67',
        indirizzo: 'Bahnhofstrasse 10',
        cap: '8001',
        citta: 'Zürich',
        cantone: 'ZH',
        paese: 'CH',
        creato: giorno(-40),
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
    limiteClienti: 25,
    categorie: [
      { id: 'k1', nome: 'Atti', sottocategorie: [{ id: 's1', nome: 'Allegati' }] },
      { id: 'k2', nome: 'Corrispondenza', sottocategorie: [] },
    ],
    documenti: [
      {
        id: 'd1',
        titolo: 'Disdetta',
        quando: giorno(-20),
        dimensione: '240 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k2',
        clienteId: 'c1',
        praticaId: 'p1',
      },
      {
        id: 'd2',
        titolo: 'Contratto di locazione',
        quando: giorno(-24),
        dimensione: '1,3 MB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k1',
        sottocategoriaId: 's1',
        clienteId: 'c1',
        praticaId: 'p1',
      },
      {
        id: 'd3',
        titolo: 'Precetto esecutivo',
        quando: giorno(-34),
        dimensione: '310 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        categoriaId: 'k1',
        clienteId: 'c2',
        praticaId: 'p2',
      },
      {
        id: 'd4',
        titolo: 'Estratto del registro di commercio',
        quando: giorno(-39),
        dimensione: '120 KB',
        formato: 'PDF',
        stato: 'Indicizzato',
        clienteId: 'c2',
      },
    ],
    portale: [
      {
        id: 'pp1',
        clienteId: 'c1',
        nome: 'Procura.pdf',
        dimensione: '90 KB',
        quando: giorno(-22),
        da: 'studio',
      },
    ],
    note: [
      {
        id: 'n1',
        clienteId: 'c1',
        testo: 'Vuole evitare la causa se il locatore offre una proroga.',
        quando: giorno(-19, 17),
      },
    ],
    comunicazioni: [
      {
        id: 'tk1',
        clienteId: 'c1',
        oggetto: 'Contratto di locazione firmato',
        stato: 'aperto',
        creato: giorno(-1, 9),
        messaggi: [
          {
            id: 'm1',
            da: 'studio',
            testo: 'Buongiorno, può caricare nel portale il contratto con tutte le pagine firmate?',
            quando: giorno(-1, 9),
          },
        ],
      },
    ],
    fatturazione: {
      paese: 'CH',
      via: 'Via Nassa',
      civico: '5',
      cap: '6900',
      citta: 'Lugano',
      iban: 'CH93 0076 2011 6238 5295 7',
      cantone: 'TI',
      assoggettatoIva: true,
      numeroIva: 'CHE-216.874.394',
    },
  };
}

// ——— Commercialista, Italia: calendario e fatture; mandati e scadenze solo nella Dashboard ———
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
      {
        id: 'f2',
        numero: 'F-2026-011',
        clienteId: 'c2',
        emessa: giorno(-50),
        scadenza: giorno(-20),
        stato: 'in_attesa',
        righe: [{ id: 'fr2', descrizione: 'Modello 730 e consulenza', quantita: 1, prezzo: 250 }],
        cpa: 4,
        iva: 22,
        metodo: 'Bonifico',
        pagamenti: [],
      },
      {
        id: 'f3',
        numero: 'F-2026-009',
        clienteId: 'c1',
        emessa: giorno(-80),
        scadenza: giorno(-50),
        stato: 'pagata',
        righe: [
          { id: 'fr3', descrizione: 'Tenuta della contabilità: secondo trimestre', quantita: 1, prezzo: 900 },
        ],
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
        pagamenti: [{ id: 'pg1', data: giorno(-55), importo: 961.92, metodo: 'Bonifico' }],
      },
    ],
    fatturazione: { paese: 'IT', cassa: 'cnpadc', regime: 'RF01' },
    mandati: [
      { id: 'm1', clienteId: 'c1', titolo: 'Contabilità e dichiarativi 2026', stato: 'attivo' },
      { id: 'm2', clienteId: 'c2', titolo: 'Dichiarazione dei redditi 2026', stato: 'attivo' },
      { id: 'm3', clienteId: 'c2', titolo: 'Successione Conti', stato: 'chiuso' },
    ],
    scadenze: [
      {
        id: 'sc1',
        titolo: 'Saldo e acconto imposte: rata di settembre',
        tipo: 'acconto',
        scadenza: giorno(-2),
        clienteId: 'c1',
        mandatoId: 'm1',
        aperta: true,
      },
      {
        id: 'sc2',
        titolo: 'F24 IVA mensile',
        tipo: 'iva',
        scadenza: giorno(4),
        clienteId: 'c1',
        mandatoId: 'm1',
        aperta: true,
      },
      {
        id: 'sc3',
        titolo: 'Dichiarazione redditi (Modello Redditi)',
        tipo: 'dichiarativo',
        scadenza: giorno(12),
        clienteId: 'c2',
        mandatoId: 'm2',
        aperta: true,
      },
      {
        id: 'sc4',
        titolo: 'LIPE 3° trimestre',
        tipo: 'lipe',
        scadenza: giorno(40),
        clienteId: 'c1',
        mandatoId: 'm1',
        aperta: true,
      },
      {
        id: 'sc5',
        titolo: 'IMU: acconto',
        tipo: 'imu',
        scadenza: giorno(-110),
        clienteId: 'c2',
        mandatoId: 'm2',
        aperta: false,
      },
    ],
    ...senzaDocumenti,
  };
}

// ——— Fiduciario, Svizzera: calendario e fatture; mandati, scadenze e conti dei clienti solo nella Dashboard ———
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
    mandati: [
      { id: 'm1', clienteId: 'c1', titolo: 'Dichiarazione e consulenza fiscale', stato: 'attivo' },
      { id: 'm2', clienteId: 'c2', titolo: 'Contabilità, IVA e salari', stato: 'attivo' },
    ],
    scadenze: [
      {
        id: 'sc1',
        titolo: 'Conteggio AVS del 3° trimestre',
        tipo: 'AVS',
        scadenza: giorno(-3),
        clienteId: 'c2',
        mandatoId: 'm2',
        aperta: true,
      },
      {
        id: 'sc2',
        titolo: 'Dichiarazione d’imposta 2025',
        tipo: 'Imposte',
        scadenza: giorno(6),
        clienteId: 'c1',
        mandatoId: 'm1',
        aperta: true,
      },
      {
        id: 'sc3',
        titolo: 'Rendiconto IVA del 3° trimestre',
        tipo: 'IVA',
        scadenza: giorno(27),
        clienteId: 'c2',
        mandatoId: 'm2',
        aperta: true,
      },
    ],
    contiClienti: [
      { clienteId: 'c1', entrate: 124000, costi: 88400, stipendi: 0 },
      { clienteId: 'c2', entrate: 412500, costi: 268300, stipendi: 168000 },
    ],
    ...senzaDocumenti,
  };
}

// Chiave: paese e ruolo dell'account (per esempio «IT-avvocato»).
export function studioFinto(paese: string, ruolo: string): DatiStudio {
  const chiave = `${paese}-${ruolo}`;
  if (chiave === 'IT-avvocato') return avvocatoIT();
  if (chiave === 'CH-avvocato') return avvocatoCH();
  if (chiave === 'IT-commercialista') return commercialistaIT();
  if (chiave === 'CH-fiduciario') return fiduciarioCH();
  return {
    clienti: [],
    pratiche: [],
    appuntamenti: [],
    fatture: [],
    fatturazione: { paese },
    ...senzaDocumenti,
  };
}
