import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgePaese, Iniziale, Logo, Pallino, TitoloSezione } from '@/componenti/Elementi';
import { Icona, type NomeIcona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { useVaiASezione, type Sezione } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { useMenu } from '@/stato/Menu';
import { strumentiStudio, type StrumentoStudio } from '@/ruoli';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const LARGHEZZA = 316;
const nativo = Platform.OS !== 'web';

const voci: { sezione: Sezione; titolo: string; icona: NomeIcona }[] = [
  { sezione: '/banca-dati', titolo: 'Banca dati', icona: 'libro' },
  { sezione: '/ricerche', titolo: 'Ricerche', icona: 'segnalibro' },
  { sezione: '/archivio', titolo: 'Archivio', icona: 'archivio' },
  { sezione: '/domande', titolo: 'Domande', icona: 'domanda' },
  { sezione: '/profilo', titolo: 'Profilo', icona: 'persona' },
];

// Strumenti dello Studio, solo per i ruoli che li hanno (avvocati; commercialisti e fiduciari in parte).
const vociStudio: Record<StrumentoStudio, { sezione: Sezione; titolo: string; icona: NomeIcona }> = {
  mandati: { sezione: '/pratiche', titolo: 'Pratiche', icona: 'bilancia' },
  calendario: { sezione: '/calendario', titolo: 'Calendario', icona: 'calendario' },
  fatture: { sezione: '/fatture', titolo: 'Fatture', icona: 'ricevuta' },
};

// C1 · Menù laterale: le cinque voci, poi le etichette dell'utente (non lo storico delle chat).
// Per un professionista, sopra c'è il gruppo «Studio» con i suoi strumenti.
export function MenuLaterale() {
  const { aperto, chiudi } = useMenu();
  const insets = useSafeAreaInsets();
  const percorso = usePathname();
  const vai = useVaiASezione();
  const { paese, conto, etichetteAttive, elementiAttivi, chatDaSalvare, ruoli, utente, azioni } = useStato();
  const studio = strumentiStudio(ruoli[paese] ?? 'user').map((s) => vociStudio[s]);
  const [montato, setMontato] = useState(aperto);
  const [avanzamento] = useState(() => new Animated.Value(0));
  if (aperto && !montato) setMontato(true);

  useEffect(() => {
    Animated.timing(avanzamento, {
      toValue: aperto ? 1 : 0,
      duration: aperto ? 240 : 180,
      easing: aperto ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: nativo,
    }).start(({ finished }) => {
      if (finished && !aperto) setMontato(false);
    });
  }, [aperto, avanzamento]);

  useEffect(() => {
    if (!aperto) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      chiudi();
      return true;
    });
    return () => sub.remove();
  }, [aperto, chiudi]);

  // Il menù si chiude quando cambia la schermata.
  useEffect(() => {
    chiudi();
  }, [percorso, chiudi]);

  if (!montato) return null;

  const attiva = (sezione: Sezione) => percorso === sezione || percorso.startsWith(`${sezione}/`);
  const datiPaese = trovaPaese(paese);
  const crediti = conto.crediti === 1 ? '1 credito' : `${conto.crediti} crediti`;
  const traslazione = avanzamento.interpolate({ inputRange: [0, 1], outputRange: [-LARGHEZZA, 0] });

  const nuovaChat = () => {
    chiudi();
    if (chatDaSalvare) {
      vai('/chat', { foglio: 'nuova' });
    } else {
      azioni.nuovaChat();
      vai('/chat');
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: aperto ? 'auto' : 'none' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: avanzamento }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colori.scrim }]}
          onPress={chiudi}
          accessibilityRole="button"
          accessibilityLabel="Chiudi il menù"
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel="Menù"
        style={[stili.cassetto, { transform: [{ translateX: traslazione }] }]}
      >
        <View style={{ height: insets.top }} />
        <View style={stili.testa}>
          <Logo />
          <View style={{ marginLeft: 'auto' }}>
            <BadgePaese codice={paese} piccolo nome={datiPaese.nome} />
          </View>
        </View>
        <View style={stili.nuova}>
          <Pulsante
            titolo="Nuova chat"
            variante="linea"
            icona="modifica"
            allineaASinistra
            onPress={nuovaChat}
          />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
          {studio.length > 0 ? <TitoloSezione stile={{ paddingTop: 6 }}>Studio</TitoloSezione> : null}
          {studio.map((v) => (
            <VoceMenu key={v.sezione} {...v} on={attiva(v.sezione)} onPress={() => vai(v.sezione)} />
          ))}
          {studio.length > 0 ? <TitoloSezione stile={{ paddingTop: 18 }}>Lexum</TitoloSezione> : null}
          {voci.map((v) => (
            <VoceMenu key={v.sezione} {...v} on={attiva(v.sezione)} onPress={() => vai(v.sezione)} />
          ))}
          <TitoloSezione stile={{ paddingTop: 18 }}>Etichette</TitoloSezione>
          {etichetteAttive.length === 0 ? (
            <Text style={stili.vuoto}>Le etichette che crei salvando le chat compaiono qui.</Text>
          ) : null}
          {etichetteAttive.map((e) => {
            const quanti = elementiAttivi.filter((x) => x.etichetta === e.id).length;
            return (
              <Pressable
                key={e.id}
                onPress={() => vai('/ricerche', { etichetta: e.id })}
                accessibilityRole="button"
                accessibilityLabel={`Etichetta ${e.nome}, ${quanti} elementi`}
                style={({ pressed }) => [stili.etichetta, pressed && { backgroundColor: colori.bg }]}
              >
                <Pallino colore={e.colore} />
                <Text style={stili.etichettaNome} numberOfLines={1}>
                  {e.nome}
                </Text>
                <Text style={stili.etichettaQuanti}>{quanti}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => vai('/profilo')}
          accessibilityRole="button"
          accessibilityLabel="Apri il profilo"
          style={({ pressed }) => [stili.piede, pressed && { backgroundColor: colori.bg }]}
        >
          <Iniziale lettera={(utente.nome || utente.email).charAt(0).toUpperCase()} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={stili.nome}>{`${utente.nome} ${utente.cognome}`.trim() || utente.email}</Text>
            <Text style={stili.dettaglio} numberOfLines={1}>
              {datiPaese.nome} · {conto.piano} · {crediti}
            </Text>
          </View>
        </Pressable>
        <View style={{ height: insets.bottom }} />
      </Animated.View>
    </View>
  );
}

function VoceMenu({
  titolo,
  icona,
  on,
  onPress,
}: {
  titolo: string;
  icona: NomeIcona;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-selected={on}
      style={({ pressed }) => [
        stili.voce,
        on && stili.voceOn,
        pressed && !on && { backgroundColor: colori.bg },
      ]}
    >
      <Icona nome={icona} dimensione={20} colore={on ? colori.accentText : colori.fg2} />
      <Text style={[stili.voceTesto, on && { color: colori.accentText }]}>{titolo}</Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  cassetto: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: LARGHEZZA,
    maxWidth: '86%',
    backgroundColor: colori.bg2,
    borderRightWidth: 1,
    borderRightColor: colori.line,
  },
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  nuova: { paddingHorizontal: 16, paddingBottom: 14 },
  voce: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  voceOn: {
    backgroundColor: colori.accentSoft,
    borderLeftWidth: 2,
    borderLeftColor: colori.accent,
    paddingLeft: 18,
  },
  voceTesto: { fontFamily: famiglie.testo, fontSize: 16, color: colori.fg },
  etichetta: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  etichettaNome: { flex: 1, fontFamily: famiglie.testo, fontSize: 15, color: colori.fg },
  etichettaQuanti: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg3 },
  piede: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colori.line,
  },
  nome: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
  vuoto: {
    fontFamily: famiglie.testo,
    fontSize: 13,
    lineHeight: 18,
    color: colori.fg3,
    paddingHorizontal: 20,
  },
  dettaglio: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg3 },
});
