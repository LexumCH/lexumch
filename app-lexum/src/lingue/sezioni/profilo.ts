import type { Parziale } from '../tipi';

// Sezione «profilo»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).
// Profilo (D4, G6) e i suoi fogli (paese, verifica in due passaggi, professionista), i nomi dei ruoli
// (src/ruoli.ts), Domande (D3) e l'app bloccata (F1). Dove c'era già, il testo tedesco e francese
// viene da lexum.ch (user_profilo, avv_profilo, comp_modal_attiva_2fa, user_verifica).
// Le chiavi IT e CH servono per i testi che cambiano con il paese.

const it = {
  titolo: 'Profilo',
  paese: 'Paese e banca dati',
  cambia: 'Cambia',
  lingua: "Lingua dell'app",
  crediti: {
    titolo: 'Crediti e piano',
    disponibili: 'Crediti disponibili',
    delPiano: 'Del piano, valgono fino al {data}',
    dettaglio: 'Benvenuto {benvenuto} · acquistati {acquistati} · non scadono',
    aggiungi: 'Aggiungi crediti',
    piano: 'Il tuo piano',
    finoAl: 'Fino al {data} · archivio {archivio}',
    archivio: 'Archivio: {archivio}',
    upgrade: 'Fai upgrade',
    nota: 'Si paga sul sito con lo stesso account: crediti e piano arrivano qui da soli.',
  },
  account: {
    titolo: 'Account',
    dati: 'Dati personali',
    datiTesto: 'Nome, telefono, password',
    dueFattori: 'Verifica in due passaggi',
    dueAttiva: 'Attiva · vale anche su {sito}',
    dueSpenta: "Spenta · codice da un'app di autenticazione",
    attiva: 'Attiva',
    fatturazione: 'Dati di fatturazione',
    fatturazioneMancano: 'Da completare: servono per emettere le fatture',
    fatturazioneTesto: {
      IT: 'Partita IVA, codice fiscale, indirizzo, IBAN',
      CH: 'Indirizzo, IBAN per la QR-fattura, IVA',
    },
    mancano: 'Mancano',
    notifiche: 'Notifiche',
    notificheTesto: 'Quando la risposta di Lex è pronta',
    privacy: 'Privacy e termini',
    esci: 'Esci',
  },
  telefono: {
    titolo: 'Su questo telefono',
    blocco: 'Blocca con Face ID o impronta',
    bloccoTesto: "Chiede lo sblocco ogni volta che apri l'app",
    offline: 'Ricerche anche senza rete',
    offlineAcceso: 'Chat, norme e appunti salvati restano sul telefono',
    offlineSpento: 'Spenta: Ricerche si apre solo con la connessione',
  },
  completa: {
    sopratitolo: 'Completa il profilo',
    domanda: {
      IT: 'Sei un avvocato o un commercialista?',
      CH: 'Sei avvocato, fiduciario o progettista?',
    },
    testo: {
      IT: 'Con il profilo professionale si aprono pratiche, clienti, scadenze, atti e fatture. Per ora si attiva dal sito.',
      CH: 'Con il profilo professionale si aprono gli strumenti per lo studio. Per ora si attiva dal sito lexum.ch.',
    },
    pulsante: 'Che professionista sei?',
  },
  // Il riquadro per gli account professionali, i clienti di uno studio e gli interni.
  studio: {
    titoloCliente: 'Il portale del tuo studio è sul sito',
    titoloInterno: 'Il pannello di gestione è sul sito',
    titoloStudio: 'Il tuo studio è anche qui',
    titoloSito: 'I tuoi strumenti professionali sono sul sito',
    testoMandati:
      'Pratiche, calendario e fatture sono nel menù. Clienti, documenti dello studio e statistiche restano su {sito}.',
    testoStrumenti: 'Calendario e fatture sono nel menù. Clienti, mandati e il resto restano su {sito}.',
    testoProfessionista:
      "Qui hai Lex, la Banca dati, le tue ricerche e l'archivio. Pratiche, clienti, scadenze e fatture restano su {sito}.",
    testoAltri:
      "Qui hai Lex, la Banca dati, le tue ricerche e l'archivio. Il resto lo trovi su {sito}, con lo stesso account.",
    apri: 'Apri {sito}',
  },
  elimina: {
    titolo: 'Elimina account',
    titoloPaese: { IT: 'Elimina account italiano', CH: 'Elimina account svizzero' },
    testo: { IT: "Cancella l'accesso e i dati in Italia", CH: "Cancella l'accesso e i dati in Svizzera" },
  },
  // Nomi dei ruoli degli account dei siti (src/ruoli.ts); «altro» per un ruolo che l'app non conosce.
  ruoli: {
    user: 'Privato',
    avvocato: 'Avvocato',
    commercialista: 'Commercialista',
    fiduciario: 'Fiduciario',
    progettista: 'Progettista',
    cliente: 'Cliente di uno studio',
    commerciale: 'Commerciale',
    admin: 'Amministratore',
    altro: 'Account professionale',
  },
  // G1, G2 · cambio di paese.
  cambioPaese: {
    titolo: 'Dove vuoi lavorare?',
    qui: 'Sei qui · banca dati attuale',
    accessoCon: 'Accesso già creato con {email}',
    nessunAccesso: 'Nessun accesso, per ora',
    senzaAccesso: { IT: 'Non hai ancora un accesso in Italia', CH: 'Non hai ancora un accesso in Svizzera' },
    // Per paese scelto; l'altro è quello in cui sei.
    senzaAccessoTesto: {
      IT: 'La banca dati italiana ha un account suo: crediti, piano e archivio sono separati da quelli svizzeri. Si crea in un minuto, e anche lì la prima ricerca è gratuita.',
      CH: 'La banca dati svizzera ha un account suo: crediti, piano e archivio sono separati da quelli italiani. Si crea in un minuto, e anche lì la prima ricerca è gratuita.',
    },
    crea: { IT: "Crea l'accesso italiano", CH: "Crea l'accesso svizzero" },
    hoAccesso: 'Ho già un accesso: accedi',
    stessaEmail: 'Puoi usare la stessa email.',
    account: { IT: 'Il tuo account italiano', CH: 'Il tuo account svizzero' },
    accountInUso: { IT: 'Il tuo account italiano · in uso', CH: 'Il tuo account svizzero · in uso' },
    piano: 'Piano',
    crediti: 'Crediti',
    pianoFino: '{piano} · fino al {data}',
    rimanenteUno: '1 rimanente',
    rimanentiMolti: '{n} rimanenti',
    altroPaese: "Scegli l'altro paese per vedere il suo account e passare lì.",
    separato: "È un account separato: crediti, piano e archivio non passano da un paese all'altro.",
    domanda: {
      IT: 'Vuoi passare al database legale italiano?',
      CH: 'Vuoi passare al database legale svizzero?',
    },
    passa: { IT: "Sì, passa all'Italia", CH: 'Sì, passa alla Svizzera' },
    resta: { IT: 'Resta in Italia', CH: 'Resta in Svizzera' },
  },
  // D4 · verifica in due passaggi.
  dueFattori: {
    titoloSpiega: 'Un codice in più, oltre alla password',
    titoloAggiungi: 'Collega la tua app di autenticazione',
    titoloCodici: 'Salva i codici di recupero',
    titoloDisattiva: 'Spegnere la verifica?',
    titoloGestisci: 'Attiva',
    spiega:
      "Quando accedi, oltre alla password ti chiediamo un codice di 6 cifre che cambia ogni 30 secondi. Lo genera un'app di autenticazione: Google Authenticator, Microsoft Authenticator, 1Password…",
    valeSu: 'Vale anche su {sito}',
    stessoAccount: {
      IT: "È lo stesso account italiano: lo stesso codice serve sull'app e sul sito. Se l'hai già attivata sul sito, qui risulta già attiva.",
      CH: "È lo stesso account svizzero: lo stesso codice serve sull'app e sul sito. Se l'hai già attivata sul sito, qui risulta già attiva.",
    },
    attiva: 'Attiva',
    passo1: '1. Aggiungi Lexum alla tua app di autenticazione',
    apriApp: "Apri l'app di autenticazione",
    trovi: "Nell'app di autenticazione trovi «{nome}» con {email}. Torna qui e scrivi il codice che mostra.",
    aMano: 'Oppure aggiungila a mano con questa chiave:',
    chiave: 'Chiave: {chiave}',
    passo2: '2. Scrivi il codice di 6 cifre',
    verifica: 'Verifica e attiva',
    codiciTesto:
      'Ti servono se perdi il telefono. Ognuno vale una volta sola. Salvali fuori dal telefono, in un posto sicuro.',
    codici: 'Codici di recupero',
    condividiTesto: 'Codici di recupero {nome}:\n{codici}',
    condividi: 'Condividi o salva',
    hoSalvato: 'Ho salvato i codici',
    attivaSu: "Attiva sull'app e su {sito}",
    chiediamo: "All'accesso ti chiediamo il codice di «{nome}».",
    nuoviCodici: 'Nuovi codici di recupero',
    spegniVerifica: 'Spegni la verifica',
    disattivaTesto: {
      IT: 'Il tuo account italiano sarà protetto solo dalla password, anche su {sito}. I codici di recupero non varranno più.',
      CH: 'Il tuo account svizzero sarà protetto solo dalla password, anche su {sito}. I codici di recupero non varranno più.',
    },
    spegni: 'Spegni',
  },
  // D5 · che professionista sei? Le professioni sono quelle di src/paesi/contenuti.ts.
  professionista: {
    testo: 'Scegli il tuo profilo professionale: la piattaforma si adatta al tuo modo di lavorare.',
    nota: 'Si completa sul sito, con lo stesso account: dati di fatturazione e, se vuoi, i documenti per il distintivo di professionista verificato.',
    continua: 'Continua su {sito}',
    professioni: {
      avvocato: {
        nome: 'Avvocato',
        descrizione:
          'Pratiche, udienze, termini processuali, banca dati giuridica e generazione di atti con Lex AI.',
      },
      commercialista: {
        nome: 'Commercialista',
        descrizione:
          'Mandati, scadenzario fiscale, contabilità clienti, banca dati tributaria e Lex AI per lo studio.',
      },
      fiduciario: {
        nome: 'Fiduciario',
        descrizione: 'Mandati, scadenze fiscali, contabilità dei clienti e Lex AI per lo studio.',
      },
      progettista: {
        nome: 'Progettista',
        descrizione: 'Analisi dei disegni e verifica delle norme edilizie cantonali con Lex AI.',
      },
    },
  },
  // D3 · Domande (le domande frequenti stanno in src/testi/domande.ts).
  domande: {
    titolo: 'Domande?',
    aiuto: 'Come possiamo aiutarti?',
    frequenti: 'Domande frequenti',
    richieste: 'Le tue richieste',
    rispostaNuova: 'Risposta nuova',
    aperto: 'Aperto',
    chiuso: 'Chiuso',
    scrivi: 'Scrivi al supporto',
  },
  // F1 · app bloccata.
  blocco: {
    titolo: 'Lexum è bloccata',
    testo: "Usa Face ID o l'impronta per aprirla.",
    sblocca: 'Sblocca',
    nota: 'Se non funziona, il telefono ti chiede il suo codice. Il blocco si spegne dal Profilo.',
  },
};

