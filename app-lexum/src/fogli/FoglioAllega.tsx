import { View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onArchivio: () => void;
};

// B5 · Allega un documento. Scanner e file del telefono arrivano con le tappe 3 e 6:
// per ora quelle due voci chiudono soltanto il foglio.
export function FoglioAllega({ visibile, onChiudi, onArchivio }: Props) {
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">Allega un documento</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Lex lo legge, lo confronta con la legge e risponde alla tua domanda.
        </Testo>
      </View>
      <View style={{ marginHorizontal: -20 }}>
        <Riga
          sinistra={<IconaQuadrata nome="fotocamera" />}
          titolo="Scansiona con la fotocamera"
          sottotitolo="Lettere, multe, contratti su carta: diventano un PDF"
          freccia="avanti"
          onPress={onChiudi}
        />
        <Riga
          sinistra={<IconaQuadrata nome="cartella" />}
          titolo="Dal tuo dispositivo"
          sottotitolo="PDF, Word o testo"
          freccia="avanti"
          onPress={onChiudi}
        />
        <Riga
          sinistra={<IconaQuadrata nome="archivio" />}
          titolo="Dal tuo archivio"
          sottotitolo="I documenti che hai già salvato su Lexum"
          freccia="avanti"
          onPress={onArchivio}
        />
      </View>
      <Testo tipo="cap">Se non lo salvi nell'archivio, il documento si cancella da solo dopo 4 ore.</Testo>
    </Foglio>
  );
}
