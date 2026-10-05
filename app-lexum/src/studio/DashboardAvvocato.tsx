import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { apriSito } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

import { importo, totaliConNote } from './calcoli';
import { CampoData, leggiData, useRiapertura } from './Campi';
import {
  calcolaPeriodo,
  dashboardAvvocato,
  momentoGiorno,
  presetPeriodo,
  urgenzaGiorni,
  type Periodo,
  type PresetPeriodo,
} from './dashboard';
import { dataBreve, dataNumerica, nomeMese, ora } from './formati';
import { nomeTipoCausa } from './pratiche';
import { Contatore, iconaEvento, RigaDashboard, Sezione, stiliDashboard } from './PezziDashboard';

const nomiPreset = {
  'mese-corrente': 'dashboard.periodo.meseCorrente',
  'mese-scorso': 'dashboard.periodo.meseScorso',
  'ultimi-90': 'dashboard.periodo.ultimi90',
  personalizzato: 'dashboard.periodo.personalizzato',
} as const;

// Dashboard dell'avvocato (IT e CH), come la pagina «Dashboard» dei siti: il saluto con il riassunto
// di oggi, i contatori (clienti, pratiche aperte, pratiche chiuse nel periodo), poi l'agenda.
// Il periodo vale solo per le pratiche chiuse e l'incassato; il resto guarda sempre a oggi.
export function DashboardAvvocato() {
  const { paese, utente, conto } = useStato();
  const studio = useStudio();
  const { t, lingua } = useTesti();
  const [periodo, setPeriodo] = useState<Periodo>(() => calcolaPeriodo('mese-corrente'));
  const [foglio, setFoglio] = useState(false);
  const [provaChiusa, setProvaChiusa] = useState(false);
  const d = useMemo(() => dashboardAvvocato(studio, paese, periodo), [studio, paese, periodo]);
  const sito = trovaPaese(paese).sito;

  const etichettaPeriodo = (() => {
    const { preset, inizio, fine } = periodo;
    if (preset === 'mese-corrente' || preset === 'mese-scorso')
      return nomeMese(inizio.getFullYear(), inizio.getMonth(), lingua);
    if (preset === 'ultimi-90') return t('dashboard.periodo.ultimi90');
    return `${dataBreve(inizio.toISOString(), lingua)} – ${dataBreve(fine.toISOString(), lingua)}`;
  })();

  const conta = (n: number, uno: Parameters<typeof t>[0], molti: Parameters<typeof t>[0]) =>
    n === 1 ? t(uno) : t(molti, { n });
  const sommario = (() => {
    const { udienze, termini, appuntamenti } = d.sommario;
    const parti = [
      udienze ? conta(udienze, 'dashboard.sommario.udienzeUno', 'dashboard.sommario.udienze') : '',
      termini ? conta(termini, 'dashboard.sommario.terminiUno', 'dashboard.sommario.termini') : '',
      appuntamenti
        ? conta(appuntamenti, 'dashboard.sommario.appuntamentiUno', 'dashboard.sommario.appuntamenti')
        : '',
    ].filter(Boolean);
    if (parti.length === 0 && d.fattureInAttesa === 0 && d.messaggi.length === 0)
      return t('dashboard.sommario.vuoto');
    return [
      parti.length ? t('dashboard.sommario.oggi', { parti: parti.join(', ') }) : '',
      d.fattureInAttesa
        ? conta(d.fattureInAttesa, 'dashboard.sommario.fattureUno', 'dashboard.sommario.fatture')
        : '',
      d.messaggi.length
        ? conta(d.messaggi.length, 'dashboard.sommario.messaggiUno', 'dashboard.sommario.messaggi')
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  })();

  const badgeGiorni = (iso: string) => {
    const u = urgenzaGiorni(iso);
    const testo =
      u.tipo === 'oggi'
        ? t('dashboard.badge.oggi')
        : t(u.tipo === 'fa' ? 'dashboard.badge.fa' : 'dashboard.badge.fra', { n: u.giorni });
    return { testo, tono: u.tono };
  };
  const apriEvento = (praticaId?: string) =>
    praticaId
      ? router.push({ pathname: '/pratiche/[id]', params: { id: praticaId } })
      : router.push('/calendario');
  const titoloPratica = (id?: string) => studio.pratiche.find((p) => p.id === id)?.titolo;
  const rigaFattura = (f: (typeof d.scadute)[number], scaduta: boolean) => (
    <RigaDashboard
      key={f.id}
      icona="documento"
      coloreIcona={scaduta ? colori.danger : colori.accentText}
      titolo={t('dashboard.fatturazione.fattura', { numero: f.numero })}
      sottotitolo={`${nomeCliente(studio.clienti, f.clienteId)} · ${importo(totaliConNote(f, studio.fatture, paese).residuo, paese)}`}
      badge={f.scadenza ? badgeGiorni(f.scadenza) : undefined}
      onPress={() => router.push({ pathname: '/fatture/[id]', params: { id: f.id } })}
    />
  );

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={stiliDashboard.pagina}>
        <View style={{ gap: 8 }}>
          <Testo tipo="dM">
            {t('dashboard.saluto', { saluto: t(`dashboard.orario.${momentoGiorno()}`), nome: utente.nome })}
          </Testo>
          <Testo tipo="small" colore={colori.fg2}>
            {sommario}
          </Testo>
          <Pressable
            onPress={() => setFoglio(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('dashboard.periodo.titolo')}: ${etichettaPeriodo}`}
            style={({ pressed }) => [stili.periodo, pressed && { borderColor: colori.accentLine }]}
          >
            <Icona nome="calendario" dimensione={15} colore={colori.accentText} />
            <Text style={stili.periodoTesto}>{etichettaPeriodo}</Text>
            <Icona nome="giu" dimensione={14} colore={colori.fg3} />
          </Pressable>
        </View>

        {conto.provaScaduta && !provaChiusa ? (
          <Scheda tono="oro" stile={{ gap: 10 }}>
            <Testo medio oro>
              {t('dashboard.prova.titolo')}
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {t('dashboard.prova.testo')}
            </Testo>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <Pulsante
                titolo={t('dashboard.prova.piani')}
                piccolo
                iconaDopo="esterno"
                ruolo="link"
                onPress={() => apriSito(`${sito}/studio?tab=acquista`)}
              />
              <Pulsante
                titolo={t('dashboard.prova.dopo')}
                piccolo
                variante="linea"
                onPress={() => setProvaChiusa(true)}
              />
            </View>
          </Scheda>
        ) : null}

        <View style={stiliDashboard.griglia}>
          <View style={stiliDashboard.terzo}>
            <Contatore
              valore={d.clienti}
              etichetta={t('dashboard.contatori.clienti')}
              sotto={t('dashboard.contatori.clientiSotto')}
              onPress={() => router.push('/clienti')}
            />
          </View>
          <View style={stiliDashboard.terzo}>
            <Contatore
              valore={d.praticheAperte}
              etichetta={t('dashboard.contatori.aperte')}
              sotto={t('dashboard.contatori.aperteSotto')}
              colore={colori.accentText}
              onPress={() => router.push('/pratiche')}
            />
          </View>
          <View style={stiliDashboard.terzo}>
            <Contatore
              valore={d.praticheChiuse}
              etichetta={t('dashboard.contatori.chiuse')}
              sotto={etichettaPeriodo}
              colore={colori.ok}
              onPress={() => router.push('/pratiche')}
            />
          </View>
        </View>

        <Sezione
          titolo={t('dashboard.oggi.titolo')}
          icona="orologio"
          conta={d.oggi.length}
          link={t('dashboard.vediTutti')}
          onLink={() => router.push('/calendario')}
          vuoto={t('dashboard.oggi.vuoto')}
        >
          {d.oggi.length
            ? d.oggi.map((e) => {
                const i = iconaEvento(e.tipo);
                return (
                  <RigaDashboard
                    key={e.id}
                    icona={i.nome}
                    coloreIcona={i.colore}
                    titolo={e.titolo}
                    sottotitolo={titoloPratica(e.praticaId)}
                    badge={{ testo: ora(e.inizio), tono: 'neutro' }}
                    onPress={() => apriEvento(e.praticaId)}
                  />
                );
              })
            : undefined}
        </Sezione>

        <Sezione
          titolo={t('dashboard.fatturazione.titolo')}
          icona="ricevuta"
          link={t('dashboard.vediTutti')}
          onLink={() => router.push('/fatture')}
        >
          <View style={stili.soldi}>
            <View style={[stili.soldo, { borderColor: colori.okLine, backgroundColor: colori.okSoft }]}>
              <Text style={[stili.soldoEtichetta, { color: colori.ok }]}>
                {t('dashboard.fatturazione.incassato')}
              </Text>
              <Text style={[stili.soldoValore, { color: colori.ok }]} numberOfLines={1} adjustsFontSizeToFit>
                {importo(d.incassato, paese)}
              </Text>
              <Text style={stili.soldoSotto} numberOfLines={1}>
                {etichettaPeriodo}
              </Text>
            </View>
            <View style={stili.soldo}>
              <Text style={stili.soldoEtichetta}>{t('dashboard.fatturazione.daIncassare')}</Text>
              <Text style={stili.soldoValore} numberOfLines={1} adjustsFontSizeToFit>
                {importo(d.daIncassare, paese)}
              </Text>
              <Text style={stili.soldoSotto} numberOfLines={1}>
                {t('dashboard.fatturazione.totaleDebito')}
              </Text>
            </View>
          </View>
          {d.scadute.map((f) => rigaFattura(f, true))}
          {d.inScadenza.map((f) => rigaFattura(f, false))}
          {d.scadute.length === 0 && d.inScadenza.length === 0 ? (
            <Text style={stili.vuoto}>{t('dashboard.fatturazione.vuoto')}</Text>
          ) : null}
        </Sezione>

        <Sezione
          titolo={t('dashboard.settimana.titolo')}
          icona="calendario"
          conta={d.settimana.length}
          link={t('dashboard.vediTutti')}
          onLink={() => router.push('/calendario')}
          vuoto={t('dashboard.settimana.vuoto')}
        >
          {d.settimana.length
            ? d.settimana.map((e) => {
                const i = iconaEvento(e.tipo);
                return (
                  <RigaDashboard
                    key={e.id}
                    icona={i.nome}
                    coloreIcona={i.colore}
                    titolo={e.titolo}
                    sottotitolo={titoloPratica(e.praticaId)}
                    badge={badgeGiorni(e.inizio)}
                    onPress={() => apriEvento(e.praticaId)}
                  />
                );
              })
            : undefined}
        </Sezione>

        <Sezione
          titolo={t('dashboard.messaggi.titolo')}
          icona="fumetto"
          conta={d.messaggi.length}
          vuoto={t('dashboard.messaggi.vuoto')}
        >
          {d.messaggi.length
            ? d.messaggi.map((tk) => (
                <RigaDashboard
                  key={tk.id}
                  icona="email"
                  coloreIcona={colori.ok}
                  titolo={tk.oggetto || t('dashboard.messaggi.senzaOggetto')}
                  sottotitolo={nomeCliente(studio.clienti, tk.clienteId)}
                  badge={{
                    testo: dataBreve(tk.messaggi[tk.messaggi.length - 1].quando, lingua),
                    tono: 'neutro',
                  }}
                  onPress={() => router.push({ pathname: '/comunicazioni/[id]', params: { id: tk.id } })}
                />
              ))
            : undefined}
        </Sezione>

        <Sezione
          titolo={t('dashboard.attenzione.titolo')}
          icona="bilancia"
          conta={d.attenzione.length}
          link={t('dashboard.vediTutti')}
          onLink={() => router.push('/pratiche')}
          vuoto={t('dashboard.attenzione.vuoto')}
        >
          {d.attenzione.length
            ? d.attenzione.map(({ pratica, udienza }) => (
                <RigaDashboard
                  key={pratica.id}
                  icona="cartella"
                  titolo={pratica.titolo}
                  sottotitolo={[
                    nomeCliente(studio.clienti, pratica.clienteId),
                    nomeTipoCausa(pratica.tipo, lingua),
                    t('dashboard.attenzione.udienza', { data: dataBreve(udienza.dataOra, lingua) }),
                  ].join(' · ')}
                  badge={badgeGiorni(udienza.dataOra)}
                  onPress={() => router.push({ pathname: '/pratiche/[id]', params: { id: pratica.id } })}
                />
              ))
            : undefined}
        </Sezione>
      </ScrollView>
      <FoglioPeriodo
        visibile={foglio}
        periodo={periodo}
        onChiudi={() => setFoglio(false)}
        onScegli={(p) => {
          setPeriodo(p);
          setFoglio(false);
        }}
      />
    </>
  );
}

// Scelta del periodo, come il selettore in alto a destra del sito.
function FoglioPeriodo({
  visibile,
  periodo,
  onChiudi,
  onScegli,
}: {
  visibile: boolean;
  periodo: Periodo;
  onChiudi: () => void;
  onScegli: (p: Periodo) => void;
}) {
  const { t } = useTesti();
  const [preset, setPreset] = useState<PresetPeriodo>(periodo.preset);
  const [da, setDa] = useState('');
  const [a, setA] = useState('');
  useRiapertura(visibile, () => {
    setPreset(periodo.preset);
    setDa(dataNumerica(periodo.inizio.toISOString()));
    setA(dataNumerica(periodo.fine.toISOString()));
  });
  const dataDa = leggiData(da);
  const dataA = leggiData(a);
  const ordineSbagliato = !!dataDa && !!dataA && dataDa.getTime() > dataA.getTime();

  const scegli = (p: PresetPeriodo) => {
    setPreset(p);
    if (p !== 'personalizzato') onScegli(calcolaPeriodo(p));
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">{t('dashboard.periodo.titolo')}</Testo>
      <Testo tipo="small" colore={colori.fg2}>
        {t('dashboard.periodo.testo')}
      </Testo>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('dashboard.periodo.titolo')}>
        {presetPeriodo.map((p) => (
          <Riga
            key={p}
            stretta
            ruolo="radio"
            selezionata={preset === p}
            titolo={t(nomiPreset[p])}
            destra={
              preset === p ? <Icona nome="spunta" dimensione={18} colore={colori.accentText} /> : undefined
            }
            onPress={() => scegli(p)}
          />
        ))}
      </View>
      {preset === 'personalizzato' ? (
        <View style={{ gap: 12 }}>
          <CampoData etichetta={t('dashboard.periodo.da')} valore={da} onCambia={setDa} />
          <CampoData etichetta={t('dashboard.periodo.a')} valore={a} onCambia={setA} />
          {ordineSbagliato ? (
            <Testo tipo="small" colore={colori.danger}>
              {t('dashboard.periodo.ordine')}
            </Testo>
          ) : null}
          <Pulsante
            titolo={t('dashboard.periodo.applica')}
            disabilitato={!dataDa || !dataA || ordineSbagliato}
            onPress={() => dataDa && dataA && onScegli(calcolaPeriodo('personalizzato', dataDa, dataA))}
          />
        </View>
      ) : null}
    </Foglio>
  );
}

const stili = StyleSheet.create({
  periodo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
    marginTop: 4,
  },
  periodoTesto: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg },
  soldi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  soldo: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderColor: colori.line,
    backgroundColor: colori.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  soldoEtichetta: {
    fontFamily: famiglie.testo,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colori.fg3,
  },
  soldoValore: { fontFamily: famiglie.testoMedio, fontSize: 18, color: colori.fg },
  soldoSotto: { fontFamily: famiglie.testo, fontSize: 12, color: colori.fg3 },
  vuoto: {
    fontFamily: famiglie.testo,
    fontStyle: 'italic',
    fontSize: 13,
    color: colori.fg3,
    textAlign: 'center',
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
});
