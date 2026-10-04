# Da fare tu, fuori da questo repo

Lista delle cose che l'app non può fare da sola: impostazioni dei progetti Supabase, account esterni, decisioni.
La tengo aggiornata a ogni tappa. Quando una cosa è fatta, spuntala (o dimmelo e la spunto io).

Ultimo aggiornamento: 04-10-2026.

## Supabase (Italia e Svizzera)

- [ ] **Indirizzi di ritorno dei link nelle email.** In tutti e due i progetti: Authentication → URL Configuration → Redirect URLs. Aggiungi:
  - `lexum://**` per l'app installata;
  - `exp://**` solo per le prove con Expo Go (poi si può togliere).

  Senza, i link «conferma email» e «password dimenticata» aprono il sito invece dell'app. Nell'app le schermate di arrivo ci sono già: «Email confermata» e «Nuova password», e dal 04-10-2026 leggono davvero la sessione dal link (gli indirizzi sono `lexum://avvio/conferma?paese=IT` e `lexum://avvio/nuova-password?paese=IT`, o `CH`).
- [ ] **Funzione per eliminare il proprio account.** Oggi non c'è in nessuno dei due progetti: esiste solo quella per gli admin. Apple la pretende. Proposta: una edge function `elimina-account`, con controllo del JWT, che con la sessione dell'utente:
  1. cancella i suoi dati di quel paese (crediti, piano, ricerche, etichette, archivio con i file);
  2. poi cancella l'utente.

  Va fatta in IT e in CH, e ognuna cancella solo il suo paese. Nell'app la conferma (D6) è già pronta con i tuoi testi. Decidi tu cosa fare se c'è un piano ancora attivo.

  Decidi anche cosa fare con gli account professionali (avvocati, commercialisti…), che ora entrano nell'app come tutti: cancellare l'account dall'app cancellerebbe anche pratiche e clienti dello studio. Per loro «Elimina account» potrebbe rimandare al sito.
- [ ] (Solo se scegli il codice di 6 cifre, decisione aperta n. 1 del piano) cambiare il modello email di conferma.

- [ ] **Verifica in due passaggi per i privati, sul sito** (deciso il 04-10-2026). Il backend la regge già per tutti, in IT e in CH. Le due patch sono pronte e provate (build dei due siti riuscita): `docs/proposte/2fa-privati/` (`LEGGIMI.md`, `sito-it.patch`, `sito-ch.patch`). Aggiungono il riquadro 2FA al Profilo dei privati, come quello dei professionisti. Testi: in Svizzera gli stessi dei professionisti, in it/de/fr; in Italia un testo nuovo da approvare (nel LEGGIMI). Nota: in IT la tabella `mfa_backup_codes` non ha una policy di DELETE, quindi «Disattiva 2FA» lascia i vecchi codici nel database (succede già oggi per tutti).

## Siti e backend: problemi trovati studiando l'area professionisti (04-10-2026)

Dettagli in `docs/professionisti/fatture.md` e `docs/professionisti/pratiche-e-calendario.md`. Si sistemano sui siti e sul backend, non da qui.

- [x] **Fattura italiana:** dal 04-10-2026 c'è l'XML FatturaPA (`genera-fattura-xml`), da caricare su «Fatture e Corrispettivi» o da dare al commercialista. Nell'app: «XML FatturaPA» nel dettaglio della fattura.
- [ ] **Invio diretto allo SDI:** oggi l'XML si scarica e si carica a mano. Se vuoi l'invio automatico serve un intermediario.
- [x] **Dati di fatturazione del professionista:** dal 04-10-2026 si scrivono nel Profilo dei due siti (IT: cassa, regime, numero civico, paese, SDI; CH: numero civico, paese, Cantone, QR-IBAN, IVA sì/no, numero IDI). L'app ha gli stessi campi e controlli.
- [x] **Marca da bollo (IT):** dal 04-10-2026 il sito e il trigger la gestiscono (2 € sopra 77,47 € senza IVA). Nell'app l'interruttore si accende da solo, come sul sito.
- [x] **Cliente italiano:** codice destinatario SDI, PEC di fatturazione e P.IVA anche per le persone fisiche sono nel modulo cliente dal 04-10-2026 (sito e app).
- [ ] **QR-fattura svizzera:** non conforme agli indirizzi «S» (obbligatori dal 21.11.2025), paese fisso «CH», IBAN preso dal profilo e non dalla fattura, niente QR-IBAN.
- [ ] **Fiduciari (CH):** vedono «Fatturazione», ma `crea-fattura` accetta solo gli avvocati. Nell'app il fiduciario ha Fatture: con i dati veri gli darebbe errore finché la funzione non accetta anche il suo ruolo.
- [ ] **Commercialisti (IT):** sul sito vedono il calcolatore forense, che per loro non vale (servirebbe il DM 140/2012). Nell'app non lo vedono.
- [x] **IVA svizzera:** dal 04-10-2026 chi non è assoggettato fattura senza IVA (trigger `trg_fatture_iva_assoggettamento`). Attenzione: `iva_attiva` di base è «no», quindi chi non lo imposta nel Profilo fattura senza IVA.
- [x] **Ritenuta d'acconto (IT):** dal 04-10-2026 `aggiorna_stato_fattura` confronta i pagamenti con il netto, meno le note di credito. App e sito ora fanno lo stesso conto.
- [ ] **Calendario IT:** il DB vuole sempre il cliente in un appuntamento, ma il modulo lo dice facoltativo.
- [ ] **Promemoria CH:** manca il job giornaliero di `genera-notifiche`, e la funzione cerca una colonna `luogo` che non esiste.
- [ ] **Collaboratori di pratica (IT):** mancano le regole per aggiungerli o toglierli; `pratiche.studio_id` non viene riempito.

