// Gli indirizzi degli strumenti gratuiti, nella lingua della pagina (03-11-2026).
// Li legge anche il build (scripts/generate-seo-pages.mjs).
export const SLUG_FATTURA = { it: 'crea-qr-fattura', de: 'qr-rechnung-erstellen', fr: 'creer-qr-facture' }

export const percorsoFattura = (lingua) => `/${lingua}/strumenti/${SLUG_FATTURA[lingua]}`
