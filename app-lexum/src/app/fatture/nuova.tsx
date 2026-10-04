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
import { useTesti } from '@/lingue/useTesti';
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
  nomeMetodo,
  nomeMotivo,
} from '@/studio/fatturazione';
import { dataCompleta, dataNumerica, nomeMese } from '@/studio/formati';
import { TotaliFattura } from '@/studio/TotaliFattura';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio, type Parcella } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

// I nomi dei passi sono in fatture.nuova.passi.
const passi = ['cliente', 'prestazioni', 'fisco', 'controlla'] as const;

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
  const { t, lingua } = useTesti();
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

  const mancaProfessionista = mancanoAlProfessionista(fatturazione, paese, lingua);
  if (mancaProfessionista.length > 0) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/fatture" etichetta={t('comune.annulla')} />}
          titolo={t('fatture.nuova.titolo')}
        />
        <View style={stili.blocco}>
          <IconaQuadrata nome="ricevuta" lato={52} dimensione={24} />
          <Testo tipo="dS">{t('fatture.nuova.servonoDati')}</Testo>
          <Testo colore={colori.fg2}>
            {t('fatture.nuova.mancanoDati', { elenco: elenco(mancaProfessionista, lingua) })}
          </Testo>
          <Pulsante titolo={t('fatture.nuova.completaDati')} onPress={() => router.push('/fatture/dati')} />
        </View>
      </Schermata>
    );
  }

  const cliente = clienti.find((c) => c.id === clienteId);
  const mancaCliente = cliente ? mancanoAlCliente(cliente, paese, lingua) : [];
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
      ? t('fatture.nuova.blocchi.cliente')
      : mancaCliente.length > 0
        ? t('fatture.nuova.blocchi.datiCliente')
        : null,
    righe.length === 0
      ? t('fatture.nuova.blocchi.prestazione')
      : totali.imponibile <= 0
        ? t('fatture.nuova.blocchi.zero')
        : null,
    !giornoEmessa
      ? t('fatture.nuova.blocchi.emissione')
      : giornoScadenza && giornoScadenza < giornoEmessa
        ? t('fatture.nuova.blocchi.scadenzaPrima')
        : !percentualiValide
          ? t('fatture.nuova.blocchi.percentuali')
          : paese === 'CH' && !periodo.trim()
            ? t('fatture.nuova.blocchi.periodo')
            : paese === 'CH' && esente && !motivo
              ? t('fatture.nuova.blocchi.motivo')
              : ibanMancante
                ? t('fatture.nuova.blocchi.iban')
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
    return nomeMese(x.getFullYear(), x.getMonth(), lingua);
  });

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta={t('comune.annulla')} />}
        titolo={t('fatture.nuova.titolo')}
      />
      <View style={stili.passi}>
        <Text style={stili.passiTesto}>
          {t('fatture.nuova.passo', {
            n: passo + 1,
            totale: passi.length,
            nome: t(`fatture.nuova.passi.${passi[passo]}`),
          })}
        </Text>
        <Barra percento={((passo + 1) / passi.length) * 100} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          {passo === 0 ? (
            <>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.voci.cliente')}
                </Testo>
                <Scelta
                  voci={clienti.map((c) => ({ valore: c.id, titolo: c.nome }))}
                  valore={clienteId}
                  onCambia={(id) => {
                    setClienteId(id);
                    setPraticaId(null);
                    setRitenuta(null);
                  }}
                  etichettaGruppo={t('fatture.voci.cliente')}
                />
              </View>
              {cliente && mancaCliente.length > 0 ? (
                <Avviso
                  testo={t('fatture.nuova.mancanoCliente', {
                    nome: cliente.nome,
                    elenco: elenco(mancaCliente, lingua),
                  })}
                />
              ) : null}
              {righe.length > 0 && !cliente ? (
                <Avviso tono="info" testo={t('fatture.nuova.righePronte')} />
              ) : null}
              {praticheCliente.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Testo tipo="small" colore={colori.fg2}>
                    {t('fatture.nuova.praticaFacoltativa')}
                  </Testo>
                  <Scelta
                    voci={praticheCliente.map((p) => ({ valore: p.id, titolo: p.titolo }))}
                    valore={praticaId}
                    onCambia={(id) => setPraticaId(id === praticaId ? null : id)}
                    etichettaGruppo={t('fatture.voci.pratica')}
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
                        etichetta={t('fatture.nuova.togli', { descrizione: r.descrizione })}
                        onPress={() => setRighe((x) => x.filter((y) => y.id !== r.id))}
                      />
                    </View>
                  ))}
                  <View style={stili.subtotale}>
                    <Text style={stili.subtotaleTesto}>{t('fatture.totali.imponibile')}</Text>
                    <Text style={stili.subtotaleTesto}>{importo(totali.imponibile, paese)}</Text>
                  </View>
                </View>
              ) : (
                <Testo tipo="small" colore={colori.fg3}>
                  {t('fatture.nuova.nessunaPrestazione')}
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
                {t('fatture.nuova.aggiungiPrestazione')}
              </TitoloSezione>
              <Campo
                etichetta={t('fatture.nuova.descrizione')}
                placeholder={
                  paese === 'IT'
                    ? t('fatture.nuova.esempioDescrizione.IT')
                    : t('fatture.nuova.esempioDescrizione.CH')
                }
                value={descrizione}
                onChangeText={setDescrizione}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Campo
                  etichetta={t('fatture.nuova.quantita')}
                  value={quantita}
                  onChangeText={setQuantita}
                  keyboardType="decimal-pad"
                  stile={{ flex: 1 }}
                />
                <Campo
                  etichetta={t('fatture.nuova.prezzo', { valuta: paese === 'CH' ? 'CHF' : '€' })}
                  placeholder="0,00"
                  value={prezzo}
                  onChangeText={setPrezzo}
                  keyboardType="decimal-pad"
                  stile={{ flex: 2 }}
                />
              </View>
              <Pulsante
                titolo={t('fatture.nuova.aggiungiLaPrestazione')}
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
                  {forfettario ? <Avviso tono="info" testo={t('fatture.nuova.forfettario')} /> : null}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Campo
                      etichetta={`${nomeContributo(fatturazione.cassa, lingua)} (%)`}
                      value={cpa}
                      onChangeText={setCpa}
                      keyboardType="decimal-pad"
                      stile={{ flex: 1 }}
                    />
                    <Campo
                      etichetta={t('fatture.nuova.ivaPercento')}
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
                        titolo={t('fatture.nuova.ritenuta')}
                        sottotitolo={t('fatture.nuova.ritenutaSpiega')}
                        destra={<Interruttore acceso={conRitenuta} />}
                        onPress={() => setRitenuta(!conRitenuta)}
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Segmentato
                    etichetta={t('fatture.voci.iva')}
                    opzioni={[
                      {
                        valore: 'si',
                        titolo: t('fatture.totali.iva', {
                          aliquota: `${String(aliquotaIvaCH).replace('.', ',')}%`,
                        }),
                      },
                      { valore: 'no', titolo: t('fatture.voci.esente') },
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
                        {t('fatture.nuova.motivo')}
                      </Testo>
                      <Scelta
                        voci={motiviEsenzioneCH.map((m) => ({ valore: m, titolo: nomeMotivo(m, lingua) }))}
                        valore={motivo}
                        onCambia={setMotivo}
                        etichettaGruppo={t('fatture.nuova.motivoGruppo')}
                      />
                    </View>
                  ) : null}
                  <View style={{ gap: 8 }}>
                    <Campo
                      etichetta={t('fatture.nuova.periodo')}
                      placeholder={t('fatture.nuova.esempioPeriodo')}
                      value={periodo}
                      onChangeText={setPeriodo}
                    />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Scelta
                        voci={mesi}
                        valore={mesi.includes(periodo) ? periodo : null}
                        onCambia={setPeriodo}
                        etichettaGruppo={t('fatture.nuova.mesePrestazione')}
                      />
                    </View>
                    <Testo tipo="cap">{t('fatture.nuova.periodoLegge')}</Testo>
                  </View>
                </>
              )}
              <CampoData
                etichetta={t('fatture.nuova.emessaIl')}
                valore={emessa}
                onCambia={setEmessa}
                scorciatoie={[{ titolo: t('fatture.scorciatoie.oggi'), giorni: 0 }]}
              />
              <CampoData
                etichetta={t('fatture.nuova.scadenzaPagamento')}
                valore={scadenza}
                onCambia={setScadenza}
                scorciatoie={[
                  { titolo: t('fatture.scorciatoie.traGiorni', { n: 15 }), giorni: 15 },
                  { titolo: t('fatture.scorciatoie.traGiorni', { n: 30 }), giorni: 30 },
                  { titolo: t('fatture.scorciatoie.traGiorni', { n: 60 }), giorni: 60 },
                ]}
              />
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.voci.pagamento')}
                </Testo>
                <Scelta
                  voci={metodi.map((m) => ({ valore: m, titolo: nomeMetodo(m, lingua) }))}
                  valore={metodo}
                  onCambia={setMetodo}
                  etichettaGruppo={t('fatture.voci.pagamento')}
                />
              </View>
              {metodo !== 'Contanti' ? (
                fatturazione.iban ? (
                  <Testo tipo="cap">
                    {metodo === 'QR-fattura'
                      ? t('fatture.nuova.sulPdfQr', { iban: fatturazione.iban })
                      : t('fatture.nuova.sulPdf', { iban: fatturazione.iban })}
                  </Testo>
                ) : (
                  <Avviso testo={t('fatture.nuova.mancaIban')} />
                )
              ) : null}
              <Campo
                etichetta={t('fatture.nuova.note')}
                placeholder={t('fatture.nuova.noteSegnaposto')}
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
                  [t('fatture.voci.numero'), prossimoNumero],
                  [t('fatture.voci.cliente'), nomeCliente(clienti, cliente.id)],
                  ...(praticaId
                    ? ([
                        [t('fatture.voci.pratica'), pratiche.find((p) => p.id === praticaId)?.titolo ?? ''],
                      ] as [string, string][])
                    : []),
                  [
                    t('fatture.voci.emessa'),
                    giornoEmessa ? dataCompleta(giornoEmessa.toISOString(), lingua) : '',
                  ],
                  ...(giornoScadenza
                    ? ([[t('fatture.voci.scadenza'), dataCompleta(giornoScadenza.toISOString(), lingua)]] as [
                        string,
                        string,
                      ][])
                    : []),
                  ...(paese === 'CH'
                    ? ([[t('fatture.voci.prestazione'), periodo.trim()]] as [string, string][])
                    : []),
                  [t('fatture.voci.pagamento'), nomeMetodo(metodo, lingua)],
                ]}
              />
              <View>
                <TitoloSezione stile={{ paddingHorizontal: 0, paddingTop: 0 }}>
                  {t('fatture.nuova.prestazioniN', { n: righe.length })}
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
                {paese === 'IT' ? t('fatture.nuova.notaFinale.IT') : t('fatture.nuova.notaFinale.CH')}
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
              <Pulsante titolo={t('comune.indietro')} variante="linea" onPress={() => setPasso(passo - 1)} />
            ) : null}
            {passo < passi.length - 1 ? (
              <Pulsante
                titolo={t('comune.avanti')}
                stile={{ flex: 1 }}
                disabilitato={!!blocco}
                onPress={() => setPasso(passo + 1)}
              />
            ) : (
              <Pulsante titolo={t('fatture.nuova.crea')} stile={{ flex: 1 }} onPress={crea} />
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
