// src/components/EtichetteAssegnate.jsx
// Mostra le etichette assegnate a un elemento (norma, sentenza, prassi, ricerca)
// come pill cliccabili che navigano alla pagina dettaglio dell'etichetta.
// Si aggiorna automaticamente quando il refreshKey cambia.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function EtichetteAssegnate({ elemento, refreshKey = 0 }) {
    const { t } = useTranslation('comp_etichette_assegnate')
    const navigate = useNavigate()
    const { profile } = useAuth()

    const [etichette, setEtichette] = useState([])
    const [loading, setLoading] = useState(true)

    const basePath = (profile?.role === 'avvocato' || profile?.role === 'fiduciario') ? '/etichette' : '/area/etichette'
   
    useEffect(() => {
        if (!elemento?.id || !elemento?.tipo) return
        let attivo = true

        async function carica() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user || !attivo) return

                const { data } = await supabase
                    .from('elementi_etichette')
                    .select('etichetta:etichetta_id(id, nome, colore)')
                    .eq('elemento_id', String(elemento.id))
                    .eq('tipo', elemento.tipo)
                    .eq('user_id', user.id)

                if (!attivo) return
                const list = (data ?? [])
                    .map(r => r.etichetta)
                    .filter(Boolean)
                setEtichette(list)
            } catch (e) {
                console.warn('EtichetteAssegnate:', e.message)
            } finally {
                if (attivo) setLoading(false)
            }
        }
        carica()
        return () => { attivo = false }
    }, [elemento?.id, elemento?.tipo, refreshKey])

    if (loading || etichette.length === 0) return null

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {etichette.map(e => (
                <button
                    key={e.id}
                    type="button"
                    onClick={() => navigate(`${basePath}/${e.id}`)}
                    className="flex items-center gap-1.5 font-body text-xs font-medium px-2.5 py-1 border hover:opacity-80 transition-opacity cursor-pointer"
                    style={{
                        borderColor: `${e.colore}80`,
                        color: e.colore,
                        backgroundColor: `${e.colore}22`
                    }}
                    title={t('tooltip.apri_etichetta', { nome: e.nome })}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                    {e.nome}
                </button>
            ))}
        </div>
    )
}