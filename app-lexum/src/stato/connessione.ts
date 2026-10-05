import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

import { useStato } from '@/stato/Stato';

// Basta sapere se il telefono è connesso: niente controlli di rete verso altri indirizzi.
NetInfo.configure({ reachabilityShouldRun: () => false });

// Vero se il telefono è senza connessione (o se lo si simula dall'elenco delle schermate).
// All'avvio NetInfo non sa ancora niente: finché non risponde, si considera online.
export function useOffline(): boolean {
  const { simula } = useStato();
  const rete = useNetInfo();
  return simula.offline || rete.isConnected === false;
}
