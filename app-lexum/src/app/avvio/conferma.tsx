import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useSessioneDaLink } from '@/backend/useSessioneDaLink';
import { Avviso, BadgePaese, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { ricominciaDa } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// A9 · Email confermata: ci si arriva dal link dell'email di registrazione (lexum://avvio/conferma).
// Va bene sia con il link (oggi) sia con il codice di 6 cifre (decisione aperta n. 1).
// Con i dati veri il link porta la sessione: si è già dentro, con il ruolo letto dal profilo.
export default function EmailConfermata() {
  const { paese: paeseAttivo, azioni } = useStato();
  const { paese: param } = useLocalSearchParams<{ paese?: string }>();
  const paese = param ?? paeseAttivo;
  const datiPaese = trovaPaese(paese);
  const link = useSessioneDaLink(paese);
  const entra = () => {
    if (link.stato === 'errore') {
      ricominciaDa(
        paese !== paeseAttivo ? { pathname: '/avvio/accesso', params: { paese } } : '/avvio/accesso',
      );
      return;
    }
    if (link.stato === 'ok') {
      const { stato: _ok, ...profilo } = link;
      azioni.entrato(paese, profilo);
    }
    if (paese !== paeseAttivo) ricominciaDa({ pathname: '/passaggio', params: { paese } });
    else ricominciaDa('/chat');
  };
  return (
    <Schermata hero alone={60}>
      <View style={{ flex: 1, gap: 22, paddingTop: 70, paddingHorizontal: 24, paddingBottom: 8 }}>
        <IconaQuadrata nome="spunta" lato={56} dimensione={26} />
        <View style={{ gap: 10 }}>
          <Testo tipo="dL" accessibilityRole="header">
            Email confermata
          </Testo>
          <Testo colore={colori.fg2}>Il tuo account Lexum {datiPaese.nome} è attivo.</Testo>
        </View>
        <Scheda tono="ok" stile={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Icona nome="stella" dimensione={20} colore={colori.ok} />
          <View style={{ flex: 1, gap: 3 }}>
            <Testo medio style={{ fontSize: 15 }}>
              1 credito di benvenuto
            </Testo>
            <Testo tipo="small" colore={colori.fg2}>
              La tua prima domanda a Lex è gratuita. La Banca dati è sempre libera.
            </Testo>
          </View>
        </Scheda>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
          <BadgePaese codice={paese} piccolo nome={datiPaese.nome} />
          <Testo tipo="cap">{datiPaese.sito.replace('https://', '')}</Testo>
        </View>
        {link.stato === 'errore' ? (
          <Avviso testo={`${link.messaggio} Oppure entra con email e password.`} />
        ) : null}
        <Pulsante
          titolo={link.stato === 'errore' ? 'Vai all’accesso' : 'Inizia'}
          disabilitato={link.stato === 'attesa'}
          onPress={entra}
        />
      </View>
    </Schermata>
  );
}
