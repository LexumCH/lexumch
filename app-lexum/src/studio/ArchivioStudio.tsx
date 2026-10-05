import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, Barra, BarraAzioni, IconaQuadrata, Separatore, Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { formatoMB } from '@/dati-finti/conti';
import { fileCondivisoFinto } from '@/dati-finti/archivio';
import type { DocumentoStudio } from '@/dati-finti/studio';
import { FoglioCarica, FoglioCategorie, FoglioDocumento, percorsoCategoria } from '@/fogli/FogliDocumenti';
import { useTesti } from '@/lingue/useTesti';
import { Scelta } from '@/studio/Campi';
import { dataBreve } from '@/studio/formati';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// Filtri fissi: tutte le categorie, senza categoria. Per cliente e pratica: tutti, senza cliente.
const TUTTE = '__tutte';
const SENZA = '__senza';

// D2 per l'avvocato · L'archivio dello studio (Archivio.jsx del sito): categorie e sottocategorie,
// filtro per cliente e per pratica, ogni documento collegabile a un cliente e a una pratica.
// ?cliente=<id>&pratica=<id> aprono l'archivio già filtrato; ?condiviso=1 è un file da «Condividi in Lexum».
export function ArchivioStudio() {
  const { paese, conto, simula } = useStato();
  const { documenti, categorie, clienti, pratiche } = useStudio();
  const { t, lingua } = useTesti();
  const parametri = useLocalSearchParams<{ cliente?: string; pratica?: string; condiviso?: string }>();
  const [categoria, setCategoria] = useState(TUTTE);
  const [sotto, setSotto] = useState(TUTTE);
  const [clienteId, setClienteId] = useState(parametri.cliente ?? TUTTE);
  const [praticaId, setPraticaId] = useState(parametri.pratica ?? TUTTE);
  const [testo, setTesto] = useState('');
  const [foglio, setFoglio] = useState<'categorie' | 'carica' | 'scansiona' | 'cliente' | 'pratica' | null>(
    null,
  );
  const [aperto, setAperto] = useState<string | null>(null);
  const chiudi = () => setFoglio(null);

  // nell'archivio stanno i documenti dello studio; gli atti svizzeri «solo nella pratica» no
  const archivio = documenti.filter((d) => !d.soloPratica);
  const indicizzati = archivio.filter((d) => d.stato === 'Indicizzato').length;
  const percento = (conto.archivioUsatoMB / conto.archivioTotaleMB) * 100;
  const scelta = categorie.find((c) => c.id === categoria);
  const q = testo.trim().toLowerCase();
  const nomeCliente = (id?: string) => clienti.find((c) => c.id === id)?.nome;
  const titoloPratica = (id?: string) => pratiche.find((p) => p.id === id)?.titolo;

  const visibili = archivio
    .filter(
      (d) =>
        (categoria === TUTTE || (categoria === SENZA ? !d.categoriaId : d.categoriaId === categoria)) &&
        (sotto === TUTTE || (sotto === SENZA ? !d.sottocategoriaId : d.sottocategoriaId === sotto)) &&
        (clienteId === TUTTE || (clienteId === SENZA ? !d.clienteId : d.clienteId === clienteId)) &&
        (praticaId === TUTTE || d.praticaId === praticaId) &&
        (!q ||
          d.titolo.toLowerCase().includes(q) ||
          (nomeCliente(d.clienteId) ?? '').toLowerCase().includes(q)),
    )
    .sort((a, b) => b.quando.localeCompare(a.quando));

  const filtroCliente =
    clienteId === TUTTE
      ? t('documenti.archivio.tuttiClienti')
      : clienteId === SENZA
        ? t('documenti.archivio.senzaCliente')
        : t('documenti.archivio.filtroCliente', { nome: nomeCliente(clienteId) ?? '' });
  const filtroPratica =
    praticaId === TUTTE
      ? t('documenti.archivio.tuttePratiche')
      : t('documenti.archivio.filtroPratica', { titolo: titoloPratica(praticaId) ?? '' });
  const praticheFiltro = pratiche.filter(
    (p) => clienteId === TUTTE || clienteId === SENZA || p.clienteId === clienteId,
  );

  const condiviso = parametri.condiviso === '1';
  const caricaVisibile = foglio === 'carica' || foglio === 'scansiona' || condiviso;
  const documento: DocumentoStudio | null = archivio.find((d) => d.id === aperto) ?? null;

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('archivio.titolo')}
        destra={
          <PulsanteIcona
            icona="cartella"
            etichetta={t('documenti.archivio.categorie')}
            dimensione={21}
            onPress={() => setFoglio('categorie')}
          />
        }
      />
      <View style={stili.testa}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Testo tipo="small">{t('archivio.conteggio', { n: archivio.length, indicizzati })}</Testo>
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
          {[
            { id: TUTTE, nome: t('archivio.tutte') },
            ...categorie,
            { id: SENZA, nome: t('archivio.senzaCategoria') },
          ].map((c) => (
            <Tag
              key={c.id}
              titolo={c.nome}
              attivo={c.id === categoria}
              onPress={() => {
                setCategoria(c.id);
                setSotto(TUTTE);
              }}
            />
          ))}
          <Tag titolo={t('archivio.nuovaCategoria')} tratteggiato onPress={() => setFoglio('categorie')} />
        </View>
        {scelta && scelta.sottocategorie.length > 0 ? (
          <View style={stili.filtri}>
            {[
              { id: TUTTE, nome: t('documenti.archivio.tutteSotto') },
              ...scelta.sottocategorie,
              { id: SENZA, nome: t('documenti.archivio.senzaSotto') },
            ].map((s) => (
              <Tag key={s.id} titolo={s.nome} attivo={s.id === sotto} onPress={() => setSotto(s.id)} />
            ))}
          </View>
        ) : null}
        <View style={stili.filtri}>
          <Tag
            titolo={`${filtroCliente} ▾`}
            attivo={clienteId !== TUTTE}
            onPress={() => setFoglio('cliente')}
          />
          <Tag
            titolo={`${filtroPratica} ▾`}
            attivo={praticaId !== TUTTE}
            onPress={() => setFoglio('pratica')}
          />
        </View>
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {simula.caricamento ? null : (
          <Testo tipo="cap" style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {t('documenti.archivio.visibilita')}
          </Testo>
        )}
        {visibili.map((d) => {
          const cliente = nomeCliente(d.clienteId);
          const pratica = titoloPratica(d.praticaId);
          return (
            <Riga
              key={d.id}
              inAlto
              sinistra={<IconaQuadrata nome="documento" tenue />}
              titolo={d.titolo}
              sottotitolo={[
                percorsoCategoria(categorie, d) ?? t('archivio.senzaCategoria'),
                dataBreve(d.quando, lingua),
                d.scansione ? t('archivio.scansione') : null,
                d.dimensione,
              ]
                .filter(Boolean)
                .join(' · ')}
              sotto={
                <View style={stili.badge}>
                  <Badge>{d.formato}</Badge>
                  <Badge tono={d.stato === 'Indicizzato' ? 'ok' : 'warn'}>
                    {t(`archivio.stati.${d.stato}`)}
                  </Badge>
                  {d.origine === 'atto' ? <Badge tono="oro">{t('documenti.archivio.atto')}</Badge> : null}
                  {cliente ? <Badge tono="oro">{cliente}</Badge> : null}
                  {pratica ? <Badge>{pratica}</Badge> : null}
                </View>
              }
              onPress={() => setAperto(d.id)}
            />
          );
        })}
        {archivio.length === 0 ? (
          <StatoVuoto icona="archivio" titolo={t('archivio.vuotoTitolo')} testo={t('archivio.vuotoTesto')} />
        ) : null}
        {archivio.length > 0 && visibili.length === 0 ? (
          <StatoVuoto
            icona="cartella"
            titolo={t('archivio.nessunoTitolo')}
            testo={t('archivio.nessunoTesto')}
          />
        ) : null}
      </ScrollView>

      <BarraAzioni>
        <Pulsante
          titolo={t('archivio.scansiona')}
          icona="fotocamera"
          variante="linea"
          stile={{ flex: 1 }}
          onPress={() => setFoglio('scansiona')}
        />
        <Pulsante
          titolo={t('archivio.carica')}
          icona="carica"
          stile={{ flex: 1 }}
          onPress={() => setFoglio('carica')}
        />
      </BarraAzioni>

      <FoglioCategorie visibile={foglio === 'categorie'} onChiudi={chiudi} />
      <FoglioCarica
        visibile={caricaVisibile}
        scansione={foglio === 'scansiona'}
        file={condiviso ? fileCondivisoFinto[paese] : undefined}
        onChiudi={() => {
          chiudi();
          if (condiviso) router.setParams({ condiviso: undefined });
        }}
        clienteId={clienteId !== TUTTE && clienteId !== SENZA ? clienteId : undefined}
        praticaId={praticaId !== TUTTE ? praticaId : undefined}
        onCaricato={() => {
          setCategoria(TUTTE);
          setSotto(TUTTE);
        }}
      />
      <FoglioDocumento documento={documento} onChiudi={() => setAperto(null)} />

      <Foglio visibile={foglio === 'cliente'} onChiudi={chiudi}>
        <Testo tipo="dS">{t('documenti.archivio.sceltaCliente')}</Testo>
        <Scelta
          voci={[
            { valore: TUTTE, titolo: t('documenti.archivio.tuttiClienti') },
            { valore: SENZA, titolo: t('documenti.archivio.senzaCliente') },
            ...clienti.map((c) => ({ valore: c.id, titolo: c.nome })),
          ]}
          valore={clienteId}
          onCambia={(v) => {
            setClienteId(v);
            setPraticaId(TUTTE);
            chiudi();
          }}
          etichettaGruppo={t('documenti.archivio.sceltaCliente')}
        />
      </Foglio>
      <Foglio visibile={foglio === 'pratica'} onChiudi={chiudi}>
        <Testo tipo="dS">{t('documenti.archivio.sceltaPratica')}</Testo>
        <Scelta
          voci={[
            { valore: TUTTE, titolo: t('documenti.archivio.tuttePratiche') },
            ...praticheFiltro.map((p) => ({ valore: p.id, titolo: p.titolo })),
          ]}
          valore={praticaId}
          onCambia={(v) => {
            setPraticaId(v);
            chiudi();
          }}
          etichettaGruppo={t('documenti.archivio.sceltaPratica')}
        />
      </Foglio>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
