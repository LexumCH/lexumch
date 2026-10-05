import * as Linking from 'expo-linking';

import { messaggiErrore, messaggioErrore } from '@/errori';
import { traduci, type Lingua } from '@/lingue';

import { clientDi } from './client';

// Accesso ai database dei paesi, con le stesse chiamate dei siti
// (src/pages/auth/ di Lexumita/lexumita e LexumCH/lexumch): email e password, verifica in due
// passaggi con l'app di autenticazione o con un codice di recupero, registrazione, password.
// Ogni funzione risponde con un esito e, se va male, con un messaggio già scritto per l'utente.

export type Profilo = { ruolo: string; nome: string; cognome: string; email: string };

export type EsitoAccesso =
  ({ esito: 'ok' } & Profilo) | { esito: 'due-passaggi' } | { esito: 'errore'; messaggio: string };

export type Esito = { esito: 'ok' } | { esito: 'errore'; messaggio: string };

type ErroreSupabase = { message?: string; code?: string; status?: number } | null | undefined;

// I messaggi di Supabase sono in inglese e tecnici: qui diventano frasi per l'utente.
export function messaggioAccesso(e: unknown, lingua: Lingua = 'it'): string {
  const err = (e ?? null) as ErroreSupabase;
  const codice = err?.code ?? '';
  const testo = err?.message ?? (typeof e === 'string' ? e : '');
  if (codice === 'invalid_credentials' || /invalid login credentials/i.test(testo))
    return traduci(lingua, 'errori.credenziali');
  if (codice === 'email_not_confirmed' || /email not confirmed/i.test(testo))
    return traduci(lingua, 'errori.emailDaConfermare');
  if (codice === 'user_already_exists' || /already registered|already exists/i.test(testo))
    return traduci(lingua, 'errori.giaRegistrata');
  if (codice === 'weak_password' || /password should be/i.test(testo))
    return traduci(lingua, 'errori.passwordDebole');
  if (codice === 'same_password') return traduci(lingua, 'errori.stessaPassword');
  if (codice === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(testo))
    return traduci(lingua, 'errori.emailNonValida');
  if (/rate limit|too many|over_.*limit/i.test(`${codice} ${testo}`) || err?.status === 429)
    return traduci(lingua, 'errori.troppiTentativi');
  // Rete o altro: il messaggio generico, mai quello tecnico.
  const generico = messaggiErrore[lingua].tecnico;
  const m = messaggioErrore(testo, lingua, generico);
  return m === testo ? generico : m;
}

async function profiloDi(paese: string, id: string, email: string): Promise<Profilo> {
  const { data } = await clientDi(paese)
    .from('profiles')
    .select('role, nome, cognome')
    .eq('id', id)
    .maybeSingle();
  // Ogni ruolo entra: se il profilo non si legge, si entra come privato (mai un errore di ruolo).
  return {
    ruolo: (data?.role as string | undefined) ?? 'user',
    nome: (data?.nome as string | undefined) ?? '',
    cognome: (data?.cognome as string | undefined) ?? '',
    email,
  };
}

