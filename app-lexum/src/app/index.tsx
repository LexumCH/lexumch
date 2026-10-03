import { Redirect } from 'expo-router';

// Primo avvio: si parte dalla scelta del paese (A0).
// Dalla tappa 2, se il paese e l'accesso sono già salvati sul telefono, si va dritti alla chat.
export default function Inizio() {
  return <Redirect href="/avvio/paese" />;
}
