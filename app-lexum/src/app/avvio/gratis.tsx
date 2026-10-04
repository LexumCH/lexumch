import { router } from 'expo-router';
import { View } from 'react-native';

import { Separatore, Scheda } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { PaginaBenvenuto } from '@/schermate/PaginaBenvenuto';
import { colori } from '@/tema';

// A3 · La prima domanda è gratuita: 1 credito di benvenuto.
export default function Gratis() {
  const { t } = useTesti();
  return (
    <PaginaBenvenuto
      pagina={2}
      alone={100}
      visuale={
        <Scheda
          tono="oro"
          stile={{
            backgroundColor: colori.bg2,
            gap: 4,
            paddingTop: 22,
            paddingHorizontal: 22,
            paddingBottom: 18,
          }}
        >
          <Eyebrow colore={colori.accentText}>{t('avvio.gratis.scheda')}</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <Testo tipo="dXl" oro style={{ fontSize: 92, lineHeight: 96 }}>
              1
            </Testo>
            <Testo tipo="dM">{t('avvio.gratis.credito')}</Testo>
          </View>
          <Testo tipo="small" colore={colori.fg2}>
            {t('avvio.gratis.schedaTesto')}
          </Testo>
          <Separatore stile={{ marginTop: 14, marginBottom: 10 }} />
          <View style={{ gap: 10 }}>
            {[t('avvio.gratis.spunta1'), t('avvio.gratis.spunta2')].map((riga) => (
              <View key={riga} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icona nome="spunta" dimensione={18} colore={colori.ok} />
                <Testo tipo="small">{riga}</Testo>
              </View>
            ))}
          </View>
        </Scheda>
      }
      eyebrow={t('avvio.gratis.sopratitolo')}
      titolo={t('avvio.gratis.titolo')}
      titoloOro={t('avvio.gratis.titoloOro')}
      sottotitolo={t('avvio.gratis.testo')}
      pulsanti={
        <>
          <Pulsante titolo={t('avvio.gratis.crea')} onPress={() => router.push('/avvio/registrazione')} />
          <Pulsante
            titolo={t('avvio.gratis.hoAccount')}
            variante="tenue"
            onPress={() => router.push('/avvio/accesso')}
          />
        </>
      }
    />
  );
}
