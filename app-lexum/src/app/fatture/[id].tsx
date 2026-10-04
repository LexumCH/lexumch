import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, Badge, BarraAzioni, ElencoDefinizioni, TitoloSezione } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import type { Fattura } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { strumentiStudio } from '@/ruoli';
import { importo, statoFattura, totaliConNote } from '@/studio/calcoli';
import { CampoData, Scelta, leggiData, useRiapertura } from '@/studio/Campi';
import {
  elenco,
  leggiImporto,
  mancanoAlCliente,
  mancanoAlProfessionista,
  metodiPagamento,
  nomeMetodo,
  quandoFattura,
  scriviImporto,
  statiFattura,
  testoStato,
} from '@/studio/fatturazione';
import { dataBreve, dataCompleta, dataNumerica } from '@/studio/formati';
import { TotaliFattura } from '@/studio/TotaliFattura';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type FoglioFattura = 'azioni' | 'pagamento' | 'annulla' | 'pdf' | 'pratica' | 'elimina' | 'xml';

// S6 · Dettaglio della fattura: righe, totali del paese, pagamenti, note di credito.
// Si registra un pagamento (anche parziale), si genera e si condivide il PDF.
// Come i siti dal 04-10-2026: si elimina solo se non è emessa (niente PDF); una volta emessa,
// in Italia si storna con una nota di credito (e c'è l'XML FatturaPA), in Svizzera si annulla.
export default function DettaglioFattura() {
  const { id, foglio: parametroFoglio } = useLocalSearchParams<{ id: string; foglio?: FoglioFattura }>();
  const { paese, ruoli } = useStato();
  const { fatture, clienti, pratiche, fatturazione, azioni } = useStudio();
  // «Collega a una pratica» solo per chi ha le pratiche (gli avvocati)
  const conPratiche = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');
  const { t: testo, lingua } = useTesti();
  const fattura = fatture.find((f) => f.id === id);
  const foglio = parametroFoglio ?? null;
  const setFoglio = (f: FoglioFattura | null) => router.setParams({ foglio: f ?? undefined });
  const chiudi = () => setFoglio(null);

  if (!fattura) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/fatture" />}
          titolo={testo('fatture.dettaglio.fattura')}
        />
        <StatoVuoto
          icona="ricevuta"
          titolo={testo('fatture.dettaglio.nonCe')}
          azione={{ titolo: testo('fatture.dettaglio.tornaFatture'), onPress: () => indietro('/fatture') }}
        />
      </Schermata>
    );
  }

  const stato = statoFattura(fattura);
  const t = totaliConNote(fattura, fatture, paese);
  const nc = fattura.tipo === 'TD04';
  const origine = fatture.find((f) => f.id === fattura.origineId);
  const note = fatture.filter((f) => f.tipo === 'TD04' && f.origineId === fattura.id);
  const emessaPdf = !!fattura.pdf;
  const eliminabile = !emessaPdf && note.length === 0;
  const stornabile = paese === 'IT' && !nc && emessaPdf && stato !== 'annullata' && t.daIncassare > 0.01;
  const annullabile = paese === 'CH' && emessaPdf && (stato === 'in_attesa' || stato === 'scaduta');
  // XML FatturaPA (genera-fattura-xml): se mancano dati, la funzione dice quali.
  const clienteFattura = clienti.find((c) => c.id === fattura.clienteId);
  const mancaXml =
    paese === 'IT'
      ? [
          ...mancanoAlProfessionista(fatturazione, 'IT', lingua),
          ...(clienteFattura ? mancanoAlCliente(clienteFattura, 'IT', lingua) : []),
        ]
      : [];
  const fileXml = `IT${(fatturazione.piva ?? '').replace(/\s/g, '')}_${fattura.numero.replace(/\D/g, '').slice(-5)}.xml`;
  const pratica = pratiche.find((p) => p.id === fattura.praticaId);
  const daPagare = stato === 'in_attesa' || stato === 'scaduta';
  const nomeFile = `${fattura.numero}.pdf`;

  const info: [string, string][] = [[testo('fatture.voci.emessa'), dataCompleta(fattura.emessa, lingua)]];
  if (fattura.scadenza) info.push([testo('fatture.voci.scadenza'), dataCompleta(fattura.scadenza, lingua)]);
  if (fattura.periodo) info.push([testo('fatture.voci.prestazione'), fattura.periodo]);
  if (fattura.lingua)
    info.push([
      testo('fatture.fisco.lingua'),
      { it: 'Italiano', de: 'Deutsch', fr: 'Français' }[fattura.lingua],
    ]);
  info.push([testo('fatture.voci.pagamento'), nomeMetodo(fattura.metodo, lingua)]);
  const iban = fattura.iban ?? fatturazione.iban;
  if (iban && fattura.metodo !== 'Contanti') info.push([testo('fatture.voci.iban'), iban]);

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta={testo('fatture.dettaglio.tornaFatture')} />}
        titolo={fattura.numero}
        destra={
          stato !== 'annullata' ? (
            <PulsanteIcona
              icona="altro"
              etichetta={testo('fatture.dettaglio.altreAzioni')}
              onPress={() => setFoglio('azioni')}
            />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={stili.corpo}>
        <View style={{ gap: 10 }}>
          <View style={stili.stato}>
            {nc ? <Badge tono="oro">{testo('fatture.nc.titolo')}</Badge> : null}
            <Badge tono={statiFattura[stato].tono}>{testoStato(stato, lingua)}</Badge>
            <Text style={[stili.quando, stato === 'scaduta' && { color: colori.danger }]}>
              {quandoFattura(fattura, lingua)}
            </Text>
          </View>
          <Testo tipo="dS">{nomeCliente(clienti, fattura.clienteId)}</Testo>
          {origine ? (
            <Pressable
              onPress={() => router.push({ pathname: '/fatture/[id]', params: { id: origine.id } })}
              accessibilityRole="link"
              style={stili.pratica}
            >
              <Icona nome="ricevuta" dimensione={16} colore={colori.accentText} />
              <Text style={stili.praticaTesto} numberOfLines={1}>
                {testo('fatture.nc.aStorno', { numero: origine.numero })}
              </Text>
            </Pressable>
          ) : null}
          {pratica ? (
            <Pressable
              onPress={() => router.push({ pathname: '/pratiche/[id]', params: { id: pratica.id } })}
              accessibilityRole="link"
              style={stili.pratica}
            >
              <Icona nome="bilancia" dimensione={16} colore={colori.accentText} />
              <Text style={stili.praticaTesto} numberOfLines={1}>
                {pratica.titolo}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={stili.cifra}>
          <Text style={stili.cifraTitolo}>
            {daPagare
              ? t.pagato > 0
                ? testo('fatture.dettaglio.restaDaIncassare')
                : testo('fatture.elenco.daIncassare')
              : testo('fatture.totali.totale')}
          </Text>
          <Text
            style={[
              stili.cifraValore,
              stato === 'annullata' && { color: colori.fg3, textDecorationLine: 'line-through' },
            ]}
          >
            {importo(daPagare ? t.residuo : stato === 'annullata' || nc ? t.netto : t.daIncassare, paese)}
          </Text>
          {t.ritenuta > 0 ? <Testo tipo="cap">{testo('fatture.dettaglio.alNetto')}</Testo> : null}
        </View>

        <ElencoDefinizioni voci={info} larghezzaTermine={96} />

        <View>
          <TitoloSezione stile={stili.titoloSezione}>{testo('fatture.voci.prestazioni')}</TitoloSezione>
          {fattura.righe.map((r) => (
            <View key={r.id} style={stili.riga}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={stili.rigaTesto}>{r.descrizione}</Text>
                {r.quantita !== 1 ? (
                  <Testo tipo="cap">{`${String(r.quantita).replace('.', ',')} × ${importo(r.prezzo, paese)}`}</Testo>
                ) : null}
              </View>
              <Text style={stili.rigaImporto}>{importo(r.quantita * r.prezzo, paese)}</Text>
            </View>
          ))}
        </View>

        <TotaliFattura fattura={fattura} totali={t} paese={paese} cassa={fatturazione.cassa} />

        <View>
          <TitoloSezione stile={stili.titoloSezione}>{testo('fatture.dettaglio.pagamenti')}</TitoloSezione>
          {fattura.pagamenti.length === 0 ? (
            <Testo tipo="small" colore={colori.fg3} style={{ paddingVertical: 10 }}>
              {testo('fatture.dettaglio.nessunPagamento')}
            </Testo>
          ) : (
            fattura.pagamenti.map((p) => (
              <View key={p.id} style={stili.riga}>
                <Icona nome="spunta" dimensione={18} colore={colori.ok} />
                <Text
                  style={[stili.rigaTesto, { flex: 1 }]}
                >{`${dataBreve(p.data, lingua)} · ${nomeMetodo(p.metodo, lingua)}`}</Text>
                <Text style={stili.rigaImporto}>{importo(p.importo, paese)}</Text>
              </View>
            ))
          )}
          {daPagare && t.pagato > 0 ? (
            <View style={[stili.riga, { borderBottomWidth: 0 }]}>
              <Text style={[stili.rigaTesto, { flex: 1, color: colori.fg2 }]}>
                {testo('fatture.dettaglio.residuo')}
              </Text>
              <Text style={stili.rigaImporto}>{importo(t.residuo, paese)}</Text>
            </View>
          ) : null}
        </View>

        {note.length > 0 ? (
          <View>
            <TitoloSezione stile={stili.titoloSezione}>{testo('fatture.nc.elenco')}</TitoloSezione>
            {note.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => router.push({ pathname: '/fatture/[id]', params: { id: n.id } })}
                accessibilityRole="link"
                style={stili.riga}
              >
                <Icona nome="ricevuta" dimensione={18} colore={colori.accentText} />
                <Text
                  style={[stili.rigaTesto, { flex: 1 }]}
                >{`${n.numero} · ${dataBreve(n.emessa, lingua)}`}</Text>
                <Text
                  style={stili.rigaImporto}
                >{`− ${importo(totaliConNote(n, fatture, paese).netto, paese)}`}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {paese === 'IT' ? (
          <Testo tipo="cap" colore={colori.fg3}>
            {testo('fatture.xml.nota')}
          </Testo>
        ) : null}
        {emessaPdf && !nc && stato !== 'annullata' ? (
          <Testo tipo="cap" colore={colori.fg3}>
            {paese === 'IT'
              ? testo('fatture.emissione.nonEliminaIT')
              : testo('fatture.emissione.nonEliminaCH')}
          </Testo>
        ) : null}
      </ScrollView>

      {stato !== 'annullata' ? (
        <BarraAzioni>
          {daPagare ? (
            <Pulsante
              titolo={testo('fatture.dettaglio.registraPagamento')}
              stile={{ flex: 1 }}
              onPress={() => setFoglio('pagamento')}
            />
          ) : null}
          <Pulsante
            titolo={fattura.pdf ? 'PDF' : testo('fatture.dettaglio.generaPdf')}
            icona={fattura.pdf ? 'documento' : undefined}
            variante={daPagare ? 'linea' : 'oro'}
            stile={daPagare ? undefined : { flex: 1 }}
            onPress={() => {
              if (!fattura.pdf) azioni.generaPdf(fattura.id);
              setFoglio('pdf');
            }}
          />
        </BarraAzioni>
      ) : null}

      <Foglio visibile={foglio === 'azioni'} onChiudi={chiudi}>
        <Testo tipo="dS">
          {nc
            ? testo('fatture.nc.numero', { numero: fattura.numero })
            : testo('fatture.dettaglio.fatturaNumero', { numero: fattura.numero })}
        </Testo>
        <View style={{ marginHorizontal: -20 }}>
          {conPratiche && !nc ? (
            <Riga
              stretta
              sinistra={<Icona nome="bilancia" dimensione={20} colore={colori.fg2} />}
              titolo={pratica ? testo('documenti.fattura.cambia') : testo('documenti.fattura.collega')}
              onPress={() => setFoglio('pratica')}
            />
          ) : null}
          {conPratiche && pratica ? (
            <Riga
              stretta
              sinistra={<Icona nome="chiudi" dimensione={20} colore={colori.fg2} />}
              titolo={testo('documenti.fattura.scollega')}
              onPress={() => {
                azioni.collegaFattura(fattura.id, null);
                chiudi();
              }}
            />
          ) : null}
          {fattura.pdf ? (
            <Riga
              stretta
              sinistra={<Icona nome="riprova" dimensione={20} colore={colori.fg2} />}
              titolo={testo('fatture.dettaglio.rigeneraPdf')}
              sottotitolo={testo('fatture.dettaglio.rigeneraQuando')}
              onPress={() => {
                azioni.generaPdf(fattura.id);
                setFoglio('pdf');
              }}
            />
          ) : null}
          {stornabile ? (
            <Riga
              stretta
              sinistra={<Icona nome="riprova" dimensione={20} colore={colori.fg2} />}
              titolo={testo('fatture.nc.azione')}
              sottotitolo={testo('fatture.nc.azioneTesto')}
              onPress={() => {
                chiudi();
                router.push({ pathname: '/fatture/nuova', params: { storno: fattura.id } });
              }}
            />
          ) : null}
          {paese === 'IT' ? (
            <Riga
              stretta
              sinistra={<Icona nome="documento" dimensione={20} colore={colori.fg2} />}
              titolo={testo('fatture.xml.azione')}
              sottotitolo={testo('fatture.xml.azioneTesto')}
              onPress={() => setFoglio('xml')}
            />
          ) : null}
          {annullabile ? (
            <Riga
              stretta
              sinistra={<Icona nome="chiudi" dimensione={20} colore={colori.danger} />}
              titolo={testo('fatture.dettaglio.annulla')}
              titoloStile={{ color: colori.danger }}
              onPress={() => setFoglio('annulla')}
            />
          ) : null}
          {eliminabile ? (
            <Riga
              stretta
              sinistra={<Icona nome="cestino" dimensione={20} colore={colori.danger} />}
              titolo={testo('fatture.emissione.elimina')}
              sottotitolo={testo('fatture.emissione.eliminaTesto')}
              titoloStile={{ color: colori.danger }}
              onPress={() => setFoglio('elimina')}
            />
          ) : null}
        </View>
      </Foglio>

      <Foglio visibile={foglio === 'elimina'} onChiudi={chiudi}>
        <Testo tipo="dS">{testo('fatture.emissione.eliminareDomanda', { numero: fattura.numero })}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {testo('fatture.emissione.eliminareTesto')}
        </Testo>
        <Pulsante
          titolo={testo('fatture.emissione.eliminaConferma')}
          variante="pericolo"
          onPress={() => {
            if (azioni.eliminaFattura(fattura.id) === 'ok') indietro('/fatture');
            else chiudi();
          }}
        />
        <Pulsante titolo={testo('fatture.dettaglio.lasciala')} variante="linea" onPress={chiudi} />
      </Foglio>

      <Foglio visibile={foglio === 'xml'} onChiudi={chiudi}>
        {mancaXml.length > 0 ? (
          <>
            <Testo tipo="dS">{testo('fatture.xml.azione')}</Testo>
            <Avviso testo={testo('fatture.xml.mancano', { elenco: elenco(mancaXml, lingua) })} />
            <Pulsante
              titolo={testo('fatture.nuova.completaDati')}
              onPress={() => router.push('/fatture/dati')}
            />
          </>
        ) : (
          <>
            <View style={stili.pdf}>
              <Icona nome="documento" dimensione={28} colore={colori.accentText} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={stili.rigaTesto}>{fileXml}</Text>
                <Testo tipo="cap">{testo('fatture.xml.pronto')}</Testo>
              </View>
            </View>
            <Testo tipo="small" colore={colori.fg2}>
              {testo('fatture.xml.spiega')}
            </Testo>
            <Pulsante
              titolo={testo('fatture.dettaglio.condividi')}
              icona="condividi"
              onPress={() => {
                Share.share({ title: fileXml, message: fileXml }).catch(() => undefined);
              }}
            />
          </>
        )}
      </Foglio>

      <Foglio visibile={foglio === 'pratica'} onChiudi={chiudi}>
        <View style={{ gap: 6 }}>
          <Testo tipo="dS">{testo('documenti.fattura.titolo')}</Testo>
          <Testo tipo="small" colore={colori.fg2}>
            {testo('documenti.fattura.testo', { nome: nomeCliente(clienti, fattura.clienteId) })}
          </Testo>
        </View>
        {pratiche.some((p) => p.clienteId === fattura.clienteId) ? (
          <Scelta
            voci={pratiche
              .filter((p) => p.clienteId === fattura.clienteId)
              .map((p) => ({ valore: p.id, titolo: p.titolo }))}
            valore={fattura.praticaId ?? null}
            onCambia={(v) => {
              azioni.collegaFattura(fattura.id, v);
              chiudi();
            }}
            etichettaGruppo={testo('documenti.fattura.titolo')}
          />
        ) : (
          <Testo tipo="small" colore={colori.fg3}>
            {testo('documenti.fattura.nessuna')}
          </Testo>
        )}
      </Foglio>

      <FoglioPagamento
        visibile={foglio === 'pagamento'}
        onChiudi={chiudi}
        fattura={fattura}
        residuo={t.residuo}
        paese={paese}
        onRegistra={(cifra, metodo, data) => {
          azioni.registraPagamento(fattura.id, cifra, metodo, data);
          chiudi();
        }}
      />

      <Foglio visibile={foglio === 'annulla'} onChiudi={chiudi}>
        <Testo tipo="dS">{testo('fatture.dettaglio.annullareDomanda', { numero: fattura.numero })}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {testo('fatture.dettaglio.annullareTesto')}
        </Testo>
        <Pulsante
          titolo={testo('fatture.dettaglio.annulla')}
          variante="pericolo"
          onPress={() => {
            azioni.annullaFattura(fattura.id);
            chiudi();
          }}
        />
        <Pulsante titolo={testo('fatture.dettaglio.lasciala')} variante="linea" onPress={chiudi} />
      </Foglio>

      <Foglio visibile={foglio === 'pdf'} onChiudi={chiudi}>
        <View style={stili.pdf}>
          <Icona nome="documento" dimensione={28} colore={colori.accentText} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={stili.rigaTesto}>{nomeFile}</Text>
            <Testo tipo="cap">
              {testo('fatture.dettaglio.generato', { data: dataNumerica(new Date().toISOString()) })}
            </Testo>
          </View>
        </View>
        <Pulsante
          titolo={testo('fatture.dettaglio.condividi')}
          icona="condividi"
          onPress={() => {
            Share.share({
              title: nomeFile,
              message: testo('fatture.dettaglio.fatturaNumero', { numero: fattura.numero }),
            }).catch(() => undefined);
          }}
        />
        <Pulsante
          titolo={testo('fatture.dettaglio.apriPdf')}
          variante="linea"
          icona="esterno"
          onPress={chiudi}
        />
      </Foglio>
    </Schermata>
  );
}

function FoglioPagamento({
  visibile,
  onChiudi,
  fattura,
  residuo,
  paese,
  onRegistra,
}: {
  visibile: boolean;
  onChiudi: () => void;
  fattura: Fattura;
  residuo: number;
  paese: string;
  onRegistra: (importo: number, metodo: string, data: string) => void;
}) {
  const { t, lingua } = useTesti();
  const metodi = metodiPagamento[paese] ?? metodiPagamento.IT;
  // Si parte dal residuo, dal metodo della fattura e da oggi: anche se il foglio è già aperto all'arrivo.
  const iniziale = () => ({
    testo: scriviImporto(residuo, paese),
    metodo: metodi.includes(fattura.metodo) ? fattura.metodo : metodi[0],
    data: dataNumerica(new Date().toISOString()),
  });
  const [testo, setTesto] = useState(() => iniziale().testo);
  const [metodo, setMetodo] = useState(() => iniziale().metodo);
  const [data, setData] = useState(() => iniziale().data);
  useRiapertura(visibile, () => {
    const i = iniziale();
    setTesto(i.testo);
    setMetodo(i.metodo);
    setData(i.data);
  });

  const cifra = leggiImporto(testo, paese);
  const giorno = leggiData(data);
  const troppo = cifra != null && cifra > residuo + 0.01;
  const errore =
    testo.trim() && cifra == null
      ? t('fatture.pagamento.erroreImporto')
      : troppo
        ? t('fatture.pagamento.piuDelResiduo', { importo: importo(residuo, paese) })
        : null;
  const pronto = cifra != null && cifra > 0 && !troppo && !!giorno;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">{t('fatture.pagamento.titolo')}</Testo>
      <Testo tipo="small" colore={colori.fg2}>
        {t('fatture.pagamento.residuo', { importo: importo(residuo, paese) })}
      </Testo>
      <Campo
        etichetta={t('fatture.pagamento.importo', { valuta: paese === 'CH' ? 'CHF' : '€' })}
        value={testo}
        onChangeText={setTesto}
        keyboardType="decimal-pad"
      />
      {errore ? <Avviso testo={errore} /> : null}
      <Scelta
        voci={metodi.map((m) => ({ valore: m, titolo: nomeMetodo(m, lingua) }))}
        valore={metodo}
        onCambia={setMetodo}
        etichettaGruppo={t('fatture.pagamento.metodo')}
      />
      <CampoData
        etichetta={t('fatture.pagamento.data')}
        valore={data}
        onCambia={setData}
        scorciatoie={[
          { titolo: t('fatture.scorciatoie.oggi'), giorni: 0 },
          { titolo: t('fatture.scorciatoie.ieri'), giorni: -1 },
        ]}
      />
      <Pulsante
        titolo={t('fatture.pagamento.registra')}
        disabilitato={!pronto}
        onPress={() => {
          if (cifra == null || !giorno) return;
          giorno.setHours(12, 0, 0, 0);
          onRegistra(cifra, metodo, giorno.toISOString());
        }}
      />
    </Foglio>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 22, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 28 },
  stato: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quando: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  pratica: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  praticaTesto: { flex: 1, fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.accentText },
  cifra: {
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colori.accentLine,
    backgroundColor: colori.bg2,
  },
  cifraTitolo: {
    fontFamily: famiglie.testoMedio,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colori.fg3,
  },
  cifraValore: { fontFamily: famiglie.titoloSemi, fontSize: 36, lineHeight: 40, color: colori.fg },
  titoloSezione: { paddingHorizontal: 0, paddingTop: 0 },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  rigaTesto: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 21, color: colori.fg },
  rigaImporto: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colori.line2,
  },
});
