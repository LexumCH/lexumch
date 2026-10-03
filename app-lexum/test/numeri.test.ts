import { breve, migliaia, milioni, numeri } from '@/paesi/numeri';
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

  it('accorcia per le righe strette', () => {
    expect(breve(3_200_000)).toBe('3,2 mln');
    expect(breve(177_000)).toBe('177 mila');
  });

  it('i testi dei paesi usano i numeri del file unico', () => {
    expect(contenuti.IT.totaleDocumenti).toBe(`Oltre ${milioni(numeri.IT.totale)} di documenti`);
    expect(contenuti.CH.benvenuto.sottotitolo).toContain(milioni(numeri.CH.totale));
  });
});
