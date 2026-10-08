// src/lib/documento/cartaIntestata.js
//
// 08-10-2026: carta intestata dei documenti scritti da Lex, presa dal profilo di chi scarica (versione CH
// della carta IT). Solo per i professionisti: avvocati, fiduciari e progettisti; i privati scaricano il
// documento senza intestazione. Niente marchio Lexum sui documenti da firmare. Le parole che cambiano con
// la lingua (titolo dell'avvocato, albo, IDI) arrivano dal componente (namespace comp_documento_lex).

export const RUOLI_CARTA_INTESTATA = ['avvocato', 'fiduciario', 'progettista']

const pulito = (v) => String(v ?? '').trim()

/**
 * { intestatario: 'Avv. Maria Bernasconi', righe: ['Studio legale Bernasconi', 'Via Nassa 5, 6900 Lugano', ...] } o null
 * @param {object} profile
 * @param {{ titoloAvvocato: string, albo: (cantone: string, numero: string) => string, tel: string, uid: string, iva: string }} testi
 */
export function cartaIntestata(profile, testi) {
    if (!profile || !RUOLI_CARTA_INTESTATA.includes(profile.role)) return null
    const nome = [pulito(profile.nome), pulito(profile.cognome)].filter(Boolean).join(' ')
    const intestatario = nome ? (profile.role === 'avvocato' ? `${testi.titoloAvvocato} ${nome}` : nome) : null
    const studio = pulito(profile.studio) || pulito(profile.ragione_sociale) || null
    const via = [pulito(profile.indirizzo), pulito(profile.numero_civico)].filter(Boolean).join(' ')
    const localita = [pulito(profile.cap), pulito(profile.citta)].filter(Boolean).join(' ')
    const indirizzo = [via, localita].filter(Boolean).join(', ')
    const contatti = [
        pulito(profile.telefono) && `${testi.tel} ${pulito(profile.telefono)}`,
        pulito(profile.email),
    ].filter(Boolean).join(' · ')
    const albo = profile.role === 'avvocato' && (pulito(profile.cantone_albo) || pulito(profile.numero_albo))
        ? testi.albo(pulito(profile.cantone_albo), pulito(profile.numero_albo))
        : ''
    const uid = pulito(profile.uid) ? `${testi.uid} ${pulito(profile.uid)}${profile.iva_attiva ? ` ${testi.iva}` : ''}` : ''
    const righe = [
        studio && studio !== intestatario ? studio : '',
        indirizzo,
        contatti,
        [albo, uid].filter(Boolean).join(' · '),
    ].filter(Boolean)
    if (!intestatario && !righe.length) return null
    return { intestatario: intestatario ?? studio, righe: intestatario ? righe : righe.filter((r) => r !== studio) }
}
