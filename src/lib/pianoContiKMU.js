// src/lib/pianoContiKMU.js
//
// Sottoinsieme curato del piano dei conti svizzero per PMI (Kontenrahmen KMU).
// Viene precaricato per cliente alla prima inizializzazione, poi è editabile.
// Coperti: 1 Attivo, 2 Passivo, 3 Ricavi, 4–8 Costi, 9 Chiusura, con i conti IVA.

export const PIANO_CONTI_KMU = [
    // 1 — ATTIVO
    ['1000', 'Cassa'],
    ['1020', 'Banca (conto corrente)'],
    ['1060', 'Titoli'],
    ['1100', 'Crediti da forniture e prestazioni (Debitori)'],
    ['1170', 'Imposta precedente IVA (a credito)'],
    ['1176', 'Imposta precedente IVA su investimenti'],
    ['1200', 'Scorte di merci'],
    ['1300', 'Ratei e risconti attivi'],
    ['1500', 'Macchine e attrezzature'],
    ['1510', 'Mobilio e installazioni'],
    ['1520', 'Macchine ufficio e informatica'],
    ['1530', 'Veicoli'],
    ['1600', 'Immobili'],
    // 2 — PASSIVO
    ['2000', 'Debiti da forniture e prestazioni (Creditori)'],
    ['2100', 'Debiti bancari a breve termine'],
    ['2200', 'IVA dovuta (imposta sulla cifra d’affari)'],
    ['2201', 'Conteggio IVA verso AFC'],
    ['2270', 'Oneri sociali da versare (AVS/AI/IPG/LPP)'],
    ['2300', 'Ratei e risconti passivi'],
    ['2400', 'Debiti bancari a lungo termine'],
    ['2800', 'Capitale proprio / capitale azionario'],
    ['2891', 'Utile/perdita riportata'],
    ['2900', 'Riserve'],
    ['2979', 'Utile/perdita d’esercizio'],
    // 3 — RICAVI
    ['3000', 'Ricavi da prestazioni di servizi'],
    ['3200', 'Ricavi da vendita merci'],
    ['3400', 'Altri ricavi d’esercizio'],
    ['3800', 'Sconti e ribassi concessi'],
    // 4 — COSTO MATERIALE / MERCI
    ['4000', 'Costo della merce / materiale'],
    ['4400', 'Prestazioni di terzi'],
    // 5 — PERSONALE
    ['5000', 'Salari e stipendi'],
    ['5700', 'Oneri sociali (AVS/AI/IPG/AD)'],
    ['5720', 'Previdenza professionale (LPP)'],
    ['5800', 'Altri costi del personale'],
    // 6 — ALTRI COSTI D’ESERCIZIO
    ['6000', 'Affitto / locazione'],
    ['6100', 'Manutenzioni e riparazioni'],
    ['6200', 'Spese veicoli e trasporti'],
    ['6300', 'Assicurazioni cose e tasse'],
    ['6400', 'Energia e smaltimento'],
    ['6500', 'Spese amministrative (cancelleria)'],
    ['6510', 'Telefono, internet, posta'],
    ['6570', 'Costi informatici'],
    ['6600', 'Pubblicità e marketing'],
    ['6700', 'Altri costi d’esercizio'],
    ['6800', 'Ammortamenti'],
    ['6900', 'Costi finanziari (interessi passivi)'],
    ['6950', 'Ricavi finanziari (interessi attivi)'],
    // 8 — STRAORDINARIO / IMPOSTE
    ['8000', 'Costi e ricavi straordinari'],
    ['8900', 'Imposte dirette'],
    // 9 — CHIUSURA
    ['9100', 'Bilancio d’apertura'],
    ['9200', 'Conto economico (perdite e profitti)'],
]

export function classeDiConto(numero) {
    return parseInt(String(numero).charAt(0), 10) || 0
}

export function tipoDiClasse(classe) {
    if (classe === 1) return 'attivo'
    if (classe === 2) return 'passivo'
    if (classe === 3) return 'ricavo'
    if (classe === 9) return 'chiusura'
    return 'costo' // 4–8
}

export const NOME_CLASSE = {
    1: 'Attivo', 2: 'Passivo', 3: 'Ricavi',
    4: 'Costo merci/materiale', 5: 'Personale', 6: 'Altri costi d’esercizio',
    7: 'Risultato accessorio', 8: 'Straordinario / imposte', 9: 'Chiusura',
}

// Righe pronte per l'insert in piano_conti (mancano solo cliente_id/avvocato_id/studio_id).
export function righeSeedPiano() {
    return PIANO_CONTI_KMU.map(([numero, nome], i) => {
        const classe = classeDiConto(numero)
        return { numero, nome, classe, tipo: tipoDiClasse(classe), ordine: i }
    })
}
