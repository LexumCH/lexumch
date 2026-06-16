// src/components/avvocato/UdienzaModal.jsx — Lexum CH
//
// Identico all'IT salvo TIPI_UDIENZA (terminologia processuale svizzera
// federale CPC/CPP). Timezone e colonne già allineati allo schema CH:
//   - data_ora / data_rinvio scritti con new Date(`${data}T${ora}:00`).toISOString()
//   - sync con appuntamenti (data_ora_inizio/fine) via .toISOString()
// Date di visualizzazione: il file usa slice ISO, neutro.

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import {
    X, Save, Calendar, MapPin, User as UserIcon, Gavel,
    AlertCircle, Loader2, Trash2, FileText
} from 'lucide-react'

// Tipi udienza raggruppati per area — terminologia federale CH (CPC/CPP).
// Le chiavi di gruppo (gruppoKey) servono solo per la label tradotta;
// i value restano i termini canonici salvati su DB (colonna `tipo`).
const TIPI_UDIENZA = [
    {
        gruppoKey: 'civile',
        tipi: [
            'Udienza di conciliazione',
            'Dibattimento principale',
            'Udienza istruttoria',
            'Interrogatorio delle parti',
            'Audizione testimoni',
            'Discussione finale',
            'Procedura sommaria',
        ],
    },
    {
        gruppoKey: 'penale',
        tipi: [
            'Dibattimento di primo grado',
            'Udienza dibattimentale d\'appello',
            'Interrogatorio dell\'imputato',
            'Audizione testimoni / periti',
            'Convalida della carcerazione',
            'Procedura del decreto d\'accusa',
            'Comunicazione della sentenza',
        ],
    },
    {
        gruppoKey: 'amministrativo',
        tipi: [
            'Udienza pubblica',
            'Deliberazione (camera di consiglio)',
            'Udienza cautelare (misure provvisionali)',
            'Pignoramento / esecuzione (LEF)',
            'Udienza fallimentare (LEF)',
        ],
    },
    {
        gruppoKey: 'famiglia',
        tipi: [
            'Audizione delle parti',
            'Audizione del minore',
            'Misure a protezione dell\'unione coniugale',
        ],
    },
    {
        gruppoKey: 'arbitrato',
        tipi: [
            'Mediazione',
            'Arbitrato',
            'Conciliazione',
        ],
    },
]

// Stati udienza — il value è il valore enum salvato su DB; la label è tradotta via i18nKey
const STATI = [
    { value: 'programmata', i18nKey: 'programmata', color: 'salvia' },
    { value: 'svolta', i18nKey: 'svolta', color: 'oro' },
    { value: 'rinviata', i18nKey: 'rinviata', color: 'amber' },
    { value: 'annullata', i18nKey: 'annullata', color: 'red' },
]

const STATO_COLORS = {
    salvia: 'bg-salvia/10 border-salvia/30 text-salvia',
    oro: 'bg-oro/10 border-oro/30 text-oro',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
}

/**
 * Modale per creare o modificare un'udienza.
 *
 * Props:
 * - praticaId: UUID della pratica
 * - praticaTitolo: titolo per descrizione appuntamento sincronizzato
 * - clienteId: opzionale, per popolare appuntamento
 * - udienza: oggetto udienza esistente (null per nuova)
 * - onClose: callback quando chiude (con o senza salvataggio)
 * - onSaved: callback dopo salvataggio riuscito
 * - onDeleted: callback dopo eliminazione
 */
