import { migliaia, milioni, numeri } from '@/paesi/numeri';
import { contenuti } from '@/paesi/contenuti';

describe('numeri delle fonti', () => {
  it('formatta le migliaia con il punto', () => {
    expect(migliaia(66400)).toBe('66.400');
    expect(migliaia(229)).toBe('229');
    expect(migliaia(3200000)).toBe('3.200.000');
  });

  it('scrive i milioni con la virgola', () => {
    expect(milioni(4_200_000)).toBe('4,2 milioni');
    expect(milioni(1_800_000)).toBe('1,8 milioni');
    expect(milioni(795_000)).toBe('795.000');
  });

  it("nei testi c'è solo il totale, mai i numeri delle singole fonti", () => {
    for (const paese of ['IT', 'CH']) {
      const c = contenuti[paese];
      const testi = [
        ...c.elencoFonti.flat(),
        ...c.fontiBenvenuto.map((f) => `${f.descrizione} ${f.valore ?? ''}`),
        ...Object.values(c.fonti).map((f) => f.descrizione),
      ];
      for (const t of testi) {
        expect(t).not.toMatch(/\d[.’']\d{3}|\bmln\b|\bmila\b|milion/);
        expect(t).not.toMatch(/\d+\s+(codici|atti|articoli|decisioni|documenti|sentenze|massime)\b/);
      }
    }
  });

  it('i testi dei paesi usano i numeri del file unico', () => {
    expect(contenuti.IT.totaleDocumenti).toBe(`Oltre ${milioni(numeri.IT.totale)} di documenti`);
    expect(contenuti.CH.benvenuto.sottotitolo).toContain(milioni(numeri.CH.totale));
  });
});
