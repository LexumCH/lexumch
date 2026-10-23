// src/lib/pianoContiKMU.js
//
// Sottoinsieme curato del piano dei conti svizzero per PMI (Kontenrahmen KMU).
// Viene precaricato per cliente alla prima inizializzazione, poi è editabile.
// Coperti: 1 Attivo, 2 Passivo, 3 Ricavi, 4–8 Costi, 9 Chiusura, con i conti IVA.
//
// 09-10-2026 (conto annuale CO): ogni conto ha la sua posta di legge (`posta_co`): una voce del bilancio
// (art. 959a CO) o del conto economico per natura (art. 959b cpv. 2 CO). La propone il numero del conto,
// con la stessa tabella della funzione posta_co_predefinita del database; il tipo del conto (attivo,
// passivo, ricavo, costo) segue la posta. Aggiunti i conti che mancavano per coprire tutte le poste.

// [numero, { it, de, fr }]: il nome del conto nella lingua del fiduciario che crea il piano (diciture del
// Kontenrahmen KMU in tedesco e del plan comptable PME in francese). 10-10-2026: prima erano solo in italiano.
export const PIANO_CONTI_KMU = [
    // 1 — ATTIVO
    ['1000', { it: 'Cassa', de: 'Kasse', fr: 'Caisse' }],
    ['1020', { it: 'Banca (conto corrente)', de: 'Bankguthaben', fr: 'Avoirs bancaires' }],
    ['1060', { it: 'Titoli', de: 'Wertschriften', fr: 'Titres' }],
    ['1100', { it: 'Crediti da forniture e prestazioni (Debitori)', de: 'Forderungen aus Lieferungen und Leistungen (Debitoren)', fr: 'Créances résultant de ventes et de prestations (débiteurs)' }],
    ['1140', { it: 'Anticipi e prestiti a breve termine', de: 'Vorschüsse und Darlehen', fr: 'Avances et prêts' }],
    ['1170', { it: 'Imposta precedente IVA (a credito)', de: 'Vorsteuer MWST', fr: 'Impôt préalable TVA' }],
    ['1176', { it: 'Imposta precedente IVA su investimenti', de: 'Vorsteuer MWST auf Investitionen', fr: 'Impôt préalable TVA sur investissements' }],
    ['1190', { it: 'Altri crediti a breve termine', de: 'Sonstige kurzfristige Forderungen', fr: 'Autres créances à court terme' }],
    ['1200', { it: 'Scorte di merci', de: 'Handelswaren', fr: 'Stock de marchandises' }],
    ['1280', { it: 'Lavori in corso (prestazioni non fatturate)', de: 'Nicht fakturierte Dienstleistungen', fr: 'Prestations de services non facturées (travaux en cours)' }],
    ['1300', { it: 'Ratei e risconti attivi', de: 'Aktive Rechnungsabgrenzungen', fr: 'Actifs de régularisation' }],
    ['1400', { it: 'Immobilizzazioni finanziarie (titoli e prestiti a lungo termine)', de: 'Finanzanlagen (Wertschriften, langfristige Darlehen)', fr: 'Immobilisations financières (titres, prêts à long terme)' }],
    ['1480', { it: 'Partecipazioni', de: 'Beteiligungen', fr: 'Participations' }],
    ['1500', { it: 'Macchine e attrezzature', de: 'Maschinen und Apparate', fr: 'Machines et appareils' }],
    ['1510', { it: 'Mobilio e installazioni', de: 'Mobiliar und Einrichtungen', fr: 'Mobilier et installations' }],
    ['1520', { it: 'Macchine ufficio e informatica', de: 'Büromaschinen, Informatik, Kommunikationstechnologie', fr: 'Machines de bureau, informatique, technologies de communication' }],
    ['1530', { it: 'Veicoli', de: 'Fahrzeuge', fr: 'Véhicules' }],
    ['1600', { it: 'Immobili', de: 'Geschäftsliegenschaften', fr: "Immeubles d'exploitation" }],
    ['1700', { it: 'Immobilizzazioni immateriali (software, licenze, marchi)', de: 'Immaterielle Werte (Software, Lizenzen, Marken)', fr: 'Immobilisations incorporelles (logiciels, licences, marques)' }],
    // 2 — PASSIVO
    ['2000', { it: 'Debiti da forniture e prestazioni (Creditori)', de: 'Verbindlichkeiten aus Lieferungen und Leistungen (Kreditoren)', fr: "Dettes résultant d'achats et de prestations (créanciers)" }],
    ['2100', { it: 'Debiti bancari a breve termine', de: 'Bankverbindlichkeiten kurzfristig', fr: 'Dettes bancaires à court terme' }],
    ['2200', { it: 'IVA dovuta (imposta sulla cifra d’affari)', de: 'Geschuldete MWST (Umsatzsteuer)', fr: 'TVA due' }],
    ['2201', { it: 'Conteggio IVA verso AFC', de: 'Abrechnungskonto MWST', fr: 'Décompte TVA' }],
    ['2208', { it: 'Imposte dirette dovute', de: 'Direkte Steuern', fr: 'Impôts directs dus' }],
    ['2210', { it: 'Altri debiti a breve termine', de: 'Sonstige kurzfristige Verbindlichkeiten', fr: 'Autres dettes à court terme' }],
    ['2261', { it: 'Dividendi deliberati', de: 'Beschlossene Ausschüttungen', fr: 'Dividendes décidés' }],
    ['2270', { it: 'Oneri sociali da versare (AVS/AI/IPG/LPP)', de: 'Sozialversicherungen und Vorsorgeeinrichtungen (AHV/IV/EO/BVG)', fr: 'Assurances sociales et institutions de prévoyance (AVS/AI/APG/LPP)' }],
    ['2300', { it: 'Ratei e risconti passivi', de: 'Passive Rechnungsabgrenzungen', fr: 'Passifs de régularisation' }],
    ['2330', { it: 'Accantonamenti a breve termine', de: 'Kurzfristige Rückstellungen', fr: 'Provisions à court terme' }],
    ['2400', { it: 'Debiti bancari a lungo termine', de: 'Bankverbindlichkeiten langfristig', fr: 'Dettes bancaires à long terme' }],
    ['2500', { it: 'Altri debiti a lungo termine', de: 'Übrige langfristige Verbindlichkeiten', fr: 'Autres dettes à long terme' }],
    ['2600', { it: 'Accantonamenti', de: 'Rückstellungen', fr: 'Provisions' }],
    ['2800', { it: 'Capitale proprio / capitale azionario', de: 'Eigenkapital / Aktienkapital', fr: 'Capital propre / capital-actions' }],
    ['2850', { it: 'Conto privato (ditte individuali e società di persone)', de: 'Privat (Einzelunternehmen und Personengesellschaften)', fr: 'Compte privé (entreprises individuelles et sociétés de personnes)' }],
    ['2891', { it: 'Utile/perdita riportata', de: 'Gewinnvortrag / Verlustvortrag', fr: 'Bénéfice reporté / perte reportée' }],
    ['2900', { it: 'Riserva legale da capitale', de: 'Gesetzliche Kapitalreserve', fr: 'Réserve légale issue du capital' }],
    ['2950', { it: 'Riserva legale da utili', de: 'Gesetzliche Gewinnreserve', fr: 'Réserve légale issue du bénéfice' }],
    ['2960', { it: 'Riserve facoltative da utili', de: 'Freiwillige Gewinnreserven', fr: 'Réserves facultatives issues du bénéfice' }],
    ['2979', { it: 'Utile/perdita d’esercizio', de: 'Jahresgewinn / Jahresverlust', fr: "Bénéfice / perte de l'exercice" }],
    // 3 — RICAVI
    ['3000', { it: 'Ricavi da prestazioni di servizi', de: 'Dienstleistungserlöse', fr: 'Produits des prestations de services' }],
    ['3200', { it: 'Ricavi da vendita merci', de: 'Handelserlöse', fr: 'Produits des ventes de marchandises' }],
    ['3400', { it: 'Altri ricavi d’esercizio', de: 'Übrige Erlöse aus Lieferungen und Leistungen', fr: 'Autres produits des ventes et prestations' }],
    ['3800', { it: 'Sconti e ribassi concessi', de: 'Erlösminderungen (Skonti, Rabatte)', fr: 'Déductions sur les produits (escomptes, rabais)' }],
    ['3900', { it: 'Variazione delle scorte di prodotti', de: 'Bestandesänderungen unfertige und fertige Erzeugnisse', fr: 'Variation des stocks de produits finis et semi-finis' }],
    ['3940', { it: 'Variazione dei lavori in corso (prestazioni non fatturate)', de: 'Bestandesänderungen nicht fakturierte Dienstleistungen', fr: 'Variation des prestations de services non facturées' }],
    // 4 — COSTO MATERIALE / MERCI
    ['4000', { it: 'Costo della merce / materiale', de: 'Material- und Warenaufwand', fr: 'Charges de matériel et de marchandises' }],
    ['4400', { it: 'Prestazioni di terzi', de: 'Aufwand für bezogene Dienstleistungen', fr: 'Prestations de tiers' }],
    // 5 — PERSONALE
    ['5000', { it: 'Salari e stipendi', de: 'Lohnaufwand', fr: 'Salaires' }],
    ['5700', { it: 'Oneri sociali (AVS/AI/IPG/AD)', de: 'Sozialversicherungsaufwand (AHV/IV/EO/ALV)', fr: 'Charges sociales (AVS/AI/APG/AC)' }],
    ['5720', { it: 'Previdenza professionale (LPP)', de: 'Berufliche Vorsorge (BVG)', fr: 'Prévoyance professionnelle (LPP)' }],
    ['5800', { it: 'Altri costi del personale', de: 'Übriger Personalaufwand', fr: 'Autres charges de personnel' }],
    // 6 — ALTRI COSTI D’ESERCIZIO
    ['6000', { it: 'Affitto / locazione', de: 'Raumaufwand / Miete', fr: 'Charges de locaux / loyer' }],
    ['6100', { it: 'Manutenzioni e riparazioni', de: 'Unterhalt, Reparaturen, Ersatz', fr: 'Entretien, réparations, remplacement' }],
    ['6200', { it: 'Spese veicoli e trasporti', de: 'Fahrzeug- und Transportaufwand', fr: 'Charges de véhicules et de transport' }],
    ['6300', { it: 'Assicurazioni cose e tasse', de: 'Sachversicherungen, Abgaben, Gebühren', fr: 'Assurances-choses, droits, taxes' }],
    ['6400', { it: 'Energia e smaltimento', de: 'Energie- und Entsorgungsaufwand', fr: "Charges d'énergie et d'élimination des déchets" }],
    ['6500', { it: 'Spese amministrative (cancelleria)', de: 'Verwaltungsaufwand (Büromaterial)', fr: "Charges d'administration (fournitures de bureau)" }],
    ['6510', { it: 'Telefono, internet, posta', de: 'Telefon, Internet, Porti', fr: 'Téléphone, internet, frais de port' }],
    ['6570', { it: 'Costi informatici', de: 'Informatikaufwand', fr: 'Charges informatiques' }],
    ['6600', { it: 'Pubblicità e marketing', de: 'Werbeaufwand', fr: 'Publicité et marketing' }],
    ['6700', { it: 'Altri costi d’esercizio', de: 'Sonstiger betrieblicher Aufwand', fr: "Autres charges d'exploitation" }],
    ['6800', { it: 'Ammortamenti', de: 'Abschreibungen', fr: 'Amortissements' }],
    ['6900', { it: 'Costi finanziari (interessi passivi)', de: 'Finanzaufwand (Zinsaufwand)', fr: 'Charges financières (intérêts passifs)' }],
    ['6950', { it: 'Ricavi finanziari (interessi attivi)', de: 'Finanzertrag (Zinsertrag)', fr: 'Produits financiers (intérêts actifs)' }],
    // 8 — ESTRANEO, STRAORDINARIO, IMPOSTE
    ['8000', { it: 'Costi estranei all’esercizio', de: 'Betriebsfremder Aufwand', fr: 'Charges hors exploitation' }],
    ['8100', { it: 'Ricavi estranei all’esercizio', de: 'Betriebsfremder Ertrag', fr: 'Produits hors exploitation' }],
    ['8500', { it: 'Costi straordinari, unici o di altri periodi', de: 'Ausserordentlicher, einmaliger oder periodenfremder Aufwand', fr: 'Charges exceptionnelles, uniques ou hors période' }],
    ['8510', { it: 'Ricavi straordinari, unici o di altri periodi', de: 'Ausserordentlicher, einmaliger oder periodenfremder Ertrag', fr: 'Produits exceptionnels, uniques ou hors période' }],
    ['8900', { it: 'Imposte dirette', de: 'Direkte Steuern', fr: 'Impôts directs' }],
    // 9 — CHIUSURA
    ['9100', { it: 'Bilancio d’apertura', de: 'Eröffnungsbilanz', fr: "Bilan d'ouverture" }],
    ['9200', { it: 'Conto economico (perdite e profitti)', de: 'Erfolgsrechnung (Gewinn und Verlust)', fr: 'Compte de résultat (pertes et profits)' }],
]

