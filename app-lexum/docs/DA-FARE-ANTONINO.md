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

- [ ] **Fattura italiana:** il sito fa solo un PDF, senza XML FatturaPA né invio allo SDI. Decidi se chiamarlo «avviso di parcella / pro forma» oppure collegare un intermediario SDI. Nell'app, sotto ogni fattura italiana, oggi c'è scritto: «Il PDF non è una fattura elettronica: non passa dal Sistema di Interscambio (SDI).»
- [ ] **Colonne che mancano per i dati di fatturazione** (l'app ha già la schermata «Dati di fatturazione» con questi campi):
  - IT, professionista: la cassa di previdenza (TC01 Cassa Forense, TC04 CNPADC), il numero civico separato dalla via;
  - CH, professionista: numero civico separato, paese (CH o LI), sapere se l'IBAN è un QR-IBAN; `iva_attiva` c'è ma non è usato;
  - le altre colonne ci sono già in `profiles` (`partita_iva`, `cf`, `indirizzo`, `cap`, `comune`/`citta`, `provincia`, `iban`, `regime_fiscale`, `uid`): va solo controllato che l'utente possa scriverle con la sua sessione.
- [ ] **Marca da bollo (IT, forfettari):** sopra 77,47 € va il bollo da 2 €; oggi né il sito né il trigger lo aggiungono. Nell'app per ora c'è solo l'avviso.
- [ ] **Dati fiscali dei professionisti:** le colonne ci sono in `profiles`, ma nel Profilo di avvocati e commercialisti non c'è il campo per scriverle (controllato il 04-10-2026).
  - IT: P.IVA, codice fiscale e indirizzo si scrivono solo in `/verifica`, la pagina del privato prima di diventare professionista (servono a Lexum per fatturargli l'abbonamento). L'IBAN ha il campo solo nel Profilo del commerciale. Il regime fiscale non ha campo: tutti hanno il valore predefinito RF01.
  - Nel DB IT: 6 avvocati e 1 commercialista, nessuno con P.IVA, codice fiscale, indirizzo o IBAN.
  - Effetto: `genera-fattura-pdf` prende questi dati dal profilo e, se sono vuoti, salta le righe. Le fatture escono senza P.IVA, codice fiscale e indirizzo dello studio.
  - CH: indirizzo, IBAN e numero IVA non hanno nessuna schermata.
- [ ] **Cliente italiano:** il codice destinatario SDI e la PEC di fatturazione non sono nel modulo cliente; la P.IVA c'è solo per le persone giuridiche.
- [ ] **QR-fattura svizzera:** non conforme agli indirizzi «S» (obbligatori dal 21.11.2025), paese fisso «CH», IBAN preso dal profilo e non dalla fattura, niente QR-IBAN.
- [ ] **Fiduciari (CH):** vedono «Fatturazione», ma `crea-fattura` accetta solo gli avvocati. Nell'app il fiduciario ha Fatture: con i dati veri gli darebbe errore finché la funzione non accetta anche il suo ruolo.
- [ ] **Commercialisti (IT):** sul sito vedono il calcolatore forense, che per loro non vale (servirebbe il DM 140/2012). Nell'app non lo vedono.
- [ ] **IVA svizzera:** l'8.1% si applica anche a chi non è assoggettato (`iva_attiva` non usato).
- [ ] **Ritenuta d'acconto (IT):** se il cliente paga il netto, il trigger lascia la fattura «in attesa» per un residuo pari alla ritenuta. Nell'app la fattura passa a «pagata» quando arriva il netto: il trigger andrebbe allineato.
- [ ] **Calendario IT:** il DB vuole sempre il cliente in un appuntamento, ma il modulo lo dice facoltativo.
- [ ] **Promemoria CH:** manca il job giornaliero di `genera-notifiche`, e la funzione cerca una colonna `luogo` che non esiste.
- [ ] **Collaboratori di pratica (IT):** mancano le regole per aggiungerli o toglierli; `pratiche.studio_id` non viene riempito.

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
- [x] Domande frequenti, conferma «Elimina account» e benvenuto svizzero: inseriti come nel tuo documento (`docs/testi/`).
- [ ] **Rileggi le risposte di prova delle domande d'esempio** (`src/dati-finti/chat.ts`). Sono finte, ma citano articoli veri e qualcuno le vedrà nelle anteprime:
  - Italia: legittima difesa (c.p. artt. 52 e 55), cauzione dell'affitto (L. 392/1978 art. 11, c.c. art. 1590, D.Lgs. 28/2010 art. 5), multa arrivata tardi (C.d.S. artt. 201–204-bis, D.Lgs. 150/2011 art. 7);
  - Svizzera: legittima difesa (CP artt. 15 e 16), garanzia dell'affitto (CO art. 257e, CPC art. 197), decreto d'accusa (CPP art. 354).

  Dalla tappa 3 le risposte le scrive Lex: queste servono solo finché non c'è.

## Facoltativo

- [ ] **Link universali** (indirizzi `https://www.lexum.it/...` che aprono direttamente l'app). Servono due file sui siti, `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json`, che dipendono dall'identificativo e dalla firma dell'app. Non sono indispensabili: i link `lexum://` bastano. Te li preparo quando ci sono gli identificativi.
- [ ] **Prove automatiche su GitHub a ogni PR.** Serve un file in `.github/workflows/`, che sta fuori da `app-lexum/` e quindi non posso aggiungerlo io. Se lo vuoi, te lo preparo.
