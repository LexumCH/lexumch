// src/lib/argomenti.js
//
// 03-11-2026: gli argomenti che raccolgono gli articoli (novita.argomenti, con l'id italiano, uguale per
// tutte le versioni di un articolo), ognuno con la sua pagina /:lang/novita/argomento/<slug della lingua>.
// Nomi, titoli e descrizioni stanno in public/locales/<lingua>/novita.json (argomenti.<id>). Lo stesso
// elenco lo legge il build (scripts/generate-seo-pages.mjs): se ne aggiungi uno, basta qui e nei testi.

export const ARGOMENTI = [
    { id: 'famiglia', slug: { it: 'famiglia', de: 'familie', fr: 'famille' } },
    { id: 'lavoro-e-assicurazioni', slug: { it: 'lavoro-e-assicurazioni', de: 'arbeit-und-versicherungen', fr: 'travail-et-assurances' } },
    { id: 'contratti-e-debiti', slug: { it: 'contratti-e-debiti', de: 'vertraege-und-schulden', fr: 'contrats-et-dettes' } },
    { id: 'imprese-e-societa', slug: { it: 'imprese-e-societa', de: 'unternehmen-und-gesellschaften', fr: 'entreprises-et-societes' } },
    { id: 'fisco-e-imposte', slug: { it: 'fisco-e-imposte', de: 'steuern', fr: 'fiscalite-et-impots' } },
    { id: 'professioni-e-studio', slug: { it: 'professioni-e-studio', de: 'berufe-und-kanzlei', fr: 'professions-et-etude' } },
]

// Lo slug può essere di un'altra lingua (dopo il cambio lingua dal menu)
export function argomentoDaSlug(slug) {
    return ARGOMENTI.find(a => Object.values(a.slug).includes(slug)) ?? null
}

export function argomentoDaId(id) {
    return ARGOMENTI.find(a => a.id === id) ?? null
}
