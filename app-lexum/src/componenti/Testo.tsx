import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colori, famiglie, tipi, type TipoTesto } from '@/tema';

const titoli: TipoTesto[] = ['dXl', 'dL', 'dM', 'dS'];

type PropsTesto = TextProps & {
  tipo?: TipoTesto;
  colore?: string;
  medio?: boolean;
  forte?: boolean;
  oro?: boolean;
  corsivo?: boolean;
  centrato?: boolean;
  style?: StyleProp<TextStyle>;
};

// Testo con le classi tipografiche del mockup (.d-xl … .t-mini).
export function Testo({
  tipo = 'body',
  colore,
  medio,
  forte,
  oro,
  corsivo,
  centrato,
  style,
  ...resto
}: PropsTesto) {
  const base: TextStyle = { ...tipi[tipo], color: colore ?? (oro ? colori.accentText : colori.fg) };
  if (tipo === 'cap' || tipo === 'mini') base.color = colore ?? (oro ? colori.accentText : colori.fg3);
  if (titoli.includes(tipo)) {
    if (corsivo) base.fontFamily = famiglie.titoloCorsivo;
  } else if (forte) {
    base.fontFamily = famiglie.testoSemi;
  } else if (medio) {
    base.fontFamily = famiglie.testoMedio;
  }
  if (centrato) base.textAlign = 'center';
  return <Text style={[base, style]} {...resto} />;
}

type PropsEvidenza = {
  children: ReactNode;
  oro?: boolean;
  corsivo?: boolean;
  forte?: boolean;
  medio?: boolean;
  colore?: string;
  style?: StyleProp<TextStyle>;
};

// Parte evidenziata dentro un Testo: eredita dimensione e interlinea dal genitore.
export function Evidenza({ children, oro, corsivo, forte, medio, colore, style }: PropsEvidenza) {
  const s: TextStyle = {};
  if (oro) s.color = colori.accentText;
  if (colore) s.color = colore;
  if (corsivo) s.fontFamily = famiglie.titoloCorsivo;
  else if (forte) s.fontFamily = famiglie.testoSemi;
  else if (medio) s.fontFamily = famiglie.testoMedio;
  return <Text style={[s, style]}>{children}</Text>;
}

// .eyebrow: maiuscoletto con la lineetta davanti.
export function Eyebrow({ children, colore = colori.ok }: { children: ReactNode; colore?: string }) {
  return (
    <View style={stili.eyebrow}>
      <View style={[stili.lineetta, { backgroundColor: colore }]} />
      <Text style={[tipi.eyebrow, { color: colore }]}>{children}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineetta: { width: 24, height: 1 },
});