// Nomi che il piano standard ha usato prima: anche questi si possono rinominare nella lingua scelta
const NOMI_PRECEDENTI = { '8000': ['Costi e ricavi straordinari'], '2900': ['Riserve'] }

const LINGUE_PIANO = ['it', 'de', 'fr']
const linguaPiano = (lingua) => (LINGUE_PIANO.includes(lingua) ? lingua : 'it')

// Il nome standard di un conto nella lingua chiesta (null se il numero non è nel piano standard)
export function nomeContoStandard(numero, lingua = 'it') {
    const voce = PIANO_CONTI_KMU.find(([n]) => n === String(numero))
    return voce ? voce[1][linguaPiano(lingua)] : null
}

// true se il nome è uno dei nomi standard di quel numero, in una lingua qualsiasi: si può rinominare
// senza toccare un nome scelto dal fiduciario
export function eNomeStandard(numero, nome) {
    const voce = PIANO_CONTI_KMU.find(([n]) => n === String(numero))
    if (!voce) return false
    const pulito = String(nome ?? '').trim()
    return Object.values(voce[1]).includes(pulito) || (NOMI_PRECEDENTI[voce[0]] ?? []).includes(pulito)
}

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
const NOME_CLASSE_LINGUE = {
    it: NOME_CLASSE,
    de: {
        1: 'Aktiven', 2: 'Passiven', 3: 'Betrieblicher Ertrag aus Lieferungen und Leistungen',
        4: 'Material- und Warenaufwand', 5: 'Personalaufwand', 6: 'Übriger betrieblicher Aufwand, Abschreibungen, Finanzerfolg',
        7: 'Betrieblicher Nebenerfolg', 8: 'Betriebsfremder und ausserordentlicher Erfolg, Steuern', 9: 'Abschluss',
    },
    fr: {
        1: 'Actifs', 2: 'Passifs', 3: 'Produits des ventes et prestations',
        4: 'Charges de matériel et de marchandises', 5: 'Charges de personnel', 6: "Autres charges d'exploitation, amortissements, résultat financier",
        7: 'Résultat des activités annexes', 8: 'Résultat hors exploitation et exceptionnel, impôts', 9: 'Clôture',
    },
}
export const nomeClasse = (classe, lingua = 'it') => NOME_CLASSE_LINGUE[linguaPiano(lingua)][classe] ?? null

