# Dove guardare nel codice del sito (solo da leggere)

I due siti stanno nei repo a cui la sessione ha accesso, sul branch `main`:
- Italia: `Lexumita/lexumita`, solo in italiano.
- Svizzera: `LexumCH/lexumch`, in italiano, tedesco e francese. I testi sono in `public/locales/`.

Il codice su GitHub può essere un po' indietro rispetto al Mac di Antonino, ma la struttura è quella.

I file da cui partire (stessi percorsi nei due repo):
- **Chat di Lex:** `src/pages/avvocato/BancaDati.jsx`, componente RicercaAI. Chiama `lex-lead` in streaming.
- **Etichette e ricerche:** `src/components/AggiungiAEtichetta.jsx`, `src/pages/user/Ricerche.jsx`, `src/pages/user/EtichettaDettaglio.jsx`.
- **Crediti e menù dell'area privati:** `src/components/layouts/UserLayout.jsx`.
- **Archivio:** `src/pages/avvocato/Archivio.jsx`, `src/lib/archivio.js`, `src/components/ScegliDaArchivio.jsx`.
- **Accesso:** `src/context/AuthContext.jsx` e `src/pages/auth/`.
- **Crediti finiti:** `src/components/PacchettoLampo.jsx`.
- **Solo in CH:** i nomi delle istituzioni svizzere (it/de/fr) in `src/lib/istituzioni.js`, la protezione degli errori in `src/lib/sanitizzaErrore.js`.

Non si modificano e non si importano nell'app: l'app ha il suo codice.
