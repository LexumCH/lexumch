import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avviso, Badge, ElencoDefinizioni, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schede } from '@/componenti/Schede';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Eyebrow, Testo } from '@/componenti/Testo';
import type { Cliente, DocumentoStudio, NotaCliente } from '@/dati-finti/studio';
import { FoglioNuovoEvento } from '@/fogli/FogliCalendario';
import {
  FoglioAccessoPortale,
  FoglioCondividi,
  FoglioEliminaCliente,
  FoglioNota,
  FoglioTicket,
} from '@/fogli/FogliClienti';
import {
  FoglioCarica,
  FoglioDocumento,
  FoglioScegliDocumenti,
  percorsoCategoria,
} from '@/fogli/FogliDocumenti';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { importo, statoFattura, totaliFattura } from '@/studio/calcoli';
import { dataPerCampo, documentiDi } from '@/studio/clienti';
import { quandoFattura, statiFattura, testoStato } from '@/studio/fatturazione';
import { dataBreve, dataCompleta, giorniDaOggi, ora } from '@/studio/formati';
import { nomeTipoCausa } from '@/studio/pratiche';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { Monogramma } from '@/studio/Monogramma';
import { colori } from '@/tema';

type SchedaCliente = 'panoramica' | 'pratiche' | 'documenti' | 'comunicazioni' | 'note' | 'pagamenti';
const schede: SchedaCliente[] = ['panoramica', 'pratiche', 'documenti', 'comunicazioni', 'note', 'pagamenti'];

type FoglioAperto =
  'azioni' | 'accesso' | 'elimina' | 'nota' | 'ticket' | 'condividi' | 'carica' | 'collega' | 'appuntamento';