// ─── Poste di legge (art. 959a e 959b CO) ───

// Bilancio: attivo per liquidità, passivo per esigibilità, nell'ordine dell'art. 959a.
// pas_accantonamenti_bt e cp_privato sono poste in più (art. 959a cpv. 3).
export const STRUTTURA_BILANCIO = [
    {
        sezione: 'attivo',
        gruppi: [
            { gruppo: 'attivo_circolante', poste: ['att_liquidita', 'att_crediti_ff', 'att_altri_crediti', 'att_scorte', 'att_ratei'] },
            { gruppo: 'attivo_fisso', poste: ['att_imm_finanziarie', 'att_partecipazioni', 'att_imm_materiali', 'att_imm_immateriali', 'att_capitale_non_versato'] },
        ],
    },
    {
        sezione: 'passivo',
        gruppi: [
            { gruppo: 'terzi_breve', poste: ['pas_debiti_ff', 'pas_debiti_onerosi_bt', 'pas_altri_debiti_bt', 'pas_ratei', 'pas_accantonamenti_bt'] },
            { gruppo: 'terzi_lungo', poste: ['pas_debiti_onerosi_lt', 'pas_altri_debiti_lt', 'pas_accantonamenti'] },
            { gruppo: 'capitale_proprio', poste: ['cp_capitale', 'cp_privato', 'cp_riserva_capitale', 'cp_riserva_utili', 'cp_riserve_facoltative', 'cp_utile_riportato', 'cp_utile_esercizio', 'cp_quote_proprie'] },
        ],
    },
]

