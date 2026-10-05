import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onArchivio: () => void;
};

// B5 · Allega un documento. Scanner e file del telefono arrivano con le tappe 3 e 6:
// per ora quelle due voci chiudono soltanto il foglio.
export function FoglioAllega({ visibile, onChiudi, onArchivio }: Props) {
  const { t } = useTesti();
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('chat.allega.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('chat.allega.testo')}
        </Testo>
      </View>
      <View style={{ marginHorizontal: -20 }}>
        <Riga
          sinistra={<IconaQuadrata nome="fotocamera" />}
          titolo={t('chat.allega.scansiona')}
          sottotitolo={t('chat.allega.scansionaSotto')}
          freccia="avanti"
          onPress={onChiudi}
        />
        <Riga
          sinistra={<IconaQuadrata nome="cartella" />}
          titolo={t('chat.allega.dispositivo')}
          sottotitolo={t('chat.allega.dispositivoSotto')}
          freccia="avanti"
          onPress={onChiudi}
        />
        <Riga
          sinistra={<IconaQuadrata nome="archivio" />}
          titolo={t('chat.allega.archivio')}
          sottotitolo={t('chat.allega.archivioSotto')}
          freccia="avanti"
          onPress={onArchivio}
        />
      </View>
      <Testo tipo="cap">{t('chat.allega.nota')}</Testo>
    </Foglio>
  );
}
