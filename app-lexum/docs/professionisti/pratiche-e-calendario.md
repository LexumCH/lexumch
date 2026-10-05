# Pratiche e calendario degli avvocati: come li fanno i siti

Studio del 04-10-2026, fatto in sola lettura. Riguarda il codice dei due siti, le tabelle e le regole del database.
Serve per rifarli nell'app (tappa «Studio»).
IT = `Lexumita/lexumita`, CH = `LexumCH/lexumch` branch `main`.
Le pagine CH sono quasi una copia delle IT, tradotte con i18n e con dati svizzeri.

## Nome e menù

- Per l'avvocato si chiamano **«Pratiche»**, in IT e in CH.
- «Mandati» è il nome per il commercialista (IT, «Banco di lavoro») e per il fiduciario (CH).
- Menù avvocato:
  - IT (`src/components/layouts/AvvocatoLayout.jsx`): Dashboard, Clienti, Pratiche, Fisco, Calendario, Banca dati, Ricerche, Archivio, Fatturazione, Assistenza, Studio, Profilo.
  - CH: lo stesso, senza Fisco.
- Rotte:
  - `/pratiche`, `/pratiche/nuova`, `/pratiche/:id`: solo avvocato;
  - `/calendario`: condiviso tra i professionisti (IT avvocato e commercialista; CH avvocato, fiduciario, progettista).

## Elenco pratiche (`src/pages/avvocato/Pratiche.jsx`)

- **Lettura:** tabella `pratiche`, campi `id, titolo, tipo, stato, created_at, prossima_udienza, avvocato_id, cliente:cliente_id(id,nome,cognome)`, filtro `avvocato_id in (io + membri dello studio)`.
  - Si è «studio» se `profiles.posti_acquistati > 1`.
  - I membri sono i `profiles` con `titolare_id = io`.
- **Ordine:** dal più recente (`created_at`).
- **Filtri** (oggi fatti sul telefono, dopo aver caricato tutto): ricerca su titolo o cliente, stato, avvocato (solo studio), periodo Dal/Al.
- **Stati:** `aperta` «Aperta», `chiusa` «Chiusa». È un vincolo del DB.
  - In IT il valore predefinito della colonna (`in_corso`) è rifiutato dal vincolo: l'app deve sempre mandare `stato`.
- **Nuova pratica:**
  - obbligatori: Titolo, Cliente, Tipo causa (Civile, Penale, Commerciale, Amministrativo, Lavoro, Famiglia);
  - facoltativi: note interne («Lex AI non le legge»);
  - solo studio: Avvocato principale e collaboratori;
  - solo IT: «Ore dedicate» (`ore_dedicate`); solo CH: «Prossima udienza».
  - I clienti proposti sono i `profiles` con `role='cliente'` e `avvocato_id` dell'avvocato o dello studio.

## Dettaglio pratica (`src/pages/avvocato/PraticaDettaglio.jsx`)

Sul sito è una pagina lunga, senza schede. Nell'app diventa a schede.

1. **Testata:**
   - titolo, «cliente · tipo», stato;
   - «Note interne» (`pratiche.note`);
   - «Chiudi pratica» con esito Vinta / Persa / Transatta / Archiviata (`stato='chiusa', esito`), oppure «Riapri».
2. **Dettagli:**
   - cliente (o `ragione_sociale`), tipo, data di creazione, esito, avvocato (studio);
   - IT: ore dedicate;
   - collaboratori (`pratica_collaboratori`).
3. **Controparti** (`ContropartiBox.jsx`):
   - persona fisica o giuridica, con 16 ruoli processuali;
   - anagrafica, rappresentante legale, indirizzo, contatti, legale avversario.
   - CH usa campi svizzeri: `numero_avs`, `uid`, `citta`, `cantone`, `legale_cantone_albo`, e non ha la PEC.
4. **Scadenze e udienze** (`BoxUdienzeETermini.jsx`):
   - **Termini processuali**, con urgenza:
     - scaduto, oggi o entro 3 giorni: rosso;
     - entro 7 giorni: ambra;
     - entro 30 giorni: salvia;
     - oltre: grigio.
     - Azioni: «Segna come compiuto», elimina.
   - Il nuovo termine può essere standard (`tipi_termini`, calcolato dalla funzione DB `calcola_termine`) o personalizzato.
     - Un trigger crea l'evento in calendario `tipo='scadenza'` alle 09:00.
   - **Udienze** (`UdienzaModal.jsx`):
     - stato Programmata / Svolta / Rinviata / Annullata;
     - data, ora, durata, tipo udienza, oggetto, sede (tribunale, sezione, aula, giudice), note di preparazione, esito, data di rinvio.
     - Se è programmata crea l'evento in calendario `tipo='udienza'`.
