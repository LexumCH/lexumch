import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BadgePaese, Emblema } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { PulsanteIcona, SpazioIcona } from '@/componenti/Pulsante';
import { indietro, useVaiASezione } from '@/navigazione';
import { paesePredefinito, trovaPaese } from '@/paesi/registro';
import { useMenu } from '@/stato/Menu';
import { useStato } from '@/stato/Stato';
import { colori, famiglie, misure } from '@/tema';

type Props = {
  sinistra?: ReactNode;
  titolo?: string;
  centro?: ReactNode;
  destra?: ReactNode;
  paese?: boolean; // mostra la sigla del paese accanto al titolo (fuori dall'Italia)
  stile?: StyleProp<ViewStyle>;
};

// .hdr: intestazione alta 52, con pulsante a sinistra, titolo al centro e azione a destra.
export function Intestazione({ sinistra, titolo, centro, destra, paese, stile }: Props) {
  return (
    <View style={[stili.hdr, stile]}>
      {sinistra ?? <SpazioIcona />}
      <View style={stili.centro}>
        {centro ??
          (titolo ? (
            <Text style={stili.titolo} numberOfLines={1} accessibilityRole="header">
              {titolo}
            </Text>
          ) : null)}
        {paese ? <SiglaPaese /> : null}
      </View>
      {destra ?? <SpazioIcona />}
    </View>
  );
}

// Sigla del paese accanto al titolo: si vede solo fuori dal paese predefinito (come nei mockup G4–G5).
function SiglaPaese() {
  const { paese } = useStato();
  if (paese === paesePredefinito) return null;
  return <BadgePaese codice={paese} piccolo nome={trovaPaese(paese).nome} />;
}

export function BottoneMenu() {
  const { apri } = useMenu();
  return <PulsanteIcona icona="menu" etichetta="Apri il menù" onPress={apri} />;
}

export function BottoneIndietro({
  ripiego,
  etichetta = 'Indietro',
  onPress,
}: {
  ripiego: Href;
  etichetta?: string;
  onPress?: () => void;
}) {
  return (
    <PulsanteIcona icona="indietro" etichetta={etichetta} onPress={onPress ?? (() => indietro(ripiego))} />
  );
}

// .lex-badge: emblema e «Lex» al centro della home.
export function LexBadge() {
  return (
    <View style={stili.lex}>
      <Emblema larghezza={24} altezza={16} />
      <Text style={stili.titolo}>Lex</Text>
    </View>
  );
}

// .crediti: contatore dei crediti; porta al Profilo.
export function ContatoreCrediti() {
  const { conto } = useStato();
  const vai = useVaiASezione();
  const n = conto.crediti;
  const zero = n <= 0;
  const etichetta = zero
    ? 'Nessun credito disponibile'
    : n === 1
      ? '1 credito disponibile'
      : `${n} crediti disponibili`;
  return (
    <Pressable
      onPress={() => vai('/profilo')}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [
        stili.crediti,
        zero && { borderColor: colori.warnLine },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icona nome="stella" dimensione={16} colore={zero ? colori.warn : colori.ok} />
      <Text style={stili.creditiTesto}>{n}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  hdr: {
    height: misure.intestazione,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  centro: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  titolo: {
    fontFamily: famiglie.testoMedio,
    fontSize: 17,
    letterSpacing: 0.17,
    color: colori.fg,
    flexShrink: 1,
  },
  lex: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  crediti: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colori.okLine,
    marginRight: 6,
  },
  creditiTesto: { fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.fg },
});
