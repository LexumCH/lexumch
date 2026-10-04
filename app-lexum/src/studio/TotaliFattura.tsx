import { StyleSheet, Text, View } from 'react-native';

import { TitoloSezione } from '@/componenti/Elementi';
import { Testo } from '@/componenti/Testo';
import type { DatiFatturazione, Fattura } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { colori, famiglie } from '@/tema';

import { importo, type Totali } from './calcoli';
import { nomeContributo, nomeMotivo, percento } from './fatturazione';

// I totali di una fattura come li calcola il database del paese.
// IT: imponibile, CPA, IVA, totale, ritenuta e netto. CH: imponibile, IVA (o esente), totale.
export function TotaliFattura({
  fattura: f,
  totali: t,
  paese,
  cassa,
  senzaTitolo,
}: {
  fattura: Pick<Fattura, 'cpa' | 'iva' | 'ritenuta' | 'esenteIva' | 'motivoEsenzione'>;
  totali: Totali;
  paese: string;
  cassa?: DatiFatturazione['cassa'];
  senzaTitolo?: boolean;
}) {
  const { t: testo, lingua } = useTesti();
  const righe: { titolo: string; valore: string; forte?: boolean }[] = [
    { titolo: testo('fatture.totali.imponibile'), valore: importo(t.imponibile, paese) },
  ];
  if (paese === 'IT') {
    righe.push({
      titolo: `${nomeContributo(cassa, lingua)} ${percento(f.cpa ?? 0)}`,
      valore: importo(t.cpa, paese),
    });
    righe.push({
      titolo: testo('fatture.totali.iva', { aliquota: percento(f.iva) }),
      valore: importo(t.iva, paese),
    });
    righe.push({
      titolo: testo('fatture.totali.totaleFattura'),
      valore: importo(t.totale, paese),
      forte: t.ritenuta === 0,
    });
    if (t.ritenuta > 0) {
      righe.push({
        titolo: testo('fatture.totali.ritenuta', { aliquota: percento(f.ritenuta ?? 0) }),
        valore: `− ${importo(t.ritenuta, paese)}`,
      });
      righe.push({
        titolo: testo('fatture.totali.netto'),
        valore: importo(t.daIncassare, paese),
        forte: true,
      });
    }
  } else {
    righe.push(
      f.esenteIva
        ? { titolo: testo('fatture.voci.iva'), valore: testo('fatture.voci.esente') }
        : {
            titolo: testo('fatture.totali.iva', { aliquota: percento(f.iva) }),
            valore: importo(t.iva, paese),
          },
    );
    righe.push({ titolo: testo('fatture.totali.totale'), valore: importo(t.totale, paese), forte: true });
  }
  return (
    <View>
      {senzaTitolo ? null : (
        <TitoloSezione stile={stili.titoloSezione}>{testo('fatture.totali.titolo')}</TitoloSezione>
      )}
      {righe.map((r) => (
        <View key={r.titolo} style={[stili.totale, r.forte && stili.totaleForte]}>
          <Text
            style={[stili.totaleTitolo, r.forte && { color: colori.fg, fontFamily: famiglie.testoMedio }]}
          >
            {r.titolo}
          </Text>
          <Text style={[stili.totaleValore, r.forte && { color: colori.accentText }]}>{r.valore}</Text>
        </View>
      ))}
      {paese === 'CH' && f.esenteIva && f.motivoEsenzione ? (
        <Testo tipo="cap" style={{ paddingTop: 6 }}>
          {nomeMotivo(f.motivoEsenzione, lingua)}
        </Testo>
      ) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  titoloSezione: { paddingHorizontal: 0, paddingTop: 0 },
  totale: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  totaleForte: { marginTop: 4, paddingTop: 11, borderTopWidth: 1, borderTopColor: colori.line2 },
  totaleTitolo: { fontFamily: famiglie.testo, fontSize: 15, color: colori.fg2 },
  totaleValore: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
});
