import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo, CampoScelta } from '@/componenti/Campi';
import { Avviso, BarraAzioni, Interruttore, Segmentato, Tag, TitoloSezione } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { Rappresentante } from '@/dati-finti/studio';
import type { Chiave } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import {
  cantoni,
  dataDaCampo,
  dataPerCampo,
  datiDaCliente,
  erroriCliente,
  generaPassword,
  pulisciDati,
  statoLimite,
  type CampoCliente,
  type DatiCliente,
} from '@/studio/clienti';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

type CampoTesto = Exclude<keyof DatiCliente, 'giuridica' | 'ivaAttiva' | 'rappresentante' | 'dataNascita'>;

// S11 · Nuovo cliente e modifica, come il modulo del sito (avvocato/clienti/Nuovo.jsx):
// persona fisica o giuridica; obbligatori nome e cognome (o ragione sociale) ed email.
// Italia: codice fiscale, partita IVA, PEC, provincia. Svizzera: numero AVS, UID, forma giuridica, IVA, Cantone.
// Alla creazione si può attivare il portale con una password iniziale (Lexum non la manda per email).
// ?modifica=<id> apre il modulo con i dati del cliente.
export default function ModuloCliente() {
  const { modifica } = useLocalSearchParams<{ modifica?: string }>();
  const { paese } = useStato();
  const { clienti, limiteClienti, azioni } = useStudio();
  const { t } = useTesti();
  const esistente = clienti.find((c) => c.id === modifica);
  const [d, setD] = useState<DatiCliente>(() =>
    esistente ? datiDaCliente(esistente) : { giuridica: false, paese },
  );
  const [nascita, setNascita] = useState(() => dataPerCampo(esistente?.dataNascita));
  const [portale, setPortale] = useState(false);
  const [password, setPassword] = useState('');
  const [tentato, setTentato] = useState(false);
  const [pieno, setPieno] = useState(false);
  const [foglioCantone, setFoglioCantone] = useState(false);

  const ripiego = esistente
    ? ({ pathname: '/clienti/[id]', params: { id: esistente.id } } as const)
    : ('/clienti' as const);
  const limitePieno = !esistente && (pieno || statoLimite(clienti.length, limiteClienti) === 'pieno');

  const metti = (campo: CampoTesto) => (v: string) => setD((x) => ({ ...x, [campo]: v }));
  const mettiRappr = (campo: keyof Rappresentante) => (v: string) =>
    setD((x) => ({ ...x, rappresentante: { ...x.rappresentante, [campo]: v } }));

  const errori: Partial<Record<CampoCliente, Chiave>> = erroriCliente(
    d,
    paese,
    esistente ? undefined : { attivo: portale, password },
  );
  const dataNascita = d.giuridica ? undefined : dataDaCampo(nascita);
  if (dataNascita === null) errori.dataNascita = 'clienti.errori.data';
  const valido = Object.keys(errori).length === 0;
  // gli obbligatori si segnalano dopo il primo tentativo; i formati sbagliati subito
  const errore = (campo: CampoCliente, valore?: string) =>
    errori[campo] && (tentato || !!valore?.trim()) ? t(errori[campo]) : null;

  const campo = (
    nome: CampoTesto,
    etichetta: string,
    controllo?: CampoCliente,
    altro?: Partial<ComponentProps<typeof Campo>>,
  ) => {
    const valore = (d[nome] as string | undefined) ?? '';
    const messaggio = controllo ? errore(controllo, valore) : null;
    return (
      <View style={[{ gap: 6 }, altro?.stile]}>
        <Campo etichetta={etichetta} value={valore} onChangeText={metti(nome)} {...altro} stile={undefined} />
        {messaggio ? (
          <Testo tipo="cap" colore={colori.danger}>
            {messaggio}
          </Testo>
        ) : null}
      </View>
    );
  };

  const salva = () => {
    if (!valido) {
      setTentato(true);
      return;
    }
    const pulito = pulisciDati({ ...d, dataNascita: dataNascita ?? undefined }, paese);
    if (esistente) {
      azioni.modificaCliente(esistente.id, pulito);
      indietro(ripiego);
      return;
    }
    const id = azioni.creaCliente(pulito, portale);
    if (id === 'limite') {
      setPieno(true);
      return;
    }
    router.replace({ pathname: '/clienti/[id]', params: { id, creato: portale ? 'portale' : '1' } });
  };

  const svizzera = paese === 'CH';
  const rappr = d.rappresentante ?? {};

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego={ripiego} etichetta={t('comune.annulla')} />}
        titolo={esistente ? t('clienti.modulo.titoloModifica') : t('clienti.modulo.titoloNuovo')}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          {limitePieno ? <Avviso testo={t('clienti.modulo.limite', { totale: limiteClienti ?? 0 })} /> : null}

          <View style={{ gap: 8 }}>
            <Testo tipo="small" colore={colori.fg2}>
              {t('clienti.modulo.tipo')}
            </Testo>
            <Segmentato
              etichetta={t('clienti.modulo.tipo')}
              opzioni={[
                { valore: 'fisica', titolo: t('clienti.tipo.fisica') },
                { valore: 'giuridica', titolo: t('clienti.tipo.giuridica') },
              ]}
              valore={d.giuridica ? 'giuridica' : 'fisica'}
              onCambia={(v) => setD((x) => ({ ...x, giuridica: v === 'giuridica' }))}
            />
          </View>

          {!d.giuridica ? (
            <>
              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.anagrafica')}</TitoloSezione>
              {campo('nomeProprio', t('clienti.modulo.nome'), 'nomeProprio', { autoComplete: 'off' })}
              {campo('cognome', t('clienti.modulo.cognome'), 'cognome', { autoComplete: 'off' })}
              {svizzera
                ? campo('avs', t('clienti.modulo.avs'), 'avs', {
                    placeholder: t('clienti.modulo.avsEsempio'),
                    keyboardType: 'numbers-and-punctuation',
                  })
                : campo('cf', t('clienti.modulo.cf'), 'cf', { autoCapitalize: 'characters', maxLength: 16 })}
              {!svizzera
                ? campo('piva', t('clienti.modulo.piva'), 'piva', {
                    keyboardType: 'number-pad',
                    maxLength: 11,
                  })
                : null}
              <View style={stili.fila}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Campo
                    etichetta={t('clienti.modulo.dataNascita')}
                    placeholder={t('studio.campi.formatoData')}
                    value={nascita}
                    onChangeText={setNascita}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  {errore('dataNascita', nascita) ? (
                    <Testo tipo="cap" colore={colori.danger}>
                      {errore('dataNascita', nascita)}
                    </Testo>
                  ) : null}
                </View>
                {campo('luogoNascita', t('clienti.modulo.luogoNascita'), undefined, { stile: { flex: 1 } })}
              </View>
            </>
          ) : (
            <>
              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.societa')}</TitoloSezione>
              {campo('ragioneSociale', t('clienti.modulo.ragioneSociale'), 'ragioneSociale')}
              {svizzera ? (
                <>
                  {campo('uid', t('clienti.modulo.uid'), 'uid', {
                    placeholder: t('clienti.modulo.uidEsempio'),
                    autoCapitalize: 'characters',
                  })}
                  {campo('formaGiuridica', t('clienti.modulo.formaGiuridica'), undefined, {
                    placeholder: t('clienti.modulo.formaGiuridicaEsempio'),
                  })}
                  <View style={{ marginHorizontal: -20 }}>
                    <Riga
                      stretta
                      ruolo="switch"
                      selezionata={!!d.ivaAttiva}
                      titolo={t('clienti.modulo.ivaAttiva')}
                      destra={<Interruttore acceso={!!d.ivaAttiva} />}
                      onPress={() => setD((x) => ({ ...x, ivaAttiva: !x.ivaAttiva }))}
                    />
                  </View>
                </>
              ) : (
                <>
                  {campo('piva', t('clienti.modulo.piva'), 'piva', {
                    keyboardType: 'number-pad',
                    maxLength: 11,
                  })}
                  {campo('cf', t('clienti.modulo.cf'), 'cf', { autoCapitalize: 'characters', maxLength: 16 })}
                </>
              )}
              {campo('sedeLegale', t('clienti.modulo.sedeLegale'))}

              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.rappresentante')}</TitoloSezione>
              <View style={stili.fila}>
                <Campo
                  etichetta={t('clienti.modulo.rapprNome')}
                  value={rappr.nome ?? ''}
                  onChangeText={mettiRappr('nome')}
                  stile={{ flex: 1 }}
                />
                <Campo
                  etichetta={t('clienti.modulo.rapprCognome')}
                  value={rappr.cognome ?? ''}
                  onChangeText={mettiRappr('cognome')}
                  stile={{ flex: 1 }}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Campo
                  etichetta={svizzera ? t('clienti.modulo.rapprAvs') : t('clienti.modulo.rapprCf')}
                  value={rappr.codice ?? ''}
                  onChangeText={mettiRappr('codice')}
                  autoCapitalize="characters"
                />
                {errore('rappresentanteCodice', rappr.codice) ? (
                  <Testo tipo="cap" colore={colori.danger}>
                    {errore('rappresentanteCodice', rappr.codice)}
                  </Testo>
                ) : null}
              </View>
              <Campo
                etichetta={t('clienti.modulo.rapprCarica')}
                placeholder={t('clienti.modulo.rapprCaricaEsempio')}
                value={rappr.carica ?? ''}
                onChangeText={mettiRappr('carica')}
              />
            </>
          )}

          <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.contatti')}</TitoloSezione>
          {campo('email', t('clienti.modulo.email'), 'email', {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
            autoCorrect: false,
          })}
          {campo('telefono', t('clienti.modulo.telefono'), undefined, { keyboardType: 'phone-pad' })}
          {!svizzera
            ? campo('pec', t('clienti.modulo.pec'), undefined, {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })
            : null}

          <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.indirizzo')}</TitoloSezione>
          <View style={stili.fila}>
            {campo(
              'indirizzo',
              d.giuridica ? t('clienti.modulo.via.giuridica') : t('clienti.modulo.via.fisica'),
              undefined,
              { placeholder: t('clienti.modulo.viaSegnaposto'), stile: { flex: 3 } },
            )}
            {campo('numeroCivico', t('clienti.modulo.civico'), undefined, { stile: { flex: 1 } })}
          </View>
          <View style={stili.fila}>
            {campo('cap', svizzera ? t('clienti.modulo.cap.CH') : t('clienti.modulo.cap.IT'), 'cap', {
              keyboardType: 'number-pad',
              maxLength: svizzera ? 4 : 5,
              stile: { flex: 1 },
            })}
            {campo(
              'citta',
              svizzera ? t('clienti.modulo.citta.CH') : t('clienti.modulo.citta.IT'),
              undefined,
              {
                stile: { flex: 2 },
              },
            )}
          </View>
          <View style={stili.fila}>
            {svizzera ? (
              <View style={{ flex: 2 }}>
                <CampoScelta
                  etichetta={t('clienti.modulo.cantone')}
                  valore={d.cantone ?? t('clienti.modulo.scegliCantone')}
                  onPress={() => setFoglioCantone(true)}
                />
              </View>
            ) : (
              campo('provincia', t('clienti.modulo.provincia'), 'provincia', {
                autoCapitalize: 'characters',
                maxLength: 2,
                stile: { flex: 2 },
              })
            )}
            {campo('paese', t('clienti.modulo.paese'), 'paese', {
              autoCapitalize: 'characters',
              maxLength: 2,
              placeholder: paese,
              stile: { flex: 1 },
            })}
          </View>

          {!svizzera ? (
            <>
              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.fatturazione')}</TitoloSezione>
              {campo('codiceDestinatario', t('clienti.modulo.sdi'), 'codiceDestinatario', {
                autoCapitalize: 'characters',
                maxLength: 7,
              })}
              <Testo tipo="cap">{t('clienti.modulo.sdiTesto')}</Testo>
              {campo('pecFatturazione', t('clienti.modulo.pecFatturazione'), 'pecFatturazione', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}
            </>
          ) : null}

          {!esistente ? (
            <>
              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.portale')}</TitoloSezione>
              <View style={{ marginHorizontal: -20 }}>
                <Riga
                  stretta
                  ruolo="switch"
                  selezionata={portale}
                  titolo={t('clienti.modulo.portaleAttiva')}
                  sottotitolo={t('clienti.modulo.portaleTesto')}
                  destra={<Interruttore acceso={portale} />}
                  onPress={() => {
                    if (!portale && !password) setPassword(generaPassword());
                    setPortale(!portale);
                  }}
                />
              </View>
              {portale ? (
                <>
                  <View style={{ gap: 6 }}>
                    <Campo
                      etichetta={t('clienti.modulo.password')}
                      placeholder={t('clienti.modulo.passwordSegnaposto')}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      dopo={
                        <Pulsante
                          titolo={t('clienti.modulo.genera')}
                          variante="tenue"
                          piccolo
                          onPress={() => setPassword(generaPassword())}
                        />
                      }
                    />
                    {errore('password', password) ? (
                      <Testo tipo="cap" colore={colori.danger}>
                        {errore('password', password)}
                      </Testo>
                    ) : null}
                  </View>
                  <Testo tipo="cap">{t('clienti.modulo.passwordNota')}</Testo>
                </>
              ) : null}

              <TitoloSezione stile={stili.titolo}>{t('clienti.modulo.note')}</TitoloSezione>
              {campo('noteIniziali', t('clienti.modulo.note'), undefined, {
                placeholder: t('clienti.modulo.noteSegnaposto'),
                multiline: true,
              })}
            </>
          ) : null}
        </ScrollView>
        <BarraAzioni>
          <Pulsante
            titolo={esistente ? t('clienti.modulo.salva') : t('clienti.modulo.crea')}
            stile={{ flex: 1 }}
            disabilitato={limitePieno || (tentato && !valido)}
            onPress={salva}
          />
        </BarraAzioni>
      </KeyboardAvoidingView>

      <Foglio visibile={foglioCantone} onChiudi={() => setFoglioCantone(false)}>
        <Testo tipo="dS">{t('clienti.modulo.scegliCantone')}</Testo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cantoni.map((c) => (
            <Tag
              key={c}
              titolo={c}
              attivo={d.cantone === c}
              onPress={() => {
                setD((x) => ({ ...x, cantone: c }));
                setFoglioCantone(false);
              }}
            />
          ))}
        </View>
      </Foglio>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  titolo: { paddingHorizontal: 0, paddingTop: 8 },
  fila: { flexDirection: 'row', gap: 10 },
});
