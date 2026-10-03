import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CampoPassword } from '@/componenti/CampoPassword';
import { Avviso, IconaQuadrata } from '@/componenti/Elementi';
import { Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { ricominciaDa } from '@/navigazione';
import { colori } from '@/tema';

const MINIMO = 8; // come sul sito

// A8 · Nuova password: ci si arriva dal link dell'email «Password dimenticata»
// (lexum://avvio/nuova-password). Il salvataggio vero arriva con la tappa 2.
export default function NuovaPassword() {
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  const salva = () => {
    if (password.length < MINIMO) return setErrore(`Minimo ${MINIMO} caratteri`);
    if (password !== conferma) return setErrore('Le password non coincidono');
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
          <Pulsante titolo="Continua" onPress={() => ricominciaDa('/chat')} />
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
            onSubmitEditing={salva}
          />
          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante titolo="Salva password" onPress={salva} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { flexGrow: 1, gap: 22, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 24 },
});
