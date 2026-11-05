// La prova gratuita dello studio, come su Lexum IT. Dal 05-11-2026 non parte più alla conferma dell'email: avvocati e
// progettisti la attivano con un clic da «Completa il profilo» quando ci sono documento d'identità, iscrizione al
// registro e dati di fatturazione. Nessuno la deve approvare: il controllo è nel database (attiva_prova_gratuita) e i
// documenti si guardano dopo. Se l'admin li rifiuta la prova si ferma e l'utente vede il motivo; se li ricarica e
// vengono approvati, riparte. I fiduciari per ora non la vedono (04-11-2026), come i commercialisti su IT.
// La consulenza resta per chi la vuole: è un ticket già scritto.
import { supabase, supabaseUrl } from '@/lib/supabase'

// Lo stesso controllo del server: qui serve solo a non mostrare un pulsante che verrebbe rifiutato
export function puoAttivareProva(profilo) {
    if (!profilo || profilo.prova_gratuita_usata || profilo.titolare_id) return false
    if (profilo.role !== 'user') return profilo.role === 'avvocato' || profilo.role === 'progettista'
    const dichiarata = profilo.tipo_richiesta ?? profilo.professione
    if (dichiarata === 'fiduciario') return false
    return dichiarata === 'avvocato' || dichiarata === 'progettista' || profilo.verification_status === 'approved'
}

export async function attivaProvaGratuita() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${supabaseUrl}/functions/v1/activate-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return json
}
