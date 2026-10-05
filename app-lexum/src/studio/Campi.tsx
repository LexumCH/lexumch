import { useState } from 'react';
import { View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Tag } from '@/componenti/Elementi';
import { useTesti } from '@/lingue/useTesti';

import { dataNumerica } from './formati';

// Campi dello Studio: data (gg.mm.aaaa, con scorciatoie), ora (hh:mm), scelta tra poche voci.
// Nell'app vera la data si sceglie con il selettore del telefono: qui basta il testo.

export function leggiData(testo: string): Date | null {
  const m = testo.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export function leggiOra(testo: string): [number, number] | null {
  const m = testo.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? [h, min] : null;
}

export function traGiorni(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

type PropsData = {
  etichetta: string;
  valore: string; // testo gg.mm.aaaa
  onCambia: (testo: string) => void;
  scorciatoie?: { titolo: string; giorni: number }[];
};

export function CampoData({ etichetta, valore, onCambia, scorciatoie }: PropsData) {
  const { t } = useTesti();
  return (
    <View style={{ gap: 8 }}>
      <Campo
        etichetta={etichetta}
        placeholder={t('studio.campi.formatoData')}
        value={valore}
        onChangeText={onCambia}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      {scorciatoie ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {scorciatoie.map((s) => {
            const testo = dataNumerica(traGiorni(s.giorni).toISOString());
            return (
              <Tag
                key={s.titolo}
                titolo={s.titolo}
                attivo={valore === testo}
                onPress={() => onCambia(testo)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function CampoOra({
  etichetta,
  valore,
  onCambia,
}: {
  etichetta: string;
  valore: string;
  onCambia: (testo: string) => void;
}) {
  const { t } = useTesti();
  return (
    <Campo
      etichetta={etichetta}
      placeholder={t('studio.campi.formatoOra')}
      value={valore}
      onChangeText={onCambia}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      stile={{ flex: 1 }}
    />
  );
}

export function Scelta<T extends string>({
  voci,
  valore,
  onCambia,
  etichettaGruppo,
}: {
  voci: readonly T[] | { valore: T; titolo: string }[];
  valore: T | null;
  onCambia: (v: T) => void;
  etichettaGruppo: string;
}) {
  const elenco = (voci as (T | { valore: T; titolo: string })[]).map((v) =>
    typeof v === 'string' ? { valore: v, titolo: v } : v,
  );
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      accessibilityRole="radiogroup"
      accessibilityLabel={etichettaGruppo}
    >
      {elenco.map((v) => (
        <Tag
          key={v.valore}
          titolo={v.titolo}
          attivo={v.valore === valore}
          onPress={() => onCambia(v.valore)}
        />
      ))}
    </View>
  );
}

// Per i fogli che si riaprono: ricorda se il foglio era visibile e riparte da capo a ogni apertura.
export function useRiapertura(visibile: boolean, azzera: () => void) {
  const [era, setEra] = useState(visibile);
  if (visibile !== era) {
    setEra(visibile);
    if (visibile) azzera();
  }
}
