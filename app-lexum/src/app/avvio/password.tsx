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
import { datiVeri } from '@/config';
import { indietro } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A7 · Password dimenticata: si manda un link per email (come sul sito, «Invia link»).
// Il link riporta nell'app su «Nuova password» (A8): serve l'indirizzo dell'app tra i
// redirect di Supabase (vedi docs/DA-FARE-ANTONINO.md). Con i dati veri il link parte davvero.
export default function PasswordDimenticata() {
  const { paese: paeseAttivo } = useStato();
  const parametri = useLocalSearchParams<{ email?: string; paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const datiPaese = trovaPaese(paese);
  const [email, setEmail] = useState(parametri.email ?? '');
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const invia = async () => {
    if (!email.includes('@')) {
      setErrore("Scrivi l'email del tuo account.");
      return;
    }
    if (datiVeri) {
      setInCorso(true);
      const esito = await mandaLinkPassword(paese, email);
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
              Email inviata
            </Testo>
            <Testo colore={colori.fg2}>
              Se <Text style={{ color: colori.fg }}>{email}</Text> è l'email di un account Lexum{' '}
              {datiPaese.nome}, riceverai un link per scegliere una nuova password. Toccalo: ti riporta qui.
            </Testo>
          </View>
          <Testo tipo="small" colore={colori.fg3}>
            Non è arrivata? Controlla lo spam, oppure{' '}
            <Text
              style={{ color: colori.accentText }}
              accessibilityRole="link"
              onPress={() => setInviata(false)}
            >
              cambia email
            </Text>
            .
          </Testo>
          <View style={{ flex: 1 }} />
          <Pulsante titolo="Torna all'accesso" variante="linea" onPress={() => indietro('/avvio/accesso')} />
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
              Password dimenticata?
            </Testo>
            <Testo colore={colori.fg2}>
              Scrivi l'email del tuo account Lexum {datiPaese.nome}: ti mandiamo un link per sceglierne una
              nuova.
            </Testo>
          </View>
          <Campo
            etichetta="Email"
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
            titolo={inCorso ? 'Invio in corso…' : 'Invia link'}
            disabilitato={inCorso}
            onPress={() => void invia()}
          />
          <Pulsante titolo="Torna all'accesso" variante="tenue" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { flexGrow: 1, gap: 22, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 24 },
});
