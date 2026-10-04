import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { usaCodiceRecupero, verificaCodice } from '@/backend/accesso';
import { datiVeri } from '@/config';
import { useTesti } from '@/lingue/useTesti';
import { entraNellApp, ricominciaDa } from '@/navigazione';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

type Modo = 'codice' | 'recupero' | 'spenta';

// A10 · Verifica in due passaggi all'accesso, come Verifica2FA del sito: il codice di 6 cifre
// dell'app di autenticazione (lo stesso che vale sul sito), oppure un codice di recupero.
// Con i dati veri: supabase.auth.mfa.challengeAndVerify e la funzione mfa-backup-codes (action «verify»).
export default function Verifica() {
  const { paese: paeseAttivo, ruoli, azioni } = useStato();
  const parametri = useLocalSearchParams<{ paese?: string }>();
  const paese = parametri.paese ?? paeseAttivo;
  const altroPaese = !!parametri.paese && parametri.paese !== paeseAttivo;
  const sito = dominio(trovaPaese(paese));
  const { t, lingua } = useTesti(paese);
  const [modo, setModo] = useState<Modo>('codice');
  const [codice, setCodice] = useState('');
  const [recupero, setRecupero] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const entra = (ruolo = ruoli[paese]) => {
    if (altroPaese) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else entraNellApp(ruolo);
  };

  const verificaDavvero = async () => {
    setInCorso(true);
    const esito = await verificaCodice(paese, codice, lingua);
    setInCorso(false);
    if (esito.esito === 'ok') {
      const { esito: _ok, ...dati } = esito;
      azioni.entrato(paese, dati);
      entra(dati.ruolo);
    } else if (esito.esito === 'errore') {
      setErrore(esito.messaggio);
      setCodice('');
    }
  };

  const recuperoDavvero = async () => {
    setInCorso(true);
    const esito = await usaCodiceRecupero(paese, recupero, lingua);
    setInCorso(false);
    if (esito.esito === 'ok') {
      azioni.impostaDueFattori(false);
      setModo('spenta');
    } else setErrore(esito.messaggio);
  };

  // Finto: ogni codice di 6 cifre va bene, tranne 000000 (per vedere l'errore).
  const verifica = () => {
    if (codice.length !== 6 || inCorso) return;
    if (datiVeri) {
      void verificaDavvero();
      return;
    }
    if (codice === '000000') {
      setErrore(t('errori.codiceNonValido'));
      setCodice('');
      return;
    }
    entra();
  };

  // Come sul sito: un codice di recupero spegne la verifica in due passaggi; poi si rientra e la si riattiva.
  const usaRecupero = () => {
    if (inCorso) return;
    if (datiVeri) {
      void recuperoDavvero();
      return;
    }
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(recupero.trim())) {
      setErrore(t('errori.recuperoNonValido'));
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
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/avvio/accesso" etichetta={t('comune.tornaAccesso')} />}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          {modo === 'spenta' ? (
            <>
              <IconaQuadrata nome="lucchetto" />
              <Testo tipo="dM" accessibilityRole="header">
                {t('avvio.verifica.spentaTitolo')}
              </Testo>
              <Testo colore={colori.fg2}>{t('avvio.verifica.spentaTesto', { sito })}</Testo>
              <Scheda tono="oro" stile={{ gap: 6 }}>
                <Testo medio>{t('avvio.verifica.riattiva')}</Testo>
                <Testo tipo="small" colore={colori.fg2}>
                  {t('avvio.verifica.riattivaDove')}
                </Testo>
              </Scheda>
              <Pulsante
                titolo={t('avvio.verifica.accediDiNuovo')}
                onPress={() =>
                  router.replace(
                    altroPaese ? { pathname: '/avvio/accesso', params: { paese } } : '/avvio/accesso',
                  )
                }
              />
            </>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Testo tipo="dL" accessibilityRole="header">
                  {modo === 'codice' ? t('avvio.verifica.titolo') : t('avvio.verifica.recuperoTitolo')}
                </Testo>
                <Testo tipo="small" colore={colori.fg2}>
                  {modo === 'codice'
                    ? t('avvio.verifica.testo', { sito })
                    : t('avvio.verifica.recuperoTesto')}
                </Testo>
              </View>

              {modo === 'codice' ? (
                <Campo
                  etichetta={t('avvio.verifica.campo')}
                  placeholder="123456"
                  value={codice}
                  onChangeText={(testo) => {
                    setCodice(testo.replace(/\D/g, '').slice(0, 6));
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
                      {t('avvio.verifica.recuperoAvviso')}
                    </Testo>
                  </Scheda>
                  <Campo
                    etichetta={t('avvio.verifica.recuperoTitolo')}
                    placeholder="XXXX-XXXX"
                    value={recupero}
                    onChangeText={(testo) => {
                      setRecupero(testo.toUpperCase());
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
                <Pulsante
                  titolo={t('avvio.verifica.verifica')}
                  disabilitato={codice.length !== 6}
                  onPress={verifica}
                />
              ) : (
                <Pulsante
                  titolo={t('avvio.verifica.usaRecupero')}
                  disabilitato={!recupero.trim()}
                  onPress={usaRecupero}
                />
              )}
              <Text
                style={stili.link}
                accessibilityRole="link"
                onPress={() => cambia(modo === 'codice' ? 'recupero' : 'codice')}
              >
                {modo === 'codice' ? t('avvio.verifica.perso') : t('avvio.verifica.tornaCodice')}
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
