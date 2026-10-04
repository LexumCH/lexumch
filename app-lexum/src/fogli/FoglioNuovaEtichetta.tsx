import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import type { Chiave } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { useStato } from '@/stato/Stato';
import { colori, coloriEtichette, nomiColoriEtichette } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onCreata: (etichettaId: string) => void;
};

// D1 · «+ Etichetta» in Ricerche: nome e colore, come sul sito.
export function FoglioNuovaEtichetta({ visibile, onChiudi, onCreata }: Props) {
  const { etichetteAttive, azioni } = useStato();
  const { t } = useTesti();
  const prossimo = coloriEtichette[etichetteAttive.length % coloriEtichette.length];
  const [nome, setNome] = useState('');
  const [colore, setColore] = useState<string>(prossimo);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura si riparte da capo, con il primo colore non ancora usato in ordine
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) {
      setNome('');
      setColore(prossimo);
    }
  }

  const pulito = nome.trim();
  const esiste = etichetteAttive.some((e) => e.nome.toLowerCase() === pulito.toLowerCase());
  const pronta = !!pulito && !esiste;

  // Il nome del colore per il lettore dello schermo, nella lingua dell'app.
  const nomeColore = (c: string) => {
    const nome = nomiColoriEtichette[c];
    return nome ? t(`ricerche.colori.${nome}` as Chiave) : c;
  };

  const crea = () => {
    if (!pronta) return;
    const e = azioni.creaEtichetta(pulito, colore);
    onCreata(e.id);
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={18}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('ricerche.nuovaEtichetta')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('ricerche.etichette.nuovaTesto')}
        </Testo>
      </View>
      <Campo
        etichetta={t('ricerche.etichette.nome')}
        placeholder={t('ricerche.etichette.nomeSegnaposto')}
        value={nome}
        onChangeText={setNome}
        onSubmitEditing={crea}
        returnKeyType="done"
        maxLength={40}
      />
      {esiste ? (
        <Testo tipo="small" colore={colori.danger}>
          {t('ricerche.etichette.doppione')}
        </Testo>
      ) : null}
      <View style={{ gap: 10 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('ricerche.etichette.colore')}
        </Testo>
        <View
          style={stili.colori}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('ricerche.etichette.colore')}
        >
          {coloriEtichette.map((c) => {
            const scelto = c === colore;
            return (
              <Pressable
                key={c}
                onPress={() => setColore(c)}
                accessibilityRole="radio"
                aria-checked={scelto}
                accessibilityLabel={t('ricerche.etichette.coloreNome', { nome: nomeColore(c) })}
                hitSlop={4}
                style={[stili.colore, { backgroundColor: c }, scelto && stili.scelto]}
              >
                {scelto ? <Icona nome="spunta" dimensione={18} colore={colori.petrolio} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Testo tipo="cap">{t('ricerche.etichette.anteprima')}</Testo>
        <View style={{ flexDirection: 'row' }}>
          <Tag titolo={pulito || t('ricerche.nuovaEtichetta')} colore={colore} />
        </View>
      </View>
      <Pulsante titolo={t('ricerche.etichette.crea')} disabilitato={!pronta} onPress={crea} />
    </Foglio>
  );
}

const stili = StyleSheet.create({
  colori: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colore: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scelto: { borderWidth: 2, borderColor: colori.fg },
});
