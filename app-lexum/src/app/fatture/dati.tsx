import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo, CampoScelta } from '@/componenti/Campi';
import { BarraAzioni, Segmentato, Tag, TitoloSezione } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { CassaIT, DatiFatturazione, RegimeIT } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { Scelta } from '@/studio/Campi';
import { cantoni } from '@/studio/clienti';
import {
  capValido,
  cassaPredefinita,
  casse,
  cfValido,
  eQrIban,
  ibanSvizzero,
  ibanValido,
  normalizzaUid,
  pivaValida,
  sdiValido,
} from '@/studio/fatturazione';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

type CampoTesto = Exclude<keyof DatiFatturazione, 'regime' | 'cassa' | 'assoggettatoIva'>;

// S9 · Dati di fatturazione del professionista: vanno sul PDF (e in Italia sull'XML) di ogni fattura.
// Dal 04-10-2026 sui siti si scrivono nel Profilo, sezione «Dati di fatturazione», con gli stessi controlli:
// - Italia: partita IVA, codice fiscale, regime (RF01 o RF19), cassa, indirizzo, paese, IBAN, codice SDI;
// - Svizzera: indirizzo con Cantone e paese, IBAN del conto, QR-IBAN facoltativo, IVA sì/no (di base no)
//   e numero IDI con la cifra di controllo, obbligatorio con l'IVA.
// Un campo vuoto si salva vuoto; uno scritto male no. Si apre da Profilo, da Fatture e dalla nuova fattura.
export default function DatiFatturazioneSchermata() {
  const { paese, ruoli } = useStato();
  const { fatturazione, azioni } = useStudio();
  const { t } = useTesti();
  const svizzera = paese === 'CH';
  const [d, setD] = useState<DatiFatturazione>(() => ({
    ...fatturazione,
    regime: svizzera ? undefined : (fatturazione.regime ?? 'RF01'),
    cassa: svizzera ? undefined : (fatturazione.cassa ?? cassaPredefinita(ruoli[paese] ?? '')),
    paese: fatturazione.paese ?? paese,
  }));
  const [foglioCantone, setFoglioCantone] = useState(false);
  const metti = (campo: CampoTesto) => (v: string) => setD((x) => ({ ...x, [campo]: v }));

  const errori: Partial<Record<keyof DatiFatturazione, string>> = {};
  const pieno = (v?: string) => !!v && !!v.trim();
  const paeseStudio = (d.paese ?? paese).trim().toUpperCase();
  if (pieno(d.paese) && !/^[A-Z]{2}$/.test(paeseStudio)) errori.paese = t('fatture.datiNuovi.errori.paese');
  if (!svizzera) {
    // come il Profilo del sito: partita IVA, CAP e provincia si controllano per un indirizzo in Italia
    if (paeseStudio === 'IT' && pieno(d.piva) && !pivaValida(d.piva!))
      errori.piva = t('fatture.dati.errori.piva');
    if (pieno(d.cf) && !cfValido(d.cf!)) errori.cf = t('fatture.dati.errori.cf');
    if (paeseStudio === 'IT' && pieno(d.provincia) && !/^[A-Za-z]{2}$/.test(d.provincia!.trim()))
      errori.provincia = t('fatture.dati.errori.provincia');
    if (paeseStudio === 'IT' && pieno(d.cap) && !capValido(d.cap!, 'IT'))
      errori.cap = t('fatture.dati.errori.cap.IT');
    if (pieno(d.codiceDestinatario) && !sdiValido(d.codiceDestinatario!, false))
      errori.codiceDestinatario = t('fatture.datiNuovi.errori.sdi');
    if (pieno(d.iban) && !ibanValido(d.iban!)) errori.iban = t('fatture.datiNuovi.errori.iban');
  } else {
    if (['CH', 'LI'].includes(paeseStudio) && pieno(d.cap) && !capValido(d.cap!, 'CH'))
      errori.cap = t('fatture.dati.errori.cap.CH');
    if (pieno(d.iban))
      errori.iban = !ibanValido(d.iban!)
        ? t('fatture.datiNuovi.errori.iban')
        : eQrIban(d.iban!)
          ? t('fatture.datiNuovi.errori.ibanQr')
          : undefined;
    if (pieno(d.qrIban) && (!ibanSvizzero(d.qrIban!) || !eQrIban(d.qrIban!)))
      errori.qrIban = t('fatture.datiNuovi.errori.qrIban');
    if (d.assoggettatoIva && !pieno(d.numeroIva))
      errori.numeroIva = t('fatture.datiNuovi.errori.idiObbligatorio');
    else if (pieno(d.numeroIva) && !normalizzaUid(d.numeroIva!))
      errori.numeroIva = t('fatture.datiNuovi.errori.idi');
  }
  for (const k of Object.keys(errori) as (keyof DatiFatturazione)[]) if (!errori[k]) delete errori[k];
  const valido = Object.keys(errori).length === 0;

  const campo = (nome: CampoTesto, etichetta: string, altro?: Partial<ComponentProps<typeof Campo>>) => (
    <View style={[{ gap: 6 }, altro?.stile]}>
      <Campo
        etichetta={etichetta}
        value={(d[nome] as string | undefined) ?? ''}
        onChangeText={metti(nome)}
        {...altro}
        stile={undefined}
      />
      {errori[nome] ? (
        <Testo tipo="cap" colore={colori.danger}>
          {errori[nome]}
        </Testo>
      ) : null}
    </View>
  );

  // Come il sito: maiuscole dove servono, IBAN senza spazi, IDI nella forma ufficiale, vuoti tolti.
  const salva = () => {
    const pulito = Object.fromEntries(
      Object.entries(d).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]),
    ) as DatiFatturazione;
    for (const k of ['provincia', 'cf', 'codiceDestinatario', 'paese', 'cantone'] as const)
      if (pulito[k]) pulito[k] = pulito[k]!.toUpperCase();
    for (const k of ['iban', 'qrIban'] as const)
      if (pulito[k]) pulito[k] = pulito[k]!.replace(/\s+/g, '').toUpperCase();
    if (pulito.numeroIva) pulito.numeroIva = normalizzaUid(pulito.numeroIva) ?? pulito.numeroIva;
    if (svizzera) pulito.assoggettatoIva = !!pulito.assoggettatoIva;
    azioni.salvaDatiFatturazione(pulito);
    indietro('/fatture');
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta={t('comune.annulla')} />}
        titolo={t('fatture.dati.titolo')}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <Testo tipo="small" colore={colori.fg2}>
            {t('fatture.dati.intro')}
          </Testo>

          {!svizzera ? (
            <>
              <TitoloSezione stile={stili.titolo}>{t('fatture.dati.datiFiscali')}</TitoloSezione>
              {campo('piva', t('fatture.dati.partitaIva'), {
                keyboardType: 'number-pad',
                maxLength: 11,
                placeholder: t('fatture.dati.undiciCifre'),
              })}
              {campo('cf', t('fatture.dati.codiceFiscale'), { autoCapitalize: 'characters', maxLength: 16 })}
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.dati.regime')}
                </Testo>
                <Segmentato<RegimeIT>
                  etichetta={t('fatture.dati.regime')}
                  opzioni={[
                    { valore: 'RF01', titolo: t('fatture.datiNuovi.regimi.RF01') },
                    { valore: 'RF19', titolo: t('fatture.datiNuovi.regimi.RF19') },
                  ]}
                  valore={d.regime ?? 'RF01'}
                  onCambia={(v) => setD((x) => ({ ...x, regime: v }))}
                />
              </View>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.dati.cassa')}
                </Testo>
                <Scelta<CassaIT>
                  voci={casse.map((k) => ({ valore: k, titolo: t(`fatture.datiNuovi.casse.${k}`) }))}
                  valore={d.cassa ?? null}
                  onCambia={(v) => setD((x) => ({ ...x, cassa: v }))}
                  etichettaGruppo={t('fatture.dati.cassa')}
                />
              </View>
            </>
          ) : null}

          <TitoloSezione stile={stili.titolo}>{t('fatture.dati.indirizzo')}</TitoloSezione>
          <View style={stili.fila}>
            {campo('via', t('fatture.dati.via'), { stile: { flex: 3 } })}
            {campo('civico', t('fatture.dati.civico'), { stile: { flex: 1 } })}
          </View>
          <View style={stili.fila}>
            {campo('cap', svizzera ? t('fatture.dati.cap.CH') : t('fatture.dati.cap.IT'), {
              keyboardType: 'number-pad',
              maxLength: svizzera ? 4 : 5,
              stile: { flex: 1 },
            })}
            {campo('citta', svizzera ? t('fatture.dati.citta.CH') : t('fatture.dati.citta.IT'), {
              stile: { flex: 2 },
            })}
          </View>
          <View style={stili.fila}>
            {svizzera ? (
              <View style={{ flex: 2 }}>
                <CampoScelta
                  etichetta={t('fatture.datiNuovi.cantone')}
                  valore={d.cantone ?? t('fatture.datiNuovi.scegliCantone')}
                  onPress={() => setFoglioCantone(true)}
                />
              </View>
            ) : (
              campo('provincia', t('fatture.dati.provincia'), {
                autoCapitalize: 'characters',
                maxLength: 2,
                stile: { flex: 2 },
              })
            )}
            {campo('paese', t('fatture.datiNuovi.paese'), {
              autoCapitalize: 'characters',
              maxLength: 2,
              stile: { flex: 1 },
            })}
          </View>

          <TitoloSezione stile={stili.titolo}>{t('fatture.voci.pagamento')}</TitoloSezione>
          {campo('iban', svizzera ? t('fatture.datiNuovi.ibanConto') : t('fatture.dati.iban.IT'), {
            autoCapitalize: 'characters',
          })}
          {svizzera ? (
            <>
              {campo('qrIban', t('fatture.datiNuovi.qrIban'), { autoCapitalize: 'characters' })}
              <Testo tipo="cap">{t('fatture.datiNuovi.qrIbanTesto')}</Testo>
            </>
          ) : (
            campo('codiceDestinatario', t('fatture.datiNuovi.sdi'), {
              autoCapitalize: 'characters',
              maxLength: 7,
            })
          )}

          {svizzera ? (
            <>
              <TitoloSezione stile={stili.titolo}>{t('fatture.voci.iva')}</TitoloSezione>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.dati.assoggettatoDomanda')}
                </Testo>
                <Segmentato
                  etichetta={t('fatture.dati.assoggettato')}
                  opzioni={[
                    { valore: 'si', titolo: t('fatture.dati.si') },
                    { valore: 'no', titolo: t('fatture.dati.no') },
                  ]}
                  valore={d.assoggettatoIva ? 'si' : 'no'}
                  onCambia={(v) => setD((x) => ({ ...x, assoggettatoIva: v === 'si' }))}
                />
                <Testo tipo="cap">
                  {d.assoggettatoIva ? t('fatture.dati.obbligo') : t('fatture.datiNuovi.nonAssoggettato')}
                </Testo>
              </View>
              {d.assoggettatoIva
                ? campo('numeroIva', t('fatture.datiNuovi.numeroIdi'), {
                    autoCapitalize: 'characters',
                    placeholder: t('fatture.datiNuovi.esempioIdi'),
                  })
                : null}
            </>
          ) : null}
        </ScrollView>
        <BarraAzioni>
          <Pulsante
            titolo={t('fatture.dati.salva')}
            stile={{ flex: 1 }}
            disabilitato={!valido}
            onPress={salva}
          />
        </BarraAzioni>
      </KeyboardAvoidingView>

      <Foglio visibile={foglioCantone} onChiudi={() => setFoglioCantone(false)}>
        <Testo tipo="dS">{t('fatture.datiNuovi.scegliCantone')}</Testo>
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
