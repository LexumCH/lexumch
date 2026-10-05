import { expect, test, type Page } from '@playwright/test';

import { erroriConsole, etichetta, testo, tocca, vedo } from './aiuto';

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
  // le tre aliquote svizzere e «Esente»; il motivo è facoltativo, con due suggerimenti
  await vedo(page, 'Normale 8,1%, ridotta 2,6%, alloggio 3,8%.');
  await tocca(page, 'Esente', true);
  await tocca(page, 'Prestazione a un cliente all’estero (art. 8 LIVA)', true);
  await expect(etichetta(page, "Motivo dell'esenzione (facoltativo, va in fattura)")).toHaveValue(
    'Prestazione a un cliente all’estero (art. 8 LIVA)',
  );
  await page.getByRole('radio', { name: 'Deutsch' }).click();
  await vedo(page, 'Scrivi la data o il periodo della prestazione.');
  await etichetta(page, 'Data o periodo della prestazione').fill('Settembre 2026');
  await avanti(page).click();
  await vedo(page, 'Esente', true);
  await vedo(page, 'Deutsch', true);
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
  await etichetta(page, 'Codice destinatario SDI').fill('ABC');
  await vedo(page, 'Il codice SDI ha 7 caratteri, lettere e numeri.');
  await etichetta(page, 'Codice destinatario SDI').fill('');
  // il commercialista ha di base la CNPADC
  await expect(
    page.getByRole('button', { name: 'CNPADC, dottori commercialisti (4%)' }).filter({ visible: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await tocca(page, 'Salva', true);
  await vedo(page, 'Passo 1 di 4 · Cliente');
});

test('nota di credito di una fattura italiana emessa', async ({ page }) => {
  await tocca(page, 'S6 · Fattura: dettaglio (IT)');
  await etichetta(page, 'Altre azioni').click();
  await tocca(page, 'Storna la fattura, tutta o in parte');
  await vedo(page, 'Passo 2 di 4 · Prestazioni');
  await vedo(page, /Per uno storno totale lascia le righe come sono/);
  await page.getByRole('button', { name: 'Avanti', exact: true }).filter({ visible: true }).first().click();
  await vedo(page, 'La nota di credito ripete IVA, cassa e ritenuta della fattura F-2026-008.');
  await page.getByRole('button', { name: 'Avanti', exact: true }).filter({ visible: true }).first().click();
  await tocca(page, 'Crea la nota di credito', true);
  await vedo(page, 'A storno della fattura F-2026-008');
  await tocca(page, 'A storno della fattura F-2026-008');
  await vedo(page, 'Annullata', true);
  await vedo(page, 'Note di credito', true);
});

test('fattura italiana non ancora emessa: si elimina; XML FatturaPA pronto', async ({ page }) => {
  await tocca(page, 'S5 · Fatture e scadenzario (IT)');
  await tocca(page, 'F-2026-006');
  await etichetta(page, 'Altre azioni').click();
  await tocca(page, 'XML FatturaPA', true);
  // a Lucia Bianchi mancano codice fiscale e indirizzo: l'XML non si prepara
  await vedo(page, /Per preparare l’XML sistema prima: codice fiscale e indirizzo/);
  await page.keyboard.press('Escape');
  await page.goBack();
  await tocca(page, 'F-2026-006');
  await etichetta(page, 'Altre azioni').click();
  await tocca(page, 'Elimina', true);
  await tocca(page, 'Elimina per sempre', true);
  await vedo(page, 'Da incassare');
  await expect(testo(page, 'F-2026-006')).toBeHidden();
});

test('fattura italiana con IVA 0: natura obbligatoria, spesa anticipata e bollo proposto', async ({
  page,
}) => {
  await tocca(page, 'S7 · Nuova fattura (IT)');
  await tocca(page, 'Marco Ferrari', true);
  await avanti(page).click();
  await etichetta(page, 'Descrizione').fill('Consulenza a cliente estero');
  await etichetta(page, 'Prezzo (€)').fill('300');
  await tocca(page, 'Aggiungi la prestazione', true);
  await etichetta(page, 'Descrizione').fill('Contributo unificato anticipato');
  await etichetta(page, 'Prezzo (€)').fill('98');
  await page.getByRole('switch', { name: /Spesa anticipata per conto del cliente/ }).click();
  await tocca(page, 'Aggiungi la prestazione', true);
  await vedo(page, 'Spese esenti art. 15', true);
  await avanti(page).click();
  await etichetta(page, 'IVA (%)').fill('0');
  await vedo(page, "Con IVA 0% indica la natura dell'operazione.");
  await tocca(page, 'N2.1 – Non soggetta (artt. 7-7septies, es. cliente estero)', true);
  // senza IVA si superano 77,47 €: il bollo da 2 € è già acceso
  await expect(page.getByRole('switch', { name: /Imposta di bollo 2 €/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await avanti(page).click();
  await vedo(page, 'Imposta di bollo', true);
  // 300 + cassa 12 + esenti 98 + bollo 2 = 412 €
  await vedo(page, '412,00 €');
  await tocca(page, 'Crea la fattura', true);
  await vedo(page, 'IVA 0% · N2.1 Non soggetta (artt. 7-7septies, es. cliente estero)');
});

test('dati di fatturazione svizzeri: IVA sì vuole il numero IDI con la cifra di controllo', async ({
  page,
}) => {
  await tocca(page, 'S9 · Dati di fatturazione (CH)');
  await expect(etichetta(page, 'Numero IDI')).toHaveValue('CHE-216.874.394');
  await etichetta(page, 'Numero IDI').fill('CHE-216.874.390');
  await vedo(page, /Numero IDI non valido/);
  await etichetta(page, 'Numero IDI').fill('');
  await vedo(page, "Se sei assoggettato all'IVA serve il numero IDI.");
  await page.getByRole('radio', { name: 'No' }).click();
  await vedo(page, 'Non assoggettato: le tue fatture escono senza IVA.');
  await etichetta(page, 'QR-IBAN (facoltativo)').fill('CH93 0076 2011 6238 5295 7');
  await vedo(page, 'Non è un QR-IBAN svizzero (banca tra 30000 e 31999).');
  await etichetta(page, 'QR-IBAN (facoltativo)').fill('CH44 3199 9123 0008 8901 2');
  await tocca(page, 'Salva', true);
});
