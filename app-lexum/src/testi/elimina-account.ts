// D6 · Conferma «Elimina account», per paese e lingua.
// Fonte: docs/testi/domande-e-benvenuto.md, sezione 2 (testi di Antonino, 03-10-2026).
// Tedesco e francese sono pronti per la tappa 2.

export type TestiEliminaAccount = {
  titolo: string;
  testo: string;
  altroAccesso: string; // se l'accesso nell'altro paese esiste
  nessunAltro: string; // se non esiste
  archivio: string;
  conferma: string;
  annulla: string;
};

export const testiEliminaAccount: Record<string, Record<string, TestiEliminaAccount>> = {
  IT: {
    it: {
      titolo: "Eliminare l'accesso italiano?",
      testo: 'Elimini crediti, piano, ricerche, etichette e archivio di Lexum Italia. È definitivo.',
      altroAccesso:
        "L'accesso svizzero resta attivo. Ogni accesso si elimina per conto suo: per eliminare anche quello, passa alla Svizzera dal Profilo e ripeti.",
      nessunAltro: 'Non hai altri accessi Lexum.',
      archivio: 'Prima, se vuoi, scarica i documenti dal tuo archivio.',
      conferma: "Elimina l'accesso italiano",
      annulla: 'Annulla',
    },
  },
  CH: {
    it: {
      titolo: "Eliminare l'accesso svizzero?",
      testo: 'Elimini crediti, piano, ricerche, etichette e archivio di Lexum Svizzera. È definitivo.',
      altroAccesso:
        "L'accesso italiano resta attivo. Ogni accesso si elimina per conto suo: per eliminare anche quello, passa all'Italia dal Profilo e ripeti.",
      nessunAltro: 'Non hai altri accessi Lexum.',
      archivio: 'Prima, se vuoi, scarica i documenti dal tuo archivio.',
      conferma: "Elimina l'accesso svizzero",
      annulla: 'Annulla',
    },
    de: {
      titolo: 'Schweizer Zugang löschen?',
      testo:
        'Sie löschen Credits, Plan, Recherchen, Etiketten und Archiv von Lexum Schweiz. Das ist endgültig.',
      altroAccesso:
        'Der Zugang in Italien bleibt aktiv. Jeder Zugang wird einzeln gelöscht: Um auch diesen zu löschen, wechseln Sie im Profil zu Italien und wiederholen den Vorgang.',
      nessunAltro: 'Sie haben keine weiteren Lexum-Zugänge.',
      archivio: 'Laden Sie vorher, wenn Sie möchten, die Dokumente aus Ihrem Archiv herunter.',
      conferma: 'Schweizer Zugang löschen',
      annulla: 'Abbrechen',
    },
    fr: {
      titolo: "Supprimer l'accès suisse ?",
      testo:
        "Vous supprimez les crédits, le plan, les recherches, les étiquettes et l'archive de Lexum Suisse. C'est définitif.",
      altroAccesso:
        "L'accès en Italie reste actif. Chaque accès se supprime séparément : pour supprimer aussi celui-ci, passez à l'Italie dans le Profil et recommencez.",
      nessunAltro: "Vous n'avez pas d'autre accès Lexum.",
      archivio: 'Auparavant, si vous le souhaitez, téléchargez les documents de votre archive.',
      conferma: "Supprimer l'accès suisse",
      annulla: 'Annuler',
    },
  },
};

export function testiEliminaPer(paese: string, lingua: string): TestiEliminaAccount {
  const perPaese = testiEliminaAccount[paese] ?? testiEliminaAccount.IT;
  return perPaese[lingua] ?? perPaese.it;
}
