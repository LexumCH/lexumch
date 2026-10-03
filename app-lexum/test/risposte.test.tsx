import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { rispostaPer } from '@/dati-finti/chat';
import { trovaNorma } from '@/dati-finti/banca-dati';
import { elementiFinti, messaggiDi } from '@/dati-finti/ricerche';
import { contenuti } from '@/paesi/contenuti';
import { StatoProvider, useStato } from '@/stato/Stato';

const avvolgi = ({ children }: { children: ReactNode }) => <StatoProvider>{children}</StatoProvider>;

describe('risposte di prova', () => {
  it('ogni domanda d’esempio ha la sua risposta, con titolo', () => {
    const titoli = (paese: string) => contenuti[paese].esempi.map((d) => rispostaPer(paese, d).titolo);
    expect(titoli('IT')).toEqual([
      'Legittima difesa in casa',
      "Cauzione dell'affitto",
      'Multa arrivata tardi',
    ]);
    expect(titoli('CH')).toEqual([
      "Garanzia dell'affitto",
      'Reclamo contro la tassazione',
      'Disdetta durante la malattia',
    ]);
  });

  it('le parole contano più del Comune: una multa del Comune è una multa', () => {
    expect(rispostaPer('IT', 'Il Comune mi ha fatto una multa').titolo).toBe('Multa arrivata tardi');
    expect(rispostaPer('IT', 'Il Comune non risponde').titolo).toBe('Accesso agli atti');
    expect(rispostaPer('CH', 'Kündigung während der Krankheit').titolo).toBe('Disdetta durante la malattia');
    expect(rispostaPer('CH', "Ho ricevuto un decreto d'accusa").titolo).toBe(
      "Contestare un decreto d'accusa",
    );
  });

  it('fuori dagli esempi non inventa: lo dice', () => {
    const r = rispostaPer('IT', 'Come si divide un’eredità?');
    expect(r.titolo).toBe('');
    expect(r.nota).toMatch(/Risposta di prova/);
  });

  it('ogni citazione apre una norma che esiste', () => {
    for (const paese of ['IT', 'CH']) {
      for (const domanda of contenuti[paese].esempi) {
        for (const punto of rispostaPer(paese, domanda).punti) {
          for (const pezzo of punto.testo) {
            if (typeof pezzo !== 'string') expect(trovaNorma(pezzo.norma)).not.toBeNull();
          }
        }
      }
    }
  });
});

describe('Ricerche', () => {
  it('una chat finta di partenza mostra domanda e estratto', () => {
    const badante = elementiFinti.IT.find((e) => e.id === 'e4')!;
    const m = messaggiDi(badante);
    expect(m.map((x) => x.da)).toEqual(['io', 'lex']);
  });

  it('la nuova etichetta tiene il colore scelto', async () => {
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    await act(() => {
      result.current.azioni.creaEtichetta('Multe', '#D47F7F');
    });
    expect(result.current.etichetteAttive.at(-1)).toMatchObject({ nome: 'Multe', colore: '#D47F7F' });
  });

  it('il confronto scala un credito', async () => {
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    expect(result.current.conto.crediti).toBe(1);
    await act(() => {
      result.current.azioni.usaCredito();
    });
    expect(result.current.conto.crediti).toBe(0);
  });
});

describe('funzioni del telefono', () => {
  it('blocco e Ricerche senza rete partono spenti', async () => {
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    expect(result.current.telefono).toEqual({ blocco: false, ricercheOffline: false });
    await act(() => {
      result.current.azioni.impostaTelefono('ricercheOffline', true);
    });
    expect(result.current.telefono.ricercheOffline).toBe(true);
  });

  it('gestione etichette: rinomina e colore, poi elimina senza cancellare gli elementi', async () => {
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    const prima = result.current.elementiAttivi.length;
    await act(() => {
      result.current.azioni.modificaEtichetta('casa', { nome: 'Casa e condominio', colore: '#8B7BB8' });
    });
    expect(result.current.etichetteAttive[0]).toMatchObject({ nome: 'Casa e condominio', colore: '#8B7BB8' });
    await act(() => {
      result.current.azioni.eliminaEtichetta('casa');
    });
    expect(result.current.etichetteAttive.some((e) => e.id === 'casa')).toBe(false);
    expect(result.current.elementiAttivi.length).toBe(prima);
    expect(result.current.elementiAttivi.some((e) => e.etichetta === 'casa')).toBe(false);
  });

  it('un file condiviso da un’altra app entra in Archivio, in coda', async () => {
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    await act(() => {
      result.current.azioni.salvaInArchivio({
        titolo: 'Verbale della multa',
        categoria: null,
        dimensione: '380 KB',
        tipo: 'PDF',
      });
    });
    expect(result.current.documentiAttivi[0]).toMatchObject({
      titolo: 'Verbale della multa',
      stato: 'In coda',
    });
  });
});

describe('titolo della chat', () => {
  it('senza un argomento riconosciuto è l’inizio della domanda', async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() => useStato(), { wrapper: avvolgi });
    await act(() => {
      result.current.azioni.inviaDomanda(
        'Come si divide un’eredità tra fratelli e sorelle quando manca il testamento?',
      );
    });
    for (let i = 0; i < contenuti.IT.passi.length + 1; i++) {
      await act(() => {
        jest.advanceTimersByTime(800);
      });
    }
    expect(result.current.chat.titolo).toBe('Come si divide un’eredità tra fratelli e…');
    jest.useRealTimers();
  });
});
