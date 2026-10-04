# Lexum app: istruzioni per Claude

## Con chi lavori
- Il titolare è Antonino. Scrivigli SEMPRE in italiano, anche nei resoconti, con frasi brevi e concrete.
- A una domanda sì/no rispondi subito, poi al massimo una riga di spiegazione.
- Quando ti serve una sua decisione, scrivi la domanda in fondo, in una riga sola.
- Non dire mai «fatto» se non l'hai provato davvero: di' cosa hai provato e cosa no.

## Cos'è questo repo
È l'app nativa di Lexum per iPhone e Android. È separata dal sito: nessun codice in comune, la duplicazione è voluta.

È per i privati. La home è la chat con Lex, l'AI giuridica. Il menù in alto a sinistra apre:
- Banca dati
- Ricerche
- Archivio
- Domande
- Profilo

Sotto le voci, il menù mostra le etichette dell'utente (non uno storico delle chat). Non c'è una voce «Acquisti».

Per i professionisti il menù ha in più il gruppo «Studio» (deciso da Antonino il 04-10-2026):
- avvocati: Pratiche, Calendario, Fatture;
- commercialisti e fiduciari: per ora solo Calendario e Fatture;
- progettisti: niente.

Il resto degli strumenti professionali (clienti, mandati, documenti dello studio, statistiche) resta sul sito, e l'app ci rimanda.

È un'app sola per più paesi. Oggi ce ne sono due:
- Italia: lexum.it, database IT;
- Svizzera: lexum.ch, database CH.

Ogni paese ha il suo database, i suoi account, i suoi crediti, piani, archivio e lingue. Per aggiungere un paese basta aggiungere una voce al registro.

## Design
- I mockup sono ancora in revisione con Antonino.
  - Anteprima da cliccare: `docs/mockup/anteprima/index.html`. Aprila nel browser e si naviga come nell'app.
  - Tela: https://claude.ai/artifact/U4X5hL1BAvKhQWA6T7bmjx. I sorgenti sono in `docs/mockup/tela/`.
- La fonte per colori, caratteri e componenti è `docs/mockup/tela/lexum.css`:
  - colori: petrolio #0B1F2A, oro #C9A45C, salvia #7FA39A, nebbia #F4F7F8;
  - caratteri: Cormorant Garamond per i titoli, Outfit per il testo;
  - angoli vivi, cioè raggio 0;
  - un solo tema: «Notte», scuro, petrolio e oro. Niente tema chiaro.
- Ogni elemento toccabile misura almeno 44 px. Niente barra di stato finta e niente emoji nell'interfaccia.

## Tecnologia
- Expo (ultimo SDK stabile), React Native, TypeScript, expo-router.
- @supabase/supabase-js, con la sessione salvata sul telefono.
- Si prova con `npx expo start --web` nel browser e con Expo Go sul telefono. Le build iOS e Android si fanno con EAS, non in questo ambiente.
- Dati veri o finti: con `EXPO_PUBLIC_DATI=veri` l'app usa i database dei paesi (`src/backend/`); senza, usa i dati finti. L'anteprima web, l'elenco delle schermate e le prove automatiche restano sempre con i dati finti.
- Account di prova: li dà Antonino in chat. Mai scriverli nel repo.

