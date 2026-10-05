# Clienti e documenti dello studio: come li fanno i siti

Studio del 04-10-2026, in sola lettura, sul codice dei due siti e sullo schema dei database.
IT = `Lexumita/lexumita`, CH = `LexumCH/lexumch` branch `main`.
Serve per rifarli nell'app («le funzioni che ci sono sul sito le dobbiamo riportare tutte», Antonino, 04-10-2026).

## Il cliente

- È un account: una riga di `profiles` con `role='cliente'` e `avvocato_id` dell'avvocato (o di un collaboratore dello studio).
- Si crea con l'edge function `create-cliente` e si modifica con `update-cliente`. L'eliminazione, la password e l'email di reset passano da `avvocato-cliente-actions`.
- **Persona fisica o giuridica** (`tipo_soggetto`). Per la giuridica `nome` è la ragione sociale e `cognome` è vuoto.
- **Obbligatori:** nome e cognome (oppure ragione sociale) ed email. L'email deve essere unica.
- **Campi Italia:**
  - `cf`, `data_nascita`, `luogo_nascita`;
  - `partita_iva` (dal 04-10-2026 anche per le persone fisiche), `sede_legale`, `rappr_nome`, `rappr_cognome`, `rappr_cf`, `rappr_carica`;
  - `email`, `telefono`, `pec`;
  - `indirizzo` (la via), `numero_civico`, `comune`, `provincia`, `cap`, `paese`;
  - fatturazione elettronica: `codice_destinatario_sdi` (6 o 7 caratteri), `pec_fatturazione`.
  - `regime_contabile` solo per i clienti dei commercialisti.
- **Campi Svizzera:**
  - `numero_avs` (persona fisica), `data_nascita`, `luogo_nascita`;
  - `uid`, `forma_giuridica`, `iva_attiva`, `sede_legale`, `rappr_*` con `rappr_avs`;
  - `email`, `telefono`; niente PEC;
  - `indirizzo`, `numero_civico`, `citta` («Località»), `cantone` (uno dei 26, vincolo nel database), `cap` («NPA»), `paese`.
- **Note iniziali** (`note_iniziali`): solo alla creazione. Il sito non le mostra mai; l'app sì, nella panoramica.
- **Portale clienti:**
  - alla creazione, la casella «Attiva accesso al portale» e una password iniziale (almeno 8 caratteri);
  - Lexum non manda mai email con la password: la comunica l'avvocato;
  - dopo, dalla scheda: «Invia email reset password» (`send-reset-email`) o «Cambia password» (`set-password`, casuale di 12 caratteri o scritta a mano).
  - Sul sito non si può attivare il portale dopo la creazione. Nell'app «Imposta una password» lo attiva: da quel momento il cliente può entrare.
- **Limite del piano:** RPC `conteggio_clienti_studio`; al 70% avviso, al 90% critico, al 100% `create-cliente` risponde `LIMITE_CLIENTI_RAGGIUNTO`. Piano scaduto: `PIANO_SCADUTO`.
- **Elimina cliente:** si riscrive il nome esatto. Cancella anagrafica, pratiche, fatture, note, appuntamenti, documenti d'archivio e messaggi; i file nello storage restano.

## La scheda del cliente (Dettaglio.jsx)

- **Panoramica:** anagrafica con «Modifica», prossimi 3 appuntamenti, accesso al portale.
- **Pratiche:** quelle del cliente; «Nuova pratica» con il cliente già scelto.
- **Documenti:** due blocchi separati:
  - **portale del cliente:** tabella `documenti`, bucket `documenti`. «Condividi» carica un file, «Rimuovi dal portale» lo toglie. Anche il cliente carica qui («Dal cliente»);
  - **archivio dello studio:** `archivio_documenti` con `cliente_id`.
- **Fisco** (solo IT): documenti fiscali e deleghe del cliente. Non è ancora nell'app.
- **Comunicazioni:** ticket (`ticket_assistenza`, `messaggi_ticket`); nuovo ticket con un titolo, chat, chiudi.
- **Note interne:** `note_interne` (`cliente_id`, `autore_id`, `testo`). Lex non le legge.
- **Pagamenti:** le fatture del cliente, «Da incassare / Incassato», «Segna pagata».

## L'archivio dello studio (Archivio.jsx)

