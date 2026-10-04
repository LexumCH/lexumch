import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  etichettaIniziale?: string;
  onChiudi: () => void;
  onCreata: (etichettaId: string) => void;
};

// D1 · «+» di Ricerche: una ricerca scritta a mano (appunti, ragionamento, citazioni),
// come «Nuova ricerca» del sito. Per chiedere a Lex c'è il pulsante in basso.
export function FoglioNuovaRicerca({ visibile, etichettaIniziale, onChiudi, onCreata }: Props) {
  const { etichetteAttive, azioni } = useStato();
  const { t } = useTesti();
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [etichetta, setEtichetta] = useState(etichettaIniziale ?? etichetteAttive[0]?.id ?? null);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura si riparte vuoti, nell'etichetta che stai guardando
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) {
      setTitolo('');
      setTesto('');
      setEtichetta(etichettaIniziale ?? etichetteAttive[0]?.id ?? null);
    }
  }

  const nomeEtichetta = etichetteAttive.find((e) => e.id === etichetta)?.nome;
  const pronta = !!testo.trim() && !!etichetta;

  const salva = () => {
    if (!pronta || !etichetta) return;
    azioni.creaAppunti({ titolo, testo, etichetta });
    onCreata(etichetta);
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('ricerche.nuova')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('ricerche.nuovaRicerca.testo')}
        </Testo>
      </View>
      <Campo
        etichetta={t('ricerche.nuovaRicerca.titolo')}
        placeholder={t('ricerche.nuovaRicerca.titoloSegnaposto')}
        value={titolo}
        onChangeText={setTitolo}
        maxLength={120}
      />
      <Campo
        etichetta={t('ricerche.nuovaRicerca.contenuto')}
        placeholder={t('ricerche.nuovaRicerca.contenutoSegnaposto')}
        value={testo}
        onChangeText={setTesto}
        multiline
      />
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('ricerche.etichetta')}
        </Testo>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('ricerche.etichetta')}
        >
          {etichetteAttive.map((e) => (
            <Tag
              key={e.id}
              titolo={e.nome}
              colore={e.colore}
              attivo={e.id === etichetta}
              onPress={() => setEtichetta(e.id)}
            />
          ))}
        </ScrollView>
        {etichetteAttive.length === 0 ? (
          <Testo tipo="cap">{t('ricerche.nuovaRicerca.senzaEtichette')}</Testo>
        ) : null}
      </View>
      <Pulsante
        titolo={
          nomeEtichetta
            ? t('ricerche.nuovaRicerca.salvaIn', { nome: nomeEtichetta })
            : t('ricerche.nuovaRicerca.scegli')
        }
        icona="segnalibro"
        disabilitato={!pronta}
        onPress={salva}
      />
      <Testo tipo="cap">{t('ricerche.nuovaRicerca.sulSito')}</Testo>
    </Foglio>
  );
}
