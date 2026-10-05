import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Campo, CampoScelta } from '@/componenti/Campi';
import { Avviso, Spunta } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Riga } from '@/componenti/Riga';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Evidenza, Testo } from '@/componenti/Testo';
import { professioniRegistrazione, registrati } from '@/backend/accesso';
import { datiVeri } from '@/config';
import { utenteFinto } from '@/dati-finti/utente';
import { apriSito } from '@/navigazione';
import { useTesti } from '@/lingue/useTesti';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A4 · Registrazione con email e password, come sul sito.
// Con ?paese=CH crea l'accesso in un altro paese (da G2). Con i dati veri crea l'account nel database
// di quel paese, con gli stessi dati del sito: in Italia la professione, in Svizzera la lingua.
export default function Registrazione() {
  const { paese: paeseAttivo } = useStato();
  const { paese: paeseParam } = useLocalSearchParams<{ paese?: string }>();
  const paese = paeseParam ?? paeseAttivo;
  const altroPaese = !!paeseParam && paeseParam !== paeseAttivo;
  const datiPaese = trovaPaese(paese);
  const { t, lingua } = useTesti(paese);

  const [nome, setNome] = useState(datiVeri ? '' : utenteFinto.nome);
  const [cognome, setCognome] = useState(datiVeri ? '' : utenteFinto.cognome);
  const [email, setEmail] = useState(datiVeri ? '' : utenteFinto.email);
  const [password, setPassword] = useState(datiVeri ? '' : 'lexum-prova-2026');
  const [vedi, setVedi] = useState(false);
  const [accetto, setAccetto] = useState(!datiVeri);
  const [professione, setProfessione] = useState<string>('privato');
  const [sceltaProfessione, setSceltaProfessione] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const vaiAlCodice = () =>
    router.push(
      paeseParam
        ? { pathname: '/avvio/codice', params: { paese, email } }
        : { pathname: '/avvio/codice', params: { email } },
    );

  // Le stesse regole del sito: nome e cognome obbligatori, email valida, password di almeno 8 caratteri.
  const registra = async () => {
    if (!datiVeri) return vaiAlCodice();
    if (!nome.trim() || !cognome.trim()) return setErrore(t('errori.nomeCognome'));
    if (!/\S+@\S+\.\S+/.test(email)) return setErrore(t('errori.emailNonValida'));
    if (password.length < 8) return setErrore(t('errori.minimoCaratteri', { n: 8 }));
    setInCorso(true);
    const esito = await registrati(paese, { nome, cognome, email, password, professione, lingua });
    setInCorso(false);
    if (esito.esito === 'errore') return setErrore(esito.messaggio);
    vaiAlCodice();
  };

  const accedi = () =>
    router.replace(paeseParam ? { pathname: '/avvio/accesso', params: { paese } } : '/avvio/accesso');

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/gratis" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Testo tipo="dL" accessibilityRole="header">
              {altroPaese
                ? t(`avvio.registrazione.titoloAltroPaese.${paese as 'IT' | 'CH'}`)
                : t('avvio.registrazione.titolo')}
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {altroPaese
                ? t('avvio.registrazione.testoAltroPaese', { paese: t(`paesi.${paese as 'IT' | 'CH'}`) })
                : t('avvio.registrazione.testo')}
            </Testo>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Campo
              etichetta={t('avvio.registrazione.nome')}
              value={nome}
              onChangeText={setNome}
              stile={{ flex: 1 }}
              autoComplete="given-name"
            />
            <Campo
              etichetta={t('avvio.registrazione.cognome')}
              value={cognome}
              onChangeText={setCognome}
              stile={{ flex: 1 }}
              autoComplete="family-name"
            />
          </View>
          <Campo
            etichetta={t('comune.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Campo
            etichetta={t('comune.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!vedi}
            autoCapitalize="none"
            autoComplete="new-password"
            dopo={
              <PulsanteIcona
                icona="occhio"
                etichetta={vedi ? t('avvio.registrazione.nascondi') : t('avvio.registrazione.mostra')}
                dimensione={20}
                colore={colori.fg3}
                onPress={() => setVedi((v) => !v)}
                stile={{ marginRight: -8 }}
              />
            }
          />
          {paese === 'IT' ? (
            <CampoScelta
              etichetta={t('avvio.registrazione.professione')}
              valore={
                datiVeri
                  ? (professioniRegistrazione.find((p) => p.valore === professione)?.titolo ?? 'Privato')
                  : utenteFinto.professione
              }
              onPress={datiVeri ? () => setSceltaProfessione(true) : undefined}
            />
          ) : null}

          <Spunta attiva={accetto} onCambia={setAccetto}>
            {t('avvio.registrazione.accetto')}
            <Evidenza oro medio>
              <Text onPress={() => apriSito(`${datiPaese.sito}/termini`)} accessibilityRole="link">
                {t('avvio.registrazione.termini')}
              </Text>
            </Evidenza>
            {t('avvio.registrazione.hoLetto')}
            <Evidenza oro medio>
              <Text onPress={() => apriSito(`${datiPaese.sito}/privacy`)} accessibilityRole="link">
                {t('avvio.registrazione.privacy')}
              </Text>
            </Evidenza>
            {t('avvio.registrazione.fine')}
          </Spunta>

          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante
            titolo={inCorso ? t('avvio.registrazione.inCorso') : t('comune.registrati')}
            disabilitato={!accetto || inCorso}
            onPress={() => void registra()}
          />
          <Text style={stili.accedi}>
            {t('avvio.registrazione.hoAccount')}{' '}
            <Text style={stili.link} onPress={accedi} accessibilityRole="link">
              {t('comune.accedi')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Foglio visibile={sceltaProfessione} onChiudi={() => setSceltaProfessione(false)} spazio={4}>
        <Testo tipo="dS">{t('avvio.registrazione.professione')}</Testo>
        <View style={{ marginHorizontal: -20 }}>
          {professioniRegistrazione.map((p) => (
            <Riga
              key={p.valore}
              stretta
              ruolo="radio"
              selezionata={p.valore === professione}
              titolo={p.titolo}
              destra={
                p.valore === professione ? (
                  <Icona nome="spunta" dimensione={18} colore={colori.accentText} />
                ) : undefined
              }
              onPress={() => {
                setProfessione(p.valore);
                setSceltaProfessione(false);
              }}
            />
          ))}
        </View>
      </Foglio>
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
