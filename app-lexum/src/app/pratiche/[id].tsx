import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Compositore } from '@/componenti/Compositore';
import { Avviso, Badge, ElencoDefinizioni, IconaQuadrata, Scheda, Tag } from '@/componenti/Elementi';
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
import type { DocumentoStudio, Pratica, RicercaPratica } from '@/dati-finti/studio';
import {
  FoglioAggiungiDocumento,
  FoglioCarica,
  FoglioDocumento,
  FoglioScegliDocumenti,
  percorsoCategoria,
} from '@/fogli/FogliDocumenti';
import { FoglioEsauriti } from '@/fogli/FoglioEsauriti';
import {
  FoglioChiudiPratica,
  FoglioControparte,
  FoglioEliminaPratica,
  FoglioNotePratica,
  FoglioTermine,
  FoglioUdienza,
} from '@/fogli/FogliPratica';
import type { Chiave } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { indietro, useVaiASezione } from '@/navigazione';
import { documentiDi } from '@/studio/clienti';
import { dataCompleta, ora, urgenza, type Urgenza } from '@/studio/formati';
import {
  attiLex,
  nomeEsito,
  nomeRuolo,
  nomeTipoCausa,
  prossimaUdienza,
  prossimoTermine,
} from '@/studio/pratiche';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type SchedaPratica = 'panoramica' | 'scadenze' | 'controparti' | 'documenti' | 'ricerche' | 'lex';
type FoglioPratica =
  | 'azioni'
  | 'note'
  | 'chiudi'
  | 'elimina'
  | 'termine'
  | 'udienza'
  | 'controparte'
  | 'esauriti'
  | 'aggiungiDocumento'
  | 'carica'
  | 'scansiona'
  | 'scegliDocumenti';

const schede: SchedaPratica[] = ['panoramica', 'scadenze', 'controparti', 'documenti', 'ricerche', 'lex'];

const tonoUrgenza: Record<Urgenza['tono'], 'pericolo' | 'warn' | 'ok' | 'neutro'> = {
  pericolo: 'pericolo',
  avviso: 'warn',
  ok: 'ok',
  neutro: 'neutro',
};

const toniUdienza = {
  programmata: 'oro',
  svolta: 'ok',
  rinviata: 'warn',
  annullata: 'neutro',
} as const;

// I tipi di ricerca si salvano in italiano: qui solo come si mostrano.
const tipiRicerca: Record<RicercaPratica['tipo'], Chiave> = {
  'Chat con Lex': 'studio.pratica.ricerche.chat',
  'Ricerca AI': 'studio.pratica.ricerche.ai',
  Appunti: 'studio.pratica.ricerche.appunti',
};

