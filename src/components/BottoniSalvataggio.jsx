// src/components/BottoniSalvataggio.jsx  (LEXUM CH)
// ═══════════════════════════════════════════════════════════════
// Coppia di bottoni "Salva in pratica" + "Aggiungi a etichetta" per un
// elemento del corpus (norma federale/cantonale/UE, sentenza CH/UE, prassi).
//
// Incapsula lo state `ricercaSalvataId` (necessario ad AggiungiAPratica:
// null → INSERT in `ricerche`, poi UPDATE della stessa riga).
//
// Si monta ovunque serva: righe espandibili dei tab e risposte di Lex.
// I guard di ruolo sono interni ai due componenti:
//   - AggiungiAPratica: visibile solo agli avvocati
//   - AggiungiAEtichetta: visibile a tutti gli utenti loggati
//
// Props:
//   tipo     : 'norma_federale'|'norma_cantonale'|'norma_ue'|
//              'giurisprudenza'|'sentenza_ue'|'prassi'
//   id       : id (uuid o bigint) dell'elemento nel corpus
//   titolo   : stringa breve da salvare come titolo della ricerca/pratica
//   testo    : contenuto testuale da salvare
//   variant  : 'default' | 'compact'  (passato ai due bottoni)
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react'
import AggiungiAPratica from '@/components/AggiungiAPratica'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'

export default function BottoniSalvataggio({ tipo, id, titolo, testo, variant = 'compact' }) {
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    if (!tipo || !id) return null

    return (
        <div className="flex flex-wrap items-center gap-2">
            <AggiungiAPratica
                ricerca={{
                    tipo,
                    domanda: (titolo ?? '').slice(0, 300),
                    risposta: testo ?? '',
                    testo: testo ?? '',
                }}
                ricercaSalvataId={ricercaSalvataId}
                setRicercaSalvataId={setRicercaSalvataId}
                variant={variant}
            />
            <AggiungiAEtichetta
                elemento={{ tipo, id }}
                variant={variant}
            />
        </div>
    )
}