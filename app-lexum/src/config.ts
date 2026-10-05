// Interruttori dell'app.

// Pulsanti che portano agli acquisti sul sito («Aggiungi crediti», «Fai upgrade»,
// «Continua su lexum.it» quando i crediti finiscono). Decisione aperta n. 4 del piano:
// Apple potrebbe chiedere di toglierli su iPhone. Per nasconderli solo lì:
//   export const mostraAcquisti = Platform.OS !== 'ios';
export const mostraAcquisti = true;

// Dati veri o finti. Con EXPO_PUBLIC_DATI=veri l'app usa i database dei paesi (accesso, profilo…);
// senza, usa i dati finti: così restano l'anteprima nel browser, le prove automatiche e l'elenco
// delle schermate. Le build per il telefono si fanno con EXPO_PUBLIC_DATI=veri.
export const datiVeri = process.env.EXPO_PUBLIC_DATI === 'veri';