- `archivio_documenti` con `titolare_id` dello studio: `cliente_id`, `pratica_id`, `categoria_id`, `sottocategoria_id`, `tags`, `ocr_status`, `metadati`.
- Categorie (`categorie_archivio`) e sottocategorie (`sottocategorie_archivio`): crea, rinomina, elimina. Eliminando una categoria i documenti restano senza categoria.
- Carica: bucket `archivio`, poi `process-archivio` (testo, OCR, indicizzazione) e `suggest-metadata-archivio`.
- Su ogni documento: «Assegna categoria», `AssegnaDocumento` (cliente e pratica), «Aggiungi a etichetta», anteprima, elimina (non per i PDF delle fatture).
- Visibilità: collegato a un cliente lo vede solo chi lo segue; non collegato, tutto lo studio (regola del database).

## Tutte le funzioni che collegano documenti e clienti, e dove sono nell'app

| Funzione del sito | Nell'app |
|---|---|
| Nuovo cliente, modifica, elimina | Clienti → «+»; scheda → «…» |
| Accesso al portale (password, email di reset) | scheda → Panoramica → «Accesso al portale» |
| Condividi un file nel portale, togli | scheda → Documenti → «Condividi» (dal telefono o dall'archivio del cliente) |
| Carica in archivio per il cliente (`/archivio?cliente_id=`) | scheda → Documenti → «Carica»: il cliente è già scelto |
| Carica in archivio per la pratica (`?pratica_id=`, sul sito nessun pulsante lo usa) | pratica → Documenti → «Aggiungi» → «Carica un file» o «Scansiona» |
| «Aggiungi a pratica» / «Rimuovi dalla pratica» | archivio → documento → «Cliente e pratica»; pratica → documento → «Togli dalla pratica» |
| Collega un documento già presente | scheda cliente → «Dall'archivio»; pratica → «Scegli dall'archivio» |
| Cambia categoria (sposta) | archivio → documento → «Sposta in un'altra categoria» |
| Gestisci categorie e sottocategorie | archivio → icona cartella o «+ Categoria» |
| «Salva PDF» dell'atto di Lex nella pratica | pratica → Lex → atto → «Salva come PDF nella pratica» |
| PDF della fattura archiviato | fattura → PDF: va nell'archivio, categoria «Fatture» |
| Collega o scollega una fattura a una pratica | fattura → «…» |
| «Salva in pratica» di una ricerca o di una chat | chat → «Salva» → «Collega anche a una pratica» |
| Note interne del cliente | scheda → Note |
| Messaggi con il cliente | scheda → Messaggi |
| Appuntamento con il cliente | scheda → «Fissa un appuntamento» |
| Chiedi a Lex sui clienti (`lex-assistente-studio`) | Clienti → «Chiedi a Lex sui tuoi clienti» |
| Fisco (documenti fiscali, deleghe, «Manda a Fisco»), solo IT | non ancora |

## Scelte dell'app diverse dal sito

- Una pratica porta con sé il suo cliente: collegando un documento a una pratica, il cliente diventa quello della pratica. Togliendo il cliente si toglie anche la pratica. Sul sito «Aggiungi a pratica» non tocca `cliente_id`.
- Cliente e pratica si scelgono nel modulo di caricamento. Sul sito arrivano solo dall'indirizzo, e «Aggiungi documento» della pratica non li passa.
- Condividere nel portale un documento dell'archivio: l'app copia il file dal bucket `archivio` al bucket `documenti` e scrive la riga in `documenti`. Usa solo operazioni che il sito già fa.
- In modifica restano obbligatori nome (o ragione sociale) ed email; sul sito in modifica nessun campo è controllato.
- In Svizzera l'atto di Lex resta nei documenti della pratica (`documenti_pratiche`, come `salva-documento-pdf` CH); in Italia va nell'archivio collegato alla pratica.

## Cose rotte o strane sui siti (da non copiare)

- Due tabelle per i documenti delle pratiche (`documenti_pratiche` vecchia e `archivio_documenti`) più una terza per il portale (`documenti`).
- Il pannello della pratica nella scheda cliente legge le tabelle vecchie.
- «Aggiungi documento» della pratica non collega il file alla pratica.
- Nella scheda cliente la scelta «Assegnato a» non si salva da sola.
- Il link «Vai a Pagamenti» della scheda cliente perde il cliente.
- Nell'archivio, le sentenze portano a `/sentenze/:id`, che non esiste.
- `ArchivioDettaglio` (`/archivio/:id`) non ha link e usa la vecchia colonna di testo `categoria`.
- I filtri clienti e pratiche dell'archivio ignorano i collaboratori dello studio.
- Due funzioni diverse per la password del cliente (`cliente-reset-password` e `avvocato-cliente-actions`).
- CH, Dashboard: «Oggi» e «7 giorni» filtrano `appuntamenti.data_inizio`, che non esiste (è `data_ora_inizio`); «Messaggi non letti» usa colonne che non esistono in `ticket_assistenza`.
- L'eliminazione del cliente lascia i file nello storage e, in CH, i documenti del portale.