export default function UdienzaModal({
    praticaId, praticaTitolo, clienteId,
    udienza, onClose, onSaved, onDeleted,
}) {
    const { t } = useTranslation('comp_udienza_modal')
    const isNew = !udienza?.id

    // Etichetta tradotta per un tipo udienza (value canonico salvato su DB)
    const tipoLabel = (val) => t(`tipo.valori.${val}`, { defaultValue: val })

    // ── Stato form ──
    const [form, setForm] = useState({
        data: udienza?.data_ora?.slice(0, 10) ?? '',
        ora: udienza?.data_ora?.slice(11, 16) ?? '09:00',
        durata_minuti: udienza?.durata_minuti ?? 120,
        tipo: udienza?.tipo ?? '',
        tipo_libero: '',
        oggetto: udienza?.oggetto ?? '',
        tribunale: udienza?.tribunale ?? '',
        sezione: udienza?.sezione ?? '',
        aula: udienza?.aula ?? '',
        giudice: udienza?.giudice ?? '',
        stato: udienza?.stato ?? 'programmata',
        esito: udienza?.esito ?? '',
        data_rinvio: udienza?.data_rinvio?.slice(0, 10) ?? '',
        note_preparazione: udienza?.note_preparazione ?? '',
    })

    // Se il tipo esistente non è nella lista predefinita, è "Altro"
    const tipiTutti = TIPI_UDIENZA.flatMap(g => g.tipi)
    const tipoEAltro = udienza?.tipo && !tipiTutti.includes(udienza.tipo)

    const [usaTipoLibero, setUsaTipoLibero] = useState(tipoEAltro)
    useEffect(() => {
        if (tipoEAltro) setForm(f => ({ ...f, tipo_libero: udienza.tipo }))
    }, [])

    // ── Tracking dirty ──
    const valoriIniziali = useRef(JSON.stringify(form))
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        setDirty(JSON.stringify(form) !== valoriIniziali.current)
    }, [form])

    // ── Salvataggio / errore ──
    const [salvando, setSalvando] = useState(false)
    const [eliminando, setEliminando] = useState(false)
    const [errore, setErrore] = useState('')
    const [confermaUscita, setConfermaUscita] = useState(false)
    const [confermaElimina, setConfermaElimina] = useState(false)

    function aggiorna(campo, valore) {
        setForm(prev => ({ ...prev, [campo]: valore }))
    }

    // Chiusura con dirty check
    function tentativoChiusura() {
        if (dirty) setConfermaUscita(true)
        else onClose()
    }

    // Listener Esc
    useEffect(() => {
        function handleEsc(e) {
            if (e.key === 'Escape') tentativoChiusura()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [dirty])

    // ── Validazione + salvataggio ──
    async function salva() {
        setErrore('')

        // Validazioni base
        if (!form.data) return setErrore(t('errori.data_obbligatoria'))
        const tipoFinale = usaTipoLibero ? form.tipo_libero.trim() : form.tipo
        if (!tipoFinale) return setErrore(t('errori.tipo_obbligatorio'))
        if (form.stato === 'rinviata' && !form.data_rinvio) {
            return setErrore(t('errori.data_rinvio_obbligatoria'))
        }

        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Costruisci data_ora (timestamptz)
            const dataOra = new Date(`${form.data}T${form.ora || '09:00'}:00`)

            const payload = {
                pratica_id: praticaId,
                data_ora: dataOra.toISOString(),
                durata_minuti: parseInt(form.durata_minuti) || 120,
                tipo: tipoFinale,
                oggetto: form.oggetto || null,
                tribunale: form.tribunale || null,
                sezione: form.sezione || null,
                aula: form.aula || null,
                giudice: form.giudice || null,
                stato: form.stato,
                esito: form.esito || null,
                data_rinvio: form.stato === 'rinviata' && form.data_rinvio
                    ? new Date(`${form.data_rinvio}T09:00:00`).toISOString()
                    : null,
                note_preparazione: form.note_preparazione || null,
            }

            let udienzaId = udienza?.id
            let appuntamentoId = udienza?.appuntamento_id

            if (isNew) {
                payload.creato_da = user.id
                const { data, error } = await supabase
                    .from('udienze')
                    .insert(payload)
                    .select('id')
                    .single()
                if (error) throw new Error(error.message)
                udienzaId = data.id
            } else {
                const { error } = await supabase
                    .from('udienze')
                    .update(payload)
                    .eq('id', udienza.id)
                if (error) throw new Error(error.message)
            }

            // ── Sync con appuntamenti (calendario) ──
            // Solo se stato = programmata (non sincronizziamo annullate/svolte)
            if (form.stato === 'programmata') {
                const fineCalc = new Date(dataOra.getTime() + (parseInt(form.durata_minuti) || 120) * 60000)
                const tipoLabelApp = tipoLabel(tipoFinale)
                const titoloApp = praticaTitolo
                    ? t('sync.titolo_appuntamento_pratica', { tipo: tipoLabelApp, pratica: praticaTitolo })
                    : t('sync.titolo_appuntamento', { tipo: tipoLabelApp })

                // Mappa i campi udienza → appuntamento
                // (appuntamenti ha note_interne, non "luogo"/"note")
                const sede = [form.tribunale, form.sezione, form.aula].filter(Boolean).join(' - ')
                const noteInterneApp = [
                    sede ? t('sync.label_sede', { valore: sede }) : null,
                    form.giudice ? t('sync.label_giudice', { valore: form.giudice }) : null,
                    form.oggetto ? t('sync.label_oggetto', { valore: form.oggetto }) : null,
                    form.note_preparazione ? t('sync.label_note', { valore: form.note_preparazione }) : null,
                ].filter(Boolean).join('\n')

                const appPayload = {
                    avvocato_id: user.id,
                    pratica_id: praticaId,
                    cliente_id: clienteId ?? null,
                    tipo: 'udienza',
                    titolo: titoloApp,
                    stato: 'programmato',
                    data_ora_inizio: dataOra.toISOString(),
                    data_ora_fine: fineCalc.toISOString(),
                    note_interne: noteInterneApp || null,
                }

                if (appuntamentoId) {
                    const { error: errUpd } = await supabase
                        .from('appuntamenti')
                        .update(appPayload)
                        .eq('id', appuntamentoId)
                    if (errUpd) {
                        console.error('Errore sync appuntamento (update):', errUpd.message)
                        throw new Error(t('errori.sync_fallita', { messaggio: errUpd.message }))
                    }
                } else {
                    const { data: newApp, error: errIns } = await supabase
                        .from('appuntamenti')
                        .insert(appPayload)
                        .select('id')
                        .single()
                    if (errIns) {
                        console.error('Errore sync appuntamento (insert):', errIns.message)
                        throw new Error(t('errori.sync_fallita', { messaggio: errIns.message }))
                    }
                    if (newApp) {
                        appuntamentoId = newApp.id
                        await supabase.from('udienze').update({ appuntamento_id: newApp.id }).eq('id', udienzaId)
                    }
                }
            } else if (appuntamentoId) {
                // Stato non programmata: rimuovi l'appuntamento dal calendario
                await supabase.from('appuntamenti').delete().eq('id', appuntamentoId)
                await supabase.from('udienze').update({ appuntamento_id: null }).eq('id', udienzaId)
            }

            // OK: chiudi la modale
            valoriIniziali.current = JSON.stringify(form)
            setDirty(false)
            if (onSaved) await onSaved()
            onClose()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function elimina() {
        if (!udienza?.id) return
        setEliminando(true)
        try {
            // Cancella anche l'appuntamento collegato
            if (udienza.appuntamento_id) {
                await supabase.from('appuntamenti').delete().eq('id', udienza.appuntamento_id)
            }
            const { error } = await supabase.from('udienze').delete().eq('id', udienza.id)
            if (error) throw new Error(error.message)
            if (onDeleted) await onDeleted()
            onClose()
        } catch (e) {
            setErrore(e.message)
            setEliminando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center px-4 py-8 overflow-y-auto"
            onClick={tentativoChiusura}>
            <div className="bg-slate border border-white/10 max-w-2xl w-full my-auto"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Gavel size={16} className="text-oro" />
                        <p className="font-display text-lg font-medium text-nebbia">
                            {isNew ? t('header.titolo_nuova') : t('header.titolo_modifica')}
                        </p>
                        {dirty && (
                            <span className="font-body text-xs text-amber-400 border border-amber-500/30 px-2 py-0.5">
                                {t('header.badge_non_salvate')}
                            </span>
                        )}
                    </div>
                    <button onClick={tentativoChiusura} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* Stato udienza */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('stati.label')}</label>
                        <div className="flex flex-wrap gap-2">
                            {STATI.map(s => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => aggiorna('stato', s.value)}
                                    className={`px-3 py-1.5 font-body text-xs border transition-colors ${form.stato === s.value
                                        ? STATO_COLORS[s.color]
                                        : 'border-white/10 text-nebbia/40 hover:border-white/20 hover:text-nebbia/60'
                                        }`}
                                >
                                    {t(`stati.${s.i18nKey}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data + ora + durata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.data')}</label>
                            <input
                                type="date"
                                value={form.data}
                                onChange={e => aggiorna('data', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.ora')}</label>
                            <input
                                type="time"
                                value={form.ora}
                                onChange={e => aggiorna('ora', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.durata')}</label>
                            <input
                                type="number"
                                min="15"
                                step="15"
                                value={form.durata_minuti}
                                onChange={e => aggiorna('durata_minuti', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    {/* Tipo udienza */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.tipo')}</label>
                        {!usaTipoLibero ? (
                            <select
                                value={form.tipo}
                                onChange={e => {
                                    if (e.target.value === '__altro__') {
                                        setUsaTipoLibero(true)
                                        aggiorna('tipo', '')
                                    } else {
                                        aggiorna('tipo', e.target.value)
                                    }
                                }}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            >
                                <option value="">{t('tipo.seleziona')}</option>
                                {TIPI_UDIENZA.map(({ gruppoKey, tipi }) => (
                                    <optgroup key={gruppoKey} label={t(`tipo.gruppi.${gruppoKey}`)}>
                                        {tipi.map(tv => <option key={tv} value={tv}>{tipoLabel(tv)}</option>)}
                                    </optgroup>
                                ))}
                                <option value="__altro__">{t('tipo.altro')}</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.tipo_libero}
                                    onChange={e => aggiorna('tipo_libero', e.target.value)}
                                    placeholder={t('tipo.placeholder_libero')}
                                    className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                <button
                                    onClick={() => { setUsaTipoLibero(false); aggiorna('tipo_libero', '') }}
                                    className="px-3 py-2 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                                >
                                    {t('tipo.btn_lista')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Oggetto */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.oggetto')}</label>
                        <input
                            type="text"
                            value={form.oggetto}
                            onChange={e => aggiorna('oggetto', e.target.value)}
                            placeholder={t('placeholder.oggetto')}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    {/* Sede - tribunale + sezione + aula + giudice */}
                    <div>
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <MapPin size={11} /> {t('campi.sede')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={form.tribunale}
                                onChange={e => aggiorna('tribunale', e.target.value)}
                                placeholder={t('placeholder.tribunale')}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.sezione}
                                onChange={e => aggiorna('sezione', e.target.value)}
                                placeholder={t('placeholder.sezione')}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.aula}
                                onChange={e => aggiorna('aula', e.target.value)}
                                placeholder={t('placeholder.aula')}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.giudice}
                                onChange={e => aggiorna('giudice', e.target.value)}
                                placeholder={t('placeholder.giudice')}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                    </div>

                    {/* Note preparazione */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FileText size={11} /> {t('campi.note_preparazione')}
                        </label>
                        <textarea
                            rows={3}
                            value={form.note_preparazione}
                            onChange={e => aggiorna('note_preparazione', e.target.value)}
                            placeholder={t('placeholder.note_preparazione')}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                        />
                    </div>

                    {/* Esito (solo se stato != programmata) */}
                    {form.stato !== 'programmata' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.esito')}</label>
                            <textarea
                                rows={3}
                                value={form.esito}
                                onChange={e => aggiorna('esito', e.target.value)}
                                placeholder={t('placeholder.esito')}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    )}

                    {/* Data di rinvio (solo se stato = rinviata) */}
                    {form.stato === 'rinviata' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">{t('campi.data_rinvio')}</label>
                            <input
                                type="date"
                                value={form.data_rinvio}
                                onChange={e => aggiorna('data_rinvio', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                            <p className="font-body text-xs text-nebbia/30 mt-2">
                                {t('rinvio.suggerimento')}
                            </p>
                        </div>
                    )}

                    {/* Errore */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5 bg-petrolio/30">
                    {!isNew ? (
                        <button
                            onClick={() => setConfermaElimina(true)}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={11} /> {t('footer.elimina')}
                        </button>
                    ) : <div />}

                    <div className="flex gap-2">
                        <button
                            onClick={tentativoChiusura}
                            className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-sm hover:text-nebbia transition-colors"
                        >
                            {t('footer.annulla')}
                        </button>
                        <button
                            onClick={salva}
                            disabled={salvando || !dirty}
                            className="flex items-center gap-2 px-4 py-2 bg-oro text-petrolio font-body text-sm hover:bg-oro/90 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <><Loader2 size={13} className="animate-spin" /> {t('footer.salvataggio')}</>
                                : <><Save size={13} /> {t('footer.salva')}</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Modale conferma uscita (sopra a quella principale) */}
            {confermaUscita && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4"
                    onClick={() => setConfermaUscita(false)}>
                    <div className="bg-slate border border-amber-500/30 max-w-sm p-5 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <AlertCircle size={18} className="text-amber-400 shrink-0" />
                            <p className="font-display text-base font-semibold text-nebbia">{t('conferma_uscita.titolo')}</p>
                        </div>
                        <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                            {t('conferma_uscita.testo')}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfermaUscita(false)}
                                className="flex-1 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia transition-colors">
                                {t('conferma_uscita.btn_continua')}
                            </button>
                            <button onClick={() => { setConfermaUscita(false); onClose() }}
                                className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-500/20 transition-colors">
                                {t('conferma_uscita.btn_esci')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale conferma eliminazione */}
            {confermaElimina && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4"
                    onClick={() => setConfermaElimina(false)}>
                    <div className="bg-slate border border-red-500/30 max-w-sm p-5 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <Trash2 size={18} className="text-red-400 shrink-0" />
                            <p className="font-display text-base font-semibold text-nebbia">{t('conferma_elimina.titolo')}</p>
                        </div>
                        <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                            {t('conferma_elimina.testo')}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfermaElimina(false)}
                                className="flex-1 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia transition-colors">
                                {t('conferma_elimina.btn_annulla')}
                            </button>
                            <button
                                onClick={elimina}
                                disabled={eliminando}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40"
                            >
                                {eliminando
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <><Trash2 size={13} /> {t('conferma_elimina.btn_elimina')}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}