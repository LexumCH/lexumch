import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { sessioneSalvata } from '@/backend/accesso';
import { leggiPaeseSalvato } from '@/backend/telefono';
import { datiVeri } from '@/config';
import { paesi } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';

// Primo avvio: si parte dalla scelta del paese (A0).
// Con i dati veri: se sul telefono c'è il paese e la sua sessione è ancora valida, si va dritti
// alla chat; le sessioni degli altri paesi si ritrovano per il cambio paese, senza rientrare.
export default function Inizio() {
  const { azioni } = useStato();
  const [dove, setDove] = useState<Href | null>(datiVeri ? null : '/avvio/paese');

  useEffect(() => {
    if (!datiVeri) return;
    let attivo = true;
    void (async () => {
      const [salvato, ...profili] = await Promise.all([
        leggiPaeseSalvato(),
        ...paesi.map((p) => sessioneSalvata(p.codice)),
      ]);
      if (!attivo) return;
      paesi.forEach((p, i) => {
        const profilo = profili[i];
        if (profilo && typeof profilo !== 'string') azioni.entrato(p.codice, profilo);
      });
      const indice = paesi.findIndex((p) => p.codice === salvato);
      if (salvato && indice >= 0 && profili[indice]) {
        azioni.scegliPaese(salvato as string);
        setDove('/chat');
      } else setDove('/avvio/paese');
    })();
    return () => {
      attivo = false;
    };
  }, [azioni]);

  if (!dove) return null; // un attimo, mentre legge le sessioni salvate (resta lo sfondo)
  return <Redirect href={dove} />;
}
