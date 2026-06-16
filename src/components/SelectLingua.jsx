// src/components/SelectLingua.jsx
// Select della lingua parlata/preferita dell'utente.
// Salva il codice 'it' | 'de' | 'fr' nella colonna profiles.lingua
// (la stessa che guida l'interfaccia e le email per-utente).
// I nomi delle lingue sono mostrati nel proprio idioma (Italiano / Deutsch / Français).

const NOMI_LINGUA = { it: 'Italiano', de: 'Deutsch', fr: 'Français' }
const ORDINE = ['it', 'de', 'fr']

// Nome leggibile di un codice lingua (per la sola lettura). Fallback = codice.
export function nomeLingua(code) {
    return NOMI_LINGUA[code] || code || ''
}

export default function SelectLingua({ value, onChange, className = '', id }) {
    const base = 'w-full bg-petrolio border text-nebbia font-body text-sm px-4 py-3 outline-none transition-colors'
    return (
        <select
            id={id}
            value={value || 'it'}
            onChange={e => onChange(e.target.value)}
            className={className || `${base} border-white/10 focus:border-oro/50`}
        >
            {ORDINE.map(c => (
                <option key={c} value={c}>{NOMI_LINGUA[c]}</option>
            ))}
        </select>
    )
}
