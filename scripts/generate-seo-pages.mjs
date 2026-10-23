// scripts/generate-seo-pages.mjs (lexum.ch)
// Prerender "solo testata" delle pagine della vetrina, nelle tre lingue, e del blog.
//
// Perché: il sito è una SPA (Vite). react-helmet-async scrive le meta LATO CLIENT.
// Google esegue il JS e le legge, ma i crawler delle anteprime dei link (WhatsApp,
// LinkedIn, Facebook…) NO: vedono solo l'<head> statico di index.html. Senza questo
// script ogni pagina avrebbe la testata della home (e prima ancora di lexum.it).
//
// Come: dopo `vite build` si parte da dist/index.html (che ha già gli asset con hash)
// e per ogni pagina si scrive una CARTELLA con un index.html identico ma con titolo,
// descrizione, canonical, hreflang, lingua e OG della pagina:
//   dist/it/index.html, dist/de/avvocati/index.html, dist/fr/novita/<slug>/index.html …
// Vercel serve da sé l'index di una cartella (i file statici vengono prima dei rewrite
// di vercel.json), quindi non c'è nessun rewrite da tenere allineato. Una pagina senza
// file (un articolo uscito dopo l'ultimo rilascio, le pagine dell'app) cade sul
// catch-all → index.html: la SPA funziona uguale, solo senza testata dedicata. Per
// questo la pubblicazione di un articolo fa ripartire il rilascio (rigenera-sito).
//
// I testi delle testate vengono dagli stessi file di traduzione delle pagine
// (public/locales/<lingua>/<namespace>.json, chiavi meta.*); gli articoli da Supabase.
// Scrive anche dist/sitemap.xml con tutte le pagine, le lingue (hreflang) e gli articoli.
//
// NB: è "head-only": il <body> resta il mount della SPA.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')
const LOCALES = resolve(process.cwd(), 'public/locales')
const SITE = 'https://www.lexum.ch'
const LINGUE = ['it', 'de', 'fr']
const LINGUA_DEFAULT = 'it'
const OG_LOCALE = { it: 'it_CH', de: 'de_CH', fr: 'fr_CH' }

const indexPath = resolve(DIST, 'index.html')
if (!existsSync(indexPath)) {
  console.error('[seo] dist/index.html non trovato — esegui prima `vite build`.')
  process.exit(1)
}
const base = readFileSync(indexPath, 'utf8')

// Pagine della vetrina: percorso dopo /<lingua> → namespace con le chiavi meta.*
const PAGINE = [
  { percorso: '', ns: 'home', freq: 'weekly', prio: '1.0' },
  { percorso: '/avvocati', ns: 'per_avvocati', freq: 'monthly', prio: '0.9' },
  { percorso: '/fiduciari', ns: 'per_fiduciari', freq: 'monthly', prio: '0.9' },
  { percorso: '/progettisti', ns: 'per_progettisti', freq: 'monthly', prio: '0.9' },
  { percorso: '/novita', ns: 'novita', freq: 'weekly', prio: '0.8' },
  { percorso: '/contatti', ns: 'contatti', freq: 'yearly', prio: '0.6' },
  // privacy e termini sono noindex: testata giusta per le anteprime, fuori dalla sitemap
  { percorso: '/privacy', ns: 'privacy', noindex: true },
  { percorso: '/termini', ns: 'termini', noindex: true },
]

