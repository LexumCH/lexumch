import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colori, famiglie } from '@/tema';

type Props = {
  attiva: boolean;
  onPress: () => void;
  titolo: string;
  sottotitolo?: string;
  sinistra?: ReactNode;
  sotto?: ReactNode; // contenuto sotto la testa, dentro il riquadro (per esempio le fonti del paese)
  compatta?: boolean;
  grande?: boolean;
  stile?: StyleProp<ViewStyle>;
};

// .scelta: riquadro con il pallino a destra, per scegliere una sola opzione.
export function Scelta({
  attiva,
  onPress,
  titolo,
  sottotitolo,
  sinistra,
  sotto,
  compatta,
  grande,
  stile,
}: Props) {
  return (
    <View
      style={[
        stili.scelta,
        attiva && stili.on,
        sotto ? stili.conSotto : null,
        compatta && stili.compatta,
        stile,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        aria-checked={attiva}
        accessibilityLabel={sottotitolo ? `${titolo}. ${sottotitolo}` : titolo}
        style={[stili.testa, !sotto && !compatta && { alignItems: 'flex-start' }]}
      >
        {sinistra}
        <View style={stili.corpo}>
          <Text style={[stili.titolo, grande && { fontSize: 17 }]}>{titolo}</Text>
          {sottotitolo ? <Text style={stili.sub}>{sottotitolo}</Text> : null}
        </View>
        <View style={[stili.radio, attiva && { borderColor: colori.accent }]}>
          {attiva ? <View style={stili.radioPieno} /> : null}
        </View>
      </Pressable>
      {sotto}
    </View>
  );
}

const stili = StyleSheet.create({
  scelta: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.surface,
    alignSelf: 'stretch',
  },
  on: { borderColor: colori.accent, backgroundColor: colori.accentSoft },
  conSotto: { paddingTop: 12, paddingBottom: 0, paddingHorizontal: 14, gap: 8 },
  compatta: { paddingVertical: 10, paddingHorizontal: 14 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  corpo: { flex: 1, gap: 3 },
  titolo: { fontFamily: famiglie.testoMedio, fontSize: 16, color: colori.fg },
  sub: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20, color: colori.fg2 },
  radio: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colori.fg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPieno: { width: 10, height: 10, backgroundColor: colori.accent },
});
