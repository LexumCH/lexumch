import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, Barra, BarraAzioni, IconaQuadrata, Separatore, Tag } from '@/componenti/Elementi';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Caricamento, StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { categorieFinte } from '@/dati-finti/archivio';
import { formatoMB } from '@/dati-finti/conti';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

const TUTTE = 'Tutte';
const SENZA = 'Senza categoria';

// D2 · Archivio: spazio usato, categorie con «+ Categoria», scansione e caricamento.
// Scanner, caricamento e categorie nuove arrivano con la tappa 6.
export default function Archivio() {
  const { paese, conto, documentiAttivi: documenti, simula } = useStato();
  const [categoria, setCategoria] = useState(TUTTE);
  const [testo, setTesto] = useState('');
  const categorie = [TUTTE, ...(categorieFinte[paese] ?? []), SENZA];
  const indicizzati = documenti.filter((d) => d.stato === 'Indicizzato').length;
  const percento = (conto.archivioUsatoMB / conto.archivioTotaleMB) * 100;

  const q = testo.trim().toLowerCase();
  const visibili = documenti.filter(
    (d) =>
      (categoria === TUTTE || (categoria === SENZA ? !d.categoria : d.categoria === categoria)) &&
      (!q || d.titolo.toLowerCase().includes(q)),
  );

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo="Archivio"
        destra={<PulsanteIcona icona="cartella" etichetta="Categorie" dimensione={21} />}
      />
      <View style={stili.testa}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Testo tipo="small">
              {documenti.length} documenti · {indicizzati} indicizzati
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {formatoMB(conto.archivioUsatoMB)} di {formatoMB(conto.archivioTotaleMB)}
            </Testo>
          </View>
          <Barra percento={percento} />
        </View>
        <CampoCerca
          etichetta="Cerca tra i tuoi documenti"
          placeholder="Cerca tra i tuoi documenti…"
          alto={46}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
        />
        <View style={stili.filtri}>
          {categorie.map((c) => (
            <Tag key={c} titolo={c} attivo={c === categoria} onPress={() => setCategoria(c)} />
          ))}
          <Tag titolo="+ Categoria" tratteggiato />
        </View>
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {simula.caricamento ? <Caricamento /> : null}
        {(simula.caricamento ? [] : visibili).map((d) => (
          <Riga
            key={d.id}
            inAlto
            sinistra={<IconaQuadrata nome="documento" tenue />}
            titolo={d.titolo}
            sottotitolo={[d.categoria ?? SENZA, d.data, d.scansione ? 'scansione' : null, d.dimensione]
              .filter(Boolean)
              .join(' · ')}
            sotto={
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge>{d.tipo}</Badge>
                <Badge tono={d.stato === 'Indicizzato' ? 'ok' : 'warn'}>{d.stato}</Badge>
              </View>
            }
          />
        ))}
        {!simula.caricamento && documenti.length === 0 ? (
          <StatoVuoto
            icona="archivio"
            titolo="L'archivio è vuoto"
            testo="Carica o scansiona un documento: Lex lo legge quando gli fai una domanda."
          />
        ) : null}
        {!simula.caricamento && documenti.length > 0 && visibili.length === 0 ? (
          <StatoVuoto
            icona="cartella"
            titolo="Nessun documento qui"
            testo="Prova un'altra categoria o altre parole."
          />
        ) : null}
      </ScrollView>

      <BarraAzioni>
        <Pulsante titolo="Scansiona" icona="fotocamera" variante="linea" stile={{ flex: 1 }} />
        <Pulsante titolo="Carica" icona="carica" stile={{ flex: 1 }} />
      </BarraAzioni>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
