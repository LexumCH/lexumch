# Fatturazione dei professionisti: come la fanno i siti

Studio del 04-10-2026, fatto in sola lettura. Riguarda il codice dei due siti, le edge function `crea-fattura`, `genera-fattura-pdf` ed `elimina-fattura`, e lo schema del database.
IT = `Lexumita/lexumita`, CH = `LexumCH/lexumch` branch `main`. Il CH è un clone adattato dell'IT.

## In breve

- **Italia: il sito non produce una fattura valida per il fisco.** Fa solo un PDF intitolato «FATTURA», senza XML FatturaPA e senza invio allo SDI. Dal 2024 la fattura elettronica è obbligatoria anche per i forfettari: oggi quel PDF vale al massimo come avviso di parcella (pro forma).
- **I dati fiscali del professionista non si possono inserire dal suo Profilo.** P.IVA, codice fiscale, indirizzo, IBAN e regime fiscale si compilano solo nella fase «privato» (`/verifica`), prima di diventare professionista. Nel DB IT 0 avvocati e commercialisti su 7 li hanno. In CH le colonne `indirizzo`, `cap`, `citta`, `iban`, `uid` esistono ma non hanno nessuna schermata.
- **Svizzera: la QR-fattura c'è nel codice, ma non scatta mai e non è conforme.**
  - Non scatta perché mancano IBAN e indirizzo del professionista.
  - Usa gli indirizzi di tipo «K», che dal 21.11.2025 non sono più accettati.
  - Mette «CH» fisso come paese, anche per il cliente.
  - Prende l'IBAN del profilo, non quello scritto nella fattura.
  - Non supporta il QR-IBAN.
- **Svizzera:** `crea-fattura` accetta solo il ruolo `avvocato`: i fiduciari vedono «Fatturazione» ma non possono creare fatture.

## Flusso sul sito (IT e CH quasi uguali)

- Rotte: `/fatturazione`, `/fatturazione/nuova`, `/fatturazione/:id`.
- **Elenco**, a schede Panoramica / Fatture / Scadenzario:
  - numeri principali dell'anno: fatturato, incassato, da incassare, scaduto;
  - filtri per stato, cliente, anno e date.
- **Stati** (`fatture_stato_check`): `in_attesa`, `pagata`, `scaduta`, `annullata`.
  - «Scaduta» si calcola: `in_attesa` con la scadenza passata.
  - Non esiste uno stato «bozza»: «Salva bozza» assegna già il numero definitivo.
- **Nuova fattura**, in questo ordine:
  1. cliente (obbligatorio) e pratica;
  2. date di emissione e di scadenza (predefinita: +30 giorni);
  3. righe: descrizione, quantità, prezzo;
  4. parte fiscale;
  5. pagamento (metodo e IBAN);
  6. note pubbliche e note interne.
- **Dettaglio:**
  - registra un pagamento, anche parziale (`pagamenti_fattura`); un trigger porta la fattura a «pagata»;
  - genera, scarica e rigenera il PDF (bucket `fatture`);
  - annulla; elimina (edge `elimina-fattura`, va confermato scrivendo il numero);
  - collega o scollega la pratica.
  - **Non esistono:** modifica, invio al cliente, nota di credito, duplica.
- **Numerazione:**
  - RPC `genera_numero_fattura(p_studio_id, p_anno)`, numeri `F-AAAA-NNN`, contatore per studio e anno;
  - possono restare buchi dopo un'eliminazione o un errore.

## Calcoli

**Italia.** Li fa il trigger DB `ricalcola_totali_fattura`, nell'ordine:
1. imponibile = somma delle righe;
2. CPA 4% sull'imponibile;
3. IVA 22% su (imponibile + CPA);
4. ritenuta 20% sull'imponibile, se scelta;
5. lordo = imponibile + CPA + IVA;
6. netto = lordo − ritenuta.

Le percentuali si possono cambiare in ogni fattura.

Non gestiti:
- spese generali 15% automatiche (le aggiunge solo il calcolatore, come riga);
- bollo da 2 €;
- regime forfettario;
- spese anticipate esenti (art. 15);
- split payment, esigibilità IVA, natura IVA per le operazioni a 0%.

**Calcolatore (solo IT): «Calcola parcella — parametri forensi».**
- Base normativa: DM 55/2014 aggiornato dal DM 147/2022, tabelle 2022.
- File: `src/components/avvocato/CalcolaParcellaModal.jsx`, `src/lib/parametriForensi/{engine,catalogo,tabelle}.js`.
- Input:
  - competenza (circa 40 voci);
  - valore della causa o scaglione;
  - fasi, a livello minimo, medio o massimo;
  - aumenti e riduzioni (art. 4);
  - spese generali 15%.
