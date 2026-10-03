import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BadgePaese, Barra, Logo } from '@/componenti/Elementi';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { ricominciaDa } from '@/navigazione';
import { contenuti } from '@/paesi/contenuti';
import { paesePredefinito, trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

const DURATA_MS = 1600;

// G3 · L'app passa alla banca dati di un altro paese e si ricarica lì.
// Dalla tappa 2 qui si carica davvero il conto del paese (crediti, piano, archivio) dal suo database.
export default function Passaggio() {
  const { azioni } = useStato();
  const { paese: param } = useLocalSearchParams<{ paese?: string }>();
  const codice = param ?? paesePredefinito;
  const datiPaese = trovaPaese(codice);
  const testi = contenuti[codice];
  const [percento, setPercento] = useState(0);
  const fatto = useRef(false);

  const concludi = () => {
    if (fatto.current) return;
    fatto.current = true;
    azioni.passaAPaese(codice);
    ricominciaDa('/chat');
  };

  useEffect(() => {
    const inizio = Date.now();
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - inizio) / DURATA_MS) * 100);
      setPercento(p);
      if (p >= 100) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (percento >= 100) concludi();
  });

  return (
    <Schermata hero alone={190}>
      <Pressable
        onPress={concludi}
        accessibilityRole="button"
        accessibilityLabel="Continua"
        style={stili.centro}
      >
        <Logo grande />
        <BadgePaese codice={codice} nome={datiPaese.nome} />
        <Testo tipo="dM" centrato>
          Passo alla banca dati {testi.aggettivoFemminile}
        </Testo>
        <Testo tipo="small" colore={colori.fg2} centrato>
          Carico il tuo account, i crediti e l'archivio di Lexum {datiPaese.nome}.
        </Testo>
        <Barra percento={percento} larghezza={180} />
      </Pressable>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
});
