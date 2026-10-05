import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori } from '@/tema';
import { useTesti } from '@/lingue/useTesti';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  children: ReactNode;
  spazio?: number; // distanza tra i blocchi (gap del mockup)
  stile?: StyleProp<ViewStyle>;
};

const nativo = Platform.OS !== 'web';

// .foglio: foglio che sale dal basso sopra la schermata, con il velo scuro dietro.
// Si chiude toccando il velo, con «indietro» su Android, o con i pulsanti dentro.
export function Foglio({ visibile, onChiudi, children, spazio = 14, stile }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTesti();
  const [montato, setMontato] = useState(visibile);
  const [avanzamento] = useState(() => new Animated.Value(visibile ? 1 : 0));
  // si monta subito quando diventa visibile; si smonta a fine animazione di chiusura
  if (visibile && !montato) setMontato(true);

  useEffect(() => {
    Animated.timing(avanzamento, {
      toValue: visibile ? 1 : 0,
      duration: visibile ? 260 : 200,
      easing: visibile ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: nativo,
    }).start(({ finished }) => {
      if (finished && !visibile) setMontato(false);
    });
  }, [visibile, avanzamento]);

  useEffect(() => {
    if (!visibile) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onChiudi();
      return true;
    });
    return () => sub.remove();
  }, [visibile, onChiudi]);

  if (!montato) return null;

  const traslazione = avanzamento.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: visibile ? 'auto' : 'none' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: avanzamento }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, stili.velo]}
          onPress={onChiudi}
          accessibilityRole="button"
          accessibilityLabel={t('interfaccia.chiudi')}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[stili.foglio, { transform: [{ translateY: traslazione }] }]}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            stili.contenuto,
            { gap: spazio, paddingBottom: Math.max(insets.bottom, 20) },
            stile,
          ]}
        >
          <View style={stili.maniglia} />
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const stili = StyleSheet.create({
  velo: { backgroundColor: colori.scrim },
  foglio: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    backgroundColor: colori.surface,
    borderTopWidth: 1,
    borderTopColor: colori.accentLine,
  },
  contenuto: { paddingTop: 10, paddingHorizontal: 20 },
  maniglia: {
    width: 40,
    height: 4,
    backgroundColor: colori.line2,
    alignSelf: 'center',
    marginBottom: 4,
  },
});
