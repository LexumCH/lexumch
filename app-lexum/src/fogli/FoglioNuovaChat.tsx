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
  apre?: string; // titolo della chat salvata che si sta per riaprire, al posto di una nuova
};

// B8 · Nuova chat (o riapertura di una chat salvata) quando quella in corso non è salvata.
export function FoglioNuovaChat({ visibile, titoloChat, onChiudi, onSalva, onNuova, apre }: Props) {
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="segnalibro" />
        <Testo tipo="dS" style={{ flex: 1 }}>
          {apre ? 'La chat in corso non è salvata' : 'Questa chat non è salvata'}
        </Testo>
      </View>
      <Testo colore={colori.fg2}>
        Se apri {apre ? `«${apre}»` : 'una nuova chat'}, {titoloChat ? `«${titoloChat}»` : 'la chat in corso'}{' '}
        si perde. Salvala in un'etichetta per ritrovarla qui e sul sito.
      </Testo>
      <Pulsante titolo="Salva in un'etichetta" onPress={onSalva} />
      <Pulsante
        titolo={apre ? 'Apri senza salvare' : 'Nuova chat senza salvare'}
        variante="linea"
        onPress={onNuova}
      />
      <Pulsante titolo="Annulla" variante="tenue" onPress={onChiudi} />
    </Foglio>
  );
}
