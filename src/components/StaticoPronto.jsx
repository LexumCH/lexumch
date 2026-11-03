// Toglie il testo già pronto nell'HTML appena la pagina vera è disegnata (vedi lib/statico.js).
// Va tolto prima degli altri effetti: con #root nascosto le altre pagine non potrebbero misurarsi.
// Qui le traduzioni arrivano dalla rete: si aspetta che ci siano, sennò si vedrebbero le chiavi.
import { useEffect, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NS_PRECARICATI } from '@/i18n'
import { togliStatico } from '@/lib/statico'

// Durante il build (src/seo/entry-seo.jsx) non c'è niente da togliere e useLayoutEffect darebbe un avviso
const usaEffetto = import.meta.env.SSR ? useEffect : useLayoutEffect

export default function StaticoPronto({ quando = true }) {
    const { ready } = useTranslation(NS_PRECARICATI)
    usaEffetto(() => { if (quando && ready) togliStatico() }, [quando, ready])
    return null
}
