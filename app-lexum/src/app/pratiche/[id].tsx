import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Compositore } from '@/componenti/Compositore';
import { Badge, ElencoDefinizioni, IconaQuadrata, Scheda, Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { BollaDomanda, FirmaLex, Passi, RispostaLex } from '@/componenti/Lex';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schede } from '@/componenti/Schede';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Eyebrow, Testo } from '@/componenti/Testo';
import type { RispostaFinta } from '@/dati-finti/chat';
import type { Pratica } from '@/dati-finti/studio';
import { FoglioEsauriti } from '@/fogli/FoglioEsauriti';
import {
  FoglioChiudiPratica,
  FoglioControparte,
  FoglioEliminaPratica,
  FoglioNotePratica,
  FoglioTermine,
  FoglioUdienza,
} from '@/fogli/FogliPratica';
import { indietro, useVaiASezione } from '@/navigazione';
import { dataCompleta, ora, urgenza, type Urgenza } from '@/studio/formati';
import { attiLex, prossimaUdienza, prossimoTermine } from '@/studio/pratiche';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type SchedaPratica = 'panoramica' | 'scadenze' | 'controparti' | 'documenti' | 'ricerche' | 'lex';
type FoglioPratica =
  'azioni' | 'note' | 'chiudi' | 'elimina' | 'termine' | 'udienza' | 'controparte' | 'esauriti';

const schede: { valore: SchedaPratica; titolo: string }[] = [
  { valore: 'panoramica', titolo: 'Panoramica' },
  { valore: 'scadenze', titolo: 'Scadenze' },
  { valore: 'controparti', titolo: 'Controparti' },
  { valore: 'documenti', titolo: 'Documenti' },
  { valore: 'ricerche', titolo: 'Ricerche' },
  { valore: 'lex', titolo: 'Lex' },
];

const tonoUrgenza: Record<Urgenza['tono'], 'pericolo' | 'warn' | 'ok' | 'neutro'> = {
  pericolo: 'pericolo',
  avviso: 'warn',
  ok: 'ok',
  neutro: 'neutro',
};

const statiUdienza = {
  programmata: { testo: 'Programmata', tono: 'oro' },
  svolta: { testo: 'Svolta', tono: 'ok' },
  rinviata: { testo: 'Rinviata', tono: 'warn' },
  annullata: { testo: 'Annullata', tono: 'neutro' },
} as const;

