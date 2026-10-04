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
