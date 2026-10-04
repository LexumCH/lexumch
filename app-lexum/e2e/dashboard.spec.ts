import { expect, test } from '@playwright/test';

import { erroriConsole, etichetta, testo, tocca, vedo } from './aiuto';

// La Dashboard dei professionisti, come sui siti: avvocato (IT e CH), commercialista (IT) e
// fiduciario (CH), con i dati finti. Si parte dall'elenco delle schermate, che prepara il ruolo.

let errori: string[] = [];

test.beforeEach(async ({ page }) => {
  errori = erroriConsole(page);
  await page.setViewportSize({ width: 1280, height: 900 });
});

test.afterEach(() => {
  expect(errori, 'errori nella console').toEqual([]);
});

test('avvocato: dal menù alla Dashboard, poi una fattura scaduta e una pratica', async ({ page }) => {
  await page.goto('/');
  await tocca(page, 'S10 · Clienti (avvocato IT)');
  await etichetta(page, 'Apri il menù').click();
  await tocca(page, 'Dashboard', true);
  await vedo(page, /^(Buonanotte|Buongiorno|Buon pomeriggio|Buonasera), Giulia\.$/);
  await vedo(page, 'Oggi hai 1 appuntamento. 1 fattura in attesa. 1 messaggio nuovo.');
  await vedo(page, 'Telefonata con Lucia Bianchi');
  await vedo(page, '2.541,36 €');
  await tocca(page, 'Fattura F-2026-006');
  await vedo(page, 'Lucia Bianchi');
  await page.goBack();
  await tocca(page, 'Edilnord: recupero crediti');
  await vedo(page, 'Opposizione a decreto ingiuntivo');
  await page.goBack();
  await tocca(page, 'Verbali delle assemblee');
  await vedo(page, 'Li cerco e li carico nel portale entro venerdì.');
});

test('avvocato: il periodo cambia pratiche chiuse e incassato, con le date controllate', async ({ page }) => {
  await page.goto('/');
  await tocca(page, 'S0 · Dashboard (avvocato IT)');
  await page
    .getByRole('button', { name: /^Periodo: / })
    .filter({ visible: true })
    .click();
  await page.getByRole('radio', { name: 'Personalizzato' }).filter({ visible: true }).click();
  await etichetta(page, 'Da').fill('10.10.2026');
  await etichetta(page, 'A').fill('01.10.2026');
  await vedo(page, 'La data d’inizio deve venire prima di quella di fine.');
  await expect(page.getByRole('button', { name: 'Applica' }).filter({ visible: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Ultimi 90 giorni' }).filter({ visible: true }).click();
  await expect(
    page.getByRole('button', { name: 'Periodo: Ultimi 90 giorni' }).filter({ visible: true }),
  ).toBeVisible();
  // la fattura F-2026-007, pagata, è stata emessa 40 giorni fa
  await vedo(page, '761,28 €');
});

test('avvocato con la prova gratuita scaduta: l’avviso si chiude con «Dopo»', async ({ page }) => {
  await page.goto('/');
  await tocca(page, 'S0 · Dashboard: prova gratuita scaduta');
  await vedo(page, 'La tua prova gratuita è scaduta');
  await vedo(page, 'Vedi i piani', true);
  await tocca(page, 'Dopo', true);
  await expect(testo(page, 'La tua prova gratuita è scaduta')).toBeHidden();
});

test('commercialista: mandati e scadenze fiscali, fattura scaduta che porta alle Fatture', async ({
  page,
}) => {
  await page.goto('/');
  await tocca(page, 'S0 · Dashboard del commercialista');
  await vedo(page, 'Il quadro del tuo studio');
  await vedo(page, 'Mandati attivi');
  await vedo(page, 'F24 IVA mensile · IVA');
  await vedo(page, /scaduta da 2 gg/);
  await vedo(page, 'Studio: fatturazione ultimi 6 mesi');
  await tocca(page, '1 fattura scaduta da incassare');
  await vedo(page, 'F-2026-011');
});

test.describe('fiduciario svizzero con il telefono in tedesco', () => {
  test.use({ locale: 'de-CH' });

  test('Gesamtübersicht, Fristen und Erfolgsrechnung pro Kunde', async ({ page }) => {
    await page.goto('/');
    await tocca(page, 'S0 · Dashboard del fiduciario');
    await vedo(page, 'Gesamtübersicht, Giulia');
    await vedo(page, '1 überfällige Frist');
    await vedo(page, 'Nächste Fristen');
    await vedo(page, `Erfolgsrechnung pro Kunde ${new Date().getFullYear()}`);
    await vedo(page, "Saldo CHF -23'800.00".replace("'", '’'));
    await etichetta(page, 'Menü öffnen').click();
    await vedo(page, 'Dashboard', true);
    await vedo(page, 'Kalender', true);
  });
});