// S2 · Dettaglio della pratica. Sul sito è una pagina lunga; qui è divisa in schede.
// La scheda attiva sta nell'indirizzo (?scheda=scadenze), così la apre anche l'elenco delle schermate.
export default function DettaglioPratica() {
  const { id, scheda } = useLocalSearchParams<{ id: string; scheda?: SchedaPratica }>();
  const { pratiche, clienti, azioni } = useStudio();
  const { paese } = useStato();
  const pratica = pratiche.find((p) => p.id === id);
  const attiva: SchedaPratica = scheda ?? 'panoramica';
  const [foglio, setFoglio] = useState<FoglioPratica | null>(null);
  const chiudi = () => setFoglio(null);

  if (!pratica) {
    return (
      <Schermata>
        <Intestazione sinistra={<BottoneIndietro ripiego="/pratiche" />} titolo="Pratica" />
        <StatoVuoto
          icona="bilancia"
          titolo="Questa pratica non c'è più"
          azione={{ titolo: 'Torna alle pratiche', onPress: () => indietro('/pratiche') }}
        />
      </Schermata>
    );
  }

  const cliente = nomeCliente(clienti, pratica.clienteId);

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/pratiche" etichetta="Torna alle pratiche" />}
        titolo={pratica.titolo}
        destra={<PulsanteIcona icona="altro" etichetta="Altre azioni" onPress={() => setFoglio('azioni')} />}
      />
      <Schede voci={schede} attiva={attiva} onCambia={(s) => router.setParams({ scheda: s })} />

      {attiva === 'lex' ? (
        <SchedaLex
          pratica={pratica}
          cliente={cliente}
          paese={paese}
          onEsauriti={() => setFoglio('esauriti')}
        />
      ) : (
        <ScrollView contentContainerStyle={stili.corpo}>
          {attiva === 'panoramica' ? (
            <Panoramica
              pratica={pratica}
              cliente={cliente}
              paese={paese}
              onNote={() => setFoglio('note')}
              onScadenze={() => router.setParams({ scheda: 'scadenze' })}
            />
          ) : null}
          {attiva === 'scadenze' ? (
            <Scadenze
              pratica={pratica}
              onTermine={() => setFoglio('termine')}
              onUdienza={() => setFoglio('udienza')}
            />
          ) : null}
          {attiva === 'controparti' ? (
            <Controparti pratica={pratica} onNuova={() => setFoglio('controparte')} />
          ) : null}
          {attiva === 'documenti' ? <Documenti pratica={pratica} /> : null}
          {attiva === 'ricerche' ? <Ricerche pratica={pratica} /> : null}
        </ScrollView>
      )}

      <Foglio visibile={foglio === 'azioni'} onChiudi={chiudi}>
        <Testo tipo="dS">{pratica.titolo}</Testo>
        <View style={{ marginHorizontal: -20 }}>
          <Riga
            stretta
            sinistra={<Icona nome="modifica" dimensione={20} colore={colori.fg2} />}
            titolo="Note interne"
            sottotitolo="Le vedi solo tu: Lex non le legge"
            onPress={() => setFoglio('note')}
          />
          {pratica.stato === 'aperta' ? (
            <Riga
              stretta
              sinistra={<Icona nome="spunta" dimensione={20} colore={colori.fg2} />}
              titolo="Chiudi la pratica"
              sottotitolo="Con l'esito: vinta, persa, transatta, archiviata"
              onPress={() => setFoglio('chiudi')}
            />
          ) : (
            <Riga
              stretta
              sinistra={<Icona nome="riprova" dimensione={20} colore={colori.fg2} />}
              titolo="Riapri la pratica"
              onPress={() => {
                azioni.riapriPratica(pratica.id);
                chiudi();
              }}
            />
          )}
          <Riga
            stretta
            sinistra={<Icona nome="cestino" dimensione={20} colore={colori.danger} />}
            titolo="Elimina la pratica"
            titoloStile={{ color: colori.danger }}
            onPress={() => setFoglio('elimina')}
          />
        </View>
      </Foglio>
      <FoglioNotePratica visibile={foglio === 'note'} onChiudi={chiudi} pratica={pratica} />
      <FoglioChiudiPratica visibile={foglio === 'chiudi'} onChiudi={chiudi} pratica={pratica} />
      <FoglioEliminaPratica
        visibile={foglio === 'elimina'}
        onChiudi={chiudi}
        pratica={pratica}
        onEliminata={() => {
          chiudi();
          indietro('/pratiche');
        }}
      />
      <FoglioTermine visibile={foglio === 'termine'} onChiudi={chiudi} pratica={pratica} />
      <FoglioUdienza visibile={foglio === 'udienza'} onChiudi={chiudi} pratica={pratica} />
      <FoglioControparte visibile={foglio === 'controparte'} onChiudi={chiudi} pratica={pratica} />
      <FoglioEsauriti
        visibile={foglio === 'esauriti'}
        onChiudi={chiudi}
        onCrediti={() => {
          chiudi();
          router.push('/profilo');
        }}
      />
    </Schermata>
  );
}

