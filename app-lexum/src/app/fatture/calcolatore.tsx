import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { BarraAzioni, Interruttore, Segmentato, Tag, TitoloSezione } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { importo } from '@/studio/calcoli';
import { leggiImporto } from '@/studio/fatturazione';
import {
  AUMENTI,
  DISCLAIMER,
  GRUPPI_COMPETENZE,
  INDETERMINABILE,
  RIDUZIONI,
  SCAGLIONI,
  VERSIONE_DEFAULT,
  getCompetenza,
  getFasi,
  pctAumentoParti,
  type Variazione,
} from '@/studio/parametri-forensi/catalogo';
import {
  calcolaParcella,
  fasiDisponibili,
  fattoreLivello,
  scaglioneDaValore,
  valoreMedioFase,
  type Livello,
} from '@/studio/parametri-forensi/engine';
import { hasDati, metaTabella } from '@/studio/parametri-forensi/tabelle';
import { useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type StatoVariazione = { attivo: boolean; pct: string; parti: string };

const versione = VERSIONE_DEFAULT;
// Solo le competenze con le tabelle caricate, come sul sito.
const gruppi = GRUPPI_COMPETENZE.map((g) => ({
  ...g,
  voci: g.voci.filter((v) => hasDati(v.key, versione)),
})).filter((g) => g.voci.length > 0);
const livelli: { valore: Livello; titolo: string }[] = [
  { valore: 'min', titolo: 'Minimo' },
  { valore: 'medio', titolo: 'Medio' },
  { valore: 'max', titolo: 'Massimo' },
];

// S8 · Calcola parcella (solo Italia, solo avvocati): parametri forensi del DM 55/2014,
// tabelle 2022. Stesso motore del sito (src/studio/parametri-forensi/). Produce le righe della fattura:
// una per fase, poi aumenti, riduzioni e spese generali 15%. CPA, IVA e ritenuta le aggiunge la fattura.
// ?per=fattura: aperto dalla nuova fattura, le righe tornano lì.
export default function Calcolatore() {
  const { per } = useLocalSearchParams<{ per?: string }>();
  const { azioni } = useStudio();
  const [competenzaKey, setCompetenzaKey] = useState(gruppi[0]?.voci[0]?.key ?? '');
  const [scaglioneId, setScaglioneId] = useState('da_5201_26000');
  const [valore, setValore] = useState('');
  const [indeterminabile, setIndeterminabile] = useState<string | null>(null);
  const [fasi, setFasi] = useState<Record<string, { incluso?: boolean; livello?: Livello }>>({});
  const [aumenti, setAumenti] = useState<Record<string, StatoVariazione>>({});
  const [riduzioni, setRiduzioni] = useState<Record<string, StatoVariazione>>({});
  const [speseGenerali, setSpeseGenerali] = useState(true);
  const [ritenuta, setRitenuta] = useState(false);
  const [foglio, setFoglio] = useState<'competenze' | 'scaglioni' | null>(null);

  const competenza = getCompetenza(competenzaKey);
  const penale = competenza?.tipo === 'penale';
  const scaglione = SCAGLIONI.find((s) => s.id === scaglioneId);
  const meta = metaTabella(competenzaKey, versione);
  const fasiCompetenza = getFasi(competenzaKey);
  const disponibili = fasiDisponibili(competenzaKey, versione, penale ? null : scaglioneId);
  // Le fasi incluse sono quelle disponibili, salvo quelle tolte a mano.
  const fasiInput = Object.fromEntries(
    fasiCompetenza.map((f) => [
      f.id,
      {
        incluso: disponibili.includes(f.id) && (fasi[f.id]?.incluso ?? true),
        livello: fasi[f.id]?.livello ?? 'medio',
      },
    ]),
  );

  const risolvi = (elenco: Variazione[], stato: Record<string, StatoVariazione>) =>
    elenco
      .filter((v) => stato[v.id]?.attivo)
      .map((v) => {
        const s = stato[v.id];
        const pct =
          v.tipo === 'parti'
            ? pctAumentoParti(Number(s.parti) || 2)
            : Math.min(v.pct ?? 0, Math.max(0, leggiImporto(s.pct, 'IT') ?? 0));
        return { id: v.id, label: v.label, pct };
      });

  const risultato = calcolaParcella({
    versione,
    competenzaKey,
    scaglioneId: penale ? null : scaglioneId,
    fasi: fasiInput,
    aumenti: risolvi(AUMENTI, aumenti),
    riduzioni: risolvi(RIDUZIONI, riduzioni),
    includiSpeseGenerali: speseGenerali,
    applicaRitenuta: ritenuta,
  });
  const rp = risultato.riepilogo;

  const cambiaValore = (testo: string) => {
    setValore(testo);
    setIndeterminabile(null);
    const v = leggiImporto(testo, 'IT');
    const s = v != null ? scaglioneDaValore(v) : null;
    if (s) setScaglioneId(s);
  };

  const usa = (modo: 'aggiungi' | 'sostituisci') => {
    if (!risultato.ok) return;
    azioni.preparaParcella({
      righe: risultato.righe.map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzo: r.prezzo_unitario,
      })),
      modo,
    });
    if (per === 'fattura') router.back();
    else router.replace('/fatture/nuova');
  };

  const variazioni = (
    titolo: string,
    elenco: Variazione[],
    stato: Record<string, StatoVariazione>,
    setStato: (fn: (s: Record<string, StatoVariazione>) => Record<string, StatoVariazione>) => void,
    segno: '+' | '−',
  ) => (
    <View>
      <TitoloSezione stile={stili.titoloSezione}>{titolo}</TitoloSezione>
      <View style={{ marginHorizontal: -20 }}>
        {elenco.map((v) => {
          const s = stato[v.id] ?? { attivo: false, pct: String(v.pct ?? ''), parti: '2' };
          return (
            <View key={v.id}>
              <Riga
                stretta
                ruolo="switch"
                selezionata={s.attivo}
                titolo={v.label}
                sottotitolo={`${v.help} · ${v.riferimento}`}
                destra={<Interruttore acceso={s.attivo} />}
                onPress={() => setStato((x) => ({ ...x, [v.id]: { ...s, attivo: !s.attivo } }))}
                senzaBordo={s.attivo}
              />
              {s.attivo ? (
                <View style={stili.variazione}>
                  {v.tipo === 'parti' ? (
                    <>
                      <Campo
                        etichetta="Numero di parti"
                        value={s.parti}
                        onChangeText={(t) => setStato((x) => ({ ...x, [v.id]: { ...s, parti: t } }))}
                        keyboardType="number-pad"
                        stile={{ flex: 1 }}
                      />
                      <Text
                        style={stili.variazioneValore}
                      >{`${segno}${pctAumentoParti(Number(s.parti) || 2)}%`}</Text>
                    </>
                  ) : (
                    <>
                      <Campo
                        etichetta={`Percentuale (al massimo ${v.pct}%)`}
                        value={s.pct}
                        onChangeText={(t) => setStato((x) => ({ ...x, [v.id]: { ...s, pct: t } }))}
                        keyboardType="decimal-pad"
                        stile={{ flex: 1 }}
                      />
                      <Text style={stili.variazioneValore}>
                        {`${segno}${Math.min(v.pct ?? 0, leggiImporto(s.pct, 'IT') ?? 0)}%`}
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <Schermata>
      <Intestazione
        sinistra={
          <BottoneIndietro
            ripiego="/fatture"
            etichetta={per === 'fattura' ? 'Torna alla fattura' : undefined}
          />
        }
        titolo="Calcola parcella"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <Testo tipo="cap">Parametri forensi · DM 55/2014, tabelle 2022 vigenti (DM 147/2022)</Testo>

          <View>
            <TitoloSezione stile={stili.titoloSezione}>Competenza</TitoloSezione>
            <View style={{ marginHorizontal: -20 }}>
              <Riga
                titolo={competenza?.label ?? 'Scegli'}
                sottotitolo={competenza?.gruppo}
                freccia="avanti"
                onPress={() => setFoglio('competenze')}
              />
            </View>
            {meta && meta.confidenza !== 'high' ? (
              <Testo tipo="cap" colore={colori.warn} style={{ paddingTop: 8 }}>
                Valori da fonte secondaria: controllali sulla Gazzetta Ufficiale.
              </Testo>
            ) : null}
          </View>

          {!penale ? (
            <View style={{ gap: 12 }}>
              <TitoloSezione stile={stili.titoloSezione}>Valore della causa</TitoloSezione>
              <Campo
                etichetta="Valore (€)"
                placeholder="Es. 15.000"
                value={valore}
                onChangeText={cambiaValore}
                keyboardType="decimal-pad"
              />
              <View style={{ marginHorizontal: -20 }}>
                <Riga
                  stretta
                  titolo={scaglione?.label ?? 'Scegli lo scaglione'}
                  sottotitolo={
                    scaglione?.computato ? 'Scaglione calcolato per progressione (art. 6)' : 'Scaglione'
                  }
                  freccia="avanti"
                  onPress={() => setFoglio('scaglioni')}
                />
              </View>
              <Testo tipo="small" colore={colori.fg2}>
                Valore indeterminabile
              </Testo>
              <View style={stili.tag}>
                {INDETERMINABILE.map((o) => (
                  <Tag
                    key={o.id}
                    titolo={o.label.replace('Indeterminabile — ', '').replace(/^./, (c) => c.toUpperCase())}
                    attivo={indeterminabile === o.id}
                    onPress={() => {
                      setScaglioneId(o.scaglione);
                      setValore('');
                      setIndeterminabile(o.id);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <TitoloSezione stile={stili.titoloSezione}>Fasi</TitoloSezione>
            {fasiCompetenza.map((f) => {
              const disponibile = disponibili.includes(f.id);
              const cfg = fasiInput[f.id];
              const medio = valoreMedioFase(competenzaKey, versione, penale ? null : scaglioneId, f.id);
              const cifra =
                medio != null ? Math.round(medio * fattoreLivello(cfg.livello, versione) * 100) / 100 : null;
              return (
                <View key={f.id} style={stili.fase}>
                  <View style={{ marginHorizontal: -20 }}>
                    <Riga
                      stretta
                      ruolo="switch"
                      selezionata={cfg.incluso}
                      titolo={f.label}
                      sottotitolo={disponibile ? undefined : 'Non prevista per questa competenza'}
                      valore={cfg.incluso && cifra != null ? importo(cifra, 'IT') : undefined}
                      destra={<Interruttore acceso={cfg.incluso} />}
                      onPress={
                        disponibile
                          ? () => setFasi((x) => ({ ...x, [f.id]: { ...x[f.id], incluso: !cfg.incluso } }))
                          : undefined
                      }
                      senzaBordo
                    />
                  </View>
                  {cfg.incluso ? (
                    <Segmentato
                      etichetta={`Livello · ${f.label}`}
                      opzioni={livelli}
                      valore={cfg.livello}
                      onCambia={(l) => setFasi((x) => ({ ...x, [f.id]: { ...x[f.id], livello: l } }))}
                    />
                  ) : null}
                </View>
              );
            })}
            <Testo tipo="cap" style={{ paddingTop: 10 }}>
              Minimo e massimo: −50% e +50% sul valore medio (art. 4).
            </Testo>
          </View>

          {variazioni('Aumenti', AUMENTI, aumenti, setAumenti, '+')}
          {variazioni('Riduzioni', RIDUZIONI, riduzioni, setRiduzioni, '−')}

          <View>
            <TitoloSezione stile={stili.titoloSezione}>Accessori</TitoloSezione>
            <View style={{ marginHorizontal: -20 }}>
              <Riga
                stretta
                ruolo="switch"
                selezionata={speseGenerali}
                titolo="Spese generali forfettarie 15%"
                sottotitolo="Sul compenso, art. 2 DM 55/2014"
                destra={<Interruttore acceso={speseGenerali} />}
                onPress={() => setSpeseGenerali(!speseGenerali)}
              />
              <Riga
                stretta
                ruolo="switch"
                selezionata={ritenuta}
                titolo="Anteprima con la ritenuta 20%"
                sottotitolo="Solo per vedere il netto: in fattura la scegli dopo"
                destra={<Interruttore acceso={ritenuta} />}
                onPress={() => setRitenuta(!ritenuta)}
              />
            </View>
          </View>

          {risultato.righe.length > 0 ? (
            <View>
              <TitoloSezione
                stile={stili.titoloSezione}
              >{`Righe della fattura · ${risultato.righe.length}`}</TitoloSezione>
              {risultato.righe.map((r, i) => (
                <View key={`${i}-${r.descrizione}`} style={stili.riga}>
                  <Text style={[stili.rigaTesto, { flex: 1 }]}>{r.descrizione}</Text>
                  <Text style={stili.rigaImporto}>{importo(r.prezzo_unitario, 'IT')}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {rp ? (
            <View style={stili.riepilogo}>
              {[
                ['Compenso', rp.compenso],
                ['Spese generali', rp.speseGenerali],
                ['Imponibile', rp.imponibile],
                ['CPA 4%', rp.cpa],
                ['IVA 22%', rp.iva],
              ].map(([t, v]) => (
                <View key={t as string} style={stili.voce}>
                  <Text style={stili.voceTitolo}>{t}</Text>
                  <Text style={stili.voceValore}>{importo(v as number, 'IT')}</Text>
                </View>
              ))}
              <View style={[stili.voce, stili.voceForte]}>
                <Text style={[stili.voceTitolo, { color: colori.fg }]}>Totale fattura</Text>
                <Text style={[stili.voceValore, { color: colori.accentText }]}>
                  {importo(rp.totaleLordo, 'IT')}
                </Text>
              </View>
              {ritenuta ? (
                <View style={stili.voce}>
                  <Text
                    style={stili.voceTitolo}
                  >{`Netto, dopo la ritenuta di ${importo(rp.ritenuta, 'IT')}`}</Text>
                  <Text style={stili.voceValore}>{importo(rp.totaleNetto, 'IT')}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {risultato.note.map((n) => (
            <Testo key={n} tipo="cap" colore={colori.warn}>
              {n}
            </Testo>
          ))}
          <View style={stili.avvertenza}>
            <Icona nome="avviso" dimensione={16} colore={colori.ok} />
            <Testo tipo="cap" style={{ flex: 1 }}>
              {DISCLAIMER}
            </Testo>
          </View>
        </ScrollView>

        <BarraAzioni stile={{ flexDirection: 'column', gap: 8 }}>
          {risultato.errore ? (
            <Testo tipo="cap" centrato colore={colori.fg3}>
              {risultato.errore}
            </Testo>
          ) : (
            <View style={stili.barra}>
              <Text style={stili.barraTitolo}>Totale fattura</Text>
              <Text style={stili.barraValore}>{importo(rp?.totaleLordo ?? 0, 'IT')}</Text>
            </View>
          )}
          {per === 'fattura' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pulsante
                titolo="Aggiungi"
                variante="linea"
                disabilitato={!risultato.ok}
                onPress={() => usa('aggiungi')}
              />
              <Pulsante
                titolo="Usa nella fattura"
                stile={{ flex: 1 }}
                disabilitato={!risultato.ok}
                onPress={() => usa('sostituisci')}
              />
            </View>
          ) : (
            <Pulsante
              titolo="Crea la fattura con queste righe"
              disabilitato={!risultato.ok}
              onPress={() => usa('sostituisci')}
            />
          )}
        </BarraAzioni>
      </KeyboardAvoidingView>

      <Foglio visibile={foglio === 'competenze'} onChiudi={() => setFoglio(null)} spazio={4}>
        <Testo tipo="dS">Competenza</Testo>
        {gruppi.map((g) => (
          <View key={g.gruppo}>
            <TitoloSezione stile={{ paddingHorizontal: 0 }}>{g.gruppo}</TitoloSezione>
            <View style={{ marginHorizontal: -20 }}>
              {g.voci.map((v) => (
                <Riga
                  key={v.key}
                  stretta
                  ruolo="radio"
                  selezionata={v.key === competenzaKey}
                  titolo={v.label}
                  destra={
                    v.key === competenzaKey ? (
                      <Icona nome="spunta" dimensione={18} colore={colori.accentText} />
                    ) : undefined
                  }
                  onPress={() => {
                    setCompetenzaKey(v.key);
                    setFoglio(null);
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </Foglio>

      <Foglio visibile={foglio === 'scaglioni'} onChiudi={() => setFoglio(null)} spazio={4}>
        <Testo tipo="dS">Scaglione di valore</Testo>
        <View style={{ marginHorizontal: -20 }}>
          {SCAGLIONI.map((s) => (
            <Riga
              key={s.id}
              stretta
              ruolo="radio"
              selezionata={s.id === scaglioneId}
              titolo={s.label}
              sottotitolo={s.computato ? 'Calcolato per progressione (art. 6)' : undefined}
              destra={
                s.id === scaglioneId ? (
                  <Icona nome="spunta" dimensione={18} colore={colori.accentText} />
                ) : undefined
              }
              onPress={() => {
                setScaglioneId(s.id);
                setValore('');
                setIndeterminabile(null);
                setFoglio(null);
              }}
            />
          ))}
        </View>
      </Foglio>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 24, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 28 },
  titoloSezione: { paddingHorizontal: 0, paddingTop: 0 },
  tag: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fase: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colori.line },
  variazione: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  variazioneValore: {
    minWidth: 64,
    paddingBottom: 14,
    fontFamily: famiglie.testoMedio,
    fontSize: 16,
    color: colori.accentText,
    textAlign: 'right',
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  rigaTesto: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20, color: colori.fg },
  rigaImporto: { fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.fg },
  riepilogo: {
    gap: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: colori.accentLine,
    backgroundColor: colori.bg2,
  },
  voce: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  voceForte: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colori.line2 },
  voceTitolo: { flex: 1, fontFamily: famiglie.testo, fontSize: 15, color: colori.fg2 },
  voceValore: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
  avvertenza: { flexDirection: 'row', gap: 10, padding: 12, borderWidth: 1, borderColor: colori.line },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  barraTitolo: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  barraValore: { fontFamily: famiglie.titoloSemi, fontSize: 26, color: colori.fg },
});
