import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { ricominciaDa } from '@/navigazione';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

type Modo = 'codice' | 'recupero' | 'spenta';

// A10 · Verifica in due passaggi all'accesso, come Verifica2FA del sito: il codice di 6 cifre
// dell'app di autenticazione (lo stesso che vale sul sito), oppure un codice di recupero.
// Dalla tappa 2: supabase.auth.mfa.challengeAndVerify e la funzione mfa-backup-codes (action «verify»).
export default function Verifica() {
  const { paese: paeseAttivo, azioni } = useStato();
  const parametri = useLocalSearchParams<{ paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const altroPaese = !!parametri.paese && parametri.paese !== paeseAttivo;
  const sito = dominio(trovaPaese(paese));
  const [modo, setModo] = useState<Modo>('codice');
  const [codice, setCodice] = useState('');
  const [recupero, setRecupero] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  const entra = () => {
    if (altroPaese) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else ricominciaDa('/chat');
  };

  // Finto: ogni codice di 6 cifre va bene, tranne 000000 (per vedere l'errore).
  const verifica = () => {
    if (codice.length !== 6) return;
    if (codice === '000000') {
      setErrore("Codice non valido. Controlla che l'ora del telefono sia giusta e riprova.");
      setCodice('');
      return;
    }
    entra();
  };

  // Come sul sito: un codice di recupero spegne la verifica in due passaggi; poi si rientra e la si riattiva.
  const usaRecupero = () => {
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(recupero.trim())) {
      setErrore('Codice non valido o già usato.');
      return;
    }
    azioni.impostaDueFattori(false);
    setModo('spenta');
  };

  const cambia = (m: Modo) => {
    setModo(m);
    setErrore(null);
  };

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/accesso" etichetta="Torna all'accesso" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          {modo === 'spenta' ? (
            <>
              <IconaQuadrata nome="lucchetto" />
              <Testo tipo="dM" accessibilityRole="header">
                Verifica in due passaggi spenta
              </Testo>
              <Testo colore={colori.fg2}>
                Il codice di recupero è stato accettato. Per sicurezza la verifica in due passaggi si è
                spenta, anche su {sito}: ora il tuo account è protetto solo dalla password.
              </Testo>
              <Scheda tono="oro" stile={{ gap: 6 }}>
                <Testo medio>Riattivala appena entri</Testo>
                <Testo tipo="small" colore={colori.fg2}>
                  Profilo → Account → Verifica in due passaggi.
                </Testo>
              </Scheda>
              <Pulsante titolo="Accedi di nuovo" onPress={() => router.replace('/avvio/accesso')} />
            </>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Testo tipo="dL" accessibilityRole="header">
                  {modo === 'codice' ? 'Verifica in due passaggi' : 'Codice di recupero'}
                </Testo>
                <Testo tipo="small" colore={colori.fg2}>
                  {modo === 'codice'
                    ? `Scrivi il codice di 6 cifre della tua app di autenticazione: è lo stesso che usi su ${sito}.`
                    : 'Usa uno dei codici che hai salvato quando hai attivato la verifica.'}
                </Testo>
              </View>

              {modo === 'codice' ? (
                <Campo
                  etichetta="Codice di 6 cifre"
                  placeholder="123456"
                  value={codice}
                  onChangeText={(t) => {
                    setCodice(t.replace(/\D/g, '').slice(0, 6));
                    setErrore(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  onSubmitEditing={verifica}
                />
              ) : (
                <>
                  <Scheda tono="oro">
                    <Testo tipo="small" colore={colori.fg2}>
                      Con un codice di recupero la verifica in due passaggi si spegne, qui e sul sito. Potrai
                      riattivarla dal Profilo.
                    </Testo>
                  </Scheda>
                  <Campo
                    etichetta="Codice di recupero"
                    placeholder="XXXX-XXXX"
                    value={recupero}
                    onChangeText={(t) => {
                      setRecupero(t.toUpperCase());
                      setErrore(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onSubmitEditing={usaRecupero}
                  />
                </>
              )}

              {errore ? <Avviso testo={errore} /> : null}

              {modo === 'codice' ? (
                <Pulsante titolo="Verifica e accedi" disabilitato={codice.length !== 6} onPress={verifica} />
              ) : (
                <Pulsante
                  titolo="Usa il codice e accedi"
                  disabilitato={!recupero.trim()}
                  onPress={usaRecupero}
                />
              )}
              <Text
                style={stili.link}
                accessibilityRole="link"
                onPress={() => cambia(modo === 'codice' ? 'recupero' : 'codice')}
              >
                {modo === 'codice'
                  ? 'Ho perso il telefono: uso un codice di recupero'
                  : "Torna al codice dell'app di autenticazione"}
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  link: {
    fontFamily: famiglie.testo,
    fontSize: 14,
    color: colori.accentText,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