function Panoramica({
  pratica: p,
  cliente,
  paese,
  onNote,
  onScadenze,
}: {
  pratica: Pratica;
  cliente: string;
  paese: string;
  onNote: () => void;
  onScadenze: () => void;
}) {
  const udienza = prossimaUdienza(p);
  const termine = prossimoTermine(p);
  const u = termine ? urgenza(termine.scadenza) : null;
  const voci: [string, string][] = [
    ['Cliente', cliente],
    ['Tipo', p.tipo],
    ['Creata il', dataCompleta(p.creata)],
  ];
  if (p.esito) voci.push(['Esito', p.esito]);
  if (paese === 'IT')
    voci.push(['Ore dedicate', p.oreDedicate != null ? `${p.oreDedicate}`.replace('.', ',') : '—']);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge tono={p.stato === 'aperta' ? 'ok' : 'neutro'}>
            {p.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
          </Badge>
          {p.esito ? <Badge tono="oro">{p.esito}</Badge> : null}
        </View>
        <Testo tipo="dS">{p.titolo}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {cliente} · {p.tipo}
        </Testo>
      </View>

      <Pressable onPress={onScadenze} accessibilityRole="button" style={stili.riquadro}>
        <IconaQuadrata nome="tribunale" />
        <View style={{ flex: 1, gap: 3 }}>
          <Testo tipo="cap">Prossima udienza</Testo>
          {udienza ? (
            <>
              <Testo medio>
                {dataCompleta(udienza.dataOra)} · {ora(udienza.dataOra)}
              </Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {udienza.tipo}
                {udienza.sede ? ` · ${udienza.sede}` : ''}
              </Testo>
            </>
          ) : (
            <Testo tipo="small" colore={colori.fg2}>
              Nessuna udienza in programma
            </Testo>
          )}
        </View>
      </Pressable>

      <Pressable onPress={onScadenze} accessibilityRole="button" style={stili.riquadro}>
        <IconaQuadrata nome="orologio" />
        <View style={{ flex: 1, gap: 3 }}>
          <Testo tipo="cap">Primo termine</Testo>
          {termine && u ? (
            <>
              <Testo medio>{termine.titolo}</Testo>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge tono={tonoUrgenza[u.tono]}>{u.testo}</Badge>
                <Testo tipo="mini">{dataCompleta(termine.scadenza)}</Testo>
              </View>
            </>
          ) : (
            <Testo tipo="small" colore={colori.fg2}>
              Nessun termine da rispettare
            </Testo>
          )}
        </View>
      </Pressable>

      <ElencoDefinizioni voci={voci} larghezzaTermine={110} />

      <Pressable onPress={onNote} accessibilityRole="button" style={stili.note}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow colore={colori.fg3}>Note interne</Eyebrow>
          <Testo tipo="cap" colore={colori.accentText}>
            {p.note ? 'Modifica' : 'Aggiungi'}
          </Testo>
        </View>
        <Testo tipo="small" colore={p.note ? colori.fg : colori.fg3}>
          {p.note ?? 'Nessuna nota. Le vedi solo tu: Lex non le legge.'}
        </Testo>
      </Pressable>
    </View>
  );
}

