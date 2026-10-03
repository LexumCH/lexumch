import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icona, type NomeIcona } from '@/componenti/Icona';
import { Testo } from '@/componenti/Testo';
import { colori, famiglie, misure } from '@/tema';

const emblema = require('@/assets/immagini/emblema.png');
const scritta = require('@/assets/immagini/lexum-scritta.png');

// Emblema e scritta «Lexum». Le misure sono quelle dei mockup.
export function Logo({ grande, medio }: { grande?: boolean; medio?: boolean }) {
  const e = grande
    ? { width: 120, height: 79 }
    : medio
      ? { width: 76, height: 50 }
      : { width: 38, height: 25 };
  const s = grande
    ? { width: 160, height: 28 }
    : medio
      ? { width: 132, height: 23 }
      : { width: 96, height: 17 };
  return (
    <>
      <Image source={emblema} style={e} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Image source={scritta} style={s} resizeMode="contain" accessibilityLabel="Lexum" />
    </>
  );
}

export function Emblema({ larghezza = 24, altezza = 16 }: { larghezza?: number; altezza?: number }) {
  return <Image source={emblema} style={{ width: larghezza, height: altezza }} resizeMode="contain" />;
}

// .badge
type TonoBadge = 'neutro' | 'ok' | 'warn' | 'oro';
const toniBadge: Record<TonoBadge, { bordo: string; testo: string }> = {
  neutro: { bordo: colori.line2, testo: colori.fg2 },
  ok: { bordo: colori.okLine, testo: colori.ok },
  warn: { bordo: colori.warnLine, testo: colori.warn },
  oro: { bordo: colori.accentLine, testo: colori.accentText },
};
export function Badge({ children, tono = 'neutro' }: { children: string; tono?: TonoBadge }) {
  const t = toniBadge[tono];
  return (
    <View style={[stili.badge, { borderColor: t.bordo }]}>
      <Text style={[stili.badgeTesto, { color: t.testo }]}>{children}</Text>
    </View>
  );
}

// .pallino: il quadratino colorato delle etichette.
export function Pallino({ colore }: { colore: string }) {
  return <View style={[stili.pallino, { backgroundColor: colore }]} />;
}

// .tag: filtro a pillola squadrata.
// Con «colore» è un'etichetta di Ricerche, come sul sito: bordo, testo e sfondo del suo colore.
// Con «aggiungi» è il «+» oro per crearne una nuova.
type PropsTag = {
  titolo: string;
  attivo?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  colore?: string;
  pallino?: string;
  tratteggiato?: boolean;
  aggiungi?: boolean;
  etichetta?: string;
};
export function Tag({
  titolo,
  attivo,
  onPress,
  onLongPress,
  colore,
  pallino,
  tratteggiato,
  aggiungi,
  etichetta,
}: PropsTag) {
  const tinta = colore
    ? attivo
      ? { borderColor: colore, backgroundColor: `${colore}40` }
      : { borderColor: `${colore}80`, backgroundColor: `${colore}22` }
    : null;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      aria-selected={!!attivo}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        stili.tag,
        attivo && stili.tagAttivo,
        tratteggiato && stili.tagTratteggiato,
        aggiungi && stili.tagAggiungi,
        tinta,
        pressed && { opacity: 0.8 },
      ]}
    >
      {aggiungi ? <Icona nome="piu" dimensione={14} colore={colori.accentText} /> : null}
      {colore || pallino ? <Pallino colore={(colore ?? pallino) as string} /> : null}
      <Text
        style={[
          stili.tagTesto,
          attivo && { color: colori.fg },
          (tratteggiato || aggiungi) && { color: colori.accentText },
          colore && { color: attivo ? colori.fg : colore, fontFamily: famiglie.testoMedio },
        ]}
      >
        {titolo}
      </Text>
    </Pressable>
  );
}

// .paese: il riquadro con la sigla del paese.
export function BadgePaese({ codice, piccolo, nome }: { codice: string; piccolo?: boolean; nome?: string }) {
  return (
    <View
      style={[stili.paese, piccolo && stili.paesePiccolo]}
      accessibilityLabel={nome ? `Paese: ${nome}` : undefined}
    >
      <Text style={[stili.paeseTesto, piccolo && stili.paeseTestoPiccolo]}>{codice}</Text>
    </View>
  );
}

// .icona: icona dentro un quadrato bordato d'oro (o tenue).
export function IconaQuadrata({
  nome,
  tenue,
  lato = 40,
  dimensione = 20,
}: {
  nome: NomeIcona;
  tenue?: boolean;
  lato?: number;
  dimensione?: number;
}) {
  return (
    <View style={[stili.icona, { width: lato, height: lato }, tenue && { borderColor: colori.line2 }]}>
      <Icona nome={nome} dimensione={dimensione} colore={tenue ? colori.fg2 : colori.accentText} />
    </View>
  );
}

