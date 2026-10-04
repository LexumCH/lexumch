import type { Traduzione } from './tipi';
import { interfaccia } from './sezioni/interfaccia';
import { chat } from './sezioni/chat';
import { bancaDati } from './sezioni/bancaDati';
import { ricerche } from './sezioni/ricerche';
import { archivio } from './sezioni/archivio';
import { profilo } from './sezioni/profilo';
import { studio } from './sezioni/studio';
import { fatture } from './sezioni/fatture';

// Français (Suisse) : « vous ». Là où le texte existe déjà sur lexum.ch (public/locales/fr/auth.json),
// il est repris ; le reste est nouveau et attend l'approbation d'Antonino.
// Bienvenue A0–A3 : textes approuvés de docs/testi/domande-e-benvenuto.md.

export const fr: Traduzione = {
  interfaccia: interfaccia.fr,
  chat: chat.fr,
  bancaDati: bancaDati.fr,
  ricerche: ricerche.fr,
  archivio: archivio.fr,
  profilo: profilo.fr,
  studio: studio.fr,
  fatture: fatture.fr,
  paesi: { IT: 'Italie', CH: 'Suisse' },
  comune: {
    continua: 'Continuer',
    avanti: 'Suivant',
    salta: 'Passer',
    indietro: 'Retour',
    annulla: 'Annuler',
    email: 'E-mail',
    password: 'Mot de passe',
    accedi: 'Se connecter',
    registrati: "S'inscrire",
    tornaAccesso: 'Retour à la connexion',
    espandi: 'Afficher',
    chiudi: 'Fermer',
  },
  errori: {
    credenziali: 'E-mail ou mot de passe incorrect',
    emailDaConfermare: "Confirmez d'abord votre e-mail : ouvrez le lien que nous vous avons envoyé.",
    giaRegistrata: 'Un compte existe déjà avec cet e-mail : connectez-vous.',
    passwordDebole: 'Mot de passe trop faible : utilisez au moins 8 caractères.',
    stessaPassword: "Le nouveau mot de passe doit être différent de l'ancien.",
    emailNonValida: 'E-mail invalide',
    troppiTentativi: 'Trop de tentatives. Réessayez dans quelques minutes.',
    codiceNonValido: "Code invalide. Vérifiez que l'heure de votre téléphone est correcte et réessayez.",
    recuperoNonValido: 'Code invalide ou déjà utilisé.',
    linkScaduto: "Le lien n'est plus valable. Demandez-en un nouveau.",
    scriviEmailPassword: "Saisissez l'e-mail et le mot de passe.",
    scriviEmail: "Saisissez l'e-mail de votre compte.",
    nomeCognome: 'Saisissez le prénom et le nom.',
    minimoCaratteri: '{n} caractères minimum',
    passwordDiverse: 'Les mots de passe ne correspondent pas',
  },
  passaggio: {
    titolo: { IT: 'Passage à la base de données italienne', CH: 'Passage à la base de données suisse' },
    testo: 'Chargement de votre compte, de vos crédits et de vos archives Lexum {paese}.',
  },
  avvio: {
    paese: {
      titolo: 'Choisissez le pays',
      testo:
        'Chaque pays a sa propre base de données et son propre compte. Vous pouvez changer à tout moment depuis le Profil.',
      gruppo: 'Pays',
      proposta: {
        IT: "Nous vous proposons l'Italie, car c'est le pays réglé sur votre téléphone.",
        CH: "Nous vous proposons la Suisse, car c'est le pays réglé sur votre téléphone.",
      },
      etichettaFonti: '{totale}. {azione} la liste des sources',
    },
    benvenuto: { sopratitolo: 'Lex AI', inizia: 'Commencer' },
    fonti: {
      sopratitolo: 'Base de données',
      titolo: 'Chaque réponse a ',
      titoloOro: 'sa source.',
    },
    gratis: {
      sopratitolo: 'Pour commencer',
      titolo: 'La première recherche ',
      titoloOro: 'est gratuite.',
      testo: 'Créez votre compte : nous vous offrons un crédit pour essayer Lex sur un cas réel.',
      scheda: 'Bienvenue',
      credito: 'crédit',
      schedaTesto: 'Une question à Lex, avec une réponse complète et les sources citées.',
      spunta1: 'Base de données : toujours gratuite',
      spunta2: 'PDF des réponses : sans crédits',
      crea: 'Créer votre compte',
      hoAccount: "J'ai déjà un compte",
    },
    accesso: {
      titolo: 'Bon retour',
      testo: "Connectez-vous avec l'e-mail et le mot de passe que vous utilisez sur {sito}.",
      testoAltroPaese: {
        IT: 'Connectez-vous à votre compte italien : e-mail et mot de passe de {sito}.',
        CH: 'Connectez-vous à votre compte suisse : e-mail et mot de passe de {sito}.',
      },
      dimenticata: 'Mot de passe oublié ?',
      inCorso: 'Connexion en cours…',
      senzaAccount: "Vous n'avez pas de compte ?",
    },
    registrazione: {
      titolo: 'Créez votre compte',
      titoloAltroPaese: {
        IT: 'Créer le compte italien',
        CH: 'Créer le compte suisse',
      },
      testo: 'Votre première recherche Lex AI est gratuite.',
      testoAltroPaese:
        'Un compte séparé pour {paese} : ici aussi, la première recherche Lex AI est gratuite.',
      nome: 'Prénom',
      cognome: 'Nom',
      mostra: 'Afficher le mot de passe',
      nascondi: 'Masquer le mot de passe',
      professione: 'Profession',
      accetto: "J'accepte les ",
      termini: "Conditions d'utilisation",
      hoLetto: " et j'ai lu la ",
      privacy: 'Politique de confidentialité',
      fine: '.',
      inCorso: 'Inscription en cours…',
      hoAccount: 'Vous avez déjà un compte ?',
    },
    codice: {
      titolo: 'Vérifiez votre e-mail',
      codiceA: 'Nous avons envoyé un code à 6 chiffres à ',
      linkA: 'Nous avons envoyé un lien de confirmation à ',
      apriLink: " Ouvrez-le depuis ce téléphone : il vous ramène dans l'app, déjà connecté.",
      etichetta: 'Code de confirmation à 6 chiffres',
      nonArrivato: 'Rien reçu ? Vérifiez le dossier spam ou ',
      inviaTra: 'renvoyez dans {tempo}',
      inviaDiNuovo: 'renvoyez-le',
      inviata: 'E-mail renvoyé.',
      linkNellEmail: "Vous pouvez aussi toucher le lien dans l'e-mail : il vous ramène ici.",
      conferma: 'Confirmer',
      hoConfermato: "J'ai confirmé : se connecter",
    },
    conferma: {
      titolo: 'E-mail vérifié',
      testo: 'Votre compte Lexum {paese} est actif.',
      credito: '1 crédit de bienvenue',
      creditoTesto: 'Votre première question à Lex est gratuite. La base de données est toujours libre.',
      inizia: 'Commencer',
      oppure: '{messaggio} Ou connectez-vous avec e-mail et mot de passe.',
      vaiAccesso: 'Aller à la connexion',
    },
    password: {
      titolo: 'Mot de passe oublié ?',
      testo:
        "Saisissez l'e-mail de votre compte Lexum {paese} : nous vous envoyons un lien pour en choisir un nouveau.",
      invia: 'Envoyer le lien',
      inCorso: 'Envoi en cours…',
      inviataTitolo: 'E-mail envoyé',
      inviataTesto:
        "Si {email} est l'e-mail d'un compte Lexum {paese}, vous recevrez un lien pour choisir un nouveau mot de passe. Touchez-le : il vous ramène ici.",
      nonArrivata: 'Rien reçu ? Vérifiez le dossier spam ou ',
      cambiaEmail: "changez d'e-mail",
    },
    nuovaPassword: {
      titolo: 'Nouveau mot de passe',
      testo: 'Choisissez-en un d’au moins {n} caractères.',
      nuova: 'Nouveau mot de passe',
      conferma: 'Confirmer le mot de passe',
      salva: 'Enregistrer le mot de passe',
      inCorso: 'Enregistrement…',
      attendi: 'Un instant…',
      fattoTitolo: 'Mot de passe mis à jour',
      fattoTesto: 'Désormais, vous vous connectez avec le nouveau mot de passe, ici et sur le site.',
    },
    verifica: {
      titolo: 'Vérification 2FA',
      testo:
        "Saisissez le code à 6 chiffres de votre application d'authentification : c'est le même que sur {sito}.",
      campo: 'Code à 6 chiffres',
      verifica: 'Vérifier et se connecter',
      perso: 'Téléphone perdu : utiliser un code de récupération',
      recuperoTitolo: 'Code de récupération',
      recuperoTesto: "Utilisez l'un des codes enregistrés lors de l'activation.",
      recuperoAvviso:
        'Avec un code de récupération, la 2FA est désactivée, ici et sur le site. Vous pourrez la réactiver depuis le Profil.',
      usaRecupero: 'Utiliser le code et se connecter',
      tornaCodice: "Retour au code de l'application d'authentification",
      spentaTitolo: '2FA désactivée',
      spentaTesto:
        "Le code de récupération a été accepté. Pour des raisons de sécurité, la 2FA a été désactivée, aussi sur {sito} : votre compte n'est plus protégé que par le mot de passe.",
      riattiva: 'Réactivez-la dès votre connexion',
      riattivaDove: 'Profil → Compte → Vérification 2FA.',
      accediDiNuovo: 'Se reconnecter',
    },
  },
};
