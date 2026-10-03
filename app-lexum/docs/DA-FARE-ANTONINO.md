# Da fare tu, fuori da questo repo

Lista delle cose che l'app non può fare da sola: impostazioni dei progetti Supabase, account esterni, decisioni.
La tengo aggiornata a ogni tappa. Quando una cosa è fatta, spuntala (o dimmelo e la spunto io).

Ultimo aggiornamento: 03-10-2026.

## Supabase (Italia e Svizzera)

- [ ] **Indirizzi di ritorno dei link nelle email.** In tutti e due i progetti: Authentication → URL Configuration → Redirect URLs. Aggiungi:
  - `lexum://**` per l'app installata;
  - `exp://**` solo per le prove con Expo Go (poi si può togliere).

  Senza, i link «conferma email» e «password dimenticata» aprono il sito invece dell'app. Nell'app le schermate di arrivo ci sono già: «Email confermata» e «Nuova password».
- [ ] **Funzione per eliminare il proprio account.** Oggi non c'è in nessuno dei due progetti: esiste solo quella per gli admin. Apple la pretende. Proposta: una edge function `elimina-account`, con controllo del JWT, che con la sessione dell'utente:
  1. cancella i suoi dati di quel paese (crediti, piano, ricerche, etichette, archivio con i file);
  2. poi cancella l'utente.

  Va fatta in IT e in CH, e ognuna cancella solo il suo paese. Nell'app la conferma (D6) è già pronta con i tuoi testi. Decidi tu cosa fare se c'è un piano ancora attivo.
- [ ] (Solo se scegli il codice di 6 cifre, decisione aperta n. 1 del piano) cambiare il modello email di conferma.

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

## Facoltativo

- [ ] **Link universali** (indirizzi `https://www.lexum.it/...` che aprono direttamente l'app). Servono due file sui siti, `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json`, che dipendono dall'identificativo e dalla firma dell'app. Non sono indispensabili: i link `lexum://` bastano. Te li preparo quando ci sono gli identificativi.
- [ ] **Prove automatiche su GitHub a ogni PR.** Serve un file in `.github/workflows/`, che sta fuori da `app-lexum/` e quindi non posso aggiungerlo io. Se lo vuoi, te lo preparo.
