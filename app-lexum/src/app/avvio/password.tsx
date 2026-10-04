import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { mandaLinkPassword } from '@/backend/accesso';
import { useTesti } from '@/lingue/useTesti';
import { datiVeri } from '@/config';
import { indietro } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A7 · Password dimenticata: si manda un link per email (come sul sito, «Invia link»).
// Il link riporta nell'app su «Nuova password» (A8): serve l'indirizzo dell'app tra i
// redirect di Supabase (vedi docs/DA-FARE-ANTONINO.md). Con i dati veri il link parte davvero.
export default function PasswordDimenticata() {
  const { paese: paeseAttivo } = useStato();
  const parametri = useLocalSearchParams<{ email?: string; paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const { t, lingua } = useTesti(paese);
  const nomePaese = t(`paesi.${paese as 'IT' | 'CH'}`);
  const [email, setEmail] = useState(parametri.email ?? '');
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const invia = async () => {
    if (!email.includes('@')) {
      setErrore(t('errori.scriviEmail'));
      return;
    }
    if (datiVeri) {
      setInCorso(true);
      const esito = await mandaLinkPassword(paese, email, lingua);
      setInCorso(false);
      if (esito.esito === 'errore') {
        setErrore(esito.messaggio);
        return;
      }
    }
    setInviata(true);
  };

  if (inviata) {
    return (
      <Schermata>
        <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/accesso" />} />
        <View style={stili.corpo}>
          <IconaQuadrata nome="email" lato={56} dimensione={26} />
          <View style={{ gap: 10 }}>
            <Testo tipo="dL" accessibilityRole="header">
              {t('avvio.password.inviataTitolo')}
            </Testo>
            <Testo colore={colori.fg2}>{t('avvio.password.inviataTesto', { email, paese: nomePaese })}</Testo>
          </View>
          <Testo tipo="small" colore={colori.fg3}>
            {t('avvio.password.nonArrivata')}
            <Text
              style={{ color: colori.accentText }}
              accessibilityRole="link"
              onPress={() => setInviata(false)}
            >
              {t('avvio.password.cambiaEmail')}
            </Text>
            .
          </Testo>
          <View style={{ flex: 1 }} />
          <Pulsante
            titolo={t('comune.tornaAccesso')}
            variante="linea"
            onPress={() => indietro('/avvio/accesso')}
          />
        </View>
      </Schermata>
    );
  }

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/accesso" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <IconaQuadrata nome="lucchetto" lato={56} dimensione={26} />
          <View style={{ gap: 10 }}>
            <Testo tipo="dL" accessibilityRole="header">
              {t('avvio.password.titolo')}
            </Testo>
            <Testo colore={colori.fg2}>{t('avvio.password.testo', { paese: nomePaese })}</Testo>
          </View>
          <Campo
            etichetta={t('comune.email')}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrore(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={() => void invia()}
          />
          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante
            titolo={inCorso ? t('avvio.password.inCorso') : t('avvio.password.invia')}
            disabilitato={inCorso}
            onPress={() => void invia()}
          />
          <Pulsante titolo={t('comune.tornaAccesso')} variante="tenue" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { flexGrow: 1, gap: 22, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 24 },
});
