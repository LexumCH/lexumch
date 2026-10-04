import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Pulsante } from '@/componenti/Pulsante';
import { BollaDomanda, Citazione, FirmaLex } from '@/componenti/Lex';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { contenutiIn } from '@/paesi/contenuti';
import { PaginaBenvenuto } from '@/schermate/PaginaBenvenuto';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A1 · Benvenuto: un esempio di domanda e risposta con le fonti.
export default function Benvenuto() {
  const { paese } = useStato();
  const { t, lingua } = useTesti();
  const b = contenutiIn(paese, lingua).benvenuto;
  return (
    <PaginaBenvenuto
      pagina={0}
      alone={120}
      azione={{ titolo: t('comune.accedi'), onPress: () => router.push('/avvio/accesso') }}
      visuale={
        <View style={stili.esempio}>
          <BollaDomanda testo={b.domanda} piccola />
          <View style={{ gap: 10 }}>
            <FirmaLex />
            <Testo style={{ fontSize: 15, lineHeight: 23 }}>{b.risposta}</Testo>
            <View style={stili.citazioni}>
              {b.citazioni.map((c) => (
                <Citazione key={c} testo={c} />
              ))}
            </View>
          </View>
        </View>
      }
      eyebrow={t('avvio.benvenuto.sopratitolo')}
      titolo={b.titolo}
      titoloOro={b.titoloOro}
      titoloDopo={b.titoloDopo}
      sottotitolo={b.sottotitolo}
      pulsanti={<Pulsante titolo={t('avvio.benvenuto.inizia')} onPress={() => router.push('/avvio/fonti')} />}
    />
  );
}

const stili = StyleSheet.create({
  esempio: { gap: 14, padding: 18, backgroundColor: colori.bg2, borderWidth: 1, borderColor: colori.line },
  citazioni: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
