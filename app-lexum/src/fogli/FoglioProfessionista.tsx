import { View } from 'react-native';
import { useState } from 'react';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { apriSito } from '@/navigazione';
import { professioni } from '@/paesi/contenuti';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// D5 · Che professionista sei? Il profilo professionale si completa sul sito.
export function FoglioProfessionista({ visibile, onChiudi }: { visibile: boolean; onChiudi: () => void }) {
  const { paese } = useStato();
  const datiPaese = trovaPaese(paese);
  const [scelta, setScelta] = useState(datiPaese.professioni[0]);
  const attuale = datiPaese.professioni.includes(scelta) ? scelta : datiPaese.professioni[0];
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ gap: 8 }}>
        <Eyebrow>Completa il profilo</Eyebrow>
        <Testo tipo="dM">Che professionista sei?</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Scegli il tuo profilo professionale: la piattaforma si adatta al tuo modo di lavorare.
        </Testo>
      </View>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Professione">
        {datiPaese.professioni.map((codice) => {
          const p = professioni[codice];
          if (!p) return null;
          return (
            <Scelta
              key={codice}
              attiva={codice === attuale}
              onPress={() => setScelta(codice)}
              sinistra={<IconaQuadrata nome={p.icona} />}
              titolo={p.nome}
              sottotitolo={p.descrizione}
            />
          );
        })}
      </View>
      <Testo tipo="cap">
        Si completa sul sito, con lo stesso account: dati di fatturazione e, se vuoi, i documenti per il
        distintivo di professionista verificato.
      </Testo>
      <Pulsante
        titolo={`Continua su ${dominio(datiPaese)}`}
        iconaDopo="esterno"
        ruolo="link"
        onPress={() => apriSito(datiPaese.paginaProfessionisti)}
      />
    </Foglio>
  );
}
