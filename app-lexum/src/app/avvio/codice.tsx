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
import { useTesti } from '@/lingue/useTesti';
import { datiVeri } from '@/config';
import { entraNellApp, ricominciaDa } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

const CIFRE = 6;
const ATTESA_S = 45;

// A5 · Codice di 6 cifre via email. È la decisione aperta n. 1 del piano:
// oggi il sito manda un link di conferma; il codice richiede di cambiare il modello email di Supabase.
// Con i dati veri la schermata dice di aprire il link (che riporta nell'app) e «invia di nuovo» lo rimanda.
export default function Codice() {
  const { paese: paeseAttivo, ruoli } = useStato();
  const { paese, email } = useLocalSearchParams<{ paese?: string; email?: string }>();
  const paeseConto = paese ?? paeseAttivo;
  const { t, lingua } = useTesti(paeseConto);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [codice, setCodice] = useState('');
  const [attesa, setAttesa] = useState(ATTESA_S);
  const campo = useRef<TextInput>(null);

  useEffect(() => {
    if (attesa <= 0) return;
    const timer = setTimeout(() => setAttesa((a) => a - 1), 1000);
    return () => clearTimeout(timer);
  }, [attesa]);

  const conferma = () => {
    if (paese && paese !== paeseAttivo) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else entraNellApp(ruoli[paeseConto]);
  };

  const rimanda = async () => {
    setAttesa(ATTESA_S);
    if (!datiVeri || !email) return;
    const esito = await rimandaConferma(paeseConto, email, lingua);
    setAvviso(esito.esito === 'ok' ? t('avvio.codice.inviata') : esito.messaggio);
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
            {t('avvio.codice.titolo')}
          </Testo>
          <Testo colore={colori.fg2}>
            {datiVeri ? t('avvio.codice.linkA') : t('avvio.codice.codiceA')}
            <Text style={{ color: colori.fg }}>{email ?? utenteFinto.email}</Text>.
            {datiVeri ? t('avvio.codice.apriLink') : ''}
          </Testo>
        </View>

        {datiVeri ? null : (
          <Pressable
            onPress={() => campo.current?.focus()}
            accessibilityRole="none"
            accessibilityLabel={t('avvio.codice.etichetta')}
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
              onChangeText={(testo) => setCodice(testo.replace(/\D/g, '').slice(0, CIFRE))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CIFRE}
              autoFocus={Platform.OS !== 'web'}
              accessibilityLabel={t('avvio.codice.etichetta')}
              style={stili.nascosto}
            />
          </Pressable>
        )}

        <Testo tipo="small" colore={colori.fg3}>
          {t('avvio.codice.nonArrivato')}
          {attesa > 0 ? (
            <Text style={{ color: colori.fg2 }}>
              {t('avvio.codice.inviaTra', { tempo: `${minuti}:${secondi}` })}
            </Text>
          ) : (
            <Text style={stili.link} onPress={() => void rimanda()} accessibilityRole="link">
              {t('avvio.codice.inviaDiNuovo')}
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
            titolo={t('avvio.codice.hoConfermato')}
            variante="linea"
            onPress={() =>
              ricominciaDa(paese ? { pathname: '/avvio/accesso', params: { paese } } : '/avvio/accesso')
            }
          />
        ) : (
          <>
            <Testo tipo="cap" centrato>
              {t('avvio.codice.linkNellEmail')}
            </Testo>
            <Pulsante titolo={t('avvio.codice.conferma')} onPress={conferma} />
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
