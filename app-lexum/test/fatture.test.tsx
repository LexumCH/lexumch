import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { studioFinto } from '@/dati-finti/studio';
import { totaliFattura } from '@/studio/calcoli';
import {
  cfValido,
  eQrIban,
  ibanValido,
  leggiImporto,
  mancanoAlCliente,
  mancanoAlProfessionista,
  numeroIvaValido,
  pivaValida,
} from '@/studio/fatturazione';
import { calcolaParcella, scaglioneDaValore, valoreMedioFase } from '@/studio/parametri-forensi/engine';
import { StatoProvider, useStato } from '@/stato/Stato';
import { StudioProvider, useStudio } from '@/stato/Studio';

const fattura = (paese: string, ruolo: string, id: string) => {
  const f = studioFinto(paese, ruolo).fatture.find((x) => x.id === id);
  if (!f) throw new Error(`manca la fattura ${id}`);
  return f;
};

describe('totali delle fatture: due processi diversi', () => {
  it('Italia: CPA 4%, IVA 22% su imponibile + CPA, ritenuta 20% sull’imponibile', () => {
    const t = totaliFattura(fattura('IT', 'avvocato', 'f1'), 'IT');
    expect(t).toMatchObject({
      imponibile: 1950.4,
      cpa: 78.02,
      iva: 446.25,
      totale: 2474.67,
      ritenuta: 390.08,
      daIncassare: 2084.59,
    });
    // senza ritenuta: il cliente paga il totale (come il pagamento registrato in F-2026-007)
    const senza = totaliFattura(fattura('IT', 'avvocato', 'f2'), 'IT');
    expect(senza.totale).toBe(761.28);
    expect(senza.residuo).toBe(0);
  });

  it('Svizzera: IVA 8,1% sull’imponibile, niente CPA né ritenuta; esente se lo si sceglie', () => {
    const t = totaliFattura(fattura('CH', 'avvocato', 'f2'), 'CH');
    expect(t).toMatchObject({ imponibile: 950, cpa: 0, iva: 76.95, ritenuta: 0, totale: 1026.95 });
    const esente = totaliFattura({ ...fattura('CH', 'avvocato', 'f1'), esenteIva: true }, 'CH');
    expect(esente.iva).toBe(0);
    expect(esente.totale).toBe(840);
  });
});

