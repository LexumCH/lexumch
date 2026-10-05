import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Separatore, Tag } from '@/componenti/Elementi';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { Appuntamento } from '@/dati-finti/studio';
import { FoglioEvento, FoglioNuovoEvento } from '@/fogli/FogliCalendario';
import { useTesti } from '@/lingue/useTesti';
import { strumentiStudio } from '@/ruoli';
import {
  giorniDaOggi,
  inizialiIn,
  inizioGiorno,
  nomeMese,
  ora,
  stessoGiorno,
  titoloGiorno,
} from '@/studio/formati';
import { nomeTipoEvento, tipiEvento } from '@/studio/pratiche';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type Vista = 'agenda' | 'mese';

const GIORNI_AGENDA = 60;

// S4 · Calendario dello studio (avvocati, commercialisti, fiduciari: è lo stesso del sito, tabella
// `appuntamenti`). Sul sito c'è solo il mese; qui la vista predefinita è l'agenda, giorno per giorno.
export default function Calendario() {
  const { paese, ruoli } = useStato();
  const { appuntamenti, clienti, pratiche } = useStudio();
  const { t, lingua } = useTesti();
  const parametri = useLocalSearchParams<{ vista?: Vista }>();
  const vista: Vista = parametri.vista ?? 'agenda';
  const avvocato = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');

  const [mese, setMese] = useState(() => {
    const d = new Date();
    return { anno: d.getFullYear(), mese: d.getMonth() };
  });
  const [scelto, setScelto] = useState(() => inizioGiorno(new Date()).toISOString());
  const [passati, setPassati] = useState(false);
  const [aperto, setAperto] = useState<Appuntamento | null>(null);
  const [modulo, setModulo] = useState<{ evento: Appuntamento | null } | null>(null);

  const ordinati = [...appuntamenti].sort((a, b) => a.inizio.localeCompare(b.inizio));
  const delGiorno = (iso: string) => ordinati.filter((a) => stessoGiorno(a.inizio, iso));

  const sottotitolo = (a: Appuntamento) =>
    [
      a.clienteId ? nomeCliente(clienti, a.clienteId) : null,
      pratiche.find((p) => p.id === a.praticaId)?.titolo,
    ]
      .filter(Boolean)
      .join(' · ');

  // Agenda: oggi (anche se vuoto) e i giorni con eventi, fino a due mesi; a richiesta anche i passati.
  const giorniAgenda: string[] = [];
  const dal = passati ? -14 : 0;
  for (let i = dal; i <= GIORNI_AGENDA; i++) {
    const d = inizioGiorno(new Date());
    d.setDate(d.getDate() + i);
    const iso = d.toISOString();
    if (i === 0 || delGiorno(iso).length > 0) giorniAgenda.push(iso);
  }

  const contaProssimi = ordinati.filter(
    (a) => a.stato === 'programmato' && giorniDaOggi(a.inizio) >= 0 && giorniDaOggi(a.inizio) <= 7,
  ).length;

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        titolo={t('studio.calendario.titolo')}
        destra={
          <PulsanteIcona
            icona="piu"
            etichetta={t('studio.calendario.nuovo')}
            onPress={() => setModulo({ evento: null })}
          />
        }
      />
      <View style={stili.testa}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tag
            titolo={t('studio.calendario.agenda')}
            attivo={vista === 'agenda'}
            onPress={() => router.setParams({ vista: 'agenda' })}
          />
          <Tag
            titolo={t('studio.calendario.mese')}
            attivo={vista === 'mese'}
            onPress={() => router.setParams({ vista: 'mese' })}
          />
        </View>
        <Testo tipo="cap">
          {contaProssimi === 1
            ? t('studio.calendario.prossimiUno')
            : t('studio.calendario.prossimiMolti', { n: contaProssimi })}
        </Testo>
      </View>
      <Separatore />

      {vista === 'agenda' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {!passati ? (
            <Pressable onPress={() => setPassati(true)} accessibilityRole="button" style={stili.passati}>
              <Testo tipo="cap" colore={colori.accentText}>
                {t('studio.calendario.passati')}
              </Testo>
            </Pressable>
          ) : null}
          {giorniAgenda.map((g) => {
            const eventi = delGiorno(g);
            return (
              <View key={g}>
                <View style={stili.giorno}>
                  <Text style={[stili.giornoTesto, giorniDaOggi(g) === 0 && { color: colori.accentText }]}>
                    {titoloGiorno(g, lingua)}
                  </Text>
                </View>
                {eventi.length === 0 ? (
                  <Testo
                    tipo="small"
                    colore={colori.fg3}
                    style={{ paddingHorizontal: 20, paddingVertical: 12 }}
                  >
                    {t('studio.calendario.niente')}
                  </Testo>
                ) : null}
                {eventi.map((a) => (
                  <RigaEvento
                    key={a.id}
                    evento={a}
                    sottotitolo={sottotitolo(a)}
                    onPress={() => setAperto(a)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Mese
            anno={mese.anno}
            mese={mese.mese}
            scelto={scelto}
            eventi={ordinati}
            onScegli={setScelto}
            onCambiaMese={(delta) =>
              setMese((m) => {
                const d = new Date(m.anno, m.mese + delta, 1);
                return { anno: d.getFullYear(), mese: d.getMonth() };
              })
            }
            onOggi={() => {
              const d = new Date();
              setMese({ anno: d.getFullYear(), mese: d.getMonth() });
              setScelto(inizioGiorno(d).toISOString());
            }}
          />
          <View style={stili.giorno}>
            <Text style={stili.giornoTesto}>{titoloGiorno(scelto, lingua)}</Text>
          </View>
          {delGiorno(scelto).length === 0 ? (
            <Testo tipo="small" colore={colori.fg3} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              {t('studio.calendario.niente')}
            </Testo>
          ) : null}
          {delGiorno(scelto).map((a) => (
            <RigaEvento key={a.id} evento={a} sottotitolo={sottotitolo(a)} onPress={() => setAperto(a)} />
          ))}
        </ScrollView>
      )}

      <FoglioEvento
        evento={aperto}
        onChiudi={() => setAperto(null)}
        onModifica={(e) => {
          setAperto(null);
          setModulo({ evento: e });
        }}
      />
      <FoglioNuovoEvento
        visibile={!!modulo}
        evento={modulo?.evento}
        onChiudi={() => setModulo(null)}
        giornoIniziale={vista === 'mese' ? scelto : inizioGiorno(new Date()).toISOString()}
        paese={paese}
        conUdienze={avvocato}
      />
    </Schermata>
  );
}

function RigaEvento({
  evento: a,
  sottotitolo,
  onPress,
}: {
  evento: Appuntamento;
  sottotitolo: string;
  onPress: () => void;
}) {
  const { t, lingua } = useTesti();
  const tipo = { ...tipiEvento[a.tipo], nome: nomeTipoEvento(a.tipo, lingua) };
  const spento = a.stato !== 'programmato';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('studio.calendario.evento', {
        ora: ora(a.inizio),
        tipo: tipo.nome,
        titolo: a.titolo,
      })}
      style={({ pressed }) => [stili.evento, pressed && { backgroundColor: colori.bg2 }]}
    >
      <View style={stili.ora}>
        <Text style={[stili.oraTesto, spento && { color: colori.fg3 }]}>{ora(a.inizio)}</Text>
        <Text style={stili.oraFine}>{ora(a.fine)}</Text>
      </View>
      <View style={[stili.barra, { backgroundColor: tipo.colore }, spento && { opacity: 0.4 }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={[
            stili.titolo,
            spento && {
              color: colori.fg3,
              textDecorationLine: a.stato === 'annullato' ? 'line-through' : 'none',
            },
          ]}
        >
          {a.titolo}
        </Text>
        <Testo tipo="mini" numberOfLines={2}>
          {[tipo.nome, sottotitolo].filter(Boolean).join(' · ')}
        </Testo>
        {a.stato !== 'programmato' ? (
          <View style={{ flexDirection: 'row' }}>
            <Badge tono={a.stato === 'concluso' ? 'ok' : 'pericolo'}>
              {a.stato === 'concluso' ? t('studio.statiEvento.concluso') : t('studio.statiEvento.annullato')}
            </Badge>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Mese({
  anno,
  mese,
  scelto,
  eventi,
  onScegli,
  onCambiaMese,
  onOggi,
}: {
  anno: number;
  mese: number;
  scelto: string;
  eventi: Appuntamento[];
  onScegli: (iso: string) => void;
  onCambiaMese: (delta: number) => void;
  onOggi: () => void;
}) {
  const { t, lingua } = useTesti();
  const primo = new Date(anno, mese, 1);
  const spostamento = (primo.getDay() + 6) % 7; // la settimana parte dal lunedì
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const celle: (Date | null)[] = [];
  for (let i = 0; i < spostamento; i++) celle.push(null);
  for (let g = 1; g <= giorniNelMese; g++) celle.push(new Date(anno, mese, g));
  while (celle.length % 7 !== 0) celle.push(null);
  const settimane: (Date | null)[][] = [];
  for (let i = 0; i < celle.length; i += 7) settimane.push(celle.slice(i, i + 7));

  return (
    <View style={stili.mese}>
      <View style={stili.meseTesta}>
        <PulsanteIcona
          icona="indietro"
          etichetta={t('studio.calendario.mesePrecedente')}
          onPress={() => onCambiaMese(-1)}
        />
        <Text style={stili.meseNome}>{nomeMese(anno, mese, lingua)}</Text>
        <PulsanteIcona
          icona="avanti"
          etichetta={t('studio.calendario.meseSuccessivo')}
          onPress={() => onCambiaMese(1)}
        />
        <Pressable onPress={onOggi} accessibilityRole="button" style={stili.oggi}>
          <Testo tipo="cap" colore={colori.accentText}>
            {t('studio.calendario.oggi')}
          </Testo>
        </Pressable>
      </View>
      <View style={stili.settimana}>
        {inizialiIn(lingua).map((g, i) => (
          <Text key={`${g}${i}`} style={stili.iniziale}>
            {g}
          </Text>
        ))}
      </View>
      {settimane.map((s, i) => (
        <View key={i} style={stili.settimana}>
          {s.map((d, j) => {
            if (!d) return <View key={j} style={stili.cella} />;
            const iso = d.toISOString();
            const delGiorno = eventi.filter((e) => stessoGiorno(e.inizio, d) && e.stato !== 'annullato');
            const on = stessoGiorno(d, scelto);
            const oggi = giorniDaOggi(iso) === 0;
            return (
              <Pressable
                key={j}
                onPress={() => onScegli(inizioGiorno(d).toISOString())}
                accessibilityRole="button"
                accessibilityLabel={t('studio.calendario.giornoEventi', {
                  giorno: d.getDate(),
                  n: delGiorno.length,
                })}
                aria-selected={on}
                style={[stili.cella, on && stili.cellaOn]}
              >
                <Text
                  style={[stili.numero, oggi && { color: colori.accentText }, on && { color: colori.fg }]}
                >
                  {d.getDate()}
                </Text>
                <View style={stili.puntini}>
                  {delGiorno.slice(0, 3).map((e) => (
                    <View
                      key={e.id}
                      style={[stili.puntino, { backgroundColor: tipiEvento[e.tipo].colore }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 10, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 12 },
  passati: { paddingHorizontal: 20, paddingVertical: 12 },
  giorno: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: colori.bg,
  },
  giornoTesto: {
    fontFamily: famiglie.testoMedio,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colori.fg2,
  },
  evento: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  ora: { width: 44, gap: 2, paddingTop: 1 },
  oraTesto: { fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.fg },
  oraFine: { fontFamily: famiglie.testo, fontSize: 12, color: colori.fg3 },
  barra: { width: 3 },
  titolo: { fontFamily: famiglie.testoMedio, fontSize: 15, lineHeight: 20, color: colori.fg },
  mese: { paddingHorizontal: 12, paddingTop: 6 },
  meseTesta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 6 },
  meseNome: { flex: 1, textAlign: 'center', fontFamily: famiglie.titoloSemi, fontSize: 20, color: colori.fg },
  oggi: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  settimana: { flexDirection: 'row' },
  iniziale: {
    flex: 1,
    textAlign: 'center',
    fontFamily: famiglie.testo,
    fontSize: 12,
    color: colori.fg3,
    paddingVertical: 6,
  },
  cella: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 4 },
  cellaOn: { borderWidth: 1, borderColor: colori.accent, backgroundColor: colori.accentSoft },
  numero: { fontFamily: famiglie.testo, fontSize: 15, color: colori.fg2 },
  puntini: { flexDirection: 'row', gap: 3, height: 5 },
  puntino: { width: 5, height: 5 },
});
