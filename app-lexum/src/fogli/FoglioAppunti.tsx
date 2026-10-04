import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Pallino } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import type { Elemento, Etichetta } from '@/dati-finti/ricerche';
import { useTesti } from '@/lingue/useTesti';
import { colori } from '@/tema';

type Props = {
  elemento: Elemento | null;
  etichetta?: Etichetta;
  onChiudi: () => void;
};

// D1 · Appunti salvati in Ricerche: si leggono per intero.
export function FoglioAppunti({ elemento, etichetta, onChiudi }: Props) {
  const { t } = useTesti();
  // tiene gli appunti durante l'animazione di chiusura
  const [ultimo, setUltimo] = useState(elemento);
  if (elemento && elemento !== ultimo) setUltimo(elemento);
  const e = elemento ?? ultimo;
  return (
    <Foglio visibile={!!elemento} onChiudi={onChiudi}>
      {e ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge tono="neutro">{t(`ricerche.tipi.${e.tipo}`)}</Badge>
                <Testo tipo="mini">{e.quando}</Testo>
              </View>
              <Testo tipo="dS">{e.titolo}</Testo>
            </View>
            <PulsanteIcona icona="chiudi" etichetta={t('interfaccia.chiudi')} onPress={onChiudi} />
          </View>
          {etichetta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pallino colore={etichetta.colore} />
              <Testo tipo="small" colore={colori.fg2}>
                {t('ricerche.appunti.inEtichetta', { nome: etichetta.nome })}
              </Testo>
            </View>
          ) : null}
          <Testo colore={colori.fg}>{e.testo ?? e.estratto}</Testo>
        </>
      ) : null}
    </Foglio>
  );
}
