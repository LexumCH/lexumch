import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, Separatore, Tag } from '@/componenti/Elementi';
import { BottoneIndietro } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Caricamento, StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { risultatiFinti, trovaNorma, type Risultato, type TipoRisultato } from '@/dati-finti/banca-dati';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import type { Chiave } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { useVaiASezione } from '@/navigazione';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// «titolo» resta il nome del filtro (anche nell'indirizzo); sullo schermo si legge «testo» nella lingua dell'app.
const filtri: { titolo: string; testo: Chiave; tipi: TipoRisultato[] | null }[] = [
  { titolo: 'Tutto', testo: 'bancaDati.filtri.tutto', tipi: null },
  { titolo: 'Norme', testo: 'bancaDati.filtri.norme', tipi: ['Norma'] },
  { titolo: 'Sentenze', testo: 'bancaDati.filtri.sentenze', tipi: ['Sentenza'] },
  { titolo: 'Prassi', testo: 'bancaDati.filtri.prassi', tipi: ['Prassi'] },
  { titolo: 'UE', testo: 'bancaDati.filtri.ue', tipi: ['UE'] },
];

const tonoBadge = { Norma: 'oro', Sentenza: 'ok', Prassi: 'neutro', UE: 'neutro' } as const;

const paroleVuote = new Set([
  'agli',
  'alla',
  'alle',
  'allo',
  'degli',
  'della',
  'delle',
  'dello',
  'nella',
  'nelle',
  'sono',
  'come',
  'anche',
  'oppure',
]);

// C3 · Ricerca per parole nella Banca dati. Nei dati di prova i risultati non dipendono dalle parole:
// cambiano solo le parole evidenziate. La ricerca vera arriva con la tappa 5.
export default function Risultati() {
  const { paese, simula } = useStato();
  const { t } = useTesti();
  const offline = useOffline();
  const vai = useVaiASezione();
  const parametri = useLocalSearchParams<{ q?: string; filtro?: string }>();
  const [testo, setTesto] = useState(parametri.q ?? '');
  const [filtro, setFiltro] = useState(parametri.filtro ?? 'Tutto');
  const [norma, setNorma] = useState<string | null>(null);

  const tipi = filtri.find((f) => f.titolo === filtro)?.tipi ?? null;
  const risultati = (risultatiFinti[paese] ?? []).filter((r) => !tipi || tipi.includes(r.tipo));
  const parole = testo
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !paroleVuote.has(p));

  const apri = (r: Risultato) => {
    if (r.norma) setNorma(r.norma);
    else if (r.documento)
      router.push({ pathname: '/banca-dati/documento/[id]', params: { id: r.documento } });
  };

  return (
    <Schermata>
      <View style={stili.testa}>
        <BottoneIndietro ripiego="/banca-dati" />
        <CampoCerca
          etichetta={t('bancaDati.cerca')}
          placeholder={t('bancaDati.segnaposto')}
          alto={44}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
          autoFocus={!parametri.q && !parametri.filtro}
          stile={{ flex: 1, paddingLeft: 12 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={stili.filtri}
      >
        {filtri.map((f) => (
          <Tag
            key={f.titolo}
            titolo={t(f.testo)}
            attivo={f.titolo === filtro}
            onPress={() => setFiltro(f.titolo)}
          />
        ))}
      </ScrollView>
      <View style={stili.ordine}>
        <Testo tipo="cap">{t('bancaDati.ordinati')}</Testo>
        <Pulsante
          titolo={t('bancaDati.annoOrgano')}
          icona="filtri"
          variante="tenue"
          piccolo
          stile={{ paddingHorizontal: 12, gap: 8 }}
        />
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {offline ? (
          <StatoVuoto
            icona="offline"
            titolo={t('bancaDati.offlineTitolo')}
            testo={t('bancaDati.offlineTesto')}
          />
        ) : null}
        {!offline && simula.caricamento ? <Caricamento /> : null}
        {(offline || simula.caricamento ? [] : risultati).map((r) => (
          <Pressable
            key={r.id}
            onPress={() => apri(r)}
            accessibilityRole="button"
            style={({ pressed }) => [stili.risultato, pressed && { backgroundColor: colori.bg2 }]}
          >
            <View style={stili.tipo}>
              <Badge tono={tonoBadge[r.tipo]}>{t(`bancaDati.tipi.${r.tipo}`)}</Badge>
              <Testo tipo="mini" style={{ flex: 1 }}>
                {r.riferimento}
              </Testo>
            </View>
            <Text style={stili.ttl}>{r.titolo}</Text>
            <Text style={stili.estratto}>{evidenzia(r.estratto, parole)}</Text>
          </Pressable>
        ))}
        {!offline && !simula.caricamento && risultati.length === 0 ? (
          <StatoVuoto icona="cerca" titolo={t('bancaDati.vuotoTitolo')} testo={t('bancaDati.vuotoTesto')} />
        ) : null}
      </ScrollView>

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        eyebrow={t('bancaDati.norma')}
        nota={t('bancaDati.notaRicerca')}
        onChiudi={() => setNorma(null)}
        onApriLegge={(id) => {
          setNorma(null);
          router.push({ pathname: '/banca-dati/legge/[id]', params: { id } });
        }}
        onSalva={() => {
          setNorma(null);
          vai('/ricerche');
        }}
      />
    </Schermata>
  );
}

// Evidenzia nel testo le parole cercate (come <mark> nel mockup).
function evidenzia(testo: string, parole: string[]) {
  if (parole.length === 0) return testo;
  const escape = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regola = new RegExp(`(${parole.map(escape).join('|')})`, 'gi');
  return testo.split(regola).map((pezzo, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={stili.mark}>
        {pezzo}
      </Text>
    ) : (
      pezzo
    ),
  );
}

const stili = StyleSheet.create({
  testa: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 6, paddingRight: 16 },
  filtri: { gap: 8, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 10 },
  ordine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 6,
  },
  risultato: {
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ttl: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  estratto: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 21, color: colori.fg2 },
  mark: {
    backgroundColor: colori.accentSoft,
    color: colori.fg,
    textDecorationLine: 'underline',
    textDecorationColor: colori.accentLine,
  },
});