// S12 · Scheda del cliente, come Dettaglio.jsx del sito: panoramica (anagrafica, accesso al portale,
// prossimi appuntamenti), pratiche, documenti (portale del cliente e archivio dello studio), messaggi,
// note interne, pagamenti. La scheda attiva sta nell'indirizzo (?scheda=documenti).
// ?creato=1|portale: il cliente è appena stato creato.
export default function DettaglioCliente() {
  const { id, scheda, creato } = useLocalSearchParams<{
    id: string;
    scheda?: SchedaCliente;
    creato?: string;
  }>();
  const studio = useStudio();
  const { paese, ruoli } = useStato();
  const { t } = useTesti();
  const cliente = studio.clienti.find((c) => c.id === id);
  const attiva: SchedaCliente = scheda ?? 'panoramica';
  const [foglio, setFoglio] = useState<FoglioAperto | null>(null);
  const [nota, setNota] = useState<NotaCliente | undefined>(undefined);
  const [documento, setDocumento] = useState<DocumentoStudio | null>(null);
  const chiudi = () => setFoglio(null);

  if (!cliente) {
    return (
      <Schermata>
        <Intestazione sinistra={<BottoneIndietro ripiego="/clienti" />} titolo={t('clienti.scheda.titolo')} />
        <StatoVuoto
          icona="persone"
          titolo={t('clienti.scheda.nonCe')}
          azione={{ titolo: t('clienti.scheda.torna'), onPress: () => indietro('/clienti') }}
        />
      </Schermata>
    );
  }

  const nuovaPratica = () => router.push({ pathname: '/pratiche/nuova', params: { cliente: cliente.id } });
  const nuovaFattura = () => router.push({ pathname: '/fatture/nuova', params: { cliente: cliente.id } });
  const documentoAperto = documento ? (studio.documenti.find((d) => d.id === documento.id) ?? null) : null;

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/clienti" etichetta={t('clienti.scheda.torna')} />}
        titolo={cliente.nome}
        destra={
          <PulsanteIcona
            icona="altro"
            etichetta={t('clienti.scheda.altreAzioni')}
            onPress={() => setFoglio('azioni')}
          />
        }
      />
      <Schede
        voci={schede.map((s) => ({ valore: s, titolo: t(`clienti.scheda.schede.${s}`) }))}
        attiva={attiva}
        onCambia={(s) => router.setParams({ scheda: s })}
      />
      <ScrollView contentContainerStyle={stili.corpo}>
        {creato ? (
          <Avviso
            tono="info"
            testo={creato === 'portale' ? t('clienti.scheda.creatoPortale') : t('clienti.scheda.creato')}
          />
        ) : null}
        {attiva === 'panoramica' ? (
          <Panoramica
            cliente={cliente}
            onModifica={() => router.push({ pathname: '/clienti/nuovo', params: { modifica: cliente.id } })}
            onAccesso={() => setFoglio('accesso')}
            onAppuntamento={() => setFoglio('appuntamento')}
            onScheda={(s) => router.setParams({ scheda: s })}
          />
        ) : null}
        {attiva === 'pratiche' ? <Pratiche cliente={cliente} onNuova={nuovaPratica} /> : null}
        {attiva === 'documenti' ? (
          <Documenti
            cliente={cliente}
            onCondividi={() => setFoglio('condividi')}
            onCarica={() => setFoglio('carica')}
            onCollega={() => setFoglio('collega')}
            onApri={setDocumento}
          />
        ) : null}
        {attiva === 'comunicazioni' ? (
          <Comunicazioni cliente={cliente} onNuova={() => setFoglio('ticket')} />
        ) : null}
        {attiva === 'note' ? (
          <Note
            cliente={cliente}
            onNota={(n) => {
              setNota(n);
              setFoglio('nota');
            }}
          />
        ) : null}
        {attiva === 'pagamenti' ? <Pagamenti cliente={cliente} onNuova={nuovaFattura} /> : null}
      </ScrollView>

      <Foglio visibile={foglio === 'azioni'} onChiudi={chiudi}>
        <Testo tipo="dS">{cliente.nome}</Testo>
        <View style={{ marginHorizontal: -20 }}>
          {[
            {
              icona: 'modifica' as const,
              titolo: t('clienti.scheda.azioni.modifica'),
              onPress: () => {
                chiudi();
                router.push({ pathname: '/clienti/nuovo', params: { modifica: cliente.id } });
              },
            },
            {
              icona: 'bilancia' as const,
              titolo: t('clienti.scheda.azioni.nuovaPratica'),
              onPress: () => {
                chiudi();
                nuovaPratica();
              },
            },
            {
              icona: 'ricevuta' as const,
              titolo: t('clienti.scheda.azioni.nuovaFattura'),
              onPress: () => {
                chiudi();
                nuovaFattura();
              },
            },
            {
              icona: 'calendario' as const,
              titolo: t('clienti.scheda.azioni.appuntamento'),
              onPress: () => setFoglio('appuntamento'),
            },
            {
              icona: 'fumetto' as const,
              titolo: t('clienti.scheda.azioni.messaggio'),
              onPress: () => setFoglio('ticket'),
            },
            {
              icona: 'lucchetto' as const,
              titolo: t('clienti.scheda.azioni.accesso'),
              sottotitolo: t('clienti.scheda.azioni.accessoTesto'),
              onPress: () => setFoglio('accesso'),
            },
          ].map((v) => (
            <Riga
              key={v.titolo}
              stretta
              sinistra={<Icona nome={v.icona} dimensione={20} colore={colori.fg2} />}
              titolo={v.titolo}
              sottotitolo={v.sottotitolo}
              onPress={v.onPress}
            />
          ))}
          <Riga
            stretta
            sinistra={<Icona nome="cestino" dimensione={20} colore={colori.danger} />}
            titolo={t('clienti.scheda.azioni.elimina')}
            titoloStile={{ color: colori.danger }}
            onPress={() => setFoglio('elimina')}
          />
        </View>
      </Foglio>
      <FoglioAccessoPortale visibile={foglio === 'accesso'} onChiudi={chiudi} cliente={cliente} />
      <FoglioEliminaCliente
        visibile={foglio === 'elimina'}
        onChiudi={chiudi}
        cliente={cliente}
        onEliminato={() => {
          chiudi();
          indietro('/clienti');
        }}
      />
      <FoglioNota visibile={foglio === 'nota'} onChiudi={chiudi} clienteId={cliente.id} nota={nota} />
      <FoglioTicket visibile={foglio === 'ticket'} onChiudi={chiudi} cliente={cliente} />
      <FoglioCondividi visibile={foglio === 'condividi'} onChiudi={chiudi} cliente={cliente} />
      <FoglioCarica visibile={foglio === 'carica'} onChiudi={chiudi} clienteId={cliente.id} />
      <FoglioScegliDocumenti
        visibile={foglio === 'collega'}
        onChiudi={chiudi}
        titolo={t('clienti.fogli.collega.titolo')}
        testo={t('clienti.fogli.collega.testo', { nome: cliente.nome })}
        candidati={studio.documenti.filter((d) => d.clienteId !== cliente.id && !d.soloPratica)}
        onScegli={(d) => studio.azioni.collegaDocumento(d.id, { clienteId: cliente.id })}
      />
      <FoglioNuovoEvento
        visibile={foglio === 'appuntamento'}
        onChiudi={chiudi}
        giornoIniziale={new Date().toISOString()}
        paese={paese}
        conUdienze={ruoli[paese] === 'avvocato'}
        clienteIniziale={cliente.id}
      />
      <FoglioDocumento documento={documentoAperto} onChiudi={() => setDocumento(null)} />
    </Schermata>
  );
}

