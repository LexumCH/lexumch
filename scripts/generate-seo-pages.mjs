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
// TESTO DELLE PAGINE (03-11-2026): i motori delle AI (GPTBot, ClaudeBot...) non eseguono JavaScript:
// con la sola testata vedevano titolo e descrizione e nessun testo. Ora, se c'è il build dist-seo
// (src/seo/entry-seo.jsx), il corpo della pagina entra nell'HTML dentro <div id="statico">; nel browser
// React disegna in #root (nascosto) e poi lo sostituisce (src/lib/statico.js). Se quel build manca o
// una pagina non si disegna, resta la sola testata: il rilascio non si ferma.
//
// dist/index.html è la radice «/»: una scelta della lingua leggibile da tutti, nel browser RootRedirect
// porta subito alla lingua giusta. Per tutte le altre rotte il catch-all di vercel.json punta a
// dist/app.html, il guscio vuoto.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { ARGOMENTI } from '../src/lib/argomenti.js'
import { SLUG_FATTURA, percorsoFattura } from '../src/lib/strumenti/percorsi.js'

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
writeFileSync(resolve(DIST, 'app.html'), base)

// Il disegno delle pagine in testo (vedi sopra)
let disegna = null
try {
  ;({ disegna } = await import(resolve(process.cwd(), 'dist-seo/entry-seo.js')))
} catch (err) {
  console.warn(`[seo] testo delle pagine non disponibile (${err.message}): solo testate.`)
}

async function testoDi(percorso, lingua, dati) {
  if (!disegna) return null
  try {
    return await disegna(percorso, lingua, dati)
  } catch (err) {
    console.warn(`[seo] ${percorso} non disegnata (${err.message}): solo testata.`)
    return null
  }
}

let conTesto = 0
function conCorpo(html, corpo) {
  if (!corpo) return html
  conTesto++
  // funzione come sostituto: nel testo possono esserci «$»
  return html.replace('<div id="root"></div>', () => `<div id="statico">${corpo}</div>\n  <div id="root" style="display:none"></div>`)
}

// I dati strutturati: «<» scritto così non può chiudere il tag script
function datiStrutturati(oggetto) {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...oggetto }).replace(/</g, '\\u003c')
  return `  <script type="application/ld+json">${json}</script>\n</head>`
}

