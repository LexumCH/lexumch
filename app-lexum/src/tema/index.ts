export { colori, coloriEtichette, gradienteHero, gradienteOro } from './colori';
export { famiglie, tipi, type TipoTesto } from './caratteri';

// Misure comuni. Gli angoli sono vivi: nessun borderRadius nell'app.
export const misure = {
  tocco: 44, // ogni elemento toccabile misura almeno 44 px
  intestazione: 52,
  bordo: 1,
} as const;
