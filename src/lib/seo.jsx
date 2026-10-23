// src/lib/seo.jsx
//
// Canonical e hreflang delle pagine della vetrina: ogni pagina esiste in tre lingue,
// ognuna col suo indirizzo (/it/avvocati, /de/avvocati, /fr/avvocati). Prima le
// pagine dichiaravano indirizzi senza lingua (/per-avvocati), che non esistono più
// e rimandano altrove: Google rischiava di fondere le tre versioni in una.
// Si usa dentro <Helmet>: {testataLingue('/avvocati', i18n.language)}.

import { LINGUE_SUPPORTATE, LINGUA_DEFAULT } from '@/i18n'

export const SITO = 'https://www.lexum.ch'

export function testataLingue(percorso, lingua) {
    const l = LINGUE_SUPPORTATE.includes(lingua) ? lingua : LINGUA_DEFAULT
    return [
        <html key="lang" lang={l} />,
        <link key="canonical" rel="canonical" href={`${SITO}/${l}${percorso}`} />,
        ...LINGUE_SUPPORTATE.map(x => (
            <link key={`alt-${x}`} rel="alternate" hrefLang={x} href={`${SITO}/${x}${percorso}`} />
        )),
        <link key="alt-default" rel="alternate" hrefLang="x-default" href={`${SITO}/${LINGUA_DEFAULT}${percorso}`} />,
        <meta key="og-url" property="og:url" content={`${SITO}/${l}${percorso}`} />,
    ]
}
