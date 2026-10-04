import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { CampoPassword } from '@/componenti/CampoPassword';
import { Avviso } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { accedi as accediAlDatabase } from '@/backend/accesso';
import { datiVeri } from '@/config';
import { utenteFinto } from '@/dati-finti/utente';
import { ricominciaDa } from '@/navigazione';
import { useTesti } from '@/lingue/useTesti';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A6 · Accedi con email e password, come sul sito (non è nei mockup: stesso stile della registrazione).
// Con ?paese=CH entra nell'account di un altro paese (da G2). Con i dati veri entra nel database
// di quel paese (src/backend/accesso.ts); con quelli finti basta un'email e una password.
export default function Accesso() {
  const { paese: paeseAttivo, dueFattori, azioni } = useStato();
  const parametri = useLocalSearchParams<{ paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const altroPaese = !!parametri.paese && parametri.paese !== paeseAttivo;
  const datiPaese = trovaPaese(paese);
  const { t, lingua } = useTesti(paese);
  const [email, setEmail] = useState(datiVeri ? '' : utenteFinto.email);
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const entra = () => {
    if (altroPaese) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else ricominciaDa('/chat');
  };

  const accediDavvero = async () => {
    if (!email.trim() || !password) {
      setErrore(t('errori.scriviEmailPassword'));
      return;
    }
    setInCorso(true);
    const esito = await accediAlDatabase(paese, email, password, lingua);
    setInCorso(false);
    if (esito.esito === 'errore') setErrore(esito.messaggio);
    else if (esito.esito === 'due-passaggi')
      router.push({ pathname: '/avvio/verifica', params: altroPaese ? { paese } : {} });
    else {
      const { esito: _ok, ...dati } = esito;
      azioni.entrato(paese, dati);
      entra();
    }
  };

  const accedi = () => {
    if (datiVeri) {
      void accediDavvero();
      return;
    }
    // Finto: basta un'email con la chiocciola e una password non vuota.
    if (!email.includes('@') || password.length === 0) {
      setErrore(t('errori.credenziali'));
      return;
    }
    // Con la verifica in due passaggi attiva (dal sito o dall'app) serve anche il codice.
    if (dueFattori[paese]) {
      router.push({ pathname: '/avvio/verifica', params: altroPaese ? { paese } : {} });
      return;
    }
    entra();
  };

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/paese" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Testo tipo="dL" accessibilityRole="header">
              {t('avvio.accesso.titolo')}
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {altroPaese
                ? t(`avvio.accesso.testoAltroPaese.${paese as 'IT' | 'CH'}`, { sito: dominio(datiPaese) })
                : t('avvio.accesso.testo', { sito: dominio(datiPaese) })}
            </Testo>
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
          />
          <View style={{ gap: 4 }}>
            <CampoPassword
              etichetta={t('comune.password')}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrore(null);
              }}
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={accedi}
            />
            <Text
              style={stili.dimenticata}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/avvio/password', params: { email, paese } })}
            >
              {t('avvio.accesso.dimenticata')}
            </Text>
          </View>

          {errore ? <Avviso testo={errore} /> : null}

          <Pulsante
            titolo={inCorso ? t('avvio.accesso.inCorso') : t('comune.accedi')}
            disabilitato={inCorso}
            onPress={accedi}
          />
          <Text style={stili.registrati}>
            {t('avvio.accesso.senzaAccount')}{' '}
            <Text
              style={stili.link}
              accessibilityRole="link"
              onPress={() =>
                router.replace(
                  parametri.paese
                    ? { pathname: '/avvio/registrazione', params: { paese } }
                    : '/avvio/registrazione',
                )
              }
            >
              {t('comune.registrati')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 18, paddingTop: 6, paddingHorizontal: 24, paddingBottom: 24 },
  dimenticata: {
    alignSelf: 'flex-end',
    fontFamily: famiglie.testoMedio,
    fontSize: 14,
    color: colori.accentText,
    paddingVertical: 12,
  },
  registrati: {
    fontFamily: famiglie.testo,
    fontSize: 14,
    color: colori.fg2,
    textAlign: 'center',
    lineHeight: 44,
  },
  link: { fontFamily: famiglie.testoMedio, color: colori.accentText },
});
