import dati from '../../docs/paesi.json';

// Registro dei paesi, costruito da docs/paesi.json.
// Per aggiungere un paese basta aggiungere una voce a quel file.
// (Il client Supabase per paese arriva con la tappa 2.)

export type Paese = {
  codice: string;
  nome: string;
  supabaseUrl: string;
  chiavePubblica: string;
  sito: string;
  paginaAcquisti: string;
  paginaProfessionisti: string;
  valuta: string;
  lingue: string[];
  professioni: string[];
  fontiBancaDati: string[];
  riferimentiSito: string;
};

export const paesi: Paese[] = dati.paesi;

export const paesePredefinito = paesi[0].codice;

export function trovaPaese(codice: string): Paese {
  const paese = paesi.find((p) => p.codice === codice);
  if (!paese) throw new Error(`Paese sconosciuto: ${codice}`);
  return paese;
}

// «www.lexum.it» → «lexum.it», per i testi dei pulsanti.
export function dominio(paese: Paese): string {
  return paese.sito
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}
