import type { Parziale } from '../tipi';

// Sezione «archivio»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).
// Archivio (D2) e il foglio di «Condividi in Lexum». Dove c'era già, il testo tedesco e francese
// viene da lexum.ch (avv_archivio.json).

const it = {
  titolo: 'Archivio',
  categorie: 'Categorie',
  conteggio: '{n} documenti · {indicizzati} indicizzati',
  spazio: '{usato} di {totale}',
  cerca: 'Cerca tra i tuoi documenti',
  cercaSegnaposto: 'Cerca tra i tuoi documenti…',
  tutte: 'Tutte',
  senzaCategoria: 'Senza categoria',
  nuovaCategoria: '+ Categoria',
  scansione: 'scansione',
  // Lo stato di ogni documento (la chiave è lo stato dei dati).
  stati: { Indicizzato: 'Indicizzato', 'In coda': 'In coda' },
  vuotoTitolo: "L'archivio è vuoto",
  vuotoTesto: 'Carica o scansiona un documento: Lex lo legge quando gli fai una domanda.',
  nessunoTitolo: 'Nessun documento qui',
  nessunoTesto: "Prova un'altra categoria o altre parole.",
  scansiona: 'Scansiona',
  carica: 'Carica',
  condiviso: {
    sopratitolo: 'Condividi in Lexum',
    titolo: "Un documento da un'altra app",
    nome: 'Nome nel tuo archivio',
    categoria: 'Categoria',
    salva: 'Salva in Archivio',
    nota: 'Lex lo legge e lo usa quando gli fai una domanda.',
  },
};

const de: Parziale<typeof it> = {
  titolo: 'Archiv',
  categorie: 'Kategorien',
  conteggio: '{n} Dokumente · {indicizzati} indexiert',
  spazio: '{usato} von {totale}',
  cerca: 'In Ihren Dokumenten suchen',
  cercaSegnaposto: 'In Ihren Dokumenten suchen…',
  tutte: 'Alle',
  senzaCategoria: 'Ohne Kategorie',
  nuovaCategoria: '+ Kategorie',
  scansione: 'gescannt',
  stati: { Indicizzato: 'Indexiert', 'In coda': 'In Warteschlange' },
  vuotoTitolo: 'Das Archiv ist leer',
  vuotoTesto:
    'Laden Sie ein Dokument hoch oder scannen Sie es: Lex liest es, wenn Sie ihm eine Frage stellen.',
  nessunoTitolo: 'Hier ist kein Dokument',
  nessunoTesto: 'Versuchen Sie eine andere Kategorie oder andere Wörter.',
  scansiona: 'Scannen',
  carica: 'Hochladen',
  condiviso: {
    sopratitolo: 'In Lexum teilen',
    titolo: 'Ein Dokument aus einer anderen App',
    nome: 'Name in Ihrem Archiv',
    categoria: 'Kategorie',
    salva: 'Im Archiv speichern',
    nota: 'Lex liest es und nutzt es, wenn Sie ihm eine Frage stellen.',
  },
};

const fr: Parziale<typeof it> = {
  titolo: 'Archives',
  categorie: 'Catégories',
  conteggio: '{n} documents · {indicizzati} indexés',
  spazio: '{usato} sur {totale}',
  cerca: 'Chercher dans vos documents',
  cercaSegnaposto: 'Chercher dans vos documents…',
  tutte: 'Toutes',
  senzaCategoria: 'Sans catégorie',
  nuovaCategoria: '+ Catégorie',
  scansione: 'numérisé',
  stati: { Indicizzato: 'Indexé', 'In coda': "En file d'attente" },
  vuotoTitolo: 'Vos archives sont vides',
  vuotoTesto: 'Importez ou numérisez un document : Lex le lit quand vous lui posez une question.',
  nessunoTitolo: 'Aucun document ici',
  nessunoTesto: "Essayez une autre catégorie ou d'autres mots.",
  scansiona: 'Numériser',
  carica: 'Importer',
  condiviso: {
    sopratitolo: 'Partager dans Lexum',
    titolo: "Un document d'une autre app",
    nome: 'Nom dans vos archives',
    categoria: 'Catégorie',
    salva: 'Enregistrer dans les Archives',
    nota: "Lex le lit et l'utilise quand vous lui posez une question.",
  },
};

export const archivio = { it, de, fr };
