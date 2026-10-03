import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icona } from '@/componenti/Icona';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { colori, famiglie, misure } from '@/tema';

type Props = {
  valore: string;
  onCambia: (testo: string) => void;
  onInvia: () => void;
  onAllega: () => void;
  occupato?: boolean; // Lex sta lavorando
  offline?: boolean; // senza connessione non si manda niente
};

// .composer: dove si scrive a Lex. In basso, sopra la nota «Lex può commettere errori».
export function Compositore({ valore, onCambia, onInvia, onAllega, occupato, offline }: Props) {
  const pieno = valore.trim().length > 0 && !occupato && !offline;
  return (
    <View style={stili.composer}>
      <View style={stili.box}>
        <TextInput
          value={valore}
          onChangeText={onCambia}
          placeholder={
            occupato
              ? 'Lex sta lavorando…'
              : offline
                ? 'Senza connessione: Lex torna appena sei online'
                : 'Racconta il tuo caso a Lex…'
          }
          placeholderTextColor={colori.fg3}
          selectionColor={colori.accent}
          editable={!occupato}
          multiline
          accessibilityLabel="Scrivi a Lex"
          style={[stili.testo, Platform.OS === 'web' && ({ outlineWidth: 0 } as const)]}
          onKeyPress={(e) => {
            // sul web Invio manda, Maiusc+Invio va a capo
            const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              if (pieno) onInvia();
            }
          }}
        />
        <View style={stili.riga}>
          <PulsanteIcona
            icona="piu"
            etichetta="Allega un documento"
            onPress={onAllega}
            disabilitato={occupato}
          />
          <Pressable
            onPress={onInvia}
            disabled={!pieno}
            accessibilityRole="button"
            accessibilityLabel="Invia"
            aria-disabled={!pieno}
            style={({ pressed }) => [stili.invia, !pieno && stili.spento, pressed && { opacity: 0.85 }]}
          >
            <Icona nome="invia" dimensione={20} colore={pieno ? colori.accentFg : colori.fg3} />
          </Pressable>
        </View>
      </View>
      <Text style={stili.nota}>Lex può commettere errori: verifica sempre le fonti citate.</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  composer: { paddingTop: 10, paddingHorizontal: 12, backgroundColor: colori.bg },
  box: {
    backgroundColor: colori.surface,
    borderWidth: 1,
    borderColor: colori.line2,
    paddingTop: 12,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    gap: 4,
  },
  testo: {
    fontFamily: famiglie.testo,
    fontSize: 16,
    lineHeight: 23,
    color: colori.fg,
    minHeight: 24,
    maxHeight: 140,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
  },
  riga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -10 },
  invia: {
    width: misure.tocco,
    height: misure.tocco,
    backgroundColor: colori.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spento: { backgroundColor: colori.surface2 },
  nota: {
    fontFamily: famiglie.testo,
    fontSize: 12,
    lineHeight: 16,
    color: colori.fg3,
    textAlign: 'center',
    paddingTop: 8,
  },
});
