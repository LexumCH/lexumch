import { forwardRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Icona } from '@/componenti/Icona';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { colori, famiglie } from '@/tema';

// Sul web il bordo di focus lo disegniamo noi (oro), non il browser.
const senzaContorno = Platform.OS === 'web' ? ({ outlineWidth: 0 } as const) : null;

type PropsCampo = TextInputProps & {
  etichetta: string;
  dopo?: React.ReactNode;
  stile?: StyleProp<ViewStyle>;
};

// .field + .input: etichetta sopra e campo alto 52.
export function Campo({ etichetta, dopo, stile, onFocus, onBlur, ...resto }: PropsCampo) {
  const [attivo, setAttivo] = useState(false);
  return (
    <View style={[stili.field, stile]}>
      <Text style={stili.label}>{etichetta}</Text>
      <View style={[stili.input, attivo && stili.attivo]}>
        <TextInput
          accessibilityLabel={etichetta}
          placeholderTextColor={colori.fg3}
          selectionColor={colori.accent}
          style={[stili.testoInput, senzaContorno]}
          onFocus={(e) => {
            setAttivo(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setAttivo(false);
            onBlur?.(e);
          }}
          {...resto}
        />
        {dopo}
      </View>
    </View>
  );
}

// Campo che si tocca per scegliere (per esempio la professione): sembra un campo, apre una scelta.
export function CampoScelta({
  etichetta,
  valore,
  onPress,
}: {
  etichetta: string;
  valore: string;
  onPress?: () => void;
}) {
  return (
    <View style={stili.field}>
      <Text style={stili.label}>{etichetta}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${etichetta}: ${valore}`}
        style={[stili.input, { justifyContent: 'space-between' }]}
      >
        <Text style={stili.testoInput}>{valore}</Text>
        <Icona nome="giu" dimensione={20} colore={colori.fg3} />
      </Pressable>
    </View>
  );
}

type PropsCerca = TextInputProps & {
  etichetta: string;
  alto?: number;
  onCancella?: () => void;
  stile?: StyleProp<ViewStyle>;
};

// .cerca: campo di ricerca con la lente.
export const CampoCerca = forwardRef<TextInput, PropsCerca>(function CampoCerca(
  { etichetta, alto = 50, onCancella, stile, onFocus, onBlur, value, ...resto },
  ref,
) {
  const [attivo, setAttivo] = useState(false);
  return (
    <View style={[stili.cerca, { height: alto }, attivo && stili.attivo, stile]}>
      <Icona nome="cerca" dimensione={18} colore={colori.fg3} />
      <TextInput
        ref={ref}
        accessibilityLabel={etichetta}
        placeholderTextColor={colori.fg3}
        selectionColor={colori.accent}
        returnKeyType="search"
        value={value}
        style={[stili.testoCerca, senzaContorno]}
        onFocus={(e) => {
          setAttivo(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setAttivo(false);
          onBlur?.(e);
        }}
        {...resto}
      />
      {onCancella && value ? (
        <PulsanteIcona icona="chiudi" etichetta="Cancella la ricerca" dimensione={18} onPress={onCancella} />
      ) : null}
    </View>
  );
});

// .cerca usato come pulsante: tocchi e si apre la ricerca vera.
export function FintoCerca({
  testo,
  etichetta,
  onPress,
}: {
  testo: string;
  etichetta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="search"
      accessibilityLabel={etichetta}
      style={({ pressed }) => [stili.cerca, pressed && { borderColor: colori.accentLine }]}
    >
      <Icona nome="cerca" dimensione={18} colore={colori.fg3} />
      <Text style={[stili.testoCerca, { color: colori.fg3 }]}>{testo}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: famiglie.testo, fontSize: 13, letterSpacing: 0.26, color: colori.fg2 },
  input: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: colori.surface,
    borderWidth: 1,
    borderColor: colori.line2,
  },
  attivo: { borderColor: colori.accent },
  testoInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: famiglie.testo,
    fontSize: 16,
    color: colori.fg,
    paddingVertical: 0,
  },
  cerca: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 4,
    backgroundColor: colori.surface,
    borderWidth: 1,
    borderColor: colori.line2,
  },
  testoCerca: {
    flex: 1,
    minWidth: 0,
    fontFamily: famiglie.testo,
    fontSize: 16,
    color: colori.fg,
    paddingVertical: 0,
  },
});
