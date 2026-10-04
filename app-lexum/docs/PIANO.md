# Piano di costruzione

Stato al 03-10-2026: i mockup sono stati rivisti da Antonino. Si comincia dalla tappa 1.

## Tappe

- [x] **1. Scheletro.**
  - Expo + TypeScript + expo-router.
  - Solo il tema Notte, con colori e caratteri presi da `docs/mockup/tela/lexum.css`.
  - Componenti base: intestazione, compositore della chat, chip, riga, foglio dal basso, menù laterale con le etichette.
  - Tutte le schermate dei mockup navigabili, con dati finti.
  - È finita quando `npx expo start --web` mostra l'app e ci si muove come in `docs/mockup/anteprima/`.

  - Aggiunte del 03-10-2026, con dati finti:
    - schermate Accedi, Password dimenticata, Nuova password, Email confermata;
    - domande frequenti vere e conferma «Elimina account» (testi in `docs/testi/`);
    - stati di errore, attesa, elenco vuoto e senza connessione;
    - Sentry, spento finché non c'è la chiave;
    - prove automatiche (Jest e Playwright).
  - Aggiunte del 03-10-2026 (sera), con dati finti:
    - domande d'esempio d'uso comune (legittima difesa, affitto, multa), ognuna con la sua risposta;
    - etichette di Ricerche colorate come sul sito; «+ Etichetta» con nome e colore;
    - «Confronta»: da 2 a 3 elementi affiancati e le quattro richieste a Lex del sito;
    - chat salvata aperta da Ricerche in una schermata sua, con «indietro» e «Continua la chat».
  - Ritocchi chiesti da Antonino (03-10-2026, notte), con dati finti:
    - domande d'esempio svizzere diverse da quelle italiane: affitto, tasse, lavoro;
    - domande d'esempio della home più leggere (testo più piccolo, bordo tenue);
    - «Cambia paese» parte dal paese in cui sei, con l'anteprima del tuo account; scegliendo l'altro si vede il suo;
    - «Elimina account» è l'ultimo riquadro del Profilo, sotto «Completa il profilo»;
    - «+» di Ricerche apre «Nuova ricerca» (appunti scritti a mano), come sul sito.
  - Funzioni del telefono scelte da Antonino (03-10-2026), per ora solo da vedere, con dati finti:
    - Profilo → «Su questo telefono»: blocco con Face ID o impronta e Ricerche anche senza rete, spenti di base;
    - schermata «Lexum è bloccata» (F1) e Ricerche senza rete, chiusa o letta dalla copia sul telefono (F2, F3);
    - «Gestisci etichette» in Ricerche: nome, colore, elimina, come sul sito;
    - Archivio: foglio «Salva in Archivio» per un file arrivato da «Condividi in Lexum».
  - Verifica in due passaggi, come sul sito (03-10-2026), per ora solo da vedere: schermata del codice all'accesso (A10) e foglio per attivarla e gestirla dal Profilo.
  - Accesso di un avvocato (A11) con le stesse schermate, senza errori; nel suo Profilo il rimando agli strumenti professionali sul sito.

