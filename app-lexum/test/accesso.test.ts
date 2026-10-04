// Accesso ai database dei paesi (src/backend/accesso.ts) con un client Supabase simulato:
// le chiamate sono quelle dei siti, i messaggi sono per l'utente e mai tecnici.

import { clientDi } from '@/backend/client';
import {
  accedi,
  messaggioAccesso,
  registrati,
  sessioneDaLink,
  usaCodiceRecupero,
  verificaCodice,
} from '@/backend/accesso';

const mockProfilo = {
  data: { role: 'avvocato', nome: 'Laura', cognome: 'Rossi' } as Record<string, string> | null,
};

const mockClient = {
  auth: {
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    setSession: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ error: null })),
    updateUser: jest.fn(async () => ({ error: null })),
    resend: jest.fn(async () => ({ error: null })),
    mfa: {
      getAuthenticatorAssuranceLevel: jest.fn(async () => ({
        data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      })),
      listFactors: jest.fn(),
      challengeAndVerify: jest.fn(),
    },
  },
  functions: { invoke: jest.fn() },
  from: jest.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => mockProfilo }) }),
  })),
};

jest.mock('@/backend/client', () => ({ clientDi: jest.fn(() => mockClient) }));
// In prova non c'è il manifesto dell'app: l'indirizzo dei link si costruisce a mano, con lo schema lexum://.
jest.mock('expo-linking', () => ({
  createURL: (percorso: string, o?: { queryParams?: Record<string, string> }) =>
    `lexum:/${percorso}${o?.queryParams ? `?${new URLSearchParams(o.queryParams).toString()}` : ''}`,
}));

const utente = { id: 'u1', email: 'test1@gmail.com' };

beforeEach(() => {
  jest.clearAllMocks();
  mockProfilo.data = { role: 'avvocato', nome: 'Laura', cognome: 'Rossi' };
});

describe('accesso con email e password', () => {
  it('entra con il ruolo letto dal profilo, nel database del paese giusto', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: utente }, error: null });
    const esito = await accedi('CH', '  test1@gmail.com ', 'segreta');
    expect(clientDi).toHaveBeenCalledWith('CH');
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test1@gmail.com',
      password: 'segreta',
    });
    expect(esito).toEqual({
      esito: 'ok',
      ruolo: 'avvocato',
      nome: 'Laura',
      cognome: 'Rossi',
      email: 'test1@gmail.com',
    });
  });

  it('senza profilo leggibile entra come privato: mai un errore di ruolo', async () => {
    mockProfilo.data = null;
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: utente }, error: null });
    const esito = await accedi('IT', 'test1@gmail.com', 'x');
    expect(esito).toMatchObject({ esito: 'ok', ruolo: 'user' });
  });

  it('con la verifica in due passaggi chiede il codice', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: utente }, error: null });
    mockClient.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    });
    expect(await accedi('IT', 'test1@gmail.com', 'x')).toEqual({ esito: 'due-passaggi' });
  });

  it('password sbagliata, email da confermare, rete: frasi per l’utente', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials', status: 400 },
    });
    expect(await accedi('IT', 'a@b.it', 'x')).toEqual({
      esito: 'errore',
      messaggio: 'Email o password non corretti',
    });
    expect(messaggioAccesso({ message: 'Email not confirmed' })).toMatch(/conferma l'email/);
    mockClient.auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await accedi('IT', 'a@b.it', 'x')).toEqual({
      esito: 'errore',
      messaggio: 'La connessione si è interrotta. Controlla la rete e riprova.',
    });
  });

  it('un messaggio tecnico in inglese non arriva mai all’utente', () => {
    expect(messaggioAccesso({ message: 'Database error querying schema' })).toBe(
      'Si è verificato un errore temporaneo. Riprova tra qualche istante.',
    );
  });
});

