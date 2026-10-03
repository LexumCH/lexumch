import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Apertura del menù laterale (C1), che sta sopra tutte le schermate.

type Valore = { aperto: boolean; apri: () => void; chiudi: () => void };

const Contesto = createContext<Valore | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [aperto, setAperto] = useState(false);
  const apri = useCallback(() => setAperto(true), []);
  const chiudi = useCallback(() => setAperto(false), []);
  const valore = useMemo(() => ({ aperto, apri, chiudi }), [aperto, apri, chiudi]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useMenu(): Valore {
  const v = useContext(Contesto);
  if (!v) throw new Error('useMenu va usato dentro MenuProvider');
  return v;
}
