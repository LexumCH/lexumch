# 2FA nel profilo dei privati (ruolo `user`)

Due patch, una per sito. Aggiungono la verifica in due passaggi (app di autenticazione) al profilo dei privati.
Oggi il riquadro c'è solo nei profili dei professionisti e dell'admin.
Il backend è già pronto per tutti i ruoli. Le patch toccano solo il frontend.
Non sono applicate a nessun repo. Niente commit, niente push.

## Cosa cambia

### Sito italiano (`sito-it.patch`)

- `src/components/sicurezza/BoxSicurezza2FA.jsx`: nuova prop facoltativa `descrizioneSpento`.
  È il testo mostrato quando la 2FA è spenta.
  Il valore predefinito è il testo di oggi, quindi i profili professionali non cambiano.
- `src/pages/user/Profilo.jsx`: il riquadro "Sicurezza accesso" compare dopo "Cambia password".
  Usa un testo pensato per i privati (vedi sotto).

### Sito svizzero (`sito-ch.patch`)

- `src/pages/user/Profilo.jsx`: stesso blocco "Sicurezza" del profilo avvocato, dopo "Cambia password".
  Legge `mfa_attivo` e `mfa_attivato_at` da `profiles`.
  Chiede il numero di codici rimasti a `mfa-backup-codes` (action `status`).
  Attiva con `ModalAttiva2FA`, mostra i codici con `ModalBackupCodes`, rigenera e disattiva.
- `public/locales/{it,de,fr}/user_profilo.json`: nuove chiavi `sicurezza.*`, copiate da `avv_profilo.json`.
- Due piccole differenze dal profilo avvocato:
  - se `mfa_attivato_at` è vuoto si vede "—" al posto di una data del 1970;
  - nel ciclo dei fattori la variabile si chiama `fattore`, perché `f` nel file è già usato.
- Nessuna registrazione nuova di namespace.
  `comp_modal_attiva_2fa` e `comp_modal_backup_codes` sono già in `src/lib/testi/elenco-ns.js`.
  Le due modali caricano il loro namespace da sole con `useTranslation`, come già fanno per avvocati e admin.

## Come applicare

Sito italiano, dalla radice del repo `lexumita`:

```
git apply --check <repo dell'app>/app-lexum/docs/proposte/2fa-privati/sito-it.patch
git apply <repo dell'app>/app-lexum/docs/proposte/2fa-privati/sito-it.patch
npm ci && npm run build
```

Sito svizzero, dalla radice del repo del sito (`origin/main`):

```
git apply --check <repo dell'app>/app-lexum/docs/proposte/2fa-privati/sito-ch.patch
git apply <repo dell'app>/app-lexum/docs/proposte/2fa-privati/sito-ch.patch
npm ci && npm run build
```

## Cosa ho provato

Tutto su copie in una cartella temporanea, non sui repo.

- Sito italiano
  - `git apply --check` sulla copia originale: passa.
  - `npm ci`: ok. `npm run build`: ok (vite + pagine SEO). Solo il solito avviso sui chunk grandi.
  - Non c'è uno script di lint né ESLint nel progetto.
  - `npm run testi:controlla`: ok. Controlla solo i 13 file della vetrina, non questi due.
  - Prova di render (jsdom, Supabase finto): la pagina dei privati mostra il riquadro con il testo nuovo.
    Senza prop il riquadro mostra ancora il testo sui clienti.
    Con 2FA attiva: "Attivo", data, 2 codici con avviso, "Disattiva 2FA". Dopo "Disattiva" torna "Non attivo".
- Sito svizzero
  - `git apply --check` su `origin/main`: passa. Passa anche sul branch `claude/eager-dirac-rifnpd`.
  - `npm ci`: ok. `npm run build`: ok. Solo il solito avviso sui chunk grandi.
  - Non c'è uno script di lint né uno che controlla le traduzioni.
  - `npm run testi:elenco`: ok, 99 namespace, nessuna lingua con file mancanti, `elenco-ns.js` invariato.
  - Tutte le 51 chiavi usate dalla pagina esistono in it, de e fr.
  - Prova di render (jsdom, Supabase finto) in it, de e fr: nessuna chiave grezza a schermo.
    Con 2FA attiva: badge, data, "2 su 10 disponibili" (e de/fr), avviso codici quasi esauriti.
    Dopo "Disattiva": "Non attivo" e di nuovo il bottone "Attiva 2FA".
- Non ho provato l'attivazione vera con un account reale (serve il database).

## Testi da approvare