describe('calcolatore della parcella (stesso motore del sito)', () => {
  it('tribunale, da 5.201 a 26.000 €, studio e introduttiva al valore medio, con spese generali', () => {
    const r = calcolaParcella({
      competenzaKey: 'tribunale_ordinario',
      scaglioneId: 'da_5201_26000',
      fasi: {
        studio: { incluso: true, livello: 'medio' },
        introduttiva: { incluso: true, livello: 'medio' },
        istruttoria: { incluso: false, livello: 'medio' },
        decisionale: { incluso: false, livello: 'medio' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.righe.map((x) => x.prezzo_unitario)).toEqual([919, 777, 254.4]);
    // le stesse righe della fattura finta F-2026-008
    expect(r.righe.map((x) => x.descrizione)).toEqual(
      fattura('IT', 'avvocato', 'f1').righe.map((x) => x.descrizione),
    );
    expect(r.riepilogo?.totaleLordo).toBe(2474.67);
  });

  it('minimo e massimo: −50% e +50%; aumenti e riduzioni sul compenso delle fasi', () => {
    const r = calcolaParcella({
      competenzaKey: 'tribunale_ordinario',
      scaglioneId: 'da_5201_26000',
      fasi: { studio: { incluso: true, livello: 'max' }, introduttiva: { incluso: true, livello: 'min' } },
      riduzioni: [{ id: 'solo_rito', label: 'Definizione solo in rito', pct: 50 }],
      includiSpeseGenerali: false,
    });
    expect(r.righe.map((x) => x.prezzo_unitario)).toEqual([1378.5, 388.5, -883.5]);
    expect(r.riepilogo?.compenso).toBe(883.5);
  });

  it('oltre 520.000 €: progressione dell’art. 6 (+30% per scaglione) con l’avviso', () => {
    const base = valoreMedioFase('tribunale_ordinario', '2022', 'da_260001_520000', 'studio') ?? 0;
    expect(valoreMedioFase('tribunale_ordinario', '2022', 'da_520001_1000000', 'studio')).toBe(
      Math.round(base * 1.3 * 100) / 100,
    );
    const r = calcolaParcella({
      competenzaKey: 'tribunale_ordinario',
      scaglioneId: 'da_520001_1000000',
      fasi: { studio: { incluso: true, livello: 'medio' } },
    });
    expect(r.note.join(' ')).toMatch(/art\. 6/);
  });

  it('dal valore della causa allo scaglione; senza fasi non si calcola', () => {
    expect(scaglioneDaValore(15000)).toBe('da_5201_26000');
    expect(scaglioneDaValore(1100)).toBe('fino_1100');
    expect(scaglioneDaValore(-1)).toBeNull();
    const r = calcolaParcella({
      competenzaKey: 'tribunale_ordinario',
      scaglioneId: 'da_5201_26000',
      fasi: {},
    });
    expect(r.ok).toBe(false);
  });
});

describe('dati di fatturazione', () => {
  it('controlla la forma di partita IVA, codice fiscale, IBAN e numero IVA', () => {
    expect(pivaValida('01234567897')).toBe(true);
    expect(pivaValida('01234567890')).toBe(false);
    expect(cfValido('RSSGLI85M41F205Z')).toBe(true);
    expect(cfValido('RSSGLI85')).toBe(false);
    expect(ibanValido('IT60X0542811101000000123456', 'IT')).toBe(true);
    expect(ibanValido('IT60X0542811101000000123457', 'IT')).toBe(false);
    expect(ibanValido('CH93 0076 2011 6238 5295 7', 'CH')).toBe(true);
    expect(eQrIban('CH44 3199 9123 0008 8901 2')).toBe(true);
    expect(eQrIban('CH93 0076 2011 6238 5295 7')).toBe(false);
    expect(numeroIvaValido('CHE-123.456.789 IVA')).toBe(true);
    expect(numeroIvaValido('CHE-123.456.789 MWST')).toBe(true);
    expect(numeroIvaValido('IT01234567897')).toBe(false);
  });

  it('dice cosa manca al professionista e al cliente', () => {
    expect(mancanoAlProfessionista({ paese: 'IT' }, 'IT')).toEqual([
      'partita IVA',
      'codice fiscale',
      'indirizzo dello studio',
      'regime fiscale',
    ]);
    expect(mancanoAlProfessionista(studioFinto('IT', 'avvocato').fatturazione, 'IT')).toEqual([]);
    expect(mancanoAlProfessionista({ paese: 'CH' }, 'CH')).toEqual([
      'indirizzo dello studio',
      'IBAN per la QR-fattura',
      'se sei assoggettato all’IVA',
    ]);
    expect(mancanoAlProfessionista(studioFinto('CH', 'avvocato').fatturazione, 'CH')).toEqual([]);
    const clienti = studioFinto('IT', 'avvocato').clienti;
    expect(mancanoAlCliente(clienti[0], 'IT')).toEqual([]);
    expect(mancanoAlCliente(clienti[1], 'IT')).toEqual(['codice fiscale', 'indirizzo']);
  });

  it('legge gli importi scritti all’italiana e alla svizzera', () => {
    expect(leggiImporto('1.234,50', 'IT')).toBe(1234.5);
    expect(leggiImporto('250', 'IT')).toBe(250);
    expect(leggiImporto('1’234.50', 'CH')).toBe(1234.5);
    expect(leggiImporto('12,5', 'CH')).toBe(12.5);
    expect(leggiImporto('dodici', 'IT')).toBeNull();
  });
});

describe('fatture nello stato dello Studio', () => {
  const avvolgi = ({ children }: { children: ReactNode }) => (
    <StatoProvider>
      <StudioProvider>{children}</StudioProvider>
    </StatoProvider>
  );

  it('numera di seguito e passa a «pagata» quando il cliente paga il netto', async () => {
    const { result } = await renderHook(() => ({ stato: useStato(), studio: useStudio() }), {
      wrapper: avvolgi,
    });
    await act(async () => result.current.stato.azioni.scenario('avvocato-it'));
    let id = '';
    await act(async () => {
      id = result.current.studio.azioni.creaFattura({
        clienteId: 'c3',
        emessa: new Date().toISOString(),
        righe: [{ id: 'r1', descrizione: 'Parere scritto', quantita: 1, prezzo: 1000 }],
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
      });
    });
    const nuova = () => result.current.studio.fatture.find((f) => f.id === id);
    // nei dati finti l'ultima del 2026 è la F-2026-008; in un altro anno si riparte da 001
    const anno = new Date().getFullYear();
    expect(nuova()?.numero).toBe(`F-${anno}-${anno === 2026 ? '009' : '001'}`);
    // 1000 + CPA 40 + IVA 228.80 = 1268.80; meno la ritenuta di 200 = 1068.80
    await act(async () => result.current.studio.azioni.registraPagamento(id, 500, 'Bonifico'));
    expect(nuova()?.stato).toBe('in_attesa');
    await act(async () => result.current.studio.azioni.registraPagamento(id, 568.8, 'Bonifico'));
    expect(nuova()?.stato).toBe('pagata');
  });
});
