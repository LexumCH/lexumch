// Testi dell'app in italiano: sono il riferimento. Tedesco e francese (de.ts, fr.ts) hanno la stessa
// forma; quello che manca lì si mostra in italiano. In Italia l'app è sempre in italiano; in Svizzera
// la lingua si sceglie (Profilo, o quella del telefono al primo avvio).
// Registro: in italiano «tu», in tedesco «Sie» (svizzero: «ss», mai «ß»), in francese «vous».
// I segnaposto si scrivono tra graffe: {nome}.

import { interfaccia } from './sezioni/interfaccia';
import { chat } from './sezioni/chat';
import { bancaDati } from './sezioni/bancaDati';
import { ricerche } from './sezioni/ricerche';
import { archivio } from './sezioni/archivio';
import { profilo } from './sezioni/profilo';
import { studio } from './sezioni/studio';
import { fatture } from './sezioni/fatture';
import { clienti } from './sezioni/clienti';
import { documenti } from './sezioni/documenti';
import { dashboard } from './sezioni/dashboard';

export const it = {
  interfaccia: interfaccia.it,
  chat: chat.it,
  bancaDati: bancaDati.it,
  ricerche: ricerche.it,
  archivio: archivio.it,
  profilo: profilo.it,
  studio: studio.it,
  fatture: fatture.it,
  clienti: clienti.it,
  documenti: documenti.it,
  dashboard: dashboard.it,
  paesi: { IT: 'Italia', CH: 'Svizzera' },
  comune: {
    continua: 'Continua',
    avanti: 'Avanti',
    salta: 'Salta',
    indietro: 'Indietro',
    annulla: 'Annulla',
    email: 'Email',
    password: 'Password',
    accedi: 'Accedi',
    registrati: 'Registrati',
    tornaAccesso: "Torna all'accesso",
    espandi: 'Espandi',
    chiudi: 'Chiudi',
  },
  errori: {
    credenziali: 'Email o password non corretti',
    emailDaConfermare: "Prima conferma l'email: apri il link che ti abbiamo mandato.",
    giaRegistrata: "Con questa email c'è già un account: accedi.",
    passwordDebole: 'Password troppo debole: usa almeno 8 caratteri.',
    stessaPassword: 'La nuova password deve essere diversa da quella di prima.',
    emailNonValida: "L'indirizzo email non è valido.",
    troppiTentativi: 'Troppi tentativi. Riprova tra qualche minuto.',
    codiceNonValido: "Codice non valido. Controlla che l'ora del telefono sia giusta e riprova.",
    recuperoNonValido: 'Codice non valido o già usato.',
    linkScaduto: 'Il link non è più valido. Chiedine uno nuovo.',
    scriviEmailPassword: 'Scrivi email e password.',
    scriviEmail: "Scrivi l'email del tuo account.",
    nomeCognome: 'Scrivi nome e cognome.',
    minimoCaratteri: 'Minimo {n} caratteri',
    passwordDiverse: 'Le password non coincidono',
  },
  passaggio: {
    titolo: { IT: 'Passo alla banca dati italiana', CH: 'Passo alla banca dati svizzera' },
    testo: "Carico il tuo account, i crediti e l'archivio di Lexum {paese}.",
  },
  avvio: {
    paese: {
      titolo: 'Scegli il paese',
      testo: 'Ogni paese ha la sua banca dati e il suo account. Puoi cambiare quando vuoi dal Profilo.',
      gruppo: 'Paese',
      proposta: {
        IT: "Ti proponiamo l'Italia perché è il paese impostato sul telefono.",
        CH: 'Ti proponiamo la Svizzera perché è il paese impostato sul telefono.',
      },
      etichettaFonti: "{totale}. {azione} l'elenco delle fonti",
    },
    benvenuto: { sopratitolo: 'Lex AI', inizia: 'Inizia' },
    fonti: {
      sopratitolo: 'Banca dati',
      titolo: 'Ogni risposta ha ',
      titoloOro: 'la sua fonte.',
    },
    gratis: {
      sopratitolo: 'Per iniziare',
      titolo: 'La prima ricerca ',
      titoloOro: 'è gratuita.',
      testo: "Crea l'account: ti regaliamo un credito per provare Lex su un tuo caso reale.",
      scheda: 'Benvenuto',
      credito: 'credito',
      schedaTesto: 'Una domanda a Lex, con risposta completa e fonti citate.',
      spunta1: 'Banca dati: sempre gratuita',
      spunta2: 'PDF delle risposte: senza crediti',
      crea: 'Crea il tuo account',
      hoAccount: 'Ho già un account',
    },
    accesso: {
      titolo: 'Bentornato',
      testo: "Entra con l'email e la password che usi su {sito}.",
      testoAltroPaese: {
        IT: 'Entra nel tuo account italiano: email e password di {sito}.',
        CH: 'Entra nel tuo account svizzero: email e password di {sito}.',
      },
      dimenticata: 'Password dimenticata?',
      inCorso: 'Accesso in corso…',
      senzaAccount: 'Non hai un account?',
    },
    registrazione: {
      titolo: 'Crea il tuo account',
      titoloAltroPaese: {
        IT: "Crea l'accesso italiano",
        CH: "Crea l'accesso svizzero",
      },
      testo: 'La prima ricerca con Lex AI è gratuita.',
      testoAltroPaese: 'Un account separato per {paese}: anche qui la prima ricerca con Lex AI è gratuita.',
      nome: 'Nome',
      cognome: 'Cognome',
      mostra: 'Mostra la password',
      nascondi: 'Nascondi la password',
      professione: 'Professione',
      accetto: 'Accetto i ',
      termini: 'Termini di servizio',
      hoLetto: " e ho letto l'",
      privacy: 'Informativa privacy',
      fine: '.',
      inCorso: 'Registrazione in corso…',
      hoAccount: 'Hai già un account?',
    },
    codice: {
      titolo: 'Controlla la tua email',
      codiceA: 'Abbiamo mandato un codice di 6 cifre a ',
      linkA: 'Abbiamo mandato un link di conferma a ',
      apriLink: ' Aprilo da questo telefono: ti riporta nell’app, già dentro.',
      etichetta: 'Codice di conferma di 6 cifre',
      nonArrivato: 'Non è arrivato? Controlla lo spam, oppure ',
      inviaTra: 'invia di nuovo tra {tempo}',
      inviaDiNuovo: 'invia di nuovo',
      inviata: 'Email inviata di nuovo.',
      linkNellEmail: "Puoi anche toccare il link nell'email: ti riporta qui.",
      conferma: 'Conferma',
      hoConfermato: 'Ho confermato: accedi',
    },
    conferma: {
      titolo: 'Email confermata',
      testo: 'Il tuo account Lexum {paese} è attivo.',
      credito: '1 credito di benvenuto',
      creditoTesto: 'La tua prima domanda a Lex è gratuita. La Banca dati è sempre libera.',
      inizia: 'Inizia',
      oppure: '{messaggio} Oppure entra con email e password.',
      vaiAccesso: 'Vai all’accesso',
    },
    password: {
      titolo: 'Password dimenticata?',
      testo: "Scrivi l'email del tuo account Lexum {paese}: ti mandiamo un link per sceglierne una nuova.",
      invia: 'Invia link',
      inCorso: 'Invio in corso…',
      inviataTitolo: 'Email inviata',
      inviataTesto:
        "Se {email} è l'email di un account Lexum {paese}, riceverai un link per scegliere una nuova password. Toccalo: ti riporta qui.",
      nonArrivata: 'Non è arrivata? Controlla lo spam, oppure ',
      cambiaEmail: 'cambia email',
    },
    nuovaPassword: {
      titolo: 'Nuova password',
      testo: 'Scegline una di almeno {n} caratteri.',
      nuova: 'Nuova password',
      conferma: 'Conferma password',
      salva: 'Salva password',
      inCorso: 'Salvataggio…',
      attendi: 'Un momento…',
      fattoTitolo: 'Password aggiornata',
      fattoTesto: 'Da ora entri con la nuova password, qui e sul sito.',
    },
    verifica: {
      titolo: 'Verifica in due passaggi',
      testo: 'Scrivi il codice di 6 cifre della tua app di autenticazione: è lo stesso che usi su {sito}.',
      campo: 'Codice di 6 cifre',
      verifica: 'Verifica e accedi',
      perso: 'Ho perso il telefono: uso un codice di recupero',
      recuperoTitolo: 'Codice di recupero',
      recuperoTesto: 'Usa uno dei codici che hai salvato quando hai attivato la verifica.',
      recuperoAvviso:
        'Con un codice di recupero la verifica in due passaggi si spegne, qui e sul sito. Potrai riattivarla dal Profilo.',
      usaRecupero: 'Usa il codice e accedi',
      tornaCodice: "Torna al codice dell'app di autenticazione",
      spentaTitolo: 'Verifica in due passaggi spenta',
      spentaTesto:
        'Il codice di recupero è stato accettato. Per sicurezza la verifica in due passaggi si è spenta, anche su {sito}: ora il tuo account è protetto solo dalla password.',
      riattiva: 'Riattivala appena entri',
      riattivaDove: 'Profilo → Account → Verifica in due passaggi.',
      accediDiNuovo: 'Accedi di nuovo',
    },
  },
};

export type Testi = typeof it;