function jsonDi(lingua, ns) {
  const file = resolve(LOCALES, lingua, `${ns}.json`)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

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
  for (const dati of m.jsonLd ?? []) html = html.replace('</head>', () => datiStrutturati(dati))
  if (m.corpo) html = conCorpo(html, m.corpo)
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
      // privacy e termini sono noindex: niente testo
      corpo: p.noindex || p.ns === 'novita' ? null : await testoDi(`/${lingua}${p.percorso}`, lingua),
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
    'select=slug,lingua,gruppo,titolo,sommario,contenuto,copertina_url,autore,categoria,argomenti,instagram_url,tiktok_url,pubblicato_il,updated_at&stato=eq.pubblicato&order=pubblicato_il.desc&limit=600'
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
const slugPerGruppo = {}
for (const a of articoli) {
  ;(perGruppo[a.gruppo] ??= {})[a.lingua] = `${SITE}/${a.lingua}/novita/${a.slug}`
  ;(slugPerGruppo[a.gruppo] ??= {})[a.lingua] = a.slug
}
// L'elenco non ha bisogno del testo degli articoli
const elencoDi = (lingua) => articoli.filter(a => a.lingua === lingua).map(({ contenuto, ...resto }) => resto)

// ─── Elenco del blog e pagine degli argomenti (src/lib/argomenti.js) ─────
for (const lingua of LINGUE) {
  const elenco = elencoDi(lingua)
  const t = meta(lingua, 'novita')
  const alternate = Object.fromEntries(LINGUE.map(l => [l, `${SITE}/${l}/novita`]))
  scriviTestata(`${lingua}/novita/index.html`, {
    lingua, url: alternate[lingua], alternate,
    title: t.title, description: t.description, ogTitle: t.og_title, ogDescription: t.og_description,
    corpo: await testoDi(`/${lingua}/novita`, lingua, { articoli: elenco }),
  })
  const testi = jsonDi(lingua, 'novita').argomenti ?? {}
  for (const x of ARGOMENTI) {
    if (!elenco.some(a => a.argomenti?.includes(x.id)) || !testi[x.id]) continue
    const alt = Object.fromEntries(LINGUE.map(l => [l, `${SITE}/${l}/novita/argomento/${x.slug[l]}`]))
    const recente = elenco.find(a => a.argomenti?.includes(x.id))
    scriviTestata(`${lingua}/novita/argomento/${x.slug[lingua]}/index.html`, {
      lingua, url: alt[lingua], alternate: alt,
      title: `${testi[x.id].titolo} — Lexum`,
      description: testi[x.id].descrizione,
      ogTitle: testi[x.id].titolo,
      ogDescription: testi[x.id].descrizione,
      corpo: await testoDi(`/${lingua}/novita/argomento/${x.slug[lingua]}`, lingua, { articoli: elenco }),
      jsonLd: [{
        '@type': 'CollectionPage',
        name: testi[x.id].titolo,
        description: testi[x.id].descrizione,
        url: alt[lingua],
        inLanguage: `${lingua}-CH`,
      }],
    })
    count++
    sitemap.push({ loc: alt[lingua], lastmod: (recente?.pubblicato_il ?? oggi).slice(0, 10), freq: 'weekly', prio: '0.6', alternate: alt })
  }
}

// ─── Strumenti gratuiti ───────────────────────────────────────
{
  const altHub = Object.fromEntries(LINGUE.map(l => [l, `${SITE}/${l}/strumenti`]))
  const altFattura = Object.fromEntries(LINGUE.map(l => [l, `${SITE}${percorsoFattura(l)}`]))
  for (const lingua of LINGUE) {
    const t = jsonDi(lingua, 'strumenti')
    if (!t.hub || !t.fattura) continue
    scriviTestata(`${lingua}/strumenti/index.html`, {
      lingua, url: altHub[lingua], alternate: altHub,
      title: t.hub.meta_title, description: t.hub.meta_description,
      corpo: await testoDi(`/${lingua}/strumenti`, lingua),
    })
    scriviTestata(`${lingua}/strumenti/${SLUG_FATTURA[lingua]}/index.html`, {
      lingua, url: altFattura[lingua], alternate: altFattura,
      title: t.fattura.meta_title, description: t.fattura.meta_description,
      corpo: await testoDi(percorsoFattura(lingua), lingua),
      jsonLd: [{
        '@type': 'WebApplication',
        name: t.fattura.nome,
        description: t.fattura.meta_description,
        url: altFattura[lingua],
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: `${lingua}-CH`,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CHF' },
        provider: { '@type': 'Organization', name: 'Lexum', url: `${SITE}/` },
      }, {
        '@type': 'FAQPage',
        mainEntity: (t.fattura.domande ?? []).map(({ d, r }) => ({
          '@type': 'Question',
          name: d,
          acceptedAnswer: { '@type': 'Answer', text: r },
        })),
      }],
    })
    count += 2
    sitemap.push({ loc: altHub[lingua], lastmod: oggi, freq: 'monthly', prio: '0.7', alternate: altHub })
    sitemap.push({ loc: altFattura[lingua], lastmod: oggi, freq: 'monthly', prio: '0.8', alternate: altFattura })
  }
}

for (const a of articoli) {
  const url = `${SITE}/${a.lingua}/novita/${a.slug}`
  const descrizione = a.sommario?.trim() || a.titolo
  // Gli stessi di articoliCorrelati (src/lib/novita.js)
  const correlati = a.argomenti?.length
    ? elencoDi(a.lingua).filter(c => c.slug !== a.slug && c.argomenti?.some(x => a.argomenti.includes(x))).slice(0, 3)
    : []
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
    corpo: await testoDi(`/${a.lingua}/novita/${a.slug}`, a.lingua, { articolo: a, correlati, versioni: slugPerGruppo[a.gruppo] }),
    jsonLd: [{
      '@type': 'Article',
      headline: a.titolo,
      description: descrizione,
      image: a.copertina_url || `${SITE}/logo.png`,
      datePublished: a.pubblicato_il,
      dateModified: a.updated_at || a.pubblicato_il,
      inLanguage: `${a.lingua}-CH`,
      url,
      mainEntityOfPage: url,
      articleSection: a.categoria || undefined,
      isAccessibleForFree: true,
      author: a.autore?.trim()
        ? { '@type': 'Person', name: a.autore.trim() }
        : { '@type': 'Organization', name: 'Lexum', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'Lexum', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    }],
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

// La radice: scelta della lingua leggibile anche senza JavaScript
{
  const SCELTA = [
    { l: 'it', nome: 'Italiano', testo: 'Lexum: intelligenza artificiale, banca dati e gestionale per il diritto svizzero.' },
    { l: 'de', nome: 'Deutsch', testo: 'Lexum: künstliche Intelligenz, Datenbank und Kanzleisoftware für das Schweizer Recht.' },
    { l: 'fr', nome: 'Français', testo: 'Lexum : intelligence artificielle, banque de données et logiciel de gestion pour le droit suisse.' },
  ]
  const corpo = `<main class="min-h-screen bg-petrolio text-nebbia flex flex-col items-center justify-center gap-6 px-6 text-center">`
    + `<h1 class="font-display text-4xl font-light">Lexum</h1>`
    + SCELTA.map(x => `<p class="font-body text-sm text-nebbia/50"><a class="text-oro" hreflang="${x.l}" href="/${x.l}">${x.nome}</a><br>${x.testo}</p>`).join('')
    + `</main>`
  writeFileSync(indexPath, conCorpo(base, corpo))
}

console.log(`[seo] fatto: ${count} pagine con testata dedicata (${articoli.length} articoli), ${conTesto} col testo dentro, sitemap con ${sitemap.length} indirizzi.`)
