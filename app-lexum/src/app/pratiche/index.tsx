import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, Separatore, Tag } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import type { Pratica } from '@/dati-finti/studio';
import { dataBreve, urgenza } from '@/studio/formati';
import { prossimaUdienza, prossimoTermine } from '@/studio/pratiche';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type Filtro = 'aperta' | 'chiusa' | 'tutte';

const coloreUrgenza = {
  pericolo: colori.danger,
  avviso: colori.warn,
  ok: colori.ok,
  neutro: colori.fg3,
} as const;

// S1 · Pratiche dell'avvocato, come sul sito (lì si chiamano «Pratiche»): ricerca, aperte e chiuse,
// e per ognuna la prossima udienza e il primo termine da rispettare.
export default function Pratiche() {
  const { pratiche, clienti } = useStudio();
  const [filtro, setFiltro] = useState<Filtro>('aperta');
  const [testo, setTesto] = useState('');

  const q = testo.trim().toLowerCase();
  const conta = (f: Filtro) => pratiche.filter((p) => f === 'tutte' || p.stato === f).length;
  const visibili = pratiche
    .filter((p) => filtro === 'tutte' || p.stato === filtro)
    .filter(
      (p) =>
        !q ||
        p.titolo.toLowerCase().includes(q) ||
        nomeCliente(clienti, p.clienteId).toLowerCase().includes(q),
    );

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo="Pratiche"
        destra={
          <PulsanteIcona
            icona="piu"
            etichetta="Nuova pratica"
            onPress={() => router.push('/pratiche/nuova')}
          />
        }
      />
      <View style={stili.testa}>
        <CampoCerca
          etichetta="Cerca pratica o cliente"
          placeholder="Cerca pratica o cliente…"
          alto={46}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
        />
        <View style={stili.filtri}>
          <Tag
            titolo={`Aperte · ${conta('aperta')}`}
            attivo={filtro === 'aperta'}
            onPress={() => setFiltro('aperta')}
          />
          <Tag
            titolo={`Chiuse · ${conta('chiusa')}`}
            attivo={filtro === 'chiusa'}
            onPress={() => setFiltro('chiusa')}
          />
          <Tag
            titolo={`Tutte · ${conta('tutte')}`}
            attivo={filtro === 'tutte'}
            onPress={() => setFiltro('tutte')}
          />
        </View>
      </View>
      <Separatore />
      <ScrollView style={{ flex: 1 }}>
        {visibili.map((p) => (
          <RigaPratica
            key={p.id}
            pratica={p}
            cliente={nomeCliente(clienti, p.clienteId)}
            onPress={() => router.push({ pathname: '/pratiche/[id]', params: { id: p.id } })}
          />
        ))}
        {visibili.length === 0 ? (
          <StatoVuoto
            icona={q ? 'cerca' : 'bilancia'}
            titolo={q ? 'Nessuna pratica con queste parole' : 'Nessuna pratica qui'}
            testo={
              q ? 'Prova con il nome del cliente o con altre parole.' : 'Crea una pratica con «+» in alto.'
            }
            azione={
              q ? undefined : { titolo: 'Nuova pratica', onPress: () => router.push('/pratiche/nuova') }
            }
          />
        ) : null}
      </ScrollView>
    </Schermata>
  );
}

function RigaPratica({
  pratica: p,
  cliente,
  onPress,
}: {
  pratica: Pratica;
  cliente: string;
  onPress: () => void;
}) {
  const udienza = p.stato === 'aperta' ? prossimaUdienza(p) : undefined;
  const termine = p.stato === 'aperta' ? prossimoTermine(p) : undefined;
  const u = termine ? urgenza(termine.scadenza) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [stili.riga, pressed && { backgroundColor: colori.bg2 }]}
    >
      <View style={stili.tipo}>
        <Badge tono={p.stato === 'aperta' ? 'ok' : 'neutro'}>
          {p.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
        </Badge>
        <Testo tipo="mini">{p.esito ? `${p.tipo} · ${p.esito}` : p.tipo}</Testo>
      </View>
      <Text style={stili.titolo}>{p.titolo}</Text>
      <Text style={stili.cliente}>{cliente}</Text>
      {udienza || (termine && u) ? (
        <View style={stili.prossimi}>
          {udienza ? (
            <View style={stili.prossimo}>
              <Icona nome="tribunale" dimensione={14} colore={colori.accentText} />
              <Text style={[stili.prossimoTesto, { color: colori.accentText }]}>
                Udienza {dataBreve(udienza.dataOra)}
              </Text>
            </View>
          ) : null}
          {termine && u ? (
            <View style={stili.prossimo}>
              <Icona nome="orologio" dimensione={14} colore={coloreUrgenza[u.tono]} />
              <Text style={[stili.prossimoTesto, { color: coloreUrgenza[u.tono] }]}>
                Termine: {u.testo.toLowerCase()}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  riga: {
    gap: 5,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titolo: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  cliente: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  prossimi: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  prossimo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prossimoTesto: { fontFamily: famiglie.testoMedio, fontSize: 13 },
});
