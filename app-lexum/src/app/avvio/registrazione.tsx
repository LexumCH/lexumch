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
import { contenuti } from '@/paesi/contenuti';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A4 · Registrazione con email e password, come sul sito.
// Con ?paese=CH crea l'accesso in un altro paese (da G2). Con i dati veri crea l'account nel database
// di quel paese, con gli stessi dati del sito: in Italia la professione, in Svizzera la lingua.
export default function Registrazione() {
  const { paese: paeseAttivo, lingua } = useStato();
  const { paese: paeseParam } = useLocalSearchParams<{ paese?: string }>();
  const paese = paeseParam ?? paeseAttivo;
  const altroPaese = !!paeseParam && paeseParam !== paeseAttivo;
  const datiPaese = trovaPaese(paese);

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
    if (!nome.trim() || !cognome.trim()) return setErrore('Scrivi nome e cognome.');
    if (!/\S+@\S+\.\S+/.test(email)) return setErrore("L'indirizzo email non è valido.");
    if (password.length < 8) return setErrore('La password deve avere almeno 8 caratteri.');
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
          {paese === 'IT' ? (
            <CampoScelta
              etichetta="Professione"
              valore={
                datiVeri
                  ? (professioniRegistrazione.find((p) => p.valore === professione)?.titolo ?? 'Privato')
                  : utenteFinto.professione
              }
              onPress={datiVeri ? () => setSceltaProfessione(true) : undefined}
            />
          ) : null}

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

          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante
            titolo={inCorso ? 'Registrazione in corso…' : 'Registrati'}
            disabilitato={!accetto || inCorso}
            onPress={() => void registra()}
          />
          <Text style={stili.accedi}>
            Hai già un account?{' '}
            <Text style={stili.link} onPress={accedi} accessibilityRole="link">
              Accedi
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Foglio visibile={sceltaProfessione} onChiudi={() => setSceltaProfessione(false)} spazio={4}>
        <Testo tipo="dS">Professione</Testo>
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
