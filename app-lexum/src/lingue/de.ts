import type { Traduzione } from './tipi';
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

// Deutsch (Schweiz): «Sie», «ss» statt «ß». Wo es den Text schon auf lexum.ch gibt
// (public/locales/de/auth.json), ist er übernommen; der Rest ist neu und wartet auf Antoninos Freigabe.
// Benvenuto A0–A3: genehmigte Texte aus docs/testi/domande-e-benvenuto.md.

export const de: Traduzione = {
  interfaccia: interfaccia.de,
  chat: chat.de,
  bancaDati: bancaDati.de,
  ricerche: ricerche.de,
  archivio: archivio.de,
  profilo: profilo.de,
  studio: studio.de,
  fatture: fatture.de,
  clienti: clienti.de,
  documenti: documenti.de,
  dashboard: dashboard.de,
  paesi: { IT: 'Italien', CH: 'Schweiz' },
  comune: {
    continua: 'Weiter',
    avanti: 'Weiter',
    salta: 'Überspringen',
    indietro: 'Zurück',
    annulla: 'Abbrechen',
    email: 'E-Mail',
    password: 'Passwort',
    accedi: 'Anmelden',
    registrati: 'Registrieren',
    tornaAccesso: 'Zurück zur Anmeldung',
    espandi: 'Mehr anzeigen',
    chiudi: 'Schliessen',
  },
  errori: {
    credenziali: 'E-Mail oder Passwort nicht korrekt',
    emailDaConfermare:
      'Bestätigen Sie zuerst Ihre E-Mail: Öffnen Sie den Link, den wir Ihnen gesendet haben.',
    giaRegistrata: 'Mit dieser E-Mail gibt es bereits ein Konto: Melden Sie sich an.',
    passwordDebole: 'Passwort zu schwach: Verwenden Sie mindestens 8 Zeichen.',
    stessaPassword: 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
    emailNonValida: 'Ungültige E-Mail',
    troppiTentativi: 'Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.',
    codiceNonValido:
      'Ungültiger Code. Prüfen Sie, ob die Uhrzeit Ihres Telefons stimmt, und versuchen Sie es erneut.',
    recuperoNonValido: 'Ungültiger oder bereits verwendeter Code.',
    linkScaduto: 'Der Link ist nicht mehr gültig. Fordern Sie einen neuen an.',
    scriviEmailPassword: 'Geben Sie E-Mail und Passwort ein.',
    scriviEmail: 'Geben Sie die E-Mail Ihres Kontos ein.',
    nomeCognome: 'Geben Sie Vor- und Nachnamen ein.',
    minimoCaratteri: 'Mindestens {n} Zeichen',
    passwordDiverse: 'Die Passwörter stimmen nicht überein',
  },
  passaggio: {
    titolo: { IT: 'Wechsel zur italienischen Datenbank', CH: 'Wechsel zur Schweizer Datenbank' },
    testo: 'Ihr Konto, Ihre Credits und Ihr Archiv von Lexum {paese} werden geladen.',
  },
  avvio: {
    paese: {
      titolo: 'Land wählen',
      testo:
        'Jedes Land hat seine eigene Datenbank und sein eigenes Konto. Sie können jederzeit im Profil wechseln.',
      gruppo: 'Land',
      proposta: {
        IT: 'Wir schlagen Italien vor, weil es auf Ihrem Telefon eingestellt ist.',
        CH: 'Wir schlagen die Schweiz vor, weil sie auf Ihrem Telefon eingestellt ist.',
      },
      etichettaFonti: '{totale}. Liste der Quellen: {azione}',
    },
    benvenuto: { sopratitolo: 'Lex AI', inizia: 'Starten' },
    fonti: {
      sopratitolo: 'Datenbank',
      titolo: 'Jede Antwort hat ',
      titoloOro: 'ihre Quelle.',
    },
    gratis: {
      sopratitolo: 'Zum Start',
      titolo: 'Die erste Recherche ',
      titoloOro: 'ist kostenlos.',
      testo:
        'Erstellen Sie ein Konto: Sie erhalten einen Credit, um Lex an einem eigenen Fall auszuprobieren.',
      scheda: 'Willkommen',
      credito: 'Credit',
      schedaTesto: 'Eine Frage an Lex, mit vollständiger Antwort und zitierten Quellen.',
      spunta1: 'Datenbank: immer kostenlos',
      spunta2: 'PDF der Antworten: ohne Credits',
      crea: 'Konto erstellen',
      hoAccount: 'Ich habe bereits ein Konto',
    },
    accesso: {
      titolo: 'Willkommen zurück',
      testo: 'Melden Sie sich mit der E-Mail und dem Passwort an, die Sie auf {sito} verwenden.',
      testoAltroPaese: {
        IT: 'Melden Sie sich bei Ihrem italienischen Konto an: E-Mail und Passwort von {sito}.',
        CH: 'Melden Sie sich bei Ihrem Schweizer Konto an: E-Mail und Passwort von {sito}.',
      },
      dimenticata: 'Passwort vergessen?',
      inCorso: 'Anmeldung läuft…',
      senzaAccount: 'Noch kein Konto?',
    },
    registrazione: {
      titolo: 'Erstellen Sie Ihr Konto',
      titoloAltroPaese: {
        IT: 'Italienisches Konto erstellen',
        CH: 'Schweizer Konto erstellen',
      },
      testo: 'Ihre erste Lex-AI-Recherche ist kostenlos.',
      testoAltroPaese:
        'Ein separates Konto für {paese}: Auch hier ist Ihre erste Lex-AI-Recherche kostenlos.',
      nome: 'Vorname',
      cognome: 'Nachname',
      mostra: 'Passwort anzeigen',
      nascondi: 'Passwort verbergen',
      professione: 'Beruf',
      accetto: 'Ich akzeptiere die ',
      termini: 'Nutzungsbedingungen',
      hoLetto: ' und habe die ',
      privacy: 'Datenschutzerklärung',
      fine: ' gelesen.',
      inCorso: 'Registrierung läuft…',
      hoAccount: 'Haben Sie bereits ein Konto?',
    },
    codice: {
      titolo: 'Prüfen Sie Ihre E-Mails',
      codiceA: 'Wir haben einen 6-stelligen Code gesendet an ',
      linkA: 'Wir haben einen Bestätigungslink gesendet an ',
      apriLink: ' Öffnen Sie ihn auf diesem Telefon: Er bringt Sie angemeldet in die App zurück.',
      etichetta: '6-stelliger Bestätigungscode',
      nonArrivato: 'Nichts erhalten? Prüfen Sie den Spam-Ordner oder ',
      inviaTra: 'erneut senden in {tempo}',
      inviaDiNuovo: 'erneut senden',
      inviata: 'E-Mail erneut gesendet.',
      linkNellEmail: 'Sie können auch auf den Link in der E-Mail tippen: Er bringt Sie hierher zurück.',
      conferma: 'Bestätigen',
      hoConfermato: 'Bestätigt: anmelden',
    },
    conferma: {
      titolo: 'E-Mail bestätigt',
      testo: 'Ihr Lexum-Konto {paese} ist aktiv.',
      credito: '1 Willkommens-Credit',
      creditoTesto: 'Ihre erste Frage an Lex ist kostenlos. Die Datenbank ist immer frei zugänglich.',
      inizia: 'Starten',
      oppure: '{messaggio} Oder melden Sie sich mit E-Mail und Passwort an.',
      vaiAccesso: 'Zur Anmeldung',
    },
    password: {
      titolo: 'Passwort vergessen?',
      testo:
        'Geben Sie die E-Mail Ihres Lexum-Kontos {paese} ein: Wir senden Ihnen einen Link, um ein neues Passwort zu wählen.',
      invia: 'Link senden',
      inCorso: 'Wird gesendet…',
      inviataTitolo: 'E-Mail gesendet',
      inviataTesto:
        'Wenn {email} die E-Mail eines Lexum-Kontos {paese} ist, erhalten Sie einen Link, um ein neues Passwort zu wählen. Tippen Sie darauf: Er bringt Sie hierher zurück.',
      nonArrivata: 'Nichts erhalten? Prüfen Sie den Spam-Ordner oder ',
      cambiaEmail: 'E-Mail ändern',
    },
    nuovaPassword: {
      titolo: 'Neues Passwort',
      testo: 'Wählen Sie eines mit mindestens {n} Zeichen.',
      nuova: 'Neues Passwort',
      conferma: 'Passwort bestätigen',
      salva: 'Passwort speichern',
      inCorso: 'Wird gespeichert…',
      attendi: 'Einen Moment…',
      fattoTitolo: 'Passwort aktualisiert',
      fattoTesto: 'Ab jetzt melden Sie sich mit dem neuen Passwort an, hier und auf der Website.',
    },
    verifica: {
      titolo: '2FA-Verifizierung',
      testo:
        'Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein: Es ist derselbe wie auf {sito}.',
      campo: '6-stelliger Code',
      verifica: 'Verifizieren und anmelden',
      perso: 'Telefon verloren: Wiederherstellungscode verwenden',
      recuperoTitolo: 'Wiederherstellungscode',
      recuperoTesto: 'Verwenden Sie einen der Codes, die Sie bei der Aktivierung gespeichert haben.',
      recuperoAvviso:
        'Mit einem Wiederherstellungscode wird die 2FA deaktiviert, hier und auf der Website. Sie können sie im Profil wieder aktivieren.',
      usaRecupero: 'Code verwenden und anmelden',
      tornaCodice: 'Zurück zum Code der Authenticator-App',
      spentaTitolo: '2FA deaktiviert',
      spentaTesto:
        'Der Wiederherstellungscode wurde akzeptiert. Aus Sicherheitsgründen wurde die 2FA deaktiviert, auch auf {sito}: Ihr Konto ist jetzt nur durch das Passwort geschützt.',
      riattiva: 'Aktivieren Sie sie gleich nach der Anmeldung wieder',
      riattivaDove: 'Profil → Konto → 2FA-Verifizierung.',
      accediDiNuovo: 'Erneut anmelden',
    },
  },
};
