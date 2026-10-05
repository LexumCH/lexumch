import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { trovaPaese } from '@/paesi/registro';

// Un client Supabase per paese, con la chiave pubblica di docs/paesi.json.
// La sessione si salva sul telefono, con una chiave per paese: l'accesso italiano e quello
// svizzero restano separati e si passa dall'uno all'altro senza rientrare.
const clienti = new Map<string, SupabaseClient>();

export function chiaveSessione(codice: string): string {
  return `lexum-sessione-${codice}`;
}

export function clientDi(codice: string): SupabaseClient {
  let client = clienti.get(codice);
  if (!client) {
    const paese = trovaPaese(codice);
    client = createClient(paese.supabaseUrl, paese.chiavePubblica, {
      auth: {
        storage: AsyncStorage,
        storageKey: chiaveSessione(codice),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    clienti.set(codice, client);
  }
  return client;
}

// Sul telefono il rinnovo della sessione si accende quando l'app è in primo piano e si spegne
// quando va in secondo piano (come indica Supabase per React Native). Restituisce lo spegnimento.
export function rinnovoSessioni(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  const sub = AppState.addEventListener('change', (stato) => {
    for (const client of clienti.values()) {
      if (stato === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    }
  });
  return () => sub.remove();
}
