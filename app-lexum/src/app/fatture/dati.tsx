import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { BarraAzioni, Segmentato, TitoloSezione } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { DatiFatturazione } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { Scelta } from '@/studio/Campi';
import {
  capValido,
  cfValido,
  eQrIban,
  ibanValido,
  nomiCassa,
  numeroIvaValido,
  pivaValida,
} from '@/studio/fatturazione';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// S9 · Dati di fatturazione del professionista: vanno sul PDF di ogni fattura.
// Sui siti esistono quasi tutti come colonne del profilo, ma oggi non si possono scrivere dal Profilo
// (vedi docs/professionisti/fatture.md). Si apre da Profilo, da Fatture e dalla nuova fattura.
export default function DatiFatturazioneSchermata() {
  const { paese, ruoli } = useStato();
  const { fatturazione, azioni } = useStudio();
  const { t } = useTesti();
  const [d, setD] = useState<DatiFatturazione>(() => ({
    ...fatturazione,
    cassa: fatturazione.cassa ?? (ruoli[paese] === 'commercialista' ? 'TC04' : 'TC01'),
    paese: fatturazione.paese ?? paese,
  }));
  const metti = (campo: keyof DatiFatturazione) => (v: string) => setD((x) => ({ ...x, [campo]: v }));

  // Un campo vuoto va bene (si salva com'è); uno scritto male no.
  const errori: Partial<Record<keyof DatiFatturazione, string>> = {};
  const pieno = (v?: string) => !!v && !!v.trim();
  if (paese === 'IT') {
    if (pieno(d.piva) && !pivaValida(d.piva!)) errori.piva = t('fatture.dati.errori.piva');
    if (pieno(d.cf) && !cfValido(d.cf!)) errori.cf = t('fatture.dati.errori.cf');
    if (pieno(d.provincia) && !/^[A-Za-z]{2}$/.test(d.provincia!.trim()))
      errori.provincia = t('fatture.dati.errori.provincia');
  } else if (d.assoggettatoIva && pieno(d.numeroIva) && !numeroIvaValido(d.numeroIva!)) {
    errori.numeroIva = t('fatture.dati.errori.numeroIva');
  }
  if (pieno(d.cap) && !capValido(d.cap!, paese))
    errori.cap = paese === 'CH' ? t('fatture.dati.errori.cap.CH') : t('fatture.dati.errori.cap.IT');
  if (pieno(d.iban) && !ibanValido(d.iban!, paese))
    errori.iban = paese === 'CH' ? t('fatture.dati.errori.iban.CH') : t('fatture.dati.errori.iban.IT');
  const valido = Object.keys(errori).length === 0;

  const campo = (
    nome: keyof DatiFatturazione,
    etichetta: string,
    altro?: Partial<ComponentProps<typeof Campo>>,
  ) => (
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

  const salva = () => {
    const pulito = Object.fromEntries(
      Object.entries(d).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]),
    ) as DatiFatturazione;
    if (pulito.provincia) pulito.provincia = pulito.provincia.toUpperCase();
    if (pulito.cf) pulito.cf = pulito.cf.toUpperCase();
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

          {paese === 'IT' ? (
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
                <Segmentato
                  etichetta={t('fatture.dati.regime')}
                  opzioni={[
                    { valore: 'ordinario', titolo: t('fatture.dati.ordinario') },
                    { valore: 'forfettario', titolo: t('fatture.dati.forfettario') },
                  ]}
                  valore={d.regime ?? 'ordinario'}
                  onCambia={(v) => setD((x) => ({ ...x, regime: v }))}
                />
              </View>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('fatture.dati.cassa')}
                </Testo>
                <Scelta
                  voci={(Object.keys(nomiCassa) as (keyof typeof nomiCassa)[]).map((k) => ({
                    valore: k,
                    titolo: nomiCassa[k],
                  }))}
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
            {campo('cap', paese === 'CH' ? t('fatture.dati.cap.CH') : t('fatture.dati.cap.IT'), {
              keyboardType: 'number-pad',
              maxLength: paese === 'CH' ? 4 : 5,
              stile: { flex: 1 },
            })}
            {campo('citta', paese === 'CH' ? t('fatture.dati.citta.CH') : t('fatture.dati.citta.IT'), {
              stile: { flex: 2 },
            })}
          </View>
          {paese === 'IT'
            ? campo('provincia', t('fatture.dati.provincia'), { autoCapitalize: 'characters', maxLength: 2 })
            : null}

          <TitoloSezione stile={stili.titolo}>{t('fatture.voci.pagamento')}</TitoloSezione>
          {campo('iban', paese === 'CH' ? t('fatture.dati.iban.CH') : t('fatture.dati.iban.IT'), {
            autoCapitalize: 'characters',
          })}
          {paese === 'CH' && d.iban && ibanValido(d.iban, 'CH') ? (
            <Testo tipo="cap">{eQrIban(d.iban) ? t('fatture.dati.qrIban') : t('fatture.dati.sullaQr')}</Testo>
          ) : null}

          {paese === 'CH' ? (
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
                  valore={(d.assoggettatoIva == null ? '' : d.assoggettatoIva ? 'si' : 'no') as 'si' | 'no'}
                  onCambia={(v) => setD((x) => ({ ...x, assoggettatoIva: v === 'si' }))}
                />
                <Testo tipo="cap">
                  {d.assoggettatoIva === false ? t('fatture.dati.esenti') : t('fatture.dati.obbligo')}
                </Testo>
              </View>
              {d.assoggettatoIva
                ? campo('numeroIva', t('fatture.dati.numeroIva'), {
                    autoCapitalize: 'characters',
                    placeholder: t('fatture.dati.esempioNumeroIva'),
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
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  titolo: { paddingHorizontal: 0, paddingTop: 8 },
  fila: { flexDirection: 'row', gap: 10 },
});
