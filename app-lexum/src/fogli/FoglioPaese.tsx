import { useState } from 'react';
import { View } from 'react-native';

import { BadgePaese, ElencoDefinizioni } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { formatoMB } from '@/dati-finti/conti';
import { useTesti } from '@/lingue/useTesti';
import { paesi } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onPassa: (codice: string) => void; // conferma: l'app si ricarica su quel paese
  onCreaAccesso: (codice: string) => void;
  onAccedi: (codice: string) => void;
  iniziale?: string; // paese già scelto all'apertura (per l'elenco delle schermate); di solito quello attuale
};

// G1 · Cambia paese: si parte dal paese in cui sei, con l'anteprima del tuo account;
// scegliendo l'altro si vede il suo account e la domanda di conferma.
// G2 · Se nel paese scelto non c'è ancora un accesso: crealo o accedi.
export function FoglioPaese({ visibile, onChiudi, onPassa, onCreaAccesso, onAccedi, iniziale }: Props) {
  const { paese, accessi, conti, utenti } = useStato();
  const { t } = useTesti();
  const [scelto, setScelto] = useState(iniziale ?? paese);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura si riparte dal paese attuale: «sono qui e vado lì»
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) setScelto(iniziale ?? paese);
  }

  // I testi cambiano con il paese scelto (s) e con quello in cui sei (a).
  const s = scelto as 'IT' | 'CH';
  const a = paese as 'IT' | 'CH';
  const attuale = scelto === paese;
  const senzaAccesso = !attuale && !accessi[scelto];
  const conto = conti[scelto];
  const piano = conto.scadenzaPiano
    ? t('profilo.cambioPaese.pianoFino', { piano: conto.piano, data: conto.scadenzaPiano })
    : conto.piano;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Eyebrow>{t('profilo.paese')}</Eyebrow>
        <Testo tipo="dS">{t('profilo.cambioPaese.titolo')}</Testo>
      </View>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t('avvio.paese.gruppo')}>
        {paesi.map((p) => (
          <Scelta
            key={p.codice}
            compatta
            attiva={p.codice === scelto}
            onPress={() => setScelto(p.codice)}
            sinistra={<BadgePaese codice={p.codice} />}
            titolo={t(`paesi.${p.codice as 'IT' | 'CH'}`)}
            sottotitolo={
              p.codice === paese
                ? t('profilo.cambioPaese.qui')
                : accessi[p.codice]
                  ? t('profilo.cambioPaese.accessoCon', { email: utenti[p.codice]?.email ?? '' })
                  : t('profilo.cambioPaese.nessunAccesso')
            }
          />
        ))}
      </View>

      {senzaAccesso ? (
        <>
          <View style={{ gap: 8 }}>
            <Testo medio>{t(`profilo.cambioPaese.senzaAccesso.${s}`)}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {t(`profilo.cambioPaese.senzaAccessoTesto.${s}`)}
            </Testo>
          </View>
          <Pulsante titolo={t(`profilo.cambioPaese.crea.${s}`)} onPress={() => onCreaAccesso(scelto)} />
          <Pulsante
            titolo={t('profilo.cambioPaese.hoAccesso')}
            variante="linea"
            onPress={() => onAccedi(scelto)}
          />
          <Testo tipo="cap" centrato>
            {t('profilo.cambioPaese.stessaEmail')}
          </Testo>
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Testo tipo="cap">
              {attuale ? t(`profilo.cambioPaese.accountInUso.${s}`) : t(`profilo.cambioPaese.account.${s}`)}
            </Testo>
            <ElencoDefinizioni
              stile={{
                backgroundColor: colori.bg,
                borderWidth: 1,
                borderColor: colori.line,
                padding: 14,
                paddingHorizontal: 16,
              }}
              voci={[
                [t('profilo.cambioPaese.piano'), piano],
                [
                  t('profilo.cambioPaese.crediti'),
                  conto.crediti === 1
                    ? t('profilo.cambioPaese.rimanenteUno')
                    : t('profilo.cambioPaese.rimanentiMolti', { n: conto.crediti }),
                ],
                [
                  t('archivio.titolo'),
                  t('archivio.spazio', {
                    usato: formatoMB(conto.archivioUsatoMB),
                    totale: formatoMB(conto.archivioTotaleMB),
                  }),
                ],
              ]}
            />
            <Testo tipo="cap">
              {attuale ? t('profilo.cambioPaese.altroPaese') : t('profilo.cambioPaese.separato')}
            </Testo>
          </View>
          {attuale ? null : (
            <>
              <Testo medio>{t(`profilo.cambioPaese.domanda.${s}`)}</Testo>
              <Pulsante titolo={t(`profilo.cambioPaese.passa.${s}`)} onPress={() => onPassa(scelto)} />
            </>
          )}
        </>
      )}
      <Pulsante
        titolo={attuale ? t('comune.chiudi') : t(`profilo.cambioPaese.resta.${a}`)}
        variante="tenue"
        stile={{ height: 44 }}
        onPress={onChiudi}
      />
    </Foglio>
  );
}