// S2 · Dettaglio della pratica. Sul sito è una pagina lunga; qui è divisa in schede.
// La scheda attiva sta nell'indirizzo (?scheda=scadenze), così la apre anche l'elenco delle schermate.
export default function DettaglioPratica() {
  const { id, scheda } = useLocalSearchParams<{ id: string; scheda?: SchedaPratica }>();
  const { pratiche, clienti, azioni } = useStudio();
  const { paese } = useStato();
  const { t } = useTesti();
  const pratica = pratiche.find((p) => p.id === id);
  const attiva: SchedaPratica = scheda ?? 'panoramica';
  const [foglio, setFoglio] = useState<FoglioPratica | null>(null);
  const [documento, setDocumento] = useState<DocumentoStudio | null>(null);
  const { documenti } = useStudio();
  const chiudi = () => setFoglio(null);

  if (!pratica) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/pratiche" />}
          titolo={t('studio.pratica.titolo')}
        />
        <StatoVuoto
          icona="bilancia"
          titolo={t('studio.pratica.nonCe')}
          azione={{ titolo: t('studio.pratica.torna'), onPress: () => indietro('/pratiche') }}
        />
      </Schermata>
    );
  }

  const cliente = nomeCliente(clienti, pratica.clienteId);

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/pratiche" etichetta={t('studio.pratica.torna')} />}
        titolo={pratica.titolo}
        destra={
          <PulsanteIcona
            icona="altro"
            etichetta={t('studio.pratica.altreAzioni')}
            onPress={() => setFoglio('azioni')}
          />
        }
      />
      <Schede
        voci={schede.map((s) => ({ valore: s, titolo: t(`studio.pratica.schede.${s}`) }))}
        attiva={attiva}
        onCambia={(s) => router.setParams({ scheda: s })}
      />

      {attiva === 'lex' ? (
        <SchedaLex
          pratica={pratica}
          cliente={cliente}
          paese={paese}
          onEsauriti={() => setFoglio('esauriti')}
          onDocumenti={() => router.setParams({ scheda: 'documenti' })}
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
          {attiva === 'documenti' ? (
            <Documenti
              pratica={pratica}
              onAggiungi={() => setFoglio('aggiungiDocumento')}
              onApri={setDocumento}
            />
          ) : null}
          {attiva === 'ricerche' ? <Ricerche pratica={pratica} /> : null}
        </ScrollView>
      )}

      <Foglio visibile={foglio === 'azioni'} onChiudi={chiudi}>
        <Testo tipo="dS">{pratica.titolo}</Testo>
        <View style={{ marginHorizontal: -20 }}>
          <Riga
            stretta
            sinistra={<Icona nome="modifica" dimensione={20} colore={colori.fg2} />}
            titolo={t('studio.pratica.azioni.note')}
            sottotitolo={t('studio.pratica.azioni.noteTesto')}
            onPress={() => setFoglio('note')}
          />
          <Riga
            stretta
            sinistra={<Icona nome="ricevuta" dimensione={20} colore={colori.fg2} />}
            titolo={t('studio.pratica.azioni.fattura')}
            sottotitolo={t('studio.pratica.azioni.fatturaTesto', { cliente })}
            onPress={() => {
              chiudi();
              router.push({
                pathname: '/fatture/nuova',
                params: { cliente: pratica.clienteId, pratica: pratica.id },
              });
            }}
          />
          {pratica.stato === 'aperta' ? (
            <Riga
              stretta
              sinistra={<Icona nome="spunta" dimensione={20} colore={colori.fg2} />}
              titolo={t('studio.pratica.azioni.chiudi')}
              sottotitolo={t('studio.pratica.azioni.chiudiTesto')}
              onPress={() => setFoglio('chiudi')}
            />
          ) : (
            <Riga
              stretta
              sinistra={<Icona nome="riprova" dimensione={20} colore={colori.fg2} />}
              titolo={t('studio.pratica.azioni.riapri')}
              onPress={() => {
                azioni.riapriPratica(pratica.id);
                chiudi();
              }}
            />
          )}
          <Riga
            stretta
            sinistra={<Icona nome="cestino" dimensione={20} colore={colori.danger} />}
            titolo={t('studio.pratica.azioni.elimina')}
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
      <FoglioAggiungiDocumento
        visibile={foglio === 'aggiungiDocumento'}
        onChiudi={chiudi}
        onCarica={() => setFoglio('carica')}
        onScansiona={() => setFoglio('scansiona')}
        onScegli={() => setFoglio('scegliDocumenti')}
      />
      <FoglioCarica
        visibile={foglio === 'carica' || foglio === 'scansiona'}
        scansione={foglio === 'scansiona'}
        onChiudi={chiudi}
        praticaId={pratica.id}
      />
      <FoglioScegliDocumenti
        visibile={foglio === 'scegliDocumenti'}
        onChiudi={chiudi}
        titolo={t('documenti.pratica.scegliTitolo')}
        candidati={documenti.filter((d) => d.praticaId !== pratica.id && !d.soloPratica)}
        onScegli={(d) => azioni.collegaDocumento(d.id, { praticaId: pratica.id })}
      />
      <FoglioDocumento
        documento={documento ? (documenti.find((d) => d.id === documento.id) ?? null) : null}
        onChiudi={() => setDocumento(null)}
        daPratica
      />
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
  const { t, lingua } = useTesti();
  const udienza = prossimaUdienza(p);
  const termine = prossimoTermine(p);
  const u = termine ? urgenza(termine.scadenza, lingua) : null;
  const tipo = nomeTipoCausa(p.tipo, lingua);
  const esito = p.esito ? nomeEsito(p.esito, lingua) : null;
  const voci: [string, string][] = [
    [t('studio.pratica.panoramica.cliente'), cliente],
    [t('studio.pratica.panoramica.tipo'), tipo],
    [t('studio.pratica.panoramica.creata'), dataCompleta(p.creata, lingua)],
  ];
  if (esito) voci.push([t('studio.pratica.panoramica.esito'), esito]);
  if (paese === 'IT')
    voci.push([
      t('studio.pratica.panoramica.ore'),
      p.oreDedicate != null ? `${p.oreDedicate}`.replace('.', ',') : '—',
    ]);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge tono={p.stato === 'aperta' ? 'ok' : 'neutro'}>
            {p.stato === 'aperta' ? t('studio.statiPratica.aperta') : t('studio.statiPratica.chiusa')}
          </Badge>
          {esito ? <Badge tono="oro">{esito}</Badge> : null}
        </View>
        <Testo tipo="dS">{p.titolo}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {cliente} · {tipo}
        </Testo>
      </View>

      <Pressable onPress={onScadenze} accessibilityRole="button" style={stili.riquadro}>
        <IconaQuadrata nome="tribunale" />
        <View style={{ flex: 1, gap: 3 }}>
          <Testo tipo="cap">{t('studio.pratica.panoramica.prossimaUdienza')}</Testo>
          {udienza ? (
            <>
              <Testo medio>
                {dataCompleta(udienza.dataOra, lingua)} · {ora(udienza.dataOra)}
              </Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {udienza.tipo}
                {udienza.sede ? ` · ${udienza.sede}` : ''}
              </Testo>
            </>
          ) : (
            <Testo tipo="small" colore={colori.fg2}>
              {t('studio.pratica.panoramica.nessunaUdienza')}
            </Testo>
          )}
        </View>
      </Pressable>

      <Pressable onPress={onScadenze} accessibilityRole="button" style={stili.riquadro}>
        <IconaQuadrata nome="orologio" />
        <View style={{ flex: 1, gap: 3 }}>
          <Testo tipo="cap">{t('studio.pratica.panoramica.primoTermine')}</Testo>
          {termine && u ? (
            <>
              <Testo medio>{termine.titolo}</Testo>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge tono={tonoUrgenza[u.tono]}>{u.testo}</Badge>
                <Testo tipo="mini">{dataCompleta(termine.scadenza, lingua)}</Testo>
              </View>
            </>
          ) : (
            <Testo tipo="small" colore={colori.fg2}>
              {t('studio.pratica.panoramica.nessunTermine')}
            </Testo>
          )}
        </View>
      </Pressable>

      <ElencoDefinizioni voci={voci} larghezzaTermine={110} />

      <Pressable onPress={onNote} accessibilityRole="button" style={stili.note}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow colore={colori.fg3}>{t('studio.pratica.panoramica.note')}</Eyebrow>
          <Testo tipo="cap" colore={colori.accentText}>
            {p.note ? t('studio.pratica.panoramica.modifica') : t('studio.pratica.panoramica.aggiungi')}
          </Testo>
        </View>
        <Testo tipo="small" colore={p.note ? colori.fg : colori.fg3}>
          {p.note ?? t('studio.pratica.panoramica.nessunaNota')}
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
  const { t, lingua } = useTesti();
  const inCorso = p.termini
    .filter((t) => t.stato === 'in_corso')
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  const compiuti = p.termini.filter((t) => t.stato === 'compiuto');
  const udienze = [...p.udienze].sort((a, b) => b.dataOra.localeCompare(a.dataOra));
  return (
    <View style={{ gap: 14 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('studio.pratica.scadenze.termini', { n: inCorso.length })}</Eyebrow>
        <Pulsante
          titolo={t('studio.pratica.scadenze.termine')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onTermine}
        />
      </View>
      {inCorso.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('studio.pratica.scadenze.nessunTermine')}
        </Testo>
      ) : null}
      {inCorso.map((termine) => {
        const u = urgenza(termine.scadenza, lingua);
        return (
          <View key={termine.id} style={stili.voce}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge tono={tonoUrgenza[u.tono]}>{u.testo}</Badge>
                <Testo tipo="mini">{dataCompleta(termine.scadenza, lingua)}</Testo>
              </View>
              <Text style={stili.voceTitolo}>{termine.titolo}</Text>
              {termine.evento ? (
                <Testo tipo="cap">{t('studio.pratica.scadenze.da', { evento: termine.evento })}</Testo>
              ) : null}
            </View>
            <PulsanteIcona
              icona="spunta"
              etichetta={t('studio.pratica.scadenze.segnaCompiuto', { titolo: termine.titolo })}
              onPress={() => azioni.compiTermine(p.id, termine.id)}
            />
            <PulsanteIcona
              icona="cestino"
              etichetta={t('studio.pratica.scadenze.eliminaTermine', { titolo: termine.titolo })}
              onPress={() => azioni.eliminaTermine(p.id, termine.id)}
            />
          </View>
        );
      })}
      {compiuti.length > 0 ? (
        <Testo tipo="cap">
          {t('studio.pratica.scadenze.compiuti', { elenco: compiuti.map((c) => c.titolo).join(' · ') })}
        </Testo>
      ) : null}

      <View style={[stili.titoloSezione, { marginTop: 10 }]}>
        <Eyebrow>{t('studio.pratica.scadenze.udienze', { n: udienze.length })}</Eyebrow>
        <Pulsante
          titolo={t('studio.pratica.scadenze.udienza')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onUdienza}
        />
      </View>
      {udienze.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('studio.pratica.scadenze.nessunaUdienza')}
        </Testo>
      ) : null}
      {udienze.map((u) => (
        <View key={u.id} style={stili.voce}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Badge tono={toniUdienza[u.stato]}>{t(`studio.pratica.statiUdienza.${u.stato}`)}</Badge>
              <Testo tipo="mini">
                {dataCompleta(u.dataOra, lingua)} · {ora(u.dataOra)}
              </Testo>
            </View>
            <Text style={stili.voceTitolo}>{u.tipo}</Text>
            {u.sede ? <Testo tipo="cap">{u.sede}</Testo> : null}
            {u.giudice ? (
              <Testo tipo="cap">{t('studio.pratica.scadenze.giudice', { nome: u.giudice })}</Testo>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Controparti({ pratica: p, onNuova }: { pratica: Pratica; onNuova: () => void }) {
  const { t, lingua } = useTesti();
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('studio.pratica.controparti.titolo', { n: p.controparti.length })}</Eyebrow>
        <Pulsante
          titolo={t('studio.pratica.controparti.aggiungi')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onNuova}
        />
      </View>
      {p.controparti.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('studio.pratica.controparti.vuoto')}
        </Testo>
      ) : null}
      {p.controparti.map((c) => (
        <Scheda key={c.id} stile={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge tono="oro">{nomeRuolo(c.ruolo, lingua)}</Badge>
            <Testo tipo="mini">
              {c.giuridica
                ? t('studio.pratica.controparti.giuridica')
                : t('studio.pratica.controparti.fisica')}
            </Testo>
          </View>
          <Testo medio>{c.nome}</Testo>
          {c.legale ? (
            <Testo tipo="small" colore={colori.fg2}>
              {t('studio.pratica.controparti.legale', { nome: c.legale })}
            </Testo>
          ) : null}
        </Scheda>
      ))}
    </View>
  );
}

function Documenti({
  pratica: p,
  onAggiungi,
  onApri,
}: {
  pratica: Pratica;
  onAggiungi: () => void;
  onApri: (d: DocumentoStudio) => void;
}) {
  const { documenti, categorie } = useStudio();
  const { t, lingua } = useTesti();
  const suoi = documentiDi(documenti, { praticaId: p.id });
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('documenti.pratica.titolo', { n: suoi.length })}</Eyebrow>
        <Pulsante
          titolo={t('documenti.pratica.aggiungi')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onAggiungi}
        />
      </View>
      {suoi.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('documenti.pratica.vuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {suoi.map((d) => (
          <Riga
            key={d.id}
            inAlto
            sinistra={<IconaQuadrata nome="documento" tenue />}
            titolo={d.titolo}
            sottotitolo={[percorsoCategoria(categorie, d), dataCompleta(d.quando, lingua), d.dimensione]
              .filter(Boolean)
              .join(' · ')}
            sotto={
              d.origine || d.soloPratica || d.stato !== 'Indicizzato' ? (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {d.origine === 'atto' ? <Badge tono="oro">{t('documenti.archivio.atto')}</Badge> : null}
                  {d.origine === 'fattura' ? (
                    <Badge tono="oro">{t('documenti.archivio.fattura')}</Badge>
                  ) : null}
                  {d.soloPratica ? <Badge>{t('documenti.pratica.soloPratica')}</Badge> : null}
                  {d.stato !== 'Indicizzato' ? (
                    <Badge tono="warn">{t(`archivio.stati.${d.stato}`)}</Badge>
                  ) : null}
                </View>
              ) : undefined
            }
            onPress={() => onApri(d)}
          />
        ))}
      </View>
    </View>
  );
}

