import { View } from 'react-native';
import { useState } from 'react';

import { IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { apriSito } from '@/navigazione';
import { professioni } from '@/paesi/contenuti';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type CodiceProfessione = 'avvocato' | 'commercialista' | 'fiduciario' | 'progettista';

// D5 · Che professionista sei? Il profilo professionale si completa sul sito.
// Icone da src/paesi/contenuti.ts; nomi e descrizioni dalla lingua dell'app.
export function FoglioProfessionista({ visibile, onChiudi }: { visibile: boolean; onChiudi: () => void }) {
  const { paese } = useStato();
  const { t } = useTesti();
  const datiPaese = trovaPaese(paese);
  const [scelta, setScelta] = useState(datiPaese.professioni[0]);
  const attuale = datiPaese.professioni.includes(scelta) ? scelta : datiPaese.professioni[0];
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ gap: 8 }}>
        <Eyebrow>{t('profilo.completa.sopratitolo')}</Eyebrow>
        <Testo tipo="dM">{t('profilo.completa.pulsante')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('profilo.professionista.testo')}
        </Testo>
      </View>
      <View
        style={{ gap: 10 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('avvio.registrazione.professione')}
      >
        {datiPaese.professioni.map((codice) => {
          const p = professioni[codice];
          if (!p) return null;
          const voce = `profilo.professionista.professioni.${codice as CodiceProfessione}` as const;
          return (
            <Scelta
              key={codice}
              attiva={codice === attuale}
              onPress={() => setScelta(codice)}
              sinistra={<IconaQuadrata nome={p.icona} />}
              titolo={t(`${voce}.nome`)}
              sottotitolo={t(`${voce}.descrizione`)}
            />
          );
        })}
      </View>
      <Testo tipo="cap">{t('profilo.professionista.nota')}</Testo>
      <Pulsante
        titolo={t('profilo.professionista.continua', { sito: dominio(datiPaese) })}
        iconaDopo="esterno"
        ruolo="link"
        onPress={() => apriSito(datiPaese.paginaProfessionisti)}
      />
    </Foglio>
  );
}
