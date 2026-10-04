import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Badge, BarraAzioni, Separatore } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Citazione } from '@/componenti/Lex';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { documentiFinti, trovaNorma } from '@/dati-finti/banca-dati';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { useTesti } from '@/lingue/useTesti';
import { useVaiASezione } from '@/navigazione';
import { colori, famiglie } from '@/tema';

// C5 · Sentenza (o documento di prassi) dalla Banca dati.
export default function Documento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vai = useVaiASezione();
  const { t } = useTesti();
  const doc = documentiFinti[id];
  const [norma, setNorma] = useState<string | null>(null);

  if (!doc) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/banca-dati" />}
          titolo={t('bancaDati.documento.titolo')}
        />
        <Testo colore={colori.fg2} style={{ padding: 20 }}>
          {t('bancaDati.documento.assente')}
        </Testo>
      </Schermata>
    );
  }

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/banca-dati/risultati" />}
        titolo={t(`bancaDati.tipi.${doc.tipo}`)}
        destra={
          <PulsanteIcona
            icona="condividi"
            etichetta={t('chat.risposta.condividi')}
            dimensione={20}
            onPress={() =>
              Share.share({ message: `${doc.titolo}\n${doc.riferimento}` }).catch(() => undefined)
            }
          />
        }
      />
      <ScrollView contentContainerStyle={stili.corpo}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge tono={doc.tipo === 'Sentenza' ? 'ok' : 'neutro'}>{t(`bancaDati.tipi.${doc.tipo}`)}</Badge>
            <Badge>{t('bancaDati.documento.gratuita')}</Badge>
          </View>
          <Testo tipo="dS" style={{ fontSize: 24, lineHeight: 28 }} accessibilityRole="header">
            {doc.titolo}
          </Testo>
          <View style={{ gap: 3 }}>
            <Testo tipo="small" colore={colori.fg2}>
              {doc.riferimento}
            </Testo>
            <Testo tipo="cap">{doc.data}</Testo>
          </View>
        </View>
        <Separatore />
        {doc.principi.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Eyebrow>{t('bancaDati.documento.principio')}</Eyebrow>
            <View style={{ gap: 10 }}>
              {doc.principi.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={stili.num}>{i + 1}</Text>
                  <Text style={stili.principio}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ gap: 8 }}>
          <Eyebrow>{t('bancaDati.documento.norme')}</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {doc.norme.map((n) => (
              <Citazione key={n.cit} testo={n.cit} onPress={() => setNorma(n.norma)} />
            ))}
          </View>
        </View>
        <View style={{ marginHorizontal: -20 }}>
          <Riga
            titolo={t('bancaDati.documento.testoIntegrale')}
            freccia="avanti"
            altezza={52}
            stile={{ paddingVertical: 8 }}
            bordoSopra
            onPress={() => undefined}
          />
        </View>
      </ScrollView>

      <BarraAzioni>
        <Pulsante
          titolo={t('bancaDati.documento.chiedi')}
          icona="stella"
          stile={{ flex: 1 }}
          onPress={() => vai('/chat')}
        />
        <Pulsante
          titolo=""
          etichetta={t('bancaDati.documento.aggiungi')}
          variante="linea"
          icona="etichetta"
          stile={{ width: 52, paddingHorizontal: 0, gap: 0 }}
          onPress={() => vai('/ricerche')}
        />
      </BarraAzioni>

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        eyebrow={t('bancaDati.documento.normaRichiamata')}
        onChiudi={() => setNorma(null)}
        onApriLegge={(leggeId) => {
          setNorma(null);
          router.push({ pathname: '/banca-dati/legge/[id]', params: { id: leggeId } });
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20 },
  num: { width: 16, fontFamily: famiglie.titolo, fontSize: 19, lineHeight: 24, color: colori.accentText },
  principio: { flex: 1, fontFamily: famiglie.testo, fontSize: 15, lineHeight: 24, color: colori.fg },
});