5. **Documenti:** `documenti_pratiche` (vecchia) più `archivio_documenti` con `pratica_id`.
6. **Ricerche:** `ricerche` di tipo `ricerca_ai`, `ricerca_manuale`, `chat_lex`.
7. **Note sull'esito** (`note_esito`), solo per le pratiche chiuse.
8. **Lex per la pratica** (`ChatPratica.jsx`):
   - edge function `lex-pratica` in streaming, con crediti;
   - legge pratica, controparti, udienze, documenti, ricerche (non termini né note interne);
   - gli atti diventano PDF con `salva-documento-pdf`, 1 credito per atto.
   - Atti proposti: 12 in IT, 6 in CH.
9. **Elimina pratica:**
   - bisogna riscrivere il titolo;
   - chiama l'edge function `elimina-pratica`, che risponde 409 se ci sono fatture collegate.
- Le **fatture** si collegano con `fatture.pratica_id` (da Fatturazione).

## Calendario (`src/pages/avvocato/AvvocatoCalendar.jsx`)

- **Tabella** `appuntamenti`:
  - `id, titolo, cliente_id, avvocato_id, studio_id, pratica_id, mandato_id, tipo, stato, data_ora_inizio, data_ora_fine, note_cliente, note_interne, link_videocall`;
  - **IT: `cliente_id` obbligatorio nel DB**, CH facoltativo.
- **Tipi:**
  - `presenza` «In presenza», `videocall` «Videocall», `telefonico` «Telefonico» (oro);
  - `udienza` (rosso);
  - `scadenza` (ambra).
- **Stati:** `programmato`, `concluso`, `annullato`.
- **Viste:** sul sito solo il mese, con il pannello del giorno e una tabella «Riepilogo agenda».
- **Nuovo appuntamento:**
  - titolo e data obbligatori;
  - cliente, tipo (scadenza esclusa), inizio e fine, avvocato (studio);
  - «Tribunale / Aula» per l'udienza (finisce in `note_interne`), link per la videocall, note per il cliente.
  - **Sul sito dopo non si può modificare**: si cambia solo lo stato.
- **Solo IT:** sincronizzazione con Google Calendar e «Colleghi» (`eventi_colleghi`).
- **Promemoria:**
  - edge function `genera-notifiche`, una volta al giorno: appuntamento e udienza di domani, termini a T-7 / T-3 / T-1;
  - trigger che avvisa il cliente di un nuovo appuntamento.
- **Commercialisti (IT) e fiduciari (CH)** usano lo stesso calendario e la stessa tabella. Le loro scadenze arrivano da trigger (`scadenze_mandato`, `scadenze_fiduciarie`).

## Regole d'accesso (in breve)

- IT `pratiche`: proprietario, stesso `studio_id`, admin.
- CH `pratiche`: proprietario, cliente, collaboratore, studio. Solo il proprietario cancella.
- `appuntamenti`: proprietario o studio; il cliente legge.

## Difetti trovati sui siti (da non copiare nell'app)

1. IT: `appuntamenti.cliente_id` è obbligatorio ma il modulo lo dice facoltativo: un appuntamento senza cliente viene rifiutato.
2. IT: `pratica_collaboratori` ha solo la regola di lettura, quindi aggiungere o togliere collaboratori non funziona.
3. IT: nessun trigger riempie `pratiche.studio_id`, quindi il titolare non vede le pratiche dei membri.
4. IT e CH: la regola su `appuntamenti` richiede `avvocato_id = auth.uid()`, quindi un evento assegnato a un collega può fallire.
5. CH:
   - manca il job giornaliero di `genera-notifiche`, quindi nessun promemoria;
   - la funzione cerca una colonna `luogo` che non esiste.
6. CH:
   - `tipi_termini` è vuota (funzionano solo i termini personalizzati);
   - manca il trigger che aggiorna `prossima_udienza`.
7. `genera-notifiche` controlla solo che l'header inizi con «Bearer».
8. Codice inutilizzato: `ProssimoAppuntamento.jsx` (rotto) e `BoxTerminiPratica.jsx`.

Questi punti sono anche in `docs/DA-FARE-ANTONINO.md`: si sistemano sui siti e sul backend, non da qui.