- [ ] **2. Paesi e accesso.**
  - Per prima cosa: spostare tutti i testi in file di traduzione (it/de/fr). Quelli già tradotti sono in `docs/testi/`.
  - Registro dei paesi costruito da `docs/paesi.json`, con un client Supabase per paese.
  - Scelta del paese al primo avvio.
  - Accesso e registrazione con email e password, come sul sito; password dimenticata e conferma email con i link `lexum://` (le schermate ci sono già).
  - Cambio paese da Profilo, con anteprima del conto e conferma.
  - Se manca l'account in quel paese: crealo o accedi.
  - In Svizzera, scelta della lingua (it/de/fr). I testi vengono da `public/locales/` di `LexumCH/lexumch`.
  - Accesso per tutti i ruoli dei siti (`profiles.role`: user, cliente, avvocato, commercialista, commerciale, admin; in CH anche fiduciario e progettista). Stesse schermate per tutti; nessun ruolo viene respinto e non compare mai un errore «non sei un utente». Il sito manda ogni ruolo alla sua area, l'app no: un professionista trova in Profilo il rimando ai suoi strumenti sul sito. Da verificare: da dove il sito legge crediti e piano per i professionisti (può essere diverso dai privati), e che le tabelle usate dall'app (ricerche, etichette, archivio) rispondano anche per loro.
  - Verifica in due passaggi all'accesso, come `Verifica2FA` del sito: codice di 6 cifre dell'app di autenticazione (`supabase.auth.mfa.challengeAndVerify`) oppure codice di recupero (funzione `mfa-backup-codes`, «verify», che spegne la verifica). È la stessa del sito: lo stesso codice vale su app e sito, un fattore per account di paese.
  - È finita quando si entra con un account IT e uno CH e si passa dall'uno all'altro senza rifare l'accesso.
  - Fatto il 04-10-2026, da provare con gli account veri (la rete di questo ambiente blocca i due database):
    - [x] un client per paese con la sessione salvata sul telefono (`src/backend/client.ts`);
    - [x] interruttore `EXPO_PUBLIC_DATI=veri`: senza, l'app resta con i dati finti (anteprima e prove);
    - [x] accesso, verifica in due passaggi (codice o codice di recupero), registrazione (in Italia con la professione, in Svizzera con la lingua), password dimenticata e nuova password, conferma email (`src/backend/accesso.ts`);
    - [x] ruolo, nome ed email letti dal profilo; il paese attivo resta sul telefono e all'avvio si rientra da soli;
    - [ ] prova con i quattro account di prova (privato e avvocato, IT e CH);
    - [x] lingue: `src/lingue/` (italiano di riferimento, tedesco e francese; quello che manca si mostra in italiano). Al primo avvio la lingua e il paese proposto vengono dal telefono;
    - [x] tradotte: scelta del paese, benvenuto, fonti, prima domanda, accesso, registrazione, conferma email, password, verifica in due passaggi, passaggio di paese, messaggi d'errore dell'accesso;
    - [ ] da tradurre: chat, menù, Banca dati, Ricerche, Archivio, Domande, Profilo, fogli, Studio.

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
  - Nuova etichetta (nome e colore) nella tabella `etichette`, come `ModaleNuovaEtichetta` del sito.
  - Confronto di 2 o 3 elementi con `lex-confronta`, come `PannelloConfronto` del sito (le schermate ci sono già).
  - Gestione etichette come `ModaleGestioneEtichette` del sito: nome, colore, elimina (le schermate ci sono già).
  - Etichette di un elemento: aggiungerne o toglierne più d'una, come `AggiungiAEtichetta` del sito (nell'app oggi un elemento ha una sola etichetta).
  - Ricerche anche senza rete: copia sul telefono di chat, norme e appunti salvati, solo se l'utente la accende dal Profilo (spenta di base). Spegnendola, la copia si cancella.
  - «Nuova chat» avvisa se la chat in corso non è salvata.

- [ ] **5. Banca dati.**
  - Ricerca per parole e navigazione per fonte, con un adattatore per paese:
    - IT: codici, leggi e decreti, giurisprudenza, tributario, prassi, UE;
    - CH: federale, cantonale, giurisprudenza, prassi, UE, Corte EDU.
  - Dettaglio di norma, sentenza e prassi.