function Scadenze({
  pratica: p,
  onTermine,
  onUdienza,
}: {
  pratica: Pratica;
  onTermine: () => void;
  onUdienza: () => void;
}) {
  const { azioni } = useStudio();
  const inCorso = p.termini
    .filter((t) => t.stato === 'in_corso')
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  const compiuti = p.termini.filter((t) => t.stato === 'compiuto');
  const udienze = [...p.udienze].sort((a, b) => b.dataOra.localeCompare(a.dataOra));
  return (
    <View style={{ gap: 14 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>Termini · {inCorso.length}</Eyebrow>
        <Pulsante titolo="Termine" icona="piu" variante="linea" piccolo onPress={onTermine} />
      </View>
      {inCorso.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          Nessun termine in corso.
        </Testo>
      ) : null}
      {inCorso.map((t) => {
        const u = urgenza(t.scadenza);
        return (
          <View key={t.id} style={stili.voce}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge tono={tonoUrgenza[u.tono]}>{u.testo}</Badge>
                <Testo tipo="mini">{dataCompleta(t.scadenza)}</Testo>
              </View>
              <Text style={stili.voceTitolo}>{t.titolo}</Text>
              {t.evento ? <Testo tipo="cap">Da: {t.evento}</Testo> : null}
            </View>
            <PulsanteIcona
              icona="spunta"
              etichetta={`Segna come compiuto: ${t.titolo}`}
              onPress={() => azioni.compiTermine(p.id, t.id)}
            />
            <PulsanteIcona
              icona="cestino"
              etichetta={`Elimina il termine: ${t.titolo}`}
              onPress={() => azioni.eliminaTermine(p.id, t.id)}
            />
          </View>
        );
      })}
      {compiuti.length > 0 ? (
        <Testo tipo="cap">Compiuti: {compiuti.map((t) => t.titolo).join(' · ')}</Testo>
      ) : null}

      <View style={[stili.titoloSezione, { marginTop: 10 }]}>
        <Eyebrow>Udienze · {udienze.length}</Eyebrow>
        <Pulsante titolo="Udienza" icona="piu" variante="linea" piccolo onPress={onUdienza} />
      </View>
      {udienze.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          Nessuna udienza.
        </Testo>
      ) : null}
      {udienze.map((u) => (
        <View key={u.id} style={stili.voce}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Badge tono={statiUdienza[u.stato].tono}>{statiUdienza[u.stato].testo}</Badge>
              <Testo tipo="mini">
                {dataCompleta(u.dataOra)} · {ora(u.dataOra)}
              </Testo>
            </View>
            <Text style={stili.voceTitolo}>{u.tipo}</Text>
            {u.sede ? <Testo tipo="cap">{u.sede}</Testo> : null}
            {u.giudice ? <Testo tipo="cap">Giudice: {u.giudice}</Testo> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Controparti({ pratica: p, onNuova }: { pratica: Pratica; onNuova: () => void }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>Controparti · {p.controparti.length}</Eyebrow>
        <Pulsante titolo="Controparte" icona="piu" variante="linea" piccolo onPress={onNuova} />
      </View>
      {p.controparti.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          Nessuna controparte. Aggiungile per generare correttamente gli atti.
        </Testo>
      ) : null}
      {p.controparti.map((c) => (
        <Scheda key={c.id} stile={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge tono="oro">{c.ruolo}</Badge>
            <Testo tipo="mini">{c.giuridica ? 'Persona giuridica' : 'Persona fisica'}</Testo>
          </View>
          <Testo medio>{c.nome}</Testo>
          {c.legale ? (
            <Testo tipo="small" colore={colori.fg2}>
              Legale: {c.legale}
            </Testo>
          ) : null}
        </Scheda>
      ))}
    </View>
  );
}

function Documenti({ pratica: p }: { pratica: Pratica }) {
  const vai = useVaiASezione();
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>Documenti · {p.documenti.length}</Eyebrow>
        <Pulsante titolo="Aggiungi" icona="piu" variante="linea" piccolo onPress={() => vai('/archivio')} />
      </View>
      {p.documenti.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          Nessun documento collegato a questa pratica.
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {p.documenti.map((d) => (
          <Riga
            key={d.id}
            stretta
            sinistra={<IconaQuadrata nome="documento" tenue />}
            titolo={d.titolo}
            sottotitolo={dataCompleta(d.quando)}
            destra={d.archivio ? <Badge>Archivio</Badge> : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function Ricerche({ pratica: p }: { pratica: Pratica }) {
  const vai = useVaiASezione();
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>Ricerche · {p.ricerche.length}</Eyebrow>
        <Pulsante
          titolo="Banca dati"
          icona="cerca"
          variante="linea"
          piccolo
          onPress={() => vai('/banca-dati')}
        />
      </View>
      {p.ricerche.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          Nessuna ricerca. Le chat con Lex su questa pratica, salvate, finiscono qui.
        </Testo>
      ) : null}
      {p.ricerche.map((r) => (
        <View key={r.id} style={stili.voce}>
          <View style={{ flex: 1, gap: 4 }}>
            <Badge tono={r.tipo === 'Chat con Lex' ? 'oro' : 'neutro'}>{r.tipo}</Badge>
            <Text style={stili.voceTitolo}>{r.titolo}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const passiLex = ['Leggo la pratica', 'Cerco tra norme e giurisprudenza', 'Scrivo la risposta'];

// Lex per questa pratica: dalla tappa «Studio» è `lex-pratica` in streaming, come sul sito.
// Conosce cliente, controparti, udienze, documenti e ricerche; non legge note interne e termini.
function SchedaLex({
  pratica: p,
  cliente,
  paese,
  onEsauriti,
}: {
  pratica: Pratica;
  cliente: string;
  paese: string;
  onEsauriti: () => void;
}) {
  const { conto, azioni } = useStato();
  const offline = useOffline();
  const [bozza, setBozza] = useState('');
  const [richiesta, setRichiesta] = useState<{ testo: string; passo: number; pronta: boolean } | null>(null);

  useEffect(() => {
    if (!richiesta || richiesta.pronta) return;
    const t = setTimeout(() => {
      if (richiesta.passo + 1 < passiLex.length) setRichiesta({ ...richiesta, passo: richiesta.passo + 1 });
      else {
        setRichiesta({ ...richiesta, pronta: true });
        azioni.usaCredito();
      }
    }, 700);
    return () => clearTimeout(t);
  }, [richiesta, azioni]);

  const chiedi = (testo: string) => {
    if (!testo.trim() || offline || (richiesta && !richiesta.pronta)) return;
    if (conto.crediti <= 0) {
      onEsauriti();
      return;
    }
    setRichiesta({ testo: testo.trim(), passo: 0, pronta: false });
    setBozza('');
  };

  const risposta: RispostaFinta = {
    titolo: '',
    inBreve: `risposta di prova su «${p.titolo}».`,
    punti: [
      {
        titolo: 'Cosa so di questa pratica.',
        testo: [
          ` Cliente ${cliente}; ${p.controparti.length} controparti, ${p.udienze.length} udienze, ${p.documenti.length} documenti e ${p.ricerche.length} ricerche.`,
        ],
      },
    ],
    nota: 'Dalla tappa «Studio» qui risponde Lex sulla pratica, come sul sito. Un atto generato diventa un PDF da salvare nella pratica, e costa 1 credito.',
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
        {!richiesta ? (
          <>
            <View style={{ gap: 6 }}>
              <Testo tipo="dS">Lex conosce questa pratica</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                Cliente, controparti, udienze, documenti e ricerche. Non legge le note interne. Chiedi
                un'analisi, una strategia o un atto: ogni atto costa 1 credito.
              </Testo>
            </View>
            <Testo tipo="cap">Atti che può preparare</Testo>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(attiLex[paese] ?? []).map((a) => (
                <Tag key={a} titolo={a} onPress={() => chiedi(`Prepara: ${a}`)} />
              ))}
            </View>
          </>
        ) : (
          <View style={{ gap: 14 }}>
            <BollaDomanda testo={richiesta.testo} />
            <FirmaLex />
            {richiesta.pronta ? (
              <RispostaLex risposta={risposta} onCitazione={() => undefined} />
            ) : (
              <Passi passi={passiLex} attivo={richiesta.passo} />
            )}
            {richiesta.pronta ? (
              <Pulsante titolo="Nuova domanda" variante="linea" piccolo onPress={() => setRichiesta(null)} />
            ) : null}
          </View>
        )}
      </ScrollView>
      <Compositore
        valore={bozza}
        onCambia={setBozza}
        onInvia={() => chiedi(bozza)}
        onAllega={() => undefined}
        occupato={!!richiesta && !richiesta.pronta}
        offline={offline}
        segnaposto="Chiedi a Lex su questa pratica…"
      />
    </KeyboardAvoidingView>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 28 },
  riquadro: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  note: { gap: 6, padding: 14, borderWidth: 1, borderColor: colori.line, borderStyle: 'dashed' },
  titoloSezione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  voce: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  voceTitolo: { fontFamily: famiglie.testoMedio, fontSize: 15, lineHeight: 21, color: colori.fg },
});
