// Crea l'anteprima web dell'app in UN SOLO file HTML, da pubblicare come pagina su claude.ai
// (o da aprire nel browser). Uso: npm run anteprima:web
//
// 1. esporta la versione web con l'elenco delle schermate acceso (EXPO_PUBLIC_ANTEPRIMA=1);
// 2. mette dentro il JavaScript, i caratteri e le immagini (come data: URI), così la pagina
//    non dipende da percorsi o da un server;
// 3. scrive solo il contenuto della pagina (senza <html>, <head>, <body>): chi la pubblica
//    aggiunge lo scheletro.
//
// Risultato: dist-anteprima/anteprima-app-lexum.html

import { Buffer } from 'node:buffer';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const radice = new URL('..', import.meta.url).pathname;
const uscitaExpo = join(radice, 'dist-anteprima', 'expo');
const fileFinale = join(radice, 'dist-anteprima', 'anteprima-app-lexum.html');

execSync(`npx expo export --platform web --output-dir "${uscitaExpo}" --clear`, {
  cwd: radice,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_ANTEPRIMA: '1', EXPO_OFFLINE: '1' },
});

const cartellaJs = join(uscitaExpo, '_expo', 'static', 'js', 'web');
const nomeJs = readdirSync(cartellaJs).find((f) => f.endsWith('.js'));
let js = readFileSync(join(cartellaJs, nomeJs), 'utf8');

const tipi = { '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf' };

// Ogni risorsa (immagine o carattere) compare come stringa «"/assets/…"»:
// la sostituisco con il file stesso, in base64.
let sostituite = 0;
js = js.replace(/"\/(assets\/[^"]+\.(?:png|jpg|ttf|otf))"/g, (tutto, percorso) => {
  const dati = readFileSync(join(uscitaExpo, percorso)).toString('base64');
  sostituite++;
  return `"data:${tipi[extname(percorso)]};base64,${dati}"`;
});
if (/"\/assets\//.test(js)) throw new Error('Sono rimaste risorse con un percorso assoluto.');

// Dentro un <script> non devono comparire «</script» né «<!--».
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const pagina = `<title>Anteprima app Lexum</title>
<style>
  :root { color-scheme: dark; box-sizing: border-box; }
  html, body { height: 100%; background: #061219; }
  body { margin: 0; overflow: hidden; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<noscript>Per vedere l'anteprima serve JavaScript.</noscript>
<div id="root"></div>
<script>
  // Se il riquadro che ospita la pagina non permette di cambiare indirizzo,
  // la navigazione continua lo stesso dentro l'app.
  (function () {
    ['pushState', 'replaceState'].forEach(function (nome) {
      var originale = history[nome].bind(history);
      history[nome] = function () {
        try {
          return originale.apply(null, arguments);
        } catch (e) {
          return undefined;
        }
      };
    });
  })();
</script>
<script>
${js}
</script>
`;

mkdirSync(join(radice, 'dist-anteprima'), { recursive: true });
writeFileSync(fileFinale, pagina);
const mb = (Buffer.byteLength(pagina) / 1024 / 1024).toFixed(1);
console.log(`\nAnteprima pronta: ${fileFinale} (${mb} MB, ${sostituite} risorse incluse)`);