describe('verifica in due passaggi', () => {
  it('codice dell’app di autenticazione sul fattore verificato', async () => {
    mockClient.auth.mfa.listFactors.mockResolvedValueOnce({
      data: {
        totp: [
          { id: 'f0', status: 'unverified' },
          { id: 'f1', status: 'verified' },
        ],
      },
      error: null,
    });
    mockClient.auth.mfa.challengeAndVerify.mockResolvedValueOnce({ error: null });
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: utente } });
    const esito = await verificaCodice('IT', '482913');
    expect(mockClient.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '482913' });
    expect(esito).toMatchObject({ esito: 'ok', ruolo: 'avvocato' });
  });

  it('codice sbagliato: lo dice, senza dettagli tecnici', async () => {
    mockClient.auth.mfa.listFactors.mockResolvedValueOnce({
      data: { totp: [{ id: 'f1', status: 'verified' }] },
      error: null,
    });
    mockClient.auth.mfa.challengeAndVerify.mockResolvedValueOnce({
      error: { message: 'Invalid TOTP code entered' },
    });
    expect(await verificaCodice('IT', '000000')).toEqual({
      esito: 'errore',
      messaggio: "Codice non valido. Controlla che l'ora del telefono sia giusta e riprova.",
    });
  });

  it('codice di recupero: la funzione del sito, poi si esce solo da quel paese', async () => {
    mockClient.functions.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    expect(await usaCodiceRecupero('CH', ' 7K9P-2H4M ')).toEqual({ esito: 'ok' });
    expect(mockClient.functions.invoke).toHaveBeenCalledWith('mfa-backup-codes', {
      body: { action: 'verify', code: '7K9P-2H4M' },
    });
    expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    mockClient.functions.invoke.mockResolvedValueOnce({ data: { ok: false }, error: null });
    expect(await usaCodiceRecupero('CH', 'XXXX-XXXX')).toEqual({
      esito: 'errore',
      messaggio: 'Codice non valido o già usato.',
    });
  });
});

describe('registrazione e link delle email', () => {
  it('in Italia manda la professione, in Svizzera la lingua, come i due siti', async () => {
    mockClient.auth.signUp.mockResolvedValue({ error: null });
    await registrati('IT', {
      nome: ' Giulia ',
      cognome: 'Rossi',
      email: 'G@X.IT',
      password: '12345678',
      professione: 'privato',
    });
    const it = mockClient.auth.signUp.mock.calls[0][0];
    expect(it.email).toBe('g@x.it');
    expect(it.options.data).toEqual({ nome: 'Giulia', cognome: 'Rossi', professione: 'privato' });
    expect(it.options.emailRedirectTo).toMatch(/avvio\/conferma.*paese=IT/);
    await registrati('CH', {
      nome: 'Lea',
      cognome: 'Keller',
      email: 'l@x.ch',
      password: '12345678',
      lingua: 'de',
    });
    expect(mockClient.auth.signUp.mock.calls[1][0].options.data).toEqual({
      nome: 'Lea',
      cognome: 'Keller',
      lingua: 'de',
    });
  });

  it('il link dell’email porta la sessione; un link scaduto lo dice', async () => {
    mockClient.auth.setSession.mockResolvedValueOnce({ data: { user: utente }, error: null });
    const ok = await sessioneDaLink(
      'IT',
      'lexum://avvio/nuova-password?paese=IT#access_token=a1&refresh_token=r1&type=recovery',
    );
    expect(mockClient.auth.setSession).toHaveBeenCalledWith({ access_token: 'a1', refresh_token: 'r1' });
    expect(ok).toMatchObject({ esito: 'ok', email: 'test1@gmail.com' });
    const ko = await sessioneDaLink(
      'IT',
      'lexum://avvio/nuova-password#error=access_denied&error_description=expired',
    );
    expect(ko).toEqual({ esito: 'errore', messaggio: 'Il link non è più valido. Chiedine uno nuovo.' });
  });
});
