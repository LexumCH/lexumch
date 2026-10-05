import { router, useLocalSearchParams } from 'expo-router';
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
import { FoglioCondiviso } from '@/fogli/FoglioCondiviso';
import { useTesti } from '@/lingue/useTesti';
import { strumentiStudio } from '@/ruoli';
import { ArchivioStudio } from '@/studio/ArchivioStudio';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// Valori interni dei due filtri fissi; il nome che si vede viene dalla lingua.
const TUTTE = 'Tutte';
const SENZA = 'Senza categoria';

// D2 · Archivio: spazio usato, categorie con «+ Categoria», scansione e caricamento.
// Scanner, caricamento, categorie nuove e «Condividi in Lexum» arrivano con la tappa 6.
export default function Archivio() {
  const { paese, ruoli } = useStato();
  // per l'avvocato è l'archivio dello studio, con clienti e pratiche
  if (strumentiStudio(ruoli[paese] ?? 'user').includes('clienti')) return <ArchivioStudio />;
  return <ArchivioPersonale />;
}

function ArchivioPersonale() {
  const { paese, conto, documentiAttivi: documenti, simula } = useStato();
  const { t } = useTesti();
  // ?condiviso=1: è arrivato un file da «Condividi in Lexum» di un'altra app.
  const { condiviso } = useLocalSearchParams<{ condiviso?: string }>();
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
  const nomeCategoria = (c: string) =>
    c === TUTTE ? t('archivio.tutte') : c === SENZA ? t('archivio.senzaCategoria') : c;

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('archivio.titolo')}
        destra={<PulsanteIcona icona="cartella" etichetta={t('archivio.categorie')} dimensione={21} />}
      />
      <View style={stili.testa}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Testo tipo="small">{t('archivio.conteggio', { n: documenti.length, indicizzati })}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {t('archivio.spazio', {
                usato: formatoMB(conto.archivioUsatoMB),
                totale: formatoMB(conto.archivioTotaleMB),
              })}
            </Testo>
          </View>
          <Barra percento={percento} />
        </View>
        <CampoCerca
          etichetta={t('archivio.cerca')}
          placeholder={t('archivio.cercaSegnaposto')}
          alto={46}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
        />
        <View style={stili.filtri}>
          {categorie.map((c) => (
            <Tag key={c} titolo={nomeCategoria(c)} attivo={c === categoria} onPress={() => setCategoria(c)} />
          ))}
          <Tag titolo={t('archivio.nuovaCategoria')} tratteggiato />
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
            sottotitolo={[
              d.categoria ?? t('archivio.senzaCategoria'),
              d.data,
              d.scansione ? t('archivio.scansione') : null,
              d.dimensione,
            ]
              .filter(Boolean)
              .join(' · ')}
            sotto={
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge>{d.tipo}</Badge>
                <Badge tono={d.stato === 'Indicizzato' ? 'ok' : 'warn'}>
                  {t(`archivio.stati.${d.stato}`)}
                </Badge>
              </View>
            }
          />
        ))}
        {!simula.caricamento && documenti.length === 0 ? (
          <StatoVuoto icona="archivio" titolo={t('archivio.vuotoTitolo')} testo={t('archivio.vuotoTesto')} />
        ) : null}
        {!simula.caricamento && documenti.length > 0 && visibili.length === 0 ? (
          <StatoVuoto
            icona="cartella"
            titolo={t('archivio.nessunoTitolo')}
            testo={t('archivio.nessunoTesto')}
          />
        ) : null}
      </ScrollView>

      <BarraAzioni>
        <Pulsante titolo={t('archivio.scansiona')} icona="fotocamera" variante="linea" stile={{ flex: 1 }} />
        <Pulsante titolo={t('archivio.carica')} icona="carica" stile={{ flex: 1 }} />
      </BarraAzioni>

      <FoglioCondiviso
        visibile={condiviso === '1'}
        onChiudi={() => router.setParams({ condiviso: undefined })}
        onSalvato={() => {
          setCategoria(TUTTE);
          router.setParams({ condiviso: undefined });
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
