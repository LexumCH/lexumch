import { useState } from 'react';
import { View } from 'react-native';

import { BadgePaese, ElencoDefinizioni } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { formatoMB } from '@/dati-finti/conti';
import { utenteFinto } from '@/dati-finti/utente';
import { contenuti } from '@/paesi/contenuti';
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
  const { paese, accessi, conti } = useStato();
  const [scelto, setScelto] = useState(iniziale ?? paese);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura si riparte dal paese attuale: «sono qui e vado lì»
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) setScelto(iniziale ?? paese);
  }

  const testi = contenuti[scelto];
  const testiAttuale = contenuti[paese];
  const attuale = scelto === paese;
  const senzaAccesso = !attuale && !accessi[scelto];
  const conto = conti[scelto];
  const piano = conto.scadenzaPiano ? `${conto.piano} · fino al ${conto.scadenzaPiano}` : conto.piano;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Paese e banca dati</Eyebrow>
        <Testo tipo="dS">Dove vuoi lavorare?</Testo>
      </View>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Paese">
        {paesi.map((p) => (
          <Scelta
            key={p.codice}
            compatta
            attiva={p.codice === scelto}
            onPress={() => setScelto(p.codice)}
            sinistra={<BadgePaese codice={p.codice} />}
            titolo={p.nome}
            sottotitolo={
              p.codice === paese
                ? 'Sei qui · banca dati attuale'
                : accessi[p.codice]
                  ? `Accesso già creato con ${utenteFinto.email}`
                  : 'Nessun accesso, per ora'
            }
          />
        ))}
      </View>

      {senzaAccesso ? (
        <>
          <View style={{ gap: 8 }}>
            <Testo medio>Non hai ancora un accesso {testi.in}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              La banca dati {testi.aggettivoFemminile} ha un account suo: crediti, piano e archivio sono
              separati da quelli {testiAttuale.aggettivoPlurale}. Si crea in un minuto, e anche lì la prima
              ricerca è gratuita.
            </Testo>
          </View>
          <Pulsante titolo={`Crea l'accesso ${testi.aggettivo}`} onPress={() => onCreaAccesso(scelto)} />
          <Pulsante titolo="Ho già un accesso: accedi" variante="linea" onPress={() => onAccedi(scelto)} />
          <Testo tipo="cap" centrato>
            Puoi usare la stessa email.
          </Testo>
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Testo tipo="cap">
              {attuale ? `Il tuo account ${testi.aggettivo} · in uso` : `Il tuo account ${testi.aggettivo}`}
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
                ['Piano', piano],
                ['Crediti', conto.crediti === 1 ? '1 rimanente' : `${conto.crediti} rimanenti`],
                ['Archivio', `${formatoMB(conto.archivioUsatoMB)} di ${formatoMB(conto.archivioTotaleMB)}`],
              ]}
            />
            <Testo tipo="cap">
              {attuale
                ? "Scegli l'altro paese per vedere il suo account e passare lì."
                : "È un account separato: crediti, piano e archivio non passano da un paese all'altro."}
            </Testo>
          </View>
          {attuale ? null : (
            <>
              <Testo medio>Vuoi passare al database legale {testi.aggettivo}?</Testo>
              <Pulsante titolo={`Sì, passa ${testi.a}`} onPress={() => onPassa(scelto)} />
            </>
          )}
        </>
      )}
      <Pulsante
        titolo={attuale ? 'Chiudi' : `Resta ${testiAttuale.in}`}
        variante="tenue"
        stile={{ height: 44 }}
        onPress={onChiudi}
      />
    </Foglio>
  );
}
