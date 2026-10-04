import { traduci } from '@/lingue';
import { de } from '@/lingue/de';
import { fr } from '@/lingue/fr';
import { it as italiano } from '@/lingue/it';
import { contenutiIn } from '@/paesi/contenuti';

// Tutte le chiavi con il loro testo: «avvio.accesso.titolo» → «Bentornato».
function foglie(o: unknown, prefisso = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (typeof v === 'string') out[prefisso + k] = v;
    else Object.assign(out, foglie(v, `${prefisso}${k}.`));
  }
  return out;
}
const segnaposto = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('lingue dell’app', () => {
  const base = foglie(italiano);

  it.each([
    ['de', de],
    ['fr', fr],
  ])('%s: tutte le chiavi tradotte, con gli stessi segnaposto', (_nome, lingua) => {
    const tradotte = foglie(lingua);
    for (const chiave of Object.keys(base)) {
      expect({ chiave, presente: chiave in tradotte }).toEqual({ chiave, presente: true });
      expect({ chiave, segnaposto: segnaposto(tradotte[chiave]) }).toEqual({
        chiave,
        segnaposto: segnaposto(base[chiave]),
      });
    }
  });

  it('il tedesco è svizzero: niente «ß»', () => {
    for (const testo of Object.values(foglie(de))) expect(testo).not.toMatch(/ß/);
    const c = contenutiIn('CH', 'de');
    expect(JSON.stringify(c)).not.toMatch(/ß/);
  });

  it('riempie i segnaposto e, se manca una traduzione, usa l’italiano', () => {
    expect(traduci('de', 'avvio.accesso.testo', { sito: 'lexum.ch' })).toBe(
      'Melden Sie sich mit der E-Mail und dem Passwort an, die Sie auf lexum.ch verwenden.',
    );
    expect(traduci('fr', 'errori.minimoCaratteri', { n: 8 })).toBe('8 caractères minimum');
    expect(traduci('it', 'paesi.CH')).toBe('Svizzera');
  });

  it('benvenuto svizzero nelle tre lingue (testi approvati)', () => {
    expect(contenutiIn('CH', 'de').benvenuto.titoloOro).toBe('das gesamte Schweizer Recht');
    expect(contenutiIn('CH', 'de').benvenuto.titoloDopo).toBe(' durchdenkt.');
    expect(contenutiIn('CH', 'fr').totaleDocumenti).toBe('Plus de 1,8 million de documents');
    expect(contenutiIn('CH', 'de').totaleDocumenti).toBe('Über 1,8 Millionen Dokumente');
    // quello che non è tradotto resta in italiano
    expect(contenutiIn('CH', 'de').aggettivo).toBe('svizzero');
    expect(contenutiIn('IT', 'de').esempi).toEqual(contenutiIn('IT', 'it').esempi);
    expect(contenutiIn('IT', 'it').benvenuto.titoloDopo).toBeUndefined();
  });
});