function Ricerche({ pratica: p }: { pratica: Pratica }) {
  const vai = useVaiASezione();
  const { t } = useTesti();
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('studio.pratica.ricerche.titolo', { n: p.ricerche.length })}</Eyebrow>
        <Pulsante
          titolo={t('studio.pratica.ricerche.bancaDati')}
          icona="cerca"
          variante="linea"
          piccolo
          onPress={() => vai('/banca-dati')}
        />
      </View>
      {p.ricerche.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('studio.pratica.ricerche.vuoto')}
        </Testo>
      ) : null}
      {p.ricerche.map((r) => (
        <View key={r.id} style={stili.voce}>
          <View style={{ flex: 1, gap: 4 }}>
            <Badge tono={r.tipo === 'Chat con Lex' ? 'oro' : 'neutro'}>
              {tipiRicerca[r.tipo] ? t(tipiRicerca[r.tipo]) : r.tipo}
            </Badge>
            <Text style={stili.voceTitolo}>{r.titolo}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const passiLex = [
  'studio.pratica.lex.passo1',
  'studio.pratica.lex.passo2',
  'studio.pratica.lex.passo3',
] as const;

// Lex per questa pratica: dalla tappa «Studio» è `lex-pratica` in streaming, come sul sito.
// Conosce cliente, controparti, udienze, documenti e ricerche; non legge note interne e termini.
function SchedaLex({
  pratica: p,
  cliente,
  paese,
  onEsauriti,
  onDocumenti,
}: {
  pratica: Pratica;
  cliente: string;
  paese: string;
  onEsauriti: () => void;
  onDocumenti: () => void;
}) {
  const { conto, azioni } = useStato();
  const studio = useStudio();
  const [salvato, setSalvato] = useState<string | null>(null);
  const { t, lingua } = useTesti();
  const offline = useOffline();
  const [bozza, setBozza] = useState('');
  const [richiesta, setRichiesta] = useState<{
    testo: string;
    passo: number;
    pronta: boolean;
    atto?: string; // l'atto chiesto: alla fine si salva in PDF nella pratica
  } | null>(null);

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

  const chiedi = (testo: string, atto?: string) => {
    if (!testo.trim() || offline || (richiesta && !richiesta.pronta)) return;
    if (conto.crediti <= 0) {
      onEsauriti();
      return;
    }
    setRichiesta({ testo: testo.trim(), passo: 0, pronta: false, atto });
    setSalvato(null);
    setBozza('');
  };

  const risposta: RispostaFinta = {
    titolo: '',
    inBreve: t('studio.pratica.lex.inBreve', { titolo: p.titolo }),
    punti: [
      {
        titolo: t('studio.pratica.lex.cosaSo'),
        testo: [
          t('studio.pratica.lex.cosaSoTesto', {
            cliente,
            controparti: p.controparti.length,
            udienze: p.udienze.length,
            documenti: documentiDi(studio.documenti, { praticaId: p.id }).length,
            ricerche: p.ricerche.length,
          }),
        ],
      },
    ],
    nota: t('studio.pratica.lex.nota'),
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
        {!richiesta ? (
          <>
            <View style={{ gap: 6 }}>
              <Testo tipo="dS">{t('studio.pratica.lex.titolo')}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {t('studio.pratica.lex.testo')}
              </Testo>
            </View>
            <Testo tipo="cap">{t('studio.pratica.lex.atti')}</Testo>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {attiLex(paese, lingua).map((a) => (
                <Tag
                  key={a}
                  titolo={a}
                  onPress={() => chiedi(t('studio.pratica.lex.prepara', { atto: a }), a)}
                />
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
              <Passi passi={passiLex.map((k) => t(k))} attivo={richiesta.passo} />
            )}
            {richiesta.pronta && richiesta.atto ? (
              salvato ? (
                <View style={{ gap: 8 }}>
                  <Avviso tono="info" testo={t('documenti.atto.salvato', { titolo: salvato })} />
                  <Pulsante
                    titolo={t('documenti.atto.apri')}
                    variante="linea"
                    piccolo
                    onPress={onDocumenti}
                  />
                </View>
              ) : (
                <Pulsante
                  titolo={t('documenti.atto.salva')}
                  icona="scarica"
                  piccolo
                  onPress={() => {
                    const titolo = `${richiesta.atto} – ${p.titolo}`;
                    studio.azioni.salvaAtto(p.id, titolo);
                    setSalvato(titolo);
                  }}
                />
              )
            ) : null}
            {richiesta.pronta ? (
              <Pulsante
                titolo={t('studio.pratica.lex.nuovaDomanda')}
                variante="linea"
                piccolo
                onPress={() => setRichiesta(null)}
              />
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
        segnaposto={t('studio.pratica.lex.segnaposto')}
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
