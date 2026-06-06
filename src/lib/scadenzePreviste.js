// src/lib/scadenzePreviste.js
//
// Movimenti PREVISTI → scadenze (box mandato) + appuntamenti tipo 'scadenza'
// (calendario). Una scadenza per occorrenza nei prossimi 12 mesi (i ricorrenti
// sono espansi). Tutto best-effort: non blocca mai il salvataggio del movimento.
//
// Pulizia: la cancellazione è gestita dal DB (FK movimento_id ON DELETE CASCADE
// + trigger che elimina l'appuntamento collegato). In edit, prima si ripulisce
// con eliminaScadenzePreviste, poi si rigenera.

import { espandiPrevisto } from './calcoloLiquidita'

const fmtImporto = (n) => Number(n || 0).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Elimina le scadenze (e, via trigger DB, gli appuntamenti) di un movimento.
export async function eliminaScadenzePreviste(supabase, movimentoId) {
    if (!movimentoId) return
    try {
        await supabase.from('scadenze_fiduciarie').delete().eq('movimento_id', movimentoId)
    } catch { /* best-effort */ }
}

// Genera scadenza + appuntamento per ogni occorrenza futura (≤ 12 mesi) di un previsto.
export async function generaScadenzePreviste(supabase, mov, user, studioId) {
    try {
        if (!mov || mov.stato !== 'previsto' || !mov.data || !user) return
        const oggi = new Date()
        const da = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 1)   // oggi incluso
        const a = new Date(oggi.getFullYear(), oggi.getMonth() + 12, oggi.getDate())
        const occorrenze = espandiPrevisto(mov, da, a)
        if (!occorrenze.length) return

        const tipoScad = mov.tipo === 'entrata' ? 'incasso previsto' : 'pagamento previsto'
        const etichetta = mov.descrizione || (mov.tipo === 'entrata' ? 'Entrata prevista' : 'Uscita prevista')
        const titolo = `Previsto: ${etichetta} — CHF ${fmtImporto(mov.importo)}`

        for (const occ of occorrenze) {
            const giorno = occ.data.toISOString().slice(0, 10)
            const { data: app } = await supabase.from('appuntamenti').insert({
                titolo,
                tipo: 'scadenza',
                stato: 'programmato',
                data_ora_inizio: `${giorno}T09:00:00+00:00`,
                data_ora_fine: `${giorno}T09:30:00+00:00`,
                cliente_id: mov.cliente_id,
                mandato_id: mov.mandato_id ?? null,
                avvocato_id: user.id,
                studio_id: studioId ?? null,
            }).select('id').single()

            await supabase.from('scadenze_fiduciarie').insert({
                mandato_id: mov.mandato_id ?? null,
                cliente_id: mov.cliente_id,
                avvocato_id: user.id,
                studio_id: studioId ?? null,
                titolo,
                tipo: tipoScad,
                data_scadenza: giorno,
                stato: 'in_corso',
                movimento_id: mov.id,
                appuntamento_id: app?.id ?? null,
                creato_da: user.id,
            })
        }
    } catch { /* best-effort: il movimento è salvato comunque */ }
}
