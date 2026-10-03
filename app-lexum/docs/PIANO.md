# Piano di costruzione

Stato al 03-10-2026: i mockup sono stati rivisti da Antonino. Si comincia dalla tappa 1.

## Tappe

- [x] **1. Scheletro.**
  - Expo + TypeScript + expo-router.
  - Solo il tema Notte, con colori e caratteri presi da `docs/mockup/tela/lexum.css`.
  - Componenti base: intestazione, compositore della chat, chip, riga, foglio dal basso, menù laterale con le etichette.
  - Tutte le schermate dei mockup navigabili, con dati finti.
  - È finita quando `npx expo start --web` mostra l'app e ci si muove come in `docs/mockup/anteprima/`.

- [ ] **2. Paesi e accesso.**
  - Registro dei paesi costruito da `docs/paesi.json`, con un client Supabase per paese.
  - Scelta del paese al primo avvio.
  - Accesso e registrazione con email e password, come sul sito.
  - Cambio paese da Profilo, con anteprima del conto e conferma.
  - Se manca l'account in quel paese: crealo o accedi.
  - In Svizzera, scelta della lingua (it/de/fr). I testi vengono da `public/locales/` di `LexumCH/lexumch`.
  - È finita quando si entra con un account IT e uno CH e si passa dall'uno all'altro senza rifare l'accesso.

- [ ] **3. Lex.**
  - Chat con `lex-lead` in streaming, come nel sito: `src/pages/avvocato/BancaDati.jsx` di `Lexumita/lexumita` (la parte RicercaAI).
  - Fasi di attesa mentre Lex lavora.
  - Una citazione apre un foglio con la fonte; da lì la legge si apre sopra la chat.
  - Saldo dei crediti preso dal database. Crediti finiti → foglio con il rimando al sito.
  - PDF con `lex-impagina`.
  - La chat in corso sopravvive alla chiusura dell'app.

- [ ] **4. Ricerche.**
  - Salva la chat con un'etichetta, nello stesso formato del sito.
  - Elenco delle ricerche e delle etichette, anche nel menù laterale.
  - Chat sull'etichetta con `lex-etichetta`.
  - «Nuova chat» avvisa se la chat in corso non è salvata.

- [ ] **5. Banca dati.**
  - Ricerca per parole e navigazione per fonte, con un adattatore per paese:
    - IT: codici, leggi e decreti, giurisprudenza, tributario, prassi, UE;
    - CH: federale, cantonale, giurisprudenza, prassi, UE, Corte EDU.
  - Dettaglio di norma, sentenza e prassi.

- [ ] **6. Archivio, Domande, Profilo.**
  - Archivio: spazio usato, categorie con «+ Categoria», caricamento.
  - Scansione con lo scanner del telefono: produce un PDF, che usa lo stesso caricamento.
  - Domande: ticket di assistenza.
  - Profilo: «Crediti e piano», con «Aggiungi crediti» e «Fai upgrade» che aprono il sito.
  - Profilo: dati, notifiche, elimina account.

- [ ] **7. Rifiniture.**
  - Notifica «risposta pronta».
  - Prove sul telefono.
  - Build EAS.

## Numeri delle fonti: provvisori

I numeri nella scelta del paese e nel benvenuto (per esempio «oltre 4,2 milioni», «oltre 1,8 milioni») sono provvisori, perché altre sessioni stanno ancora aggiornando il corpus. Nel codice tienili tutti in un solo file di configurazione (per esempio `src/paesi/numeri.ts`), così alla fine si aggiornano in un punto solo. Non sparpagliarli nelle schermate.

## Decisioni ancora aperte (le prende Antonino)

1. **Codice di 6 cifre via email** al posto del link di conferma. Richiede di cambiare il modello email di Supabase.
2. **Ricerca unica su tutta la Banca dati.** Oggi il sito cerca sezione per sezione, quindi serve una funzione nuova sul backend.
3. **Notifica «risposta pronta».** Serve una funzione che mandi le notifiche push.
4. **Pulsanti d'acquisto su iPhone.** «Aggiungi crediti» e «Fai upgrade» portano al sito. Apple, negli store italiano e svizzero, potrebbe chiedere di toglierli. Per questo vanno tenuti dietro un interruttore, così si possono nascondere solo nella versione iPhone senza toccare il resto.