const de: Parziale<typeof it> = {
  titolo: 'Profil',
  paese: 'Land und Datenbank',
  cambia: 'Ändern',
  lingua: 'Sprache der App',
  crediti: {
    titolo: 'Credits und Plan',
    disponibili: 'Verfügbare Credits',
    delPiano: 'Aus dem Plan, gültig bis {data}',
    dettaglio: 'Willkommen {benvenuto} · gekauft {acquistati} · verfallen nicht',
    aggiungi: 'Credits hinzufügen',
    piano: 'Ihr Plan',
    finoAl: 'Bis {data} · Archiv {archivio}',
    archivio: 'Archiv: {archivio}',
    upgrade: 'Upgrade',
    nota: 'Bezahlt wird auf der Website mit demselben Konto: Credits und Plan erscheinen hier automatisch.',
  },
  account: {
    titolo: 'Konto',
    dati: 'Persönliche Daten',
    datiTesto: 'Name, Telefon, Passwort',
    dueFattori: '2FA-Verifizierung',
    dueAttiva: 'Aktiv · gilt auch auf {sito}',
    dueSpenta: 'Aus · Code aus einer Authenticator-App',
    attiva: 'Aktiv',
    fatturazione: 'Rechnungsdaten',
    fatturazioneMancano: 'Zu ergänzen: nötig, um Rechnungen auszustellen',
    fatturazioneTesto: {
      IT: 'Partita IVA, Codice fiscale, Adresse, IBAN',
      CH: 'Adresse, IBAN für die QR-Rechnung, MWST',
    },
    mancano: 'Unvollständig',
    notifiche: 'Benachrichtigungen',
    notificheTesto: 'Wenn die Antwort von Lex bereit ist',
    privacy: 'Datenschutz und Bedingungen',
    esci: 'Abmelden',
  },
  telefono: {
    titolo: 'Auf diesem Telefon',
    blocco: 'Mit Face ID oder Fingerabdruck sperren',
    bloccoTesto: 'Verlangt das Entsperren bei jedem Öffnen der App',
    offline: 'Recherchen auch offline',
    offlineAcceso: 'Gespeicherte Chats, Normen und Notizen bleiben auf dem Telefon',
    offlineSpento: 'Aus: Recherchen öffnen sich nur mit Verbindung',
  },
  completa: {
    sopratitolo: 'Profil vervollständigen',
    domanda: {
      IT: 'Sind Sie Anwalt oder Steuerberater?',
      CH: 'Sind Sie Anwalt, Treuhänder oder Planer?',
    },
    testo: {
      IT: 'Mit dem Berufsprofil öffnen sich Dossiers, Mandanten, Fristen, Rechtsschriften und Rechnungen. Vorerst wird es auf der Website aktiviert.',
      CH: 'Mit dem Berufsprofil öffnen sich die Werkzeuge für Ihre Kanzlei. Vorerst wird es auf der Website lexum.ch aktiviert.',
    },
    pulsante: 'Welcher Berufsgruppe gehören Sie an?',
  },
  studio: {
    titoloCliente: 'Das Portal Ihrer Kanzlei ist auf der Website',
    titoloInterno: 'Das Verwaltungspanel ist auf der Website',
    titoloStudio: 'Ihre Kanzlei ist auch hier',
    titoloSito: 'Ihre beruflichen Werkzeuge sind auf der Website',
    testoMandati:
      'Dossiers, Kalender und Rechnungen sind im Menü. Mandanten, Kanzleidokumente und Statistiken bleiben auf {sito}.',
    testoStrumenti:
      'Kalender und Rechnungen sind im Menü. Mandanten, Mandate und der Rest bleiben auf {sito}.',
    testoProfessionista:
      'Hier haben Sie Lex, die Datenbank, Ihre Recherchen und das Archiv. Dossiers, Mandanten, Fristen und Rechnungen bleiben auf {sito}.',
    testoAltri:
      'Hier haben Sie Lex, die Datenbank, Ihre Recherchen und das Archiv. Den Rest finden Sie auf {sito}, mit demselben Konto.',
    apri: '{sito} öffnen',
  },
  elimina: {
    titolo: 'Konto löschen',
    titoloPaese: { IT: 'Italienisches Konto löschen', CH: 'Schweizer Konto löschen' },
    testo: {
      IT: 'Löscht den Zugang und die Daten in Italien',
      CH: 'Löscht den Zugang und die Daten in der Schweiz',
    },
  },
  ruoli: {
    user: 'Privatperson',
    avvocato: 'Anwalt',
    commercialista: 'Steuerberater',
    fiduciario: 'Treuhänder',
    progettista: 'Planer',
    cliente: 'Mandant einer Kanzlei',
    commerciale: 'Vertrieb',
    admin: 'Administrator',
    altro: 'Berufskonto',
  },
  cambioPaese: {
    titolo: 'Wo möchten Sie arbeiten?',
    qui: 'Sie sind hier · aktuelle Datenbank',
    accessoCon: 'Zugang bereits erstellt mit {email}',
    nessunAccesso: 'Noch kein Zugang',
    senzaAccesso: {
      IT: 'Sie haben noch keinen Zugang in Italien',
      CH: 'Sie haben noch keinen Zugang in der Schweiz',
    },
    senzaAccessoTesto: {
      IT: 'Die italienische Datenbank hat ein eigenes Konto: Credits, Plan und Archiv sind von denen in der Schweiz getrennt. Es ist in einer Minute erstellt, und auch dort ist die erste Recherche kostenlos.',
      CH: 'Die Schweizer Datenbank hat ein eigenes Konto: Credits, Plan und Archiv sind von denen in Italien getrennt. Es ist in einer Minute erstellt, und auch dort ist die erste Recherche kostenlos.',
    },
    crea: { IT: 'Italienischen Zugang erstellen', CH: 'Schweizer Zugang erstellen' },
    hoAccesso: 'Ich habe bereits einen Zugang: anmelden',
    stessaEmail: 'Sie können dieselbe E-Mail verwenden.',
    account: { IT: 'Ihr italienisches Konto', CH: 'Ihr Schweizer Konto' },
    accountInUso: { IT: 'Ihr italienisches Konto · aktuell', CH: 'Ihr Schweizer Konto · aktuell' },
    piano: 'Plan',
    crediti: 'Credits',
    pianoFino: '{piano} · bis {data}',
    rimanenteUno: '1 verbleibend',
    rimanentiMolti: '{n} verbleibend',
    altroPaese: 'Wählen Sie das andere Land, um dessen Konto zu sehen und dorthin zu wechseln.',
    separato:
      'Es ist ein separates Konto: Credits, Plan und Archiv wechseln nicht von einem Land ins andere.',
    domanda: {
      IT: 'Möchten Sie zur italienischen Rechtsdatenbank wechseln?',
      CH: 'Möchten Sie zur Schweizer Rechtsdatenbank wechseln?',
    },
    passa: { IT: 'Ja, zu Italien wechseln', CH: 'Ja, zur Schweiz wechseln' },
    resta: { IT: 'In Italien bleiben', CH: 'In der Schweiz bleiben' },
  },
  dueFattori: {
    titoloSpiega: 'Ein zusätzlicher Code neben dem Passwort',
    titoloAggiungi: 'Verbinden Sie Ihre Authenticator-App',
    titoloCodici: 'Speichern Sie die Wiederherstellungscodes',
    titoloDisattiva: 'Verifizierung ausschalten?',
    titoloGestisci: 'Aktiv',
    spiega:
      'Bei der Anmeldung fragen wir Sie neben dem Passwort nach einem 6-stelligen Code, der sich alle 30 Sekunden ändert. Er kommt aus einer Authenticator-App: Google Authenticator, Microsoft Authenticator, 1Password…',
    valeSu: 'Gilt auch auf {sito}',
    stessoAccount: {
      IT: 'Es ist dasselbe italienische Konto: Derselbe Code gilt in der App und auf der Website. Wenn Sie die Verifizierung schon auf der Website aktiviert haben, ist sie hier bereits aktiv.',
      CH: 'Es ist dasselbe Schweizer Konto: Derselbe Code gilt in der App und auf der Website. Wenn Sie die Verifizierung schon auf der Website aktiviert haben, ist sie hier bereits aktiv.',
    },
    attiva: 'Aktivieren',
    passo1: '1. Fügen Sie Lexum Ihrer Authenticator-App hinzu',
    apriApp: 'Authenticator-App öffnen',
    trovi:
      'In der Authenticator-App finden Sie «{nome}» mit {email}. Kommen Sie hierher zurück und geben Sie den angezeigten Code ein.',
    aMano: 'Oder fügen Sie es manuell mit diesem Schlüssel hinzu:',
    chiave: 'Schlüssel: {chiave}',
    passo2: '2. Geben Sie den 6-stelligen Code ein',
    verifica: 'Prüfen und aktivieren',
    codiciTesto:
      'Sie brauchen sie, wenn Sie Ihr Telefon verlieren. Jeder Code gilt nur einmal. Speichern Sie sie ausserhalb des Telefons, an einem sicheren Ort.',
    codici: 'Wiederherstellungscodes',
    condividiTesto: 'Wiederherstellungscodes {nome}:\n{codici}',
    condividi: 'Teilen oder speichern',
    hoSalvato: 'Ich habe die Codes gespeichert',
    attivaSu: 'Aktiv in der App und auf {sito}',
    chiediamo: 'Bei der Anmeldung fragen wir nach dem Code von «{nome}».',
    nuoviCodici: 'Neue Wiederherstellungscodes',
    spegniVerifica: 'Verifizierung ausschalten',
    disattivaTesto: {
      IT: 'Ihr italienisches Konto ist dann nur durch das Passwort geschützt, auch auf {sito}. Die Wiederherstellungscodes gelten nicht mehr.',
      CH: 'Ihr Schweizer Konto ist dann nur durch das Passwort geschützt, auch auf {sito}. Die Wiederherstellungscodes gelten nicht mehr.',
    },
    spegni: 'Ausschalten',
  },
  professionista: {
    testo: 'Wählen Sie Ihr Berufsprofil: Die Plattform passt sich Ihrer Arbeitsweise an.',
    nota: 'Das Profil wird auf der Website ergänzt, mit demselben Konto: Rechnungsdaten und, wenn Sie möchten, die Dokumente für das Abzeichen als verifizierte Fachperson.',
    continua: 'Weiter auf {sito}',
    professioni: {
      avvocato: {
        nome: 'Anwalt',
        descrizione:
          'Dossiers, Verhandlungen, Verfahrensfristen, juristische Datenbank und Rechtsschriften mit Lex AI.',
      },
      commercialista: {
        nome: 'Steuerberater',
        descrizione:
          'Mandate, Steuerfristen, Buchhaltung der Mandanten, Steuerdatenbank und Lex AI für die Kanzlei.',
      },
      fiduciario: {
        nome: 'Treuhänder',
        descrizione: 'Mandate, Steuerfristen, Buchhaltung der Mandanten und Lex AI für Ihr Büro.',
      },
      progettista: {
        nome: 'Planer',
        descrizione: 'Analyse von Plänen und Prüfung der kantonalen Bauvorschriften mit Lex AI.',
      },
    },
  },
  domande: {
    titolo: 'Fragen?',
    aiuto: 'Wie können wir Ihnen helfen?',
    frequenti: 'Häufige Fragen',
    richieste: 'Ihre Anfragen',
    rispostaNuova: 'Neue Antwort',
    aperto: 'Offen',
    chiuso: 'Geschlossen',
    scrivi: 'An den Support schreiben',
  },
  blocco: {
    titolo: 'Lexum ist gesperrt',
    testo: 'Verwenden Sie Face ID oder Ihren Fingerabdruck, um die App zu öffnen.',
    sblocca: 'Entsperren',
    nota: 'Wenn es nicht klappt, fragt das Telefon nach seinem Code. Die Sperre schalten Sie im Profil aus.',
  },
};

