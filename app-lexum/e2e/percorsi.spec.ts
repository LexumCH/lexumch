import { expect, test } from '@playwright/test';

import { domandaALex, erroriConsole, etichetta, scriviALex, testo, tocca, vedo } from './aiuto';

const esempioIT = 'Un ladro entra in casa di notte: fin dove posso difendermi?';
let errori: string[] = [];

test.beforeEach(async ({ page }) => {
  errori = erroriConsole(page);
});

test.afterEach(() => {
  expect(errori, 'errori nella console').toEqual([]);
});

test('primo avvio: paese, benvenuto, registrazione, codice, chat', async ({ page }) => {
  await page.goto('/');
  await vedo(page, 'Scegli il paese');
  await tocca(page, 'Espandi');
  await vedo(page, '229 codici · 34.000 articoli');
  await tocca(page, 'Continua', true);
  await vedo(page, "L'AI italiana che ragiona su");
  await tocca(page, 'Inizia', true);
  await vedo(page, 'Ogni risposta ha');
  await tocca(page, 'Avanti', true);
  await tocca(page, 'Crea il tuo account', true);
  await vedo(page, 'Crea il tuo account');
  await tocca(page, 'Registrati', true);
  await vedo(page, 'Controlla la tua email');
  await tocca(page, 'Conferma', true);
  await vedo(page, 'Di cosa hai bisogno?');
  await vedo(page, '1 credito di benvenuto');
});

test('benvenuto svizzero con i testi approvati', async ({ page }) => {
  await page.goto('/');
  await tocca(page, 'Svizzera', true);
  await tocca(page, 'Continua', true);
  await vedo(page, 'tutto il diritto svizzero.');
  await vedo(page, 'Mi hanno disdetto il contratto mentre ero in malattia. È valido?');
  await tocca(page, 'Inizia', true);
  await vedo(page, 'Lex cerca nel diritto federale e cantonale');
  await vedo(page, 'Diritto cantonale', true);
});

test('accesso: errore, password dimenticata, ingresso', async ({ page }) => {
  await page.goto('/avvio/accesso');
  await vedo(page, 'Bentornato');
  await tocca(page, 'Accedi', true);
  await vedo(page, 'Email o password non corretti');
  await tocca(page, 'Password dimenticata?');
  await vedo(page, 'Password dimenticata?');
  await tocca(page, 'Invia link', true);
  await vedo(page, 'Email inviata');
  await tocca(page, "Torna all'accesso", true);
  await etichetta(page, 'Password').fill('una-password');
  await tocca(page, 'Accedi', true);
  await vedo(page, 'Di cosa hai bisogno?');
});

test('nuova password: minimo 8 caratteri e uguali', async ({ page }) => {
  await page.goto('/avvio/nuova-password');
  await etichetta(page, 'Nuova password').fill('corta');
  await tocca(page, 'Salva password', true);
  await vedo(page, 'Minimo 8 caratteri');
  await etichetta(page, 'Nuova password').fill('lunga-abbastanza');
  await etichetta(page, 'Conferma password').fill('diversa-davvero');
  await tocca(page, 'Salva password', true);
  await vedo(page, 'Le password non coincidono');
  await etichetta(page, 'Conferma password').fill('lunga-abbastanza');
  await tocca(page, 'Salva password', true);
  await vedo(page, 'Password aggiornata');
});

test("Lex: le domande d'esempio hanno ciascuna la sua risposta", async ({ page }) => {
  await page.goto('/chat');
  await vedo(page, 'Il padrone di casa non mi restituisce la cauzione: cosa posso fare?');
  await vedo(page, 'Mi è arrivata una multa dopo quattro mesi: devo pagarla?');
  await domandaALex(page, esempioIT);
  await vedo(page, 'Legittima difesa in casa');
  await vedo(page, 'Serve un pericolo attuale.');
  await tocca(page, 'c.p., art. 52, c. 1');
  await vedo(page, 'Codice penale (R.D. 19 ottobre 1930, n. 1398)');
});

test('Lex: risposta, fonte, legge sopra la chat e ritorno', async ({ page }) => {
  await page.goto('/chat');
  await scriviALex(page, 'Il Comune non risponde alla mia richiesta di accesso agli atti');
  await vedo(page, 'Il silenzio è un rifiuto.');
  await vedo(page, "Chat non salvata: con un'etichetta la ritrovi anche dal computer.");
  await expect(etichetta(page, 'Nessun credito disponibile')).toBeVisible();
  await tocca(page, 'L. 241/1990, art. 25');
  await vedo(page, 'Legge 7 agosto 1990, n. 241');
  await tocca(page, 'Apri la legge', true);
  await vedo(page, 'Aperta dalla chat «Accesso agli atti»');
  await vedo(page, 'Citato da Lex in questa chat');
  await tocca(page, 'Torna alla chat', true);
  await vedo(page, 'Il silenzio è un rifiuto.');
});

test('crediti finiti: il foglio rimanda al sito', async ({ page }) => {
  await page.goto('/chat');
  await domandaALex(page, esempioIT);
  await etichetta(page, 'Scrivi a Lex').fill('E se risponde dopo il ricorso?');
  await etichetta(page, 'Invia').click();
  await vedo(page, 'Continua la tua ricerca');
  await vedo(page, 'Continua su lexum.it');
});