- Output: le righe della fattura.
- Sono funzioni pure: si portano nell'app così come sono.
- 8 tabelle penali sono segnate con «confidenza media» (fonte secondaria).

**Svizzera.** Trigger `ricalcola_totali_fattura_ch`:
- imponibile = somma delle righe;
- IVA = imponibile × aliquota (8.1% predefinita), oppure 0 se esente con motivo;
- totale = imponibile + IVA.

Non c'è CPA e non c'è ritenuta. In più:
- `profiles.iva_attiva` non viene usato: oggi l'8.1% si applica anche a chi non è assoggettato;
- non c'è arrotondamento ai 5 centesimi;
- la valuta è solo CHF;
- il PDF è sempre in italiano.

## I commercialisti (IT) e i fiduciari (CH)

- **IT:** stessa fatturazione degli avvocati (stesse tabelle e funzioni). Però:
  - il calcolatore forense compare anche a loro, ma non vale per loro (per loro servirebbe il DM 140/2012);
  - per loro la «CPA» è il contributo integrativo CNPADC.
- **CH:** i fiduciari vedono «Fatturazione», ma `crea-fattura` ed `elimina-fattura` li respingono. Il PDF dice sempre «Studio Legale» e «Avv.».

## Dati di fatturazione: cosa c'è e cosa manca

**Italia, professionista.**
- Ci sono come colonne di `profiles`, ma non si possono modificare dal Profilo del professionista:
  - `partita_iva`, `cf`;
  - `indirizzo`, `cap`, `comune`, `provincia`;
  - `iban`;
  - `regime_fiscale` (predefinito RF01; il commercialista ci scrive «forfettario / ordinario»).
- Mancano: la nazione; il tipo di cassa (TC01 Cassa Forense, TC04 CNPADC).
- Si modificano già dal Profilo: foro, numero albo, PEC.

**Italia, cliente.**
- Ci sono: CF, indirizzo, PEC.
- La P.IVA c'è solo per le persone giuridiche: un professionista o una ditta individuale non la può inserire.
- Il **codice destinatario SDI** e la PEC di fatturazione esistono come colonne, ma non sono nel modulo cliente.
- Mancano: la nazione; i dati per la pubblica amministrazione (codice ufficio, split payment, CIG e CUP).

**Italia, documento.** Mancano:
- tipo documento (TD01, TD06 parcella, TD04 nota di credito);
- esigibilità e natura IVA;
- bollo;
- tipo e causale della ritenuta;
- nota di credito.

**Svizzera, professionista.**
- Le colonne `indirizzo`, `cap`, `citta`, `iban`, `uid` e `iva_attiva` esistono, ma non c'è nessuna schermata per inserirle.
- Mancano: il paese; numero civico e via separati (servono per la QR «S»); il QR-IBAN.
- Il numero IVA va stampato come «CHE-… IVA», non come «IDE».

**Svizzera, cliente.** Manca il paese.

**Svizzera, documento.** Mancano:
- la data o il periodo della prestazione (obbligatoria per l'art. 26 LIVA);
- la valuta EUR;
- il PDF in tedesco e francese.

## Altri problemi

- IT: se il cliente paga al netto della ritenuta, la fattura resta «in attesa» per un residuo pari alla ritenuta.
- L'eliminazione è sempre possibile, anche dopo il PDF: in IT crea buchi nella numerazione.
- Il portale cliente non permette di scaricare il PDF della fattura.

## Per l'app

- **Si fa nell'app:**
  - elenco con scadenzario;
  - dettaglio, con «Registra pagamento» e «Apri o condividi il PDF»;
  - nuova fattura a passi, con un controllo che blocca se mancano i dati del professionista o del cliente;
  - calcolatore IT come schermata a sé;
  - «Dati di fatturazione» nel Profilo.
- **Resta sul sito:** elimina, ricerca con Lex, grafico a 12 mesi.
- **Si usano le stesse edge function** (`crea-fattura`, `genera-fattura-pdf`); i totali li calcolano i trigger del DB.
- **Decisioni prima dei dati veri:**
  - IT: chiamare il documento «avviso di parcella / pro forma», oppure collegare un intermediario SDI per l'XML;
  - CH: correggere la QR-fattura.