const testi = {}
function meta(lingua, ns) {
  const chiave = `${lingua}/${ns}`
  if (!(chiave in testi)) {
    const file = resolve(LOCALES, lingua, `${ns}.json`)
    testi[chiave] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).meta ?? {} : {}
  }
  return testi[chiave]
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Sostituisce il PRIMO tag che corrisponde (di ciascun tipo ce n'è uno solo).
const replaceFirst = (html, re, out) => {
  if (!re.test(html)) {
    console.warn(`[seo] tag non trovato per sostituzione: ${re}`)
    return html
  }
  return html.replace(re, out)
}

// alternate: { it: url, de: url, fr: url } (solo le lingue che esistono)
function scriviTestata(fileRelativo, m) {
  let html = base
  html = replaceFirst(html, /<html lang="[^"]*">/, `<html lang="${m.lingua}">`)
  html = replaceFirst(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
  html = replaceFirst(html, /<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(m.description)}" />`)
  if (m.noindex) html = replaceFirst(html, /<meta name="robots"[\s\S]*?\/>/, '<meta name="robots" content="noindex, follow" />')
  const alternate = Object.entries(m.alternate ?? {})
    .map(([l, url]) => `<link rel="alternate" hreflang="${l}" href="${url}" />`)
  if (m.alternate?.[LINGUA_DEFAULT]) alternate.push(`<link rel="alternate" hreflang="x-default" href="${m.alternate[LINGUA_DEFAULT]}" />`)
  html = replaceFirst(html, /<link rel="canonical"[\s\S]*?\/>/,
    [`<link rel="canonical" href="${m.url}" />`, ...alternate].join('\n  '))
  html = replaceFirst(html, /<meta property="og:type"[\s\S]*?\/>/, `<meta property="og:type" content="${m.ogType ?? 'website'}" />\n  <meta property="og:locale" content="${OG_LOCALE[m.lingua]}" />`)
  html = replaceFirst(html, /<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${m.url}" />`)
  html = replaceFirst(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${esc(m.ogTitle ?? m.title)}" />`)
  html = replaceFirst(html, /<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${esc(m.ogDescription ?? m.description)}" />`)
  html = replaceFirst(html, /<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${esc(m.ogTitle ?? m.title)}" />`)
  html = replaceFirst(html, /<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${esc(m.ogDescription ?? m.description)}" />`)
  if (m.image) {
    html = replaceFirst(html, /<meta property="og:image"[\s\S]*?\/>/, `<meta property="og:image" content="${esc(m.image)}" />`)
    html = replaceFirst(html, /<meta name="twitter:image"[\s\S]*?\/>/, `<meta name="twitter:image" content="${esc(m.image)}" />`)
  }
  const destinazione = resolve(DIST, fileRelativo)
  mkdirSync(dirname(destinazione), { recursive: true })
  writeFileSync(destinazione, html)
}

const sitemap = []   // { loc, lastmod, freq, prio, alternate }
const oggi = new Date().toISOString().slice(0, 10)
let count = 0

// ─── Pagine della vetrina ─────────────────────────────────────
for (const p of PAGINE) {
  const alternate = Object.fromEntries(LINGUE.map(l => [l, `${SITE}/${l}${p.percorso}`]))
  for (const lingua of LINGUE) {
    const t = meta(lingua, p.ns)
    if (!t.title) {
      console.warn(`[seo] manca meta.title in ${lingua}/${p.ns}.json: salto ${lingua}${p.percorso}`)
      continue
    }
    scriviTestata(`${lingua}${p.percorso}/index.html`, {
      lingua,
      url: alternate[lingua],
      alternate,
      noindex: p.noindex,
      title: t.title,
      description: t.description,
      ogTitle: t.og_title,
      ogDescription: t.og_description,
    })
    count++
    if (!p.noindex) sitemap.push({ loc: alternate[lingua], lastmod: oggi, freq: p.freq, prio: p.prio, alternate })
  }
}

// ─── Articoli del blog ────────────────────────────────────────
// In locale le variabili stanno nei file .env (Vite li legge da sé, Node no).
// Su Vercel non esistono: lì arrivano da process.env.
const FILE_ENV = ['.env.local', '.env.production.local', '.env.production', '.env']

function envDaiFile() {
  const out = {}
  for (const nome of FILE_ENV) {
    const file = resolve(process.cwd(), nome)
    if (!existsSync(file)) continue
    for (const riga of readFileSync(file, 'utf8').split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}

async function articoliPubblicati() {
  const env = { ...envDaiFile(), ...process.env }
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[seo] Supabase non configurato: salto gli articoli.')
    return []
  }
  const query =
    'select=slug,lingua,gruppo,titolo,sommario,copertina_url,pubblicato_il,updated_at&stato=eq.pubblicato&order=pubblicato_il.desc&limit=600'
  try {
    const res = await fetch(`${url}/rest/v1/novita?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      console.warn(`[seo] articoli non letti (HTTP ${res.status}): salto le loro testate.`)
      return []
    }
    return await res.json()
  } catch (err) {
    console.warn(`[seo] articoli non letti (${err.message}): salto le loro testate.`)
    return []
  }
}

const articoli = (await articoliPubblicati()).filter(a => a?.slug && LINGUE.includes(a.lingua))
const perGruppo = {}
for (const a of articoli) (perGruppo[a.gruppo] ??= {})[a.lingua] = `${SITE}/${a.lingua}/novita/${a.slug}`

for (const a of articoli) {
  const url = `${SITE}/${a.lingua}/novita/${a.slug}`
  const descrizione = a.sommario?.trim() || a.titolo
  scriviTestata(`${a.lingua}/novita/${a.slug}/index.html`, {
    lingua: a.lingua,
    url,
    alternate: perGruppo[a.gruppo],
    ogType: 'article',
    title: `${a.titolo} — Lexum`,
    description: descrizione,
    ogTitle: a.titolo,
    ogDescription: descrizione,
    image: a.copertina_url || undefined,
  })
  count++
  sitemap.push({
    loc: url,
    lastmod: (a.updated_at || a.pubblicato_il || oggi).slice(0, 10),
    freq: 'monthly',
    prio: '0.7',
    alternate: perGruppo[a.gruppo],
  })
}

// ─── Sitemap ──────────────────────────────────────────────────
const voci = sitemap.map(v => {
  const alt = Object.entries(v.alternate ?? {})
    .map(([l, u]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${u}" />`).join('')
  return `  <url>\n    <loc>${v.loc}</loc>\n    <lastmod>${v.lastmod}</lastmod>\n    <changefreq>${v.freq}</changefreq>\n    <priority>${v.prio}</priority>${alt}\n  </url>`
}).join('\n')
writeFileSync(resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${voci}\n</urlset>\n`)

console.log(`[seo] fatto: ${count} pagine con testata dedicata (${articoli.length} articoli), sitemap con ${sitemap.length} indirizzi.`)
