import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo, CampoScelta } from '@/componenti/Campi';
import { Spunta } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Evidenza, Testo } from '@/componenti/Testo';
import { utenteFinto } from '@/dati-finti/utente';
import { apriSito, ricominciaDa } from '@/navigazione';
import { contenuti } from '@/paesi/contenuti';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A4 · Registrazione con email e password, come sul sito.
// Con ?paese=CH crea l'accesso in un altro paese (da G2). L'accesso vero arriva con la tappa 2.
export default function Registrazione() {
  const { paese: paeseAttivo } = useStato();
  const { paese: paeseParam } = useLocalSearchParams<{ paese?: string }>();
  const paese = paeseParam ?? paeseAttivo;
  const altroPaese = !!paeseParam && paeseParam !== paeseAttivo;
  const datiPaese = trovaPaese(paese);

  const [nome, setNome] = useState(utenteFinto.nome);
  const [cognome, setCognome] = useState(utenteFinto.cognome);
  const [email, setEmail] = useState(utenteFinto.email);
  const [password, setPassword] = useState('lexum-prova-2026');
  const [vedi, setVedi] = useState(false);
  const [accetto, setAccetto] = useState(true);

  const entra = () => {
    if (altroPaese) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else ricominciaDa('/chat');
  };

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/gratis" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Testo tipo="dL" accessibilityRole="header">
              {altroPaese ? `Crea l'accesso ${contenuti[paese].aggettivo}` : 'Crea il tuo account'}
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {altroPaese
                ? `Un account separato per ${datiPaese.nome}: anche qui la prima ricerca con Lex AI è gratuita.`
                : 'La prima ricerca con Lex AI è gratuita.'}
            </Testo>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Campo
              etichetta="Nome"
              value={nome}
              onChangeText={setNome}
              stile={{ flex: 1 }}
              autoComplete="given-name"
            />
            <Campo
              etichetta="Cognome"
              value={cognome}
              onChangeText={setCognome}
              stile={{ flex: 1 }}
              autoComplete="family-name"
            />
          </View>
          <Campo
            etichetta="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Campo
            etichetta="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!vedi}
            autoCapitalize="none"
            autoComplete="new-password"
            dopo={
              <PulsanteIcona
                icona="occhio"
                etichetta={vedi ? 'Nascondi la password' : 'Mostra la password'}
                dimensione={20}
                colore={colori.fg3}
                onPress={() => setVedi((v) => !v)}
                stile={{ marginRight: -8 }}
              />
            }
          />
          <CampoScelta etichetta="Professione" valore={utenteFinto.professione} />

          <Spunta attiva={accetto} onCambia={setAccetto}>
            Accetto i{' '}
            <Evidenza oro medio>
              <Text onPress={() => apriSito(`${datiPaese.sito}/termini`)} accessibilityRole="link">
                Termini di servizio
              </Text>
            </Evidenza>{' '}
            e ho letto l'
            <Evidenza oro medio>
              <Text onPress={() => apriSito(`${datiPaese.sito}/privacy`)} accessibilityRole="link">
                Informativa privacy
              </Text>
            </Evidenza>
            .
          </Spunta>

          <Pulsante
            titolo="Registrati"
            disabilitato={!accetto}
            onPress={() =>
              router.push(
                paeseParam
                  ? { pathname: '/avvio/codice', params: { paese, email } }
                  : { pathname: '/avvio/codice', params: { email } },
              )
            }
          />
          <Text style={stili.accedi}>
            Hai già un account?{' '}
            <Text style={stili.link} onPress={entra} accessibilityRole="link">
              Accedi
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 18, paddingTop: 6, paddingHorizontal: 24, paddingBottom: 24 },
  accedi: {
    fontFamily: famiglie.testo,
    fontSize: 14,
    color: colori.fg2,
    textAlign: 'center',
    lineHeight: 44,
  },
  link: { fontFamily: famiglie.testoMedio, color: colori.accentText },
});
