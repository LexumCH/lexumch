import { StyleSheet, View } from 'react-native';

import { Logo } from '@/componenti/Elementi';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { colori } from '@/tema';

// F1 · App bloccata: compare all'apertura se in Profilo è acceso «Blocca con Face ID o impronta».
// Dalla tappa 6 «Sblocca» chiede davvero Face ID o l'impronta (expo-local-authentication);
// se non va, il telefono propone il suo codice. Qui, nell'anteprima, torna solo indietro.
export default function Blocco() {
  const { t } = useTesti();
  return (
    <Schermata hero alone={120} senzaAvvisoOffline>
      <View style={stili.centro}>
        <Logo medio />
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Testo tipo="dM" centrato accessibilityRole="header">
            {t('profilo.blocco.titolo')}
          </Testo>
          <Testo colore={colori.fg2} centrato>
            {t('profilo.blocco.testo')}
          </Testo>
        </View>
      </View>
      <View style={stili.fondo}>
        <Pulsante titolo={t('profilo.blocco.sblocca')} icona="lucchetto" onPress={() => indietro('/chat')} />
        <Testo tipo="cap" centrato>
          {t('profilo.blocco.nota')}
        </Testo>
      </View>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 },
  fondo: { gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
});