## Clienti e documenti dello studio: problemi trovati sui siti (04-10-2026)

Dettagli in `docs/professionisti/clienti-e-documenti.md`. Nell'app sono già evitati; sul sito restano:

- [ ] «Aggiungi documento» della pratica porta all'Archivio senza `?pratica_id`: il file caricato non finisce nella pratica.
- [ ] «Aggiungi a pratica» nell'Archivio non imposta il cliente della pratica.
- [ ] Nella scheda cliente il pannello della pratica legge le tabelle vecchie (`documenti_pratiche`, `note_interne` come ricerche).
- [ ] Scheda cliente: «Assegnato a» non si salva da solo; «Vai a Pagamenti» perde il cliente; le note iniziali non si vedono mai.
- [ ] Il portale non si può attivare dopo la creazione del cliente. Nell'app «Imposta una password» lo attiva: va bene così?
- [ ] Archivio: le sentenze portano a `/sentenze/:id`, che non esiste; i filtri per cliente e pratica ignorano i collaboratori.
- [ ] Dashboard CH: «Oggi», «7 giorni» e «Messaggi non letti» usano colonne che non esistono (`data_inizio`, `ticket_assistenza.avvocato_id`…), quindi restano vuoti.
- [ ] Elimina cliente: i file restano nello storage; in CH restano anche i documenti del portale (`documenti`).
- [ ] Due funzioni diverse per la password del cliente (`cliente-reset-password` e `avvocato-cliente-actions`): conviene tenerne una.

## Sentry (segnalazione dei crash)

- [ ] **Account e progetto.** Crea l'account su sentry.io scegliendo la **regione dati europea**, poi un progetto «React Native».
- [ ] **Chiavi per le build EAS:**
  - `EXPO_PUBLIC_SENTRY_DSN`: la DSN del progetto. Senza, Sentry resta spento e l'app funziona uguale.
  - `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` (questo come segreto), per collegare i crash al codice.
  - Finché non ci sono, metti `SENTRY_DISABLE_AUTO_UPLOAD=true`, se no la build può fermarsi.
- [ ] **Privacy.** Aggiorna l'informativa e le schede privacy degli store: Sentry riceve i dati tecnici dei crash. Niente IP, email o testi delle chat: l'app li toglie prima di mandare.

## Store e build (servono per la tappa 7, ma vanno decisi prima)

- [ ] **Identificativo dell'app** per iOS e Android, per esempio `com.lexum.app`. È per sempre, quindi lo scegli tu.
- [ ] **Account:** Apple Developer, Google Play Console e Expo (per EAS).
- [ ] **Icona dell'app** 1024×1024, senza trasparenza (per iPhone). Oggi c'è quella predefinita di Expo; lo splash usa già l'emblema.
- [ ] **«Condividi in Lexum» su iPhone.** L'estensione di condivisione ha un identificativo suo (per esempio `com.lexum.app.share`) e un «App Group» per passare il file all'app. Si registrano nell'account Apple Developer insieme all'identificativo dell'app: te li preparo io quando c'è.
- [x] **Frase di Face ID**, approvata il 03-10-2026: «Lexum usa Face ID per proteggere le tue ricerche e i tuoi documenti.» È già in `app.json`.

## Prove sul telefono

