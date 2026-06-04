import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { LINGUE_SUPPORTATE } from '@/i18n'

const ETICHETTE = {
    it: 'IT',
    de: 'DE',
    fr: 'FR',
}

export default function LanguageSwitcher({ variant = 'desktop' }) {
    const { i18n } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()

    async function cambiaLingua(nuovaLingua) {
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

    // Variante desktop: inline IT | DE | FR
    if (variant === 'desktop') {
        return (
            <div className="flex items-center gap-1 text-xs font-body tracking-wider">
                {LINGUE_SUPPORTATE.map((lng, idx) => (
                    <div key={lng} className="flex items-center gap-1">
                        <button
                            onClick={() => cambiaLingua(lng)}
                            className={`transition-colors duration-200 ${i18n.language === lng
                                    ? 'text-oro font-medium'
                                    : 'text-nebbia/40 hover:text-nebbia'
                                }`}
                            aria-label={`Lingua ${ETICHETTE[lng]}`}
                        >
                            {ETICHETTE[lng]}
                        </button>
                        {idx < LINGUE_SUPPORTATE.length - 1 && (
                            <span className="text-nebbia/20">|</span>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    // Variante mobile: stessa logica, layout più ampio (per il menu drawer)
    return (
        <div className="flex items-center justify-center gap-3 py-3 border-b border-white/5">
            {LINGUE_SUPPORTATE.map((lng) => (
                <button
                    key={lng}
                    onClick={() => cambiaLingua(lng)}
                    className={`px-3 py-1 text-xs font-body transition-colors ${i18n.language === lng
                            ? 'text-oro font-medium border border-oro/40'
                            : 'text-nebbia/50 hover:text-nebbia border border-transparent'
                        }`}
                >
                    {ETICHETTE[lng]}
                </button>
            ))}
        </div>
    )
}