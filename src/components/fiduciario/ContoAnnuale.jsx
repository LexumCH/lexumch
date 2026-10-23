// src/components/fiduciario/ContoAnnuale.jsx
//
// 09-10-2026: il conto annuale CO di un esercizio (art. 958 cpv. 2: bilancio, conto economico e allegato), per
// tutti i fiduciari (decisione dell'utente). Stesso schema dei documenti di Lex: i numeri li calcola il sito
// dal libro mastro (src/lib/contoAnnuale.js, mai l'intelligenza artificiale), l'allegato lo scrive Sonnet 5.5
// dalle risposte al questionario (lex-allegato-conto-annuale, 1 credito), il fiduciario lo rivede sul foglio a
// mano o con Haiku (correzioni gratis), poi PDF. «Definitivo» solo a esercizio chiuso: i numeri restano fissati
// in conti_annuali.dati e il PDF va nell'archivio del cliente, da stampare e firmare (art. 958 cpv. 3, 958f).
// Se l'esercizio si riapre, il definitivo diventa «superato» e si riprende da una nuova bozza.
//
// 10-10-2026: proposta d'impiego dell'utile (SA, Sagl, cooperativa) nel documento e, dopo l'assemblea, la sua
// registrazione nel libro giornale; firma elettronica facoltativa: si carica il PDF firmato (o la scansione della
// copia firmata a mano), Lexum legge chi ha firmato e se è lo stesso PDF definitivo.
//
// Props: clienteId, cliente (profilo del cliente), esercizio e precedente (da elencoEsercizi), righe (libro
// mastro), onCambiato (ricarica i report), onVaiAChiusura (apre la chiusura dell'esercizio).

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, Loader2, AlertCircle, AlertTriangle, Info, Check, Lock, Wand2, Save, Stamp, History, ChevronDown, ChevronRight, FileText, Upload, ExternalLink, PenLine, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { fmtCHF } from '@/lib/calcoloSalari'
import { STRUTTURA_BILANCIO, POSTE_CE } from '@/lib/pianoContiKMU'
import { calcolaContoAnnuale, controlliContoAnnuale, bilancioDaApertura, etichettaEsercizio, dataCH, isoOggi, impiegoUtile, righeImpiego, FORME_CON_IMPIEGO, r2 } from '@/lib/contoAnnuale'
import { analizzaFirmePdf, contieneOriginale } from '@/lib/documento/firmePdf'
import { LINGUE_DOCUMENTO, TESTI_CO, etichettaPosta, testoCO, tipoForma as riconosciForma, personaGiuridica, ruoliFirma } from '@/lib/contoAnnualeTesti'
import { codiceErroreContabilita } from '@/lib/contabilitaDati'
import { salvaInArchivio, titolareDi } from '@/lib/archivio'
import { apriFile } from '@/lib/fileSpazio'
import { separaNote, segnaposti } from '@/lib/documento/testoDocumento'
import DocumentoLex from '@/components/DocumentoLex'

const LOCALI = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// Le domande dell'allegato (art. 959c CO; 959a cpv. 4). 'testo' = riga, 'area' = più righe
const DOMANDE = [
    ['principi', 'area'],
    ['spiegazioni_poste', 'area'],
    ['partecipazioni', 'area'],
    ['quote_proprie', 'area'],
    ['leasing', 'testo'],
    ['debiti_previdenza', 'testo'],
    ['garanzie_terzi', 'testo'],
    ['attivi_in_garanzia', 'testo'],
    ['impegni_condizionali', 'area'],
    ['diritti_partecipazione', 'area'],
    ['straordinari', 'area'],
    ['eventi_successivi', 'area'],
    ['crediti_debiti_partecipanti', 'area'],
    ['revisione_dimissioni', 'testo'],
    ['margine_capitale', 'testo'],
    ['riserve_latenti', 'testo'],
    ['prestiti_obbligazionari', 'testo'],
    ['altre_informazioni', 'area'],
]
const FASCE_POSTI = ['fino_10', 'fino_50', 'fino_250', 'oltre_250']
// Come arriva al modello (lo traduce lui nella lingua del documento)
const POSTI_PER_LEX = {
    fino_10: 'la media annua dei posti di lavoro a tempo pieno non supera 10',
    fino_50: 'la media annua dei posti di lavoro a tempo pieno non supera 50',
    fino_250: 'la media annua dei posti di lavoro a tempo pieno non supera 250',
    oltre_250: 'la media annua dei posti di lavoro a tempo pieno supera 250',
}