- [ ] **6. Archivio, Domande, Profilo.**
  - Archivio: spazio usato, categorie con «+ Categoria», caricamento.
  - Scansione con lo scanner del telefono: produce un PDF, che usa lo stesso caricamento.
  - «Condividi in Lexum»: da Mail, WhatsApp o File un documento va in Archivio, con lo stesso caricamento (per esempio con `expo-share-intent`, da verificare con l'SDK). Funziona solo con la build EAS, non in Expo Go.
  - Domande: ticket di assistenza.
  - Profilo: «Crediti e piano», con «Aggiungi crediti» e «Fai upgrade» che aprono il sito.
  - Profilo: dati, notifiche, elimina account (serve la funzione del backend: `docs/DA-FARE-ANTONINO.md`).
  - Profilo → Account → «Verifica in due passaggi», come `ModalAttiva2FA` e `BoxSicurezza2FA` del sito: attiva (`mfa.enroll`, link `otpauth://` che apre l'app di autenticazione, oppure la chiave), codici di recupero (`mfa-backup-codes` «generate» e «regenerate»), spegni (`mfa.unenroll`).
  - Profilo → «Su questo telefono»: blocco con Face ID o impronta (`expo-local-authentication`), spento di base. Quando è acceso, l'app chiede lo sblocco all'apertura e quando torna in primo piano.

- [ ] **Studio dei professionisti** (chiesto da Antonino il 04-10-2026). Le schermate ci sono, con i dati finti; studio dei siti in `docs/professionisti/`.
  - Chi vede cosa (`src/ruoli.ts`): l'avvocato ha Pratiche, Calendario e Fatture; commercialista e fiduciario per ora solo Calendario e Fatture (Antonino sta rivedendo i loro mandati); il progettista nessuno.
  - [x] Pratiche: elenco, dettaglio a schede (panoramica, scadenze e udienze, controparti, documenti, ricerche, Lex), nuova pratica, chiusura con esito.
  - [x] Calendario: agenda e mese, dettaglio dell'evento, nuovo appuntamento e modifica.
  - [x] Fatture: numeri dell'anno, scadenzario, dettaglio con pagamenti (anche parziali), PDF, annulla.
  - [x] Nuova fattura a passi, con due processi: Italia (CPA o contributo integrativo 4%, IVA 22%, ritenuta 20%, regime forfettario) e Svizzera (IVA 8,1% o esente con il motivo, data o periodo della prestazione, QR-fattura).
  - [x] Calcolatore della parcella (solo Italia, solo avvocati): lo stesso motore del sito (DM 55/2014, tabelle 2022), copiato in `src/studio/parametri-forensi/`.
  - [x] «Dati di fatturazione» nel Profilo: senza quelli, e senza i dati del cliente, la fattura non parte e l'app dice cosa manca.
  - [ ] Dati veri: tabelle `pratiche`, `controparti`, `termini_processuali`, `udienze`, `appuntamenti`, `fatture`, `righe_fattura`, `pagamenti_fattura`; edge function `crea-fattura` e `genera-fattura-pdf`; RPC `genera_numero_fattura`. I totali li calcolano i trigger del database.
  - [ ] Prima dei dati veri servono le decisioni e le correzioni lato sito in `docs/DA-FARE-ANTONINO.md` (fattura elettronica IT, QR-fattura CH, colonne mancanti, fiduciari).

- [ ] **7. Rifiniture.**
  - Notifica «risposta pronta».
  - Prove sul telefono.
  - Build EAS, con le chiavi di Sentry.

## Idee per dopo

- **Bozza della lettera dalla risposta di Lex** (diffida, ricorso, opposizione). Sul sito `lex-genera-documento` oggi si usa solo negli strumenti per i professionisti (`ChatPratica`, `ChatMandato`, `GeneraDocumentoProgetto`), non nella Banca dati. Prima di metterla nell'app va verificato se e come funziona per i privati.

## Numeri delle fonti: provvisori

Nell'app si mostra solo il totale di ogni paese («oltre 4,2 milioni», «oltre 1,8 milioni»), mai il numero esatto delle singole fonti: per le fonti solo il nome e cosa contengono (deciso da Antonino il 04-10-2026). Il totale è provvisorio, perché altre sessioni stanno ancora aggiornando il corpus: sta solo in `src/paesi/numeri.ts`, così si aggiorna in un punto solo. Non sparpagliarlo nelle schermate.

## Cose da fare fuori dal repo

Sono in `docs/DA-FARE-ANTONINO.md` (Supabase, Sentry, store, prove sul telefono).

## Decisioni ancora aperte (le prende Antonino)

1. **Codice di 6 cifre via email** al posto del link di conferma. Richiede di cambiare il modello email di Supabase.
2. **Ricerca unica su tutta la Banca dati.** Oggi il sito cerca sezione per sezione, quindi serve una funzione nuova sul backend.
3. **Notifica «risposta pronta».** Serve una funzione che mandi le notifiche push.
4. **Pulsanti d'acquisto su iPhone.** «Aggiungi crediti» e «Fai upgrade» portano al sito. Apple, negli store italiano e svizzero, potrebbe chiedere di toglierli. Per questo vanno tenuti dietro un interruttore, così si possono nascondere solo nella versione iPhone senza toccare il resto.
