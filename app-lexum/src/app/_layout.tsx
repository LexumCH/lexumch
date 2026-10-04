import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond/500Medium_Italic';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Cornice } from '@/anteprima/Cornice';
import '@/fuoco';
import { MenuLaterale } from '@/componenti/MenuLaterale';
import { Pulsante } from '@/componenti/Pulsante';
import { avvolgi, segnalaErrore } from '@/sentry';
import { MenuProvider } from '@/stato/Menu';
import { StatoProvider } from '@/stato/Stato';
import { StudioProvider } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

SplashScreen.preventAutoHideAsync();

// Tema «Notte» anche per la navigazione, così tra una schermata e l'altra non lampeggia il bianco.
const temaNavigazione = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colori.accent,
    background: colori.bg,
    card: colori.bg,
    text: colori.fg,
    border: colori.line,
  },
};

function Radice() {
  const [caricati, errore] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    if (caricati || errore) SplashScreen.hideAsync();
  }, [caricati, errore]);

  if (!caricati && !errore) return null;

  return (
    <ThemeProvider value={temaNavigazione}>
      <StatoProvider>
        <StudioProvider>
          <MenuProvider>
            <StatusBar style="light" />
            <Cornice>
              <View style={{ flex: 1, backgroundColor: colori.bg }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colori.bg },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="passaggio" options={{ animation: 'fade', gestureEnabled: false }} />
                </Stack>
                <MenuLaterale />
              </View>
            </Cornice>
          </MenuProvider>
        </StudioProvider>
      </StatoProvider>
    </ThemeProvider>
  );
}

export default avvolgi(Radice);

// Se una schermata si rompe: messaggio generico (mai il dettaglio tecnico) e «Riprova».
// L'errore vero va a Sentry, se è acceso.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    segnalaErrore(error);
  }, [error]);
  return (
    <View style={stiliErrore.schermata}>
      <Text style={stiliErrore.titolo}>Qualcosa non ha funzionato</Text>
      <Text style={stiliErrore.testo}>
        Si è verificato un errore temporaneo. Riprova tra qualche istante.
      </Text>
      <Pulsante titolo="Riprova" onPress={retry} />
    </View>
  );
}

const stiliErrore = StyleSheet.create({
  schermata: { flex: 1, justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colori.bg },
  titolo: { fontFamily: famiglie.titolo, fontSize: 29, lineHeight: 32, color: colori.fg },
  testo: { fontFamily: famiglie.testo, fontSize: 16, lineHeight: 25, color: colori.fg2 },
});
