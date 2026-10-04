import { View } from 'react-native';

import { IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { mostraAcquisti } from '@/config';
import { pacchettoLampoFinto } from '@/dati-finti/conti';
import { useTesti } from '@/lingue/useTesti';
import { apriSito } from '@/navigazione';
import { dominio, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onCrediti: () => void;
};

// B6 · Crediti finiti: niente pagamenti nell'app, si rimanda alla pagina acquisti del sito.
export function FoglioEsauriti({ visibile, onChiudi, onCrediti }: Props) {
  const { paese } = useStato();
  const { t } = useTesti();
  const datiPaese = trovaPaese(paese);
  const lampo = pacchettoLampoFinto[paese];
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="fulmine" />
        <Testo tipo="dS">{t('chat.esauriti.titolo')}</Testo>
      </View>
      {mostraAcquisti ? (
        <>
          <Testo colore={colori.fg2}>
            {t('chat.esauriti.ultima')}{' '}
            {t('chat.esauriti.offerta', { n: lampo.ricerche, prezzo: lampo.prezzo })}
          </Testo>
          <Scheda
            tono="oro"
            stile={{
              backgroundColor: colori.bg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ gap: 6, flex: 1 }}>
              <Eyebrow colore={colori.accentText}>{t('chat.esauriti.pacchetto')}</Eyebrow>
              <Testo tipo="dS">{t('chat.esauriti.ricerche', { n: lampo.ricerche })}</Testo>
            </View>
            <Testo tipo="dM" oro>
              {lampo.prezzo}
            </Testo>
          </Scheda>
          <Pulsante
            titolo={t('chat.esauriti.continuaSu', { sito: dominio(datiPaese) })}
            iconaDopo="esterno"
            ruolo="link"
            onPress={() => apriSito(datiPaese.paginaAcquisti)}
          />
          <Testo tipo="cap" centrato>
            {t('chat.esauriti.nota')}
          </Testo>
        </>
      ) : (
        <Testo colore={colori.fg2}>{t('chat.esauriti.ultima')}</Testo>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pulsante
          titolo={t('chat.esauriti.tuoiCrediti')}
          variante="tenue"
          stile={{ flex: 1 }}
          onPress={onCrediti}
        />
        <Pulsante
          titolo={t('chat.esauriti.nonOra')}
          variante="tenue"
          stile={{ flex: 1 }}
          onPress={onChiudi}
        />
      </View>
    </Foglio>
  );
}