// Come il sito: email e password; se l'account ha la verifica in due passaggi, serve anche il codice.
export async function accedi(
  paese: string,
  email: string,
  password: string,
  lingua: Lingua = 'it',
): Promise<EsitoAccesso> {
  try {
    const sb = clientDi(paese);
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { esito: 'errore', messaggio: messaggioAccesso(error, lingua) };
    const { data: livello } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (livello?.currentLevel === 'aal1' && livello?.nextLevel === 'aal2') return { esito: 'due-passaggi' };
    return { esito: 'ok', ...(await profiloDi(paese, data.user.id, data.user.email ?? '')) };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// Codice di 6 cifre dell'app di autenticazione: lo stesso che vale sul sito.
export async function verificaCodice(
  paese: string,
  codice: string,
  lingua: Lingua = 'it',
): Promise<EsitoAccesso> {
  const nonValido = traduci(lingua, 'errori.codiceNonValido');
  try {
    const sb = clientDi(paese);
    const { data: fattori, error } = await sb.auth.mfa.listFactors();
    const totp = fattori?.totp?.find((f) => f.status === 'verified');
    if (error || !totp) return { esito: 'errore', messaggio: messaggiErrore[lingua].tecnico };
    const { error: errore } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codice });
    if (errore) return { esito: 'errore', messaggio: nonValido };
    const { data } = await sb.auth.getUser();
    if (!data.user) return { esito: 'errore', messaggio: messaggiErrore[lingua].tecnico };
    return { esito: 'ok', ...(await profiloDi(paese, data.user.id, data.user.email ?? '')) };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// Codice di recupero (XXXX-XXXX): come sul sito spegne la verifica in due passaggi; poi si esce
// e si rientra con email e password, e la verifica si riattiva dal Profilo.
export async function usaCodiceRecupero(
  paese: string,
  codice: string,
  lingua: Lingua = 'it',
): Promise<Esito> {
  try {
    const sb = clientDi(paese);
    const { data, error } = await sb.functions.invoke('mfa-backup-codes', {
      body: { action: 'verify', code: codice.trim() },
    });
    if (error || !data?.ok)
      return { esito: 'errore', messaggio: traduci(lingua, 'errori.recuperoNonValido') };
    await sb.auth.signOut({ scope: 'local' });
    return { esito: 'ok' };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// Le professioni che il sito italiano chiede alla registrazione (valori del database).
export const professioniRegistrazione = [
  { valore: 'privato', titolo: 'Privato' },
  { valore: 'avvocato', titolo: 'Avvocato' },
  { valore: 'commercialista', titolo: 'Commercialista' },
  { valore: 'dirigente_azienda', titolo: "Dirigente d'azienda" },
  { valore: 'studente_giurisprudenza', titolo: 'Studente di giurisprudenza' },
  { valore: 'imprenditore', titolo: 'Imprenditore' },
  { valore: 'architetto', titolo: 'Architetto' },
  { valore: 'ingegnere', titolo: 'Ingegnere' },
  { valore: 'geometra', titolo: 'Geometra' },
] as const;

// Registrazione come sul sito: i dati vanno nei metadati e il trigger del database crea il profilo
// (sempre con il ruolo «user»). In Italia c'è la professione, in Svizzera la lingua.
// Il link di conferma riporta nell'app (Email confermata).
export async function registrati(
  paese: string,
  dati: {
    nome: string;
    cognome: string;
    email: string;
    password: string;
    professione?: string;
    lingua?: Lingua;
  },
): Promise<Esito> {
  const lingua: Lingua = dati.lingua ?? 'it';
  const metadati: Record<string, string> = { nome: dati.nome.trim(), cognome: dati.cognome.trim() };
  if (paese === 'IT') metadati.professione = dati.professione ?? 'privato';
  if (paese === 'CH') metadati.lingua = lingua;
  try {
    const { error } = await clientDi(paese).auth.signUp({
      email: dati.email.trim().toLowerCase(),
      password: dati.password,
      options: {
        emailRedirectTo: Linking.createURL('/avvio/conferma', { queryParams: { paese } }),
        data: metadati,
      },
    });
    return error ? { esito: 'errore', messaggio: messaggioAccesso(error, lingua) } : { esito: 'ok' };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// Password dimenticata: il link riporta nell'app, su Nuova password.
export async function mandaLinkPassword(paese: string, email: string, lingua: Lingua = 'it'): Promise<Esito> {
  try {
    const { error } = await clientDi(paese).auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/avvio/nuova-password', { queryParams: { paese } }),
    });
    return error ? { esito: 'errore', messaggio: messaggioAccesso(error, lingua) } : { esito: 'ok' };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

export async function salvaNuovaPassword(
  paese: string,
  password: string,
  lingua: Lingua = 'it',
): Promise<Esito> {
  try {
    const { error } = await clientDi(paese).auth.updateUser({ password });
    return error ? { esito: 'errore', messaggio: messaggioAccesso(error, lingua) } : { esito: 'ok' };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// La sessione salvata sul telefono per quel paese, se c'è ed è completa (anche il secondo passaggio).
export async function sessioneSalvata(paese: string): Promise<Profilo | null> {
  try {
    const sb = clientDi(paese);
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const { data: livello } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (livello?.currentLevel === 'aal1' && livello?.nextLevel === 'aal2') return null;
    return await profiloDi(paese, data.session.user.id, data.session.user.email ?? '');
  } catch {
    return null;
  }
}

// Esce solo dal paese indicato: l'accesso dell'altro paese resta.
export async function esci(paese: string): Promise<void> {
  try {
    await clientDi(paese).auth.signOut({ scope: 'local' });
  } catch {
    // anche senza rete la sessione locale si cancella: niente da mostrare
  }
}

// I link delle email (conferma, password dimenticata) portano nell'app la sessione nell'indirizzo:
// lexum://avvio/nuova-password?paese=IT#access_token=…&refresh_token=…&type=recovery
export async function sessioneDaLink(
  paese: string,
  url: string,
  lingua: Lingua = 'it',
): Promise<({ esito: 'ok' } & Profilo) | { esito: 'errore'; messaggio: string }> {
  const frammento = new URLSearchParams(url.split('#')[1] ?? '');
  const scaduto = traduci(lingua, 'errori.linkScaduto');
  if (frammento.get('error') || frammento.get('error_description'))
    return { esito: 'errore', messaggio: scaduto };
  const access_token = frammento.get('access_token');
  const refresh_token = frammento.get('refresh_token');
  if (!access_token || !refresh_token) return { esito: 'errore', messaggio: scaduto };
  try {
    const { data, error } = await clientDi(paese).auth.setSession({ access_token, refresh_token });
    if (error || !data.user) return { esito: 'errore', messaggio: scaduto };
    return { esito: 'ok', ...(await profiloDi(paese, data.user.id, data.user.email ?? '')) };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}

// «Invia di nuovo» l'email di conferma della registrazione.
export async function rimandaConferma(paese: string, email: string, lingua: Lingua = 'it'): Promise<Esito> {
  try {
    const { error } = await clientDi(paese).auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: Linking.createURL('/avvio/conferma', { queryParams: { paese } }) },
    });
    return error ? { esito: 'errore', messaggio: messaggioAccesso(error, lingua) } : { esito: 'ok' };
  } catch (e) {
    return { esito: 'errore', messaggio: messaggioAccesso(e, lingua) };
  }
}
