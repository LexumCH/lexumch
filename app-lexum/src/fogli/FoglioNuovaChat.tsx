import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  titoloChat: string | null;
  onChiudi: () => void;
  onSalva: () => void;
  onNuova: () => void;
};

// B8 · Nuova chat quando quella in corso non è salvata.
export function FoglioNuovaChat({ visibile, titoloChat, onChiudi, onSalva, onNuova }: Props) {
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="segnalibro" />
        <Testo tipo="dS" style={{ flex: 1 }}>
          Questa chat non è salvata
        </Testo>
      </View>
      <Testo colore={colori.fg2}>
        Se apri una nuova chat, {titoloChat ? `«${titoloChat}»` : 'questa chat'} si perde. Salvala in
        un'etichetta per ritrovarla qui e sul sito.
      </Testo>
      <Pulsante titolo="Salva in un'etichetta" onPress={onSalva} />
      <Pulsante titolo="Nuova chat senza salvare" variante="linea" onPress={onNuova} />
      <Pulsante titolo="Annulla" variante="tenue" onPress={onChiudi} />
    </Foglio>
  );
}
