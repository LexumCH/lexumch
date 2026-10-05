// Domande frequenti della schermata «Domande», per paese e lingua.
// Fonte: docs/testi/domande-e-benvenuto.md (testi di Antonino, 03-10-2026).
// Ogni risposta è un elenco di paragrafi.
// Tedesco e francese sono pronti per la tappa 2 (lingua dell'app in Svizzera).

export type DomandaFrequente = { domanda: string; risposta: string[] };

export const domandeFrequenti: Record<string, Record<string, DomandaFrequente[]>> = {
  IT: {
    it: [
      {
        domanda: 'Come funzionano i crediti?',
        risposta: [
          'Ogni domanda a Lex usa un credito, anche quando approfondisci nella stessa chat. Se la risposta non arriva, il credito non viene scalato. Cercare e leggere nella Banca dati è gratis, e lo è anche il PDF delle risposte. I crediti di benvenuto e quelli acquistati non scadono mai; quelli del Piano Personale valgono fino alla scadenza del piano. Si usano prima i crediti del piano, poi quelli di benvenuto, infine quelli acquistati.',
        ],
      },
      {
        domanda: 'Lex può sbagliare?',
        risposta: [
          "Sì. Lex è un'intelligenza artificiale: ragiona sulle fonti della Banca dati e te le cita, ma può commettere errori. Prima di usare una risposta, apri le fonti citate e verificale. Per decisioni importanti rivolgiti a un professionista.",
        ],
      },
      {
        domanda: 'Ci sono limiti alla Banca dati?',
        risposta: [
          "No. Cercare e leggere nella Banca dati è gratuito e senza limiti, in tutti i campi: civile, penale, amministrativo, tributario, europeo. L'unico limite è che la norma o la sentenza che cerchi sia presente nella Banca dati Lexum.",
        ],
      },
      {
        domanda: 'Che fine fanno i documenti che allego?',
        risposta: [
          "Lex li usa per rispondere alla tua domanda e poi li cancella da solo dopo 4 ore, a meno che tu non li salvi nel tuo archivio. Nell'archivio hai 50 MB gratuiti; con il Piano Personale arrivi a 2 GB.",
        ],
      },
      {
        domanda: 'Posso usare lo stesso account sul sito?',
        risposta: [
          'Sì. Su lexum.it entri con la stessa email e la stessa password, e trovi gli stessi crediti, le stesse ricerche, le stesse etichette e lo stesso archivio.',
        ],
      },
      {
        domanda: 'Come cambio paese?',
        risposta: [
          "Da Profilo → «Paese e banca dati». Italia e Svizzera hanno banche dati e account separati: crediti, piano e archivio non passano da un paese all'altro. Se nell'altro paese non hai ancora un account, lo crei in un minuto, anche con la stessa email.",
        ],
      },
      {
        domanda: 'I miei dati restano miei?',
        risposta: [
          'Sì. I tuoi dati sono separati da quelli degli altri utenti, stanno su server europei conformi al GDPR e non vengono mai venduti né condivisi con terzi.',
        ],
      },
      {
        domanda: "Come elimino l'account?",
        risposta: [
          "Italia e Svizzera sono due accessi separati, e ognuno si elimina per conto suo: eliminarne uno non elimina l'altro.",
          "Per eliminare l'accesso italiano: Profilo → «Elimina account». I dati di questo accesso vengono cancellati definitivamente nei tempi previsti dal GDPR. Prima, se vuoi, scarica i documenti del tuo archivio.",
          "Se hai anche l'accesso svizzero e vuoi eliminare anche quello: in Profilo passa alla Svizzera da «Paese e banca dati» e tocca «Elimina account svizzero».",
        ],
      },
    ],
  },
  CH: {
    it: [
      {
        domanda: 'Come funzionano i crediti?',
        risposta: [
          'Ogni domanda a Lex usa un credito, anche quando approfondisci nella stessa chat. Se la risposta non arriva, il credito non viene scalato. Cercare e leggere nella Banca dati è gratis, e lo è anche il PDF delle risposte. I crediti di benvenuto e quelli acquistati non scadono mai; quelli del Piano Personale valgono fino alla scadenza del piano. Si usano prima i crediti del piano, poi quelli di benvenuto, infine quelli acquistati.',
        ],
      },
      {
        domanda: 'Lex può sbagliare?',
        risposta: [
          "Sì. Lex è un'intelligenza artificiale: ragiona sulle fonti della Banca dati e te le cita, ma può commettere errori. Prima di usare una risposta, apri le fonti citate e verificale. Per decisioni importanti rivolgiti a un professionista.",
        ],
      },
      {
        domanda: 'Ci sono limiti alla Banca dati?',
        risposta: [
          "No. Cercare e leggere nella Banca dati è gratuito e senza limiti, in tutti i campi: diritto federale e cantonale, giurisprudenza, prassi, diritto europeo. L'unico limite è che la norma o la decisione che cerchi sia presente nella Banca dati Lexum.",
        ],
      },
      {
        domanda: 'Che fine fanno i documenti che allego?',
        risposta: [
          "Lex li usa per rispondere alla tua domanda e poi li cancella da solo dopo 4 ore, a meno che tu non li salvi nel tuo archivio. Nell'archivio hai 50 MB gratuiti; con il Piano Personale arrivi a 2 GB.",
        ],
      },
      {
        domanda: 'Posso usare lo stesso account sul sito?',
        risposta: [
          'Sì. Su lexum.ch entri con la stessa email e la stessa password, e trovi gli stessi crediti, le stesse ricerche, le stesse etichette e lo stesso archivio.',
        ],
      },
      {
        domanda: 'Come cambio paese?',
        risposta: [
          "Da Profilo → «Paese e banca dati». Svizzera e Italia hanno banche dati e account separati: crediti, piano e archivio non passano da un paese all'altro. Se nell'altro paese non hai ancora un account, lo crei in un minuto, anche con la stessa email.",
        ],
      },
      {
        domanda: 'I miei dati restano miei?',
        risposta: [
          'Sì. I tuoi dati sono separati da quelli degli altri utenti, stanno su server in Svizzera conformi alla LPD svizzera e al GDPR, e non vengono mai venduti né condivisi con terzi.',
        ],
      },
      {
        domanda: "Come elimino l'account?",
        risposta: [
          "Svizzera e Italia sono due accessi separati, e ognuno si elimina per conto suo: eliminarne uno non elimina l'altro.",
          "Per eliminare l'accesso svizzero: Profilo → «Elimina account svizzero». I dati di questo accesso vengono cancellati definitivamente nei tempi previsti dalla legge sulla protezione dei dati. Prima, se vuoi, scarica i documenti del tuo archivio.",
          "Se hai anche l'accesso italiano e vuoi eliminare anche quello: in Profilo passa all'Italia da «Paese e banca dati» e tocca «Elimina account».",
        ],
      },
    ],
    de: [
      {
        domanda: 'Wie funktionieren die Credits?',
        risposta: [
          'Jede Frage an Lex verbraucht einen Credit, auch wenn Sie im selben Chat nachfragen. Kommt keine Antwort zustande, wird kein Credit abgezogen. Suchen und Lesen in der Datenbank ist kostenlos, ebenso das PDF der Antworten. Willkommens-Credits und gekaufte Credits verfallen nie; die Credits des Persönlichen Plans gelten bis zu dessen Ablauf. Zuerst werden die Credits des Plans verbraucht, dann die Willkommens-Credits und zuletzt die gekauften Credits.',
        ],
      },
      {
        domanda: 'Kann Lex sich irren?',
        risposta: [
          'Ja. Lex ist eine künstliche Intelligenz: Sie stützt sich auf die Quellen der Datenbank und zitiert sie, kann aber Fehler machen. Öffnen und prüfen Sie die zitierten Quellen, bevor Sie eine Antwort verwenden. Bei wichtigen Entscheidungen wenden Sie sich an eine Fachperson.',
        ],
      },
      {
        domanda: 'Gibt es Einschränkungen bei der Datenbank?',
        risposta: [
          'Nein. Suchen und Lesen in der Datenbank ist kostenlos und unbegrenzt, in allen Bereichen: Bundes- und Kantonsrecht, Rechtsprechung, Praxis, Europarecht. Die einzige Grenze: Die gesuchte Norm oder Entscheidung muss in der Lexum-Datenbank enthalten sein.',
        ],
      },
      {
        domanda: 'Was geschieht mit den Dokumenten, die ich anhänge?',
        risposta: [
          'Lex verwendet sie, um Ihre Frage zu beantworten, und löscht sie nach 4 Stunden automatisch, ausser Sie speichern sie in Ihrem Archiv. Im Archiv haben Sie 50 MB kostenlos; mit dem Persönlichen Plan sind es 2 GB.',
        ],
      },
      {
        domanda: 'Kann ich dasselbe Konto auf der Website nutzen?',
        risposta: [
          'Ja. Auf lexum.ch melden Sie sich mit derselben E-Mail-Adresse und demselben Passwort an und finden dieselben Credits, Recherchen, Etiketten und dasselbe Archiv.',
        ],
      },
      {
        domanda: 'Wie wechsle ich das Land?',
        risposta: [
          'Unter Profil → «Land und Datenbank». Die Schweiz und Italien haben getrennte Datenbanken und Konten: Credits, Plan und Archiv werden nicht übertragen. Haben Sie im anderen Land noch kein Konto, erstellen Sie es in einer Minute, auch mit derselben E-Mail-Adresse.',
        ],
      },
      {
        domanda: 'Bleiben meine Daten meine Daten?',
        risposta: [
          'Ja. Ihre Daten sind von denen anderer Nutzerinnen und Nutzer getrennt, liegen auf Servern in der Schweiz, die dem Schweizer DSG und der DSGVO entsprechen, und werden nie verkauft oder an Dritte weitergegeben.',
        ],
      },
      {
        domanda: 'Wie lösche ich mein Konto?',
        risposta: [
          'Die Schweiz und Italien sind zwei getrennte Zugänge, und jeder wird einzeln gelöscht: Wenn Sie den einen löschen, bleibt der andere bestehen.',
          'Schweizer Zugang löschen: Profil → «Schweizer Konto löschen». Die Daten dieses Zugangs werden innerhalb der Fristen des Datenschutzgesetzes endgültig gelöscht. Laden Sie vorher, wenn Sie möchten, die Dokumente aus Ihrem Archiv herunter.',
          'Haben Sie auch einen Zugang in Italien und möchten Sie ihn ebenfalls löschen: Wechseln Sie im Profil unter «Land und Datenbank» zu Italien und tippen Sie dort auf «Elimina account» (in Italien ist die App auf Italienisch).',
        ],
      },
    ],
    fr: [
      {
        domanda: 'Comment fonctionnent les crédits ?',
        risposta: [
          "Chaque question à Lex utilise un crédit, même lorsque vous approfondissez dans la même conversation. Si la réponse n'arrive pas, aucun crédit n'est débité. Rechercher et lire dans la base de données est gratuit, tout comme le PDF des réponses. Les crédits de bienvenue et ceux achetés n'expirent jamais ; ceux du Plan personnel sont valables jusqu'à l'échéance du plan. Les crédits du plan sont utilisés en premier, puis ceux de bienvenue, enfin ceux achetés.",
        ],
      },
      {
        domanda: 'Lex peut-il se tromper ?',
        risposta: [
          "Oui. Lex est une intelligence artificielle : il raisonne sur les sources de la base de données et les cite, mais il peut commettre des erreurs. Avant d'utiliser une réponse, ouvrez les sources citées et vérifiez-les. Pour les décisions importantes, adressez-vous à un professionnel.",
        ],
      },
      {
        domanda: 'Y a-t-il des limites à la base de données ?',
        risposta: [
          'Non. Rechercher et lire dans la base de données est gratuit et illimité, dans tous les domaines : droit fédéral et cantonal, jurisprudence, pratique administrative, droit européen. La seule limite : la norme ou la décision que vous cherchez doit figurer dans la base de données Lexum.',
        ],
      },
      {
        domanda: 'Que deviennent les documents que je joins ?',
        risposta: [
          "Lex les utilise pour répondre à votre question, puis les supprime automatiquement après 4 heures, sauf si vous les enregistrez dans votre archive. L'archive offre 50 Mo gratuits ; avec le Plan personnel, vous passez à 2 Go.",
        ],
      },
      {
        domanda: 'Puis-je utiliser le même compte sur le site ?',
        risposta: [
          'Oui. Sur lexum.ch, connectez-vous avec la même adresse e-mail et le même mot de passe : vous retrouvez les mêmes crédits, recherches et étiquettes, et la même archive.',
        ],
      },
      {
        domanda: 'Comment changer de pays ?',
        risposta: [
          "Dans Profil → « Pays et base de données ». La Suisse et l'Italie ont des bases de données et des comptes séparés : crédits, plan et archive ne passent pas d'un pays à l'autre. Si vous n'avez pas encore de compte dans l'autre pays, vous le créez en une minute, même avec la même adresse e-mail.",
        ],
      },
      {
        domanda: 'Mes données restent-elles les miennes ?',
        risposta: [
          'Oui. Vos données sont séparées de celles des autres utilisateurs, hébergées sur des serveurs en Suisse conformes à la LPD suisse et au RGPD, et ne sont jamais vendues ni partagées avec des tiers.',
        ],
      },
      {
        domanda: 'Comment supprimer mon compte ?',
        risposta: [
          "La Suisse et l'Italie sont deux accès séparés, et chacun se supprime séparément : supprimer l'un ne supprime pas l'autre.",
          "Pour supprimer l'accès suisse : Profil → « Supprimer le compte suisse ». Les données de cet accès sont supprimées définitivement dans les délais prévus par la loi sur la protection des données. Auparavant, si vous le souhaitez, téléchargez les documents de votre archive.",
          "Si vous avez aussi un accès en Italie et souhaitez le supprimer : dans Profil, passez à l'Italie sous « Pays et base de données » et appuyez sur « Elimina account » (en Italie, l'app est en italien).",
        ],
      },
    ],
  },
};

export function domandePer(paese: string, lingua: string): DomandaFrequente[] {
  const perPaese = domandeFrequenti[paese] ?? {};
  return perPaese[lingua] ?? perPaese.it ?? [];
}
