import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { contenuti } from '@/paesi/contenuti';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

type Passo = 'spiega' | 'aggiungi' | 'codici' | 'gestisci' | 'disattiva';

// DATI FINTI: chiave e codici di recupero. Dalla tappa 6 arrivano da supabase.auth.mfa.enroll
// (chiave e link otpauth://) e dalla funzione mfa-backup-codes («generate» e «regenerate»).
const chiaveFinta = 'LXMA PPIT 7Q2K R4WD';
const codiciFinti = [
  '7K9P-2H4M',
  'Q3XW-8RTN',
  'M5ZA-6YBC',
  'H2LD-9KEP',
  'W7GN-3SUV',
  'B4RT-5JXQ',
  'N8CF-2WMA',
  'Y6PE-7DHL',
  'T3VK-4QZR',
  'J9SB-6NFU',
];

type Props = {
  visibile: boolean;
  onChiudi: () => void;
};

// D4 · Verifica in due passaggi, come ModalAttiva2FA e BoxSicurezza2FA del sito.
// È la stessa del sito: il fattore sta nell'account del paese, quindi lo stesso codice vale su app e sito.
export function FoglioDuePassaggi({ visibile, onChiudi }: Props) {
  const { paese, dueFattori, utente, azioni } = useStato();
  const attiva = !!dueFattori[paese];
  const testi = contenuti[paese];
  const sito = dominio(trovaPaese(paese));
  const nomeNellApp = `Lexum ${paese}`;
  const [passo, setPasso] = useState<Passo>(attiva ? 'gestisci' : 'spiega');
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState(false);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) {
      setPasso(attiva ? 'gestisci' : 'spiega');
      setCodice('');
      setErrore(null);
      setAperta(false);
    }
  }

  // Finto: ogni codice di 6 cifre va bene, tranne 000000 (per vedere l'errore).
  const verifica = () => {
    if (codice.length !== 6) return;
    if (codice === '000000') {
      setErrore("Codice non valido. Controlla che l'ora del telefono sia giusta e riprova.");
      setCodice('');
      return;
    }
    azioni.impostaDueFattori(true);
    setPasso('codici');
  };

  const condividiCodici = () => {
    Share.share({ message: `Codici di recupero ${nomeNellApp}:\n${codiciFinti.join('\n')}` }).catch(
      () => undefined,
    );
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={stili.testa}>
        <View style={{ flex: 1, gap: 6 }}>
          <Eyebrow>Verifica in due passaggi</Eyebrow>
          <Testo tipo="dS">
            {passo === 'spiega'
              ? 'Un codice in più, oltre alla password'
              : passo === 'aggiungi'
                ? 'Collega la tua app di autenticazione'
                : passo === 'codici'
                  ? 'Salva i codici di recupero'
                  : passo === 'disattiva'
                    ? 'Spegnere la verifica?'
                    : 'Attiva'}
          </Testo>
        </View>
        <PulsanteIcona icona="chiudi" etichetta="Chiudi" onPress={onChiudi} />
      </View>

      {passo === 'spiega' ? (
        <>
          <Testo colore={colori.fg2}>
            Quando accedi, oltre alla password ti chiediamo un codice di 6 cifre che cambia ogni 30 secondi.
            Lo genera un'app di autenticazione: Google Authenticator, Microsoft Authenticator, 1Password…
          </Testo>
          <Scheda stile={{ gap: 4 }}>
            <Testo medio>Vale anche su {sito}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              È lo stesso account {testi.aggettivo}: lo stesso codice serve sull'app e sul sito. Se l'hai già
              attivata sul sito, qui risulta già attiva.
            </Testo>
          </Scheda>
          <Pulsante titolo="Attiva" icona="lucchetto" onPress={() => setPasso('aggiungi')} />
        </>
      ) : null}

      {passo === 'aggiungi' ? (
        <>
          <View style={{ gap: 10 }}>
            <Testo medio>1. Aggiungi Lexum alla tua app di autenticazione</Testo>
            <Pulsante
              titolo="Apri l'app di autenticazione"
              variante="linea"
              icona="esterno"
              onPress={() => setAperta(true)}
            />
            {aperta ? (
              <Testo tipo="small" colore={colori.ok}>
                Nell'app di autenticazione trovi «{nomeNellApp}» con {utente.email}. Torna qui e scrivi il
                codice che mostra.
              </Testo>
            ) : null}
            <Testo tipo="small" colore={colori.fg2}>
              Oppure aggiungila a mano con questa chiave:
            </Testo>
            <Text selectable style={stili.chiave} accessibilityLabel={`Chiave: ${chiaveFinta}`}>
              {chiaveFinta}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <Testo medio>2. Scrivi il codice di 6 cifre</Testo>
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
          </View>
          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante titolo="Verifica e attiva" disabilitato={codice.length !== 6} onPress={verifica} />
        </>
      ) : null}

      {passo === 'codici' ? (
        <>
          <Testo colore={colori.fg2}>
            Ti servono se perdi il telefono. Ognuno vale una volta sola. Salvali fuori dal telefono, in un
            posto sicuro.
          </Testo>
          <View style={stili.codici} accessibilityLabel="Codici di recupero">
            {codiciFinti.map((c) => (
              <Text key={c} selectable style={stili.codice}>
                {c}
              </Text>
            ))}
          </View>
          <Pulsante titolo="Condividi o salva" variante="linea" icona="condividi" onPress={condividiCodici} />
          <Pulsante titolo="Ho salvato i codici" onPress={() => setPasso('gestisci')} />
        </>
      ) : null}

      {passo === 'gestisci' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconaQuadrata nome="lucchetto" />
            <View style={{ flex: 1, gap: 3 }}>
              <Testo medio>Attiva sull'app e su {sito}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                All'accesso ti chiediamo il codice di «{nomeNellApp}».
              </Testo>
            </View>
          </View>
          <Pulsante titolo="Nuovi codici di recupero" variante="linea" onPress={() => setPasso('codici')} />
          <Pulsante titolo="Spegni la verifica" variante="pericolo" onPress={() => setPasso('disattiva')} />
        </>
      ) : null}

      {passo === 'disattiva' ? (
        <>
          <Testo colore={colori.fg2}>
            Il tuo account {testi.aggettivo} sarà protetto solo dalla password, anche su {sito}. I codici di
            recupero non varranno più.
          </Testo>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pulsante
              titolo="Annulla"
              variante="linea"
              stile={{ flex: 1 }}
              onPress={() => setPasso('gestisci')}
            />
            <Pulsante
              titolo="Spegni"
              variante="pericolo"
              stile={{ flex: 1 }}
              onPress={() => {
                azioni.impostaDueFattori(false);
                onChiudi();
              }}
            />
          </View>
        </>
      ) : null}
    </Foglio>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chiave: {
    fontFamily: famiglie.testoMedio,
    fontSize: 18,
    letterSpacing: 2,
    color: colori.fg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg,
    textAlign: 'center',
  },
  codici: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg,
  },
  codice: {
    width: '47%',
    fontFamily: famiglie.testoMedio,
    fontSize: 15,
    letterSpacing: 1,
    color: colori.fg,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
