import { useCallback } from 'react';

import { useStatoOpzionale } from '@/stato/Stato';

import { linguaDelPaese, traduci, type Chiave, type Lingua } from './index';

// Nelle schermate: const { t, lingua } = useTesti(); t('avvio.accesso.titolo').
// Con «paese» si chiede la lingua di un altro paese (per esempio l'accesso svizzero da un account italiano).
// Con 'telefono' la lingua scelta (all'inizio quella del telefono), per la scelta del paese (A0).
export function useTesti(paese?: string | 'telefono') {
  // Fuori dallo stato dell'app (per esempio nella schermata d'errore) si parla italiano.
  const stato = useStatoOpzionale();
  const lingua: Lingua = !stato
    ? 'it'
    : paese === 'telefono'
      ? stato.lingua
      : linguaDelPaese(paese ?? stato.paese, stato.lingua);
  const t = useCallback(
    (chiave: Chiave, valori?: Record<string, string | number>) => traduci(lingua, chiave, valori),
    [lingua],
  );
  return { t, lingua };
}
