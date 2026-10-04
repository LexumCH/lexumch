import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Pallino } from '@/componenti/Elementi';
import { BottoneIndietro, ContatoreCrediti, Intestazione } from '@/componenti/Intestazione';
import { FirmaLex, Passi, RispostaLex } from '@/componenti/Lex';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Eyebrow, Testo } from '@/componenti/Testo';
import {
  azioniConfronto,
  passiConfronto,
  rispostaConfronto,
  type AzioneConfronto,
} from '@/dati-finti/confronto';
import type { Elemento } from '@/dati-finti/ricerche';
import { FoglioEsauriti } from '@/fogli/FoglioEsauriti';
import { useTesti } from '@/lingue/useTesti';
import { indietro, useVaiASezione } from '@/navigazione';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const tonoBadge = { 'Chat con Lex': 'oro', Norma: 'neutro', Sentenza: 'ok', Appunti: 'neutro' } as const;
const DURATA_PASSO_MS = 700;

type Richiesta = { azione: AzioneConfronto; passo: number; pronta: boolean };

// D1 · Confronto: 2 o 3 elementi di Ricerche affiancati, e Lex che li mette a confronto (come sul sito).
export default function Confronto() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { elementiAttivi, etichetteAttive, conto, azioni } = useStato();
  const { t } = useTesti();
  const vai = useVaiASezione();
  const offline = useOffline();
  const [richiesta, setRichiesta] = useState<Richiesta | null>(null);
  const [esauriti, setEsauriti] = useState(false);
  const scorre = useRef<ScrollView>(null);

  const elementi = (ids ?? '')
    .split(',')
    .map((id) => elementiAttivi.find((e) => e.id === id))
    .filter((e): e is Elemento => !!e);

  // Passi dell'attesa; all'ultimo arriva la risposta e si scala il credito.
  useEffect(() => {
    if (!richiesta || richiesta.pronta) return;
    const timer = setTimeout(() => {
      if (richiesta.passo + 1 < passiConfronto.length) {
        setRichiesta({ ...richiesta, passo: richiesta.passo + 1 });
      } else {
        setRichiesta({ ...richiesta, pronta: true });
        azioni.usaCredito();
      }
    }, DURATA_PASSO_MS);
    return () => clearTimeout(timer);
  }, [richiesta, azioni]);

  // la risposta (e l'attesa) si vedono senza dover scorrere
  const pronta = richiesta?.pronta;
  useEffect(() => {
    if (pronta !== undefined) setTimeout(() => scorre.current?.scrollToEnd({ animated: true }), 50);
  }, [pronta]);

  const chiedi = (azione: AzioneConfronto) => {
    if (offline || (richiesta && !richiesta.pronta)) return;
    if (conto.crediti <= 0) {
      setEsauriti(true);
      return;
    }
    setRichiesta({ azione, passo: 0, pronta: false });
  };

  const torna = () => indietro('/ricerche');

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/ricerche" etichetta={t('ricerche.tornaRicerche')} />}
        titolo={t('ricerche.confronto.titolo')}
        destra={<ContatoreCrediti />}
      />
      {elementi.length < 2 ? (
        <StatoVuoto
          icona="confronta"
          titolo={t('ricerche.confronto.vuotoTitolo')}
          testo={t('ricerche.confronto.vuotoTesto')}
          azione={{ titolo: t('ricerche.tornaRicerche'), onPress: torna }}
        />
      ) : (
        <ScrollView ref={scorre} contentContainerStyle={stili.corpo}>
          <Testo tipo="cap" style={{ paddingHorizontal: 20 }}>
            {t('ricerche.confronto.conteggio', { n: elementi.length })}
          </Testo>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={stili.colonne}
            accessibilityLabel={t('ricerche.confronto.elementi')}
          >
            {elementi.map((e) => {
              const etichetta = etichetteAttive.find((x) => x.id === e.etichetta);
              return (
                <View key={e.id} style={stili.colonna}>
                  <View style={stili.tipo}>
                    <Badge tono={tonoBadge[e.tipo]}>{t(`ricerche.tipi.${e.tipo}`)}</Badge>
                    {etichetta ? (
                      <View style={stili.etichetta}>
                        <Pallino colore={etichetta.colore} />
                        <Testo tipo="mini" colore={etichetta.colore}>
                          {etichetta.nome}
                        </Testo>
                      </View>
                    ) : null}
                  </View>
                  <Text style={stili.ttl}>{e.titolo}</Text>
                  <Text style={stili.estratto}>{e.estratto}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={stili.sezione}>
            <Eyebrow>{t('ricerche.chiedi')}</Eyebrow>
            <Testo tipo="small" colore={colori.fg2}>
              {t('ricerche.confronto.spiega')}
            </Testo>
          </View>
          <View>
            {azioniConfronto.map((a) => {
              const scelta = richiesta?.azione.id === a.id;
              return (
                <Riga
                  key={a.id}
                  titolo={t(`ricerche.confronto.azioni.${a.id}.titolo`)}
                  sottotitolo={t(`ricerche.confronto.azioni.${a.id}.descrizione`)}
                  freccia="avanti"
                  evidenziata={scelta}
                  bordoSopra={a.id === azioniConfronto[0].id}
                  onPress={() => chiedi(a)}
                />
              );
            })}
          </View>

          {richiesta ? (
            <View style={stili.risposta} accessibilityLiveRegion="polite">
              <FirmaLex />
              {richiesta.pronta ? (
                <RispostaLex
                  risposta={rispostaConfronto(richiesta.azione, elementi)}
                  onCitazione={() => undefined}
                />
              ) : (
                <>
                  <Testo colore={colori.fg2}>{t('ricerche.confronto.attesa')}</Testo>
                  <Passi passi={passiConfronto} attivo={richiesta.passo} />
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      <FoglioEsauriti
        visibile={esauriti}
        onChiudi={() => setEsauriti(false)}
        onCrediti={() => {
          setEsauriti(false);
          vai('/profilo');
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 8, paddingBottom: 24 },
  colonne: { gap: 10, paddingHorizontal: 20 },
  colonna: {
    width: 270,
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  etichetta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ttl: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  estratto: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 21, color: colori.fg2 },
  sezione: { gap: 6, paddingHorizontal: 20, paddingTop: 6 },
  risposta: { gap: 12, paddingHorizontal: 20, paddingTop: 6 },
});
