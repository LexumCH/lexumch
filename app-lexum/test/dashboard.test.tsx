import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { giorno, studioFinto } from '@/dati-finti/studio';
import { strumentiStudio } from '@/ruoli';
import { StatoProvider, useStato } from '@/stato/Stato';
import { StudioProvider, useStudio } from '@/stato/Studio';
import {
  calcolaPeriodo,
  dashboardAvvocato,
  dashboardStudio,
  momentoGiorno,
  urgenzaGiorni,
} from '@/studio/dashboard';

const giornoDi = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe('Dashboard: periodo, badge e saluto come sul sito', () => {
  const oggi = new Date(2026, 9, 4, 10, 30); // 4 ottobre 2026

  it('calcola i quattro periodi', () => {
    const mese = calcolaPeriodo('mese-corrente', undefined, undefined, oggi);
    expect(giornoDi(mese.inizio)).toBe('2026-10-1');
    expect(giornoDi(mese.fine)).toBe('2026-10-31');
    expect(mese.fine.getHours()).toBe(23);
    const scorso = calcolaPeriodo('mese-scorso', undefined, undefined, oggi);
    expect(giornoDi(scorso.inizio)).toBe('2026-9-1');
    expect(giornoDi(scorso.fine)).toBe('2026-9-30');
    const novanta = calcolaPeriodo('ultimi-90', undefined, undefined, oggi);
    expect(giornoDi(novanta.inizio)).toBe('2026-7-6');
    expect(giornoDi(novanta.fine)).toBe('2026-10-4');
    const scelto = calcolaPeriodo('personalizzato', new Date(2026, 0, 15), new Date(2026, 1, 3), oggi);
    expect(giornoDi(scelto.inizio)).toBe('2026-1-15');
    expect(giornoDi(scelto.fine)).toBe('2026-2-3');
    expect(scelto.inizio.getHours()).toBe(0);
  });

  it('badge dei giorni e saluto secondo l’ora', () => {
    expect(urgenzaGiorni(giorno(-3))).toEqual({ tipo: 'fa', giorni: 3, tono: 'pericolo' });
    expect(urgenzaGiorni(giorno(0, 18))).toEqual({ tipo: 'oggi', giorni: 0, tono: 'pericolo' });
    expect(urgenzaGiorni(giorno(2))).toMatchObject({ tipo: 'fra', giorni: 2, tono: 'oro' });
    expect(urgenzaGiorni(giorno(6))).toMatchObject({ tono: 'ok' });
    expect(urgenzaGiorni(giorno(12))).toMatchObject({ tono: 'neutro' });
    expect(momentoGiorno(new Date(2026, 9, 4, 5))).toBe('notte');
    expect(momentoGiorno(new Date(2026, 9, 4, 9))).toBe('mattino');
    expect(momentoGiorno(new Date(2026, 9, 4, 15))).toBe('pomeriggio');
    expect(momentoGiorno(new Date(2026, 9, 4, 21))).toBe('sera');
  });

  it('nel menù la Dashboard è il primo strumento di avvocati, commercialisti e fiduciari', () => {
    expect(strumentiStudio('avvocato')[0]).toBe('dashboard');
    expect(strumentiStudio('commercialista')).toEqual(['dashboard', 'calendario', 'fatture']);
    expect(strumentiStudio('fiduciario')).toEqual(['dashboard', 'calendario', 'fatture']);
    expect(strumentiStudio('progettista')).toEqual([]);
    expect(strumentiStudio('user')).toEqual([]);
  });
});

