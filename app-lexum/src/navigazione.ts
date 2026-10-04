import { router, usePathname, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { strumentiStudio } from '@/ruoli';

// Le voci del menù. La chat è la home: le altre si aprono sopra di lei.
// Gli strumenti dello Studio (Dashboard, clienti, pratiche, calendario, fatture) ci sono solo per alcuni ruoli:
// vedi src/ruoli.ts.
export type Sezione =
  | '/chat'
  | '/banca-dati'
  | '/ricerche'
  | '/archivio'
  | '/domande'
  | '/profilo'
  | '/dashboard'
  | '/clienti'
  | '/pratiche'
  | '/calendario'
  | '/fatture';

export const sezioni: Sezione[] = [
  '/chat',
  '/banca-dati',
  '/ricerche',
  '/archivio',
  '/domande',
  '/profilo',
  '/dashboard',
  '/clienti',
  '/pratiche',
  '/calendario',
  '/fatture',
];

// Va a una voce del menù senza accumulare schermate:
// - alla chat si torna indietro (la chat in corso resta com'era);
// - dalla chat si apre la voce sopra;
// - da un'altra voce si sostituisce.
export function useVaiASezione() {
  const percorso = usePathname();
  return useCallback(
    (sezione: Sezione, parametri?: Record<string, string>) => {
      const href = (parametri ? { pathname: sezione, params: parametri } : sezione) as Href;
      if (percorso === sezione) {
        if (parametri) router.setParams(parametri);
        return;
      }
      if (sezione === '/chat') {
        router.dismissTo(href);
        return;
      }
      if (percorso === '/chat') router.push(href);
      else router.replace(href);
    },
    [percorso],
  );
}

// Ricomincia da una schermata, togliendo tutte quelle sotto (fine del benvenuto, uscita, cambio paese).
export function ricominciaDa(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}

// Si entra nell'app (avvio con la sessione salvata, accesso, verifica, conferma, cambio paese):
// la chat, che resta sotto; per chi ha la Dashboard (avvocati, commercialisti, fiduciari) la Dashboard
// sopra la chat, come sul sito (deciso da Antonino il 04-10-2026). Sul telefono «indietro» dalla
// Dashboard porta alla chat; nel browser la cronologia è quella del browser.
export function entraNellApp(ruolo: string | undefined) {
  ricominciaDa('/chat');
  if (ruolo && strumentiStudio(ruolo).includes('dashboard')) router.push('/dashboard');
}

// Indietro; se non c'è niente sotto (per esempio dopo un ricaricamento della pagina web) va al ripiego.
export function indietro(ripiego: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(ripiego);
}

// Apre una pagina del sito (acquisti, profilo professionale) nel browser dentro l'app.
export function apriSito(url: string) {
  void WebBrowser.openBrowserAsync(url);
}
