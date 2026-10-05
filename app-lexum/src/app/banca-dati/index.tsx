import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FintoCerca } from '@/componenti/Campi';
import { IconaQuadrata, TitoloSezione } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { cercateDiRecenteFinte, leggePerPaese } from '@/dati-finti/banca-dati';
import { useTesti } from '@/lingue/useTesti';
import { contenutiIn, type Fonte } from '@/paesi/contenuti';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// Filtro dei risultati che si apre toccando una fonte non sfogliabile.
const filtroPerFonte: Record<string, string> = {
  giurisprudenza: 'Sentenze',
  tributario: 'Sentenze',
  prassi: 'Prassi',
  ue: 'UE',
  cedu: 'UE',
};

// C2 e G5 · Banca dati: ricerca per parole (gratis) e fonti da sfogliare, diverse per paese.
export default function BancaDati() {
  const { paese } = useStato();
  const { t, lingua } = useTesti();
  const testi = contenutiIn(paese, lingua);
  const fonti = trovaPaese(paese)
    .fontiBancaDati.map((codice) => ({ codice, fonte: testi.fonti[codice] }))
    .filter((x): x is { codice: string; fonte: Fonte } => !!x.fonte);
  const coppie: (typeof fonti)[] = [];
  for (let i = 0; i < fonti.length; i += 2) coppie.push(fonti.slice(i, i + 2));

  const apriFonte = (codice: string, fonte: Fonte) => {
    if (fonte.sfogliabile) {
      router.push({ pathname: '/banca-dati/legge/[id]', params: { id: leggePerPaese[paese] } });
    } else {
      router.push({
        pathname: '/banca-dati/risultati',
        params: { filtro: filtroPerFonte[codice] ?? 'Tutto' },
      });
    }
  };

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneMenu />} titolo={t('interfaccia.voci.bancaDati')} paese />
      <ScrollView contentContainerStyle={stili.corpo}>
        <View style={{ gap: 6 }}>
          <Testo tipo="dM" accessibilityRole="header">
            {testi.bancaDatiTitolo}
          </Testo>
          <Testo tipo="small" colore={colori.fg2}>
            {t('bancaDati.intro')}
          </Testo>
        </View>

        <FintoCerca
          testo={t('bancaDati.segnaposto')}
          etichetta={t('bancaDati.cerca')}
          onPress={() => router.push('/banca-dati/risultati')}
        />
        <Testo tipo="cap" style={{ marginTop: -6 }}>
          {testi.bancaDatiCitazioni}
        </Testo>

        <View style={{ marginTop: 4 }}>
          <Eyebrow>{t('bancaDati.sfoglia')}</Eyebrow>
        </View>
        <View style={{ gap: 10 }}>
          {coppie.map((coppia) => (
            <View key={coppia[0].codice} style={{ flexDirection: 'row', gap: 10 }}>
              {coppia.map(({ codice, fonte }) => (
                <Pressable
                  key={codice}
                  onPress={() => apriFonte(codice, fonte)}
                  accessibilityRole="button"
                  accessibilityLabel={`${fonte.nome}: ${fonte.descrizione}`}
                  style={({ pressed }) => [stili.fonte, pressed && { borderColor: colori.accentLine }]}
                >
                  <IconaQuadrata nome={fonte.icona} lato={36} dimensione={18} />
                  <Text style={stili.nome}>{fonte.nome}</Text>
                  <Text style={stili.quanti}>{fonte.descrizione}</Text>
                </Pressable>
              ))}
              {coppia.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>

        <TitoloSezione stile={{ paddingTop: 8, paddingHorizontal: 0, paddingBottom: 0 }}>
          {t('bancaDati.recenti')}
        </TitoloSezione>
        <View style={{ marginHorizontal: -20 }}>
          {(cercateDiRecenteFinte[paese] ?? []).map((q) => (
            <Riga
              key={q}
              altezza={48}
              stile={{ paddingVertical: 8 }}
              sinistra={<Icona nome="orologio" dimensione={18} colore={colori.fg3} />}
              titolo={q}
              titoloStile={{ fontSize: 15 }}
              onPress={() => router.push({ pathname: '/banca-dati/risultati', params: { q } })}
            />
          ))}
        </View>
      </ScrollView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 14, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 20 },
  fonte: {
    flex: 1,
    minHeight: 116,
    gap: 10,
    padding: 14,
    backgroundColor: colori.surface,
    borderWidth: 1,
    borderColor: colori.line,
  },
  nome: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 20, color: colori.fg },
  quanti: { fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18, color: colori.fg3 },
});
