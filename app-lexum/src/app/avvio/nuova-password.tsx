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
import { useTesti } from '@/lingue/useTesti';
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
  const { t, lingua } = useTesti(paese);
  const link = useSessioneDaLink(paese, lingua);
  const [inCorso, setInCorso] = useState(false);
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  const salva = async () => {
    if (password.length < MINIMO) return setErrore(t('errori.minimoCaratteri', { n: MINIMO }));
    if (password !== conferma) return setErrore(t('errori.passwordDiverse'));
    if (datiVeri) {
      if (link.stato !== 'ok')
        return setErrore(link.stato === 'errore' ? link.messaggio : t('avvio.nuovaPassword.attendi'));
      setInCorso(true);
      const esito = await salvaNuovaPassword(paese, password, lingua);
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
              {t('avvio.nuovaPassword.fattoTitolo')}
            </Testo>
            <Testo colore={colori.fg2}>{t('avvio.nuovaPassword.fattoTesto')}</Testo>
          </View>
          <View style={{ flex: 1 }} />
          <Pulsante
            titolo={t('comune.continua')}
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
              {t('avvio.nuovaPassword.titolo')}
            </Testo>
            <Testo colore={colori.fg2}>{t('avvio.nuovaPassword.testo', { n: MINIMO })}</Testo>
          </View>
          <CampoPassword
            etichetta={t('avvio.nuovaPassword.nuova')}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrore(null);
            }}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <CampoPassword
            etichetta={t('avvio.nuovaPassword.conferma')}
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
            titolo={inCorso ? t('avvio.nuovaPassword.inCorso') : t('avvio.nuovaPassword.salva')}
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
