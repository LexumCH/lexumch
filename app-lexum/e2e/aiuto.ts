import { expect, type Page } from '@playwright/test';

// Piccoli aiuti per toccare e controllare solo quello che si vede
// (le schermate sotto restano montate nella pila di navigazione).

export function testo(p: Page, t: string | RegExp, exact = false) {
  return p.getByText(t, { exact }).filter({ visible: true }).first();
}

export function etichetta(p: Page, t: string) {
  return p.getByLabel(t, { exact: true }).filter({ visible: true }).first();
}

export async function tocca(p: Page, t: string | RegExp, exact = false) {
  await testo(p, t, exact).click();
}

export async function vedo(p: Page, t: string | RegExp, exact = false) {
  await expect(testo(p, t, exact)).toBeVisible();
}

// Raccoglie gli errori della console: alla fine di ogni prova devono essere zero.
export function erroriConsole(p: Page): string[] {
  const errori: string[] = [];
  p.on('console', (m) => {
    if (m.type() === 'error') errori.push(m.text());
  });
  p.on('pageerror', (e) => errori.push(e.message));
  return errori;
}

// Fa una domanda a Lex toccando il primo esempio e aspetta la risposta.
export async function domandaALex(p: Page, esempio: string) {
  await tocca(p, esempio);
  await vedo(p, 'Lex sta consultando le fonti');
  await expect(testo(p, 'Lex sta consultando le fonti')).toBeHidden({ timeout: 15_000 });
}
