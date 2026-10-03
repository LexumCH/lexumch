// Interruttori dell'app.

// Pulsanti che portano agli acquisti sul sito («Aggiungi crediti», «Fai upgrade»,
// «Continua su lexum.it» quando i crediti finiscono). Decisione aperta n. 4 del piano:
// Apple potrebbe chiedere di toglierli su iPhone. Per nasconderli solo lì:
//   export const mostraAcquisti = Platform.OS !== 'ios';
export const mostraAcquisti = true;