const num = (v) => { const n = Number(String(v ?? '').replace(/['’\s]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
// La proposta d'impiego dell'utile è proposta d'ufficio per le società con assemblea che decide l'impiego dell'utile
const IMPIEGO_PREDEFINITO = ['sa', 'sagl', 'cooperativa']
const CAMPI_IMPIEGO = ['riserva_legale', 'dividendo', 'riserve_facoltative', 'prelievo_riserve']
const nomeFile = (s) => String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)

function scaricaBlob(blob, nome) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export default function ContoAnnuale({ clienteId, cliente, esercizio, precedente, righe, onCambiato, onVaiAChiusura }) {
    const { t, i18n } = useTranslation(['comp_fid_conto_annuale', 'comp_fid_report_contabili'])
    const { user, profile } = useAuth()
    const linguaUi = ['de', 'fr'].includes(i18n.language) ? i18n.language : 'it'
    const locale = LOCALI[linguaUi]
    const tipo = riconosciForma(cliente?.forma_giuridica, cliente?.tipo_soggetto)
    const pg = personaGiuridica(tipo)
    const ditta = (cliente?.ragione_sociale || [cliente?.nome, cliente?.cognome].filter(Boolean).join(' ')).trim()
    const sede = (cliente?.sede_legale || cliente?.citta || '').trim()
    const linguaPredefinita = LINGUE_DOCUMENTO.includes(String(cliente?.lingua ?? '').slice(0, 2)) ? String(cliente.lingua).slice(0, 2) : linguaUi
    const chiuso = esercizio?.stato === 'chiuso'

    const [conto, setConto] = useState(null)
    const [superati, setSuperati] = useState([])
    const [caricamento, setCaricamento] = useState(true)
    const [bozza, setBozza] = useState(null)
    const [modificato, setModificato] = useState(false)
    const [lavoro, setLavoro] = useState(null)   // 'avvia' | 'salva' | 'allegato' | 'pdf' | 'definitivo' | 'scarica'
    const [errore, setErrore] = useState('')
    const [esito, setEsito] = useState('')
    const [numeriDaVerificare, setNumeriDaVerificare] = useState([])
    const [conferma, setConferma] = useState(false)
    const [apertoPrecedente, setApertoPrecedente] = useState(false)
    const [registrazioneImpiego, setRegistrazioneImpiego] = useState(null)   // { id, data }: impiego già nel libro giornale
    const [dialogoImpiego, setDialogoImpiego] = useState(null)               // { data, riserva_legale, dividendo, ... }
    const [pianoConti, setPianoConti] = useState(null)

    const messaggio = (e) => {
        const codice = codiceErroreContabilita(e)
        if (codice) return t(`errori_db.${codice}`, { ns: 'comp_fid_report_contabili', inizio: dataCH(esercizio.inizio), fine: dataCH(esercizio.fine) })
        if (e?.codice) return t(`archivio.${e.codice}`)
        return sanitizzaErrore(e?.message, t('errori.generico')) ?? t('errori.generico')
    }

    const firmeProposte = () => {
        const [r1, r2] = ruoliFirma(tipo)
        const rappresentante = [cliente?.rappr_nome, cliente?.rappr_cognome].filter(Boolean).join(' ')
        const titolare = [cliente?.nome, cliente?.cognome].filter(Boolean).join(' ')
        return [{ ruolo: r1, nome: tipo === 'ditta' ? titolare : rappresentante }, { ruolo: r2, nome: '' }]
    }

    const bozzaDa = (riga) => ({
        lingua: riga?.lingua ?? linguaPredefinita,
        questionario: { ...(riga?.questionario ?? {}) },
        allegato: riga?.allegato_md ?? '',
        firme: riga?.firme?.length ? riga.firme : firmeProposte(),
        luogo: riga?.luogo ?? sede,
        data: riga?.data_documento ?? isoOggi(),
        cifre: { ce: {}, bilancio: {}, usaManuali: false, primoEsercizio: false, ...(riga?.cifre_precedenti ?? {}) },
        impiego: { includi: IMPIEGO_PREDEFINITO.includes(tipo), holding: false, riserva_legale: '', dividendo: '', riserve_facoltative: '', prelievo_riserve: '', ...(riga?.impiego_utile ?? {}) },
    })

    useEffect(() => { carica() }, [esercizio?.id, esercizio?.inizio])

    async function carica() {
        setCaricamento(true); setErrore(''); setEsito(''); setNumeriDaVerificare([])
        if (!esercizio?.id) {
            setConto(null); setSuperati([]); setBozza(null); setCaricamento(false)
            return
        }
        const { data, error } = await supabase.from('conti_annuali').select('*').eq('esercizio_id', esercizio.id).order('created_at', { ascending: false })
        if (error) { setErrore(messaggio(error)); setCaricamento(false); return }
        const corrente = (data ?? []).find(r => r.stato !== 'superato') ?? null
        setConto(corrente)
        setSuperati((data ?? []).filter(r => r.stato === 'superato'))
        setBozza(corrente ? bozzaDa(corrente) : null)
        setModificato(false)
        setRegistrazioneImpiego(null)
        if (corrente?.stato === 'definitivo' && corrente.archivio_documento_id) {
            const { data: reg } = await supabase.from('registrazioni').select('id, data')
                .eq('cliente_id', clienteId).eq('documento_id', corrente.archivio_documento_id).limit(1)
            setRegistrazioneImpiego(reg?.[0] ?? null)
        }
        setCaricamento(false)
    }

    const aggiorna = (campi) => { setBozza(b => ({ ...b, ...campi })); setModificato(true) }
    const aggiornaQuestionario = (k, v) => { setBozza(b => ({ ...b, questionario: { ...b.questionario, [k]: v } })); setModificato(true) }
    const aggiornaCifre = (campi) => { setBozza(b => ({ ...b, cifre: { ...b.cifre, ...campi } })); setModificato(true) }
    const aggiornaImpiego = (campi) => { setBozza(b => ({ ...b, impiego: { ...b.impiego, ...campi } })); setModificato(true) }

    const definitivo = conto?.stato === 'definitivo'
    const cifre = bozza?.cifre ?? conto?.cifre_precedenti ?? null
    const calcolo = useMemo(() => calcolaContoAnnuale({ righe, esercizio, precedente, cifrePrecedenti: cifre }), [righe, esercizio, precedente, cifre])
    const primoEsercizio = !!cifre?.primoEsercizio
    const controlli = useMemo(() => controlliContoAnnuale(calcolo, { personaGiuridica: pg, esercizioChiuso: chiuso, primoEsercizio }), [calcolo, pg, chiuso, primoEsercizio])
    const conImpiego = FORME_CON_IMPIEGO.includes(tipo)
    const impiego = useMemo(() => (conImpiego ? impiegoUtile(calcolo.attuale, bozza?.impiego ?? {}) : null), [conImpiego, calcolo, bozza?.impiego])
    const includeImpiego = conImpiego && !!bozza?.impiego?.includi
    const anteprimaImpiego = useMemo(() => (dialogoImpiego && pianoConti
        ? righeImpiego({ righe, conti: pianoConti, data: dialogoImpiego.data, scelte: dialogoImpiego })
        : null), [dialogoImpiego, pianoConti, righe])
    const richiedeAllegato = pg || bozza?.questionario?.redigi_allegato === 'si'
    const corpoAllegato = bozza?.allegato ? separaNote(bozza.allegato).corpo : ''
    const daCompletare = corpoAllegato ? segnaposti(corpoAllegato).length : 0
    const lingua = bozza?.lingua ?? linguaPredefinita
    const anagrafica = { ditta, forma: cliente?.forma_giuridica ?? '', sede, idi: cliente?.uid ?? '' }

    // Cosa manca per il definitivo (gli avvisi non bloccano)
    const blocchi = []
    if (!chiuso) blocchi.push('esercizio_aperto')
    if (!ditta) blocchi.push('ditta')
    if (controlli.some(c => c.livello === 'errore')) blocchi.push('numeri')
    if (richiedeAllegato && !corpoAllegato) blocchi.push('allegato')
    if (richiedeAllegato && daCompletare > 0) blocchi.push('segnaposti')
    if (!bozza?.firme?.length || bozza.firme.some(f => !String(f.nome ?? '').trim())) blocchi.push('firme')
    if (includeImpiego && impiego?.errori.length) blocchi.push('impiego')

    // ─── Azioni ───

    async function avvia(copiaDa = null) {
        setLavoro('avvia'); setErrore('')
        try {
            let esercizioId = esercizio.id
            if (!esercizioId) {
                const { data, error } = await supabase.from('esercizi_contabili').insert({
                    cliente_id: clienteId, inizio: esercizio.inizio, fine: esercizio.fine,
                    avvocato_id: user?.id, studio_id: profile?.studio_id ?? null, creato_da: user?.id,
                }).select('id').single()
                if (error) throw error
                esercizioId = data.id
            }
            const { error } = await supabase.from('conti_annuali').insert({
                cliente_id: clienteId, esercizio_id: esercizioId,
                avvocato_id: user?.id, studio_id: profile?.studio_id ?? null, creato_da: user?.id,
                lingua: copiaDa?.lingua ?? linguaPredefinita,
                questionario: copiaDa?.questionario ?? {},
                allegato_md: copiaDa?.allegato_md ?? null,
                firme: copiaDa?.firme ?? firmeProposte(),
                luogo: copiaDa?.luogo ?? sede,
                data_documento: isoOggi(),
                cifre_precedenti: copiaDa?.cifre_precedenti ?? null,
            })
            if (error) throw error
            if (!esercizio.id) await onCambiato?.()
            else await carica()
        } catch (e) {
            setErrore(messaggio(e))
        } finally {
            setLavoro(null)
        }
    }

    async function salva({ silenzioso = false, extra = {} } = {}) {
        if (!conto || !bozza) return true
        if (!silenzioso) setLavoro('salva')
        setErrore('')
        const { error } = await supabase.from('conti_annuali').update({
            lingua: bozza.lingua,
            questionario: bozza.questionario,
            allegato_md: bozza.allegato || null,
            firme: bozza.firme,
            luogo: bozza.luogo || null,
            data_documento: bozza.data || null,
            cifre_precedenti: bozza.cifre,
            impiego_utile: bozza.impiego,
            ...extra,
        }).eq('id', conto.id)
        if (!silenzioso) setLavoro(null)
        if (error) { setErrore(messaggio(error)); return false }
        setModificato(false)
        if (!silenzioso) setEsito(t('esiti.salvato'))
        return true
    }

    function datiPerLex() {
        const voci = (poste) => poste.flatMap(p => (calcolo.dettaglio[p] ?? []).map(d => ({
            posta: testoCO('it', `poste.${p}`), conto: `${d.c.numero} ${d.c.nome}`, importo: d.valore,
        })))
        const a = calcolo.attuale
        return {
            ricavi_netti: a.ce.ce_ricavi,
            risultato_esercizio: a.risultato,
            totale_attivo: a.totaleAttivo,
            capitale_proprio: a.gruppi.capitale_proprio,
            poste_straordinarie: voci(['ce_straordinari_costi', 'ce_straordinari_ricavi']),
            poste_estranee: voci(['ce_estranei_costi', 'ce_estranei_ricavi']),
            ...(calcolo.precedente ? { risultato_esercizio_precedente: calcolo.precedente.risultato } : {}),
        }
    }

    async function scriviAllegato() {
        setLavoro('allegato'); setErrore(''); setEsito(''); setNumeriDaVerificare([])
        try {
            if (modificato && !(await salva({ silenzioso: true }))) return
            const q = { ...bozza.questionario }
            delete q.redigi_allegato
            if (q.posti_lavoro) q.posti_lavoro = POSTI_PER_LEX[q.posti_lavoro] ?? q.posti_lavoro
            const { data, error } = await supabase.functions.invoke('lex-allegato-conto-annuale', {
                headers: { 'x-lingua': linguaUi },
                body: {
                    cliente_id: clienteId,
                    lingua,
                    esercizio: { inizio: esercizio.inizio, fine: esercizio.fine },
                    anagrafica: { ditta, forma_giuridica: anagrafica.forma, sede, idi: anagrafica.idi },
                    persona_giuridica: pg,
                    dati: datiPerLex(),
                    questionario: q,
                },
            })
            if (error) {
                let corpo = null
                try { corpo = await error.context?.json?.() } catch { corpo = null }
                throw new Error(sanitizzaErrore(corpo?.error, t('errori.allegato')) ?? t('errori.allegato'))
            }
            if (!data?.ok || !data.allegato) throw new Error(sanitizzaErrore(data?.error, t('errori.allegato')) ?? t('errori.allegato'))
            setBozza(b => ({ ...b, allegato: data.allegato }))
            setNumeriDaVerificare(data.numeri_da_verificare ?? [])
            const { error: e2 } = await supabase.from('conti_annuali').update({ allegato_md: data.allegato, allegato_scritto_il: new Date().toISOString() }).eq('id', conto.id)
            if (e2) throw e2
            setEsito(t('esiti.allegato_scritto'))
        } catch (e) {
            setErrore(e?.message || t('errori.allegato'))
        } finally {
            setLavoro(null)
        }
    }

    async function creaPdf(finale) {
        const { creaPdfContoAnnuale } = await import('@/lib/documento/pdfContoAnnuale')
        return creaPdfContoAnnuale({
            lingua,
            anagrafica,
            tipoForma: tipo,
            esercizio,
            precedente: calcolo.precedente ? precedente : null,
            calcolo,
            allegatoMd: richiedeAllegato ? bozza.allegato : null,
            senzaAllegato: !richiedeAllegato,
            primoEsercizio,
            firme: bozza.firme,
            luogo: bozza.luogo,
            data: bozza.data,
            bozza: !finale,
            impiego: includeImpiego ? impiego : null,
        })
    }
    const nomePdf = () => `${nomeFile(`${testoCO(lingua, 'documento.titolo')} ${etichettaEsercizio(esercizio)} - ${ditta}`)}.pdf`

    async function anteprima() {
        setLavoro('pdf'); setErrore('')
        try {
            scaricaBlob(await creaPdf(false), nomePdf())
        } catch {
            setErrore(t('errori.pdf'))
        } finally {
            setLavoro(null)
        }
    }

    async function rendiDefinitivo() {
        setConferma(false)
        setLavoro('definitivo'); setErrore(''); setEsito('')
        let doc = null
        try {
            if (!(await salva({ silenzioso: true }))) return
            const blob = await creaPdf(true)
            const nome = nomePdf()
            const { testoPerArchivio } = await import('@/lib/documento/pdfContoAnnuale')
            doc = await salvaInArchivio({
                file: new File([blob], nome, { type: 'application/pdf' }),
                testo: testoPerArchivio({ lingua, anagrafica, esercizio, calcolo, allegatoMd: richiedeAllegato ? bozza.allegato : null, tipoForma: tipo, impiego: includeImpiego ? impiego : null }),
                titolareId: titolareDi(profile),
                userId: user?.id,
                titolo: nome.replace(/\.pdf$/i, ''),
                clienteId,
                metadati: { origine: 'conto_annuale', conto_annuale_id: conto.id, esercizio: { inizio: esercizio.inizio, fine: esercizio.fine } },
            })
            const dati = {
                versione: 1,
                calcolato_il: new Date().toISOString(),
                lingua,
                tipo_forma: tipo,
                anagrafica,
                esercizio: { inizio: esercizio.inizio, fine: esercizio.fine },
                esercizio_precedente: calcolo.precedente ? { inizio: precedente.inizio, fine: precedente.fine } : null,
                fonte_precedente: calcolo.fontePrecedente,
                attuale: calcolo.attuale,
                precedente: calcolo.precedente,
                poste_ce: calcolo.posteCeVisibili,
                poste_bilancio: calcolo.posteBilancioVisibili,
                impiego: includeImpiego ? { ...impiego, holding: !!bozza.impiego.holding } : null,
            }
            const { error } = await supabase.from('conti_annuali').update({ stato: 'definitivo', dati, archivio_documento_id: doc.id }).eq('id', conto.id)
            if (error) throw error
            await carica()
            setEsito(t('esiti.definitivo'))
        } catch (e) {
            if (doc?.id) {
                await supabase.from('archivio_documenti').delete().eq('id', doc.id).then(() => { }, () => { })
                if (doc.storage_path) await supabase.storage.from('archivio').remove([doc.storage_path]).catch(() => { })
            }
            setErrore(messaggio(e))
        } finally {
            setLavoro(null)
        }
    }

    async function scaricaArchiviato(riga) {
        if (!riga?.archivio_documento_id) return
        setLavoro('scarica'); setErrore('')
        try {
            // Si apre con l'accesso di chi è entrato, senza collegamento temporaneo (lib/fileSpazio).
            // apriFile apre la scheda subito, dentro il clic, e poi cerca il percorso.
            await apriFile(async () => {
                const { data: doc, error } = await supabase.from('archivio_documenti').select('storage_path, titolo').eq('id', riga.archivio_documento_id).maybeSingle()
                if (error || !doc) throw error ?? new Error(t('errori.archivio_mancante'))
                return { bucket: 'archivio', percorso: doc.storage_path, nome: `${nomeFile(doc.titolo || 'conto-annuale')}.pdf` }
            })
        } catch (e) {
            setErrore(messaggio(e))
        } finally {
            setLavoro(null)
        }
    }

    // ─── Impiego dell'utile deciso dall'assemblea: la registrazione nel libro giornale ───

    async function apriRegistraImpiego() {
        setErrore('')
        if (!pianoConti) {
            const { data, error } = await supabase.from('piano_conti').select('id, numero, nome, posta_co').eq('cliente_id', clienteId)
            if (error) { setErrore(messaggio(error)); return }
            setPianoConti(data ?? [])
        }
        const proposta = conto.dati?.impiego ?? {}
        setDialogoImpiego({
            data: isoOggi(),
            riserva_legale: String(proposta.riserva ?? ''),
            dividendo: String(proposta.dividendo ?? ''),
            riserve_facoltative: String(proposta.facoltative ?? ''),
            prelievo_riserve: String(proposta.prelievo ?? ''),
        })
    }

    async function registraImpiego() {
        const a = anteprimaImpiego
        if (!a || a.mancanti.length || !a.righe.length) return
        setLavoro('impiego'); setErrore('')
        const { data: reg, error } = await supabase.from('registrazioni').insert({
            cliente_id: clienteId,
            data: dialogoImpiego.data,
            descrizione: t('registra_impiego.descrizione', { esercizio: etichettaEsercizio(esercizio), data: dataCH(dialogoImpiego.data) }),
            tipo: 'ordinaria',
            documento_id: conto.archivio_documento_id,   // il giustificativo: il conto annuale approvato
            avvocato_id: user?.id, studio_id: profile?.studio_id ?? null, creato_da: user?.id, aggiornato_da: user?.id,
        }).select('id').single()
        if (error) { setLavoro(null); setErrore(messaggio(error)); return }
        const { error: e2 } = await supabase.from('righe_registrazione').insert(a.righe.map((r, i) => ({
            registrazione_id: reg.id, conto_id: r.conto.id, dare: r.dare, avere: r.avere, ordine: i,
        })))
        if (e2) {
            await supabase.from('registrazioni').delete().eq('id', reg.id)
            setLavoro(null); setErrore(messaggio(e2)); return
        }
        setLavoro(null)
        setDialogoImpiego(null)
        await onCambiato?.()
    }

    // ─── Versione firmata (facoltativa): firma elettronica o scansione della copia firmata a mano ───

    async function caricaFirmato(evento) {
        const file = evento.target.files?.[0]
        evento.target.value = ''
        if (!file) return
        if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) { setErrore(t('firma.errori.formato')); return }
        if (file.size > 25 * 1024 * 1024) { setErrore(t('firma.errori.troppo_grande')); return }
        setLavoro('firma'); setErrore(''); setEsito('')
        let doc = null
        try {
            const byte = new Uint8Array(await file.arrayBuffer())
            const { firme, marche } = analizzaFirmePdf(byte)
            const { data: originale } = await supabase.from('archivio_documenti').select('storage_path, titolo, testo_estratto').eq('id', conto.archivio_documento_id).maybeSingle()
            // Firme aggiunte in coda al PDF definitivo: il file firmato comincia con i suoi byte
            let stesso = null
            if (firme.length && originale?.storage_path) {
                const { data: blob } = await supabase.storage.from('archivio').download(originale.storage_path)
                if (blob) stesso = contieneOriginale(new Uint8Array(await blob.arrayBuffer()), byte)
            }
            const titolo = `${originale?.titolo ?? nomePdf().replace(/\.pdf$/i, '')} (${t('firma.firmato')})`
            doc = await salvaInArchivio({
                file: new File([byte], `${nomeFile(titolo)}.pdf`, { type: 'application/pdf' }),
                testo: originale?.testo_estratto ?? null,
                titolareId: titolareDi(profile),
                userId: user?.id,
                titolo,
                clienteId,
                metadati: { origine: 'conto_annuale_firmato', conto_annuale_id: conto.id, firma: firme.length ? 'elettronica' : 'autografa' },
            })
            const firma = {
                tipo: firme.length ? 'elettronica' : 'autografa',
                firme: firme.map(f => ({ nome: f.nome, data: f.data, formato: f.formato })),
                marche,
                stesso_documento: stesso,
                nome_file: file.name.slice(0, 200),
            }
            const { error } = await supabase.from('conti_annuali').update({ firmato_documento_id: doc.id, firma }).eq('id', conto.id)
            if (error) throw error
            await carica()
            setEsito(firme.length ? t('esiti.firma_elettronica', { count: firme.length }) : t('esiti.firma_autografa'))
        } catch (e) {
            if (doc?.id) {
                await supabase.from('archivio_documenti').delete().eq('id', doc.id).then(() => { }, () => { })
                if (doc.storage_path) await supabase.storage.from('archivio').remove([doc.storage_path]).catch(() => { })
            }
            setErrore(messaggio(e))
        } finally {
            setLavoro(null)
        }
    }

    // ─── Interfaccia ───

    const pulsante = 'flex items-center gap-1.5 font-body text-xs text-nebbia/70 hover:text-oro border border-white/10 hover:border-oro/40 px-3 py-1.5 transition-colors disabled:opacity-40'
    const inputCls = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25'
    const scheda = 'bg-slate border border-white/5 p-4 space-y-3'
    const titoloScheda = 'font-body text-[10px] text-nebbia/40 uppercase tracking-widest'
    const valoreControllo = (v) => Object.fromEntries(Object.entries(v ?? {}).map(([k, x]) => [k, typeof x === 'number' && !['n'].includes(k) ? fmtCHF(x) : x]))

    if (caricamento) return <div className="flex items-center justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>

    const intestazioneCliente = (
        <div className={scheda}>
            <p className={titoloScheda}>{t('intestazione.titolo')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 font-body text-sm">
                <p><span className="text-nebbia/40">{t('intestazione.ditta')}: </span><span className={ditta ? 'text-nebbia' : 'text-amber-400'}>{ditta || t('intestazione.manca')}</span></p>
                <p><span className="text-nebbia/40">{t('intestazione.forma')}: </span><span className={cliente?.forma_giuridica ? 'text-nebbia' : 'text-amber-400'}>{cliente?.forma_giuridica || t('intestazione.manca')}</span>
                    <span className="text-nebbia/35 text-xs"> · {t(`forme.${tipo}`)}</span></p>
                <p><span className="text-nebbia/40">{t('intestazione.sede')}: </span><span className={sede ? 'text-nebbia' : 'text-amber-400'}>{sede || t('intestazione.manca')}</span></p>
                <p><span className="text-nebbia/40">{t('intestazione.idi')}: </span><span className={cliente?.uid ? 'text-nebbia' : 'text-nebbia/35'}>{cliente?.uid || t('intestazione.facoltativo')}</span></p>
            </div>
            {(!ditta || !cliente?.forma_giuridica || !sede) && <p className="font-body text-xs text-amber-400/80">{t('intestazione.completa')}</p>}
            <p className="font-body text-xs text-nebbia/40">{pg ? t('obblighi.persona_giuridica') : tipo === 'altro' ? t('obblighi.altro') : t('obblighi.persona_fisica')}</p>
        </div>
    )

    // Nessun conto annuale per questo esercizio
    if (!conto) {
        return (
            <div className="space-y-4">
                {intestazioneCliente}
                <div className={`${scheda} text-center py-8`}>
                    <FileText size={26} className="text-nebbia/20 mx-auto" />
                    <p className="font-body text-sm text-nebbia/60">{t('vuoto.titolo', { esercizio: etichettaEsercizio(esercizio) })}</p>
                    <p className="font-body text-xs text-nebbia/35 max-w-lg mx-auto">{t('vuoto.spiegazione')}</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                        <button onClick={() => avvia(null)} disabled={!!lavoro} className="flex items-center gap-2 px-4 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                            {lavoro === 'avvia' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} {t('vuoto.avvia')}
                        </button>
                        {superati[0] && (
                            <button onClick={() => avvia(superati[0])} disabled={!!lavoro} className={pulsante}>
                                <History size={12} /> {t('vuoto.riprendi_superato')}
                            </button>
                        )}
                    </div>
                </div>
                {errore && <Avviso tipo="errore" testo={errore} />}
                <Superati superati={superati} t={t} locale={locale} onScarica={scaricaArchiviato} lavoro={lavoro} />
            </div>
        )
    }

    // Definitivo
    if (definitivo) {
        const d = conto.dati ?? {}
        return (
            <div className="space-y-4">
                <div className="border border-salvia/30 bg-salvia/5 p-4 space-y-2">
                    <p className="flex items-center gap-2 font-body text-sm text-salvia"><Stamp size={15} /> {t('definitivo.titolo', { data: conto.definitivo_il ? new Date(conto.definitivo_il).toLocaleDateString(locale) : '' })}</p>
                    <p className="font-body text-xs text-nebbia/60">{t('definitivo.firma')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {[['totale_attivo', d.attuale?.totaleAttivo], ['risultato', d.attuale?.risultato], ['capitale_proprio', d.attuale?.gruppi?.capitale_proprio], ['lingua', null]].map(([k, v]) => (
                            <div key={k}>
                                <p className="font-body text-[10px] uppercase tracking-widest text-nebbia/35">{t(`definitivo.${k}`)}</p>
                                <p className="font-display text-sm text-nebbia">{k === 'lingua' ? t(`lingue.${conto.lingua}`) : fmtCHF(v ?? 0)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button onClick={() => scaricaArchiviato(conto)} disabled={!!lavoro} className={pulsante}>
                            {lavoro === 'scarica' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} {t('definitivo.scarica')}
                        </button>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/35">{t('definitivo.modificare')}</p>
                </div>

                {/* Proposta d'impiego dell'utile e sua registrazione dopo l'assemblea */}
                {d.impiego && (
                    <div className={scheda}>
                        <p className={titoloScheda}>{t('impiego.titolo_scheda')}</p>
                        <RiepilogoImpiego impiego={d.impiego} t={t} />
                        {registrazioneImpiego ? (
                            <p className="flex items-center gap-1.5 font-body text-xs text-salvia"><Check size={13} /> {t('registra_impiego.registrato', { data: dataCH(registrazioneImpiego.data) })}</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="font-body text-xs text-nebbia/45">{t('registra_impiego.spiegazione')}</p>
                                <button onClick={apriRegistraImpiego} disabled={!!lavoro} className={pulsante}><BookOpen size={12} /> {t('registra_impiego.pulsante')}</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Firma (facoltativa) */}
                <div className={scheda}>
                    <p className={titoloScheda}>{t('firma.titolo')}</p>
                    {conto.firmato_documento_id ? (
                        <div className="space-y-2">
                            {conto.firma?.tipo === 'elettronica' ? (
                                <>
                                    <p className="flex items-center gap-1.5 font-body text-sm text-salvia"><PenLine size={14} /> {t('firma.elettronica', { count: conto.firma.firme?.length ?? 0 })}</p>
                                    <ul className="space-y-0.5 pl-5">
                                        {(conto.firma.firme ?? []).map((f, i) => (
                                            <li key={i} className="font-body text-xs text-nebbia/70 list-disc">{f.nome || t('firma.senza_nome')}{f.data ? ` · ${dataCH(f.data)}` : ''}</li>
                                        ))}
                                    </ul>
                                    {conto.firma.marche > 0 && <p className="font-body text-xs text-nebbia/45">{t('firma.marche', { count: conto.firma.marche })}</p>}
                                    {conto.firma.stesso_documento === true && <p className="flex items-center gap-1.5 font-body text-xs text-salvia/80"><Check size={12} /> {t('firma.stesso_si')}</p>}
                                    {conto.firma.stesso_documento === false && <Avviso tipo="avviso" testo={t('firma.stesso_no')} />}
                                    <a href="https://www.validator.admin.ch" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs text-oro/80 hover:text-oro underline">
                                        {t('firma.validatore')} <ExternalLink size={11} />
                                    </a>
                                </>
                            ) : (
                                <p className="font-body text-xs text-nebbia/65">{t('firma.autografa', { data: conto.firmato_il ? new Date(conto.firmato_il).toLocaleDateString(locale) : '' })} {t('firma.conserva')}</p>
                            )}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button onClick={() => scaricaArchiviato({ archivio_documento_id: conto.firmato_documento_id })} disabled={!!lavoro} className={pulsante}>
                                    <FileDown size={12} /> {t('firma.scarica')}
                                </button>
                                <label className={`${pulsante} cursor-pointer`}>
                                    {lavoro === 'firma' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} {t('firma.sostituisci')}
                                    <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={!!lavoro} onChange={caricaFirmato} />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">{t('firma.spiegazione')}</p>
                            <label className={`${pulsante} cursor-pointer w-fit`}>
                                {lavoro === 'firma' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} {lavoro === 'firma' ? t('firma.in_corso') : t('firma.carica')}
                                <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={!!lavoro} onChange={caricaFirmato} />
                            </label>
                        </div>
                    )}
                </div>

                {errore && <Avviso tipo="errore" testo={errore} />}
                {esito && <Avviso tipo="ok" testo={esito} />}
                <Superati superati={superati} t={t} locale={locale} onScarica={scaricaArchiviato} lavoro={lavoro} />

                {dialogoImpiego && (
                    <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (lavoro !== 'impiego') setDialogoImpiego(null) }}>
                        <div className="bg-slate border border-oro/30 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 p-5 border-b border-white/8">
                                <BookOpen size={16} className="text-oro" />
                                <h3 className="font-display text-lg text-nebbia">{t('registra_impiego.titolo', { esercizio: etichettaEsercizio(esercizio) })}</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">{t('registra_impiego.istruzioni')}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block sm:col-span-2">
                                        <span className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">{t('registra_impiego.data')}</span>
                                        <input type="date" value={dialogoImpiego.data} onChange={e => setDialogoImpiego(x => ({ ...x, data: e.target.value }))} className={inputCls} />
                                    </label>
                                    {CAMPI_IMPIEGO.map(k => (
                                        <label key={k} className="block">
                                            <span className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">{t(`impiego.campi.${k}`)}</span>
                                            <input value={dialogoImpiego[k]} inputMode="decimal" placeholder="0.00" onChange={e => setDialogoImpiego(x => ({ ...x, [k]: e.target.value }))} className={`${inputCls} text-right`} />
                                        </label>
                                    ))}
                                </div>
                                {anteprimaImpiego?.mancanti.length > 0 ? (
                                    <Avviso tipo="errore" testo={t('registra_impiego.mancanti', { conti: anteprimaImpiego.mancanti.join(', ') })} />
                                ) : anteprimaImpiego && (
                                    <div className="border border-white/10">
                                        <p className="px-3 py-2 font-body text-[10px] uppercase tracking-widest text-nebbia/35 border-b border-white/10">{t('registra_impiego.anteprima')}</p>
                                        {anteprimaImpiego.righe.map((r, i) => (
                                            <div key={i} className="grid grid-cols-[1fr_90px_90px] gap-2 px-3 py-1 font-body text-xs">
                                                <span className="text-nebbia/70 truncate">{r.conto.numero} · {r.conto.nome}</span>
                                                <span className="text-right text-nebbia/70">{r.dare ? fmtCHF(r.dare) : ''}</span>
                                                <span className="text-right text-nebbia/70">{r.avere ? fmtCHF(r.avere) : ''}</span>
                                            </div>
                                        ))}
                                        <p className={`px-3 py-2 border-t border-white/10 font-body text-xs ${anteprimaImpiego.riporto < 0 ? 'text-amber-400' : 'text-nebbia/60'}`}>
                                            {t('registra_impiego.riporto', { importo: fmtCHF(anteprimaImpiego.riporto) })}
                                        </p>
                                    </div>
                                )}
                                {errore && <Avviso tipo="errore" testo={errore} />}
                                <div className="flex gap-2">
                                    <button onClick={() => setDialogoImpiego(null)} disabled={lavoro === 'impiego'} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">{t('azioni.annulla')}</button>
                                    <button onClick={registraImpiego} disabled={lavoro === 'impiego' || !anteprimaImpiego || anteprimaImpiego.mancanti.length > 0 || !anteprimaImpiego.righe.length}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                                        {lavoro === 'impiego' ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />} {t('registra_impiego.conferma')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Bozza
    const precedenteAMano = calcolo.fontePrecedente !== 'mastro'
    return (
        <div className="space-y-4">
            {intestazioneCliente}

            {/* Controlli */}
            <div className={scheda}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className={titoloScheda}>{t('controlli.titolo')}</p>
                    <label className="flex items-center gap-2 font-body text-xs text-nebbia/60">
                        {t('lingua.etichetta')}
                        <select value={lingua} onChange={e => aggiorna({ lingua: e.target.value })} className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-1 outline-none focus:border-oro/50">
                            {LINGUE_DOCUMENTO.map(l => <option key={l} value={l}>{t(`lingue.${l}`)}</option>)}
                        </select>
                    </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[['totale_attivo', calcolo.attuale.totaleAttivo], ['totale_passivo', calcolo.attuale.totalePassivo], ['risultato', calcolo.attuale.risultato], ['capitale_proprio', calcolo.attuale.gruppi.capitale_proprio]].map(([k, v]) => (
                        <div key={k} className="bg-petrolio/40 border border-white/5 px-3 py-2">
                            <p className="font-body text-[10px] uppercase tracking-widest text-nebbia/35">{t(`riepilogo.${k}`)}</p>
                            <p className={`font-display text-sm ${v < 0 ? 'text-red-400' : 'text-nebbia'}`}>{fmtCHF(v)}</p>
                        </div>
                    ))}
                </div>
                <ul className="space-y-1.5">
                    {controlli.map(c => (
                        <li key={c.codice} className={`flex items-start gap-2 font-body text-xs ${c.livello === 'errore' ? 'text-red-400' : c.livello === 'avviso' ? 'text-amber-400/90' : 'text-nebbia/55'}`}>
                            {c.livello === 'errore' ? <AlertCircle size={13} className="mt-0.5 shrink-0" /> : c.livello === 'avviso' ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <Info size={13} className="mt-0.5 shrink-0" />}
                            <span>{t(`controlli.${c.codice}`, valoreControllo(c.valori))}
                                {c.codice === 'esercizio_aperto' && onVaiAChiusura && <button onClick={onVaiAChiusura} className="ml-1.5 underline text-oro/80 hover:text-oro">{t('controlli.vai_chiusura')}</button>}
                            </span>
                        </li>
                    ))}
                    {controlli.length === 0 && <li className="flex items-center gap-2 font-body text-xs text-salvia"><Check size={13} /> {t('controlli.tutto_ok')}</li>}
                </ul>
            </div>

            {/* Anno precedente */}
            <div className={scheda}>
                <button onClick={() => setApertoPrecedente(v => !v)} className="w-full flex items-center justify-between gap-2">
                    <span className={titoloScheda}>{t('precedente.titolo', { esercizio: precedente ? etichettaEsercizio(precedente) : '' })}</span>
                    <span className="flex items-center gap-2 font-body text-xs text-nebbia/50">
                        {calcolo.fontePrecedente === 'mastro' ? t('precedente.dal_mastro') : calcolo.fontePrecedente === 'manuale' ? t('precedente.a_mano') : primoEsercizio ? t('precedente.primo') : t('precedente.mancano')}
                        {apertoPrecedente ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                </button>
                {apertoPrecedente && (
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 font-body text-xs text-nebbia/65">
                            <input type="checkbox" className="accent-oro" checked={!!bozza.cifre.primoEsercizio} onChange={e => aggiornaCifre({ primoEsercizio: e.target.checked })} />
                            {t('precedente.primo_esercizio')}
                        </label>
                        {calcolo.fontePrecedente === 'mastro' || bozza.cifre.usaManuali ? (
                            <label className="flex items-center gap-2 font-body text-xs text-nebbia/65">
                                <input type="checkbox" className="accent-oro" checked={!!bozza.cifre.usaManuali} onChange={e => aggiornaCifre({ usaManuali: e.target.checked })} />
                                {t('precedente.usa_manuali')}
                            </label>
                        ) : null}
                        {(precedenteAMano || bozza.cifre.usaManuali) && !bozza.cifre.primoEsercizio && (
                            <>
                                <p className="font-body text-xs text-nebbia/45">{t('precedente.istruzioni')}</p>
                                <button onClick={() => {
                                    const ap = bilancioDaApertura(righe, esercizio)
                                    if (!ap) { setErrore(t('precedente.nessuna_apertura')); return }
                                    aggiornaCifre({ bilancio: Object.fromEntries(Object.entries(ap).filter(([, v]) => v !== 0).map(([k, v]) => [k, String(v)])) })
                                }} className={pulsante}>{t('precedente.da_apertura')}</button>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="font-body text-[10px] uppercase tracking-widest text-nebbia/35">{t('precedente.bilancio')}</p>
                                        {STRUTTURA_BILANCIO.flatMap(s => s.gruppi.flatMap(g => g.poste)).map(p => (
                                            <CampoCifra key={p} etichetta={etichettaPosta(linguaUi, p, tipo)} valore={bozza.cifre.bilancio?.[p] ?? ''}
                                                onChange={v => aggiornaCifre({ bilancio: { ...bozza.cifre.bilancio, [p]: v } })} />
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-body text-[10px] uppercase tracking-widest text-nebbia/35">{t('precedente.conto_economico')}</p>
                                        {POSTE_CE.map(p => (
                                            <CampoCifra key={p} etichetta={etichettaPosta(linguaUi, p, tipo)} valore={bozza.cifre.ce?.[p] ?? ''}
                                                onChange={v => aggiornaCifre({ ce: { ...bozza.cifre.ce, [p]: v } })} />
                                        ))}
                                        <p className="font-body text-[11px] text-nebbia/35 pt-1">{t('precedente.segni')}</p>
                                    </div>
                                </div>
                                {calcolo.precedente && calcolo.fontePrecedente === 'manuale' && (
                                    <p className={`font-body text-xs ${calcolo.precedente.quadra ? 'text-salvia' : 'text-amber-400/90'}`}>
                                        {t('precedente.riepilogo', { attivo: fmtCHF(calcolo.precedente.totaleAttivo), passivo: fmtCHF(calcolo.precedente.totalePassivo), risultato: fmtCHF(calcolo.precedente.risultato) })}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Questionario dell'allegato */}
            <div className={scheda}>
                <p className={titoloScheda}>{t('questionario.titolo')}</p>
                {!pg && (
                    <label className="flex items-start gap-2 font-body text-xs text-nebbia/65">
                        <input type="checkbox" className="accent-oro mt-0.5" checked={bozza.questionario.redigi_allegato === 'si'} onChange={e => aggiornaQuestionario('redigi_allegato', e.target.checked ? 'si' : '')} />
                        <span>{t('questionario.redigi_allegato')}</span>
                    </label>
                )}
                {richiedeAllegato && (
                    <>
                        <p className="font-body text-xs text-nebbia/45">{t('questionario.istruzioni')}</p>
                        <label className="block">
                            <span className="block font-body text-xs text-nebbia/70 mb-1">{t('questionario.posti_lavoro.etichetta')}</span>
                            <select value={bozza.questionario.posti_lavoro ?? ''} onChange={e => aggiornaQuestionario('posti_lavoro', e.target.value)} className={inputCls}>
                                <option value="">{t('questionario.posti_lavoro.scegli')}</option>
                                {FASCE_POSTI.map(f => <option key={f} value={f}>{t(`questionario.posti_lavoro.${f}`)}</option>)}
                            </select>
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {DOMANDE.map(([k, forma]) => (
                                <label key={k} className={`block ${forma === 'area' ? 'lg:col-span-2' : ''}`}>
                                    <span className="block font-body text-xs text-nebbia/70">{t(`questionario.campi.${k}.etichetta`)}</span>
                                    <span className="block font-body text-[11px] text-nebbia/35 mb-1">{t(`questionario.campi.${k}.aiuto`)}</span>
                                    {forma === 'area'
                                        ? <textarea rows={2} maxLength={4000} value={bozza.questionario[k] ?? ''} onChange={e => aggiornaQuestionario(k, e.target.value)} className={inputCls} />
                                        : <input maxLength={4000} value={bozza.questionario[k] ?? ''} onChange={e => aggiornaQuestionario(k, e.target.value)} className={inputCls} />}
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Allegato */}
            {richiedeAllegato && (
                <div className={scheda}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className={titoloScheda}>{testoCO(lingua, 'documento.allegato')}</p>
                        <button onClick={scriviAllegato} disabled={!!lavoro} className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40">
                            {lavoro === 'allegato' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {bozza.allegato ? t('allegato.riscrivi') : t('allegato.scrivi')}
                        </button>
                    </div>
                    {lavoro === 'allegato' && <p className="font-body text-xs text-nebbia/45">{t('allegato.in_corso')}</p>}
                    {numeriDaVerificare.length > 0 && <Avviso tipo="avviso" testo={t('allegato.numeri_da_verificare', { numeri: numeriDaVerificare.join(', ') })} />}
                    {bozza.allegato ? (
                        <DocumentoLex markdown={bozza.allegato} tipo={testoCO(lingua, 'documento.allegato')} soloRevisione
                            onModifica={(nuovo) => aggiorna({ allegato: nuovo })} />
                    ) : (
                        <p className="font-body text-xs text-nebbia/40">{t('allegato.vuoto')}</p>
                    )}
                </div>
            )}

            {/* Proposta d'impiego dell'utile (SA, Sagl, cooperativa): la decide l'assemblea */}
            {conImpiego && (
                <div className={scheda}>
                    <p className={titoloScheda}>{t('impiego.titolo_scheda')}</p>
                    <label className="flex items-start gap-2 font-body text-xs text-nebbia/65">
                        <input type="checkbox" className="accent-oro mt-0.5" checked={!!bozza.impiego.includi} onChange={e => aggiornaImpiego({ includi: e.target.checked })} />
                        <span>{t('impiego.includi')}</span>
                    </label>
                    {includeImpiego && impiego && (
                        <>
                            <p className="font-body text-xs text-nebbia/45">{t('impiego.spiegazione')}</p>
                            <label className="flex items-center gap-2 font-body text-xs text-nebbia/65">
                                <input type="checkbox" className="accent-oro" checked={!!bozza.impiego.holding} onChange={e => aggiornaImpiego({ holding: e.target.checked })} />
                                {t('impiego.holding')}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {CAMPI_IMPIEGO.map(k => (
                                    <label key={k} className="block">
                                        <span className="block font-body text-xs text-nebbia/70 mb-1">{t(`impiego.campi.${k}`)}</span>
                                        <input value={bozza.impiego[k] ?? ''} inputMode="decimal"
                                            placeholder={k === 'riserva_legale' ? t('impiego.minimo', { importo: fmtCHF(impiego.riservaMinima) }) : '0.00'}
                                            onChange={e => aggiornaImpiego({ [k]: e.target.value })} className={`${inputCls} text-right`} />
                                    </label>
                                ))}
                            </div>
                            <RiepilogoImpiego impiego={impiego} t={t} />
                            {impiego.errori.map(c => <Avviso key={c} tipo="errore" testo={t(`impiego.errori.${c}`, { minimo: fmtCHF(impiego.riservaMinima) })} />)}
                            {impiego.avvisi.map(c => <Avviso key={c} tipo="avviso" testo={t(`impiego.avvisi.${c}`, { minimo: fmtCHF(impiego.riservaMinima) })} />)}
                        </>
                    )}
                </div>
            )}

            {/* Firme */}
            <div className={scheda}>
                <p className={titoloScheda}>{t('firme.titolo')}</p>
                <p className="font-body text-xs text-nebbia/45">{t('firme.spiegazione')}</p>
                {bozza.firme.map((f, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select value={f.ruolo ?? ''} onChange={e => aggiorna({ firme: bozza.firme.map((x, j) => (j === i ? { ...x, ruolo: e.target.value } : x)) })} className={inputCls}>
                            {Object.keys(TESTI_CO[linguaUi].ruoli).map(r => <option key={r} value={r}>{TESTI_CO[linguaUi].ruoli[r]}</option>)}
                        </select>
                        <input value={f.nome ?? ''} placeholder={t('firme.nome')} onChange={e => aggiorna({ firme: bozza.firme.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} className={inputCls} />
                    </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={bozza.luogo ?? ''} placeholder={t('firme.luogo')} onChange={e => aggiorna({ luogo: e.target.value })} className={inputCls} />
                    <input type="date" value={bozza.data ?? ''} onChange={e => aggiorna({ data: e.target.value })} className={inputCls} />
                </div>
                <p className="font-body text-[11px] text-nebbia/35">{t('firme.termine', { data: dataCH(seiMesiDopo(esercizio.fine)) })}</p>
            </div>

            {errore && <Avviso tipo="errore" testo={errore} />}
            {esito && <Avviso tipo="ok" testo={esito} />}

            {/* Azioni */}
            <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => salva()} disabled={!!lavoro || !modificato} className={pulsante}>
                    {lavoro === 'salva' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {modificato ? t('azioni.salva') : t('azioni.salvato')}
                </button>
                <button onClick={anteprima} disabled={!!lavoro} className={pulsante}>
                    {lavoro === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} {t('azioni.anteprima')}
                </button>
                <button onClick={() => setConferma(true)} disabled={!!lavoro || blocchi.length > 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                    {lavoro === 'definitivo' ? <Loader2 size={12} className="animate-spin" /> : <Stamp size={12} />} {t('azioni.definitivo')}
                </button>
            </div>
            {blocchi.length > 0 && (
                <ul className="space-y-1">
                    {blocchi.map(b => <li key={b} className="flex items-center gap-2 font-body text-[11px] text-nebbia/45"><Lock size={11} /> {t(`blocchi.${b}`, { n: daCompletare, count: daCompletare })}</li>)}
                </ul>
            )}

            <Superati superati={superati} t={t} locale={locale} onScarica={scaricaArchiviato} lavoro={lavoro} />

            {conferma && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConferma(false)}>
                    <div className="bg-slate border border-oro/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Stamp size={16} className="text-oro" />
                            <h3 className="font-display text-lg text-nebbia">{t('conferma.titolo', { esercizio: etichettaEsercizio(esercizio) })}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">{t('conferma.testo')}</p>
                            {controlli.some(c => c.livello === 'avviso') && <p className="font-body text-xs text-amber-400/90">{t('conferma.avvisi')}</p>}
                            <div className="flex gap-2">
                                <button onClick={() => setConferma(false)} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5">{t('azioni.annulla')}</button>
                                <button onClick={rendiDefinitivo} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                                    <Stamp size={14} /> {t('conferma.conferma')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Sei mesi dopo la chiusura: termine per allestire la relazione sulla gestione (art. 958 cpv. 3 CO).
// Fine mese → fine mese (31.12 → 30.06), altrimenti lo stesso giorno sei mesi dopo.
function seiMesiDopo(iso) {
    const d = new Date(`${iso}T00:00:00Z`)
    const anno = d.getUTCFullYear()
    const mese = d.getUTCMonth()
    const ultimoDelMese = d.getUTCDate() === new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate()
    const scadenza = ultimoDelMese ? new Date(Date.UTC(anno, mese + 7, 0)) : new Date(Date.UTC(anno, mese + 6, d.getUTCDate()))
    return scadenza.toISOString().slice(0, 10)
}

// Il calcolo della proposta: dall'utile di bilancio al riporto a nuovo (le attribuzioni col segno meno)
function RiepilogoImpiego({ impiego, t }) {
    const righe = [
        ['riportato', impiego.riportato],
        ['esercizio', impiego.esercizio],
        ['utile_bilancio', impiego.utileBilancio, true],
        ...(impiego.prelievo > 0 ? [['prelievo', impiego.prelievo], ['disponibile', r2(impiego.utileBilancio + impiego.prelievo), true]] : []),
        ...(impiego.riserva > 0 ? [['riserva', -impiego.riserva]] : []),
        ...(impiego.dividendo > 0 ? [['dividendo', -impiego.dividendo]] : []),
        ...(impiego.facoltative > 0 ? [['facoltative', -impiego.facoltative]] : []),
        ['riporto', impiego.riporto, true],
    ]
    return (
        <div className="border border-white/10 divide-y divide-white/5">
            {righe.map(([k, v, forte]) => (
                <div key={k} className={`flex items-center justify-between gap-3 px-3 py-1.5 font-body text-xs ${forte ? 'text-nebbia font-medium bg-petrolio/40' : 'text-nebbia/65'}`}>
                    <span>{t(`impiego.righe.${k}`)}{k === 'dividendo' && impiego.percentualeDividendo != null ? ` (${t('impiego.percentuale', { perc: impiego.percentualeDividendo })})` : ''}</span>
                    <span className="whitespace-nowrap">{fmtCHF(v)}</span>
                </div>
            ))}
        </div>
    )
}

function CampoCifra({ etichetta, valore, onChange }) {
    return (
        <label className="grid grid-cols-[1fr_120px] items-center gap-2">
            <span className="font-body text-[11px] text-nebbia/55 leading-tight">{etichetta}</span>
            <input value={valore} onChange={e => onChange(e.target.value)} inputMode="decimal" placeholder="0.00"
                className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-1 text-right outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
        </label>
    )
}

function Avviso({ tipo, testo }) {
    const stile = tipo === 'errore' ? 'text-red-400 bg-red-900/10 border-red-500/20' : tipo === 'avviso' ? 'text-amber-400 bg-amber-900/10 border-amber-500/20' : 'text-salvia bg-salvia/5 border-salvia/20'
    const Icona = tipo === 'errore' ? AlertCircle : tipo === 'avviso' ? AlertTriangle : Check
    return <div className={`flex items-start gap-2 text-xs font-body p-3 border ${stile}`}><Icona size={14} className="mt-0.5 shrink-0" /> <span>{testo}</span></div>
}

function Superati({ superati, t, locale, onScarica, lavoro }) {
    if (!superati?.length) return null
    return (
        <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1.5">
            <p className="font-body text-[10px] uppercase tracking-widest text-nebbia/35">{t('superati.titolo')}</p>
            {superati.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 font-body text-xs text-nebbia/55">
                    <span>{t('superati.riga', { definitivo: s.definitivo_il ? new Date(s.definitivo_il).toLocaleDateString(locale) : '—', superato: s.superato_il ? new Date(s.superato_il).toLocaleDateString(locale) : '—' })}</span>
                    {s.archivio_documento_id && (
                        <button onClick={() => onScarica(s)} disabled={!!lavoro} className="flex items-center gap-1 text-nebbia/50 hover:text-oro disabled:opacity-40"><FileDown size={11} /> PDF</button>
                    )}
                </div>
            ))}
        </div>
    )
}
