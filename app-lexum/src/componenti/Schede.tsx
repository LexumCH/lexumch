import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colori, famiglie } from '@/tema';

// Schede orizzontali con la riga d'oro sotto quella attiva (per esempio nel dettaglio di una pratica).
export function Schede<T extends string>({
  voci,
  attiva,
  onCambia,
}: {
  voci: { valore: T; titolo: string }[];
  attiva: T;
  onCambia: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={stili.barra}
      contentContainerStyle={stili.contenuto}
      accessibilityRole="tablist"
    >
      {voci.map((v) => {
        const on = v.valore === attiva;
        return (
          <Pressable
            key={v.valore}
            onPress={() => onCambia(v.valore)}
            accessibilityRole="tab"
            aria-selected={on}
            style={[stili.scheda, on && stili.schedaOn]}
          >
            <Text style={[stili.testo, on && stili.testoOn]}>{v.titolo}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  barra: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colori.line },
  contenuto: { paddingHorizontal: 12 },
  scheda: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  schedaOn: { borderBottomColor: colori.accent },
  testo: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  testoOn: { fontFamily: famiglie.testoMedio, color: colori.fg },
});
