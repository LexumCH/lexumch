import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import {
  Avviso,
  Barra,
  BarraAzioni,
  ElencoDefinizioni,
  IconaQuadrata,
  Interruttore,
  Segmentato,
  TitoloSezione,
} from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { RigaFattura } from '@/dati-finti/studio';
import { strumentiStudio } from '@/ruoli';
import { importo, totaliFattura } from '@/studio/calcoli';
import { CampoData, Scelta, leggiData, traGiorni } from '@/studio/Campi';
import {
  aliquotaIvaCH,
  elenco,
  leggiImporto,
  mancanoAlCliente,
  mancanoAlProfessionista,
  metodiPagamento,
  motiviEsenzioneCH,
  nomeContributo,
} from '@/studio/fatturazione';
import { dataCompleta, dataNumerica, nomeMese } from '@/studio/formati';
import { TotaliFattura } from '@/studio/TotaliFattura';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio, type Parcella } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

const passi = ['Cliente', 'Prestazioni', 'Fisco e pagamento', 'Controlla'] as const;

let contatoreRighe = 0;
const idRiga = () => `nr${Date.now().toString(36)}${(contatoreRighe++).toString(36)}`;

// S7 · Nuova fattura, a passi. Due processi diversi:
// - Italia: contributo cassa (CPA 4%), IVA 22% su imponibile + CPA, ritenuta d'acconto 20% se il cliente
//   è sostituto d'imposta; per gli avvocati c'è il calcolatore della parcella;
// - Svizzera: IVA 8,1% oppure esente con il motivo, data o periodo della prestazione, QR-fattura.
// Prima di tutto controlla i dati: senza quelli del professionista e del cliente la fattura non parte.
export default function NuovaFattura() {
  const parametri = useLocalSearchParams<{ cliente?: string; pratica?: string }>();
  const { paese, ruoli } = useStato();
  const { clienti, pratiche, fatture, fatturazione, parcella, azioni } = useStudio();
  const avvocato = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');
  const metodi = metodiPagamento[paese] ?? metodiPagamento.IT;
  const forfettario = paese === 'IT' && fatturazione.regime === 'forfettario';

  const [passo, setPasso] = useState(0);
  const [clienteId, setClienteId] = useState<string | null>(parametri.cliente ?? null);
  const [praticaId, setPraticaId] = useState<string | null>(parametri.pratica ?? null);
  const [righe, setRighe] = useState<RigaFattura[]>([]);
  const [descrizione, setDescrizione] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [prezzo, setPrezzo] = useState('');
  // IT
  const [cpa, setCpa] = useState('4');
  const [iva, setIva] = useState(forfettario ? '0' : '22');
  const [ritenuta, setRitenuta] = useState<boolean | null>(null); // null: decide il tipo di cliente
  // CH
  const [esente, setEsente] = useState(paese === 'CH' && fatturazione.assoggettatoIva === false);
  const [motivo, setMotivo] = useState<string | null>(esente ? motiviEsenzioneCH[0] : null);
  const [periodo, setPeriodo] = useState('');
  // comuni
  const [emessa, setEmessa] = useState(() => dataNumerica(new Date().toISOString()));
  const [scadenza, setScadenza] = useState(() => dataNumerica(traGiorni(30).toISOString()));
  const [metodo, setMetodo] = useState(metodi[0]);
  const [note, setNote] = useState('');

  // Le righe del calcolatore della parcella arrivano da lì, attraverso lo stato dello Studio.
  const [parcellaVista, setParcellaVista] = useState<Parcella | null>(null);
  if (parcella && parcella !== parcellaVista) {
    setParcellaVista(parcella);
    const nuove = parcella.righe.map((r) => ({ ...r, id: idRiga() }));
    setRighe((attuali) => (parcella.modo === 'aggiungi' ? [...attuali, ...nuove] : nuove));
    if (clienteId) setPasso(1);
  }
  const { scartaParcella } = azioni;
  useEffect(() => scartaParcella, [scartaParcella]);

  const mancaProfessionista = mancanoAlProfessionista(fatturazione, paese);
  if (mancaProfessionista.length > 0) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/fatture" etichetta="Annulla" />}
          titolo="Nuova fattura"
        />
        <View style={stili.blocco}>
          <IconaQuadrata nome="ricevuta" lato={52} dimensione={24} />
          <Testo tipo="dS">Prima servono i tuoi dati di fatturazione</Testo>
          <Testo colore={colori.fg2}>
            {`Mancano ${elenco(mancaProfessionista)}. Vanno sul PDF di ogni fattura: li scrivi una volta sola.`}
          </Testo>
          <Pulsante titolo="Completa i dati di fatturazione" onPress={() => router.push('/fatture/dati')} />
        </View>
      </Schermata>
    );
  }

  const cliente = clienti.find((c) => c.id === clienteId);
  const mancaCliente = cliente ? mancanoAlCliente(cliente, paese) : [];
  const praticheCliente = pratiche.filter((p) => p.clienteId === clienteId && p.stato === 'aperta');
  const conRitenuta = paese === 'IT' && !forfettario && (ritenuta ?? !!cliente?.giuridica);

  const fiscale = {
    cpa: paese === 'IT' ? (leggiImporto(cpa, 'IT') ?? 0) : undefined,
    iva: paese === 'IT' ? (leggiImporto(iva, 'IT') ?? 0) : esente ? 0 : aliquotaIvaCH,
    ritenuta: conRitenuta ? 20 : undefined,
    esenteIva: paese === 'CH' ? esente : undefined,
    motivoEsenzione: paese === 'CH' && esente ? (motivo ?? undefined) : undefined,
  };
  const totali = totaliFattura({ ...fiscale, righe, pagamenti: [] }, paese);

  const giornoEmessa = leggiData(emessa);
  const giornoScadenza = leggiData(scadenza);
  const ibanMancante = metodo !== 'Contanti' && !fatturazione.iban;
  const percentualiValide =
    paese !== 'IT' || (leggiImporto(cpa, 'IT') != null && leggiImporto(iva, 'IT') != null);

  // Perché non si può andare avanti (null: si può).
  const blocco = [
    !cliente
      ? 'Scegli il cliente.'
      : mancaCliente.length > 0
        ? 'Completa i dati del cliente sul sito.'
        : null,
    righe.length === 0
      ? 'Aggiungi almeno una prestazione.'
      : totali.imponibile <= 0
        ? 'Il totale è zero.'
        : null,
    !giornoEmessa
      ? 'Scrivi la data di emissione.'
      : giornoScadenza && giornoScadenza < giornoEmessa
        ? 'La scadenza viene prima dell’emissione.'
        : !percentualiValide
          ? 'Controlla le percentuali.'
          : paese === 'CH' && !periodo.trim()
            ? 'Scrivi la data o il periodo della prestazione.'
            : paese === 'CH' && esente && !motivo
              ? 'Scegli il motivo dell’esenzione.'
              : ibanMancante
                ? 'Manca il tuo IBAN.'
                : null,
    null,
  ][passo];

  const prezzoRiga = leggiImporto(prezzo, paese);
  const quantitaRiga = Number(quantita.replace(',', '.'));
  const rigaPronta =
    !!descrizione.trim() &&
    prezzoRiga != null &&
    prezzoRiga > 0 &&
    quantitaRiga > 0 &&
    !Number.isNaN(quantitaRiga);
  const aggiungiRiga = () => {
    if (!rigaPronta || prezzoRiga == null) return;
    setRighe((r) => [
      ...r,
      { id: idRiga(), descrizione: descrizione.trim(), quantita: quantitaRiga, prezzo: prezzoRiga },
    ]);
    setDescrizione('');
    setQuantita('1');
    setPrezzo('');
  };

  const prossimoNumero = (() => {
    const anno = (giornoEmessa ?? new Date()).getFullYear();
    const ultimo = fatture
      .filter((f) => f.numero.startsWith(`F-${anno}-`))
      .reduce((m, f) => Math.max(m, Number(f.numero.slice(7)) || 0), 0);
    return `F-${anno}-${String(ultimo + 1).padStart(3, '0')}`;
  })();

  const crea = () => {
    if (!cliente || !giornoEmessa) return;
    const id = azioni.creaFattura({
      clienteId: cliente.id,
      praticaId: praticaId ?? undefined,
      emessa: giornoEmessa.toISOString(),
      scadenza: giornoScadenza?.toISOString(),
      righe,
      ...fiscale,
      periodo: paese === 'CH' ? periodo.trim() : undefined,
      metodo,
      iban: metodo !== 'Contanti' ? fatturazione.iban : undefined,
      notePubbliche: note.trim() || undefined,
    });
    router.replace({ pathname: '/fatture/[id]', params: { id } });
  };

  const oggi = new Date();
  const mesi = [0, -1].map((d) => {
    const x = new Date(oggi.getFullYear(), oggi.getMonth() + d, 1);
    return nomeMese(x.getFullYear(), x.getMonth());
  });

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta="Annulla" />}
        titolo="Nuova fattura"
      />
      <View style={stili.passi}>
        <Text style={stili.passiTesto}>{`Passo ${passo + 1} di ${passi.length} · ${passi[passo]}`}</Text>
        <Barra percento={((passo + 1) / passi.length) * 100} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          {passo === 0 ? (
            <>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  Cliente
                </Testo>
                <Scelta
                  voci={clienti.map((c) => ({ valore: c.id, titolo: c.nome }))}
                  valore={clienteId}
                  onCambia={(id) => {
                    setClienteId(id);
                    setPraticaId(null);
                    setRitenuta(null);
                  }}
                  etichettaGruppo="Cliente"
                />
              </View>
              {cliente && mancaCliente.length > 0 ? (
                <Avviso
                  testo={`A ${cliente.nome} mancano ${elenco(mancaCliente)}. Si aggiungono sul sito, in Clienti: poi torna qui.`}
                />
              ) : null}
              {righe.length > 0 && !cliente ? (
                <Avviso tono="info" testo="Le righe della parcella sono pronte: scegli il cliente." />
              ) : null}
              {praticheCliente.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Testo tipo="small" colore={colori.fg2}>
                    Pratica (facoltativa)
                  </Testo>
                  <Scelta
                    voci={praticheCliente.map((p) => ({ valore: p.id, titolo: p.titolo }))}
                    valore={praticaId}
                    onCambia={(id) => setPraticaId(id === praticaId ? null : id)}
                    etichettaGruppo="Pratica"
                  />
                </View>
              ) : null}
            </>
          ) : null}

          {passo === 1 ? (
            <>
              {righe.length > 0 ? (
                <View>
                  {righe.map((r) => (
                    <View key={r.id} style={stili.riga}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={stili.rigaTesto}>{r.descrizione}</Text>
                        <Testo tipo="cap">
                          {`${String(r.quantita).replace('.', ',')} × ${importo(r.prezzo, paese)} = ${importo(r.quantita * r.prezzo, paese)}`}
                        </Testo>
                      </View>
                      <PulsanteIcona
                        icona="cestino"
                        etichetta={`Togli «${r.descrizione}»`}
                        onPress={() => setRighe((x) => x.filter((y) => y.id !== r.id))}
                      />
                    </View>
                  ))}
                  <View style={stili.subtotale}>
                    <Text style={stili.subtotaleTesto}>Imponibile</Text>
                    <Text style={stili.subtotaleTesto}>{importo(totali.imponibile, paese)}</Text>
                  </View>
                </View>
              ) : (
                <Testo tipo="small" colore={colori.fg3}>
                  Nessuna prestazione, per ora.
                </Testo>
              )}
              {avvocato && paese === 'IT' ? (
                <Pulsante
                  titolo="Calcola parcella"
                  icona="calcolatrice"
                  variante="linea"
                  onPress={() =>
                    router.push({ pathname: '/fatture/calcolatore', params: { per: 'fattura' } })
                  }
                />
              ) : null}
              <TitoloSezione stile={{ paddingHorizontal: 0, paddingTop: 4 }}>
                Aggiungi una prestazione
              </TitoloSezione>
              <Campo
                etichetta="Descrizione"
                placeholder={paese === 'IT' ? 'Es. Parere scritto' : 'Es. Consulenza (ore)'}
                value={descrizione}
                onChangeText={setDescrizione}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Campo
                  etichetta="Quantità"
                  value={quantita}
                  onChangeText={setQuantita}
                  keyboardType="decimal-pad"
                  stile={{ flex: 1 }}
                />
                <Campo
                  etichetta={`Prezzo (${paese === 'CH' ? 'CHF' : '€'})`}
                  placeholder="0,00"
                  value={prezzo}
                  onChangeText={setPrezzo}
                  keyboardType="decimal-pad"
                  stile={{ flex: 2 }}
                />
              </View>
              <Pulsante
                titolo="Aggiungi la prestazione"
                icona="piu"
                variante="linea"
                disabilitato={!rigaPronta}
                onPress={aggiungiRiga}
              />
            </>
          ) : null}

          {passo === 2 ? (
            <>
              {paese === 'IT' ? (
                <>
                  {forfettario ? (
                    <Avviso
                      tono="info"
                      testo="Regime forfettario: la fattura è senza IVA e senza ritenuta. Sopra 77,47 € va la marca da bollo da 2 €."
                    />
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Campo
                      etichetta={`${nomeContributo(fatturazione.cassa)} (%)`}
                      value={cpa}
                      onChangeText={setCpa}
                      keyboardType="decimal-pad"
                      stile={{ flex: 1 }}
                    />
                    <Campo
                      etichetta="IVA (%)"
                      value={iva}
                      onChangeText={setIva}
                      keyboardType="decimal-pad"
                      stile={{ flex: 1 }}
                    />
                  </View>
                  {!forfettario ? (
                    <View style={{ marginHorizontal: -20 }}>
                      <Riga
                        stretta
                        ruolo="switch"
                        selezionata={conRitenuta}
                        titolo="Ritenuta d'acconto 20%"
                        sottotitolo="Se il cliente è un'azienda o un professionista: la versa lui al fisco"
                        destra={<Interruttore acceso={conRitenuta} />}
                        onPress={() => setRitenuta(!conRitenuta)}
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Segmentato
                    etichetta="IVA"
                    opzioni={[
                      { valore: 'si', titolo: `IVA ${String(aliquotaIvaCH).replace('.', ',')}%` },
                      { valore: 'no', titolo: 'Esente' },
                    ]}
                    valore={esente ? 'no' : 'si'}
                    onCambia={(v) => {
                      setEsente(v === 'no');
                      if (v === 'no' && !motivo) setMotivo(motiviEsenzioneCH[0]);
                    }}
                  />
                  {esente ? (
                    <View style={{ gap: 8 }}>
                      <Testo tipo="small" colore={colori.fg2}>
                        Motivo dell'esenzione (va sulla fattura)
                      </Testo>
                      <Scelta
                        voci={motiviEsenzioneCH}
                        valore={motivo}
                        onCambia={setMotivo}
                        etichettaGruppo="Motivo dell'esenzione"
                      />
                    </View>
                  ) : null}
                  <View style={{ gap: 8 }}>
                    <Campo
                      etichetta="Data o periodo della prestazione"
                      placeholder="Es. settembre 2026"
                      value={periodo}
                      onChangeText={setPeriodo}
                    />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Scelta
                        voci={mesi}
                        valore={mesi.includes(periodo) ? periodo : null}
                        onCambia={setPeriodo}
                        etichettaGruppo="Mese della prestazione"
                      />
                    </View>
                    <Testo tipo="cap">La chiede la legge sull'IVA (art. 26 LIVA).</Testo>
                  </View>
                </>
              )}
              <CampoData
                etichetta="Emessa il"
                valore={emessa}
                onCambia={setEmessa}
                scorciatoie={[{ titolo: 'Oggi', giorni: 0 }]}
              />
              <CampoData
                etichetta="Scadenza del pagamento"
                valore={scadenza}
                onCambia={setScadenza}
                scorciatoie={[
                  { titolo: 'Tra 15 giorni', giorni: 15 },
                  { titolo: 'Tra 30 giorni', giorni: 30 },
                  { titolo: 'Tra 60 giorni', giorni: 60 },
                ]}
              />
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  Pagamento
                </Testo>
                <Scelta voci={metodi} valore={metodo} onCambia={setMetodo} etichettaGruppo="Pagamento" />
              </View>
              {metodo !== 'Contanti' ? (
                fatturazione.iban ? (
                  <Testo tipo="cap">{`Sul PDF: IBAN ${fatturazione.iban}${metodo === 'QR-fattura' ? ', con la sezione di pagamento QR' : ''}.`}</Testo>
                ) : (
                  <Avviso testo="Manca il tuo IBAN: aggiungilo nei dati di fatturazione." />
                )
              ) : null}
              <Campo
                etichetta="Note sulla fattura (facoltative)"
                placeholder="Le legge anche il cliente"
                value={note}
                onChangeText={setNote}
                multiline
              />
            </>
          ) : null}

          {passo === 3 && cliente ? (
            <>
              <ElencoDefinizioni
                larghezzaTermine={96}
                voci={[
                  ['Numero', prossimoNumero],
                  ['Cliente', nomeCliente(clienti, cliente.id)],
                  ...(praticaId
                    ? ([['Pratica', pratiche.find((p) => p.id === praticaId)?.titolo ?? '']] as [
                        string,
                        string,
                      ][])
                    : []),
                  ['Emessa', giornoEmessa ? dataCompleta(giornoEmessa.toISOString()) : ''],
                  ...(giornoScadenza
                    ? ([['Scadenza', dataCompleta(giornoScadenza.toISOString())]] as [string, string][])
                    : []),
                  ...(paese === 'CH' ? ([['Prestazione', periodo.trim()]] as [string, string][]) : []),
                  ['Pagamento', metodo],
                ]}
              />
              <View>
                <TitoloSezione stile={{ paddingHorizontal: 0, paddingTop: 0 }}>
                  {`Prestazioni · ${righe.length}`}
                </TitoloSezione>
                {righe.map((r) => (
                  <View key={r.id} style={stili.riga}>
                    <Text style={[stili.rigaTesto, { flex: 1 }]} numberOfLines={2}>
                      {r.descrizione}
                    </Text>
                    <Text style={stili.rigaImporto}>{importo(r.quantita * r.prezzo, paese)}</Text>
                  </View>
                ))}
              </View>
              <TotaliFattura fattura={fiscale} totali={totali} paese={paese} cassa={fatturazione.cassa} />
              <Testo tipo="cap">
                {paese === 'IT'
                  ? 'Il numero si assegna quando la crei. Il PDF lo generi dal dettaglio.'
                  : 'Il numero si assegna quando la crei. Il PDF, con la QR-fattura, lo generi dal dettaglio.'}
              </Testo>
            </>
          ) : null}
        </ScrollView>
        <BarraAzioni stile={{ flexDirection: 'column', gap: 8 }}>
          {blocco ? (
            <Testo tipo="cap" centrato colore={colori.fg3}>
              {blocco}
            </Testo>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {passo > 0 ? (
              <Pulsante titolo="Indietro" variante="linea" onPress={() => setPasso(passo - 1)} />
            ) : null}
            {passo < passi.length - 1 ? (
              <Pulsante
                titolo="Avanti"
                stile={{ flex: 1 }}
                disabilitato={!!blocco}
                onPress={() => setPasso(passo + 1)}
              />
            ) : (
              <Pulsante titolo="Crea la fattura" stile={{ flex: 1 }} onPress={crea} />
            )}
          </View>
        </BarraAzioni>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  blocco: { gap: 16, paddingTop: 24, paddingHorizontal: 20 },
  passi: { gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  passiTesto: { fontFamily: famiglie.testoMedio, fontSize: 13, color: colori.fg2 },
  corpo: { gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.line,
  },
  rigaTesto: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 21, color: colori.fg },
  rigaImporto: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
  subtotale: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  subtotaleTesto: { fontFamily: famiglie.testoMedio, fontSize: 15, color: colori.fg },
});
