import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ElencoSchermate } from '@/anteprima/ElencoSchermate';

// Solo nel browser, su uno schermo largo: l'app sta dentro una sagoma di telefono
// (390 × 844, come docs/mockup/anteprima/) e, in sviluppo o nell'anteprima web
// (EXPO_PUBLIC_ANTEPRIMA=1, vedi scripts/anteprima-web.mjs), a sinistra c'è l'elenco
// delle schermate. Sul telefono vero e nei browser stretti l'app occupa tutto lo schermo.

const conElencoSchermate = __DEV__ || process.env.EXPO_PUBLIC_ANTEPRIMA === '1';

const LARGHEZZA = 390;
const ALTEZZA = 844;

// Spazi della barra di stato e della barra di Home di un iPhone, simulati nella sagoma.
const spaziSimulati = { top: 47, bottom: 34, left: 0, right: 0 };

export function Cornice({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= 500) return <>{children}</>;
  const altezza = Math.min(ALTEZZA, height - 40);
  const conElenco = conElencoSchermate && width >= 760;
  return (
    <View style={stili.scena}>
      {conElenco ? <ElencoSchermate /> : null}
      <View style={[stili.telefono, { height: altezza }]}>
        <SafeAreaInsetsContext.Provider value={spaziSimulati}>{children}</SafeAreaInsetsContext.Provider>
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  scena: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    padding: 20,
    backgroundColor: '#061219',
  },
  telefono: {
    width: LARGHEZZA,
    overflow: 'hidden',
    borderRadius: 44,
    boxShadow: '0 0 0 9px #13232d, 0 0 0 10px #2a3b46, 0 40px 90px rgba(0,0,0,0.55)',
  },
});
