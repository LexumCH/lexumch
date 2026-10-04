import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { studioFinto } from '@/dati-finti/studio';
import { bolloDovuto, totaliConNote, totaliFattura } from '@/studio/calcoli';
import {
  cfValido,
  eQrIban,
  ibanValido,
  leggiImporto,
  mancanoAlCliente,
  mancanoAlProfessionista,
  ibanSvizzero,
  numeroIvaValido,
  pivaValida,
  sdiValido,
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
  it('controlla partita IVA, codice fiscale, IBAN, QR-IBAN, numero IDI e codice SDI', () => {
    expect(pivaValida('01234567897')).toBe(true);
    expect(pivaValida('01234567890')).toBe(false);
    expect(cfValido('RSSGLI85M41F205Z')).toBe(true);
    expect(cfValido('RSSGLI85')).toBe(false);
    expect(ibanValido('IT60X0542811101000000123456')).toBe(true);
    expect(ibanValido('IT60X0542811101000000123457')).toBe(false);
    expect(ibanValido('CH93 0076 2011 6238 5295 7')).toBe(true);
    // come i siti dal 04-10-2026: un IBAN di qualunque paese, con il modulo 97
    expect(ibanValido('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(ibanSvizzero('CH93 0076 2011 6238 5295 7')).toBe(true);
    expect(ibanSvizzero('IT60X0542811101000000123456')).toBe(false);
    expect(eQrIban('CH44 3199 9123 0008 8901 2')).toBe(true);
    expect(eQrIban('CH93 0076 2011 6238 5295 7')).toBe(false);
    // numero IDI con la cifra di controllo (modulo 11), con o senza IVA/MWST/TVA
    expect(numeroIvaValido('CHE-216.874.394 IVA')).toBe(true);
    expect(numeroIvaValido('CHE-216.874.394 MWST')).toBe(true);
    expect(numeroIvaValido('CHE-123.456.789 IVA')).toBe(false);
    expect(numeroIvaValido('IT01234567897')).toBe(false);
    expect(sdiValido('M5UXCR1', false)).toBe(true);
    expect(sdiValido('UFABC1', false)).toBe(false);
  });

  it('dice cosa manca al professionista e al cliente', () => {
    expect(mancanoAlProfessionista({ paese: 'IT' }, 'IT')).toEqual([
      'partita IVA',
      'codice fiscale',
      'indirizzo dello studio',
    ]);
    expect(mancanoAlProfessionista(studioFinto('IT', 'avvocato').fatturazione, 'IT')).toEqual([]);
    expect(mancanoAlProfessionista({ paese: 'CH' }, 'CH')).toEqual([
      'indirizzo dello studio',
      'IBAN per la QR-fattura',
    ]);
    // con l'IVA serve anche il numero IDI; un QR-IBAN basta per la QR-fattura
    expect(
      mancanoAlProfessionista(
        {
          via: 'Via Nassa',
          cap: '6900',
          citta: 'Lugano',
          qrIban: 'CH44 3199 9123 0008 8901 2',
          assoggettatoIva: true,
        },
        'CH',
      ),
    ).toEqual(['numero IDI']);
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

describe('fatture italiane dal 04-10-2026: spese esenti, bollo, note di credito', () => {
  const riga = (prezzo: number, natura?: 'N1') => ({
    id: `r${prezzo}`,
    descrizione: 'x',
    quantita: 1,
    prezzo,
    natura,
  });

  it('spese anticipate (N1) fuori da cassa, IVA e ritenuta; bollo a carico del cliente nel totale', () => {
    const t = totaliFattura(
      { righe: [riga(1000), riga(100, 'N1')], cpa: 4, iva: 22, ritenuta: 20, bollo: true, pagamenti: [] },
      'IT',
    );
    // 1000 + cassa 40 + IVA 228,80 + esenti 100 + bollo 2 = 1370,80; meno ritenuta 200 = 1170,80
    expect(t).toMatchObject({ imponibile: 1000, esenti: 100, cpa: 40, iva: 228.8, bollo: 2, totale: 1370.8 });
    expect(t.netto).toBe(1170.8);
    const aCaricoStudio = totaliFattura(
      { righe: [riga(1000)], cpa: 4, iva: 0, bollo: true, bolloACaricoCliente: false, pagamenti: [] },
      'IT',
    );
    expect(aCaricoStudio.bollo).toBe(0);
  });

  it('bollo dovuto quando la parte senza IVA supera 77,47 €', () => {
    const forfettario = totaliFattura({ righe: [riga(70)], cpa: 4, iva: 0, pagamenti: [] }, 'IT');
    expect(bolloDovuto(forfettario, 0)).toBe(false); // 70 + 2,80 di cassa
    expect(bolloDovuto(totaliFattura({ righe: [riga(80)], cpa: 0, iva: 0, pagamenti: [] }, 'IT'), 0)).toBe(
      true,
    );
    // con l'IVA conta solo la parte esente
    expect(
      bolloDovuto(totaliFattura({ righe: [riga(1000), riga(50, 'N1')], iva: 22, pagamenti: [] }, 'IT'), 22),
    ).toBe(false);
  });

  const avvolgi = ({ children }: { children: ReactNode }) => (
    <StatoProvider>
      <StudioProvider>{children}</StudioProvider>
    </StatoProvider>
  );

  it('nota di credito: parziale riduce il dovuto, totale annulla la fattura', async () => {
    const { result } = await renderHook(() => ({ stato: useStato(), studio: useStudio() }), {
      wrapper: avvolgi,
    });
    await act(async () => result.current.stato.azioni.scenario('avvocato-it'));
    const studio = () => result.current.studio;
    // f1 (Edilnord): emessa, netto 2084,59
    let nc = '';
    await act(async () => {
      nc = studio().azioni.creaFattura({
        clienteId: 'c3',
        emessa: new Date().toISOString(),
        righe: [{ id: 'n1', descrizione: 'Storno parziale', quantita: 1, prezzo: 254.4 }],
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
        tipo: 'TD04',
        origineId: 'f1',
      });
    });
    const f1 = () => studio().fatture.find((f) => f.id === 'f1')!;
    const nota = studio().fatture.find((f) => f.id === nc)!;
    expect(nota.stato).toBe('emessa');
    const t = totaliConNote(f1(), studio().fatture, 'IT');
    // nota: 254,40 + 10,18 + 58,21 − 50,88 = 271,91
    expect(t.stornato).toBe(271.91);
    expect(t.daIncassare).toBe(1812.68);
    expect(f1().stato).toBe('in_attesa');
    // il resto, con una seconda nota: la fattura risulta annullata
    await act(async () => {
      studio().azioni.creaFattura({
        clienteId: 'c3',
        emessa: new Date().toISOString(),
        righe: f1().righe.filter((r) => r.prezzo !== 254.4),
        cpa: 4,
        iva: 22,
        ritenuta: 20,
        metodo: 'Bonifico',
        tipo: 'TD04',
        origineId: 'f1',
      });
    });
    expect(f1().stato).toBe('annullata');
    // una fattura emessa non si elimina; una non emessa sì
    let esito = '';
    await act(async () => {
      esito = studio().azioni.eliminaFattura('f1');
    });
    expect(esito).toBe('emessa');
    await act(async () => {
      esito = studio().azioni.eliminaFattura('f3');
    });
    expect(esito).toBe('ok');
    expect(studio().fatture.some((f) => f.id === 'f3')).toBe(false);
  });

  it('Svizzera: chi non è iscritto nel registro IVA fattura senza IVA', async () => {
    const { result } = await renderHook(() => ({ stato: useStato(), studio: useStudio() }), {
      wrapper: avvolgi,
    });
    await act(async () => result.current.stato.azioni.scenario('fiduciario-ch'));
    let id = '';
    await act(async () => {
      id = result.current.studio.azioni.creaFattura({
        clienteId: 'c1',
        emessa: new Date().toISOString(),
        righe: [{ id: 'r1', descrizione: 'Consulenza', quantita: 1, prezzo: 500 }],
        iva: 8.1,
        periodo: 'Settembre 2026',
        metodo: 'QR-fattura',
      });
    });
    expect(result.current.studio.fatture.find((f) => f.id === id)).toMatchObject({
      esenteIva: true,
      iva: 0,
      motivoEsenzione: 'non_assoggettato',
    });
  });
});
