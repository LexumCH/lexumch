import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { datiVeri } from '@/config';
import type { Lingua } from '@/lingue';

import { sessioneDaLink, type Profilo } from './accesso';

export type StatoLink =
  | { stato: 'attesa' }
  | ({ stato: 'ok' } & Profilo)
  | { stato: 'errore'; messaggio: string }
  | { stato: 'finto' };

// Per le schermate a cui si arriva dal link di un'email (Email confermata, Nuova password):
// prende la sessione dall'indirizzo con cui si è aperta l'app. Con i dati finti non fa niente.
export function useSessioneDaLink(paese: string, lingua: Lingua = 'it'): StatoLink {
  const url = Linking.useLinkingURL();
  const [esito, setEsito] = useState<StatoLink>(datiVeri ? { stato: 'attesa' } : { stato: 'finto' });
  useEffect(() => {
    if (!datiVeri || !url) return;
    let attivo = true;
    void sessioneDaLink(paese, url, lingua).then((e) => {
      if (!attivo) return;
      if (e.esito === 'ok') {
        const { esito: _ok, ...profilo } = e;
        setEsito({ stato: 'ok', ...profilo });
      } else setEsito({ stato: 'errore', messaggio: e.messaggio });
    });
    return () => {
      attivo = false;
    };
  }, [paese, url, lingua]);
  return esito;
}
