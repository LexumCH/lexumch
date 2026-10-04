// Ruoli degli account dei siti (colonna `role` di `profiles`): in IT user, cliente, avvocato,
// commercialista, commerciale, admin; in CH anche fiduciario e progettista.
// Nell'app entra chiunque abbia un account del sito, con le stesse schermate: nessun ruolo viene
// respinto e non compare mai un errore del tipo «non sei un utente» (deciso da Antonino il 03-10-2026).

export type GruppoRuolo = 'privato' | 'professionista' | 'cliente' | 'interno';

const gruppi: Record<string, GruppoRuolo> = {
  user: 'privato',
  avvocato: 'professionista',
  commercialista: 'professionista',
  fiduciario: 'professionista',
  progettista: 'professionista',
  cliente: 'cliente',
  commerciale: 'interno',
  admin: 'interno',
};

const nomi: Record<string, string> = {
  user: 'Privato',
  avvocato: 'Avvocato',
  commercialista: 'Commercialista',
  fiduciario: 'Fiduciario',
  progettista: 'Progettista',
  cliente: 'Cliente di uno studio',
  commerciale: 'Commerciale',
  admin: 'Amministratore',
};

// Un ruolo nuovo, che l'app non conosce ancora, entra come gli altri: lo trattiamo da professionista.
export function gruppoRuolo(ruolo: string): GruppoRuolo {
  return gruppi[ruolo] ?? 'professionista';
}

export function nomeRuolo(ruolo: string): string {
  return nomi[ruolo] ?? 'Account professionale';
}

// Strumenti dello studio nell'app, per ruolo (deciso da Antonino il 04-10-2026):
// - avvocati: mandati, calendario e fatture;
// - commercialisti e fiduciari: per ora calendario e fatture (la loro parte di mandati è in revisione);
// - gli altri ruoli: niente strumenti dello studio nell'app (li trovano sul sito).
export type StrumentoStudio = 'mandati' | 'calendario' | 'fatture';

const strumenti: Record<string, StrumentoStudio[]> = {
  avvocato: ['mandati', 'calendario', 'fatture'],
  commercialista: ['calendario', 'fatture'],
  fiduciario: ['calendario', 'fatture'],
};

export function strumentiStudio(ruolo: string): StrumentoStudio[] {
  return strumenti[ruolo] ?? [];
}
