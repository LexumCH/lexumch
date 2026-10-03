import { View } from 'react-native';

import { IconaQuadrata, Scheda } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { mostraAcquisti } from '@/config';
import { pacchettoLampoFinto } from '@/dati-finti/conti';
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
  const datiPaese = trovaPaese(paese);
  const lampo = pacchettoLampoFinto[paese];
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="fulmine" />
        <Testo tipo="dS">Continua la tua ricerca</Testo>
      </View>
      {mostraAcquisti ? (
        <>
          <Testo colore={colori.fg2}>
            Hai usato l'ultima ricerca disponibile. Con il Pacchetto Lampo continui subito con Lex:{' '}
            {lampo.ricerche} ricerche a {lampo.prezzo}. I crediti non scadono.
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
              <Eyebrow colore={colori.accentText}>Pacchetto Lampo</Eyebrow>
              <Testo tipo="dS">{lampo.ricerche} ricerche con Lex</Testo>
            </View>
            <Testo tipo="dM" oro>
              {lampo.prezzo}
            </Testo>
          </Scheda>
          <Pulsante
            titolo={`Continua su ${dominio(datiPaese)}`}
            iconaDopo="esterno"
            ruolo="link"
            onPress={() => apriSito(datiPaese.paginaAcquisti)}
          />
          <Testo tipo="cap" centrato>
            Paghi sul sito con lo stesso account. Poi torni qui e riprendi la ricerca da dove eri.
          </Testo>
        </>
      ) : (
        <Testo colore={colori.fg2}>Hai usato l'ultima ricerca disponibile.</Testo>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pulsante titolo="I tuoi crediti" variante="tenue" stile={{ flex: 1 }} onPress={onCrediti} />
        <Pulsante titolo="Non ora" variante="tenue" stile={{ flex: 1 }} onPress={onChiudi} />
      </View>
    </Foglio>
  );
}
