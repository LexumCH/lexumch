// src/components/avvocato/NuovoTerminePratica.jsx — Lexum CH
//
// Modal per aggiungere un termine processuale a una pratica.
//
// Due modalita':
//   1. STANDARD       - selezione tipo da tipi_termini, calcolo automatico via RPC
//   2. PERSONALIZZATO - nome libero + data scadenza diretta, nessun calcolo
//
// Differenze rispetto all'IT:
//   - Il "verso" del calcolo (a ritroso) NON e' piu' una lista hardcoded:
//     vive sul tipo (tipi_termini.a_ritroso) e si legge da tipoCorrente.
//   - Testi sulle ferie giudiziarie aggiornati al diritto FEDERALE svizzero
//     (Pasqua +/-, 15.7-15.8, 18.12-2.1) invece dell'agosto italiano.
//   - Date in it-CH.
//
// In entrambi i casi il trigger DB su termini_processuali crea l'evento
// corrispondente nel calendario.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, AlertTriangle, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

function fmtDataLunga(iso, dateLocale = 'it-CH') {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(dateLocale, {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
}

function isDataPassata(iso) {
    if (!iso) return false
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    return new Date(iso) < oggi
}

function giorniDifferenza(iso) {
    if (!iso) return 0
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso)
    target.setHours(0, 0, 0, 0)
    return Math.round((oggi - target) / (1000 * 60 * 60 * 24))
}

export default function NuovoTerminePratica({ praticaId, onClose, onSaved }) {
    const { t, i18n } = useTranslation('comp_nuovo_termine')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    // ── modalita' ──
    const [modalita, setModalita] = useState('standard') // 'standard' | 'personalizzato'

    // ── stato comune ──
    const [noteAvvocato, setNoteAvvocato] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    // ── stato STANDARD ──
    const [tipi, setTipi] = useState([])
    const [tipoSelected, setTipoSelected] = useState('')
    const [dataEvento, setDataEvento] = useState(new Date().toISOString().slice(0, 10))
    const [eventoDescrizione, setEventoDescrizione] = useState('')
    const [anteprima, setAnteprima] = useState(null)
    const [calcolando, setCalcolando] = useState(false)

    // ── stato PERSONALIZZATO ──
    const [nomePersonalizzato, setNomePersonalizzato] = useState('')
    const [dataScadenzaPers, setDataScadenzaPers] = useState('')

    // Chiudi con ESC
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    // Carica tipi termini (solo per modalita' standard)
    useEffect(() => {
        supabase
            .from('tipi_termini')
            .select('*')
            .eq('attivo', true)
            .order('ordine')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Errore caricamento tipi_termini:', error.message)
                    setErrore(t('errori.caricamento_tipi'))
                } else {
                    setTipi(data ?? [])
                    // Tipi standard assenti (tipi_termini vuota) → mostra solo il personalizzato
                    if (!data || data.length === 0) setModalita('personalizzato')
                }
            })
    }, [])

    // tipoCorrente e aRitroso: il verso si legge dal tipo (DB), non da lista hardcoded
    const tipoCorrente = tipi.find(t => t.codice === tipoSelected)
    const aRitroso = tipoCorrente?.a_ritroso ?? false

    // Calcola anteprima (solo per modalita' standard)
    useEffect(() => {
        if (modalita !== 'standard' || !tipoSelected || !dataEvento) {
            setAnteprima(null)
            return
        }

        let cancelled = false
        setCalcolando(true)
        setErrore(null)

        supabase
            .rpc('calcola_termine', {
                p_codice_tipo: tipoSelected,
                p_data_evento: dataEvento,
                p_a_ritroso: aRitroso,
            })
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    setErrore(error.message)
                    setAnteprima(null)
                } else {
                    setAnteprima(Array.isArray(data) ? data[0] : data)
                }
                setCalcolando(false)
            })

        return () => { cancelled = true }
    }, [modalita, tipoSelected, dataEvento, aRitroso])

    // Raggruppa tipi per materia
    const tipiPerMateria = tipi.reduce((acc, t) => {
        const m = t.materia ?? 'altro'
        if (!acc[m]) acc[m] = []
        acc[m].push(t)
        return acc
    }, {})

    // Cambio modalita' — reset stato dell'altra modalita'
    function cambiaModalita(nuova) {
        if (nuova === modalita) return
        setErrore(null)
        if (nuova === 'standard') {
            setNomePersonalizzato('')
            setDataScadenzaPers('')
        } else {
            setTipoSelected('')
            setEventoDescrizione('')
            setAnteprima(null)
        }
        setModalita(nuova)
    }

    // Validazione salva
    const puoSalvareStandard = tipoSelected && dataEvento && anteprima && !calcolando
    const puoSalvarePers = nomePersonalizzato.trim().length > 0 && dataScadenzaPers
    const puoSalvare = modalita === 'standard' ? puoSalvareStandard : puoSalvarePers

    // Salva
    async function salva() {
        if (!puoSalvare) return
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setErrore(t('errori.sessione_scaduta'))
            setSalvando(false)
            return
        }

        const payload = modalita === 'standard'
            ? {
                pratica_id: praticaId,
                tipo_codice: tipoSelected,
                tipo_label: tipoCorrente.label,
                data_evento: dataEvento,
                evento_descrizione: eventoDescrizione.trim() || null,
                a_ritroso: aRitroso,
                data_scadenza: anteprima.data_scadenza,
                data_scadenza_grezza: anteprima.data_scadenza_grezza,
                giorni_sospensione: anteprima.giorni_sospensione,
                note_calcolo: anteprima.note,
                note_avvocato: noteAvvocato.trim() || null,
                stato: 'in_corso',
                autore_id: user.id,
            }
            : {
                pratica_id: praticaId,
                tipo_codice: null,
                tipo_label: nomePersonalizzato.trim(),
                data_evento: dataScadenzaPers,
                evento_descrizione: null,
                a_ritroso: false,
                data_scadenza: dataScadenzaPers,
                data_scadenza_grezza: dataScadenzaPers,
                giorni_sospensione: 0,
                note_calcolo: null,
                note_avvocato: noteAvvocato.trim() || null,
                stato: 'in_corso',
                autore_id: user.id,
            }

        const { error } = await supabase
            .from('termini_processuali')
            .insert(payload)

        setSalvando(false)
        if (error) {
            setErrore(error.message)
            return
        }
        onSaved()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => { if (!salvando) onClose() }}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl my-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <p className="font-display text-lg text-nebbia">{t('header.titolo')}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">
                            {modalita === 'standard'
                                ? t('header.sottotitolo_standard')
                                : t('header.sottotitolo_personalizzato')
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={salvando}
                        className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                        <X size={18} className="text-nebbia/60" />
                    </button>
                </div>

                {/* Tabs modalita' */}
                {tipi.length > 0 && (
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => cambiaModalita('standard')}
                        disabled={salvando}
                        className={`flex-1 px-6 py-3 font-body text-sm transition-colors ${modalita === 'standard'
                            ? 'text-oro border-b-2 border-oro bg-petrolio/30'
                            : 'text-nebbia/50 hover:text-nebbia/80 border-b-2 border-transparent'
                            }`}
                    >
                        {t('tabs.standard')}
                    </button>
                    <button
                        onClick={() => cambiaModalita('personalizzato')}
                        disabled={salvando}
                        className={`flex-1 px-6 py-3 font-body text-sm transition-colors ${modalita === 'personalizzato'
                            ? 'text-oro border-b-2 border-oro bg-petrolio/30'
                            : 'text-nebbia/50 hover:text-nebbia/80 border-b-2 border-transparent'
                            }`}
                    >
                        {t('tabs.personalizzato')}
                    </button>
                </div>
                )}

                <div className="p-6 space-y-5">

                    {/* ═══════════════════════════════════════════════
                         MODALITA' STANDARD
                       ═══════════════════════════════════════════════ */}
                    {modalita === 'standard' && (
                        <>
                            {/* Avviso se non ci sono tipi seedati */}
                            {tipi.length === 0 && (
                                <div className="bg-petrolio/50 border border-amber-500/20 p-4 flex items-start gap-2.5">
                                    <Info size={14} className="text-amber-400/70 mt-0.5 shrink-0" />
                                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                        {t('standard.avviso_nessun_tipo_pre')} <span className="text-oro">{t('standard.avviso_nessun_tipo_link')}</span> {t('standard.avviso_nessun_tipo_post')}
                                    </p>
                                </div>
                            )}

                            {/* Tipo termine */}
                            <div>
                                <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                    {t('standard.tipo_label')}
                                </label>
                                <select
                                    value={tipoSelected}
                                    onChange={e => setTipoSelected(e.target.value)}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50"
                                >
                                    <option value="">{t('standard.tipo_placeholder')}</option>
                                    {Object.entries(tipiPerMateria).map(([materia, list]) => (
                                        <optgroup key={materia} label={t(`materia.${materia}`, materia)}>
                                            {list.map(t => (
                                                <option key={t.codice} value={t.codice}>{t.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {tipoCorrente?.descrizione && (
                                    <p className="font-body text-xs text-nebbia/40 mt-2 italic flex items-start gap-1.5">
                                        <Info size={11} className="mt-0.5 shrink-0" />
                                        <span>{tipoCorrente.descrizione}</span>
                                    </p>
                                )}
                            </div>

                            {/* Data evento */}
                            {tipoCorrente && (
                                <div>
                                    <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                        {tipoCorrente.da_evento_label || t('standard.data_evento_label_default')}{t('standard.data_evento_suffix')}
                                    </label>
                                    <input
                                        type="date"
                                        value={dataEvento}
                                        onChange={e => setDataEvento(e.target.value)}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50"
                                    />
                                    <p className="font-body text-xs text-nebbia/40 mt-2">
                                        {aRitroso
                                            ? t('standard.calcolo_a_ritroso', { giorni: tipoCorrente.giorni })
                                            : t('standard.calcolo_in_avanti', { giorni: tipoCorrente.giorni })
                                        }
                                        {tipoCorrente.sospensione_feriale
                                            ? anteprima && anteprima.giorni_sospensione > 0
                                                ? t('standard.sospensione_applicata', { giorni: anteprima.giorni_sospensione })
                                                : t('standard.sospensione_soggetto')
                                            : t('standard.sospensione_senza')
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Descrizione evento (opzionale) */}
                            {tipoCorrente && (
                                <div>
                                    <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                        {t('standard.descrizione_label')}
                                    </label>
                                    <input
                                        type="text"
                                        value={eventoDescrizione}
                                        onChange={e => setEventoDescrizione(e.target.value)}
                                        placeholder={t('standard.descrizione_placeholder', {
                                            evento: tipoCorrente.da_evento_label || t('standard.descrizione_evento_default'),
                                            data: new Date(dataEvento).toLocaleDateString(dateLocale),
                                        })}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                    />
                                    <p className="font-body text-xs text-nebbia/30 mt-1.5">
                                        {t('standard.descrizione_hint')}
                                    </p>
                                </div>
                            )}

                            {/* Anteprima calcolo */}
                            {tipoSelected && (
                                <div className="bg-petrolio/50 border border-oro/20 p-4">
                                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">
                                        {t('anteprima.titolo_calcolo')}
                                    </p>
                                    {calcolando ? (
                                        <div className="flex items-center gap-2 text-nebbia/50">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="font-body text-sm">{t('anteprima.calcolo_in_corso')}</span>
                                        </div>
                                    ) : anteprima ? (
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <Calendar size={18} className="text-oro mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-display text-xl font-semibold text-oro capitalize">
                                                        {fmtDataLunga(anteprima.data_scadenza, dateLocale)}
                                                    </p>
                                                    <p className="font-body text-xs text-nebbia/50 mt-0.5">{t('anteprima.scadenza_calcolata')}</p>
                                                </div>
                                            </div>

                                            {/* Warning scadenza nel passato */}
                                            {isDataPassata(anteprima.data_scadenza) && (
                                                <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                                                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                                    <div className="font-body text-xs text-amber-400/90 space-y-1">
                                                        <p className="font-medium">
                                                            {t('anteprima.passata_titolo', { giorni: giorniDifferenza(anteprima.data_scadenza) })}
                                                        </p>
                                                        {aRitroso ? (
                                                            <p className="text-amber-400/70">
                                                                {t('anteprima.passata_a_ritroso', { tipo: tipoCorrente?.label, giorni: tipoCorrente?.giorni })}
                                                                <br />
                                                                {t('anteprima.passata_a_ritroso_storico')}
                                                            </p>
                                                        ) : (
                                                            <p className="text-amber-400/70">
                                                                {t('anteprima.passata_in_avanti', { giorni: tipoCorrente?.giorni })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nota di calcolo */}
                                            {anteprima.note && (
                                                <div className="flex items-start gap-3 pt-2 border-t border-white/5">
                                                    <Info size={14} className="text-nebbia/50 mt-0.5 shrink-0" />
                                                    <p className="font-body text-xs text-nebbia/60">{anteprima.note}</p>
                                                </div>
                                            )}

                                            {/* Disclaimer verifica professionale (CH) */}
                                            <div className="flex items-start gap-3 pt-2 border-t border-white/5">
                                                <AlertTriangle size={13} className="text-nebbia/40 mt-0.5 shrink-0" />
                                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                                    {t('anteprima.disclaimer')}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-body text-sm text-nebbia/40">{t('anteprima.vuoto')}</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════
                         MODALITA' PERSONALIZZATO
                       ═══════════════════════════════════════════════ */}
                    {modalita === 'personalizzato' && (
                        <>
                            {/* Nome termine */}
                            <div>
                                <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                    {t('personalizzato.nome_label')}
                                </label>
                                <input
                                    type="text"
                                    value={nomePersonalizzato}
                                    onChange={e => setNomePersonalizzato(e.target.value)}
                                    placeholder={t('personalizzato.nome_placeholder')}
                                    maxLength={120}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                <p className="font-body text-xs text-nebbia/30 mt-1.5">
                                    {t('personalizzato.nome_hint')}
                                </p>
                            </div>

                            {/* Data scadenza */}
                            <div>
                                <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                    {t('personalizzato.data_label')}
                                </label>
                                <input
                                    type="date"
                                    value={dataScadenzaPers}
                                    onChange={e => setDataScadenzaPers(e.target.value)}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50"
                                />
                                <p className="font-body text-xs text-nebbia/30 mt-1.5">
                                    {t('personalizzato.data_hint')}
                                </p>
                            </div>

                            {/* Anteprima personalizzato */}
                            {dataScadenzaPers && (
                                <div className="bg-petrolio/50 border border-oro/20 p-4">
                                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">
                                        {t('anteprima.titolo')}
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Calendar size={18} className="text-oro mt-0.5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-display text-xl font-semibold text-oro capitalize">
                                                    {fmtDataLunga(dataScadenzaPers, dateLocale)}
                                                </p>
                                                <p className="font-body text-xs text-nebbia/50 mt-0.5">
                                                    {nomePersonalizzato.trim() || t('personalizzato.anteprima_default')}
                                                </p>
                                            </div>
                                        </div>

                                        {isDataPassata(dataScadenzaPers) && (
                                            <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                                                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                                <p className="font-body text-xs text-amber-400/90">
                                                    {t('personalizzato.passata', { giorni: giorniDifferenza(dataScadenzaPers) })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Note avvocato (comune) */}
                    {((modalita === 'standard' && tipoCorrente) || modalita === 'personalizzato') && (
                        <div>
                            <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                {t('note.label')}
                            </label>
                            <textarea
                                value={noteAvvocato}
                                onChange={e => setNoteAvvocato(e.target.value)}
                                rows={2}
                                placeholder={t('note.placeholder')}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    )}

                    {/* Info trigger calendario */}
                    {puoSalvare && (
                        <div className="flex items-start gap-2 text-nebbia/40">
                            <Info size={11} className="mt-0.5 shrink-0" />
                            <p className="font-body text-xs">
                                {t('info_calendario')}
                            </p>
                        </div>
                    )}

                    {/* Errore */}
                    {errore && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3">
                            <p className="font-body text-sm text-red-400">{errore}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        disabled={salvando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40"
                    >
                        {t('footer.annulla')}
                    </button>
                    <button
                        onClick={salva}
                        disabled={!puoSalvare || salvando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {salvando ? (
                            <><Loader2 size={14} className="animate-spin" /> {t('footer.salvando')}</>
                        ) : (
                            t('footer.aggiungi')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}