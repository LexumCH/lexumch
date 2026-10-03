// DATI FINTI della tappa 1: i documenti dell'Archivio, per paese.
// Dalla tappa 6 arrivano dall'archivio vero (process-archivio, search-archivio).

export type StatoDocumento = 'Indicizzato' | 'In coda';
export type DocumentoArchivio = {
  id: string;
  titolo: string;
  categoria: string | null;
  data: string;
  dimensione: string;
  tipo: string;
  stato: StatoDocumento;
  scansione?: boolean;
};

export const categorieFinte: Record<string, string[]> = {
  IT: ['Casa', 'Fisco'],
  CH: ['Lavoro', 'Affitto'],
};

export const documentiArchivioFinti: Record<string, DocumentoArchivio[]> = {
  IT: [
    {
      id: 'd1',
      titolo: 'Contratto di locazione',
      categoria: 'Casa',
      data: '12 set',
      dimensione: '1,2 MB',
      tipo: 'Contratto',
      stato: 'Indicizzato',
    },
    {
      id: 'd2',
      titolo: 'Lettera del Comune',
      categoria: 'Casa',
      data: '2 ott',
      dimensione: '640 KB',
      tipo: 'Lettera',
      stato: 'Indicizzato',
    },
    {
      id: 'd3',
      titolo: 'Verbale di contestazione',
      categoria: null,
      data: 'oggi',
      dimensione: '2,1 MB',
      tipo: 'Verbale',
      stato: 'In coda',
      scansione: true,
    },
    {
      id: 'd4',
      titolo: 'Ricevuta badante marzo',
      categoria: 'Fisco',
      data: '5 apr',
      dimensione: '210 KB',
      tipo: 'Ricevuta',
      stato: 'Indicizzato',
    },
  ],
  CH: [
    {
      id: 'd1',
      titolo: 'Contratto di lavoro',
      categoria: 'Lavoro',
      data: '3 mar',
      dimensione: '820 KB',
      tipo: 'Contratto',
      stato: 'Indicizzato',
    },
    {
      id: 'd2',
      titolo: 'Lettera di disdetta',
      categoria: 'Lavoro',
      data: 'oggi',
      dimensione: '1,4 MB',
      tipo: 'Lettera',
      stato: 'In coda',
      scansione: true,
    },
  ],
};
