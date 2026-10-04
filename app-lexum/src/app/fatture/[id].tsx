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
import { indietro } from '@/navigazione';
import { importo, statoFattura, totaliFattura } from '@/studio/calcoli';
import { CampoData, Scelta, leggiData, useRiapertura } from '@/studio/Campi';
import {
  leggiImporto,
  metodiPagamento,
  quandoFattura,
  scriviImporto,
  statiFattura,
} from '@/studio/fatturazione';
import { dataBreve, dataCompleta, dataNumerica } from '@/studio/formati';
import { TotaliFattura } from '@/studio/TotaliFattura';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type FoglioFattura = 'azioni' | 'pagamento' | 'annulla' | 'pdf';

// S6 · Dettaglio della fattura: righe, totali del paese, pagamenti.
// Si registra un pagamento (anche parziale), si genera e si condivide il PDF, si annulla.
// Eliminare resta sul sito, come la modifica (che sul sito non esiste).
export default function DettaglioFattura() {
  const { id, foglio: parametroFoglio } = useLocalSearchParams<{ id: string; foglio?: FoglioFattura }>();
  const { paese } = useStato();
  const { fatture, clienti, pratiche, fatturazione, azioni } = useStudio();
  const fattura = fatture.find((f) => f.id === id);
  const foglio = parametroFoglio ?? null;
  const setFoglio = (f: FoglioFattura | null) => router.setParams({ foglio: f ?? undefined });
  const chiudi = () => setFoglio(null);

  if (!fattura) {
    return (
      <Schermata>
        <Intestazione sinistra={<BottoneIndietro ripiego="/fatture" />} titolo="Fattura" />
        <StatoVuoto
          icona="ricevuta"
          titolo="Questa fattura non c'è più"
          azione={{ titolo: 'Torna alle fatture', onPress: () => indietro('/fatture') }}
        />
      </Schermata>
    );
  }

  const stato = statoFattura(fattura);
  const t = totaliFattura(fattura, paese);
  const pratica = pratiche.find((p) => p.id === fattura.praticaId);
  const daPagare = stato === 'in_attesa' || stato === 'scaduta';
  const nomeFile = `${fattura.numero}.pdf`;

  const info: [string, string][] = [['Emessa', dataCompleta(fattura.emessa)]];
  if (fattura.scadenza) info.push(['Scadenza', dataCompleta(fattura.scadenza)]);
  if (fattura.periodo) info.push(['Prestazione', fattura.periodo]);
  info.push(['Pagamento', fattura.metodo]);
  const iban = fattura.iban ?? fatturazione.iban;
  if (iban && fattura.metodo !== 'Contanti') info.push(['IBAN', iban]);

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta="Torna alle fatture" />}
        titolo={fattura.numero}
        destra={
          stato !== 'annullata' ? (
            <PulsanteIcona icona="altro" etichetta="Altre azioni" onPress={() => setFoglio('azioni')} />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={stili.corpo}>
        <View style={{ gap: 10 }}>
          <View style={stili.stato}>
            <Badge tono={statiFattura[stato].tono}>{statiFattura[stato].testo}</Badge>
            <Text style={[stili.quando, stato === 'scaduta' && { color: colori.danger }]}>
              {quandoFattura(fattura)}
            </Text>
          </View>
          <Testo tipo="dS">{nomeCliente(clienti, fattura.clienteId)}</Testo>
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
            {daPagare ? (t.pagato > 0 ? 'Resta da incassare' : 'Da incassare') : 'Totale'}
          </Text>
          <Text
            style={[
              stili.cifraValore,
              stato === 'annullata' && { color: colori.fg3, textDecorationLine: 'line-through' },
            ]}
          >
            {importo(daPagare ? t.residuo : t.daIncassare, paese)}
          </Text>
          {t.ritenuta > 0 ? (
            <Testo tipo="cap">{`Al netto della ritenuta d'acconto: il cliente la versa al fisco.`}</Testo>
          ) : null}
        </View>

        <ElencoDefinizioni voci={info} larghezzaTermine={96} />

        <View>
          <TitoloSezione stile={stili.titoloSezione}>Prestazioni</TitoloSezione>
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
          <TitoloSezione stile={stili.titoloSezione}>Pagamenti</TitoloSezione>
          {fattura.pagamenti.length === 0 ? (
            <Testo tipo="small" colore={colori.fg3} style={{ paddingVertical: 10 }}>
              Nessun pagamento registrato.
            </Testo>
          ) : (
            fattura.pagamenti.map((p) => (
              <View key={p.id} style={stili.riga}>
                <Icona nome="spunta" dimensione={18} colore={colori.ok} />
                <Text style={[stili.rigaTesto, { flex: 1 }]}>{`${dataBreve(p.data)} · ${p.metodo}`}</Text>
                <Text style={stili.rigaImporto}>{importo(p.importo, paese)}</Text>
              </View>
            ))
          )}
          {daPagare && t.pagato > 0 ? (
            <View style={[stili.riga, { borderBottomWidth: 0 }]}>
              <Text style={[stili.rigaTesto, { flex: 1, color: colori.fg2 }]}>Residuo</Text>
              <Text style={stili.rigaImporto}>{importo(t.residuo, paese)}</Text>
            </View>
          ) : null}
        </View>

        {paese === 'IT' ? (
          <Testo tipo="cap" colore={colori.fg3}>
            Il PDF non è una fattura elettronica: non passa dal Sistema di Interscambio (SDI).
          </Testo>
        ) : null}
      </ScrollView>

      {stato !== 'annullata' ? (
        <BarraAzioni>
          {daPagare ? (
            <Pulsante
              titolo="Registra pagamento"
              stile={{ flex: 1 }}
              onPress={() => setFoglio('pagamento')}
            />
          ) : null}
          <Pulsante
            titolo={fattura.pdf ? 'PDF' : 'Genera il PDF'}
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
        <Testo tipo="dS">{`Fattura ${fattura.numero}`}</Testo>
        <View style={{ marginHorizontal: -20 }}>
          {fattura.pdf ? (
            <Riga
              stretta
              sinistra={<Icona nome="riprova" dimensione={20} colore={colori.fg2} />}
              titolo="Rigenera il PDF"
              sottotitolo="Dopo un pagamento o un cambio dei tuoi dati"
              onPress={() => {
                azioni.generaPdf(fattura.id);
                setFoglio('pdf');
              }}
            />
          ) : null}
          {daPagare ? (
            <Riga
              stretta
              sinistra={<Icona nome="chiudi" dimensione={20} colore={colori.danger} />}
              titolo="Annulla la fattura"
              titoloStile={{ color: colori.danger }}
              onPress={() => setFoglio('annulla')}
            />
          ) : null}
        </View>
        <Testo tipo="cap">
          Per eliminare una fattura vai sul sito: si può, ma lascia un vuoto nella numerazione.
        </Testo>
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
        <Testo tipo="dS">{`Annullare la fattura ${fattura.numero}?`}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Resta nell'elenco come annullata e il suo numero non si usa più. Non si torna indietro.
        </Testo>
        <Pulsante
          titolo="Annulla la fattura"
          variante="pericolo"
          onPress={() => {
            azioni.annullaFattura(fattura.id);
            chiudi();
          }}
        />
        <Pulsante titolo="Lasciala com'è" variante="linea" onPress={chiudi} />
      </Foglio>

      <Foglio visibile={foglio === 'pdf'} onChiudi={chiudi}>
        <View style={stili.pdf}>
          <Icona nome="documento" dimensione={28} colore={colori.accentText} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={stili.rigaTesto}>{nomeFile}</Text>
            <Testo tipo="cap">{`Generato · ${dataNumerica(new Date().toISOString())}`}</Testo>
          </View>
        </View>
        <Pulsante
          titolo="Condividi"
          icona="condividi"
          onPress={() => {
            Share.share({ title: nomeFile, message: `Fattura ${fattura.numero}` }).catch(() => undefined);
          }}
        />
        <Pulsante titolo="Apri il PDF" variante="linea" icona="esterno" onPress={chiudi} />
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
      ? 'Scrivi un importo, per esempio 250,00.'
      : troppo
        ? `È più del residuo (${importo(residuo, paese)}).`
        : null;
  const pronto = cifra != null && cifra > 0 && !troppo && !!giorno;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">Registra un pagamento</Testo>
      <Testo tipo="small" colore={colori.fg2}>
        {`Residuo: ${importo(residuo, paese)}. Puoi registrare anche un pagamento parziale.`}
      </Testo>
      <Campo
        etichetta={`Importo (${paese === 'CH' ? 'CHF' : '€'})`}
        value={testo}
        onChangeText={setTesto}
        keyboardType="decimal-pad"
      />
      {errore ? <Avviso testo={errore} /> : null}
      <Scelta voci={metodi} valore={metodo} onCambia={setMetodo} etichettaGruppo="Metodo" />
      <CampoData
        etichetta="Data dell'incasso"
        valore={data}
        onCambia={setData}
        scorciatoie={[
          { titolo: 'Oggi', giorni: 0 },
          { titolo: 'Ieri', giorni: -1 },
        ]}
      />
      <Pulsante
        titolo="Registra il pagamento"
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
