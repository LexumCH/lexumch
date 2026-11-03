// src/seo/entry-seo.jsx
//
// 03-11-2026: disegna le pagine della vetrina in testo, durante il build (vite build --ssr), nelle tre lingue.
// Lo usa scripts/generate-seo-pages.mjs per metterlo dentro l'HTML: i motori delle AI non eseguono
// JavaScript, quindi senza questo vedevano una pagina vuota. Niente hydrate: nel browser React ridisegna da capo.
import i18n from './i18n-seo'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import GuscioVetrina from '@/components/layouts/GuscioVetrina'
import Home from '@/pages/Home'
import PerAvvocati from '@/pages/PerAvvocati'
import PerFiduciari from '@/pages/PerFiduciari'
import PerProgettisti from '@/pages/PerProgettisti'
import Contatti from '@/pages/Contatti'
import Novita from '@/pages/Novita'
import NovitaArticolo from '@/pages/NovitaArticolo'
import Strumenti from '@/pages/strumenti/Strumenti'
import CreaFattura from '@/pages/strumenti/CreaFattura'

// dati: { articoli, articolo, correlati, versioni }, letti da Supabase dallo script
export async function disegna(percorso, lingua, dati = {}) {
    await i18n.changeLanguage(lingua)
    const queryClient = new QueryClient()
    const pagina = (el) => <GuscioVetrina>{el}</GuscioVetrina>
    return renderToStaticMarkup(
        <HelmetProvider context={{}}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <StaticRouter location={percorso}>
                        <Routes>
                            <Route path="/:lang" element={pagina(<Home />)} />
                            <Route path="/:lang/avvocati" element={pagina(<PerAvvocati />)} />
                            <Route path="/:lang/fiduciari" element={pagina(<PerFiduciari />)} />
                            <Route path="/:lang/progettisti" element={pagina(<PerProgettisti />)} />
                            <Route path="/:lang/contatti" element={pagina(<Contatti />)} />
                            <Route path="/:lang/novita" element={pagina(<Novita preArticoli={dati.articoli} />)} />
                            <Route path="/:lang/novita/argomento/:argomento" element={pagina(<Novita preArticoli={dati.articoli} />)} />
                            <Route path="/:lang/novita/:slug" element={pagina(<NovitaArticolo preArticolo={dati.articolo} preCorrelati={dati.correlati} preVersioni={dati.versioni} />)} />
                            <Route path="/:lang/strumenti" element={pagina(<Strumenti />)} />
                            <Route path="/:lang/strumenti/:strumento" element={pagina(<CreaFattura />)} />
                        </Routes>
                    </StaticRouter>
                </AuthProvider>
            </QueryClientProvider>
        </HelmetProvider>
    )
}
