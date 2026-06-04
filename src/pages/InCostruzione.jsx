import { Construction } from 'lucide-react'

export default function InCostruzione({ titolo = 'Pagina in arrivo' }) {
    return (
        <div className="flex flex-col items-center justify-center py-32 text-center">
            <Construction size={48} className="text-oro/60 mb-4" />
            <h1 className="font-display text-3xl font-light text-nebbia mb-2">{titolo}</h1>
            <p className="font-body text-sm text-nebbia/40 max-w-sm">
                Questa sezione è in fase di sviluppo e sarà disponibile a breve.
            </p>
        </div>
    )
}