## Dove sta il codice (dalla tappa 1)
- `src/app/`: le schermate (expo-router). La chat è la home (`chat.tsx`); le voci del menù si aprono sopra di lei.
- `src/componenti/`: i componenti base (intestazione, compositore, chip, riga, foglio dal basso, menù laterale…).
- `src/fogli/`: i fogli dal basso delle schermate (fonte citata, salva, crediti finiti, cambio paese…).
- `src/tema/`: colori e caratteri di `lexum.css`.
- `src/paesi/`: registro dei paesi (da `docs/paesi.json`), testi per paese, numeri provvisori delle fonti (`numeri.ts`).
- `src/stato/`: stato dell'app (paese attivo, conto, chat in corso) e menù.
- `src/backend/`: collegamento ai database dei paesi (client per paese, accesso, paese salvato sul telefono).
- `src/dati-finti/`: i dati finti della tappa 1. Si tolgono man mano che arrivano i dati veri.
- `src/studio/`: regole e pezzi dello Studio dei professionisti (date, campi, fatture, calcolatore della parcella); lo stato è in `src/stato/Studio.tsx`.
- `src/anteprima/`: solo per il browser, la sagoma del telefono e l'elenco delle schermate per la revisione.
- `src/lingue/`: i testi dell'app in italiano (`it.ts`, il riferimento), tedesco e francese; nelle schermate `const { t } = useTesti()`. In Italia sempre italiano, in Svizzera la lingua scelta.
- `src/testi/`: testi approvati da Antonino (domande frequenti, «Elimina account»), anche in tedesco e francese. Le fonti sono in `docs/testi/`: non cambiarli senza di lui.
- `src/errori.ts`: messaggi d'errore white-label, la stessa regola di `sanitizzaErrore.js` del sito.
- `src/sentry.ts`: segnalazione dei crash, accesa solo con `EXPO_PUBLIC_SENTRY_DSN`.
- `src/config.ts`: interruttori (per esempio `mostraAcquisti`, decisione aperta n. 4).
- `test/` (Jest) e `e2e/` (Playwright): le prove automatiche.
- Prima di aprire una PR: `npm run check` (TypeScript, ESLint, Prettier, Jest) e `npm run test:e2e` (percorsi nel browser).
- Quando serve qualcosa che può fare solo Antonino (Supabase, account, decisioni), aggiungilo a `docs/DA-FARE-ANTONINO.md`.

## Paesi: il cuore dell'architettura
- Il registro sta in `src/paesi/` e si costruisce da `docs/paesi.json`. Per ogni paese contiene:
  - URL Supabase e chiave pubblica (publishable);
  - sito, valuta, lingue;
  - fonti della Banca dati e professioni.
- Ogni paese ha il suo client Supabase, con la sessione salvata a parte (una chiave di storage per paese). Il paese attivo si salva sul telefono.
- Al primo avvio si sceglie il paese; l'app propone quello della regione del telefono.
- Il cambio di paese si fa da Profilo → «Paese e banca dati»:
  1. si sceglie l'altro paese;
  2. se lì sei già entrato, vedi l'anteprima del conto (piano, crediti, archivio) e la domanda «Vuoi passare al database legale svizzero?»;
  3. se rispondi sì, l'app si ricarica su quel paese;
  4. se lì non hai un accesso, lo crei oppure accedi (anche con la stessa email).
- Crediti, piani e archivio non passano mai da un paese all'altro.

## Backend: si usa, non si tocca
- Da questo repo NON si modificano database, policy o edge function dei due progetti Supabase. L'app usa solo quello che usa già il sito, con la sessione dell'utente (RLS).
- Il codice del sito sta nei repo a cui hai accesso: Italia `Lexumita/lexumita`, Svizzera `LexumCH/lexumch` (branch `main`). `docs/sito/LEGGIMI.md` dice quali file guardare (chat di Lex, etichette, archivio, crediti, ticket). Prima di scrivere codice leggi lì come si chiamano tabelle e funzioni: non indovinare. Sono solo da LEGGERE: non si modificano.
- Le funzioni principali:
  - `lex-lead`: la chat di Lex, in streaming SSE;
  - `lex-etichetta` e `lex-confronta`;
  - `analizza-documento`, `process-archivio` e `search-archivio`;
  - `lex-impagina`: il PDF delle risposte;
  - `lex-crediti-gate`: c'è solo in CH;
  - `stripe-checkout` NON si usa nell'app.
- Se ti serve qualcosa che il backend non ha, fermati e scrivilo come proposta: lo fa Antonino da un'altra parte.

## Regole di prodotto già decise
- **Acquisti dentro il Profilo:** mai pagamenti nell'app. Il Profilo ha il blocco «Crediti e piano»:
  - crediti disponibili, con il pulsante «Aggiungi crediti»;
  - piano attuale, con il pulsante «Fai upgrade».

  Entrambi i pulsanti aprono la pagina acquisti del sito del paese. Si paga lì con lo stesso account, e al ritorno saldo e piano si aggiornano da soli. Il contatore dei crediti nell'intestazione porta al Profilo.
- **Ordine del Profilo:**
  1. intestazione;
  2. «Paese e banca dati»;
  3. solo in Svizzera, la lingua dell'app (italiano, Deutsch, français), che cambia tutti i testi;
  4. «Crediti e piano»;
  5. account (per chi fattura, anche «Dati di fatturazione»);
  6. «Su questo telefono»: blocco con Face ID o impronta e Ricerche anche senza rete, tutti e due spenti finché l'utente non li accende;
  7. la parte «Completa il profilo / Che professionista sei?», che rimanda al sito;
  8. ultimo, in un riquadro suo, «Elimina account».

  (Punti 6 e 8 decisi da Antonino il 03-10-2026.)

  Nel menù il Profilo non ha badge.
