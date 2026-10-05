import { readFileSync } from 'fs';
import { join } from 'path';

import { domandePer, domandeFrequenti } from '@/testi/domande';
import { testiEliminaAccount } from '@/testi/elimina-account';

// I testi dell'app devono restare uguali a quelli approvati in docs/testi/.
const fonte = readFileSync(join(__dirname, '../docs/testi/domande-e-benvenuto.md'), 'utf8');

describe('testi approvati', () => {
  it('ci sono 8 domande frequenti per paese e lingua', () => {
    expect(domandeFrequenti.IT.it).toHaveLength(8);
    for (const lingua of ['it', 'de', 'fr']) expect(domandeFrequenti.CH[lingua]).toHaveLength(8);
  });

  it('ogni domanda e ogni paragrafo sono identici al documento', () => {
    for (const perLingua of Object.values(domandeFrequenti)) {
      for (const voci of Object.values(perLingua)) {
        for (const v of voci) {
          expect(fonte).toContain(`**${v.domanda}**`);
          for (const p of v.risposta) expect(fonte).toContain(p);
        }
      }
    }
  });

  it('i testi di «Elimina account» sono identici al documento', () => {
    for (const perLingua of Object.values(testiEliminaAccount)) {
      for (const t of Object.values(perLingua)) {
        for (const valore of Object.values(t)) expect(fonte).toContain(valore);
      }
    }
  });

  it('in Svizzera le domande parlano di lexum.ch, in Italia di lexum.it', () => {
    const sito = (paese: string) => domandePer(paese, 'it').find((d) => d.domanda.includes('sito'))!;
    expect(sito('IT').risposta.join(' ')).toContain('lexum.it');
    expect(sito('CH').risposta.join(' ')).toContain('lexum.ch');
  });
});
