import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Logo, Punti } from '@/componenti/Elementi';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Evidenza, Eyebrow, Testo } from '@/componenti/Testo';
import { colori } from '@/tema';

type Props = {
  pagina: number; // 0, 1, 2
  alone: number;
  azione?: { titolo: string; onPress: () => void }; // «Accedi», «Salta»
  visuale: ReactNode;
  eyebrow: string;
  titolo: string;
  titoloOro: string;
  sottotitolo: string;
  pulsanti: ReactNode;
};

// Struttura comune delle tre pagine di benvenuto (A1, A2, A3).
export function PaginaBenvenuto({
  pagina,
  alone,
  azione,
  visuale,
  eyebrow,
  titolo,
  titoloOro,
  sottotitolo,
  pulsanti,
}: Props) {
  return (
    <Schermata hero alone={alone}>
      <View style={stili.testa}>
        <View style={stili.logo}>
          <Logo />
        </View>
        {azione ? (
          <Pulsante titolo={azione.titolo} variante="tenue" piccolo onPress={azione.onPress} />
        ) : null}
      </View>
      <ScrollView contentContainerStyle={stili.scorre} bounces={false}>
        <View style={stili.visuale}>{visuale}</View>
        <View style={stili.testi}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Testo tipo="dXl" accessibilityRole="header">
            {titolo}
            <Evidenza oro corsivo>
              {titoloOro}
            </Evidenza>
          </Testo>
          <Testo colore={colori.fg2}>{sottotitolo}</Testo>
          <View style={{ marginTop: 6 }}>
            <Punti totale={3} attivo={pagina} />
          </View>
          <View style={{ marginTop: 6, gap: 4 }}>{pulsanti}</View>
        </View>
      </ScrollView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
  },
  logo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scorre: { flexGrow: 1 },
  visuale: { flex: 1, justifyContent: 'center', paddingTop: 8, paddingHorizontal: 24, minHeight: 180 },
  testi: { gap: 16, paddingTop: 28, paddingHorizontal: 24 },
});