function Panoramica({
  cliente: c,
  onModifica,
  onAccesso,
  onAppuntamento,
  onScheda,
}: {
  cliente: Cliente;
  onModifica: () => void;
  onAccesso: () => void;
  onAppuntamento: () => void;
  onScheda: (s: SchedaCliente) => void;
}) {
  const { pratiche, fatture, documenti, appuntamenti } = useStudio();
  const { paese } = useStato();
  const { t, lingua } = useTesti();
  const aperte = pratiche.filter((p) => p.clienteId === c.id && p.stato === 'aperta').length;
  const daIncassare = fatture
    .filter((f) => f.clienteId === c.id && ['in_attesa', 'scaduta'].includes(statoFattura(f)))
    .reduce((s, f) => s + totaliFattura(f, paese).residuo, 0);
  const prossimi = appuntamenti
    .filter((a) => a.clienteId === c.id && a.stato === 'programmato' && giorniDaOggi(a.inizio) >= 0)
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .slice(0, 3);
  const svizzera = paese === 'CH';

  const indirizzo = [
    [c.indirizzo, c.numeroCivico].filter(Boolean).join(' '),
    [c.cap, c.citta].filter(Boolean).join(' '),
    svizzera ? c.cantone : c.provincia,
    c.paese && c.paese !== paese ? c.paese : null,
  ]
    .filter(Boolean)
    .join(', ');
  const v = (k: Parameters<typeof t>[0]) => t(k);
  const voci: [string, string][] = [];
  if (!c.giuridica) {
    if (svizzera && c.avs) voci.push([v('clienti.scheda.voci.avs'), c.avs]);
    if (!svizzera && c.cf) voci.push([v('clienti.scheda.voci.cf'), c.cf]);
    if (!svizzera && c.piva) voci.push([v('clienti.scheda.voci.piva'), c.piva]);
    if (c.dataNascita || c.luogoNascita)
      voci.push([
        v('clienti.scheda.voci.nascita'),
        c.dataNascita && c.luogoNascita
          ? t('clienti.scheda.voci.nascitaTesto', {
              data: dataPerCampo(c.dataNascita),
              luogo: c.luogoNascita,
            })
          : (c.luogoNascita ?? dataPerCampo(c.dataNascita)),
      ]);
  } else {
    if (svizzera && c.uid) voci.push([v('clienti.scheda.voci.uid'), c.uid]);
    if (svizzera && c.formaGiuridica) voci.push([v('clienti.scheda.voci.forma'), c.formaGiuridica]);
    if (svizzera)
      voci.push([
        v('clienti.scheda.voci.iva'),
        c.ivaAttiva ? v('clienti.scheda.voci.ivaSi') : v('clienti.scheda.voci.ivaNo'),
      ]);
    if (!svizzera && c.piva) voci.push([v('clienti.scheda.voci.piva'), c.piva]);
    if (!svizzera && c.cf) voci.push([v('clienti.scheda.voci.cf'), c.cf]);
    if (c.sedeLegale) voci.push([v('clienti.scheda.voci.sede'), c.sedeLegale]);
    const r = c.rappresentante;
    if (r && (r.nome || r.cognome))
      voci.push([
        v('clienti.scheda.voci.rappresentante'),
        [[r.nome, r.cognome].filter(Boolean).join(' '), r.carica].filter(Boolean).join(', '),
      ]);
  }
  if (c.pec) voci.push([v('clienti.scheda.voci.pec'), c.pec]);
  if (indirizzo) voci.push([v('clienti.scheda.voci.indirizzo'), indirizzo]);
  if (!svizzera && c.codiceDestinatario) voci.push([v('clienti.scheda.voci.sdi'), c.codiceDestinatario]);
  if (!svizzera && c.pecFatturazione)
    voci.push([v('clienti.scheda.voci.pecFatturazione'), c.pecFatturazione]);
  if (c.noteIniziali) voci.push([v('clienti.scheda.voci.noteIniziali'), c.noteIniziali]);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Monogramma nome={c.nome} giuridica={c.giuridica} grande />
        <View style={{ flex: 1, gap: 6 }}>
          <Testo tipo="dS">{c.nome}</Testo>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge>{c.giuridica ? t('clienti.tipo.giuridica') : t('clienti.tipo.fisica')}</Badge>
            <Badge tono={c.portale ? 'ok' : 'neutro'}>
              {c.portale ? t('clienti.scheda.portaleAttivo') : t('clienti.scheda.portaleSpento')}
            </Badge>
          </View>
          {c.creato ? (
            <Testo tipo="mini">
              {t('clienti.scheda.clienteDal', { data: dataCompleta(c.creato, lingua) })}
            </Testo>
          ) : null}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {c.email ? (
          <Contatto icona="email" testo={c.email} onPress={() => void Linking.openURL(`mailto:${c.email}`)} />
        ) : null}
        {c.telefono ? (
          <Contatto
            icona="fumetto"
            testo={c.telefono}
            onPress={() => void Linking.openURL(`tel:${c.telefono!.replace(/\s/g, '')}`)}
          />
        ) : null}
      </View>

      <View style={stili.numeri}>
        <Numero
          titolo={t('clienti.scheda.numeri.pratiche')}
          valore={String(aperte)}
          onPress={() => onScheda('pratiche')}
        />
        <Numero
          titolo={t('clienti.scheda.numeri.daIncassare')}
          valore={importo(daIncassare, paese)}
          onPress={() => onScheda('pagamenti')}
        />
        <Numero
          titolo={t('clienti.scheda.numeri.documenti')}
          valore={String(documenti.filter((d) => d.clienteId === c.id).length)}
          onPress={() => onScheda('documenti')}
        />
      </View>

      <View style={{ gap: 10 }}>
        <View style={stili.titoloSezione}>
          <Eyebrow>{t('clienti.scheda.anagrafica')}</Eyebrow>
          <Pulsante
            titolo={t('clienti.scheda.modifica')}
            icona="modifica"
            variante="linea"
            piccolo
            onPress={onModifica}
          />
        </View>
        {voci.length > 0 ? <ElencoDefinizioni voci={voci} larghezzaTermine={118} /> : null}
      </View>

      <Pressable onPress={onAccesso} accessibilityRole="button" style={stili.riquadro}>
        <IconaQuadrata nome="lucchetto" tenue={!c.portale} />
        <View style={{ flex: 1, gap: 3 }}>
          <Testo medio>{t('clienti.scheda.accesso')}</Testo>
          <Testo tipo="small" colore={colori.fg2}>
            {c.portale
              ? t('clienti.scheda.accessoAttivo', { email: c.email ?? '' })
              : t('clienti.scheda.accessoSpento')}
          </Testo>
        </View>
        <Icona nome="avanti" dimensione={18} colore={colori.fg3} />
      </Pressable>

      <View style={{ gap: 10 }}>
        <Eyebrow>{t('clienti.scheda.prossimi')}</Eyebrow>
        {prossimi.length === 0 ? (
          <Testo tipo="small" colore={colori.fg3}>
            {t('clienti.scheda.nessunAppuntamento')}
          </Testo>
        ) : null}
        {prossimi.map((a) => (
          <View key={a.id} style={stili.voce}>
            <IconaQuadrata
              nome={a.tipo === 'udienza' ? 'tribunale' : 'calendario'}
              tenue
              lato={34}
              dimensione={17}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Testo medio>{a.titolo}</Testo>
              <Testo tipo="cap">
                {dataCompleta(a.inizio, lingua)} · {ora(a.inizio)}
              </Testo>
            </View>
          </View>
        ))}
        <Pulsante
          titolo={t('clienti.scheda.fissa')}
          icona="piu"
          variante="linea"
          piccolo
          allineaASinistra
          onPress={onAppuntamento}
        />
      </View>
    </View>
  );
}

