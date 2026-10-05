import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, type TonoBadge } from '@/componenti/Elementi';
import { Icona, type NomeIcona } from '@/componenti/Icona';
import { Testo } from '@/componenti/Testo';
import type { TipoEvento } from '@/dati-finti/studio';
import { colori, famiglie } from '@/tema';

// Pezzi della Dashboard dei professionisti: riquadro di sezione, contatore, riga di un impegno.
// Ricalcano SectionCard, BoxContatore ed EventoItem dei siti, a una colonna per il telefono.

// Icona di un impegno, come sul sito: udienza bilancia, scadenza triangolo, il resto calendario.
export function iconaEvento(tipo: TipoEvento): { nome: NomeIcona; colore: string } {
  if (tipo === 'udienza') return { nome: 'bilancia', colore: colori.accentText };
  if (tipo === 'scadenza') return { nome: 'avviso', colore: colori.danger };
  return { nome: 'calendario', colore: colori.ok };
}

export function Sezione({
  titolo,
  icona,
  conta,
  link,
  onLink,
  esterno,
  vuoto,
  children,
}: {
  titolo: string;
  icona: NomeIcona;
  conta?: number;
  link?: string;
  onLink?: () => void;
  esterno?: boolean; // il link apre il sito
  vuoto?: string;
  children?: ReactNode;
}) {
  return (
    <View style={stili.sezione}>
      <View style={stili.testa}>
        <View style={stili.testaSinistra}>
          <Icona nome={icona} dimensione={15} colore={colori.fg3} />
          <Text style={stili.titolo} accessibilityRole="header">
            {titolo}
            {conta ? <Text style={stili.conta}>{`  (${conta})`}</Text> : null}
          </Text>
        </View>
        {link && onLink ? (
          <Pressable
            onPress={onLink}
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [stili.link, pressed && { opacity: 0.7 }]}
          >
            <Text style={stili.linkTesto}>{link}</Text>
            <Icona nome={esterno ? 'esterno' : 'avanti'} dimensione={13} colore={colori.fg3} />
          </Pressable>
        ) : null}
      </View>
      {children ?? (vuoto ? <Text style={stili.vuoto}>{vuoto}</Text> : null)}
    </View>
  );
}

// Una riga toccabile dentro una sezione: icona, titolo, sottotitolo, badge o valore a destra.
export function RigaDashboard({
  icona,
  coloreIcona,
  titolo,
  sottotitolo,
  badge,
  destra,
  onPress,
  ruolo = 'button',
}: {
  icona: NomeIcona;
  coloreIcona?: string;
  titolo: string;
  sottotitolo?: string;
  badge?: { testo: string; tono: TonoBadge };
  destra?: ReactNode;
  onPress?: () => void;
  ruolo?: 'button' | 'link';
}) {
  const contenuto = (
    <>
      <Icona nome={icona} dimensione={17} colore={coloreIcona ?? colori.accentText} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={stili.rigaTitolo} numberOfLines={2}>
          {titolo}
        </Text>
        {sottotitolo ? (
          <Text style={stili.rigaSotto} numberOfLines={2}>
            {sottotitolo}
          </Text>
        ) : null}
      </View>
      {destra}
      {badge ? <Badge tono={badge.tono}>{badge.testo}</Badge> : null}
    </>
  );
  if (!onPress) return <View style={stili.riga}>{contenuto}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={ruolo}
      style={({ pressed }) => [stili.riga, pressed && { backgroundColor: colori.surface }]}
    >
      {contenuto}
    </Pressable>
  );
}

// Un numero con la sua etichetta (BoxContatore e Kpi dei siti).
export function Contatore({
  valore,
  etichetta,
  sotto,
  colore = colori.fg,
  onPress,
  piccolo,
}: {
  valore: string | number;
  etichetta: string;
  sotto?: string;
  colore?: string;
  onPress?: () => void;
  piccolo?: boolean;
}) {
  const contenuto = (
    <>
      <Text
        style={[stili.valore, piccolo && stili.valorePiccolo, { color: colore }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {String(valore)}
      </Text>
      <Text style={stili.contatoreEtichetta}>{etichetta}</Text>
      {sotto ? <Text style={stili.contatoreSotto}>{sotto}</Text> : null}
    </>
  );
  if (!onPress) return <View style={stili.contatore}>{contenuto}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [stili.contatore, pressed && { borderColor: colori.accentLine }]}
    >
      {contenuto}
    </Pressable>
  );
}

export function Nota({ children }: { children: string }) {
  return (
    <Testo tipo="mini" colore={colori.fg3} style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
      {children}
    </Testo>
  );
}

export const stiliDashboard = StyleSheet.create({
  pagina: { padding: 16, gap: 14, paddingBottom: 40 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cella: { flexGrow: 1, flexBasis: '45%' },
  terzo: { flexGrow: 1, flexBasis: '30%' },
});

const stili = StyleSheet.create({
  sezione: { backgroundColor: colori.bg2, borderWidth: 1, borderColor: colori.line },
  testa: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  testaSinistra: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  titolo: {
    fontFamily: famiglie.testoMedio,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colori.fg2,
    flexShrink: 1,
  },
  conta: { fontFamily: famiglie.testo, color: colori.fg3, letterSpacing: 0 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  linkTesto: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg3 },
  vuoto: {
    fontFamily: famiglie.testo,
    fontStyle: 'italic',
    fontSize: 13,
    color: colori.fg3,
    textAlign: 'center',
    paddingVertical: 22,
    paddingHorizontal: 14,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colori.line,
  },
  rigaTitolo: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 20, color: colori.fg },
  rigaSotto: { fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18, color: colori.fg3 },
  contatore: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colori.bg2,
    borderWidth: 1,
    borderColor: colori.line,
    padding: 12,
    gap: 4,
  },
  valore: { fontFamily: famiglie.titolo, fontSize: 30, lineHeight: 34 },
  valorePiccolo: { fontFamily: famiglie.testoMedio, fontSize: 18, lineHeight: 26 },
  contatoreEtichetta: {
    fontFamily: famiglie.testo,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.fg3,
  },
  contatoreSotto: { fontFamily: famiglie.testo, fontSize: 12, color: colori.fg3 },
});