Con `npx expo start` e l'app Expo Go: inquadri il QR e l'app si apre sul telefono. Cosa guardare:
- [ ] tasto «indietro» di Android: chiude fogli e menù, poi torna indietro;
- [ ] tastiera di iPhone nella chat e nei moduli (accesso, registrazione): non deve coprire il campo;
- [ ] citazioni dentro il testo delle risposte (i riquadri «L. 241/1990, art. 25»): allineate e toccabili;
- [ ] testo grande: Impostazioni → Accessibilità → Dimensioni testo, poi scorri le schermate;
- [ ] modalità aereo: deve comparire la striscia «Sei senza connessione».

## Testi

- [ ] **Tedesco e francese del resto dell'app** (tappa 2). Partirò dai testi del sito (`public/locales/`). Per le frasi nuove dell'app (accesso, errori, elenchi vuoti) servirà la tua traduzione o approvazione.
- [ ] **Rileggi tedesco e francese dell'avvio e dell'accesso** (04-10-2026): `src/lingue/de.ts` e `src/lingue/fr.ts`. Una parte viene da `public/locales/*/auth.json` del sito svizzero, una parte è nuova. Nuove anche:
  - le fonti svizzere in tedesco e francese nella scelta del paese e nel benvenuto (riprese dalla home di lexum.ch);
  - le fonti italiane in tedesco e francese, che si vedono solo su un telefono in quelle lingue (`src/paesi/contenuti.ts`, in fondo).

  Il benvenuto A0–A3 è quello che avevi già approvato.
- [ ] **Rileggi tedesco e francese del resto dell'app** (04-10-2026): sezioni in `src/lingue/sezioni/` (interfaccia, chat, Banca dati, Ricerche, Archivio, Profilo, Studio, Fatture, Clienti, Documenti). Dove il sito svizzero aveva già il testo, è quello. Le scelte su cui ho più dubbi:
  - nomi: «Dossiers» per Pratiche (de e fr), «Kanzlei» / «Étude» per Studio, «Mandant» per cliente, «Recherchen» / «Recherches», «Archiv» / «Archives»;
  - fatture: «steuerbefreit» / «exonérée» per «esente» (per la legge svizzera «non assoggettato» ed «escluso» non sono «befreit»), «Nettobetrag» / «Montant net» per «imponibile»;
  - chat: il saluto «Hallo» / «Bonjour»; «chat» al maschile in francese; la domanda d'esempio «Bis wann kann ich die Steuerveranlagung anfechten?» (in Svizzera si dice spesso «Einsprache erheben»);
  - Banca dati: «Normen» / «Normes» per «Norme» (il sito usa anche «Erlasse»), «Arrêt» per sentenza;
  - Profilo: «Upgrade» / «Changer de plan», «Steuerberater» ed «Expert-comptable» per commercialista, «Projeteur» per progettista.
  - Clienti e documenti (04-10-2026): «Mandant», «Mandantenportal», «AHV-Nummer», «UID-Nummer», «PLZ» dal sito; nuovi «Gespräche» / «Conversations» per i messaggi e «Akte von Lex» / «Acte de Lex» per l'atto preparato da Lex.
- [ ] **Motivo d'esenzione IVA (CH) sul PDF:** nel database si salva in italiano; sul PDF va scritto nella lingua del professionista? Oggi l'app lo mostra tradotto.
- [x] Domande frequenti, conferma «Elimina account» e benvenuto svizzero: inseriti come nel tuo documento (`docs/testi/`).
- [ ] **Rileggi le risposte di prova delle domande d'esempio** (`src/dati-finti/chat.ts`). Sono finte, ma citano articoli veri e qualcuno le vedrà nelle anteprime:
  - Italia: legittima difesa (c.p. artt. 52 e 55), cauzione dell'affitto (L. 392/1978 art. 11, c.c. art. 1590, D.Lgs. 28/2010 art. 5), multa arrivata tardi (C.d.S. artt. 201–204-bis, D.Lgs. 150/2011 art. 7);
  - Svizzera: legittima difesa (CP artt. 15 e 16), garanzia dell'affitto (CO art. 257e, CPC art. 197), decreto d'accusa (CPP art. 354).

  Dalla tappa 3 le risposte le scrive Lex: queste servono solo finché non c'è.

## Facoltativo

- [ ] **Link universali** (indirizzi `https://www.lexum.it/...` che aprono direttamente l'app). Servono due file sui siti, `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json`, che dipendono dall'identificativo e dalla firma dell'app. Non sono indispensabili: i link `lexum://` bastano. Te li preparo quando ci sono gli identificativi.
- [ ] **Prove automatiche su GitHub a ogni PR.** Serve un file in `.github/workflows/`, che sta fuori da `app-lexum/` e quindi non posso aggiungerlo io. Se lo vuoi, te lo preparo.