export function Separatore({ stile }: { stile?: StyleProp<ViewStyle> }) {
  return <View style={[stili.sep, stile]} />;
}

// .titolo-sez: piccola intestazione maiuscola di sezione.
export function TitoloSezione({ children, stile }: { children: string; stile?: StyleProp<ViewStyle> }) {
  return (
    <View style={[stili.titoloSez, stile]}>
      <Text style={stili.titoloSezTesto}>{children}</Text>
    </View>
  );
}

// .card, .card-oro, .card-ok
type TonoScheda = 'normale' | 'oro' | 'ok';
export function Scheda({
  children,
  tono = 'normale',
  stile,
}: {
  children: ReactNode;
  tono?: TonoScheda;
  stile?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        stili.card,
        tono === 'oro' && { borderColor: colori.accentLine },
        tono === 'ok' && { borderColor: colori.okLine, backgroundColor: colori.okSoft },
        stile,
      ]}
    >
      {children}
    </View>
  );
}

// .barra: barra di avanzamento.
export function Barra({ percento, larghezza }: { percento: number; larghezza?: number }) {
  return (
    <View
      style={[stili.barra, larghezza ? { width: larghezza } : null]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percento) }}
    >
      <View style={[stili.barraPiena, { width: `${Math.max(0, Math.min(100, percento))}%` }]} />
    </View>
  );
}

