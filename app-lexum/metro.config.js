// Configurazione di Metro con Sentry: aggiunge gli identificativi che collegano
// i crash al codice sorgente (https://docs.sentry.io/platforms/react-native/manual-setup/expo/).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
