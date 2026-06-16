// src/components/fiduciario/FormDipendente.jsx
//
// Modal per creare o modificare un dipendente/socio di un cliente-azienda.
// Autonomo: recupera avvocato_id (utente loggato) e studio_id (profilo) da sé.
//
// Props:
//   clienteId   (string)        - cliente-azienda a cui appartiene il dipendente (obbligatorio)
//   dipendente  (object|null)   - se passato, modalità modifica (precompila + UPDATE); altrimenti crea
//   onClose()   - chiusura modal
//   onSaved()   - callback dopo salvataggio riuscito

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { X, User, Briefcase, Building2, Globe, Loader2, AlertCircle, Paperclip, FileText, ExternalLink, Plus, Trash2, Gift, Check, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export default function FormDipendente({ clienteId, dipendente = null, onClose, onSaved, onBonusCambiato = null }) {
    const { t, i18n } = useTranslation('comp_fid_form_dipendente')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
    const isModifica = !!dipendente

    // ── Anagrafica ──
    const [nome, setNome] = useState(dipendente?.nome ?? '')
    const [cognome, setCognome] = useState(dipendente?.cognome ?? '')
    const [dataNascita, setDataNascita] = useState(dipendente?.data_nascita ?? '')
    const [numeroAvs, setNumeroAvs] = useState(dipendente?.numero_avs ?? '')

    // ── Ruolo in azienda ──
    const [isSocio, setIsSocio] = useState(dipendente?.is_socio ?? false)
    const [isDipendente, setIsDipendente] = useState(dipendente?.is_dipendente ?? true)
    const [ruolo, setRuolo] = useState(dipendente?.ruolo ?? '')
    const [quota, setQuota] = useState(dipendente?.quota_partecipazione ?? '')

    // ── Rapporto di lavoro ──
    const [dataAssunzione, setDataAssunzione] = useState(dipendente?.data_assunzione ?? '')
    const [dataFine, setDataFine] = useState(dipendente?.data_fine ?? '')
    const [percentuale, setPercentuale] = useState(dipendente?.percentuale_impiego ?? '')
    const [salario, setSalario] = useState(dipendente?.salario ?? '')
    const [salarioPeriodicita, setSalarioPeriodicita] = useState(dipendente?.salario_periodicita ?? 'annuo')

    // ── Imposta alla fonte ──
    const [nazionalita, setNazionalita] = useState(dipendente?.nazionalita ?? '')
    const [tipoPermesso, setTipoPermesso] = useState(dipendente?.tipo_permesso ?? '')
    const [impostaFonte, setImpostaFonte] = useState(dipendente?.imposta_fonte ?? false)

    // ── Note ──
    const [note, setNote] = useState(dipendente?.note ?? '')

    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    // ── Documenti assegnati al dipendente (solo in modifica) ──
    const [documenti, setDocumenti] = useState([])
    const [caricandoDoc, setCaricandoDoc] = useState(false)

    // ── Bonus (solo in modifica) ──
    const [bonus, setBonus] = useState([])
    const [caricandoBonus, setCaricandoBonus] = useState(false)
    const [nuovoBonusImporto, setNuovoBonusImporto] = useState('')
    const [nuovoBonusData, setNuovoBonusData] = useState('')
    const [nuovoBonusDescr, setNuovoBonusDescr] = useState('')
    const [salvandoBonus, setSalvandoBonus] = useState(false)

    // ── Toast conferma salvataggio ──
    const [toast, setToast] = useState(false)

    useEffect(() => {
        if (!dipendente?.id) return
        let attivo = true
        async function caricaDoc() {
            setCaricandoDoc(true)
            const { data } = await supabase
                .from('archivio_documenti')
                .select('id, titolo, tipo, created_at, ocr_status')
                .eq('dipendente_id', dipendente.id)
                .order('created_at', { ascending: false })
            if (attivo) {
                setDocumenti(data ?? [])
                setCaricandoDoc(false)
            }
        }
        caricaDoc()
        return () => { attivo = false }
    }, [dipendente?.id])

    // Carica i bonus del dipendente (solo in modifica)
    useEffect(() => {
        if (!dipendente?.id) return
        caricaBonus()
    }, [dipendente?.id])

    async function caricaBonus() {
        if (!dipendente?.id) return
        setCaricandoBonus(true)
        const { data } = await supabase
            .from('dipendenti_bonus')
            .select('id, importo, data_bonus, descrizione')
            .eq('dipendente_id', dipendente.id)
            .order('data_bonus', { ascending: false })
        setBonus(data ?? [])
        setCaricandoBonus(false)
    }

    async function aggiungiBonus() {
        const imp = Number(nuovoBonusImporto)
        if (!imp || imp <= 0 || !nuovoBonusData) {
            setErrore(t('errori.bonus_invalido'))
            return
        }
        setSalvandoBonus(true)
        setErrore(null)
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profilo } = await supabase
            .from('profiles').select('studio_id').eq('id', user.id).single()

        const { error } = await supabase.from('dipendenti_bonus').insert({
            dipendente_id: dipendente.id,
            cliente_id: clienteId,
            avvocato_id: user.id,
            studio_id: profilo?.studio_id ?? null,
            importo: imp,
            data_bonus: nuovoBonusData,
            descrizione: nuovoBonusDescr.trim() || null,
            creato_da: user.id,
        })
        setSalvandoBonus(false)
        if (error) { setErrore(error.message); return }
        setNuovoBonusImporto(''); setNuovoBonusData(''); setNuovoBonusDescr('')
        caricaBonus()
        if (onBonusCambiato) onBonusCambiato()
    }

    async function eliminaBonus(id) {
        setSalvandoBonus(true)
        await supabase.from('dipendenti_bonus').delete().eq('id', id)
        setSalvandoBonus(false)
        caricaBonus()
        if (onBonusCambiato) onBonusCambiato()
    }

    // Chiudi con ESC
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    const navigate = useNavigate()
    const puoSalvare = nome.trim() && cognome.trim() && (isSocio || isDipendente)

    // Rileva modifiche non salvate confrontando con i valori iniziali del dipendente.
    // In creazione (nessun dipendente) consideriamo "dirty" se sono stati toccati i campi base.
    const valIniz = (k, fallback = '') => dipendente?.[k] ?? fallback
    const dirty = isModifica && (
        nome !== valIniz('nome') ||
        cognome !== valIniz('cognome') ||
        (dataNascita || '') !== (valIniz('data_nascita') || '') ||
        (numeroAvs || '') !== (valIniz('numero_avs') || '') ||
        isSocio !== (dipendente?.is_socio ?? false) ||
        isDipendente !== (dipendente?.is_dipendente ?? true) ||
        (ruolo || '') !== (valIniz('ruolo') || '') ||
        String(quota ?? '') !== String(valIniz('quota_partecipazione') ?? '') ||
        (dataAssunzione || '') !== (valIniz('data_assunzione') || '') ||
        (dataFine || '') !== (valIniz('data_fine') || '') ||
        String(percentuale ?? '') !== String(valIniz('percentuale_impiego') ?? '') ||
        String(salario ?? '') !== String(valIniz('salario') ?? '') ||
        salarioPeriodicita !== (valIniz('salario_periodicita') || 'annuo') ||
        (nazionalita || '') !== (valIniz('nazionalita') || '') ||
        (tipoPermesso || '') !== (valIniz('tipo_permesso') || '') ||
        impostaFonte !== (dipendente?.imposta_fonte ?? false) ||
        (note || '') !== (valIniz('note') || '')
    )

    async function salva(dopoSalvataggio = null) {
        if (!puoSalvare) {
            setErrore(t('errori.campi_obbligatori'))
            return
        }
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setErrore(t('errori.sessione_scaduta'))
            setSalvando(false)
            return
        }

        // studio_id dal profilo dell'utente loggato
        const { data: profilo } = await supabase
            .from('profiles')
            .select('studio_id')
            .eq('id', user.id)
            .single()

        // Helper: numero o null
        const num = v => {
            if (v === '' || v === null || v === undefined) return null
            const n = Number(v)
            return isNaN(n) ? null : n
        }
        const txt = v => (v?.toString().trim() ? v.toString().trim() : null)

        const payload = {
            cliente_id: clienteId,
            nome: nome.trim(),
            cognome: cognome.trim(),
            data_nascita: dataNascita || null,
            numero_avs: txt(numeroAvs),
            is_socio: isSocio,
            is_dipendente: isDipendente,
            ruolo: txt(ruolo),
            quota_partecipazione: isSocio ? num(quota) : null,
            data_assunzione: isDipendente ? (dataAssunzione || null) : null,
            data_fine: isDipendente ? (dataFine || null) : null,
            percentuale_impiego: isDipendente ? num(percentuale) : null,
            salario: isDipendente ? num(salario) : null,
            salario_periodicita: isDipendente ? salarioPeriodicita : null,
            nazionalita: txt(nazionalita),
            tipo_permesso: txt(tipoPermesso),
            imposta_fonte: impostaFonte,
            note: txt(note),
            aggiornato_da: user.id,
        }

        let error
        if (isModifica) {
            ({ error } = await supabase
                .from('clienti_dipendenti')
                .update(payload)
                .eq('id', dipendente.id))
        } else {
            ({ error } = await supabase
                .from('clienti_dipendenti')
                .insert({
                    ...payload,
                    avvocato_id: user.id,
                    studio_id: profilo?.studio_id ?? null,
                    creato_da: user.id,
                }))
        }

        setSalvando(false)
        if (error) {
            setErrore(error.message)
            return
        }
        if (dopoSalvataggio) {
            dopoSalvataggio()
            return
        }
        // Mostra il toast di conferma, poi chiudi (onSaved ricarica i dati nel parent)
        setToast(true)
        setTimeout(() => onSaved(), 900)
    }

    function vaiAdArchivio() {
        if (!dipendente?.id) return
        navigate(`/archivio?dipendente_id=${dipendente.id}&cliente_id=${clienteId}`)
    }

    function gestisciAggiungiDocumento() {
        if (!dirty) {
            // Nessuna modifica pendente → naviga diretto
            vaiAdArchivio()
            return
        }
        // Modifiche pendenti → chiedi conferma; su OK salva e poi naviga
        const conferma = confirm(t('conferme.modifiche_non_salvate'))
        if (!conferma) return
        salva(vaiAdArchivio)  // salva, e a salvataggio riuscito naviga
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
    const labelCls = "block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2"

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={() => { if (!salvando) onClose() }}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Toast conferma salvataggio */}
                {toast && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-salvia/20 border border-salvia/40 text-salvia font-body text-sm shadow-lg">
                        <Check size={14} /> {t('toast.salvato')}
                    </div>
                )}

                {/* Header */}
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div>
                        <p className="font-display text-lg text-nebbia">
                            {isModifica ? t('header.modifica') : t('header.nuovo')}
                        </p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">
                            {t('header.sottotitolo')}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={salvando}
                        className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40">
                        <X size={18} className="text-nebbia/60" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* ── ANAGRAFICA ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <User size={13} className="text-oro" />
                            <p className="section-label !m-0">{t('anagrafica.titolo')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t('anagrafica.nome')}</label>
                                <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>{t('anagrafica.cognome')}</label>
                                <input value={cognome} onChange={e => setCognome(e.target.value)} className={inputCls} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t('anagrafica.data_nascita')}</label>
                                <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>{t('anagrafica.numero_avs')}</label>
                                <input value={numeroAvs} onChange={e => setNumeroAvs(e.target.value)}
                                    placeholder="756.XXXX.XXXX.XX" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    {/* ── RUOLO IN AZIENDA ── */}
                    <div className="space-y-4 border-t border-white/8 pt-5">
                        <div className="flex items-center gap-2">
                            <Building2 size={13} className="text-oro" />
                            <p className="section-label !m-0">{t('ruolo.titolo')}</p>
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isDipendente}
                                    onChange={e => setIsDipendente(e.target.checked)}
                                    className="accent-oro w-4 h-4" />
                                <span className="font-body text-sm text-nebbia/80">{t('ruolo.dipendente')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isSocio}
                                    onChange={e => setIsSocio(e.target.checked)}
                                    className="accent-oro w-4 h-4" />
                                <span className="font-body text-sm text-nebbia/80">{t('ruolo.socio')}</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t('ruolo.qualifica')}</label>
                                <input value={ruolo} onChange={e => setRuolo(e.target.value)}
                                    placeholder={t('ruolo.qualifica_ph')} className={inputCls} />
                            </div>
                            {isSocio && (
                                <div>
                                    <label className={labelCls}>{t('ruolo.quota')}</label>
                                    <input type="number" step="0.01" min="0" max="100"
                                        value={quota} onChange={e => setQuota(e.target.value)}
                                        placeholder={t('ruolo.quota_ph')} className={inputCls} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RAPPORTO DI LAVORO (solo se dipendente) ── */}
                    {isDipendente && (
                        <div className="space-y-4 border-t border-white/8 pt-5">
                            <div className="flex items-center gap-2">
                                <Briefcase size={13} className="text-oro" />
                                <p className="section-label !m-0">{t('rapporto.titolo')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>{t('rapporto.data_assunzione')}</label>
                                    <input type="date" value={dataAssunzione} onChange={e => setDataAssunzione(e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('rapporto.data_fine')} <span className="text-nebbia/25 normal-case tracking-normal">{t('rapporto.data_fine_hint')}</span></label>
                                    <input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>{t('rapporto.impiego')}</label>
                                    <input type="number" step="1" min="0" max="100"
                                        value={percentuale} onChange={e => setPercentuale(e.target.value)}
                                        placeholder="100" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('rapporto.salario')}</label>
                                    <input type="number" step="0.01" min="0"
                                        value={salario} onChange={e => setSalario(e.target.value)}
                                        placeholder="0.00" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('rapporto.periodicita')}</label>
                                    <select value={salarioPeriodicita} onChange={e => setSalarioPeriodicita(e.target.value)} className={inputCls}>
                                        <option value="annuo">{t('rapporto.periodicita_annuo')}</option>
                                        <option value="mensile">{t('rapporto.periodicita_mensile')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── IMPOSTA ALLA FONTE ── */}
                    <div className="space-y-4 border-t border-white/8 pt-5">
                        <div className="flex items-center gap-2">
                            <Globe size={13} className="text-oro" />
                            <p className="section-label !m-0">{t('fonte.titolo')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>{t('fonte.nazionalita')}</label>
                                <input value={nazionalita} onChange={e => setNazionalita(e.target.value)}
                                    placeholder={t('fonte.nazionalita_ph')} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>{t('fonte.tipo_permesso')}</label>
                                <input value={tipoPermesso} onChange={e => setTipoPermesso(e.target.value)}
                                    placeholder={t('fonte.tipo_permesso_ph')} className={inputCls} />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={impostaFonte}
                                onChange={e => setImpostaFonte(e.target.checked)}
                                className="accent-oro w-4 h-4" />
                            <span className="font-body text-sm text-nebbia/80">{t('fonte.soggetto')}</span>
                        </label>
                    </div>

                    {/* ── NOTE ── */}
                    <div className="border-t border-white/8 pt-5">
                        <label className={labelCls}>{t('note.label')} <span className="text-nebbia/25 normal-case tracking-normal">{t('note.opzionale')}</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            placeholder={t('note.placeholder')}
                            className={`${inputCls} resize-none`} />
                    </div>

                    {/* ── BONUS ── */}
                    <div className="border-t border-white/8 pt-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Gift size={13} className="text-oro" />
                            <p className="section-label !m-0">{t('bonus.titolo')}</p>
                        </div>

                        {isModifica ? (
                            <>
                                {/* Form aggiunta bonus */}
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3">
                                        <label className={labelCls}>{t('bonus.importo')}</label>
                                        <input type="number" step="0.01" min="0"
                                            value={nuovoBonusImporto}
                                            onChange={e => setNuovoBonusImporto(e.target.value)}
                                            placeholder="0.00" className={inputCls} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className={labelCls}>{t('bonus.data')}</label>
                                        <input type="date"
                                            value={nuovoBonusData}
                                            onChange={e => setNuovoBonusData(e.target.value)}
                                            className={inputCls} />
                                    </div>
                                    <div className="col-span-4">
                                        <label className={labelCls}>{t('bonus.descrizione')}</label>
                                        <input
                                            value={nuovoBonusDescr}
                                            onChange={e => setNuovoBonusDescr(e.target.value)}
                                            placeholder={t('bonus.descrizione_ph')} className={inputCls} />
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            type="button"
                                            onClick={aggiungiBonus}
                                            disabled={salvandoBonus}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-oro/10 border border-oro/30 text-oro hover:bg-oro/20 font-body text-xs transition-colors disabled:opacity-40"
                                        >
                                            {salvandoBonus
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <><Plus size={12} /> {t('bonus.aggiungi')}</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Lista bonus */}
                                {caricandoBonus ? (
                                    <div className="flex items-center justify-center py-3">
                                        <Loader2 size={16} className="animate-spin text-oro" />
                                    </div>
                                ) : bonus.length > 0 && (
                                    <div className="border border-white/8 divide-y divide-white/5">
                                        {bonus.map(b => (
                                            <div key={b.id} className="flex items-center gap-2 px-3 py-2 group">
                                                <Gift size={12} className="text-oro/50 shrink-0" />
                                                <span className="font-body text-sm text-oro font-medium shrink-0">
                                                    CHF {Number(b.importo).toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="font-body text-xs text-nebbia/40 flex items-center gap-1 shrink-0">
                                                    <Calendar size={10} /> {new Date(b.data_bonus).toLocaleDateString(dateLocale)}
                                                </span>
                                                {b.descrizione && (
                                                    <span className="font-body text-xs text-nebbia/40 truncate flex-1">{b.descrizione}</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => eliminaBonus(b.id)}
                                                    disabled={salvandoBonus}
                                                    className="ml-auto text-nebbia/25 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                                                    title={t('bonus.elimina_tooltip')}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="font-body text-[11px] text-nebbia/25 italic">
                                    {t('bonus.nota')}
                                </p>
                            </>
                        ) : (
                            <p className="font-body text-xs text-nebbia/40 bg-petrolio/40 border border-white/5 p-3 leading-relaxed">
                                {t('bonus.salva_prima')}
                            </p>
                        )}
                    </div>

                    {/* ── DOCUMENTI ── */}
                    <div className="border-t border-white/8 pt-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Paperclip size={13} className="text-oro" />
                            <p className="section-label !m-0">{t('documenti.titolo')}</p>
                        </div>

                        {isModifica ? (
                            <>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="font-body text-xs text-nebbia/40">
                                        {documenti.length === 0
                                            ? t('documenti.nessuno')
                                            : (documenti.length === 1
                                                ? t('documenti.conteggio_uno', { count: documenti.length })
                                                : t('documenti.conteggio_molti', { count: documenti.length }))}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={gestisciAggiungiDocumento}
                                        disabled={salvando}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-oro/30 text-oro hover:bg-oro/10 font-body text-xs transition-colors disabled:opacity-40"
                                    >
                                        <Paperclip size={11} /> {t('documenti.aggiungi')}
                                    </button>
                                </div>

                                {caricandoDoc ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 size={16} className="animate-spin text-oro" />
                                    </div>
                                ) : documenti.length > 0 && (
                                    <div className="border border-white/8 divide-y divide-white/5">
                                        {documenti.map(d => (
                                            <Link
                                                key={d.id}
                                                to={`/archivio/${d.id}`}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-petrolio/40 transition-colors group"
                                            >
                                                <FileText size={13} className="text-oro/50 shrink-0" />
                                                <span className="font-body text-sm text-nebbia/80 truncate flex-1">{d.titolo}</span>
                                                <span className="font-body text-[10px] text-nebbia/25 shrink-0">
                                                    {new Date(d.created_at).toLocaleDateString(dateLocale)}
                                                </span>
                                                <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                <p className="font-body text-[11px] text-nebbia/25 italic">
                                    {t('documenti.nota')}
                                </p>
                            </>
                        ) : (
                            <p className="font-body text-xs text-nebbia/40 bg-petrolio/40 border border-white/5 p-3 leading-relaxed">
                                {t('documenti.salva_prima')}
                            </p>
                        )}
                    </div>

                    {/* Errore */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0">
                    <button onClick={onClose} disabled={salvando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40">
                        {t('footer.annulla')}
                    </button>
                    <button onClick={() => salva()} disabled={!puoSalvare || salvando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {salvando
                            ? <><Loader2 size={14} className="animate-spin" /> {t('footer.salvando')}</>
                            : (isModifica ? t('footer.salva_modifiche') : t('footer.aggiungi'))}
                    </button>
                </div>
            </div>
        </div>
    )
}