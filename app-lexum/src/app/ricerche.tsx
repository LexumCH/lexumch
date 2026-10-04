import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Badge, BarraAzioni, Separatore, Tag } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Caricamento, StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { trovaNorma } from '@/dati-finti/banca-dati';
import type { Elemento } from '@/dati-finti/ricerche';
import { MAX_CONFRONTO } from '@/dati-finti/confronto';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { FoglioAppunti } from '@/fogli/FoglioAppunti';
import { FoglioGestioneEtichette } from '@/fogli/FoglioGestioneEtichette';
import { FoglioNuovaEtichetta } from '@/fogli/FoglioNuovaEtichetta';
import { FoglioNuovaRicerca } from '@/fogli/FoglioNuovaRicerca';
import { useTesti } from '@/lingue/useTesti';
import { useVaiASezione } from '@/navigazione';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const tonoBadge = { 'Chat con Lex': 'oro', Norma: 'neutro', Sentenza: 'ok', Appunti: 'neutro' } as const;

// D1 · Ricerche: quello che hai chiesto a Lex e salvato, diviso per etichette (come sul sito).
export default function Ricerche() {
  const { etichetteAttive, elementiAttivi, simula, telefono } = useStato();
  const { t } = useTesti();
  // Senza rete Ricerche si legge solo se l'utente l'ha scelto nel Profilo («Ricerche anche senza rete»).
  const offline = useOffline();
  const chiusaOffline = offline && !telefono.ricercheOffline;
  const attesa = simula.caricamento || chiusaOffline;
  const vai = useVaiASezione();
  // L'etichetta scelta e il foglio aperto stanno nell'indirizzo (?etichetta=casa&foglio=etichetta):
  // così li apre anche il menù o l'elenco delle schermate.
  const { etichetta: scelta, foglio } = useLocalSearchParams<{
    etichetta?: string;
    foglio?: 'etichetta' | 'ricerca' | 'gestisci';
  }>();
  const setScelta = (id: string) => router.setParams({ etichetta: id });
  const [testo, setTesto] = useState('');
  const [norma, setNorma] = useState<string | null>(null);
  const [appunti, setAppunti] = useState<Elemento | null>(null);
  // Confronto, come sul sito: si scelgono da 2 a 3 elementi (null = non si sta scegliendo).
  const [selezione, setSelezione] = useState<string[] | null>(null);

  const etichetta = etichetteAttive.find((e) => e.id === scelta) ?? etichetteAttive[0];
  const q = testo.trim().toLowerCase();
  const elementi = elementiAttivi.filter(
    (e) =>
      e.etichetta === etichetta?.id &&
      (!q || e.titolo.toLowerCase().includes(q) || e.estratto.toLowerCase().includes(q)),
  );
  const totale = elementiAttivi.filter((e) => e.etichetta === etichetta?.id).length;

  // «+»: nuova ricerca scritta a mano, come sul sito. Per chiedere a Lex c'è il pulsante in basso.
  const nuovaRicerca = () => router.setParams({ foglio: 'ricerca' });

  const apri = (e: Elemento) => {
    if (selezione) {
      seleziona(e.id);
      return;
    }
    if (e.tipo === 'Chat con Lex') router.push({ pathname: '/chat-salvata/[id]', params: { id: e.id } });
    else if (e.tipo === 'Appunti') setAppunti(e);
    else if (e.norma) setNorma(e.norma);
    else if (e.documento)
      router.push({ pathname: '/banca-dati/documento/[id]', params: { id: e.documento } });
  };

  const seleziona = (id: string) =>
    setSelezione((prima) => {
      if (!prima) return prima;
      if (prima.includes(id)) return prima.filter((x) => x !== id);
      return prima.length < MAX_CONFRONTO ? [...prima, id] : prima;
    });

  const confronta = () => {
    if (!selezione || selezione.length < 2) return;
    router.push({ pathname: '/confronto', params: { ids: selezione.join(',') } });
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('ricerche.titolo')}
        destra={<PulsanteIcona icona="piu" etichetta={t('ricerche.nuova')} onPress={nuovaRicerca} />}
      />
      <View style={stili.testa}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('ricerche.intro')}
        </Testo>
        {offline && telefono.ricercheOffline ? (
          <Testo tipo="cap" colore={colori.ok}>
            {t('ricerche.copiaOffline')}
          </Testo>
        ) : null}
        <CampoCerca
          etichetta={t('ricerche.cerca')}
          placeholder={t('ricerche.cercaSegnaposto')}
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
              colore={e.colore}
              attivo={e.id === etichetta?.id}
              onPress={() => setScelta(e.id)}
              onLongPress={() => router.setParams({ foglio: 'gestisci' })}
            />
          ))}
          <Tag
            titolo={t('ricerche.etichetta')}
            etichetta={t('ricerche.nuovaEtichetta')}
            aggiungi
            onPress={() => router.setParams({ foglio: 'etichetta' })}
          />
        </ScrollView>
        {selezione ? (
          <Testo tipo="cap" colore={colori.accentText}>
            {t('ricerche.sceltaConfronto', { max: MAX_CONFRONTO, n: selezione.length })}
          </Testo>
        ) : etichetta ? (
          <View style={stili.didascalia}>
            <Testo tipo="cap" style={{ flex: 1 }}>
              {t('ricerche.didascalia', {
                nome: etichetta.nome,
                elementi:
                  totale === 1 ? t('ricerche.elementiUno') : t('ricerche.elementiMolti', { n: totale }),
              })}
            </Testo>
            <Pressable
              onPress={() => router.setParams({ foglio: 'gestisci' })}
              accessibilityRole="button"
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            >
              <Testo tipo="cap" colore={colori.accentText}>
                {t('ricerche.gestisci')}
              </Testo>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {simula.caricamento ? <Caricamento /> : null}
        {!simula.caricamento && chiusaOffline ? (
          <StatoVuoto
            icona="offline"
            titolo={t('ricerche.offlineTitolo')}
            testo={t('ricerche.offlineTesto')}
            azione={{ titolo: t('ricerche.vaiProfilo'), onPress: () => vai('/profilo') }}
          />
        ) : null}
        {!attesa && etichetteAttive.length === 0 ? (
          <StatoVuoto
            icona="segnalibro"
            titolo={t('ricerche.vuotoTitolo')}
            testo={t('ricerche.vuotoTesto')}
            azione={{ titolo: t('ricerche.chiedi'), onPress: () => vai('/chat') }}
          />
        ) : null}
        {(attesa ? [] : elementi).map((e) => {
          const scelto = !!selezione?.includes(e.id);
          const pieno = !!selezione && !scelto && selezione.length >= MAX_CONFRONTO;
          const testi = (
            <>
              <View style={stili.tipo}>
                <Badge tono={tonoBadge[e.tipo]}>{t(`ricerche.tipi.${e.tipo}`)}</Badge>
                <Testo tipo="mini">{e.quando}</Testo>
              </View>
              <Text style={stili.ttl}>{e.titolo}</Text>
              <Text style={stili.estratto} numberOfLines={2}>
                {e.estratto}
              </Text>
            </>
          );
          const contenuto = selezione ? (
            <View style={stili.conCasella}>
              <View style={[stili.casella, scelto && stili.casellaPiena]}>
                {scelto ? <Icona nome="spunta" dimensione={16} colore={colori.petrolio} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>{testi}</View>
            </View>
          ) : (
            testi
          );
          return (
            <Pressable
              key={e.id}
              onPress={() => apri(e)}
              disabled={pieno}
              accessibilityRole={selezione ? 'checkbox' : 'button'}
              aria-checked={selezione ? scelto : undefined}
              aria-disabled={selezione ? pieno : undefined}
              style={({ pressed }) => [
                stili.elemento,
                scelto && { backgroundColor: colori.accentSoft },
                pieno && { opacity: 0.45 },
                pressed && { backgroundColor: colori.bg2 },
              ]}
            >
              {contenuto}
            </Pressable>
          );
        })}
        {!attesa && etichetta && elementi.length === 0 ? (
          <StatoVuoto
            icona={q ? 'cerca' : 'etichetta'}
            titolo={q ? t('ricerche.nessunRisultatoTitolo') : t('ricerche.etichettaVuotaTitolo')}
            testo={q ? t('ricerche.nessunRisultatoTesto') : t('ricerche.etichettaVuotaTesto')}
          />
        ) : null}
      </ScrollView>

      {selezione ? (
        <BarraAzioni>
          <Pulsante
            titolo={t('comune.annulla')}
            variante="linea"
            stile={{ alignSelf: 'auto', paddingHorizontal: 16 }}
            onPress={() => setSelezione(null)}
          />
          <Pulsante
            titolo={t('ricerche.confrontaAffiancati')}
            icona="confronta"
            stile={{ flex: 1 }}
            disabilitato={selezione.length < 2}
            onPress={confronta}
          />
        </BarraAzioni>
      ) : (
        <BarraAzioni>
          <Pulsante
            titolo={etichetta ? t('ricerche.chiediSu', { nome: etichetta.nome }) : t('ricerche.chiedi')}
            icona="stella"
            righe={2}
            stile={{ flex: 1 }}
            onPress={() => vai('/chat')}
          />
          <Pulsante
            titolo={t('ricerche.confronta')}
            etichetta={t('ricerche.confrontaDueOTre')}
            icona="confronta"
            variante="linea"
            stile={{ alignSelf: 'auto', paddingHorizontal: 14 }}
            disabilitato={elementiAttivi.length < 2}
            onPress={() => setSelezione([])}
          />
        </BarraAzioni>
      )}

      <FoglioNuovaRicerca
        visibile={foglio === 'ricerca'}
        etichettaIniziale={etichetta?.id}
        onChiudi={() => router.setParams({ foglio: undefined })}
        onCreata={(id) => {
          setTesto('');
          router.setParams({ foglio: undefined, etichetta: id });
        }}
      />
      <FoglioGestioneEtichette
        visibile={foglio === 'gestisci'}
        onChiudi={() => router.setParams({ foglio: undefined })}
      />
      <FoglioAppunti
        elemento={appunti}
        etichetta={etichetteAttive.find((x) => x.id === appunti?.etichetta)}
        onChiudi={() => setAppunti(null)}
      />
      <FoglioNuovaEtichetta
        visibile={foglio === 'etichetta'}
        onChiudi={() => router.setParams({ foglio: undefined })}
        onCreata={(id) => router.setParams({ foglio: undefined, etichetta: id })}
      />
      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        eyebrow={t('ricerche.normaSalvata')}
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
  didascalia: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  conCasella: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  casella: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderWidth: 1.5,
    borderColor: colori.fg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casellaPiena: { borderColor: colori.accent, backgroundColor: colori.accent },
  ttl: { fontFamily: famiglie.testoMedio, fontSize: 16, lineHeight: 22, color: colori.fg },
  estratto: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 21, color: colori.fg2 },
});
