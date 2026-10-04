import { expect, test } from '@playwright/test';

import { erroriConsole, etichetta, tocca, vedo } from './aiuto';

// Un telefono svizzero in tedesco o in francese: la scelta del paese propone la Svizzera e tutto
// l'avvio è nella lingua del telefono (testi approvati del benvenuto svizzero).

let errori: string[] = [];
test.beforeEach(async ({ page }) => {
  errori = erroriConsole(page);
});
test.afterEach(() => {
  expect(errori, 'errori nella console').toEqual([]);
});

test.describe('telefono in tedesco, in Svizzera', () => {
  test.use({ locale: 'de-CH' });

  test('scelta del paese, benvenuto e accesso in tedesco', async ({ page }) => {
    await page.goto('/');
    await vedo(page, 'Land wählen');
    await vedo(page, 'Wir schlagen die Schweiz vor, weil sie auf Ihrem Telefon eingestellt ist.');
    await expect(page.getByRole('radio', { name: /Schweiz/ })).toHaveAttribute('aria-checked', 'true');
    await tocca(page, 'Weiter', true);
    await vedo(page, 'das gesamte Schweizer Recht');
    await tocca(page, 'Anmelden', true);
    await vedo(page, 'Willkommen zurück');
    await etichetta(page, 'Passwort').fill('x');
    await etichetta(page, 'E-Mail').fill('');
    await tocca(page, 'Anmelden', true);
    await vedo(page, 'E-Mail oder Passwort nicht korrekt');
  });
});

test.describe('avvocato svizzero con il telefono in tedesco', () => {
  test.use({ locale: 'de-CH' });

  test('menù, Profilo e Fatture in tedesco', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await tocca(page, 'S5 · Fatture (CH)');
    await vedo(page, 'Rechnungen', true);
    await vedo(
      page,
      'Im Jahr 2026 ausgestellte Rechnungen'.replace('2026', String(new Date().getFullYear())),
    );
    await etichetta(page, 'Menü öffnen').click();
    await vedo(page, 'Datenbank', true);
    await vedo(page, 'Dossiers', true);
    await tocca(page, 'Profil', true);
    await vedo(page, 'Credits hinzufügen', true);
  });
});

test.describe('telefono in francese, in Svizzera', () => {
  test.use({ locale: 'fr-CH' });

  test('scelta del paese e fonti in francese', async ({ page }) => {
    await page.goto('/');
    await vedo(page, 'Choisissez le pays');
    await tocca(page, 'Continuer', true);
    await vedo(page, 'tout le droit suisse.');
    await tocca(page, 'Commencer', true);
    await vedo(page, 'sa source.');
    await vedo(page, 'Fedlex : codes, lois et ordonnances');
  });
});
