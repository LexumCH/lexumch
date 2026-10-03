import { router } from 'expo-router';
import { View } from 'react-native';

import { Separatore, Scheda } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { PaginaBenvenuto } from '@/schermate/PaginaBenvenuto';
import { colori } from '@/tema';

// A3 · La prima domanda è gratuita: 1 credito di benvenuto.
export default function Gratis() {
  return (
    <PaginaBenvenuto
      pagina={2}
      alone={100}
      visuale={
        <Scheda
          tono="oro"
          stile={{
            backgroundColor: colori.bg2,
            gap: 4,
            paddingTop: 22,
            paddingHorizontal: 22,
            paddingBottom: 18,
          }}
        >
          <Eyebrow colore={colori.accentText}>Benvenuto</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <Testo tipo="dXl" oro style={{ fontSize: 92, lineHeight: 96 }}>
              1
            </Testo>
            <Testo tipo="dM">credito</Testo>
          </View>
          <Testo tipo="small" colore={colori.fg2}>
            Una domanda a Lex, con risposta completa e fonti citate.
          </Testo>
          <Separatore stile={{ marginTop: 14, marginBottom: 10 }} />
          <View style={{ gap: 10 }}>
            {['Banca dati: sempre gratuita', 'PDF delle risposte: senza crediti'].map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icona nome="spunta" dimensione={18} colore={colori.ok} />
                <Testo tipo="small">{t}</Testo>
              </View>
            ))}
          </View>
        </Scheda>
      }
      eyebrow="Per iniziare"
      titolo="La prima ricerca "
      titoloOro="è gratuita."
      sottotitolo="Crea l'account: ti regaliamo un credito per provare Lex su un tuo caso reale."
      pulsanti={
        <>
          <Pulsante titolo="Crea il tuo account" onPress={() => router.push('/avvio/registrazione')} />
          <Pulsante
            titolo="Ho già un account"
            variante="tenue"
            onPress={() => router.push('/avvio/accesso')}
          />
        </>
      }
    />
  );
}
