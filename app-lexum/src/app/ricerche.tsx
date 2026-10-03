import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, BarraAzioni, Separatore, Tag } from '@/componenti/Elementi';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { trovaNorma } from '@/dati-finti/banca-dati';
import type { Elemento } from '@/dati-finti/ricerche';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { useVaiASezione } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const tonoBadge = { 'Chat con Lex': 'oro', Norma: 'neutro', Sentenza: 'ok', Appunti: 'neutro' } as const;

// D1 · Ricerche: quello che hai chiesto a Lex e salvato, diviso per etichette (come sul sito).
export default function Ricerche() {
  const { etichetteAttive, elementiAttivi, chatDaSalvare, azioni } = useStato();
  const vai = useVaiASezione();
  // L'etichetta scelta sta nell'indirizzo (?etichetta=casa): così la apre anche il menù.
  const { etichetta: scelta } = useLocalSearchParams<{ etichetta?: string }>();
  const setScelta = (id: string) => router.setParams({ etichetta: id });
  const [testo, setTesto] = useState('');
  const [norma, setNorma] = useState<string | null>(null);

  const etichetta = etichetteAttive.find((e) => e.id === scelta) ?? etichetteAttive[0];
  const q = testo.trim().toLowerCase();
  const elementi = elementiAttivi.filter(
    (e) =>
      e.etichetta === etichetta?.id &&
      (!q || e.titolo.toLowerCase().includes(q) || e.estratto.toLowerCase().includes(q)),
  );
  const totale = elementiAttivi.filter((e) => e.etichetta === etichetta?.id).length;

  const nuovaRicerca = () => {
    if (chatDaSalvare) vai('/chat', { foglio: 'nuova' });
    else {
      azioni.nuovaChat();
      vai('/chat');
    }
  };

  const apri = (e: Elemento) => {
    if (e.tipo === 'Chat con Lex') {
      azioni.apriChatSalvata(e);
      vai('/chat');
    } else if (e.norma) setNorma(e.norma);
    else if (e.documento)
      router.push({ pathname: '/banca-dati/documento/[id]', params: { id: e.documento } });
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo="Ricerche"
        destra={<PulsanteIcona icona="piu" etichetta="Nuova ricerca" onPress={nuovaRicerca} />}
      />
      <View style={stili.testa}>
        <Testo tipo="small" colore={colori.fg2}>
          Tutto quello che hai chiesto a Lex e salvato: chat, appunti, norme, sentenze e prassi.
        </Testo>
        <CampoCerca
          etichetta="Cerca tra le tue ricerche"
          placeholder="Cerca tra le tue ricerche…"
          alto={46}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {etichetteAttive.map((e) => (
            <Tag
              key={e.id}
              titolo={e.nome}
              pallino={e.colore}
              attivo={e.id === etichetta?.id}
              onPress={() => setScelta(e.id)}
            />
          ))}
          <Tag titolo="+ Etichetta" />
        </ScrollView>
        {etichetta ? (
          <Testo tipo="cap">
            Etichetta «{etichetta.nome}» · {totale === 1 ? '1 elemento' : `${totale} elementi`}
          </Testo>
        ) : null}
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {elementi.map((e) => {
          const apribile = e.tipo !== 'Appunti';
          const contenuto = (
            <>
              <View style={stili.tipo}>
                <Badge tono={tonoBadge[e.tipo]}>{e.tipo}</Badge>
                <Testo tipo="mini">{e.quando}</Testo>
              </View>
              <Text style={stili.ttl}>{e.titolo}</Text>
              <Text style={stili.estratto} numberOfLines={2}>
                {e.estratto}
              </Text>
            </>
          );
          return apribile ? (
            <Pressable
              key={e.id}
              onPress={() => apri(e)}
              accessibilityRole="button"
              style={({ pressed }) => [stili.elemento, pressed && { backgroundColor: colori.bg2 }]}
            >
              {contenuto}
            </Pressable>
          ) : (
            <View key={e.id} style={stili.elemento}>
              {contenuto}
            </View>
          );
        })}
        {elementi.length === 0 ? (
          <Testo colore={colori.fg3} style={{ padding: 20 }}>
            {q ? 'Nessun elemento con queste parole.' : 'In questa etichetta non hai ancora salvato niente.'}
          </Testo>
        ) : null}
      </ScrollView>

      <BarraAzioni>
        <Pulsante
          titolo={etichetta ? `Chiedi a Lex su «${etichetta.nome}»` : 'Chiedi a Lex'}
          icona="stella"
          righe={2}
          stile={{ flex: 1 }}
          onPress={() => vai('/chat')}
        />
        <Pulsante
          titolo="Confronta"
          etichetta="Confronta due o tre elementi"
          icona="confronta"
          variante="linea"
          stile={{ alignSelf: 'auto', paddingHorizontal: 14 }}
        />
      </BarraAzioni>

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        eyebrow="Norma salvata"
        onChiudi={() => setNorma(null)}
        onApriLegge={(id) => {
          setNorma(null);
          router.push({ pathname: '/banca-dati/legge/[id]', params: { id } });
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  elemento: {
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ttl: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  estratto: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 21, color: colori.fg2 },
});
