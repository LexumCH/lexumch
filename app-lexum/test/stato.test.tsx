import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { contiFinti } from '@/dati-finti/conti';
import { scalaCredito, StatoProvider, useStato } from '@/stato/Stato';

const avvolgi = ({ children }: { children: ReactNode }) => <StatoProvider>{children}</StatoProvider>;

async function prepara() {
  jest.useFakeTimers();
  return renderHook(() => useStato(), { wrapper: avvolgi });
}

// Fa avanzare l'attesa evento per evento (fasi, pezzi di testo, fine: ognuno è un timer nuovo).
async function aspettaRisposta() {
  for (let i = 0; i < 400; i++) {
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
  }
}

afterEach(() => jest.useRealTimers());

describe('crediti', () => {
  it('si usano prima quelli del piano, poi il benvenuto, infine quelli acquistati', () => {
    const conto = { ...contiFinti.IT, crediti: 4, creditiBenvenuto: 1, creditiAcquistati: 2 };
    const a = scalaCredito(conto); // piano: 4 - 1 - 2 = 1
    expect(a).toMatchObject({ crediti: 3, creditiBenvenuto: 1, creditiAcquistati: 2 });
    const b = scalaCredito(a);
    expect(b).toMatchObject({ crediti: 2, creditiBenvenuto: 0, creditiAcquistati: 2 });
    const c = scalaCredito(b);
    expect(c).toMatchObject({ crediti: 1, creditiBenvenuto: 0, creditiAcquistati: 1 });
  });

  it('il credito si scala quando arriva la risposta, non all’invio', async () => {
    const { result } = await prepara();
    expect(result.current.conto.crediti).toBe(1);
    let esito = '';
    await act(() => {
      esito = result.current.azioni.inviaDomanda('Il Comune non risponde');
    });
    expect(esito).toBe('ok');
    expect(result.current.chat.inCorso).toBe(true);
    expect(result.current.conto.crediti).toBe(1);
    await aspettaRisposta();
    expect(result.current.chat.inCorso).toBe(false);
    expect(result.current.chat.titolo).toBe('Accesso agli atti');
    expect(result.current.conto.crediti).toBe(0);
  });

  it('a crediti finiti la domanda non parte', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.inviaDomanda('prima');
    });
    await aspettaRisposta();
    let esito = '';
    await act(() => {
      esito = result.current.azioni.inviaDomanda('seconda');
    });
    expect(esito).toBe('esauriti');
  });

  it('se Lex non risponde il credito resta, e «Riprova» porta la risposta', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.impostaSimulazione('erroreLex', true);
    });
    await act(() => {
      result.current.azioni.inviaDomanda('domanda');
    });
    await aspettaRisposta();
    expect(result.current.chat.messaggi.at(-1)?.da).toBe('errore');
    expect(result.current.conto.crediti).toBe(1);
    await act(() => {
      result.current.azioni.riprova();
    });
    await aspettaRisposta();
    expect(result.current.chat.messaggi.at(-1)?.da).toBe('lex');
    expect(result.current.chat.messaggi.some((m) => m.da === 'errore')).toBe(false);
    expect(result.current.conto.crediti).toBe(0);
  });
});

describe('chat e ricerche', () => {
  it('una chat salvata finisce nell’etichetta scelta', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.inviaDomanda('domanda');
    });
    await aspettaRisposta();
    expect(result.current.chatDaSalvare).toBe(true);
    const prima = result.current.elementiAttivi.filter((e) => e.etichetta === 'casa').length;
    await act(() => {
      result.current.azioni.salvaChat('casa');
    });
    expect(result.current.chatDaSalvare).toBe(false);
    expect(result.current.elementiAttivi.filter((e) => e.etichetta === 'casa')).toHaveLength(prima + 1);
  });

  it('«Nuova chat» svuota la chat in corso', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.inviaDomanda('domanda');
    });
    await aspettaRisposta();
    await act(() => {
      result.current.azioni.nuovaChat();
    });
    expect(result.current.chat.messaggi).toHaveLength(0);
  });
});

describe('paesi', () => {
  it('crediti, piano e archivio non passano da un paese all’altro', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.passaAPaese('CH');
    });
    expect(result.current.paese).toBe('CH');
    expect(result.current.conto.crediti).toBe(28);
    expect(result.current.conto.piano).toBe('Piano Personale');
    await act(() => {
      result.current.azioni.passaAPaese('IT');
    });
    expect(result.current.conto.crediti).toBe(1);
  });

  it('eliminare un accesso non tocca quello dell’altro paese', async () => {
    const { result } = await prepara();
    await act(() => {
      result.current.azioni.eliminaAccesso('IT');
    });
    expect(result.current.accessi).toEqual({ IT: false, CH: true });
  });
});