### Sito italiano: un testo nuovo

Mostrato ai privati quando la 2FA è spenta:

> Aggiungi un secondo fattore: all'accesso, oltre alla password, ti chiediamo il codice della tua app di autenticazione.

Gli altri testi del riquadro sono quelli che vedono già i professionisti ("Sicurezza accesso", "Attiva 2FA", "Ne restano pochi: rigenerali per non restare fuori dall'account.", ecc.).

### Sito svizzero: nessun testo cambiato

Nessuna chiave `sicurezza.*` parla di clienti o di studio. Le ho copiate identiche da `avv_profilo.json`.
Sono nuove solo nel file `user_profilo.json`. Eccole, per controllo:

| Chiave | it | de | fr |
|---|---|---|---|
| `titolo` | Sicurezza | Sicherheit | Sécurité |
| `due_fattori` | Autenticazione a due fattori (2FA) | Zwei-Faktor-Authentifizierung (2FA) | Authentification à deux facteurs (2FA) |
| `attiva_dal` | Attiva dal {{data}}. Al login ti verrà chiesto un codice dall'app autenticatore. | Aktiv seit {{data}}. Beim Login werden Sie nach einem Code aus der Authenticator-App gefragt. | Active depuis le {{data}}. Lors de la connexion, un code de l'application d'authentification vous sera demandé. |
| `descrizione` | Proteggi il tuo account con un codice generato da app come Google Authenticator, Authy o 1Password. | Schützen Sie Ihr Konto mit einem Code aus Apps wie Google Authenticator, Authy oder 1Password. | Protégez votre compte avec un code généré par des applications comme Google Authenticator, Authy ou 1Password. |
| `attivo` | Attivo | Aktiv | Actif |
| `non_attivo` | Non attivo | Nicht aktiv | Inactif |
| `codici_recupero` | Codici di recupero | Wiederherstellungscodes | Codes de récupération |
| `codici_disponibili` | {{n}} su 10 disponibili | {{n}} von 10 verfügbar | {{n}} sur 10 disponibles |
| `codici_quasi_esauriti` | Codici quasi esauriti — rigenerali per sicurezza. | Codes fast aufgebraucht — generieren Sie sie zur Sicherheit neu. | Codes presque épuisés — régénérez-les par sécurité. |
| `rigenero` | Rigenero… | Wird neu generiert… | Régénération… |
| `rigenera` | Rigenera codici | Codes neu generieren | Régénérer les codes |
| `errore_generico` | Errore | Fehler | Erreur |
| `attiva_2fa` | Attiva 2FA | 2FA aktivieren | Activer la 2FA |
| `disattivo` | Disattivo… | Wird deaktiviert… | Désactivation… |
| `disattiva_2fa` | Disattiva 2FA | 2FA deaktivieren | Désactiver la 2FA |
| `conferma_rigenera` | Rigenerare i codici di recupero? I codici precedenti diventeranno invalidi. | Wiederherstellungscodes neu generieren? Die bisherigen Codes werden ungültig. | Régénérer les codes de récupération ? Les codes précédents deviendront invalides. |
| `conferma_disattiva` | Disattivare il 2FA? Il tuo account sarà meno sicuro. | 2FA deaktivieren? Ihr Konto wird dadurch weniger sicher. | Désactiver la 2FA ? Votre compte sera moins sécurisé. |

## Nota: policy RLS di `mfa_backup_codes` (sito italiano)

Nel progetto italiano la tabella `mfa_backup_codes` ha solo una policy RLS di SELECT.
Quindi il `delete()` lato client in "Disattiva 2FA" non cancella niente: i codici vecchi restano nel database.
Succede già oggi, per tutti i ruoli. La patch non lo corregge.
Nel progetto svizzero invece c'è la policy `mfa_codes_own` (tutte le operazioni sulle proprie righe): lì il `delete()` funziona.
Per il sito italiano basterebbe una policy di DELETE sulle proprie righe, come in Svizzera: è una modifica al database, la decide Antonino.

## Da sapere

- Sito italiano: il riquadro ha il titolo grande ("Sicurezza accesso", stile `font-display`), come nei profili professionali.
  Gli altri blocchi del profilo dei privati usano l'etichetta piccola (`section-label`). Si nota un po'.
- Sito svizzero: il blocco usa invece lo stesso stile degli altri blocchi del profilo.
- I codici di recupero sono 10: lo dice la funzione `mfa-backup-codes` (letta nel progetto italiano), quindi il testo «su 10» del sito svizzero è giusto.
