# Dashboard dell'avvocato sui siti: correzioni

Due patch, una per sito. Toccano solo `src/pages/avvocato/Dashboard.jsx`: niente database, niente edge function.
Fatte il 04-10-2026 su richiesta di Antonino («sistema il sito»), dopo lo studio in `docs/professionisti/dashboard.md`.

Non sono ancora sui siti: questa sessione non può scrivere nei due repo dei siti
(su `Lexumita/lexumita` manca l'accesso di Claude; su `LexumCH/lexumch` il mio branch è quello dell'app).
Si applicano pulite al `main` del 04-10-2026 e i due siti compilano (`vite build`).

## Cosa correggono

### Sito italiano (`sito-it.patch`)

- **«Pratiche che richiedono attenzione»:** prima con `.or(...)` passavano tutte le pratiche con un'udienza, anche lontana o passata. Ora solo quelle con l'udienza da oggi a fra 14 giorni.
- **«Da incassare»** e importi delle fatture scadute o in scadenza: il netto meno i pagamenti parziali e le note di credito, come la pagina Fatturazione. Le fatture già pagate del tutto non compaiono più tra le scadute.
- **«Messaggi non letti»:** la query usava colonne che `ticket_assistenza` non ha (`avvocato_id`, `cliente_id`, `ultimo_messaggio_at`, `ultimo_messaggio_autore_id`), quindi restava vuota. Ora fa come la pagina Assistenza: ticket aperti in cui l'avvocato è mittente o destinatario, con un cliente dall'altra parte, e l'ultimo messaggio è del cliente.

### Sito svizzero (`sito-ch.patch`)

- **«Oggi» e «Prossimi 7 giorni»:** la colonna è `data_ora_inizio` (`data_inizio` non esiste: le sezioni restavano vuote). Nel riassunto in alto gli appuntamenti si contano con i tipi del database (`presenza`, `videocall`, `telefonico`).
- **«Pratiche che richiedono attenzione»:** come in Italia.
- **«Da incassare»** e importi delle fatture: il totale meno i pagamenti parziali.
- **Fatture scadute:** solo quelle da pagare; prima comparivano anche le annullate.
- **Fatture in scadenza:** l'anno nel titolo viene da `anno_numerazione` (prima da `f.anno`, che non esiste).
- **«Messaggi non letti»:** come in Italia.

## Come le ho provate

- `git apply --check` sul `main` dei due siti: pulite.
- `vite build` dei due siti: riuscito.
- Le due funzioni nuove (`residuiFatture`, `messaggiNonLetti`) con un database finto: pagamenti parziali, note di credito (solo IT), ticket con l'ultima parola dell'avvocato, ticket verso Lexum, ticket chiusi.
- Non provate con i dati veri: da qui la rete non raggiunge i database.

## Come applicarle

Sito italiano, dalla radice del repo `lexumita`:

```
git apply --check <repo dell'app>/app-lexum/docs/proposte/dashboard-siti/sito-it.patch
git am <repo dell'app>/app-lexum/docs/proposte/dashboard-siti/sito-it.patch
npm ci && npm run build
```

Sito svizzero, dalla radice del repo `lexumch` sul branch `main`: lo stesso con `sito-ch.patch`.
`git am` tiene anche il messaggio del commit; `git apply` cambia solo il file.
