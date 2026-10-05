import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Avviso, Badge, Barra, Separatore, Tag } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { FoglioLexClienti } from '@/fogli/FogliClienti';
import { useTesti } from '@/lingue/useTesti';
import { statoLimite } from '@/studio/clienti';
import { Monogramma } from '@/studio/Monogramma';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

type Filtro = 'tutti' | 'persone' | 'societa';

// S10 · Clienti dello studio, come la pagina «Clienti» del sito: ricerca per nome o email, «Chiedi a Lex»,
// filtro persone fisiche / giuridiche, posti clienti del piano. Toccando un cliente si apre la sua scheda.
export default function Clienti() {
  const { clienti, pratiche, limiteClienti } = useStudio();
  const { t } = useTesti();
  const [testo, setTesto] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [lex, setLex] = useState(false);

  const q = testo.trim().toLowerCase();
  const delTipo = (f: Filtro) =>
    clienti.filter((c) => f === 'tutti' || (f === 'societa' ? !!c.giuridica : !c.giuridica));
  const visibili = delTipo(filtro)
    .filter((c) => !q || c.nome.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const limite = statoLimite(clienti.length, limiteClienti);
  const nuovo = () => router.push('/clienti/nuovo');

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('clienti.elenco.titolo')}
        destra={<PulsanteIcona icona="piu" etichetta={t('clienti.elenco.nuovo')} onPress={nuovo} />}
      />
      <View style={stili.testa}>
        <CampoCerca
          etichetta={t('clienti.elenco.cerca')}
          placeholder={t('clienti.elenco.cercaSegnaposto')}
          alto={46}
          value={testo}
          onChangeText={setTesto}
          onCancella={() => setTesto('')}
        />
        <Riga
          stretta
          senzaBordo
          stile={stili.lex}
          sinistra={<Icona nome="stella" dimensione={18} colore={colori.accentText} />}
          titolo={t('clienti.elenco.chiediLex')}
          sottotitolo={t('clienti.elenco.chiediLexTesto')}
          freccia="avanti"
          onPress={() => setLex(true)}
        />
        <View style={stili.filtri}>
          {(['tutti', 'persone', 'societa'] as Filtro[]).map((f) => (
            <Tag
              key={f}
              titolo={t(`clienti.elenco.${f}`, { n: delTipo(f).length })}
              attivo={filtro === f}
              onPress={() => setFiltro(f)}
            />
          ))}
        </View>
        {limiteClienti ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Testo tipo="cap">
                {t('clienti.elenco.limite', { n: clienti.length, totale: limiteClienti })}
              </Testo>
            </View>
            <Barra percento={(clienti.length / limiteClienti) * 100} />
            {limite === 'pieno' ? <Avviso testo={t('clienti.elenco.limitePieno')} /> : null}
            {limite === 'avviso' || limite === 'critico' ? (
              <Avviso
                tono="info"
                testo={t('clienti.elenco.limiteAvviso', { n: limiteClienti - clienti.length })}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      <Separatore />
      <ScrollView style={{ flex: 1 }}>
        {visibili.map((c) => {
          const aperte = pratiche.filter((p) => p.clienteId === c.id && p.stato === 'aperta').length;
          const testoPratiche =
            aperte === 0
              ? t('clienti.elenco.nessunaPratica')
              : aperte === 1
                ? t('clienti.elenco.unaPratica')
                : t('clienti.elenco.pratiche', { n: aperte });
          return (
            <Riga
              key={c.id}
              inAlto
              sinistra={<Monogramma nome={c.nome} giuridica={c.giuridica} />}
              titolo={c.nome}
              sottotitolo={[c.email, testoPratiche].filter(Boolean).join(' · ')}
              sotto={
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Badge>{c.giuridica ? t('clienti.tipo.giuridica') : t('clienti.tipo.fisica')}</Badge>
                  {c.portale ? <Badge tono="ok">{t('clienti.elenco.portale')}</Badge> : null}
                </View>
              }
              freccia="avanti"
              onPress={() => router.push({ pathname: '/clienti/[id]', params: { id: c.id } })}
            />
          );
        })}
        {visibili.length === 0 ? (
          <StatoVuoto
            icona={q ? 'cerca' : 'persone'}
            titolo={q ? t('clienti.elenco.vuotoCercaTitolo') : t('clienti.elenco.vuotoTitolo')}
            testo={q ? t('clienti.elenco.vuotoCercaTesto') : t('clienti.elenco.vuotoTesto')}
            azione={q ? undefined : { titolo: t('clienti.elenco.nuovo'), onPress: nuovo }}
          />
        ) : null}
      </ScrollView>
      <FoglioLexClienti visibile={lex} onChiudi={() => setLex(false)} />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  filtri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lex: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    backgroundColor: colori.bg2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colori.line,
  },
});