test('nuova chat non salvata: avviso, salvataggio e riapertura da Ricerche', async ({ page }) => {
  await page.goto('/chat');
  await domandaALex(page, esempioIT);
  await etichetta(page, 'Apri il menù').click();
  await tocca(page, 'Nuova chat', true);
  await vedo(page, 'Questa chat non è salvata');
  await tocca(page, "Salva in un'etichetta", true);
  await tocca(page, 'Salva in «Casa»', true);
  await vedo(page, 'Etichetta «Casa» · 4 elementi');
  await tocca(page, 'Legittima difesa in casa', true);
  await vedo(page, 'Salvata in «Casa» · oggi');
  await vedo(page, 'Serve un pericolo attuale.');
  await etichetta(page, 'Torna a Ricerche').click();
  await vedo(page, 'Etichetta «Casa» · 4 elementi');
  await tocca(page, 'Legittima difesa in casa', true);
  await tocca(page, 'Continua la chat', true);
  await expect(etichetta(page, 'Scrivi a Lex')).toBeVisible();
  await vedo(page, 'Serve un pericolo attuale.');
});

test('Ricerche: nuova etichetta e confronto tra due elementi', async ({ page }) => {
  await page.goto('/ricerche?etichetta=casa');
  await etichetta(page, 'Nuova etichetta').click();
  await page.getByPlaceholder('Es. Casa, Lavoro, Multe…').fill('Casa');
  await vedo(page, "Esiste già un'etichetta con questo nome.");
  await page.getByPlaceholder('Es. Casa, Lavoro, Multe…').fill('Multe');
  await etichetta(page, 'Colore rosso').click();
  await tocca(page, 'Crea etichetta', true);
  await vedo(page, 'Etichetta «Multe» · 0 elementi');
  await tocca(page, 'Casa', true);
  await etichetta(page, 'Confronta due o tre elementi').click();
  await vedo(page, /0 \/ 3 selezionati/);
  await tocca(page, 'L. 241/1990 · Art. 25', true);
  await tocca(page, 'Consiglio di Stato · Ad. Plen. · n. 10 · 2020', true);
  await vedo(page, /2 \/ 3 selezionati/);
  await tocca(page, 'Confronta affiancati', true);
  await vedo(page, 'Confronto · 2 elementi');
  await tocca(page, 'Punti in comune', true);
  await vedo(page, 'risposta di prova sui 2 elementi che hai scelto.');
  await expect(etichetta(page, 'Nessun credito disponibile')).toBeVisible();
  await etichetta(page, 'Torna a Ricerche').click();
  await tocca(page, 'Annulla', true);
  await expect(etichetta(page, 'Confronta due o tre elementi')).toBeVisible();
});

test('Banca dati: ricerca, filtro, sentenza, sfoglia', async ({ page }) => {
  await page.goto('/banca-dati');
  await vedo(page, 'Codici, leggi, sentenze e prassi');
  await tocca(page, 'accesso agli atti silenzio');
  await vedo(page, 'Ordinati per pertinenza');
  await tocca(page, 'Sentenze', true);
  await tocca(page, 'Accesso agli atti e accesso civico generalizzato nei contratti pubblici');
  await vedo(page, 'Principio di diritto');
  await etichetta(page, 'Indietro').click();
  await vedo(page, 'Ordinati per pertinenza');
  await etichetta(page, 'Indietro').click();
  await tocca(page, 'Leggi e decreti', true);
  await etichetta(page, 'Cerca nella legge').fill('commissione');
  await vedo(page, "Commissione per l'accesso ai documenti amministrativi");
});

test('cambio paese: Svizzera e ritorno, con crediti separati', async ({ page }) => {
  await page.goto('/profilo');
  await tocca(page, 'Cambia', true);
  await vedo(page, 'Vuoi passare al database legale svizzero?');
  await tocca(page, 'Sì, passa alla Svizzera', true);
  await vedo(page, 'Passo alla banca dati svizzera');
  await vedo(page, 'Sei nella banca dati svizzera');
  await expect(etichetta(page, '28 crediti disponibili')).toBeVisible();
  await etichetta(page, 'Apri il menù').click();
  await tocca(page, 'Profilo', true);
  await vedo(page, 'Elimina account svizzero');
  await tocca(page, 'Cambia', true);
  await tocca(page, "Sì, passa all'Italia", true);
  await expect(etichetta(page, '1 credito disponibile')).toBeVisible();
});

test('domande frequenti: la risposta si apre', async ({ page }) => {
  await page.goto('/domande');
  await tocca(page, 'Come funzionano i crediti?', true);
  await vedo(page, /Si usano prima i crediti del piano/);
});

test('elimina account: conferma e passaggio all’accesso rimasto', async ({ page }) => {
  await page.goto('/profilo');
  await tocca(page, 'Elimina account', true);
  await vedo(page, "Eliminare l'accesso italiano?");
  await vedo(page, /L'accesso svizzero resta attivo/);
  await tocca(page, "Elimina l'accesso italiano", true);
  await vedo(page, 'Sei nella banca dati svizzera');
});

test('elenco delle schermate: ogni voce si apre senza errori', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const voci = page.getByText(/^[A-G]\d+[a-z]? · /);
  await expect(voci.first()).toBeVisible();
  const n = await voci.count();
  expect(n).toBeGreaterThanOrEqual(40);
  for (let i = 0; i < n; i++) {
    await voci.nth(i).click();
    await page.waitForTimeout(300);
  }
  await expect(testo(page, 'Lexum · anteprima app')).toBeVisible();
});
