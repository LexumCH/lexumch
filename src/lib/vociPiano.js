// Voci delle schede abbonamento, generate dai dati del prodotto (03-10-2026).
//
// Prima le schede avevano un elenco scritto a mano («Gestione clienti
// illimitati» anche per piani con 50 clienti). Ora ogni numero viene da
// public.prodotti: se cambia il prodotto, cambia la scheda.
//
// I testi stanno nel namespace «comp_voci_piano» (it/de/fr): chi chiama passa
// la t di useTranslation('comp_voci_piano').
//
// Le funzioni elencate in fondo esistono davvero per chi compra il piano:
//   pratiche (avvocato) /pratiche · mandati (fiduciario) /banco-lavoro ·
//   progetti (progettista) /progetti
//   generatore documenti  → ChatPratica, ChatMandato, GeneraDocumentoProgetto
//   fatture e calendario  → /fatturazione, /calendario (tutti i professionisti)
// Il calcolatore della parcella forense c'è solo su lexum.it: qui non si elenca.

// Segnaposti usati nel listino per «senza limite»
const SENZA_LIMITE = 999999
const ACCESSI_SENZA_LIMITE = 999

const num = (v) => Number(v ?? 0) || 0
const cifra = (n, locale) => n.toLocaleString(locale ?? 'de-CH')

/** «Mensile», «Annuale», «6 mesi», «Una tantum». */
export function etichettaDurata(p, t) {
    const mesi = num(p?.durata_mesi)
    if (!mesi) return t('durata.una_tantum')
    if (mesi === 1) return t('durata.mensile')
    if (mesi === 12) return t('durata.annuale')
    return t('durata.mesi', { mesi })
}

/** Suffisso del prezzo: «al mese», «all'anno», «per 6 mesi». */
export function periodoPrezzo(p, t) {
    const mesi = num(p?.durata_mesi)
    if (!mesi) return ''
    if (mesi === 1) return t('periodo.mese')
    if (mesi === 12) return t('periodo.anno')
    return t('periodo.mesi', { mesi })
}

/** Elenco delle voci della scheda, già tradotte, nell'ordine in cui vanno mostrate. */
export function vociPiano(p, t, locale) {
    if (!p) return []
    const voci = []
    const crediti = num(p.crediti_ai_mensili)
    const gb = num(p.spazio_gb)
    const clienti = num(p.limite_clienti)
    const accessi = num(p.posti) || 1

    if (p.include_banca_dati) voci.push(t('voce.banca_dati'))

    if (crediti >= SENZA_LIMITE) voci.push(t('voce.crediti_illimitati'))
    else if (crediti > 0) voci.push(t('voce.crediti', { n: cifra(crediti, locale) }))

    if (gb >= SENZA_LIMITE) voci.push(t('voce.archivio_illimitato'))
    else if (gb > 0) voci.push(t('voce.archivio', { n: cifra(gb, locale) }))

    if (clienti >= SENZA_LIMITE) voci.push(t('voce.clienti_illimitati'))
    else if (clienti > 0) voci.push(t('voce.clienti', { n: cifra(clienti, locale) }))

    voci.push(accessi >= ACCESSI_SENZA_LIMITE
        ? t('voce.accessi_illimitati')
        : t('voce.accessi', { n: cifra(accessi, locale) }))

    voci.push(t(p.target_role === 'fiduciario' ? 'voce.mandati'
        : p.target_role === 'progettista' ? 'voce.progetti'
            : 'voce.pratiche'))
    voci.push(t('voce.generatore'))
    voci.push(t('voce.fatture'))
    voci.push(t('voce.calendario'))

    return voci
}
