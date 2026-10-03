import { Pressable, StyleSheet, Text } from 'react-native';

import { Icona, type NomeIcona } from '@/componenti/Icona';
import { colori, famiglie } from '@/tema';

// .chip: suggerimento da toccare (per esempio una domanda d'esempio per Lex).
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
      <Icona nome={icona} dimensione={18} colore={colori.accentText} />
      <Text style={stili.testo}>{testo}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  chip: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    alignSelf: 'stretch',
  },
  testo: { flex: 1, fontFamily: famiglie.testo, fontSize: 15, lineHeight: 20, color: colori.fg },
});
