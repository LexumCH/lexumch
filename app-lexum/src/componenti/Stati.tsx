import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Icona, type NomeIcona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { colori, famiglie } from '@/tema';
import { useTesti } from '@/lingue/useTesti';

const nativo = Platform.OS !== 'web';

// Elenco vuoto: icona, una riga che spiega e, se serve, cosa fare.
export function StatoVuoto({
  icona,
  titolo,
  testo,
  azione,
}: {
  icona: NomeIcona;
  titolo: string;
  testo?: string;
  azione?: { titolo: string; onPress: () => void };
}) {
  return (
    <View style={stili.vuoto}>
      <IconaQuadrata nome={icona} tenue lato={48} dimensione={22} />
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Testo medio centrato>
          {titolo}
        </Testo>
        {testo ? (
          <Testo tipo="small" colore={colori.fg3} centrato>
            {testo}
          </Testo>
        ) : null}
      </View>
      {azione ? <Pulsante titolo={azione.titolo} variante="linea" piccolo onPress={azione.onPress} /> : null}
    </View>
  );
}

// Elenco in caricamento: righe grigie che pulsano piano, al posto della rotellina.
export function Caricamento({ righe = 4 }: { righe?: number }) {
  const [opacita] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(opacita, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: nativo,
        }),
        Animated.timing(opacita, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: nativo,
        }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [opacita]);
  const { t } = useTesti();
  return (
    <Animated.View
      style={{ opacity: opacita }}
      accessibilityRole="progressbar"
      accessibilityLabel={t('interfaccia.caricamento')}
    >
      {Array.from({ length: righe }, (_, i) => (
        <View key={i} style={stili.riga}>
          <View style={[stili.blocco, { width: 70, height: 14 }]} />
          <View style={[stili.blocco, { width: i % 2 ? '70%' : '85%', height: 16 }]} />
          <View style={[stili.blocco, { width: '95%', height: 12 }]} />
        </View>
      ))}
    </Animated.View>
  );
}

// Striscia in cima quando il telefono è senza connessione.
export function StrisciaOffline() {
  const { t } = useTesti();
  return (
    <View style={stili.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icona nome="offline" dimensione={18} colore={colori.warn} />
      <Text style={stili.offlineTesto}>{t('interfaccia.offline')}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  vuoto: { alignItems: 'center', gap: 14, paddingVertical: 36, paddingHorizontal: 32 },
  riga: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  blocco: { backgroundColor: colori.surface2 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colori.bg2,
    borderBottomWidth: 1,
    borderBottomColor: colori.warnLine,
  },
  offlineTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18, color: colori.fg2 },
});
