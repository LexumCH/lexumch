import * as Sentry from '@sentry/react-native';

// Segnalazione dei crash con Sentry. Si accende solo se c'è la chiave pubblica (DSN)
// in EXPO_PUBLIC_SENTRY_DSN: senza, l'app funziona uguale e non manda niente.
// Niente dati personali: né IP, né email, né i testi della chat (le righe di console
// non vengono allegate). Cosa preparare su Sentry: docs/DA-FARE-ANTONINO.md.

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryAttivo = !!dsn;

if (dsn) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'sviluppo' : 'produzione',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: (briciola) => (briciola.category === 'console' ? null : briciola),
  });
}

export function segnalaErrore(errore: unknown) {
  if (sentryAttivo) Sentry.captureException(errore);
}

export const avvolgi = Sentry.wrap;
