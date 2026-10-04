# Dashboard dei professionisti: come la fanno i siti

Studio del 04-10-2026, in sola lettura, sul codice dei due siti.
IT = `Lexumita/lexumita`, CH = `LexumCH/lexumch` branch `main`.
Sul sito la Dashboard è la prima pagina dei professionisti (`/dashboard`, `DashboardRuolo` sceglie quella del ruolo).
Nell'app è la prima voce del gruppo «Studio» nel menù; la home resta la chat con Lex.

## Chi ce l'ha

| Ruolo | Sito | App |
|---|---|---|
| Avvocato IT e CH | `src/pages/avvocato/Dashboard.jsx` (quasi uguali; CH tradotta in `avv_dashboard.json`) | sì (`src/studio/DashboardAvvocato.tsx`) |
| Commercialista IT | `src/pages/commercialista/Dashboard.jsx` | sì (`src/studio/DashboardStudio.tsx`) |
| Fiduciario CH | `src/pages/fiduciario/Dashboard.jsx` (tradotta in `fid_dashboard.json`) | sì (`src/studio/DashboardStudio.tsx`) |
| Progettista CH | `src/pages/progettista/Dashboard.jsx` (progetti e disegni) | no: nell'app il progettista non ha lo Studio |
| Admin, commerciale | pagine interne | no |

I conti stanno in `src/studio/dashboard.ts` (provati in `test/dashboard.test.tsx`).

## Avvocato

- **Intestazione:** «Buongiorno, Nome.» secondo l'ora (prima delle 6 «Buonanotte», prima delle 13 «Buongiorno», prima delle 19 «Buon pomeriggio», poi «Buonasera») e una frase su oggi: «Oggi hai 1 udienza, 2 appuntamenti. 1 fattura in attesa. 1 messaggio nuovo.», oppure «Niente in calendario per oggi…».
- **Periodo:** «Questo mese» (di base), «Mese scorso», «Ultimi 90 giorni», «Personalizzato» (da… a…). Vale solo per le pratiche chiuse e per l'incassato; il resto guarda sempre a oggi.
- **Prova gratuita scaduta:** riquadro «La tua prova gratuita è scaduta» con «Vedi i piani» (`/studio?tab=acquista`, nell'app si apre il sito) e «Dopo». Compare se `prova_gratuita_usata`, `abbonamento_scadenza` passata e nessun `piano_id`.
- **Tre contatori:** clienti (totale), pratiche aperte (adesso), pratiche chiuse nel periodo.
- **Oggi:** gli impegni di oggi con l'ora; toccando si apre la pratica, o il calendario.
- **Fatturazione:** «Incassato» nel periodo e «Da incassare» (tutto il debito attivo); sotto, le fatture scadute (fino a 5) e quelle che scadono entro 3 giorni (fino a 4).
- **Prossimi 7 giorni:** da domani, fino a 8 impegni, con il badge dei giorni («Fra 3gg»).
- **Messaggi non letti:** i ticket aperti in cui l'ultima parola è del cliente (fino a 5).
- **Pratiche che richiedono attenzione:** pratiche aperte con la prossima udienza vicina (fino a 5).
- **Badge dei giorni** (`badgeUrgenza`): passato «3gg fa» e oggi in rosso, entro 3 giorni oro, entro 7 salvia, oltre neutro.

## Commercialista (IT)

- Intestazione «Commercialista · Dashboard · Il quadro del tuo studio».
- **Cinque numeri:** clienti dello studio (RPC `conteggio_clienti_studio`), mandati attivi (`mandati`), fatturato dell'anno, incassato dell'anno, da incassare.
- **Fatture scadute:** «1 fattura scaduta da incassare · Gestisci».
- **Prossime scadenze fiscali:** le prime 8 aperte di `scadenze_mandato` (anche quelle già passate), con il tipo (IVA, LIPE, Dichiarativo, Acconti, IMU) e il mandato; portano al Banco di lavoro.
- **Prossimi appuntamenti (7 giorni):** solo quelli programmati, fino a 6.
- **Fatturazione degli ultimi 6 mesi:** una barra per mese.

## Fiduciario (CH)

- Intestazione «Studio fiduciario · Quadro generale, Nome · Anno 2026 · 2 clienti».
- **Quattro numeri:** clienti, mandati attivi, fatturato dell'anno, da incassare (rosso se c'è dello scaduto).
- **Scadenze scadute** (`scadenze_fiduciarie` in corso, data passata) in un riquadro rosso; poi **prossime scadenze** (fino a 6) e **prossimi appuntamenti** (fino a 6, senza le scadenze).
- **Fatturazione dello studio nell'anno:** fatturato, incassato, da incassare (non scaduto), scaduto, con la nota «Niente a che vedere con i conti economici dei singoli clienti».
- **Conto economico per cliente:** entrate e costi dai `movimenti` effettivi dell'anno, stipendi dei dipendenti e soci attivi (`clienti_dipendenti`, mensili × 12), saldo. Ogni cliente è a sé, mai sommato; il saldo più basso in alto, fino a 15.

## Cosa fa l'app

- Tutto quello sopra, con i dati finti. Testi tedeschi e francesi presi dal sito svizzero.
- Si apre nell'app: fatture, pratiche, messaggi, calendario. Si apre sul sito: Banco di lavoro (mandati e scadenze), clienti del fiduciario, piani.
- Gli importi sono quelli della pagina Fatture dell'app (netto, meno note di credito e pagamenti già arrivati), così le due schermate dicono gli stessi numeri.
- Le pratiche chiuse si contano con la data di chiusura (`chiusa` nell'app); sul sito con `updated_at`.
- Gli appuntamenti annullati non compaiono.

## Problemi trovati sui siti

- **IT avvocato, «Pratiche che richiedono attenzione»:** il filtro `.or(prossima_udienza.gte.oggi, prossima_udienza.lte.fra14gg)` prende tutte le date (ogni data è dopo oggi o prima di fra 14 giorni). Così compaiono anche udienze lontane o passate. Va un «e», non un «o». L'app mostra le udienze entro 14 giorni.
- **Avvocato, «Da incassare»:** somma il netto intero delle fatture aperte, anche se in parte sono già pagate o stornate da una nota di credito. La pagina Fatture dello stesso sito invece toglie pagamenti e note. L'app usa il residuo.
- **Avvocato, «Pratiche chiuse»:** conta con `updated_at`. Se si modifica una pratica chiusa (per esempio le note), la chiusura «si sposta» al giorno della modifica. Servirebbe una colonna con la data di chiusura.
- **CH avvocato:** oltre alle colonne inesistenti già note (`data_inizio`, campi di `ticket_assistenza`), tra le fatture «in scadenza» il titolo usa `f.anno`, che non esiste (il numero esce senza l'anno giusto), e tra le scadute compaiono anche le fatture annullate.
- **CH fiduciario:** il «Fatturato» conta anche le bozze (esclude solo le annullate).
- **IT commercialista:** con una nota di credito un mese può andare sotto zero e la barra prende una larghezza negativa.
