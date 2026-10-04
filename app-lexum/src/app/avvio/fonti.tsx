import { router } from 'expo-router';
import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { useTesti } from '@/lingue/useTesti';
import { contenutiIn } from '@/paesi/contenuti';
import { PaginaBenvenuto } from '@/schermate/PaginaBenvenuto';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A2 · Le fonti: da dove prende le risposte Lex.
export default function Fonti() {
  const { paese } = useStato();
  const { t, lingua } = useTesti();
  const testi = contenutiIn(paese, lingua);
  const fonti = testi.fontiBenvenuto;
  return (
    <PaginaBenvenuto
      pagina={1}
      alone={110}
      azione={{ titolo: t('comune.salta'), onPress: () => router.push('/avvio/registrazione') }}
      visuale={
        <View style={{ backgroundColor: colori.bg2, borderWidth: 1, borderColor: colori.line }}>
          {fonti.map((f, i) => (
            <Riga
              key={f.nome}
              sinistra={<IconaQuadrata nome={f.icona} />}
              titolo={f.nome}
              sottotitolo={f.descrizione}
              valore={f.valore}
              senzaBordo={i === fonti.length - 1}
              stile={{ paddingHorizontal: 16 }}
            />
          ))}
        </View>
      }
      eyebrow={t('avvio.fonti.sopratitolo')}
      titolo={t('avvio.fonti.titolo')}
      titoloOro={t('avvio.fonti.titoloOro')}
      sottotitolo={testi.fontiTesto}
      pulsanti={<Pulsante titolo={t('comune.avanti')} onPress={() => router.push('/avvio/gratis')} />}
    />
  );
}
