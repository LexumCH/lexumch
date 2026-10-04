import type { Testi } from './it';

export type Lingua = 'it' | 'de' | 'fr';

// Tedesco e francese hanno la stessa forma dell'italiano, ma possono essere incompleti:
// quello che manca si mostra in italiano.
type Parziale<T> = { [K in keyof T]?: T[K] extends string ? string : Parziale<T[K]> };
export type Traduzione = Parziale<Testi>;

// Tutte le chiavi, con il punto: «avvio.accesso.titolo». TypeScript controlla che esistano.
type Percorsi<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Percorsi<T[K], `${P}${K}.`>;
}[keyof T & string];
export type Chiave = Percorsi<Testi>;