function Contatto({
  icona,
  testo,
  onPress,
}: {
  icona: 'email' | 'fumetto';
  testo: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={stili.contatto}>
      <Icona nome={icona} dimensione={18} colore={colori.accentText} />
      <Testo tipo="small" colore={colori.accentText}>
        {testo}
      </Testo>
    </Pressable>
  );
}

function Numero({ titolo, valore, onPress }: { titolo: string; valore: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={stili.numero}>
      <Testo tipo="mini">{titolo}</Testo>
      <Testo medio>{valore}</Testo>
    </Pressable>
  );
}

function Pratiche({ cliente, onNuova }: { cliente: Cliente; onNuova: () => void }) {
  const { pratiche } = useStudio();
  const { t, lingua } = useTesti();
  const sue = pratiche
    .filter((p) => p.clienteId === cliente.id)
    .sort((a, b) => (a.stato === b.stato ? b.creata.localeCompare(a.creata) : a.stato === 'aperta' ? -1 : 1));
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('clienti.scheda.pratiche.titolo', { n: sue.length })}</Eyebrow>
        <Pulsante
          titolo={t('clienti.scheda.pratiche.nuova')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onNuova}
        />
      </View>
      {sue.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.pratiche.vuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {sue.map((p) => (
          <Riga
            key={p.id}
            inAlto
            sinistra={<IconaQuadrata nome="bilancia" tenue={p.stato === 'chiusa'} />}
            titolo={p.titolo}
            sottotitolo={`${nomeTipoCausa(p.tipo, lingua)} · ${dataBreve(p.creata, lingua)}`}
            sotto={
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Badge tono={p.stato === 'aperta' ? 'ok' : 'neutro'}>
                  {p.stato === 'aperta' ? t('studio.statiPratica.aperta') : t('studio.statiPratica.chiusa')}
                </Badge>
              </View>
            }
            freccia="avanti"
            onPress={() => router.push({ pathname: '/pratiche/[id]', params: { id: p.id } })}
          />
        ))}
      </View>
    </View>
  );
}

