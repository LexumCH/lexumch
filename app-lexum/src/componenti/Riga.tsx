import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icona, type NomeIcona } from '@/componenti/Icona';
import { colori, famiglie } from '@/tema';

type Props = {
  titolo: ReactNode;
  sottotitolo?: string;
  sinistra?: ReactNode;
  destra?: ReactNode;
  valore?: string;
  valoreOro?: boolean;
  freccia?: NomeIcona; // chevron a destra
  onPress?: () => void;
  stretta?: boolean;
  evidenziata?: boolean;
  sfondo?: string;
  altezza?: number;
  inAlto?: boolean;
  senzaBordo?: boolean;
  bordoSopra?: boolean;
  sotto?: ReactNode; // contenuto extra sotto il sottotitolo (per esempio i badge)
  titoloStile?: StyleProp<TextStyle>;
  stile?: StyleProp<ViewStyle>;
  etichetta?: string;
  ruolo?: 'button' | 'link' | 'radio' | 'switch';
  selezionata?: boolean;
};

// .riga: voce di elenco alta almeno 62 (54 se stretta), con bordo sotto.
export function Riga({
  titolo,
  sottotitolo,
  sinistra,
  destra,
  valore,
  valoreOro,
  freccia,
  onPress,
  stretta,
  evidenziata,
  sfondo,
  altezza,
  inAlto,
  senzaBordo,
  bordoSopra,
  sotto,
  titoloStile,
  stile,
  etichetta,
  ruolo = 'button',
  selezionata,
}: Props) {
  const contenuto = (
    <>
      {sinistra}
      <View style={stili.corpo}>
        {typeof titolo === 'string' ? <Text style={[stili.ttl, titoloStile]}>{titolo}</Text> : titolo}
        {sottotitolo ? <Text style={stili.sub}>{sottotitolo}</Text> : null}
        {sotto}
      </View>
      {valore ? <Text style={[stili.val, valoreOro && { color: colori.accentText }]}>{valore}</Text> : null}
      {destra}
      {freccia ? <Icona nome={freccia} dimensione={18} colore={colori.fg3} /> : null}
    </>
  );
  const stileRiga: StyleProp<ViewStyle> = [
    stili.riga,
    stretta && stili.stretta,
    altezza !== undefined && { minHeight: altezza },
    inAlto && { alignItems: 'flex-start' },
    senzaBordo && { borderBottomWidth: 0 },
    bordoSopra && { borderTopWidth: 1, borderTopColor: colori.line },
    evidenziata && { backgroundColor: colori.accentSoft },
    sfondo ? { backgroundColor: sfondo } : null,
    stile,
  ];
  if (!onPress) return <View style={stileRiga}>{contenuto}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={ruolo}
      accessibilityLabel={etichetta}
      aria-checked={ruolo === 'radio' || ruolo === 'switch' ? !!selezionata : undefined}
      style={({ pressed }) => [stileRiga, pressed && { backgroundColor: colori.bg2 }]}
    >
      {contenuto}
    </Pressable>
  );
}

const stili = StyleSheet.create({
  riga: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
    alignSelf: 'stretch',
  },
  stretta: { minHeight: 54, paddingVertical: 8 },
  corpo: { flex: 1, minWidth: 0, gap: 3 },
  ttl: { fontFamily: famiglie.testo, fontSize: 16, lineHeight: 21, color: colori.fg },
  sub: { fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18, color: colori.fg3 },
  val: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
});
