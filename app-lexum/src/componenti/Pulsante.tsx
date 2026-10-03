import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icona, type NomeIcona } from '@/componenti/Icona';
import { colori, famiglie, gradienteOro, misure } from '@/tema';

type Variante = 'oro' | 'linea' | 'tenue' | 'pieno' | 'pericolo';

type Props = {
  titolo: string;
  onPress?: () => void;
  variante?: Variante;
  piccolo?: boolean;
  icona?: NomeIcona;
  iconaDopo?: NomeIcona;
  disabilitato?: boolean;
  etichetta?: string;
  ruolo?: 'button' | 'link';
  stile?: StyleProp<ViewStyle>;
  allineaASinistra?: boolean;
  righe?: number; // righe massime del testo (1 di solito)
};

const coloreTesto: Record<Variante, string> = {
  oro: colori.petrolio,
  linea: colori.fg,
  tenue: colori.fg2,
  pieno: colori.fg,
  pericolo: colori.danger,
};

// .btn del mockup: pieno oro, a linea, tenue o pieno scuro; «pericolo» per le azioni definitive.
// Alto 52 (44 se piccolo).
export function Pulsante({
  titolo,
  onPress,
  variante = 'oro',
  piccolo,
  icona,
  iconaDopo,
  disabilitato,
  etichetta,
  ruolo = 'button',
  stile,
  allineaASinistra,
  righe = 1,
}: Props) {
  const colore = coloreTesto[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      accessibilityRole={ruolo}
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: !!disabilitato }}
      style={({ pressed }) => [
        stili.base,
        piccolo ? stili.piccolo : stili.normale,
        variante === 'linea' && stili.linea,
        variante === 'pieno' && stili.pieno,
        variante === 'pericolo' && stili.pericolo,
        allineaASinistra && stili.sinistra,
        (pressed || disabilitato) && { opacity: disabilitato ? 0.5 : 0.85 },
        stile,
      ]}
    >
      {variante === 'oro' ? (
        <LinearGradient
          colors={gradienteOro.colori}
          locations={gradienteOro.posizioni}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* le icone stanno in una View, così sul web restano sopra il gradiente */}
      {icona ? (
        <View style={stili.icona}>
          <Icona nome={icona} dimensione={20} colore={colore} />
        </View>
      ) : null}
      {titolo ? (
        <Text
          numberOfLines={righe}
          style={[stili.testo, piccolo && stili.testoPiccolo, righe > 1 && stili.piuRighe, { color: colore }]}
        >
          {titolo}
        </Text>
      ) : null}
      {iconaDopo ? (
        <View style={stili.icona}>
          <Icona nome={iconaDopo} dimensione={18} colore={colore} />
        </View>
      ) : null}
    </Pressable>
  );
}

type PropsIcona = {
  icona: NomeIcona;
  etichetta: string;
  onPress?: () => void;
  dimensione?: number;
  colore?: string;
  disabilitato?: boolean;
  stile?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// .ib: pulsante solo icona, 44 × 44.
export function PulsanteIcona({
  icona,
  etichetta,
  onPress,
  dimensione = 22,
  colore = colori.fg2,
  disabilitato,
  stile,
}: PropsIcona) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: !!disabilitato }}
      hitSlop={4}
      style={({ pressed }) => [
        stili.ib,
        (pressed || disabilitato) && { opacity: disabilitato ? 0.5 : 0.7 },
        stile,
      ]}
    >
      <Icona nome={icona} dimensione={dimensione} colore={colore} />
    </Pressable>
  );
}

// Spazio vuoto grande come un pulsante icona, per centrare i titoli.
export function SpazioIcona() {
  return <View style={stili.ib} />;
}

const stili = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  normale: { height: 52, paddingHorizontal: 20, alignSelf: 'stretch' },
  piccolo: { height: misure.tocco, paddingHorizontal: 14, alignSelf: 'flex-start' },
  linea: { borderWidth: 1, borderColor: colori.accentLine },
  pieno: { backgroundColor: colori.surface2 },
  pericolo: { borderWidth: 1, borderColor: colori.dangerLine },
  sinistra: { justifyContent: 'flex-start', paddingHorizontal: 14, gap: 12 },
  icona: { position: 'relative' },
  testo: { fontFamily: famiglie.testoMedio, fontSize: 16, position: 'relative', flexShrink: 1 },
  piuRighe: { textAlign: 'center', lineHeight: 20 },
  testoPiccolo: { fontSize: 15 },
  ib: { width: misure.tocco, height: misure.tocco, alignItems: 'center', justifyContent: 'center' },
});
