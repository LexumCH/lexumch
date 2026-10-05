import { Pressable, StyleSheet, Text } from 'react-native';

import { Icona, type NomeIcona } from '@/componenti/Icona';
import { colori, famiglie } from '@/tema';

// .chip: suggerimento da toccare (per esempio una domanda d'esempio per Lex).
// Leggero di proposito (testo piccolo e bordo tenue): è un aiuto, non il centro della home.
export function Chip({
  testo,
  onPress,
  icona = 'freccia',
}: {
  testo: string;
  onPress?: () => void;
  icona?: NomeIcona;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [stili.chip, pressed && { borderColor: colori.accentLine }]}
    >
      <Icona nome={icona} dimensione={15} colore={colori.accentText} />
      <Text style={stili.testo}>{testo}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colori.line,
    alignSelf: 'stretch',
  },
  testo: { flex: 1, fontFamily: famiglie.testo, fontSize: 14, lineHeight: 19, color: colori.fg2 },
});
