import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { BarraAzioni, Segmentato, TitoloSezione } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import type { DatiFatturazione } from '@/dati-finti/studio';
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
    if (pieno(d.piva) && !pivaValida(d.piva!)) errori.piva = 'La partita IVA ha 11 cifre: controlla.';
    if (pieno(d.cf) && !cfValido(d.cf!)) errori.cf = 'Il codice fiscale ha 16 caratteri (o 11 cifre).';
    if (pieno(d.provincia) && !/^[A-Za-z]{2}$/.test(d.provincia!.trim()))
      errori.provincia = 'La sigla ha due lettere, per esempio MI.';
  } else if (d.assoggettatoIva && pieno(d.numeroIva) && !numeroIvaValido(d.numeroIva!)) {
    errori.numeroIva = 'Si scrive così: CHE-123.456.789 IVA.';
  }
  if (pieno(d.cap) && !capValido(d.cap!, paese))
    errori.cap = paese === 'CH' ? 'Il NPA ha 4 cifre.' : 'Il CAP ha 5 cifre.';
  if (pieno(d.iban) && !ibanValido(d.iban!, paese))
    errori.iban =
      paese === 'CH'
        ? 'L’IBAN svizzero ha 21 caratteri e inizia con CH.'
        : 'L’IBAN italiano ha 27 caratteri e inizia con IT.';
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
        sinistra={<BottoneIndietro ripiego="/fatture" etichetta="Annulla" />}
        titolo="Dati di fatturazione"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <Testo tipo="small" colore={colori.fg2}>
            Vanno sul PDF di ogni fattura. Sono gli stessi del sito: li cambi qui e cambiano anche lì.
          </Testo>

          {paese === 'IT' ? (
            <>
              <TitoloSezione stile={stili.titolo}>Dati fiscali</TitoloSezione>
              {campo('piva', 'Partita IVA', {
                keyboardType: 'number-pad',
                maxLength: 11,
                placeholder: '11 cifre',
              })}
              {campo('cf', 'Codice fiscale', { autoCapitalize: 'characters', maxLength: 16 })}
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  Regime fiscale
                </Testo>
                <Segmentato
                  etichetta="Regime fiscale"
                  opzioni={[
                    { valore: 'ordinario', titolo: 'Ordinario' },
                    { valore: 'forfettario', titolo: 'Forfettario' },
                  ]}
                  valore={d.regime ?? 'ordinario'}
                  onCambia={(v) => setD((x) => ({ ...x, regime: v }))}
                />
              </View>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  Cassa di previdenza
                </Testo>
                <Scelta
                  voci={(Object.keys(nomiCassa) as (keyof typeof nomiCassa)[]).map((k) => ({
                    valore: k,
                    titolo: nomiCassa[k],
                  }))}
                  valore={d.cassa ?? null}
                  onCambia={(v) => setD((x) => ({ ...x, cassa: v }))}
                  etichettaGruppo="Cassa di previdenza"
                />
              </View>
            </>
          ) : null}

          <TitoloSezione stile={stili.titolo}>Indirizzo dello studio</TitoloSezione>
          <View style={stili.fila}>
            {campo('via', 'Via', { stile: { flex: 3 } })}
            {campo('civico', 'Numero', { stile: { flex: 1 } })}
          </View>
          <View style={stili.fila}>
            {campo('cap', paese === 'CH' ? 'NPA' : 'CAP', {
              keyboardType: 'number-pad',
              maxLength: paese === 'CH' ? 4 : 5,
              stile: { flex: 1 },
            })}
            {campo('citta', paese === 'CH' ? 'Località' : 'Comune', { stile: { flex: 2 } })}
          </View>
          {paese === 'IT'
            ? campo('provincia', 'Provincia', { autoCapitalize: 'characters', maxLength: 2 })
            : null}

          <TitoloSezione stile={stili.titolo}>Pagamento</TitoloSezione>
          {campo('iban', paese === 'CH' ? 'IBAN o QR-IBAN' : 'IBAN', { autoCapitalize: 'characters' })}
          {paese === 'CH' && d.iban && ibanValido(d.iban, 'CH') ? (
            <Testo tipo="cap">
              {eQrIban(d.iban)
                ? 'È un QR-IBAN: la QR-fattura avrà un riferimento QR.'
                : 'Va sulla QR-fattura, la sezione di pagamento in fondo al PDF.'}
            </Testo>
          ) : null}

          {paese === 'CH' ? (
            <>
              <TitoloSezione stile={stili.titolo}>IVA</TitoloSezione>
              <View style={{ gap: 8 }}>
                <Testo tipo="small" colore={colori.fg2}>
                  Sei assoggettato all'IVA?
                </Testo>
                <Segmentato
                  etichetta="Assoggettato all'IVA"
                  opzioni={[
                    { valore: 'si', titolo: 'Sì' },
                    { valore: 'no', titolo: 'No' },
                  ]}
                  valore={(d.assoggettatoIva == null ? '' : d.assoggettatoIva ? 'si' : 'no') as 'si' | 'no'}
                  onCambia={(v) => setD((x) => ({ ...x, assoggettatoIva: v === 'si' }))}
                />
                <Testo tipo="cap">
                  {d.assoggettatoIva === false
                    ? 'Le tue fatture saranno esenti, con il motivo scritto in fattura.'
                    : 'Obbligatorio da CHF 100’000 di cifra d’affari all’anno.'}
                </Testo>
              </View>
              {d.assoggettatoIva
                ? campo('numeroIva', 'Numero IVA', {
                    autoCapitalize: 'characters',
                    placeholder: 'CHE-123.456.789 IVA',
                  })
                : null}
            </>
          ) : null}
        </ScrollView>
        <BarraAzioni>
          <Pulsante titolo="Salva" stile={{ flex: 1 }} disabilitato={!valido} onPress={salva} />
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
