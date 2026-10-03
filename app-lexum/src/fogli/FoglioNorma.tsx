import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Foglio } from '@/componenti/Foglio';
import { PulsanteIcona, Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import type { Norma } from '@/dati-finti/chat';
import { colori, famiglie } from '@/tema';

type Props = {
  norma: Norma | null;
  onChiudi: () => void;
  eyebrow?: string;
  nota?: string;
  onApriLegge?: (leggeId: string) => void;
  onSalva?: () => void;
};

// B4 · Fonte citata: il testo della norma con il passaggio evidenziato.
// Si usa dalla chat, dai risultati della Banca dati, da Sfoglia e da Ricerche.
export function FoglioNorma({
  norma,
  onChiudi,
  eyebrow = 'Norma citata',
  nota = 'Evidenziato il passaggio usato da Lex.',
  onApriLegge,
  onSalva,
}: Props) {
  // tiene la norma durante l'animazione di chiusura
  const [ultima, setUltima] = useState(norma);
  if (norma && norma !== ultima) setUltima(norma);
  const visibile = !!norma;
  const n = norma ?? ultima;
  const conTesto = !!(n?.evidenziato || n?.prima || n?.dopo);
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      {n ? (
        <>
          <View style={stili.testa}>
            <View style={{ flex: 1, gap: 6 }}>
              <Eyebrow>{eyebrow}</Eyebrow>
              <Testo tipo="dS">{n.legge}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {n.articolo}
              </Testo>
            </View>
            <PulsanteIcona icona="chiudi" etichetta="Chiudi" onPress={onChiudi} stile={stili.chiudi} />
          </View>
          <View style={stili.doc}>
            {conTesto ? (
              <Text style={stili.docTesto}>
                {n.comma ? <Text style={stili.comma}>{n.comma} </Text> : null}
                {n.prima}
                {n.evidenziato ? <Text style={stili.mark}>{n.evidenziato}</Text> : null}
                {n.dopo}
              </Text>
            ) : (
              <Text style={[stili.docTesto, { color: colori.fg3 }]}>
                Testo dell'articolo non disponibile nei dati di prova: arriva con la Banca dati vera.
              </Text>
            )}
          </View>
          {n.evidenziato ? <Testo tipo="cap">{nota}</Testo> : null}
          <View style={stili.azioni}>
            {onApriLegge && n.leggeId ? (
              <Pulsante
                titolo="Apri la legge"
                variante="linea"
                stile={{ flex: 1 }}
                onPress={() => onApriLegge(n.leggeId as string)}
              />
            ) : null}
            {onSalva ? (
              <Pulsante
                titolo="Salva"
                variante="pieno"
                icona="segnalibro"
                stile={{ flex: 1 }}
                onPress={onSalva}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </Foglio>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chiudi: { marginTop: -6, marginRight: -12 },
  doc: {
    backgroundColor: colori.bg,
    borderWidth: 1,
    borderColor: colori.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  docTesto: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 24, color: colori.fg },
  comma: { fontFamily: famiglie.testoSemi },
  mark: {
    backgroundColor: colori.accentSoft,
    textDecorationLine: 'underline',
    textDecorationColor: colori.accentLine,
  },
  azioni: { flexDirection: 'row', gap: 10 },
});
