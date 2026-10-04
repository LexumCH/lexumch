import { expect, test, type Page } from '@playwright/test';

import { erroriConsole, etichetta, tocca, vedo } from './aiuto';

// Lo Studio dei professionisti: pratiche, calendario e fatture (Italia e Svizzera), con i dati finti.
// Si parte dall'elenco delle schermate, che prepara il ruolo giusto (avvocato, commercialista…).

let errori: string[] = [];

test.beforeEach(async ({ page }) => {
  errori = erroriConsole(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
});

test.afterEach(() => {
  expect(errori, 'errori nella console').toEqual([]);
});

const avanti = (p: Page) =>
  p.getByRole('button', { name: 'Avanti', exact: true }).filter({ visible: true }).first();

test('avvocato: nuova pratica, poi si chiude con l’esito', async ({ page }) => {
  await tocca(page, 'S3 · Nuova pratica');
  await etichetta(page, 'Titolo della pratica').fill('Verdi c. Assicurazioni Alfa');
  await tocca(page, 'Marco Ferrari', true);
  await tocca(page, 'Civile', true);
  await tocca(page, 'Crea la pratica', true);
  await vedo(page, 'Verdi c. Assicurazioni Alfa');
  await etichetta(page, 'Altre azioni').click();
  await tocca(page, 'Chiudi la pratica', true);
  await tocca(page, 'Transatta', true);
  await tocca(page, 'Conferma la chiusura', true);
  await etichetta(page, 'Altre azioni').click();
  await vedo(page, 'Riapri la pratica', true);
});

test('calendario: nuovo appuntamento con il cliente', async ({ page }) => {
  await tocca(page, 'S4 · Calendario: agenda');
  await etichetta(page, 'Nuovo appuntamento').click();
  await etichetta(page, 'Titolo').fill('Firma del mandato');
  await tocca(page, 'Domani', true);
  await tocca(page, 'Lucia Bianchi', true);
  await tocca(page, 'Aggiungi al calendario', true);
  await vedo(page, 'Firma del mandato');
});

test('fattura italiana con il calcolatore della parcella, poi il pagamento', async ({ page }) => {
  await tocca(page, 'S5 · Fatture e scadenzario (IT)');
  await etichetta(page, 'Nuova fattura').click();
  await vedo(page, 'Passo 1 di 4 · Cliente');
  await tocca(page, 'Edilnord S.r.l.', true);
  await avanti(page).click();
  await tocca(page, 'Calcola parcella', true);
  await vedo(page, 'Tribunale — giudizi ordinari di cognizione');
  // quattro fasi al valore medio, scaglione da 5.201 a 26.000 €: 5.077 € + 15% di spese generali
  await vedo(page, '7.407,95 €');
  await tocca(page, 'Usa nella fattura', true);
  await vedo(page, 'Passo 2 di 4 · Prestazioni');
  await vedo(page, '5.838,55 €');
  await avanti(page).click();
  // cliente società: la ritenuta d'acconto è già accesa
  await expect(page.getByRole('switch', { name: /Ritenuta d'acconto 20%/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await avanti(page).click();
  await vedo(page, 'Netto a pagare');
  await vedo(page, '6.240,24 €');
  await tocca(page, 'Crea la fattura', true);
  await vedo(page, 'Da incassare');
  await vedo(page, /^F-\d{4}-\d{3}$/);
  await tocca(page, 'Registra pagamento', true);
  await tocca(page, 'Registra il pagamento', true);
  await vedo(page, 'Pagata', true);
});

test('fattura svizzera: esente IVA con il motivo e il periodo della prestazione', async ({ page }) => {
  await tocca(page, 'S7 · Nuova fattura (CH)');
  await tocca(page, 'Laura Keller', true);
  await avanti(page).click();
  await etichetta(page, 'Descrizione').fill('Consulenza');
  await etichetta(page, 'Quantità').fill('2');
  await etichetta(page, 'Prezzo (CHF)').fill('250');
  await tocca(page, 'Aggiungi la prestazione', true);
  await vedo(page, 'CHF 500.00');
  await avanti(page).click();
  await page.getByRole('radio', { name: 'Esente' }).filter({ visible: true }).first().click();
  await vedo(page, /Non assoggettato all’IVA/);
  await vedo(page, 'Scrivi la data o il periodo della prestazione.');
  await etichetta(page, 'Data o periodo della prestazione').fill('Settembre 2026');
  await avanti(page).click();
  await vedo(page, 'Esente', true);
  await tocca(page, 'Crea la fattura', true);
  await vedo(page, 'Da incassare');
  await vedo(page, 'CHF 500.00');
});

test('senza dati di fatturazione la fattura non parte; completati, sì', async ({ page }) => {
  await tocca(page, 'S7 · Nuova fattura: mancano i tuoi dati');
  await vedo(page, 'Prima servono i tuoi dati di fatturazione');
  await tocca(page, 'Completa i dati di fatturazione', true);
  await etichetta(page, 'Partita IVA').fill('12345678901');
  await vedo(page, 'La partita IVA ha 11 cifre: controlla.');
  await expect(
    page.getByRole('button', { name: 'Salva', exact: true }).filter({ visible: true }),
  ).toBeDisabled();
  await etichetta(page, 'Partita IVA').fill('01234567897');
  await etichetta(page, 'Codice fiscale').fill('rssgli85m41f205z');
  await etichetta(page, 'Via').fill('Via Roma');
  await etichetta(page, 'Numero').fill('1');
  await etichetta(page, 'CAP').fill('25121');
  await etichetta(page, 'Comune').fill('Brescia');
  await etichetta(page, 'Provincia').fill('bs');
  await tocca(page, 'Salva', true);
  await vedo(page, 'Passo 1 di 4 · Cliente');
});