function Documenti({
  cliente,
  onCondividi,
  onCarica,
  onCollega,
  onApri,
}: {
  cliente: Cliente;
  onCondividi: () => void;
  onCarica: () => void;
  onCollega: () => void;
  onApri: (d: DocumentoStudio) => void;
}) {
  const { portale, documenti, pratiche, categorie, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const nelPortale = portale
    .filter((d) => d.clienteId === cliente.id)
    .sort((a, b) => b.quando.localeCompare(a.quando));
  const inArchivio = documentiDi(documenti, { clienteId: cliente.id });
  return (
    <View style={{ gap: 14 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('clienti.scheda.documenti.portaleTitolo')}</Eyebrow>
        <Pulsante
          titolo={t('clienti.scheda.documenti.condividi')}
          icona="condividi"
          variante="linea"
          piccolo
          onPress={onCondividi}
        />
      </View>
      <Testo tipo="cap">{t('clienti.scheda.documenti.portaleTesto')}</Testo>
      {nelPortale.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.documenti.portaleVuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {nelPortale.map((d) => (
          <Riga
            key={d.id}
            stretta
            sinistra={<IconaQuadrata nome="documento" tenue lato={34} dimensione={17} />}
            titolo={d.nome}
            sottotitolo={`${dataBreve(d.quando, lingua)} · ${d.dimensione}`}
            sotto={
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Badge tono={d.da === 'cliente' ? 'oro' : 'neutro'}>
                  {d.da === 'cliente'
                    ? t('clienti.scheda.documenti.dalCliente')
                    : t('clienti.scheda.documenti.dalloStudio')}
                </Badge>
              </View>
            }
            destra={
              d.da === 'studio' ? (
                <PulsanteIcona
                  icona="chiudi"
                  dimensione={18}
                  etichetta={t('clienti.scheda.documenti.togli', { nome: d.nome })}
                  onPress={() => azioni.rimuoviDalPortale(d.id)}
                />
              ) : undefined
            }
          />
        ))}
      </View>

      <View style={[stili.titoloSezione, { marginTop: 10 }]}>
        <Eyebrow>{t('clienti.scheda.documenti.archivioTitolo')}</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pulsante
            titolo={t('clienti.scheda.documenti.collega')}
            variante="linea"
            piccolo
            onPress={onCollega}
          />
          <Pulsante
            titolo={t('clienti.scheda.documenti.carica')}
            icona="carica"
            variante="linea"
            piccolo
            onPress={onCarica}
          />
        </View>
      </View>
      <Testo tipo="cap">{t('clienti.scheda.documenti.archivioTesto')}</Testo>
      {inArchivio.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.documenti.archivioVuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {inArchivio.map((d) => (
          <Riga
            key={d.id}
            inAlto
            sinistra={<IconaQuadrata nome="documento" tenue />}
            titolo={d.titolo}
            sottotitolo={[percorsoCategoria(categorie, d), dataBreve(d.quando, lingua), d.dimensione]
              .filter(Boolean)
              .join(' · ')}
            sotto={
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <Badge tono={d.stato === 'Indicizzato' ? 'ok' : 'warn'}>
                  {t(`archivio.stati.${d.stato}`)}
                </Badge>
                {d.praticaId ? (
                  <Badge tono="oro">{pratiche.find((p) => p.id === d.praticaId)?.titolo ?? ''}</Badge>
                ) : null}
              </View>
            }
            onPress={() => onApri(d)}
          />
        ))}
      </View>
    </View>
  );
}

function Comunicazioni({ cliente, onNuova }: { cliente: Cliente; onNuova: () => void }) {
  const { comunicazioni } = useStudio();
  const { t, lingua } = useTesti();
  const sue = comunicazioni
    .filter((x) => x.clienteId === cliente.id)
    .sort((a, b) => {
      const ultimo = (x: typeof a) => x.messaggi[x.messaggi.length - 1]?.quando ?? x.creato;
      return ultimo(b).localeCompare(ultimo(a));
    });
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Eyebrow>{t('clienti.scheda.comunicazioni.titolo', { n: sue.length })}</Eyebrow>
        <Pulsante
          titolo={t('clienti.scheda.comunicazioni.nuova')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={onNuova}
        />
      </View>
      {!cliente.portale ? (
        <Avviso tono="info" testo={t('clienti.scheda.comunicazioni.senzaPortale')} />
      ) : null}
      {sue.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.comunicazioni.vuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {sue.map((x) => {
          const ultimo = x.messaggi[x.messaggi.length - 1];
          const n = x.messaggi.length;
          return (
            <Riga
              key={x.id}
              inAlto
              sinistra={<IconaQuadrata nome="fumetto" tenue={x.stato === 'chiuso'} />}
              titolo={x.oggetto}
              sottotitolo={ultimo ? ultimo.testo : t('clienti.scheda.comunicazioni.nessunMessaggio')}
              sotto={
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <Badge tono={x.stato === 'aperto' ? 'ok' : 'neutro'}>
                    {x.stato === 'aperto'
                      ? t('clienti.scheda.comunicazioni.aperta')
                      : t('clienti.scheda.comunicazioni.chiusa')}
                  </Badge>
                  <Testo tipo="mini">
                    {n === 1
                      ? t('clienti.scheda.comunicazioni.unMessaggio')
                      : t('clienti.scheda.comunicazioni.messaggi', { n })}
                    {ultimo ? ` · ${dataBreve(ultimo.quando, lingua)}` : ''}
                  </Testo>
                </View>
              }
              freccia="avanti"
              onPress={() => router.push({ pathname: '/comunicazioni/[id]', params: { id: x.id } })}
            />
          );
        })}
      </View>
    </View>
  );
}

function Note({ cliente, onNota }: { cliente: Cliente; onNota: (n?: NotaCliente) => void }) {
  const { note, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const sue = note.filter((n) => n.clienteId === cliente.id).sort((a, b) => b.quando.localeCompare(a.quando));
  return (
    <View style={{ gap: 12 }}>
      <View style={stili.titoloSezione}>
        <Testo tipo="cap" style={{ flex: 1 }}>
          {t('clienti.scheda.note.avviso')}
        </Testo>
        <Pulsante
          titolo={t('clienti.scheda.note.aggiungi')}
          icona="piu"
          variante="linea"
          piccolo
          onPress={() => onNota(undefined)}
        />
      </View>
      {sue.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.note.vuoto')}
        </Testo>
      ) : null}
      {sue.map((n) => (
        <Scheda key={n.id} stile={{ gap: 8 }}>
          <Testo tipo="small">{n.testo}</Testo>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Testo tipo="mini" style={{ flex: 1 }}>
              {dataCompleta(n.quando, lingua)} · {ora(n.quando)}
              {n.modificata ? ` · ${t('clienti.scheda.note.modificata')}` : ''}
            </Testo>
            <PulsanteIcona
              icona="modifica"
              dimensione={18}
              etichetta={t('clienti.scheda.note.modifica')}
              onPress={() => onNota(n)}
            />
            <PulsanteIcona
              icona="cestino"
              dimensione={18}
              etichetta={t('clienti.scheda.note.elimina')}
              onPress={() => azioni.eliminaNota(n.id)}
            />
          </View>
        </Scheda>
      ))}
    </View>
  );
}

function Pagamenti({ cliente, onNuova }: { cliente: Cliente; onNuova: () => void }) {
  const { fatture } = useStudio();
  const { paese } = useStato();
  const { t, lingua } = useTesti();
  const sue = fatture
    .filter((f) => f.clienteId === cliente.id)
    .sort((a, b) => b.emessa.localeCompare(a.emessa));
  const aperte = sue.filter((f) => ['in_attesa', 'scaduta'].includes(statoFattura(f)));
  const daIncassare = aperte.reduce((s, f) => s + totaliFattura(f, paese).residuo, 0);
  const incassato = sue
    .filter((f) => statoFattura(f) !== 'annullata')
    .reduce((s, f) => s + totaliFattura(f, paese).pagato, 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={stili.numeri}>
        <View style={stili.numero}>
          <Testo tipo="mini">{t('clienti.scheda.pagamenti.daIncassare')}</Testo>
          <Testo medio colore={daIncassare > 0 ? colori.accentText : colori.fg}>
            {importo(daIncassare, paese)}
          </Testo>
        </View>
        <View style={stili.numero}>
          <Testo tipo="mini">{t('clienti.scheda.pagamenti.incassato')}</Testo>
          <Testo medio>{importo(incassato, paese)}</Testo>
        </View>
      </View>
      <Pulsante titolo={t('clienti.scheda.pagamenti.nuova')} icona="piu" variante="linea" onPress={onNuova} />
      {sue.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('clienti.scheda.pagamenti.vuoto')}
        </Testo>
      ) : null}
      <View style={{ marginHorizontal: -20 }}>
        {sue.map((f) => {
          const stato = statoFattura(f);
          const tot = totaliFattura(f, paese);
          return (
            <Riga
              key={f.id}
              inAlto
              sinistra={<IconaQuadrata nome="ricevuta" tenue={stato === 'annullata'} />}
              titolo={f.numero}
              sottotitolo={quandoFattura(f, lingua)}
              sotto={
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Badge tono={statiFattura[stato].tono}>{testoStato(stato, lingua)}</Badge>
                </View>
              }
              valore={importo(
                stato === 'in_attesa' || stato === 'scaduta' ? tot.residuo : tot.daIncassare,
                paese,
              )}
              onPress={() => router.push({ pathname: '/fatture/[id]', params: { id: f.id } })}
            />
          );
        })}
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 28 },
  // se il pulsante non sta accanto al titolo (tedesco, schermi stretti) va a capo
  titoloSezione: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 8,
  },
  numeri: { flexDirection: 'row', gap: 8 },
  numero: {
    flex: 1,
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  contatto: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  riquadro: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
});