- **Archivio:** categorie con il pulsante «+ Categoria».

  «Scansiona» usa lo scanner documenti già presente nel telefono (VisionKit su iPhone, ML Kit su Android, per esempio con `react-native-document-scanner-plugin`), che produce un PDF. Il PDF segue lo stesso caricamento di un file normale. Il riconoscimento del testo dei PDF scansionati esiste già sul server (`extract-pdf-text` / `process-archivio`, fino a 20 MB), sia IT sia CH: non va creato niente sul backend.
- **Chat:** funziona come sul sito.
  - La chat in corso resta sul telefono finché non la salvi o non ne apri una nuova.
  - Aprire una fonte o una legge NON chiude la chat: si apre sopra, e «indietro» torna alla chat.
  - Si conserva solo salvandola in Ricerche con un'etichetta (tabelle `ricerche` + `elementi_etichette`), così app e computer mostrano le stesse cose.
  - «Nuova chat» avvisa se quella in corso non è salvata.
- **Banca dati e crediti:** la ricerca per parole nella Banca dati è gratuita. Le domande a Lex usano crediti; alla registrazione se ne riceve 1 di benvenuto.
- **Funzioni del telefono** (decise da Antonino il 03-10-2026):
  - «Condividi in Lexum»: i file condivisi da altre app vanno in Archivio;
  - blocco con Face ID o impronta: si accende dal Profilo, spento di base;
  - Ricerche anche senza rete: si sceglie dal Profilo, spenta di base;
  - gestione delle etichette come sul sito;
  - verifica in due passaggi con un'app di autenticazione, la stessa del sito: un fattore per account di paese, lo stesso codice vale su app e sito (`supabase.auth.mfa` e `mfa-backup-codes`).
- **Accesso per tutti** (deciso da Antonino il 03-10-2026): nell'app entra chiunque abbia un account del sito, privato o professionista (avvocato, commercialista, fiduciario, progettista, cliente di uno studio, admin). Stesse schermate, mai un errore «non sei un utente». Un professionista trova nel menù il suo Studio e in Profilo il rimando al resto sul sito. I ruoli e gli strumenti di ognuno sono in `src/ruoli.ts`.
- **Fatture, due processi** (dal 04-10-2026): Italia e Svizzera fatturano in modo diverso, anche nel database.
  - Italia: CPA (o contributo integrativo) 4% sull'imponibile, IVA 22% su imponibile + CPA, ritenuta 20% sull'imponibile se il cliente è sostituto d'imposta. Calcolatore della parcella solo per gli avvocati.
  - Svizzera: IVA 8,1% sull'imponibile oppure esente con il motivo; data o periodo della prestazione obbligatori; QR-fattura.
  - Le regole stanno in `src/studio/fatturazione.ts` e `src/studio/calcoli.ts`; il calcolatore in `src/studio/parametri-forensi/` è una copia del sito: se il sito cambia, va aggiornato.
  - Senza i dati di fatturazione del professionista o quelli del cliente, la nuova fattura non parte e dice cosa manca.
- **Elimina account:** deve esistere nell'app, perché Apple lo pretende.
- **White-label:** nei messaggi d'errore non compaiono mai nomi di fornitori AI (OpenAI, Anthropic, Mistral), modelli o indirizzi tecnici. Si mostra un messaggio generico.

## Come lavori qui
- L'app vive nel repo `LexumCH/lexumch`, ma SOLO nel branch `app-lexum` e dentro la cartella `app-lexum/`. Il branch `main` di quel repo pubblica il sito svizzero: mai push, merge o PR verso `main`, e mai file fuori da `app-lexum/`.
- Per ogni tappa: un branch che parte da `app-lexum` (per esempio `app-lexum-tappa-1`), poi una PR VERSO `app-lexum` che spiega cosa fa, come si prova e cosa manca.
- Niente segreti nel repo: solo le chiavi pubbliche di `docs/paesi.json`.
- Segui `docs/PIANO.md` in ordine e spunta la tappa quando la sua PR è pronta.
