import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
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
  const { t } = useTesti();
  const p = paese as 'IT' | 'CH';
  const attiva = !!dueFattori[paese];
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
      setErrore(t('errori.codiceNonValido'));
      setCodice('');
      return;
    }
    azioni.impostaDueFattori(true);
    setPasso('codici');
  };

  const condividiCodici = () => {
    Share.share({
      message: t('profilo.dueFattori.condividiTesto', { nome: nomeNellApp, codici: codiciFinti.join('\n') }),
    }).catch(() => undefined);
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={stili.testa}>
        <View style={{ flex: 1, gap: 6 }}>
          <Eyebrow>{t('profilo.account.dueFattori')}</Eyebrow>
          <Testo tipo="dS">
            {passo === 'spiega'
              ? t('profilo.dueFattori.titoloSpiega')
              : passo === 'aggiungi'
                ? t('profilo.dueFattori.titoloAggiungi')
                : passo === 'codici'
                  ? t('profilo.dueFattori.titoloCodici')
                  : passo === 'disattiva'
                    ? t('profilo.dueFattori.titoloDisattiva')
                    : t('profilo.dueFattori.titoloGestisci')}
          </Testo>
        </View>
        <PulsanteIcona icona="chiudi" etichetta={t('interfaccia.chiudi')} onPress={onChiudi} />
      </View>

      {passo === 'spiega' ? (
        <>
          <Testo colore={colori.fg2}>{t('profilo.dueFattori.spiega')}</Testo>
          <Scheda stile={{ gap: 4 }}>
            <Testo medio>{t('profilo.dueFattori.valeSu', { sito })}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {t(`profilo.dueFattori.stessoAccount.${p}`)}
            </Testo>
          </Scheda>
          <Pulsante
            titolo={t('profilo.dueFattori.attiva')}
            icona="lucchetto"
            onPress={() => setPasso('aggiungi')}
          />
        </>
      ) : null}

      {passo === 'aggiungi' ? (
        <>
          <View style={{ gap: 10 }}>
            <Testo medio>{t('profilo.dueFattori.passo1')}</Testo>
            <Pulsante
              titolo={t('profilo.dueFattori.apriApp')}
              variante="linea"
              icona="esterno"
              onPress={() => setAperta(true)}
            />
            {aperta ? (
              <Testo tipo="small" colore={colori.ok}>
                {t('profilo.dueFattori.trovi', { nome: nomeNellApp, email: utente.email })}
              </Testo>
            ) : null}
            <Testo tipo="small" colore={colori.fg2}>
              {t('profilo.dueFattori.aMano')}
            </Testo>
            <Text
              selectable
              style={stili.chiave}
              accessibilityLabel={t('profilo.dueFattori.chiave', { chiave: chiaveFinta })}
            >
              {chiaveFinta}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <Testo medio>{t('profilo.dueFattori.passo2')}</Testo>
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
          </View>
          {errore ? <Avviso testo={errore} /> : null}
          <Pulsante
            titolo={t('profilo.dueFattori.verifica')}
            disabilitato={codice.length !== 6}
            onPress={verifica}
          />
        </>
      ) : null}

      {passo === 'codici' ? (
        <>
          <Testo colore={colori.fg2}>{t('profilo.dueFattori.codiciTesto')}</Testo>
          <View style={stili.codici} accessibilityLabel={t('profilo.dueFattori.codici')}>
            {codiciFinti.map((c) => (
              <Text key={c} selectable style={stili.codice}>
                {c}
              </Text>
            ))}
          </View>
          <Pulsante
            titolo={t('profilo.dueFattori.condividi')}
            variante="linea"
            icona="condividi"
            onPress={condividiCodici}
          />
          <Pulsante titolo={t('profilo.dueFattori.hoSalvato')} onPress={() => setPasso('gestisci')} />
        </>
      ) : null}

      {passo === 'gestisci' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconaQuadrata nome="lucchetto" />
            <View style={{ flex: 1, gap: 3 }}>
              <Testo medio>{t('profilo.dueFattori.attivaSu', { sito })}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {t('profilo.dueFattori.chiediamo', { nome: nomeNellApp })}
              </Testo>
            </View>
          </View>
          <Pulsante
            titolo={t('profilo.dueFattori.nuoviCodici')}
            variante="linea"
            onPress={() => setPasso('codici')}
          />
          <Pulsante
            titolo={t('profilo.dueFattori.spegniVerifica')}
            variante="pericolo"
            onPress={() => setPasso('disattiva')}
          />
        </>
      ) : null}

      {passo === 'disattiva' ? (
        <>
          <Testo colore={colori.fg2}>{t(`profilo.dueFattori.disattivaTesto.${p}`, { sito })}</Testo>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pulsante
              titolo={t('comune.annulla')}
              variante="linea"
              stile={{ flex: 1 }}
              onPress={() => setPasso('gestisci')}
            />
            <Pulsante
              titolo={t('profilo.dueFattori.spegni')}
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
