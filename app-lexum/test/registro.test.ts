import { contenuti, professioni } from '@/paesi/contenuti';
import { dominio, paesePredefinito, paesi, trovaPaese } from '@/paesi/registro';

describe('registro dei paesi', () => {
  it('legge Italia e Svizzera da docs/paesi.json', () => {
    expect(paesi.map((p) => p.codice)).toEqual(['IT', 'CH']);
    expect(paesePredefinito).toBe('IT');
    expect(dominio(trovaPaese('CH'))).toBe('lexum.ch');
  });

  it('contiene solo chiavi pubbliche', () => {
    for (const p of paesi) expect(p.chiavePubblica.startsWith('sb_publishable_')).toBe(true);
  });

  it('ogni paese del registro ha i suoi testi, le sue fonti e le sue professioni', () => {
    for (const p of paesi) {
      const testi = contenuti[p.codice];
      expect(testi).toBeDefined();
      for (const fonte of p.fontiBancaDati) expect(testi.fonti[fonte]).toBeDefined();
      for (const prof of p.professioni) expect(professioni[prof]).toBeDefined();
    }
  });

  it('un paese che non esiste dà errore', () => {
    expect(() => trovaPaese('FR')).toThrow();
  });
});
