import { View } from 'react-native';

import { BadgePaese, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { useStato } from '@/stato/Stato';
import { testiEliminaPer } from '@/testi/elimina-account';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onElimina: () => void;
};

// D6 · Conferma «Elimina account». Ogni paese è un accesso a sé: si elimina solo quello attivo.
// Nell'app vera serve una funzione del backend che oggi non c'è (vedi docs/DA-FARE-ANTONINO.md).
export function FoglioElimina({ visibile, onChiudi, onElimina }: Props) {
  const { paese, accessi } = useStato();
  // Testi approvati, nella lingua dell'app (in Italia sempre italiano).
  const { lingua } = useTesti();
  const t = testiEliminaPer(paese, lingua);
  const altroAccesso = Object.entries(accessi).some(([codice, attivo]) => codice !== paese && attivo);
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <BadgePaese codice={paese} />
        <Testo tipo="dS" style={{ flex: 1 }}>
          {t.titolo}
        </Testo>
      </View>
      <Testo colore={colori.fg2}>{t.testo}</Testo>
      <Scheda stile={{ backgroundColor: colori.bg, paddingVertical: 14 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {altroAccesso ? t.altroAccesso : t.nessunAltro}
        </Testo>
      </Scheda>
      <Testo tipo="cap">{t.archivio}</Testo>
      <Pulsante titolo={t.conferma} variante="pericolo" onPress={onElimina} />
      <Pulsante titolo={t.annulla} variante="tenue" stile={{ height: 44 }} onPress={onChiudi} />
    </Foglio>
  );
}
