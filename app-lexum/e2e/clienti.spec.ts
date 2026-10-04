import { expect, test } from '@playwright/test';

import { erroriConsole, etichetta, testo, tocca, vedo } from './aiuto';

// Clienti e documenti dello studio (avvocato, Italia e Svizzera), con i dati finti.
// Si parte dall'elenco delle schermate, che prepara il ruolo giusto.

let errori: string[] = [];

test.beforeEach(async ({ page }) => {
  errori = erroriConsole(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
});

test.afterEach(() => {
  expect(errori, 'errori nella console').toEqual([]);
});

test('nuovo cliente italiano: controlli, portale, poi la scheda', async ({ page }) => {
  await tocca(page, 'S11 · Nuovo cliente (IT)');
  await tocca(page, 'Crea cliente', true);
  // gli obbligatori si segnalano dopo il primo tentativo
  await vedo(page, 'Scrivi il nome.');
  await vedo(page, "Scrivi l'email: serve per il portale.");
  await etichetta(page, 'Nome *').fill('Anna');
  await etichetta(page, 'Cognome *').fill('Rossi');
  await etichetta(page, 'Codice fiscale').fill('RSSNNA80');
  await vedo(page, 'Codice fiscale non valido.');
  await etichetta(page, 'Codice fiscale').fill('RSSNNA80A41F205X');
  await etichetta(page, 'Email *').fill('anna.rossi@example.com');
  await etichetta(page, 'Codice destinatario SDI').fill('ABC');
  await vedo(page, 'Il codice SDI ha 6 o 7 caratteri, lettere e numeri.');
  await etichetta(page, 'Codice destinatario SDI').fill('');
  await page.getByRole('switch', { name: /Attiva l'accesso al portale clienti/ }).click();
  // la password iniziale è già generata: si può cambiare
  await expect(etichetta(page, 'Password iniziale *')).not.toHaveValue('');
  await tocca(page, 'Crea cliente', true);
  await vedo(page, 'Cliente creato. Il portale è attivo: comunica tu la password al cliente.');
  await vedo(page, 'Anna Rossi');
  await vedo(page, 'Portale attivo', true);
});

test('scheda cliente: nota interna, messaggio, condividi nel portale', async ({ page }) => {
  await tocca(page, 'S12 · Scheda cliente: panoramica');
  await vedo(page, 'FRRMRC78C12F205X');
  await page.getByRole('tab', { name: 'Note' }).click();
  await vedo(page, 'Preferisce essere sentito al telefono dopo le 18.');
  await tocca(page, 'Aggiungi nota', true);
  await etichetta(page, 'Nota').fill('Chiedere la planimetria');
  await tocca(page, 'Salva', true);
  await vedo(page, 'Chiedere la planimetria');

  await page.getByRole('tab', { name: 'Messaggi' }).click();
  await tocca(page, 'Nuovo messaggio', true);
  await etichetta(page, 'Oggetto *').fill('Planimetria');
  await etichetta(page, 'Messaggio').fill('Può caricare la planimetria nel portale?');
  await tocca(page, 'Manda', true);
  await vedo(page, 'Può caricare la planimetria nel portale?');
  await tocca(page, 'Chiudi la conversazione', true);
  await vedo(page, 'Conversazione chiusa. Riaprila per scrivere.');
  await page.goBack();

  await page.getByRole('tab', { name: 'Documenti' }).click();
  await vedo(page, 'Foto delle infiltrazioni.pdf');
  await vedo(page, 'Dal cliente', true);
  await tocca(page, 'Condividi', true);
  await tocca(page, "Dall'archivio dello studio", true);
  // nel foglio: lo stesso titolo c'è anche nell'elenco sotto
  await page.getByRole('button', { name: /^Atto di citazione PDF/ }).click();
  await vedo(page, 'Atto di citazione.pdf');
});

test('archivio dello studio: collega un documento a una pratica, poi lo trovo nella pratica', async ({
  page,
}) => {
  await tocca(page, 'D2 · Archivio dello studio (avvocato)');
  await vedo(page, 'Modello di procura alle liti');
  await tocca(page, 'Modello di procura alle liti');
  await tocca(page, 'Cliente e pratica', true);
  // nel foglio: gli stessi nomi ci sono anche nei badge dell'elenco sotto
  await page.getByRole('radiogroup', { name: 'Cliente' }).getByText('Marco Ferrari', { exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'Pratica' })
    .getByText('Ferrari c. Condominio Via Verdi 14', { exact: true })
    .click();
  await tocca(page, 'Salva', true);
  await vedo(page, 'Ferrari c. Condominio Via Verdi 14', true);
  await tocca(page, 'Apri la pratica', true);
  await vedo(page, 'Documenti · 3');
  await vedo(page, 'Modello di procura alle liti');
});

test('pratica: carica un documento già collegato e salva in PDF l’atto di Lex', async ({ page }) => {
  await tocca(page, 'S2 · Pratica: documenti');
  await vedo(page, 'Documenti · 2');
  await tocca(page, 'Aggiungi', true);
  await tocca(page, 'Carica un file', true);
  await etichetta(page, 'Titolo *').fill('Perizia tecnica');
  await tocca(page, 'Carica', true);
  await vedo(page, 'Documenti · 3');
  await vedo(page, 'Perizia tecnica');
  // il cliente della pratica lo trova nella sua scheda, in archivio
  await page.getByRole('tab', { name: 'Lex' }).click();
  await tocca(page, 'Istanza di nomina CTU', true);
  await expect(testo(page, 'Salva come PDF nella pratica', true)).toBeVisible({ timeout: 15_000 });
  await tocca(page, 'Salva come PDF nella pratica', true);
  await tocca(page, 'Vedi i documenti', true);
  await vedo(page, 'Documenti · 4');
  await vedo(page, 'Atto di Lex', true);
});

test('cliente svizzero: AVS, UID con cifra di controllo, Cantone', async ({ page }) => {
  await tocca(page, 'S11 · Nuovo cliente (CH)');
  await page.getByRole('radio', { name: 'Persona giuridica' }).click();
  await etichetta(page, 'Ragione sociale *').fill('Alfa SA');
  await etichetta(page, 'Numero UID').fill('CHE-123.456.789');
  await vedo(page, 'Numero UID non valido (CHE-xxx.xxx.xxx).');
  await etichetta(page, 'Numero UID').fill('CHE-123.456.788');
  await etichetta(page, 'Email *').fill('info@alfa.example.ch');
  await etichetta(page, 'Cantone: Scegli il Cantone').click();
  await tocca(page, 'TI', true);
  await etichetta(page, 'NPA').fill('6900');
  await tocca(page, 'Crea cliente', true);
  await vedo(page, 'Cliente creato.');
  await vedo(page, 'CHE-123.456.788');
});