// .striscia: avviso su una riga sotto l'intestazione.
export function Striscia({
  icona,
  testo,
  azione,
  onPress,
}: {
  icona: NomeIcona;
  testo: string;
  azione: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${testo} ${azione}`}
      style={({ pressed }) => [stili.striscia, pressed && { opacity: 0.85 }]}
    >
      <Icona nome={icona} dimensione={18} colore={colori.warn} />
      <Text style={stili.strisciaTesto}>{testo}</Text>
      <Text style={stili.strisciaAzione}>{azione}</Text>
    </Pressable>
  );
}

// .seg: controllo segmentato.
export function Segmentato<T extends string>({
  opzioni,
  valore,
  onCambia,
  etichetta,
}: {
  opzioni: { valore: T; titolo: string }[];
  valore: T;
  onCambia: (v: T) => void;
  etichetta: string;
}) {
  return (
    <View style={stili.seg} accessibilityRole="radiogroup" accessibilityLabel={etichetta}>
      {opzioni.map((o) => {
        const on = o.valore === valore;
        return (
          <Pressable
            key={o.valore}
            onPress={() => onCambia(o.valore)}
            accessibilityRole="radio"
            aria-checked={on}
            style={[stili.segVoce, on && { backgroundColor: colori.surface2 }]}
          >
            <Text style={[stili.segTesto, on && stili.segTestoOn]}>{o.titolo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// .punti: i puntini delle pagine di benvenuto.
export function Punti({ totale, attivo }: { totale: number; attivo: number }) {
  return (
    <View style={stili.punti} accessibilityLabel={`Pagina ${attivo + 1} di ${totale}`}>
      {Array.from({ length: totale }, (_, i) => (
        <View key={i} style={[stili.punto, i === attivo && stili.puntoOn]} />
      ))}
    </View>
  );
}

// <dl> a due colonne: anteprima del conto, elenco delle fonti, metadati.
export function ElencoDefinizioni({
  voci,
  stile,
  piccolo,
  evidenziaTermini,
  larghezzaTermine = 64,
}: {
  voci: [string, string][];
  stile?: StyleProp<ViewStyle>;
  piccolo?: boolean;
  evidenziaTermini?: boolean;
  larghezzaTermine?: number;
}) {
  return (
    <View style={[stili.dl, stile]}>
      {voci.map(([termine, valore]) => (
        <View key={termine} style={stili.dlRiga}>
          <Text
            style={[
              stili.dt,
              { width: larghezzaTermine },
              piccolo && { fontSize: 13, lineHeight: 18 },
              evidenziaTermini && { color: colori.fg, fontFamily: famiglie.testoMedio },
            ]}
          >
            {termine}
          </Text>
          <Text style={[stili.dd, piccolo && { fontSize: 13, lineHeight: 18, color: colori.fg3 }]}>
            {valore}
          </Text>
        </View>
      ))}
    </View>
  );
}

// .spunta: casella da spuntare con il testo accanto.
export function Spunta({
  attiva,
  onCambia,
  children,
}: {
  attiva: boolean;
  onCambia: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <View style={stili.spunta}>
      <Pressable
        onPress={() => onCambia(!attiva)}
        accessibilityRole="checkbox"
        aria-checked={attiva}
        hitSlop={11}
        style={[stili.box, attiva && stili.boxSi]}
      >
        {attiva ? <Icona nome="spunta" dimensione={16} colore={colori.accentFg} spessore={2} /> : null}
      </Pressable>
      <Testo tipo="small" colore={colori.fg2} style={{ flex: 1 }}>
        {children}
      </Testo>
    </View>
  );
}

// Avviso dentro un modulo: errore (rosa) o informazione (salvia). Lo legge anche il lettore di schermo.
export function Avviso({ testo, tono = 'errore' }: { testo: string; tono?: 'errore' | 'info' }) {
  const errore = tono === 'errore';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[stili.avviso, { borderColor: errore ? colori.dangerLine : colori.okLine }]}
    >
      <Icona
        nome={errore ? 'avviso' : 'spunta'}
        dimensione={18}
        colore={errore ? colori.danger : colori.ok}
      />
      <Text style={stili.avvisoTesto}>{testo}</Text>
    </View>
  );
}

// .barra-azioni: pulsanti fissi in fondo alla schermata, sopra la riga.
export function BarraAzioni({ children, stile }: { children: ReactNode; stile?: StyleProp<ViewStyle> }) {
  return <View style={[stili.barraAzioni, stile]}>{children}</View>;
}

// Interruttore acceso/spento, squadrato come il resto dell'app. Si usa dentro una Riga che fa da tasto.
export function Interruttore({ acceso }: { acceso: boolean }) {
  return (
    <View style={[stili.interruttore, acceso && stili.interruttoreAcceso]}>
      <View style={[stili.pomello, acceso && stili.pomelloAcceso]} />
    </View>
  );
}

// Iniziale dell'utente nel riquadro salvia (menù e profilo).
export function Iniziale({ lettera, grande }: { lettera: string; grande?: boolean }) {
  const lato = grande ? 56 : 36;
  return (
    <View style={[stili.iniziale, { width: lato, height: lato }]}>
      <Text style={[stili.inizialeTesto, { fontSize: grande ? 28 : 19 }]}>{lettera}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  interruttore: {
    width: 44,
    height: 26,
    padding: 3,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.surface,
    justifyContent: 'center',
  },
  interruttoreAcceso: { borderColor: colori.accent, backgroundColor: colori.accentSoft },
  pomello: { width: 18, height: 18, backgroundColor: colori.fg3 },
  pomelloAcceso: { alignSelf: 'flex-end', backgroundColor: colori.accent },
  badge: {
    height: 22,
    paddingHorizontal: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badgeTesto: {
    fontFamily: famiglie.testoMedio,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  pallino: { width: 9, height: 9 },
  tag: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colori.line2,
  },
  tagAttivo: { borderColor: colori.accent, backgroundColor: colori.accentSoft },
  tagTratteggiato: { borderStyle: 'dashed' },
  tagAggiungi: { borderColor: 'rgba(201,164,92,0.30)' },
  tagTesto: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  paese: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colori.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paesePiccolo: { width: 26, height: 22 },
  paeseTesto: {
    fontFamily: famiglie.titoloSemi,
    fontSize: 17,
    letterSpacing: 1,
    color: colori.accentText,
  },
  paeseTestoPiccolo: { fontFamily: famiglie.testoMedio, fontSize: 12, letterSpacing: 0.96 },
  icona: {
    borderWidth: 1,
    borderColor: colori.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: 1, backgroundColor: colori.line },
  titoloSez: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 10 },
  titoloSezTesto: {
    fontFamily: famiglie.testoMedio,
    fontSize: 12,
    letterSpacing: 1.92,
    textTransform: 'uppercase',
    color: colori.fg3,
  },
  card: { backgroundColor: colori.surface, borderWidth: 1, borderColor: colori.line, padding: 16 },
  barra: { height: 6, backgroundColor: colori.surface2, alignSelf: 'stretch' },
  barraPiena: { height: '100%', backgroundColor: colori.accent },
  striscia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
    marginHorizontal: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colori.warnLine,
    minHeight: misure.tocco,
  },
  strisciaTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18, color: colori.fg2 },
  strisciaAzione: { fontFamily: famiglie.testoMedio, fontSize: 13, color: colori.accentText },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: colori.line2 },
  segVoce: { flex: 1, height: misure.tocco, alignItems: 'center', justifyContent: 'center' },
  segTesto: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  segTestoOn: { fontFamily: famiglie.testoMedio, color: colori.fg },
  punti: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  punto: { width: 8, height: 8, borderWidth: 1, borderColor: colori.fg3 },
  puntoOn: { width: 24, backgroundColor: colori.accent, borderColor: colori.accent },
  dl: { gap: 8 },
  dlRiga: { flexDirection: 'row', gap: 14 },
  dt: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20, color: colori.fg3 },
  dd: { flex: 1, fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20, color: colori.fg },
  spunta: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderWidth: 1,
    borderColor: colori.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxSi: { backgroundColor: colori.accent, borderColor: colori.accent },
  avviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  avvisoTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20, color: colori.fg },
  barraAzioni: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colori.line,
    backgroundColor: colori.bg,
  },
  iniziale: {
    backgroundColor: colori.okSoft,
    borderWidth: 1,
    borderColor: colori.okLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeTesto: { fontFamily: famiglie.titoloSemi, color: colori.ok },
});
