import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Emblema } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import type { Pezzo, RispostaFinta } from '@/dati-finti/chat';
import { colori, famiglie } from '@/tema';
import { useTesti } from '@/lingue/useTesti';

// .lex-firma: emblema e «LEX» sopra ogni risposta.
export function FirmaLex() {
  return (
    <View style={stili.firma}>
      <Emblema larghezza={26} altezza={17} />
      <Text style={stili.firmaTesto}>Lex</Text>
    </View>
  );
}

// .io: la domanda dell'utente, a destra.
export function BollaDomanda({ testo, piccola }: { testo: string; piccola?: boolean }) {
  return (
    <View style={[stili.io, piccola && { paddingVertical: 10, paddingHorizontal: 13 }]}>
      <Text style={[stili.ioTesto, piccola && { fontSize: 14, lineHeight: 21 }]}>{testo}</Text>
    </View>
  );
}

// .cit: citazione di una fonte, dentro il testo. Toccandola si apre la fonte.
export function Citazione({ testo, onPress }: { testo: string; onPress?: () => void }) {
  if (!onPress) {
    return (
      <View style={stili.cit}>
        <Text style={stili.citTesto}>{testo}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Apri la fonte: ${testo}`}
      hitSlop={{ top: 11, bottom: 11 }}
      style={({ pressed }) => [stili.cit, pressed && { backgroundColor: colori.accentSoft }]}
    >
      <Text style={stili.citTesto}>{testo}</Text>
    </Pressable>
  );
}

function TestoConCitazioni({ pezzi, onCitazione }: { pezzi: Pezzo[]; onCitazione: (norma: string) => void }) {
  return (
    <>
      {pezzi.map((p, i) =>
        typeof p === 'string' ? (
          <Text key={i}>{p}</Text>
        ) : (
          <Citazione key={i} testo={p.cit} onPress={() => onCitazione(p.norma)} />
        ),
      )}
    </>
  );
}

// .lex-testo: la risposta di Lex, con «In breve» e i punti numerati.
export function RispostaLex({
  risposta,
  onCitazione,
}: {
  risposta: RispostaFinta;
  onCitazione: (norma: string) => void;
}) {
  const { t } = useTesti();
  return (
    <View style={stili.lexTesto}>
      {risposta.inBreve ? (
        <Text style={stili.paragrafo}>
          <Text style={stili.forte}>{t('interfaccia.lex.inBreve')}</Text> {risposta.inBreve}
        </Text>
      ) : null}
      {risposta.punti.map((punto, i) => (
        <View key={`${i}-${punto.titolo}`} style={stili.punto}>
          <Text style={stili.num}>{i + 1}</Text>
          <Text style={[stili.paragrafo, { flex: 1 }]}>
            <Text style={stili.forte}>{punto.titolo}</Text>
            <TestoConCitazioni pezzi={punto.testo} onCitazione={onCitazione} />
          </Text>
        </View>
      ))}
      {risposta.nota ? <Text style={[stili.paragrafo, { color: colori.fg2 }]}>{risposta.nota}</Text> : null}
    </View>
  );
}

// .passi: le fasi di attesa mentre Lex lavora.
export function Passi({ passi, attivo, onPress }: { passi: string[]; attivo: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lex sta lavorando: ${passi[attivo]}. Tocca per vedere subito la risposta.`}
      style={stili.passi}
    >
      {passi.map((passo, i) => {
        const fatto = i < attivo;
        const ora = i === attivo;
        return (
          <View key={passo} style={stili.passo}>
            <View style={stili.stato}>
              {fatto ? (
                <Icona nome="spunta" dimensione={18} colore={colori.ok} />
              ) : (
                <View style={ora ? stili.quadroOra : stili.quadroPoi} />
              )}
            </View>
            <Text
              style={[stili.passoTesto, ora && { color: colori.fg }, !fatto && !ora && { color: colori.fg3 }]}
            >
              {passo}
            </Text>
            {ora ? <Text style={stili.inCorso}>in corso</Text> : null}
          </View>
        );
      })}
    </Pressable>
  );
}

const stili = StyleSheet.create({
  firma: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  firmaTesto: {
    fontFamily: famiglie.testoMedio,
    fontSize: 12,
    letterSpacing: 2.16,
    textTransform: 'uppercase',
    color: colori.accentText,
  },
  io: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    backgroundColor: colori.surface2,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  ioTesto: { fontFamily: famiglie.testo, fontSize: 16, lineHeight: 24, color: colori.fg },
  cit: {
    height: 23,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colori.accentLine,
    justifyContent: 'center',
    transform: [{ translateY: 2 }],
  },
  citTesto: { fontFamily: famiglie.testoMedio, fontSize: 13, lineHeight: 15, color: colori.accentText },
  lexTesto: { gap: 12 },
  paragrafo: { fontFamily: famiglie.testo, fontSize: 16, lineHeight: 26, color: colori.fg },
  forte: { fontFamily: famiglie.testoSemi },
  punto: { flexDirection: 'row', gap: 12 },
  num: {
    width: 16,
    fontFamily: famiglie.titolo,
    fontSize: 21,
    lineHeight: 25,
    color: colori.accentText,
  },
  passi: { gap: 12, padding: 16, borderWidth: 1, borderColor: colori.line },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stato: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  quadroOra: { width: 9, height: 9, backgroundColor: colori.accent },
  quadroPoi: { width: 9, height: 9, borderWidth: 1, borderColor: colori.fg3 },
  passoTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 15, color: colori.fg2 },
  inCorso: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg3 },
});
