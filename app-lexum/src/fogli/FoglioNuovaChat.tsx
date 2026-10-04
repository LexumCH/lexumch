import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
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
  const { t } = useTesti();
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="segnalibro" />
        <Testo tipo="dS" style={{ flex: 1 }}>
          {apre ? t('chat.nuova.titoloApre') : t('chat.nuova.titolo')}
        </Testo>
      </View>
      <Testo colore={colori.fg2}>
        {t('chat.nuova.testo', {
          cosa: apre ? t('chat.nuova.titoloChat', { titolo: apre }) : t('chat.nuova.unaNuova'),
          chat: titoloChat ? t('chat.nuova.titoloChat', { titolo: titoloChat }) : t('chat.nuova.inCorso'),
        })}
      </Testo>
      <Pulsante titolo={t('chat.nuova.salva')} onPress={onSalva} />
      <Pulsante
        titolo={apre ? t('chat.nuova.apriSenzaSalvare') : t('chat.nuova.senzaSalvare')}
        variante="linea"
        onPress={onNuova}
      />
      <Pulsante titolo={t('comune.annulla')} variante="tenue" onPress={onChiudi} />
    </Foglio>
  );
}
