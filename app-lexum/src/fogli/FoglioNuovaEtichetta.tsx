import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { useStato } from '@/stato/Stato';
import { colori, coloriEtichette } from '@/tema';

const nomiColori: Record<string, string> = {
  '#7FA39A': 'salvia',
  '#C9A45C': 'oro',
  '#6FA3D4': 'azzurro',
  '#D47F7F': 'rosso',
  '#8B7BB8': 'viola',
  '#D49B6F': 'arancio',
  '#8FB979': 'verde',
  '#B57FD4': 'lilla',
};

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onCreata: (etichettaId: string) => void;
};

// D1 · «+ Etichetta» in Ricerche: nome e colore, come sul sito.
export function FoglioNuovaEtichetta({ visibile, onChiudi, onCreata }: Props) {
  const { etichetteAttive, azioni } = useStato();
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

  const crea = () => {
    if (!pronta) return;
    const e = azioni.creaEtichetta(pulito, colore);
    onCreata(e.id);
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={18}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">Nuova etichetta</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Raccoglie chat, norme e sentenze sullo stesso tema. La ritrovi anche sul sito.
        </Testo>
      </View>
      <Campo
        etichetta="Nome"
        placeholder="Es. Casa, Lavoro, Multe…"
        value={nome}
        onChangeText={setNome}
        onSubmitEditing={crea}
        returnKeyType="done"
        maxLength={40}
      />
      {esiste ? (
        <Testo tipo="small" colore={colori.danger}>
          Esiste già un'etichetta con questo nome.
        </Testo>
      ) : null}
      <View style={{ gap: 10 }}>
        <Testo tipo="small" colore={colori.fg2}>
          Colore
        </Testo>
        <View style={stili.colori} accessibilityRole="radiogroup" accessibilityLabel="Colore">
          {coloriEtichette.map((c) => {
            const scelto = c === colore;
            return (
              <Pressable
                key={c}
                onPress={() => setColore(c)}
                accessibilityRole="radio"
                accessibilityState={{ checked: scelto }}
                accessibilityLabel={`Colore ${nomiColori[c] ?? c}`}
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
        <Testo tipo="cap">Anteprima</Testo>
        <View style={{ flexDirection: 'row' }}>
          <Tag titolo={pulito || 'Nuova etichetta'} colore={colore} />
        </View>
      </View>
      <Pulsante titolo="Crea etichetta" disabilitato={!pronta} onPress={crea} />
    </Foglio>
  );
}

const stili = StyleSheet.create({
  colori: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colore: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scelto: { borderWidth: 2, borderColor: colori.fg },
});
