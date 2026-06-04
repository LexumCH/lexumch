// src/pages/PerFiduciari.jsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PerFiduciari() {
    const { i18n } = useTranslation()
    return (
        <div className="min-h-screen bg-petrolio text-nebbia flex items-center justify-center px-6">
            <div className="text-center max-w-md">
                <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-4">In arrivo</p>
                <h1 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                    La pagina per fiduciari arriva presto.
                </h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-8">
                    Stiamo lavorando con consulenti del settore per creare un'esperienza pensata davvero per il vostro lavoro.
                </p>
                <Link to={`/${i18n.language}`} className="inline-block px-6 py-3 border border-oro/40 text-oro font-body text-xs uppercase tracking-widest hover:bg-oro/10 transition-colors">
                    Torna alla home
                </Link>
            </div>
        </div>
    )
}