// Conto economico per natura (metodo della produzione, art. 959b cpv. 2): le poste nell'ordine di legge,
// costi e ricavi finanziari, estranei e straordinari separati (niente compensazione, art. 958c cpv. 1 n. 7),
// con i risultati intermedi d'uso. ce_altri_ricavi è una posta in più (art. 959b cpv. 5).
export const STRUTTURA_CE = [
    { posta: 'ce_ricavi' },
    { posta: 'ce_altri_ricavi' },
    { posta: 'ce_variazione_scorte' },
    { subtotale: 'totale_ricavi' },
    { posta: 'ce_materiale' },
    { posta: 'ce_personale' },
    { posta: 'ce_altri_costi' },
    { subtotale: 'ebitda' },
    { posta: 'ce_ammortamenti' },
    { subtotale: 'ebit' },
    { posta: 'ce_fin_costi' },
    { posta: 'ce_fin_ricavi' },
    { subtotale: 'risultato_ordinario' },
    { posta: 'ce_estranei_costi' },
    { posta: 'ce_estranei_ricavi' },
    { posta: 'ce_straordinari_costi' },
    { posta: 'ce_straordinari_ricavi' },
    { subtotale: 'risultato_prima_imposte' },
    { posta: 'ce_imposte' },
    { subtotale: 'risultato_esercizio' },
]