describe('Dashboard dell’avvocato', () => {
  it('agenda, fatture, messaggi e pratiche da seguire (dati finti IT)', () => {
    const d = dashboardAvvocato(studioFinto('IT', 'avvocato'), 'IT', calcolaPeriodo('ultimi-90'));
    expect(d.clienti).toBe(4);
    expect(d.praticheAperte).toBe(3);
    expect(d.praticheChiuse).toBe(1); // chiusa ieri
    expect(d.oggi.map((a) => a.id)).toEqual(['a1']);
    expect(d.sommario).toEqual({ udienze: 0, termini: 0, appuntamenti: 1 });
    // domani, dopodomani e fra 3 e 5 giorni; l'udienza fra 12 giorni resta fuori
    expect(d.settimana.map((a) => a.id)).toEqual(['a3', 'a2', 'a6', 'a4', 'a7']);
    expect(d.scadute.map((f) => f.numero)).toEqual(['F-2026-006']);
    expect(d.inScadenza).toEqual([]); // F-2026-008 scade fra 5 giorni: oltre i 3
    expect(d.fattureInAttesa).toBe(1);
    // il residuo di F-2026-008 (netto 2.084,59 €) e di F-2026-006 (456,77 €), come la pagina Fatture
    expect(d.daIncassare).toBeCloseTo(2541.36, 2);
    // ultima parola al cliente in «Verbali delle assemblee»; il ticket chiuso non conta
    expect(d.messaggi.map((t) => t.id)).toEqual(['tk1']);
    // udienza Edilnord fra 3 giorni, poi Ferrari fra 12
    expect(d.attenzione.map((x) => x.pratica.id)).toEqual(['p3', 'p1']);
  });

  it('il periodo conta le pratiche chiuse e l’incassato delle fatture emesse in quei giorni', () => {
    const dati = studioFinto('IT', 'avvocato');
    const ieri = calcolaPeriodo('personalizzato', new Date(giorno(-1)), new Date(giorno(-1)));
    const lontano = calcolaPeriodo('personalizzato', new Date(giorno(-400)), new Date(giorno(-300)));
    expect(dashboardAvvocato(dati, 'IT', ieri).praticheChiuse).toBe(1);
    expect(dashboardAvvocato(dati, 'IT', lontano).praticheChiuse).toBe(0);
    // F-2026-007 è emessa 40 giorni fa e pagata (761,28 €)
    const conLaPagata = calcolaPeriodo('personalizzato', new Date(giorno(-41)), new Date(giorno(-39)));
    expect(dashboardAvvocato(dati, 'IT', conLaPagata).incassato).toBeCloseTo(761.28, 2);
    expect(dashboardAvvocato(dati, 'IT', ieri).incassato).toBe(0);
    // «da incassare» non dipende dal periodo
    expect(dashboardAvvocato(dati, 'IT', lontano).daIncassare).toBeCloseTo(2541.36, 2);
  });

  it('gli appuntamenti annullati non compaiono; chiudere una pratica la conta nel periodo', async () => {
    const avvolgi = ({ children }: { children: ReactNode }) => (
      <StatoProvider>
        <StudioProvider>{children}</StudioProvider>
      </StatoProvider>
    );
    const { result } = await renderHook(() => ({ stato: useStato(), studio: useStudio() }), {
      wrapper: avvolgi,
    });
    await act(async () => result.current.stato.azioni.scenario('avvocato-it'));
    await act(async () => {
      result.current.studio.azioni.statoAppuntamento('a1', 'annullato');
      result.current.studio.azioni.chiudiPratica('p2', 'Transatta');
    });
    const oggi = calcolaPeriodo('personalizzato', new Date(), new Date());
    const d = dashboardAvvocato(result.current.studio, 'IT', oggi);
    expect(d.oggi).toEqual([]);
    expect(d.praticheAperte).toBe(2);
    expect(d.praticheChiuse).toBe(1);
    await act(async () => result.current.studio.azioni.riapriPratica('p2'));
    expect(dashboardAvvocato(result.current.studio, 'IT', oggi).praticheChiuse).toBe(0);
  });
});

describe('Dashboard di commercialisti e fiduciari', () => {
  it('commercialista (IT): mandati, scadenze fiscali anche scadute, fatture aperte', () => {
    const d = dashboardStudio(studioFinto('IT', 'commercialista'), 'IT');
    expect(d.clienti).toBe(2);
    expect(d.mandatiAttivi).toBe(2);
    // in Italia le prime 8 scadenze aperte, anche quelle già passate; quella chiusa no
    expect(d.prossimeScadenze.map((s) => s.id)).toEqual(['sc1', 'sc2', 'sc3', 'sc4']);
    expect(d.scadenzeScadute).toEqual([]);
    expect(d.fattureScadute).toBe(1);
    // F-2026-012 netto 961,92 € (con la ritenuta) e F-2026-011 317,20 €
    expect(d.daIncassare).toBeCloseTo(1279.12, 2);
    expect(d.scaduto).toBeCloseTo(317.2, 2);
    expect(d.mesi).toHaveLength(6);
    expect(d.mesi[5].mese).toBe(new Date().getMonth());
    // solo appuntamenti programmati dei prossimi 7 giorni
    expect(d.appuntamenti.map((a) => a.id)).toEqual(['a2', 'a1']);
  });

  it('fiduciario (CH): scadute a parte, appuntamenti senza le scadenze, conto economico per cliente', () => {
    const d = dashboardStudio(studioFinto('CH', 'fiduciario'), 'CH');
    expect(d.mandatiAttivi).toBe(2);
    expect(d.scadenzeScadute.map((s) => s.id)).toEqual(['sc1']);
    expect(d.prossimeScadenze.map((s) => s.id)).toEqual(['sc2', 'sc3']);
    expect(d.appuntamenti.map((a) => a.id)).toEqual(['a2']);
    // ogni cliente a sé, il saldo più basso in alto
    expect(d.conti.map((c) => [c.clienteId, c.saldo])).toEqual([
      ['c2', -23800],
      ['c1', 35600],
    ]);
    expect(d.fatturato).toBe(0);
  });
});
