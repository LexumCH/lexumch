// DATI FINTI della tappa 1: un conto per paese, separati come nella realtà.
// Crediti, piano e archivio non passano mai da un paese all'altro.

export type Conto = {
  piano: string;
  scadenzaPiano: string | null; // «12.11.2026»
  crediti: number;
  creditiBenvenuto: number;
  creditiAcquistati: number;
  archivioUsatoMB: number;
  archivioTotaleMB: number;
  documentiArchivio: number;
  // Prova gratuita usata e finita, senza un piano (sul sito: prova_gratuita_usata, abbonamento_scadenza
  // passata e piano_id vuoto): la Dashboard dei professionisti lo dice.
  provaScaduta?: boolean;
};

export const contiFinti: Record<string, Conto> = {
  IT: {
    piano: 'Account base',
    scadenzaPiano: null,
    crediti: 1,
    creditiBenvenuto: 1,
    creditiAcquistati: 0,
    archivioUsatoMB: 12.4,
    archivioTotaleMB: 50,
    documentiArchivio: 4,
  },
  CH: {
    piano: 'Piano Personale',
    scadenzaPiano: '12.11.2026',
    crediti: 28,
    creditiBenvenuto: 0,
    creditiAcquistati: 0,
    archivioUsatoMB: 340,
    archivioTotaleMB: 2048,
    documentiArchivio: 2,
  },
};

// Pacchetto Lampo: sul sito prezzo e numero di ricerche arrivano dal listino (codice «lampo»).
// Qui sono FINTI: quello svizzero in particolare è inventato.
export const pacchettoLampoFinto: Record<string, { ricerche: number; prezzo: string }> = {
  IT: { ricerche: 5, prezzo: '3,99 €' },
  CH: { ricerche: 5, prezzo: 'CHF 4.00' },
};

// «12,4 MB», «340 MB», «2 GB»
export function formatoMB(mb: number): string {
  if (mb >= 1024) {
    const gb = Math.round((mb / 1024) * 10) / 10;
    return `${gb.toString().replace('.', ',')} GB`;
  }
  return `${mb.toString().replace('.', ',')} MB`;
}
