import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CampoPassword } from '@/componenti/CampoPassword';
import { Avviso, IconaQuadrata } from '@/componenti/Elementi';
import { Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { salvaNuovaPassword } from '@/backend/accesso';
import { useSessioneDaLink } from '@/backend/useSessioneDaLink';
import { datiVeri } from '@/config';
import { ricominciaDa } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

const MINIMO = 8; // come sul sito

// A8 · Nuova password: ci si arriva dal link dell'email «Password dimenticata»
// (lexum://avvio/nuova-password?paese=IT#…). Con i dati veri la sessione arriva dal link e la
// password si salva nel database di quel paese.
export default function NuovaPassword() {
  const { paese: paeseAttivo, azioni } = useStato();
  const parametri = useLocalSearchParams<{ paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const link = useSessioneDaLink(paese);
  const [inCorso, setInCorso] = useState(false);
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  const salva = async () => {
    if (password.length < MINIMO) return setErrore(`Minimo ${MINIMO} caratteri`);
    if (password !== conferma) return setErrore('Le password non coincidono');
    if (datiVeri) {
      if (link.stato !== 'ok') return setErrore(link.stato === 'errore' ? link.messaggio : 'Un momento…');
      setInCorso(true);
      const esito = await salvaNuovaPassword(paese, password);
      setInCorso(false);
      if (esito.esito === 'errore') return setErrore(esito.messaggio);
      const { stato: _ok, ...profilo } = link;
      azioni.entrato(paese, profilo);
    }
    setFatto(true);
  };

  if (fatto) {
    return (
      <Schermata>
        <Intestazione />
        <View style={stili.corpo}>
          <IconaQuadrata nome="spunta" lato={56} dimensione={26} />
          <View style={{ gap: 10 }}>
            <Testo tipo="dL" accessibilityRole="header">
              Password aggiornata
            </Testo>
            <Testo colore={colori.fg2}>Da ora entri con la nuova password, qui e sul sito.</Testo>
          </View>
          <View style={{ flex: 1 }} />
          <Pulsante
            titolo="Continua"
            onPress={() =>
              ricominciaDa(paese !== paeseAttivo ? { pathname: '/passaggio', params: { paese } } : '/chat')
            }
          />
        </View>
      </Schermata>
    );
  }

  return (
    <Schermata>
      <Intestazione />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <IconaQuadrata nome="lucchetto" lato={56} dimensione={26} />
          <View style={{ gap: 10 }}>
            <Testo tipo="dL" accessibilityRole="header">
              Nuova password
            </Testo>
            <Testo colore={colori.fg2}>Scegline una di almeno {MINIMO} caratteri.</Testo>
          </View>
          <CampoPassword
            etichetta="Nuova password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrore(null);
            }}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <CampoPassword
            etichetta="Conferma password"
            value={conferma}
            onChangeText={(t) => {
              setConferma(t);
              setErrore(null);
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={() => void salva()}
          />
          {errore ? <Avviso testo={errore} /> : null}
          {link.stato === 'errore' ? <Avviso testo={link.messaggio} /> : null}
          <Pulsante
            titolo={inCorso ? 'Salvataggio…' : 'Salva password'}
            disabilitato={inCorso || link.stato === 'errore'}
            onPress={() => void salva()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { flexGrow: 1, gap: 22, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 24 },
});
