import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Pallino } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import type { Etichetta } from '@/dati-finti/ricerche';
import type { Chiave } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { useStato } from '@/stato/Stato';
import { colori, coloriEtichette, nomiColoriEtichette } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
};

type Azione = { tipo: 'modifica' | 'elimina'; id: string } | null;

// D1 · Gestisci etichette, come ModaleGestioneEtichette del sito: nome e colore si cambiano;
// eliminando un'etichetta, chat, norme e appunti restano ma perdono quell'etichetta.
export function FoglioGestioneEtichette({ visibile, onChiudi }: Props) {
  const { etichetteAttive, elementiAttivi, azioni } = useStato();
  const { t } = useTesti();
  const [azione, setAzione] = useState<Azione>(null);
  const [nome, setNome] = useState('');
  const [colore, setColore] = useState<string>(coloriEtichette[0]);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) setAzione(null);
  }

  const modifica = (e: Etichetta) => {
    setAzione({ tipo: 'modifica', id: e.id });
    setNome(e.nome);
    setColore(e.colore);
  };

  // Il nome del colore per il lettore dello schermo, nella lingua dell'app.
  const nomeColore = (c: string) => {
    const n = nomiColoriEtichette[c];
    return n ? t(`ricerche.colori.${n}` as Chiave) : c;
  };

  const pulito = nome.trim();
  const doppione = etichetteAttive.some(
    (e) => e.id !== azione?.id && e.nome.toLowerCase() === pulito.toLowerCase(),
  );

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={stili.testa}>
        <View style={{ flex: 1, gap: 6 }}>
          <Testo tipo="dS">{t('ricerche.gestisci')}</Testo>
          <Testo tipo="small" colore={colori.fg2}>
            {t('ricerche.etichette.gestisciTesto')}
          </Testo>
        </View>
        <PulsanteIcona icona="chiudi" etichetta={t('interfaccia.chiudi')} onPress={onChiudi} />
      </View>

      {etichetteAttive.length === 0 ? (
        <Testo tipo="small" colore={colori.fg3}>
          {t('ricerche.etichette.nessuna')}
        </Testo>
      ) : null}

      <View style={{ gap: 8 }}>
        {etichetteAttive.map((e) => {
          const quanti = elementiAttivi.filter((x) => x.etichetta === e.id).length;
          const voci = quanti === 1 ? t('ricerche.elementiUno') : t('ricerche.elementiMolti', { n: quanti });

          if (azione?.id === e.id && azione.tipo === 'modifica') {
            return (
              <View key={e.id} style={[stili.voce, stili.voceAperta]}>
                <Campo
                  etichetta={t('ricerche.etichette.nome')}
                  value={nome}
                  onChangeText={setNome}
                  maxLength={40}
                />
                {doppione ? (
                  <Testo tipo="small" colore={colori.danger}>
                    {t('ricerche.etichette.doppione')}
                  </Testo>
                ) : null}
                <View
                  style={stili.colori}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('ricerche.etichette.colore')}
                >
                  {coloriEtichette.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColore(c)}
                      accessibilityRole="radio"
                      aria-checked={c === colore}
                      accessibilityLabel={t('ricerche.etichette.coloreNome', { nome: nomeColore(c) })}
                      hitSlop={4}
                      style={[stili.colore, { backgroundColor: c }, c === colore && stili.scelto]}
                    >
                      {c === colore ? <Icona nome="spunta" dimensione={16} colore={colori.petrolio} /> : null}
                    </Pressable>
                  ))}
                </View>
                <View style={stili.pulsanti}>
                  <Pulsante
                    titolo={t('comune.annulla')}
                    variante="linea"
                    piccolo
                    stile={{ flex: 1 }}
                    onPress={() => setAzione(null)}
                  />
                  <Pulsante
                    titolo={t('ricerche.etichette.salva')}
                    piccolo
                    stile={{ flex: 1 }}
                    disabilitato={!pulito || doppione}
                    onPress={() => {
                      azioni.modificaEtichetta(e.id, { nome: pulito, colore });
                      setAzione(null);
                    }}
                  />
                </View>
              </View>
            );
          }

          if (azione?.id === e.id && azione.tipo === 'elimina') {
            return (
              <View key={e.id} style={[stili.voce, stili.voceAperta, { borderColor: colori.dangerLine }]}>
                <Testo medio>{t('ricerche.etichette.eliminaDomanda', { nome: e.nome })}</Testo>
                <Testo tipo="small" colore={colori.fg2}>
                  {quanti === 0
                    ? t('ricerche.etichette.vuota')
                    : quanti === 1
                      ? t('ricerche.etichette.restaUno')
                      : t('ricerche.etichette.restanoMolti', { n: quanti })}
                </Testo>
                <View style={stili.pulsanti}>
                  <Pulsante
                    titolo={t('comune.annulla')}
                    variante="linea"
                    piccolo
                    stile={{ flex: 1 }}
                    onPress={() => setAzione(null)}
                  />
                  <Pulsante
                    titolo={t('ricerche.etichette.elimina')}
                    variante="pericolo"
                    piccolo
                    stile={{ flex: 1 }}
                    onPress={() => {
                      azioni.eliminaEtichetta(e.id);
                      setAzione(null);
                    }}
                  />
                </View>
              </View>
            );
          }

          return (
            <View key={e.id} style={stili.voce}>
              <View style={stili.riga}>
                <Pallino colore={e.colore} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Testo numberOfLines={1}>{e.nome}</Testo>
                  <Testo tipo="cap">{voci}</Testo>
                </View>
                <PulsanteIcona
                  icona="modifica"
                  etichetta={t('ricerche.etichette.modifica', { nome: e.nome })}
                  dimensione={18}
                  onPress={() => modifica(e)}
                />
                <PulsanteIcona
                  icona="cestino"
                  etichetta={t('ricerche.etichette.eliminaNome', { nome: e.nome })}
                  dimensione={18}
                  onPress={() => setAzione({ tipo: 'elimina', id: e.id })}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Foglio>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  voce: { borderWidth: 1, borderColor: colori.line, backgroundColor: colori.bg },
  voceAperta: { gap: 12, padding: 14, borderColor: colori.accentLine },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  colori: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colore: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scelto: { borderWidth: 2, borderColor: colori.fg },
  pulsanti: { flexDirection: 'row', gap: 8 },
});
