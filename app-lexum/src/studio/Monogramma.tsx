import { StyleSheet, View } from 'react-native';

import { Testo } from '@/componenti/Testo';
import { colori, famiglie } from '@/tema';

import { iniziali } from './clienti';

// Le iniziali del cliente in un quadrato: oro per le persone, salvia per le società.
export function Monogramma({
  nome,
  giuridica,
  grande,
}: {
  nome: string;
  giuridica?: boolean;
  grande?: boolean;
}) {
  const lato = grande ? 52 : 40;
  return (
    <View
      style={[
        stili.mono,
        { width: lato, height: lato },
        giuridica && { borderColor: colori.okLine, backgroundColor: colori.okSoft },
      ]}
    >
      <Testo
        tipo="small"
        colore={giuridica ? colori.ok : colori.accentText}
        style={{ fontFamily: famiglie.testoMedio, fontSize: grande ? 18 : 14 }}
      >
        {iniziali(nome)}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  mono: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colori.accentLine,
    backgroundColor: colori.accentSoft,
  },
});
