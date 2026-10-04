import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BadgePaese, Barra, Logo } from '@/componenti/Elementi';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { ricominciaDa } from '@/navigazione';
import { useTesti } from '@/lingue/useTesti';
import { paesePredefinito } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

const DURATA_MS = 1600;

// G3 · L'app passa alla banca dati di un altro paese e si ricarica lì.
// Dalla tappa 2 qui si carica davvero il conto del paese (crediti, piano, archivio) dal suo database.
export default function Passaggio() {
  const { azioni } = useStato();
  const { paese: param } = useLocalSearchParams<{ paese?: string }>();
  const codice = param ?? paesePredefinito;
  const { t } = useTesti(codice);
  const nomePaese = t(`paesi.${codice as 'IT' | 'CH'}`);
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
    const timer = setInterval(() => {
      const p = Math.min(100, ((Date.now() - inizio) / DURATA_MS) * 100);
      setPercento(p);
      if (p >= 100) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (percento >= 100) concludi();
  });

  return (
    <Schermata hero alone={190}>
      <Pressable
        onPress={concludi}
        accessibilityRole="button"
        accessibilityLabel={t('comune.continua')}
        style={stili.centro}
      >
        <Logo grande />
        <BadgePaese codice={codice} nome={nomePaese} />
        <Testo tipo="dM" centrato>
          {t(`passaggio.titolo.${codice as 'IT' | 'CH'}`)}
        </Testo>
        <Testo tipo="small" colore={colori.fg2} centrato>
          {t('passaggio.testo', { paese: nomePaese })}
        </Testo>
        <Barra percento={percento} larghezza={180} />
      </Pressable>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
});