const fr: Parziale<typeof it> = {
  titolo: 'Profil',
  paese: 'Pays et base de données',
  cambia: 'Changer',
  lingua: "Langue de l'app",
  crediti: {
    titolo: 'Crédits et plan',
    disponibili: 'Crédits disponibles',
    delPiano: "Du plan, valables jusqu'au {data}",
    dettaglio: 'Bienvenue {benvenuto} · achetés {acquistati} · sans échéance',
    aggiungi: 'Ajouter des crédits',
    piano: 'Votre plan',
    finoAl: "Jusqu'au {data} · archives {archivio}",
    archivio: 'Archives : {archivio}',
    upgrade: 'Changer de plan',
    nota: 'Le paiement se fait sur le site avec le même compte : crédits et plan arrivent ici automatiquement.',
  },
  account: {
    titolo: 'Compte',
    dati: 'Données personnelles',
    datiTesto: 'Nom, téléphone, mot de passe',
    dueFattori: 'Vérification 2FA',
    dueAttiva: 'Active · valable aussi sur {sito}',
    dueSpenta: "Désactivée · code d'une application d'authentification",
    attiva: 'Active',
    fatturazione: 'Données de facturation',
    fatturazioneMancano: 'À compléter : nécessaires pour émettre les factures',
    fatturazioneTesto: {
      IT: 'Partita IVA, codice fiscale, adresse, IBAN',
      CH: 'Adresse, IBAN pour la QR-facture, TVA',
    },
    mancano: 'Incomplètes',
    notifiche: 'Notifications',
    notificheTesto: 'Quand la réponse de Lex est prête',
    privacy: 'Confidentialité et conditions',
    esci: 'Se déconnecter',
  },
  telefono: {
    titolo: 'Sur ce téléphone',
    blocco: 'Verrouiller avec Face ID ou empreinte',
    bloccoTesto: "Demande le déverrouillage à chaque ouverture de l'app",
    offline: 'Recherches même hors ligne',
    offlineAcceso: 'Les chats, normes et notes enregistrés restent sur le téléphone',
    offlineSpento: "Désactivée : les Recherches ne s'ouvrent qu'avec une connexion",
  },
  completa: {
    sopratitolo: 'Compléter le profil',
    domanda: {
      IT: 'Êtes-vous avocat ou expert-comptable ?',
      CH: 'Êtes-vous avocat, fiduciaire ou projeteur ?',
    },
    testo: {
      IT: "Avec le profil professionnel, vous accédez aux dossiers, clients, échéances, actes et factures. Pour l'instant, il s'active sur le site.",
      CH: "Avec le profil professionnel, vous accédez aux outils de votre étude. Pour l'instant, il s'active sur le site lexum.ch.",
    },
    pulsante: 'Quel professionnel êtes-vous ?',
  },
  studio: {
    titoloCliente: 'Le portail de votre étude est sur le site',
    titoloInterno: 'Le panneau de gestion est sur le site',
    titoloStudio: 'Votre étude est aussi ici',
    titoloSito: 'Vos outils professionnels sont sur le site',
    testoMandati:
      "Dossiers, calendrier et factures sont dans le menu. Clients, documents de l'étude et statistiques restent sur {sito}.",
    testoStrumenti:
      'Calendrier et factures sont dans le menu. Clients, mandats et le reste restent sur {sito}.',
    testoProfessionista:
      'Ici, vous avez Lex, la base de données, vos recherches et vos archives. Dossiers, clients, échéances et factures restent sur {sito}.',
    testoAltri:
      'Ici, vous avez Lex, la base de données, vos recherches et vos archives. Le reste se trouve sur {sito}, avec le même compte.',
    apri: 'Ouvrir {sito}',
  },
  elimina: {
    titolo: 'Supprimer le compte',
    titoloPaese: { IT: 'Supprimer le compte italien', CH: 'Supprimer le compte suisse' },
    testo: {
      IT: "Supprime l'accès et les données en Italie",
      CH: "Supprime l'accès et les données en Suisse",
    },
  },
  ruoli: {
    user: 'Particulier',
    avvocato: 'Avocat',
    commercialista: 'Expert-comptable',
    fiduciario: 'Fiduciaire',
    progettista: 'Projeteur',
    cliente: "Client d'une étude",
    commerciale: 'Commercial',
    admin: 'Administrateur',
    altro: 'Compte professionnel',
  },
  cambioPaese: {
    titolo: 'Où voulez-vous travailler ?',
    qui: 'Vous êtes ici · base de données actuelle',
    accessoCon: 'Accès déjà créé avec {email}',
    nessunAccesso: "Pas encore d'accès",
    senzaAccesso: {
      IT: "Vous n'avez pas encore d'accès en Italie",
      CH: "Vous n'avez pas encore d'accès en Suisse",
    },
    senzaAccessoTesto: {
      IT: 'La base de données italienne a son propre compte : crédits, plan et archives sont séparés de ceux de Suisse. Il se crée en une minute, et là aussi la première recherche est gratuite.',
      CH: "La base de données suisse a son propre compte : crédits, plan et archives sont séparés de ceux d'Italie. Il se crée en une minute, et là aussi la première recherche est gratuite.",
    },
    crea: { IT: "Créer l'accès italien", CH: "Créer l'accès suisse" },
    hoAccesso: "J'ai déjà un accès : se connecter",
    stessaEmail: 'Vous pouvez utiliser le même e-mail.',
    account: { IT: 'Votre compte italien', CH: 'Votre compte suisse' },
    accountInUso: { IT: 'Votre compte italien · actuel', CH: 'Votre compte suisse · actuel' },
    piano: 'Plan',
    crediti: 'Crédits',
    pianoFino: "{piano} · jusqu'au {data}",
    rimanenteUno: '1 restant',
    rimanentiMolti: '{n} restants',
    altroPaese: "Choisissez l'autre pays pour voir son compte et y passer.",
    separato: "C'est un compte séparé : crédits, plan et archives ne passent pas d'un pays à l'autre.",
    domanda: {
      IT: 'Voulez-vous passer à la base de données juridique italienne ?',
      CH: 'Voulez-vous passer à la base de données juridique suisse ?',
    },
    passa: { IT: "Oui, passer à l'Italie", CH: 'Oui, passer à la Suisse' },
    resta: { IT: 'Rester en Italie', CH: 'Rester en Suisse' },
  },
  dueFattori: {
    titoloSpiega: 'Un code en plus du mot de passe',
    titoloAggiungi: "Reliez votre application d'authentification",
    titoloCodici: 'Enregistrez les codes de récupération',
    titoloDisattiva: 'Désactiver la vérification ?',
    titoloGestisci: 'Active',
    spiega:
      "À la connexion, en plus du mot de passe, nous vous demandons un code à 6 chiffres qui change toutes les 30 secondes. Il est généré par une application d'authentification : Google Authenticator, Microsoft Authenticator, 1Password…",
    valeSu: 'Valable aussi sur {sito}',
    stessoAccount: {
      IT: "C'est le même compte italien : le même code sert dans l'app et sur le site. Si vous l'avez déjà activée sur le site, elle est déjà active ici.",
      CH: "C'est le même compte suisse : le même code sert dans l'app et sur le site. Si vous l'avez déjà activée sur le site, elle est déjà active ici.",
    },
    attiva: 'Activer',
    passo1: "1. Ajoutez Lexum à votre application d'authentification",
    apriApp: "Ouvrir l'application d'authentification",
    trovi:
      "Dans l'application d'authentification, vous trouvez « {nome} » avec {email}. Revenez ici et saisissez le code affiché.",
    aMano: 'Ou ajoutez-le manuellement avec cette clé :',
    chiave: 'Clé : {chiave}',
    passo2: '2. Saisissez le code à 6 chiffres',
    verifica: 'Vérifier et activer',
    codiciTesto:
      "Ils vous servent si vous perdez votre téléphone. Chacun ne vaut qu'une fois. Enregistrez-les hors du téléphone, dans un endroit sûr.",
    codici: 'Codes de récupération',
    condividiTesto: 'Codes de récupération {nome} :\n{codici}',
    condividi: 'Partager ou enregistrer',
    hoSalvato: "J'ai enregistré les codes",
    attivaSu: "Active dans l'app et sur {sito}",
    chiediamo: 'À la connexion, nous vous demandons le code de « {nome} ».',
    nuoviCodici: 'Nouveaux codes de récupération',
    spegniVerifica: 'Désactiver la vérification',
    disattivaTesto: {
      IT: 'Votre compte italien ne sera protégé que par le mot de passe, aussi sur {sito}. Les codes de récupération ne seront plus valables.',
      CH: 'Votre compte suisse ne sera protégé que par le mot de passe, aussi sur {sito}. Les codes de récupération ne seront plus valables.',
    },
    spegni: 'Désactiver',
  },
  professionista: {
    testo: "Choisissez votre profil professionnel : la plateforme s'adapte à votre façon de travailler.",
    nota: 'Il se complète sur le site, avec le même compte : données de facturation et, si vous le souhaitez, les documents pour le badge de professionnel vérifié.',
    continua: 'Continuer sur {sito}',
    professioni: {
      avvocato: {
        nome: 'Avocat',
        descrizione:
          "Dossiers, audiences, délais de procédure, base de données juridique et rédaction d'actes avec Lex AI.",
      },
      commercialista: {
        nome: 'Expert-comptable',
        descrizione:
          'Mandats, échéancier fiscal, comptabilité des clients, base de données fiscale et Lex AI pour le cabinet.',
      },
      fiduciario: {
        nome: 'Fiduciaire',
        descrizione: 'Mandats, échéances fiscales, comptabilité des clients et Lex AI pour votre bureau.',
      },
      progettista: {
        nome: 'Projeteur',
        descrizione: 'Analyse des plans et vérification des normes cantonales de construction avec Lex AI.',
      },
    },
  },
  domande: {
    titolo: 'Des questions ?',
    aiuto: 'Comment pouvons-nous vous aider ?',
    frequenti: 'Questions fréquentes',
    richieste: 'Vos demandes',
    rispostaNuova: 'Nouvelle réponse',
    aperto: 'Ouvert',
    chiuso: 'Fermé',
    scrivi: 'Écrire au support',
  },
  blocco: {
    titolo: 'Lexum est verrouillée',
    testo: "Utilisez Face ID ou votre empreinte pour l'ouvrir.",
    sblocca: 'Déverrouiller',
    nota: 'Si cela ne fonctionne pas, le téléphone vous demande son code. Le verrouillage se désactive dans le Profil.',
  },
};

export const profilo = { it, de, fr };
