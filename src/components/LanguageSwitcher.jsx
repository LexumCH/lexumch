import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { LINGUE_SUPPORTATE } from '@/i18n'

const ETICHETTE = {
    it: 'IT',
    de: 'DE',
    fr: 'FR',
}

// Il nome di ogni lingua nella lingua stessa, per la tendina (10-11-2026)
const NOMI = {
    it: 'Italiano',
    de: 'Deutsch',
    fr: 'Français',
}

// Le bandierine disegnate qui e non con le emoji, che su Windows si vedono come due lettere
const STRISCE = {
    it: { verso: 'verticali', colori: ['#009246', '#ffffff', '#ce2b37'] },
    fr: { verso: 'verticali', colori: ['#0055a4', '#ffffff', '#ef4135'] },
    de: { verso: 'orizzontali', colori: ['#000000', '#dd0000', '#ffce00'] },
}

function Bandiera({ lingua, className = '' }) {
    const { verso, colori } = STRISCE[lingua]
    return (
        <svg viewBox="0 0 3 2" aria-hidden="true" className={`w-[18px] h-3 shrink-0 ring-1 ring-white/15 ${className}`}>
            {colori.map((c, i) => verso === 'verticali'
                ? <rect key={c} x={i} width="1" height="2" fill={c} />
                : <rect key={c} y={(i * 2) / 3} width="3" height={2 / 3} fill={c} />)}
        </svg>
    )
}

export default function LanguageSwitcher({ variant = 'desktop' }) {
    const { i18n } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()

    async function cambiaLingua(nuovaLingua) {
        // la tendina resta aperta finché una sua voce ha il fuoco
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        if (nuovaLingua === i18n.language) return

        // 1. Cambia lingua in i18next (UI si aggiorna istantaneamente)
        await i18n.changeLanguage(nuovaLingua)

        // 2. Salva in localStorage (preferenza browser)
        localStorage.setItem('lexum_lingua', nuovaLingua)

        // 3. Se loggato, salva sul profilo Supabase (preferenza utente)
        if (user) {
            await supabase
                .from('profiles')
                .update({ lingua: nuovaLingua })
                .eq('id', user.id)
        }

        // 4. Se siamo in vetrina (URL con /:lang/), aggiorna l'URL
        const segmenti = location.pathname.split('/').filter(Boolean)
        if (segmenti.length > 0 && LINGUE_SUPPORTATE.includes(segmenti[0])) {
            segmenti[0] = nuovaLingua
            const nuovoPath = '/' + segmenti.join('/') + location.search
            navigate(nuovoPath, { replace: true })
        }
        // Se siamo in app post-login (URL senza :lang/), basta i18n.changeLanguage
    }

    const attiva = LINGUE_SUPPORTATE.includes(i18n.language) ? i18n.language : LINGUE_SUPPORTATE[0]

    // Variante desktop: una tendina con la bandierina della lingua attiva (10-11-2026)
    if (variant === 'desktop') {
        return (
            <div className="relative group">
                <button type="button" aria-haspopup="true" aria-label={`${NOMI[attiva]} · Lingua · Sprache · Langue`}
                    className="flex items-center gap-1.5 text-xs font-body tracking-wider text-nebbia/60 hover:text-nebbia transition-colors">
                    <Bandiera lingua={attiva} />
                    {ETICHETTE[attiva]}
                    <ChevronDown size={12} />
                </button>
                <div className="absolute right-0 top-full pt-4 w-44 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity">
                    <div className="bg-slate border border-white/10 shadow-2xl p-1.5">
                        {LINGUE_SUPPORTATE.map(lng => (
                            <button key={lng} type="button" lang={lng} onClick={() => cambiaLingua(lng)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 font-body text-sm text-left hover:bg-white/5 transition-colors ${lng === attiva ? 'text-oro' : 'text-nebbia'}`}>
                                <Bandiera lingua={lng} />
                                {NOMI[lng]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Variante mobile: le tre lingue in fila, con la bandierina (nel menu del telefono)
    return (
        <div className="flex items-center justify-center gap-3 py-3 border-b border-white/5">
            {LINGUE_SUPPORTATE.map((lng) => (
                <button
                    key={lng}
                    type="button"
                    lang={lng}
                    onClick={() => cambiaLingua(lng)}
                    aria-label={NOMI[lng]}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-body transition-colors ${lng === attiva
                            ? 'text-oro font-medium border border-oro/40'
                            : 'text-nebbia/50 hover:text-nebbia border border-transparent'
                        }`}
                >
                    <Bandiera lingua={lng} />
                    {ETICHETTE[lng]}
                </button>
            ))}
        </div>
    )
}
