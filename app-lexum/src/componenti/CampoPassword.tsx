import { useState } from 'react';
import type { TextInputProps } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { colori } from '@/tema';
import { useTesti } from '@/lingue/useTesti';

type Props = TextInputProps & { etichetta: string };

// Campo password con l'occhio per mostrarla o nasconderla.
export function CampoPassword({ etichetta, ...resto }: Props) {
  const [vedi, setVedi] = useState(false);
  const { t } = useTesti();
  return (
    <Campo
      etichetta={etichetta}
      secureTextEntry={!vedi}
      autoCapitalize="none"
      autoCorrect={false}
      dopo={
        <PulsanteIcona
          icona="occhio"
          etichetta={vedi ? t('interfaccia.nascondiPassword') : t('interfaccia.mostraPassword')}
          dimensione={20}
          colore={colori.fg3}
          onPress={() => setVedi((v) => !v)}
          stile={{ marginRight: -8 }}
        />
      }
      {...resto}
    />
  );
}