export const POSTE_CE = STRUTTURA_CE.filter(r => r.posta).map(r => r.posta)
export const POSTE_BILANCIO = STRUTTURA_BILANCIO.flatMap(s => s.gruppi.flatMap(g => g.poste))
export const TUTTE_LE_POSTE = [...POSTE_BILANCIO, ...POSTE_CE, 'tecnico']

const POSTE_RICAVO = new Set(['ce_ricavi', 'ce_altri_ricavi', 'ce_variazione_scorte', 'ce_fin_ricavi', 'ce_estranei_ricavi', 'ce_straordinari_ricavi'])

// Il tipo che la posta impone al conto (come posta_co_tipo nel database)
export function tipoDiPosta(posta) {
    if (!posta) return null
    if (posta.startsWith('att_')) return 'attivo'
    if (posta.startsWith('pas_') || posta.startsWith('cp_')) return 'passivo'
    if (POSTE_RICAVO.has(posta)) return 'ricavo'
    if (posta.startsWith('ce_')) return 'costo'
    if (posta === 'tecnico') return 'chiusura'
    return null
}

// La posta proposta dal numero del conto: stessa tabella di posta_co_predefinita (database).
// Nella classe 7 e nelle fasce 8200-8499 e 8520-8899 decide il tipo.
export function postaPredefinita(numero, tipo = null) {
    const s = String(numero ?? '')
    if (!/^[0-9]{4}/.test(s)) return null
    const v = parseInt(s.slice(0, 4), 10)
    const tra = (a, b) => v >= a && v <= b
    if (tra(1000, 1099)) return 'att_liquidita'
    if (tra(1100, 1139)) return 'att_crediti_ff'
    if (tra(1140, 1199)) return 'att_altri_crediti'
    if (tra(1200, 1299)) return 'att_scorte'
    if (tra(1300, 1399)) return 'att_ratei'
    if (tra(1400, 1479)) return 'att_imm_finanziarie'
    if (tra(1480, 1499)) return 'att_partecipazioni'
    if (tra(1500, 1699)) return 'att_imm_materiali'
    if (tra(1700, 1799)) return 'att_imm_immateriali'
    if (tra(1800, 1899)) return 'att_capitale_non_versato'
    if (tra(2000, 2099)) return 'pas_debiti_ff'
    if (tra(2100, 2199)) return 'pas_debiti_onerosi_bt'
    if (tra(2200, 2299)) return 'pas_altri_debiti_bt'
    if (tra(2300, 2329)) return 'pas_ratei'
    if (tra(2330, 2399)) return 'pas_accantonamenti_bt'
    if (tra(2400, 2499)) return 'pas_debiti_onerosi_lt'
    if (tra(2500, 2599)) return 'pas_altri_debiti_lt'
    if (tra(2600, 2699)) return 'pas_accantonamenti'
    if (tra(2800, 2849)) return 'cp_capitale'
    if (tra(2850, 2889)) return 'cp_privato'
    if (tra(2890, 2899)) return 'cp_utile_riportato'
    if (tra(2900, 2939)) return 'cp_riserva_capitale'
    if (tra(2940, 2959)) return 'cp_riserva_utili'
    if (tra(2960, 2969)) return 'cp_riserve_facoltative'
    if (tra(2970, 2978)) return 'cp_utile_riportato'
    if (v === 2979) return 'cp_utile_esercizio'
    if (tra(2980, 2989)) return 'cp_quote_proprie'
    if (tra(3000, 3899)) return 'ce_ricavi'
    if (tra(3900, 3999)) return 'ce_variazione_scorte'
    if (tra(4000, 4999)) return 'ce_materiale'
    if (tra(5000, 5999)) return 'ce_personale'
    if (tra(6000, 6799)) return 'ce_altri_costi'
    if (tra(6800, 6899)) return 'ce_ammortamenti'
    if (tra(6900, 6949)) return 'ce_fin_costi'
    if (tra(6950, 6999)) return 'ce_fin_ricavi'
    if (tra(7000, 7999)) {
        const t = tipo ?? (Math.floor(v / 10) % 2 === 0 ? 'ricavo' : 'costo')
        return t === 'ricavo' ? 'ce_altri_ricavi' : 'ce_altri_costi'
    }
    if (tra(8000, 8099)) return 'ce_estranei_costi'
    if (tra(8100, 8199)) return 'ce_estranei_ricavi'
    if (tra(8200, 8499)) return tipo === 'ricavo' ? 'ce_estranei_ricavi' : 'ce_estranei_costi'
    if (tra(8500, 8509)) return 'ce_straordinari_costi'
    if (tra(8510, 8519)) return 'ce_straordinari_ricavi'
    if (tra(8520, 8899)) return tipo === 'ricavo' ? 'ce_straordinari_ricavi' : 'ce_straordinari_costi'
    if (tra(8900, 8999)) return 'ce_imposte'
    if (tra(9000, 9999)) return 'tecnico'
    return null
}

// Righe pronte per l'insert in piano_conti (mancano solo cliente_id/avvocato_id/studio_id).
// `presenti`: numeri già nel piano del cliente, per aggiungere solo i conti standard che mancano.
// `lingua`: lingua dei nomi dei conti (quella del fiduciario).
export function righeSeedPiano(presenti = null, lingua = 'it') {
    const gia = presenti ? new Set(presenti.map(String)) : null
    return PIANO_CONTI_KMU
        .map(([numero, nomi], i) => {
            const classe = classeDiConto(numero)
            const posta_co = postaPredefinita(numero)
            return { numero, nome: nomi[linguaPiano(lingua)], classe, tipo: tipoDiPosta(posta_co) ?? tipoDiClasse(classe), posta_co, ordine: i }
        })
        .filter(r => !gia || !gia.has(r.numero))
}
