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
};

// G1 · Cambia paese: scelta, anteprima del conto e conferma.
// G2 · Se nel paese scelto non c'è ancora un accesso: crealo o accedi.
export function FoglioPaese({ visibile, onChiudi, onPassa, onCreaAccesso, onAccedi }: Props) {
  const { paese, accessi, conti } = useStato();
  const altro = paesi.find((p) => p.codice !== paese)?.codice ?? paese;
  const [scelto, setScelto] = useState(altro);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura si parte dall'altro paese
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) setScelto(altro);
  }

  const testi = contenuti[scelto];
  const testiAttuale = contenuti[paese];
  const senzaAccesso = scelto !== paese && !accessi[scelto];

  if (senzaAccesso) {
    return (
      <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <BadgePaese codice={scelto} />
          <Testo tipo="dS" style={{ flex: 1 }}>
            Non hai ancora un accesso {testi.in}
          </Testo>
        </View>
        <Testo colore={colori.fg2}>
          La banca dati {testi.aggettivoFemminile} ha un account suo: crediti, piano e archivio sono separati
          da quelli {testiAttuale.aggettivoPlurale}. Si crea in un minuto, e anche lì la prima ricerca è
          gratuita.
        </Testo>
        <Pulsante titolo={`Crea l'accesso ${testi.aggettivo}`} onPress={() => onCreaAccesso(scelto)} />
        <Pulsante titolo="Ho già un accesso: accedi" variante="linea" onPress={() => onAccedi(scelto)} />
        <Pulsante
          titolo={`Resta ${testiAttuale.in}`}
          variante="tenue"
          stile={{ height: 44 }}
          onPress={onChiudi}
        />
        <Testo tipo="cap" centrato>
          Puoi usare la stessa email.
        </Testo>
      </Foglio>
    );
  }

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
                ? 'Banca dati attuale'
                : accessi[p.codice]
                  ? `Accesso già creato con ${utenteFinto.email}`
                  : 'Nessun accesso, per ora'
            }
          />
        ))}
      </View>
      {scelto !== paese ? (
        <>
          <View style={{ gap: 8 }}>
            <Testo tipo="cap">Il tuo account {testi.aggettivo}</Testo>
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
              È un account separato: crediti, piano e archivio non passano da un paese all'altro.
            </Testo>
          </View>
          <Testo medio>Vuoi passare al database legale {testi.aggettivo}?</Testo>
          <Pulsante titolo={`Sì, passa ${testi.a}`} onPress={() => onPassa(scelto)} />
        </>
      ) : (
        <Testo tipo="small" colore={colori.fg2}>
          Stai già usando la banca dati {testi.aggettivoFemminile}.
        </Testo>
      )}
      <Pulsante titolo="Annulla" variante="tenue" stile={{ height: 44 }} onPress={onChiudi} />
    </Foglio>
  );
}
