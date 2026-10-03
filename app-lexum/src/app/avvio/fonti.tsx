import { router } from 'expo-router';
import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { contenuti } from '@/paesi/contenuti';
import { PaginaBenvenuto } from '@/schermate/PaginaBenvenuto';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A2 · Le fonti: da dove prende le risposte Lex.
export default function Fonti() {
  const { paese } = useStato();
  const testi = contenuti[paese];
  const fonti = testi.fontiBenvenuto;
  return (
    <PaginaBenvenuto
      pagina={1}
      alone={110}
      azione={{ titolo: 'Salta', onPress: () => router.push('/avvio/registrazione') }}
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
      eyebrow="Banca dati"
      titolo="Ogni risposta ha "
      titoloOro="la sua fonte."
      sottotitolo={testi.fontiTesto}
      pulsanti={<Pulsante titolo="Avanti" onPress={() => router.push('/avvio/gratis')} />}
    />
  );
}
