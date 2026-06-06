// src/lib/calcoloSalari.js
//
// Helper PURI per il calcolo di salari, bonus e uscite del personale.
// Estratti da GestioneDipendenti per essere condivisi con EntrateUscite
// (conto economico del cliente). Nessuna dipendenza React: solo funzioni pure,
// così la stessa matematica vale per la tabella dipendenti e per i contatori.

// Formatta il salario per la lista (CHF con 2 decimali, con periodicità)
export function fmtSalario(d) {
    if (d.salario === null || d.salario === undefined) return null
    const v = Number(d.salario).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const suffix = d.salario_periodicita === 'mensile' ? '/mese' : '/anno'
    return `CHF ${v}${suffix}`
}

// CHF con 2 decimali per i contatori (contabilità: niente arrotondamento ai franchi)
export function fmtCHF(n) {
    return `CHF ${Number(n || 0).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Salario mensile normalizzato. La percentuale NON entra (5000 al 50% = 5000).
// salario null → 0 (non sposta la somma).
export function salarioMensile(d) {
    const s = Number(d.salario) || 0
    if (s === 0) return 0
    return d.salario_periodicita === 'mensile' ? s : s / 12
}

// Attivo oggi? (nessuna data_fine, o data_fine futura)
export function eAttivoOggi(d) {
    if (!d.data_fine) return true
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(d.data_fine) >= oggi
}

// Mesi lavorati in un dato anno, a mese intero di calendario.
// Cessato ad aprile → 4 (gen-apr). Assunto a settembre → 4 (set-dic).
// Senza assunzione → da gennaio. Senza fine → fino a dicembre.
export function mesiLavoratiAnno(d, anno) {
    const inizioAnno = new Date(anno, 0, 1)
    const fineAnno = new Date(anno, 11, 31)

    const ass = d.data_assunzione ? new Date(d.data_assunzione) : inizioAnno
    const inizio = ass > inizioAnno ? ass : inizioAnno

    const fin = d.data_fine ? new Date(d.data_fine) : fineAnno
    const fine = fin < fineAnno ? fin : fineAnno

    if (fine < inizioAnno || inizio > fineAnno) return 0

    const mesi = (fine.getFullYear() - inizio.getFullYear()) * 12
        + (fine.getMonth() - inizio.getMonth()) + 1
    return Math.max(0, mesi)
}

// Attivo in un mese+anno specifico? (il rapporto copre quel mese)
export function eAttivoNelMese(d, mese, anno) {
    const fineMese = new Date(anno, mese + 1, 0)   // ultimo giorno del mese
    const inizioMese = new Date(anno, mese, 1)
    if (d.data_assunzione && new Date(d.data_assunzione) > fineMese) return false
    if (d.data_fine && new Date(d.data_fine) < inizioMese) return false
    return true
}

// Bonus che cadono in un mese+anno specifico
export function bonusDelMese(listaBonus, mese, anno) {
    return listaBonus
        .filter(b => {
            const dt = new Date(b.data_bonus)
            return dt.getMonth() === mese && dt.getFullYear() === anno
        })
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Tutti i bonus di un anno specifico
export function bonusDellAnnoX(listaBonus, anno) {
    return listaBonus
        .filter(b => new Date(b.data_bonus).getFullYear() === anno)
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Bonus la cui data cade nel mese+anno correnti
export function bonusDelMeseCorrente(listaBonus) {
    const ora = new Date()
    const m = ora.getMonth()
    const a = ora.getFullYear()
    return listaBonus
        .filter(b => {
            const d = new Date(b.data_bonus)
            return d.getMonth() === m && d.getFullYear() === a
        })
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// Tutti i bonus dell'anno corrente
export function bonusDellAnno(listaBonus) {
    const a = new Date().getFullYear()
    return listaBonus
        .filter(b => new Date(b.data_bonus).getFullYear() === a)
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// ─── Aggregati di comodo (usati dai contatori entrate/uscite) ───
// "Rilevanti" per i costi del personale: dipendenti O soci.
function rilevanti(dipendenti) {
    return dipendenti.filter(d => d.is_dipendente || d.is_socio)
}

// Salari di chi era attivo in quel mese+anno (NESSUN bonus). Mirror del BOX 1.
export function salariMeseAttivi(dipendenti, mese, anno) {
    return rilevanti(dipendenti)
        .filter(d => eAttivoNelMese(d, mese, anno))
        .reduce((t, d) => t + salarioMensile(d), 0)
}

// Salari pro-rata sui mesi lavorati nell'anno (NESSUN bonus). Mirror del BOX 3.
export function salariProRataAnno(dipendenti, anno) {
    return rilevanti(dipendenti)
        .reduce((t, d) => t + salarioMensile(d) * mesiLavoratiAnno(d, anno), 0)
}
