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
import type { Fattura, RigaFattura } from '@/dati-finti/studio';
import type { Lingua } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { strumentiStudio } from '@/ruoli';
import { bolloDovuto, importo, totaliFattura } from '@/studio/calcoli';
import { CampoData, Scelta, leggiData, traGiorni } from '@/studio/Campi';
import {
  aliquoteCH,
  cassaPredefinita,
  eQrIban,
  elenco,
  leggiImporto,
  mancanoAlCliente,
  mancanoAlProfessionista,
  metodiPagamento,
  motiviEsenzioneCH,
  natureIva,
  nomeContributo,
  nomeMetodo,
  nomeMotivo,
  percento,
  senzaRecapitoSdi,
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

const nomiLingue: Record<Lingua, string> = { it: 'Italiano', de: 'Deutsch', fr: 'Français' };

// S7 · Nuova fattura, a passi. Due processi diversi, come i siti dal 04-10-2026:
// - Italia: regime e cassa di chi emette; ordinario con cassa (CPA 4%), IVA 22% su imponibile + cassa,
//   natura IVA se l'IVA è 0, ritenuta d'acconto se il cliente è sostituto d'imposta; forfettario senza IVA
//   (natura N2.2) e senza ritenuta. Spese anticipate esenti (art. 15), imposta di bollo da 2 € sopra 77,47 €
//   senza IVA. Per gli avvocati c'è il calcolatore della parcella.
//   ?storno=<id>: nota di credito (TD04) della fattura, con le sue righe e i suoi parametri fiscali.
// - Svizzera: IVA 8,1%, 2,6% o 3,8%, oppure esente con il motivo; senza iscrizione nel registro IVA la fattura
//   esce senza IVA. Lingua della fattura, data o periodo della prestazione, QR-fattura.
// Prima di tutto controlla i dati: senza quelli del professionista e del cliente la fattura non parte.
export default function NuovaFattura() {
  const parametri = useLocalSearchParams<{ cliente?: string; pratica?: string; storno?: string }>();
  const { paese, ruoli } = useStato();
  const { clienti, pratiche, fatture, fatturazione, parcella, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const avvocato = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');
  const metodi = metodiPagamento[paese] ?? metodiPagamento.IT;
  // nota di credito: solo di una fattura italiana emessa
  const origine: Fattura | undefined =
    paese === 'IT' ? fatture.find((f) => f.id === parametri.storno && f.tipo !== 'TD04') : undefined;
  const nc = !!origine;
  const regime = origine?.regime ?? fatturazione.regime ?? 'RF01';
  const forfettario = paese === 'IT' && regime === 'RF19';
  const cassa = origine?.cassa ?? fatturazione.cassa ?? cassaPredefinita(ruoli[paese] ?? '');
  const contributo = paese === 'IT' ? nomeContributo(cassa, lingua) : null;
  const assoggettato = paese === 'CH' && !!fatturazione.assoggettatoIva;

  const [passo, setPasso] = useState(nc ? 1 : 0);
  const [clienteId, setClienteId] = useState<string | null>(origine?.clienteId ?? parametri.cliente ?? null);
  const [praticaId, setPraticaId] = useState<string | null>(
    origine ? (origine.praticaId ?? null) : (parametri.pratica ?? null),
  );
  const [righe, setRighe] = useState<RigaFattura[]>(() =>
    origine ? origine.righe.map((r) => ({ ...r, id: idRiga() })) : [],
  );
  const [descrizione, setDescrizione] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [prezzo, setPrezzo] = useState('');
  const [spesaEsente, setSpesaEsente] = useState(false);
  // IT
  const [cpa, setCpa] = useState(String(origine?.cpa ?? 4).replace('.', ','));
  const [iva, setIva] = useState(String(origine?.iva ?? (forfettario ? 0 : 22)).replace('.', ','));
  const [ritenuta, setRitenuta] = useState<boolean | null>(origine ? !!origine.ritenuta : null); // null: decide il tipo di cliente
  const [natura, setNatura] = useState<string | null>(origine?.natura ?? null);
  const [riferimento, setRiferimento] = useState(origine?.riferimentoNormativo ?? '');
  const [bollo, setBollo] = useState<boolean | null>(origine ? !!origine.bollo : null); // null: lo propone l'app
  const [bolloCliente, setBolloCliente] = useState(origine?.bolloACaricoCliente ?? true);
  // CH
  const [aliquota, setAliquota] = useState<number | 'esente'>(assoggettato ? aliquoteCH[0] : 'esente');
  const [motivo, setMotivo] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [linguaFattura, setLinguaFattura] = useState<Lingua>(lingua);
  // comuni
  const [emessa, setEmessa] = useState(() => dataNumerica(new Date().toISOString()));
  const [scadenza, setScadenza] = useState(() => (nc ? '' : dataNumerica(traGiorni(30).toISOString())));
  const [metodo, setMetodo] = useState(origine?.metodo ?? metodi[0]);
  const [note, setNote] = useState(() =>
    origine ? t('fatture.nc.aStornoDel', { numero: origine.numero, data: dataNumerica(origine.emessa) }) : '',
  );

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
  const esente = paese === 'CH' && aliquota === 'esente';

  const ivaIT = forfettario ? 0 : (leggiImporto(iva, 'IT') ?? 0);
  const cpaIT = contributo ? (leggiImporto(cpa, 'IT') ?? 0) : 0;
  const naturaIT = forfettario ? 'N2.2' : ivaIT === 0 ? (natura ?? undefined) : undefined;
  const base = {
    cpa: paese === 'IT' ? cpaIT : undefined,
    iva: paese === 'IT' ? ivaIT : esente ? 0 : (aliquota as number),
    ritenuta: conRitenuta ? 20 : undefined,
    esenteIva: paese === 'CH' ? esente : undefined,
    motivoEsenzione: paese === 'CH' && esente ? motivo.trim() || undefined : undefined,
  };
  const provvisori = totaliFattura({ ...base, righe, pagamenti: [] }, paese);
  // Il bollo lo propone l'app finché non lo tocchi (come il sito).
  const serveBollo = paese === 'IT' && bolloDovuto(provvisori, ivaIT);
  const conBollo = paese === 'IT' && (bollo ?? serveBollo);
  const fiscale = {
    ...base,
    natura: paese === 'IT' ? naturaIT : undefined,
    riferimentoNormativo:
      paese === 'IT' && naturaIT && !forfettario ? riferimento.trim() || undefined : undefined,
    bollo: conBollo || undefined,
    bolloACaricoCliente: conBollo ? bolloCliente : undefined,
    tipo: nc ? ('TD04' as const) : undefined,
  };
  const totali = totaliFattura({ ...fiscale, righe, pagamenti: [] }, paese);

  const giornoEmessa = leggiData(emessa);
  const giornoScadenza = nc ? null : leggiData(scadenza);
  // Svizzera: per la QR-fattura va bene anche il QR-IBAN; per il bonifico serve l'IBAN del conto.
  const ibanFattura =
    paese === 'CH' && metodo === 'QR-fattura'
      ? (fatturazione.qrIban ?? fatturazione.iban)
      : fatturazione.iban;
  const ibanMancante = metodo !== 'Contanti' && !ibanFattura;
  const ibanQrPerBonifico = paese === 'CH' && metodo === 'Bonifico' && !!ibanFattura && eQrIban(ibanFattura);
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
      : totali.imponibile + totali.esenti <= 0
        ? t('fatture.nuova.blocchi.zero')
        : null,
    !giornoEmessa
      ? t('fatture.nuova.blocchi.emissione')
      : giornoScadenza && giornoScadenza < giornoEmessa
        ? t('fatture.nuova.blocchi.scadenzaPrima')
        : !percentualiValide
          ? t('fatture.nuova.blocchi.percentuali')
          : paese === 'IT' && !nc && !forfettario && ivaIT === 0 && !natura
            ? t('fatture.fisco.naturaManca')
            : paese === 'CH' && !periodo.trim()
              ? t('fatture.nuova.blocchi.periodo')
              : ibanMancante
                ? t('fatture.nuova.blocchi.iban')
                : ibanQrPerBonifico
                  ? t('fatture.fisco.ibanQr')
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
      {
        id: idRiga(),
        descrizione: descrizione.trim(),
        quantita: quantitaRiga,
        prezzo: prezzoRiga,
        natura: spesaEsente ? 'N1' : undefined,
      },
    ]);
    setDescrizione('');
    setQuantita('1');
    setPrezzo('');
    setSpesaEsente(false);
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
      origineId: origine?.id,
      regime: paese === 'IT' ? regime : undefined,
      cassa: paese === 'IT' ? cassa : undefined,
      periodo: paese === 'CH' ? periodo.trim() : undefined,
      lingua: paese === 'CH' ? linguaFattura : undefined,
      metodo,
      iban: metodo !== 'Contanti' ? ibanFattura : undefined,
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
        titolo={nc ? t('fatture.nc.titolo') : t('fatture.nuova.titolo')}
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
          {passo === 0 && origine ? (
            <>
              <Avviso tono="info" testo={t('fatture.nc.aStorno', { numero: origine.numero })} />
              <ElencoDefinizioni
                larghezzaTermine={96}
                voci={[
                  [t('fatture.voci.cliente'), nomeCliente(clienti, origine.clienteId)],
                  [t('fatture.voci.emessa'), dataCompleta(origine.emessa, lingua)],
                ]}
              />
            </>
          ) : null}
          {passo === 0 && !origine ? (
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
              {paese === 'IT' && cliente && (cliente.codiceDestinatario || cliente.pecFatturazione) ? (
                <Testo tipo="cap">
                  {t('fatture.fisco.destinatario', {
                    destinatario: [
                      cliente.codiceDestinatario && `SDI ${cliente.codiceDestinatario}`,
                      cliente.pecFatturazione && `PEC ${cliente.pecFatturazione}`,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  })}
                </Testo>
              ) : null}
              {paese === 'IT' && cliente && senzaRecapitoSdi(cliente) ? (
                <Avviso tono="info" testo={t('fatture.fisco.clienteSdi')} />
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
              {nc ? <Testo tipo="cap">{t('fatture.nc.righe')}</Testo> : null}
              {righe.length > 0 ? (
                <View>
                  {righe.map((r) => (
                    <View key={r.id} style={stili.riga}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={stili.rigaTesto}>{r.descrizione}</Text>
                        <Testo tipo="cap">
                          {`${String(r.quantita).replace('.', ',')} × ${importo(r.prezzo, paese)} = ${importo(r.quantita * r.prezzo, paese)}`}
                          {r.natura ? ` · ${t('fatture.fisco.esente')}` : ''}
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
                  {totali.esenti > 0 ? (
                    <View style={stili.subtotale}>
                      <Text style={stili.subtotaleTesto}>{t('fatture.fisco.esenti')}</Text>
                      <Text style={stili.subtotaleTesto}>{importo(totali.esenti, paese)}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Testo tipo="small" colore={colori.fg3}>
                  {t('fatture.nuova.nessunaPrestazione')}
                </Testo>
              )}
              {avvocato && paese === 'IT' && !nc ? (
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
              {paese === 'IT' ? (
                <View style={{ marginHorizontal: -20 }}>
                  <Riga
                    stretta
                    ruolo="switch"
                    selezionata={spesaEsente}
                    titolo={t('fatture.fisco.spesa')}
                    sottotitolo={t('fatture.fisco.spesaTesto')}
                    destra={<Interruttore acceso={spesaEsente} />}
                    onPress={() => setSpesaEsente(!spesaEsente)}
                  />
                </View>
              ) : null}
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
                  <Testo tipo="small" colore={colori.fg2}>
                    {t(`fatture.fisco.regime.${regime}`)} · {t('fatture.fisco.cambia')}
                  </Testo>
                  {nc && origine ? (
                    <Avviso tono="info" testo={t('fatture.nc.ripete', { numero: origine.numero })} />
                  ) : null}
                  {forfettario ? <Avviso tono="info" testo={t('fatture.fisco.forfettario')} /> : null}
                  {!nc ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {contributo ? (
                        <Campo
                          etichetta={`${contributo} (%)`}
                          value={cpa}
                          onChangeText={setCpa}
                          keyboardType="decimal-pad"
                          stile={{ flex: 1 }}
                        />
                      ) : null}
                      {!forfettario ? (
                        <Campo
                          etichetta={t('fatture.nuova.ivaPercento')}
                          value={iva}
                          onChangeText={setIva}
                          keyboardType="decimal-pad"
                          stile={{ flex: 1 }}
                        />
                      ) : null}
                    </View>
                  ) : null}
                  {!nc && !forfettario && ivaIT === 0 ? (
                    <>
                      <View style={{ gap: 8 }}>
                        <Testo tipo="small" colore={colori.fg2}>
                          {t('fatture.fisco.natura')}
                        </Testo>
                        <Scelta
                          voci={natureIva.map((n) => ({ valore: n.codice, titolo: n.etichetta }))}
                          valore={natura}
                          onCambia={setNatura}
                          etichettaGruppo={t('fatture.fisco.natura')}
                        />
                      </View>
                      <Campo
                        etichetta={t('fatture.fisco.riferimento')}
                        placeholder={t('fatture.fisco.riferimentoEsempio')}
                        value={riferimento}
                        onChangeText={setRiferimento}
                      />
                    </>
                  ) : null}
                  {!forfettario && !nc ? (
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
                  <View style={{ marginHorizontal: -20 }}>
                    <Riga
                      stretta
                      ruolo="switch"
                      selezionata={conBollo}
                      titolo={t('fatture.fisco.bollo')}
                      sottotitolo={
                        serveBollo ? t('fatture.fisco.bolloServe') : t('fatture.fisco.bolloNonServe')
                      }
                      destra={<Interruttore acceso={conBollo} />}
                      onPress={() => setBollo(!conBollo)}
                    />
                    {conBollo ? (
                      <Riga
                        stretta
                        ruolo="switch"
                        selezionata={bolloCliente}
                        titolo={t('fatture.fisco.bolloCliente')}
                        destra={<Interruttore acceso={bolloCliente} />}
                        onPress={() => setBolloCliente(!bolloCliente)}
                      />
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  {!assoggettato ? (
                    <Avviso
                      tono="info"
                      testo={`${t('fatture.fisco.nonAssoggettato')} ${t('fatture.fisco.cambiaDati')}`}
                    />
                  ) : (
                    <>
                      <View style={{ gap: 8 }}>
                        <Testo tipo="small" colore={colori.fg2}>
                          {t('fatture.fisco.aliquota')}
                        </Testo>
                        <Scelta<string>
                          voci={[
                            ...aliquoteCH.map((a) => ({ valore: String(a), titolo: percento(a) })),
                            { valore: 'esente', titolo: t('fatture.voci.esente') },
                          ]}
                          valore={String(aliquota)}
                          onCambia={(v) => setAliquota(v === 'esente' ? 'esente' : Number(v))}
                          etichettaGruppo={t('fatture.fisco.aliquota')}
                        />
                        <Testo tipo="cap">{t('fatture.fisco.aliquoteSpiega')}</Testo>
                      </View>
                      {esente ? (
                        <View style={{ gap: 8 }}>
                          <Campo
                            etichetta={t('fatture.fisco.motivo')}
                            placeholder={t('fatture.fisco.motivoEsempio')}
                            value={motivo}
                            onChangeText={setMotivo}
                          />
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Scelta
                              voci={motiviEsenzioneCH.map((m) => ({
                                valore: m,
                                titolo: nomeMotivo(m, lingua),
                              }))}
                              valore={motiviEsenzioneCH.includes(motivo) ? motivo : null}
                              onCambia={setMotivo}
                              etichettaGruppo={t('fatture.nuova.motivoGruppo')}
                            />
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                  <View style={{ gap: 8 }}>
                    <Testo tipo="small" colore={colori.fg2}>
                      {t('fatture.fisco.lingua')}
                    </Testo>
                    <Segmentato<Lingua>
                      etichetta={t('fatture.fisco.lingua')}
                      opzioni={(['it', 'de', 'fr'] as Lingua[]).map((l) => ({
                        valore: l,
                        titolo: nomiLingue[l],
                      }))}
                      valore={linguaFattura}
                      onCambia={setLinguaFattura}
                    />
                  </View>
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
              {!nc ? (
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
              ) : null}
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
                ibanFattura ? (
                  <Testo tipo="cap">
                    {metodo === 'QR-fattura'
                      ? t('fatture.nuova.sulPdfQr', { iban: ibanFattura })
                      : t('fatture.nuova.sulPdf', { iban: ibanFattura })}
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
                  [nc ? t('fatture.nc.titolo') : t('fatture.voci.numero'), prossimoNumero],
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
                    ? ([
                        [t('fatture.voci.prestazione'), periodo.trim()],
                        [t('fatture.fisco.lingua'), nomiLingue[linguaFattura]],
                      ] as [string, string][])
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
              <TotaliFattura fattura={fiscale} totali={totali} paese={paese} cassa={cassa} />
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
              <Pulsante
                titolo={nc ? t('fatture.nc.crea') : t('fatture.nuova.crea')}
                stile={{ flex: 1 }}
                onPress={crea}
              />
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
