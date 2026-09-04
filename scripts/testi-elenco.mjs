// scripts/testi-elenco.mjs
// Rigenera src/lib/testi/elenco-ns.js leggendo public/locales/it.
// Va rilanciato quando si aggiunge o si toglie un file di traduzione.
//   node scripts/testi-elenco.mjs
import fs from 'node:fs'
import path from 'node:path'

const radice = path.resolve(import.meta.dirname, '..')
const ns = fs.readdirSync(path.join(radice, 'public/locales/it'))
  .filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort()

const testo = `// src/lib/testi/elenco-ns.js
//
// GENERATO da: node scripts/testi-elenco.mjs
// Il browser non puo elencare una cartella, quindi i nomi dei file di traduzione
// vanno scritti qui. Se aggiungi un namespace nuovo, rigenera questo file:
// altrimenti la sincronizzazione dal codice non lo vede e il pannello non lo mostra.

export const ELENCO_NS = [
${ns.map(n => `  ${JSON.stringify(n)},`).join('\n')}
]
`
fs.writeFileSync(path.join(radice, 'src/lib/testi/elenco-ns.js'), testo)
console.log(`elenco-ns.js rigenerato: ${ns.length} namespace`)

for (const l of ['de', 'fr']) {
  const altri = new Set(fs.readdirSync(path.join(radice, `public/locales/${l}`))
    .filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
  const mancanti = ns.filter(n => !altri.has(n))
  const extra = [...altri].filter(n => !ns.includes(n))
  if (mancanti.length) console.warn(`  ATTENZIONE ${l}: mancano ${mancanti.join(', ')}`)
  if (extra.length) console.warn(`  ATTENZIONE ${l}: in piu ${extra.join(', ')}`)
}
