import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconaQuadrata } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { utenteFinto } from '@/dati-finti/utente';
import { rimandaConferma } from '@/backend/accesso';
import { datiVeri } from '@/config';
import { ricominciaDa } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const CIFRE = 6;
const ATTESA_S = 45;

// A5 · Codice di 6 cifre via email. È la decisione aperta n. 1 del piano:
// oggi il sito manda un link di conferma; il codice richiede di cambiare il modello email di Supabase.
// Con i dati veri la schermata dice di aprire il link (che riporta nell'app) e «invia di nuovo» lo rimanda.
export default function Codice() {
  const { paese: paeseAttivo } = useStato();
  const { paese, email } = useLocalSearchParams<{ paese?: string; email?: string }>();
  const paeseConto = paese ?? paeseAttivo;
  const [avviso, setAvviso] = useState<string | null>(null);
  const [codice, setCodice] = useState('');
  const [attesa, setAttesa] = useState(ATTESA_S);
  const campo = useRef<TextInput>(null);

  useEffect(() => {
    if (attesa <= 0) return;
    const t = setTimeout(() => setAttesa((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attesa]);

  const conferma = () => {
    if (paese && paese !== paeseAttivo) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else ricominciaDa('/chat');
  };

  const rimanda = async () => {
    setAttesa(ATTESA_S);
    if (!datiVeri || !email) return;
    const esito = await rimandaConferma(paeseConto, email);
    setAvviso(esito.esito === 'ok' ? 'Email inviata di nuovo.' : esito.messaggio);
  };

  const minuti = Math.floor(attesa / 60);
  const secondi = String(attesa % 60).padStart(2, '0');

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneIndietro ripiego="/avvio/registrazione" />} />
      <View style={stili.corpo}>
        <IconaQuadrata nome="email" lato={56} dimensione={26} />
        <View style={{ gap: 10 }}>
          <Testo tipo="dL" accessibilityRole="header">
            Controlla la tua email
          </Testo>
          <Testo colore={colori.fg2}>
            {datiVeri ? 'Abbiamo mandato un link di conferma a ' : 'Abbiamo mandato un codice di 6 cifre a '}
            <Text style={{ color: colori.fg }}>{email ?? utenteFinto.email}</Text>.
            {datiVeri ? ' Aprilo da questo telefono: ti riporta nell’app, già dentro.' : ''}
          </Testo>
        </View>

        {datiVeri ? null : (
          <Pressable
            onPress={() => campo.current?.focus()}
            accessibilityRole="none"
            accessibilityLabel="Codice di conferma"
            style={stili.codice}
          >
            {Array.from({ length: CIFRE }, (_, i) => (
              <View
                key={i}
                style={[stili.cifra, i === Math.min(codice.length, CIFRE - 1) && stili.cifraAttiva]}
              >
                <Text style={stili.cifraTesto}>{codice[i] ?? ''}</Text>
              </View>
            ))}
            <TextInput
              ref={campo}
              value={codice}
              onChangeText={(t) => setCodice(t.replace(/\D/g, '').slice(0, CIFRE))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CIFRE}
              autoFocus={Platform.OS !== 'web'}
              accessibilityLabel="Codice di conferma di 6 cifre"
              style={stili.nascosto}
            />
          </Pressable>
        )}

        <Testo tipo="small" colore={colori.fg3}>
          Non è arrivato? Controlla lo spam, oppure{' '}
          {attesa > 0 ? (
            <Text style={{ color: colori.fg2 }}>
              invia di nuovo tra {minuti}:{secondi}
            </Text>
          ) : (
            <Text style={stili.link} onPress={() => void rimanda()} accessibilityRole="link">
              invia di nuovo
            </Text>
          )}
          .
        </Testo>

        {avviso ? (
          <Testo tipo="small" colore={colori.fg2}>
            {avviso}
          </Testo>
        ) : null}

        <View style={{ flex: 1 }} />
        {datiVeri ? (
          <Pulsante
            titolo="Ho confermato: accedi"
            variante="linea"
            onPress={() =>
              ricominciaDa(paese ? { pathname: '/avvio/accesso', params: { paese } } : '/avvio/accesso')
            }
          />
        ) : (
          <>
            <Testo tipo="cap" centrato>
              Puoi anche toccare il link nell'email: ti riporta qui.
            </Testo>
            <Pulsante titolo="Conferma" onPress={conferma} />
          </>
        )}
      </View>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { flex: 1, gap: 22, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 8 },
  codice: { flexDirection: 'row', gap: 8 },
  cifra: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colori.surface,
    borderWidth: 1,
    borderColor: colori.line2,
  },
  cifraAttiva: { borderColor: colori.accent },
  cifraTesto: { fontFamily: famiglie.testoMedio, fontSize: 26, color: colori.fg },
  nascosto: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  link: { fontFamily: famiglie.testoMedio, color: colori.accentText },
});
