import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Striscia } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { Schede } from '@/componenti/Schede';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import type { Fattura } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { strumentiStudio } from '@/ruoli';
import { importo, statoFattura, totaliFattura } from '@/studio/calcoli';
import { mancanoAlProfessionista, quandoFattura, statiFattura, testoStato } from '@/studio/fatturazione';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type Filtro = 'da-incassare' | 'scadute' | 'pagate' | 'tutte';

// S5 · Fatture dello studio, come «Fatturazione» sul sito: i numeri dell'anno, poi le fatture.
// Il filtro predefinito è lo scadenzario: quelle da incassare, la più urgente in alto.
export default function Fatture() {
  const { paese, ruoli } = useStato();
  const { fatture, clienti, fatturazione } = useStudio();
  const { t } = useTesti();
  const [filtro, setFiltro] = useState<Filtro>('da-incassare');
  const avvocato = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');
  const manca = mancanoAlProfessionista(fatturazione, paese);

  const anno = new Date().getFullYear();
  const dellAnno = fatture.filter(
    (f) => new Date(f.emessa).getFullYear() === anno && f.stato !== 'annullata',
  );
  const somma = (fn: (f: Fattura) => number, elenco = dellAnno) => elenco.reduce((s, f) => s + fn(f), 0);
  const numeri = [
    { titolo: t('fatture.elenco.fatturato'), valore: somma((f) => totaliFattura(f, paese).totale) },
    { titolo: t('fatture.elenco.incassato'), valore: somma((f) => totaliFattura(f, paese).pagato) },
    {
      titolo: t('fatture.elenco.daIncassare'),
      valore: somma(
        (f) => totaliFattura(f, paese).residuo,
        dellAnno.filter((f) => f.stato === 'in_attesa'),
      ),
    },
    {
      titolo: t('fatture.elenco.scaduto'),
      valore: somma(
        (f) => totaliFattura(f, paese).residuo,
        dellAnno.filter((f) => statoFattura(f) === 'scaduta'),
      ),
      pericolo: true,
    },
  ];

  const filtra = (f: Filtro) =>
    fatture.filter((x) => {
      const s = statoFattura(x);
      if (f === 'da-incassare') return s === 'in_attesa' || s === 'scaduta';
      if (f === 'scadute') return s === 'scaduta';
      if (f === 'pagate') return s === 'pagata';
      return true;
    });
  const visibili = filtra(filtro).sort((a, b) =>
    filtro === 'da-incassare' || filtro === 'scadute'
      ? (a.scadenza ?? a.emessa).localeCompare(b.scadenza ?? b.emessa)
      : b.emessa.localeCompare(a.emessa),
  );
  const nuova = () => router.push('/fatture/nuova');

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('fatture.elenco.titolo')}
        destra={<PulsanteIcona icona="piu" etichetta={t('fatture.nuova.titolo')} onPress={nuova} />}
      />
      {manca.length > 0 ? (
        <Striscia
          icona="avviso"
          testo={t('fatture.elenco.mancanoDati')}
          azione={t('fatture.elenco.completa')}
          onPress={() => router.push('/fatture/dati')}
        />
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={stili.numeri} accessibilityLabel={t('fatture.elenco.numeriAnno', { anno })}>
          {numeri.map((n) => (
            <View key={n.titolo} style={stili.numero}>
              <Text style={stili.numeroTitolo}>{n.titolo}</Text>
              <Text
                style={[stili.numeroValore, n.pericolo && n.valore > 0 ? { color: colori.danger } : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {importo(n.valore, paese)}
              </Text>
            </View>
          ))}
        </View>
        <Testo tipo="mini" colore={colori.fg3} style={{ paddingHorizontal: 20, marginTop: -6 }}>
          {t('fatture.elenco.emesseNel', { anno })}
        </Testo>

        {avvocato && paese === 'IT' ? (
          <Pressable
            onPress={() => router.push('/fatture/calcolatore')}
            accessibilityRole="button"
            style={({ pressed }) => [stili.calcolatore, pressed && { backgroundColor: colori.bg2 }]}
          >
            <Icona nome="calcolatrice" dimensione={22} colore={colori.accentText} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={stili.calcolatoreTitolo}>Calcola parcella</Text>
              <Testo tipo="cap">Parametri forensi, DM 55/2014</Testo>
            </View>
            <Icona nome="avanti" dimensione={18} colore={colori.fg3} />
          </Pressable>
        ) : null}

        {fatture.length > 0 ? (
          <View style={{ paddingTop: 14 }}>
            <Schede
              voci={[
                {
                  valore: 'da-incassare',
                  titolo: t('fatture.elenco.filtri.daIncassare', { n: filtra('da-incassare').length }),
                },
                {
                  valore: 'scadute',
                  titolo: t('fatture.elenco.filtri.scadute', { n: filtra('scadute').length }),
                },
                {
                  valore: 'pagate',
                  titolo: t('fatture.elenco.filtri.pagate', { n: filtra('pagate').length }),
                },
                { valore: 'tutte', titolo: t('fatture.elenco.filtri.tutte', { n: fatture.length }) },
              ]}
              attiva={filtro}
              onCambia={setFiltro}
            />
          </View>
        ) : null}

        {visibili.map((f) => (
          <RigaFattura
            key={f.id}
            fattura={f}
            cliente={nomeCliente(clienti, f.clienteId)}
            paese={paese}
            onPress={() => router.push({ pathname: '/fatture/[id]', params: { id: f.id } })}
          />
        ))}
        {visibili.length === 0 ? (
          <StatoVuoto
            icona="ricevuta"
            titolo={
              fatture.length === 0
                ? t('fatture.elenco.vuoto.nessuna')
                : filtro === 'da-incassare'
                  ? t('fatture.elenco.vuoto.nienteDaIncassare')
                  : t('fatture.elenco.vuoto.nessunaQui')
            }
            testo={fatture.length === 0 ? t('fatture.elenco.vuoto.crea') : undefined}
            azione={fatture.length === 0 ? { titolo: t('fatture.nuova.titolo'), onPress: nuova } : undefined}
          />
        ) : null}
      </ScrollView>
    </Schermata>
  );
}

function RigaFattura({
  fattura: f,
  cliente,
  paese,
  onPress,
}: {
  fattura: Fattura;
  cliente: string;
  paese: string;
  onPress: () => void;
}) {
  const { t: testo, lingua } = useTesti();
  const stato = statoFattura(f);
  const t = totaliFattura(f, paese);
  const cifra = stato === 'in_attesa' || stato === 'scaduta' ? t.residuo : t.daIncassare;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={testo('fatture.elenco.riga', {
        numero: f.numero,
        cliente,
        importo: importo(cifra, paese),
        stato: testoStato(stato, lingua),
      })}
      style={({ pressed }) => [stili.riga, pressed && { backgroundColor: colori.bg2 }]}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <View style={stili.testaRiga}>
          <Badge tono={statiFattura[stato].tono}>{testoStato(stato, lingua)}</Badge>
          <Testo tipo="mini">{f.numero}</Testo>
        </View>
        <Text style={stili.cliente} numberOfLines={1}>
          {cliente}
        </Text>
        <Text style={[stili.quando, stato === 'scaduta' && { color: colori.danger }]}>
          {quandoFattura(f, lingua)}
        </Text>
      </View>
      <Text
        style={[
          stili.importo,
          stato === 'annullata' && { color: colori.fg3, textDecorationLine: 'line-through' },
        ]}
      >
        {importo(cifra, paese)}
      </Text>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  numeri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 20, paddingTop: 8 },
  numero: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  numeroTitolo: {
    fontFamily: famiglie.testoMedio,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colori.fg3,
  },
  numeroValore: { fontFamily: famiglie.testoMedio, fontSize: 19, color: colori.fg },
  calcolatore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 62,
    marginTop: 14,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colori.accentLine,
  },
  calcolatoreTitolo: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  testaRiga: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cliente: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  quando: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg2 },
  importo: { fontFamily: famiglie.testoMedio, fontSize: 16, color: colori.fg },
});
