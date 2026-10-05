import { Redirect } from 'expo-router';

// Indirizzo sconosciuto (per esempio un link vecchio, o la pagina dell'anteprima web):
// si riparte dall'inizio.
export default function NonTrovata() {
  return <Redirect href="/" />;
}
