import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colori, gradienteHero } from '@/tema';

type Props = {
  children: ReactNode;
  hero?: boolean; // sfondo sfumato delle schermate di benvenuto
  alone?: number; // distanza dall'alto dell'alone dorato (solo con hero)
  senzaFondo?: boolean; // niente spazio sicuro in basso (lo gestisce la schermata)
  stile?: StyleProp<ViewStyle>;
};

// Contenitore di ogni schermata: fondo petrolio e spazi sicuri del telefono
// (la barra di stato e la barra di Home le disegna il sistema).
export function Schermata({ children, hero, alone, senzaFondo, stile }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.schermata, stile]}>
      {hero ? (
        <LinearGradient
          colors={gradienteHero.colori}
          locations={gradienteHero.posizioni}
          start={{ x: 0.33, y: 0 }}
          end={{ x: 0.67, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {hero && alone !== undefined ? <Alone alto={alone} /> : null}
      <View style={{ height: insets.top }} />
      <View style={stili.corpo}>{children}</View>
      {senzaFondo ? null : <View style={{ height: insets.bottom }} />}
    </View>
  );
}

// .alone: bagliore dorato radiale dietro il logo.
export function Alone({ alto }: { alto: number }) {
  return (
    <View style={[stili.alone, { top: alto }]}>
      <Svg width={420} height={420}>
        <Defs>
          <RadialGradient id="alone" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colori.oro} stopOpacity={0.16} />
            <Stop offset="1" stopColor={colori.oro} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={420} height={420} fill="url(#alone)" />
      </Svg>
    </View>
  );
}

const stili = StyleSheet.create({
  schermata: { flex: 1, backgroundColor: colori.bg, overflow: 'hidden' },
  corpo: { flex: 1, minHeight: 0 },
  alone: {
    position: 'absolute',
    left: '50%',
    marginLeft: -210,
    width: 420,
    height: 420,
    pointerEvents: 'none',
  },
});
