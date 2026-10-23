// src/pages/admin/Novita.jsx
//
// Il blog «Novità» della vetrina svizzera, scritto qui. Ogni articolo ha una versione
// per lingua (it, de, fr): stesse impostazioni (autore, copertina, stato, data), testi
// e indirizzi propri. Pubblica, programma e ritira valgono per tutte le versioni insieme.
// Le bozze restano invisibili fuori da questa pagina; alla pubblicazione il sito si
// rigenera da solo, così l'articolo nasce con la sua testata per Google e per i link.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared'
import {
    Plus, Save, Send, Eye, Trash2, Loader2, ArrowLeft,
    RefreshCw, AlertCircle, CheckCircle, Newspaper, Link2, CalendarClock,
} from 'lucide-react'
import { slugDa, firmaAutore, fmtDataLunga } from '@/lib/novita'

const LINGUE = ['it', 'de', 'fr']
const NOMI = { it: 'Italiano', de: 'Deutsch', fr: 'Français' }

const VERSIONE_VUOTA = { id: null, titolo: '', slug: '', sommario: '', contenuto: '', categoria: '' }
const VUOTO = {
    gruppo: null,
    autore: '', copertina_url: '', instagram_url: '', tiktok_url: '',
    stato: 'bozza', programmato_il: '',
    versioni: { it: { ...VERSIONE_VUOTA }, de: { ...VERSIONE_VUOTA }, fr: { ...VERSIONE_VUOTA } },
}

// Data e ora per <input type="datetime-local"> (ora locale) e ritorno in ISO
const aCampoOra = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    const z = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}
const daCampoOra = v => (v ? new Date(v).toISOString() : null)
const fmtProgrammato = iso => new Date(iso).toLocaleString('it-CH', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

const CAMPO = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 transition-colors'
const ETICHETTA = 'block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-1.5'
const BOTTONE = 'flex items-center justify-center gap-2 min-h-[42px] px-4 border border-white/10 text-nebbia/60 font-body text-sm hover:text-oro hover:border-oro/30 transition-colors disabled:opacity-40'

// Le righe del DB (una per lingua) raccolte per articolo
function raggruppa(righe) {
    const mappa = new Map()
    for (const r of righe) {
        if (!mappa.has(r.gruppo)) mappa.set(r.gruppo, { gruppo: r.gruppo, versioni: {}, creato: r.created_at })
        const g = mappa.get(r.gruppo)
        g.versioni[r.lingua] = r
        if (r.created_at < g.creato) g.creato = r.created_at
    }
    return [...mappa.values()]
        .map(g => {
            const prima = g.versioni.it ?? g.versioni.de ?? g.versioni.fr
            return { ...g, prima, stato: prima.stato, programmato_il: prima.programmato_il, pubblicato_il: prima.pubblicato_il }
        })
        .sort((a, b) => {
            // prima i programmati in ordine di uscita, poi il resto dal più recente
            const da = a.stato === 'programmato' ? a.programmato_il : null
            const db = b.stato === 'programmato' ? b.programmato_il : null
            if (da && db) return da.localeCompare(db)
            if (da) return -1
            if (db) return 1
            return (b.pubblicato_il ?? b.creato).localeCompare(a.pubblicato_il ?? a.creato)
        })
}

function formDaGruppo(g) {
    const p = g.prima
    const versioni = {}
    for (const l of LINGUE) {
        const v = g.versioni[l]
        versioni[l] = v
            ? { id: v.id, titolo: v.titolo ?? '', slug: v.slug ?? '', sommario: v.sommario ?? '', contenuto: v.contenuto ?? '', categoria: v.categoria ?? '' }
            : { ...VERSIONE_VUOTA }
    }
    return {
        gruppo: g.gruppo,
        autore: p.autore ?? '', copertina_url: p.copertina_url ?? '',
        instagram_url: p.instagram_url ?? '', tiktok_url: p.tiktok_url ?? '',
        stato: p.stato, programmato_il: p.programmato_il ?? '',
        versioni,
    }
}

export default function AdminNovita() {
    const { profile } = useAuth()
    const [gruppi, setGruppi] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState(null)          // null = elenco, oggetto = editor
    const [scheda, setScheda] = useState('it')
    const [salvando, setSalvando] = useState(false)
    const [msg, setMsg] = useState('')
    const [errore, setErrore] = useState('')
    const [hook, setHook] = useState('')
    const [salvandoHook, setSalvandoHook] = useState(false)

    async function carica() {
        const { data } = await supabase.from('novita').select('*').order('created_at', { ascending: false })
        setGruppi(raggruppa(data ?? []))
        setLoading(false)
    }

    useEffect(() => {
        carica()
        supabase.from('impostazioni_sito').select('valore').eq('chiave', 'vercel_deploy_hook').maybeSingle()
            .then(({ data }) => setHook(data?.valore ?? ''))
    }, [])

    async function rigeneraSito() {
        const { data, error } = await supabase.functions.invoke('rigenera-sito')
        if (error) return 'Il sito non è ripartito: controlla l\'indirizzo di rilascio.'
        if (data?.ok === false) return data.error
        return null
    }

    const cambiaVersione = (lingua, campo, valore) =>
        setForm(f => ({ ...f, versioni: { ...f.versioni, [lingua]: { ...f.versioni[lingua], [campo]: valore } } }))

    // modo: 'bozza' (salva com'è), 'pubblica' (subito), 'programma' (al giorno e ora scelti)
    async function salva(modo) {
        const pubblica = modo === 'pubblica'
        const presenti = LINGUE.filter(l => form.versioni[l].titolo.trim())
        const svuotate = LINGUE.filter(l => !form.versioni[l].titolo.trim() && form.versioni[l].id)
        if (!presenti.length) {
            setErrore('Manca il titolo: scrivi almeno una lingua.')
            return
        }
        if (svuotate.length) {
            setErrore(`Il titolo manca in ${svuotate.map(l => NOMI[l]).join(', ')}: scrivilo, oppure togli quella lingua con «Togli questa lingua».`)
            return
        }
        if (modo === 'programma' && (!form.programmato_il || new Date(form.programmato_il) <= new Date())) {
            setErrore('Scegli un giorno e un\'ora nel futuro per la pubblicazione programmata.')
            return
        }
        setSalvando(true)
        setErrore('')
        setMsg('')

        const gruppo = form.gruppo ?? crypto.randomUUID()
        const stato = pubblica ? 'pubblicato' : modo === 'programma' ? 'programmato' : form.stato
        const comuni = {
            gruppo,
            autore: form.autore?.trim() || null,
            copertina_url: form.copertina_url?.trim() || null,
            instagram_url: form.instagram_url?.trim() || null,
            tiktok_url: form.tiktok_url?.trim() || null,
            stato,
            programmato_il: (modo === 'programma' || (!pubblica && form.stato === 'programmato'))
                ? daCampoOra(form.programmato_il) : null,
        }

        let error = null
        for (const l of presenti) {
            const v = form.versioni[l]
            const riga = {
                ...comuni,
                lingua: l,
                titolo: v.titolo.trim(),
                slug: (v.slug || slugDa(v.titolo)).trim(),
                sommario: v.sommario?.trim() || null,
                contenuto: v.contenuto ?? '',
                categoria: v.categoria?.trim() || null,
            }
            const r = v.id
                ? await supabase.from('novita').update(riga).eq('id', v.id)
                : await supabase.from('novita').insert({ ...riga, creato_da: profile?.id })
            if (r.error) { error = { ...r.error, lingua: l }; break }
        }

        setSalvando(false)
        if (error) {
            setErrore(error.code === '23505' ? `Esiste già un articolo in ${NOMI[error.lingua]} con questo indirizzo: cambia il titolo o lo slug.`
                : error.code === '23514' ? 'Il collegamento al post non è valido: deve iniziare con https://www.instagram.com/ o https://www.tiktok.com/.'
                    : error.message)
            setForm(f => ({ ...f, gruppo }))
            carica()
            return
        }

        setMsg(pubblica ? 'Articolo pubblicato. Il sito si sta rigenerando.'
            : stato === 'programmato' ? `Articolo programmato: esce ${fmtProgrammato(comuni.programmato_il)}.`
                : 'Bozza salvata.')
        setForm(null)
        carica()
        if (pubblica) {
            const problema = await rigeneraSito()
            if (problema) setErrore(problema)
        }
    }

    async function togliLingua(lingua) {
        const v = form.versioni[lingua]
        if (!v.id || !confirm(`Togliere la versione in ${NOMI[lingua]}?`)) return
        await supabase.from('novita').delete().eq('id', v.id)
        setForm(f => ({ ...f, versioni: { ...f.versioni, [lingua]: { ...VERSIONE_VUOTA } } }))
        carica()
        if (form.stato === 'pubblicato') await rigeneraSito()
    }

    async function cambiaStato(g, stato) {
        await supabase.from('novita')
            .update({ stato, programmato_il: stato === 'bozza' ? null : g.programmato_il })
            .eq('gruppo', g.gruppo)
        carica()
        // Il sito si rigenera solo se cambia quello che si vede: un programmato riportato in bozza non era online
        if (stato !== 'pubblicato' && g.stato !== 'pubblicato') {
            setMsg('Programmazione annullata: l\'articolo è tornato in bozza.')
            return
        }
        const problema = await rigeneraSito()
        setMsg(problema ? '' : stato === 'pubblicato' ? 'Articolo pubblicato.' : 'Articolo ritirato dalla vetrina.')
        if (problema) setErrore(problema)
    }

    async function elimina(g) {
        if (!confirm(`Eliminare "${g.prima.titolo}" in tutte le lingue?`)) return
        await supabase.from('novita').delete().eq('gruppo', g.gruppo)
        carica()
        if (g.stato === 'pubblicato') await rigeneraSito()
    }

    async function salvaHook() {
        setSalvandoHook(true)
        setErrore('')
        const { error } = await supabase.from('impostazioni_sito').upsert({
            chiave: 'vercel_deploy_hook',
            valore: hook.trim() || null,
            aggiornato_il: new Date().toISOString(),
            aggiornato_da: profile?.id,
        })
        setSalvandoHook(false)
        if (error) setErrore(error.message)
        else setMsg('Indirizzo di rilascio salvato.')
    }

    // ─── EDITOR ───
    if (form) {
        const v = form.versioni[scheda]
        const anteprimaSlug = (v.slug || slugDa(v.titolo)) || '…'
        return (
            <div className="space-y-5 pb-16">
                <button type="button" onClick={() => setForm(null)} className="flex items-center gap-2 font-body text-sm text-nebbia/40 hover:text-oro transition-colors">
                    <ArrowLeft size={15} /> Tutti gli articoli
                </button>

                <PageHeader
                    label="Novità"
                    title={form.gruppo ? 'Modifica articolo' : 'Nuovo articolo'}
                    subtitle={`lexum.ch/${scheda}/novita/${anteprimaSlug}`}
                />

                <div className="bg-slate border border-white/5 p-5 space-y-4">
                    {/* Le tre lingue */}
                    <div className="flex gap-0 border-b border-white/10 -mt-1">
                        {LINGUE.map(l => {
                            const piena = form.versioni[l].titolo.trim()
                            return (
                                <button key={l} type="button" onClick={() => setScheda(l)}
                                    className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm border-b-2 transition-colors ${scheda === l ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
                                    {NOMI[l]}
                                    <span className={`w-1.5 h-1.5 rounded-full ${piena ? 'bg-salvia' : 'bg-white/15'}`} />
                                </button>
                            )
                        })}
                    </div>

                    <div>
                        <label className={ETICHETTA}>Titolo ({scheda.toUpperCase()})</label>
                        <input
                            className={CAMPO}
                            value={v.titolo}
                            onChange={e => cambiaVersione(scheda, 'titolo', e.target.value)}
                            placeholder={scheda === 'de' ? 'Titel des Beitrags' : scheda === 'fr' ? 'Titre de l\'article' : 'Il titolo dell\'articolo'}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label className={ETICHETTA}>Indirizzo (slug)</label>
                            <input
                                className={CAMPO}
                                value={v.slug}
                                onChange={e => cambiaVersione(scheda, 'slug', e.target.value)}
                                placeholder={slugDa(v.titolo) || 'indirizzo-articolo'}
                            />
                        </div>
                        <div>
                            <label className={ETICHETTA}>Categoria</label>
                            <input
                                className={CAMPO}
                                value={v.categoria}
                                onChange={e => cambiaVersione(scheda, 'categoria', e.target.value)}
                                placeholder={scheda === 'de' ? 'Recht in der Praxis' : scheda === 'fr' ? 'Le droit en pratique' : 'Diritto in pratica'}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={ETICHETTA}>Sommario</label>
                        <textarea
                            rows={2}
                            className={`${CAMPO} resize-none`}
                            value={v.sommario}
                            onChange={e => cambiaVersione(scheda, 'sommario', e.target.value)}
                            placeholder="Una o due righe: è quello che si legge nell'elenco e nelle anteprime dei link."
                        />
                    </div>

                    <div>
                        <label className={ETICHETTA}>Testo</label>
                        <textarea
                            rows={18}
                            className={`${CAMPO} font-mono`}
                            value={v.contenuto}
                            onChange={e => cambiaVersione(scheda, 'contenuto', e.target.value)}
                            placeholder={'## Un sottotitolo\n\nIl testo dell\'articolo.\n\n- un elenco\n- di punti\n\n**Grassetto** e [collegamenti](https://www.lexum.ch).'}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                            <p className="font-body text-xs text-nebbia/30">
                                Si scrive in Markdown: <code className="text-salvia">##</code> per i sottotitoli, <code className="text-salvia">**grassetto**</code>, <code className="text-salvia">-</code> per gli elenchi.
                            </p>
                            {v.id && (
                                <button type="button" onClick={() => togliLingua(scheda)} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors">
                                    Togli questa lingua
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Uguali per tutte le lingue */}
                    <div className="border-t border-white/5 pt-4 space-y-4">
                        <p className="font-body text-xs text-nebbia/30">Uguali per tutte le lingue:</p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <label className={ETICHETTA}>Autore</label>
                                <input
                                    className={CAMPO}
                                    value={form.autore}
                                    onChange={e => setForm(f => ({ ...f, autore: e.target.value }))}
                                    placeholder="Lexum"
                                />
                                <p className="font-body text-xs text-nebbia/30 mt-1">Se lo lasci vuoto l'articolo si firma Lexum.</p>
                            </div>
                            <div>
                                <label className={ETICHETTA}>Immagine di copertina (indirizzo)</label>
                                <input
                                    className={CAMPO}
                                    value={form.copertina_url}
                                    onChange={e => setForm(f => ({ ...f, copertina_url: e.target.value }))}
                                    placeholder="https://…"
                                />
                            </div>
                            <div>
                                <label className={ETICHETTA}>Post su Instagram (facoltativo)</label>
                                <input
                                    className={CAMPO}
                                    value={form.instagram_url}
                                    onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                                    placeholder="https://www.instagram.com/p/…"
                                />
                            </div>
                            <div>
                                <label className={ETICHETTA}>Post su TikTok (facoltativo)</label>
                                <input
                                    className={CAMPO}
                                    value={form.tiktok_url}
                                    onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))}
                                    placeholder="https://www.tiktok.com/@…/video/…"
                                />
                            </div>
                        </div>
                    </div>

                    {errore && (
                        <p className="flex items-start gap-2 font-body text-sm text-red-400">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errore}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button type="button" onClick={() => salva('pubblica')} disabled={salvando} className="btn-primary text-sm justify-center">
                            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            {form.stato === 'pubblicato' ? 'Aggiorna e ripubblica' : 'Pubblica'}
                        </button>
                        <button type="button" onClick={() => salva('bozza')} disabled={salvando} className={BOTTONE}>
                            <Save size={15} /> {form.stato === 'programmato' ? 'Salva' : form.stato === 'pubblicato' ? 'Salva senza ripubblicare' : 'Salva bozza'}
                        </button>
                    </div>

                    {/* Pubblicazione programmata: esce da sola nel giorno scelto */}
                    {form.stato !== 'pubblicato' && (
                        <div className="border-t border-white/5 pt-4 space-y-2">
                            <label className={ETICHETTA}>Pubblicazione programmata</label>
                            {form.stato === 'programmato' && form.programmato_il && (
                                <p className="flex items-center gap-2 font-body text-sm text-oro">
                                    <CalendarClock size={14} /> Programmato: esce {fmtProgrammato(form.programmato_il)}
                                </p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="datetime-local"
                                    className={`${CAMPO} sm:max-w-xs [color-scheme:dark]`}
                                    value={form.programmato_il ? aCampoOra(form.programmato_il) : ''}
                                    onChange={e => setForm(f => ({ ...f, programmato_il: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                                />
                                <button type="button" onClick={() => salva('programma')} disabled={salvando} className={`${BOTTONE} !text-oro !border-oro/30`}>
                                    <CalendarClock size={15} /> {form.stato === 'programmato' ? 'Sposta la data' : 'Programma'}
                                </button>
                            </div>
                            <p className="font-body text-xs text-nebbia/30">
                                L'articolo resta invisibile fino al giorno scelto, in tutte le lingue. Il controllo passa 5 volte al giorno
                                (alle 3, 8, 13, 18 e 23): esce al primo passaggio dopo l'orario, e il sito si rigenera da solo.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ─── ELENCO ───
    return (
        <div className="space-y-5 pb-16">
            <PageHeader
                label="Vetrina"
                title="Novità"
                subtitle="Gli articoli pubblicati qui compaiono su lexum.ch/it/novita, /de/novita e /fr/novita."
                action={
                    <button type="button" onClick={() => { setForm(structuredClone(VUOTO)); setScheda('it'); setErrore(''); setMsg('') }} className="btn-primary text-sm">
                        <Plus size={15} /> Nuovo articolo
                    </button>
                }
            />

            {msg && (
                <p className="flex items-center gap-2 font-body text-sm text-salvia">
                    <CheckCircle size={15} /> {msg}
                </p>
            )}
            {errore && (
                <p className="flex items-start gap-2 font-body text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errore}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-oro" />
                </div>
            ) : gruppi.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <Newspaper size={30} className="mx-auto text-nebbia/10 mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Nessun articolo.</p>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 divide-y divide-white/5">
                    {gruppi.map(g => {
                        const p = g.prima
                        return (
                            <div key={g.gruppo} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-body text-sm text-nebbia break-words">{p.titolo}</p>
                                        <span className={`font-body text-xs px-2 py-0.5 border ${g.stato === 'pubblicato'
                                            ? 'border-salvia/30 text-salvia bg-salvia/10'
                                            : g.stato === 'programmato' ? 'border-oro/30 text-oro bg-oro/10'
                                                : 'border-white/10 text-nebbia/40'}`}
                                        >
                                            {g.stato === 'pubblicato' ? 'Pubblicato' : g.stato === 'programmato' ? `Programmato · ${fmtProgrammato(g.programmato_il)}` : 'Bozza'}
                                        </span>
                                    </div>
                                    <p className="font-body text-xs text-nebbia/40 mt-1 flex flex-wrap items-center gap-x-1">
                                        {firmaAutore(p.autore)}
                                        {g.pubblicato_il && ` · ${fmtDataLunga(g.pubblicato_il)}`}
                                        {p.categoria && ` · ${p.categoria}`}
                                        <span className="ml-1 flex gap-1">
                                            {LINGUE.map(l => (
                                                <span key={l} className={`px-1.5 border text-[10px] uppercase ${g.versioni[l] ? 'border-salvia/30 text-salvia' : 'border-white/10 text-nebbia/20 line-through'}`}>{l}</span>
                                            ))}
                                        </span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 lg:flex gap-2">
                                    <button type="button" onClick={() => { setForm(formDaGruppo(g)); setScheda(g.versioni.it ? 'it' : g.versioni.de ? 'de' : 'fr'); setErrore(''); setMsg('') }} className={BOTTONE}>
                                        Modifica
                                    </button>
                                    {g.stato === 'pubblicato' ? (
                                        <>
                                            <a href={`/${p.lingua}/novita/${p.slug}`} target="_blank" rel="noreferrer" className={BOTTONE}>
                                                <Eye size={15} /> Vedi
                                            </a>
                                            <button type="button" onClick={() => cambiaStato(g, 'bozza')} className={BOTTONE}>
                                                Ritira
                                            </button>
                                        </>
                                    ) : g.stato === 'programmato' ? (
                                        <>
                                            <button type="button" onClick={() => cambiaStato(g, 'pubblicato')} className={BOTTONE}>
                                                <Send size={15} /> Pubblica ora
                                            </button>
                                            <button type="button" onClick={() => cambiaStato(g, 'bozza')} className={BOTTONE}>
                                                Annulla
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => cambiaStato(g, 'pubblicato')} className={BOTTONE}>
                                            <Send size={15} /> Pubblica
                                        </button>
                                    )}
                                    <button type="button" onClick={() => elimina(g)} className={`${BOTTONE} hover:!text-red-400 hover:!border-red-500/30`}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Rilascio automatico del sito */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label">Rilascio del sito</p>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    Quando pubblichi, il sito riparte da solo: serve perché l'articolo abbia il suo titolo su Google e
                    nelle anteprime dei link. Incolla qui l'indirizzo del "Deploy Hook" del progetto svizzero su Vercel,
                    in Impostazioni → Git → Deploy Hooks.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        className={CAMPO}
                        value={hook}
                        onChange={e => setHook(e.target.value)}
                        placeholder="https://api.vercel.com/v1/integrations/deploy/…"
                    />
                    <button type="button" onClick={salvaHook} disabled={salvandoHook} className={BOTTONE}>
                        {salvandoHook ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Salva
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            const problema = await rigeneraSito()
                            setErrore(problema ?? '')
                            setMsg(problema ? '' : 'Rilascio avviato.')
                        }}
                        className={BOTTONE}
                    >
                        <RefreshCw size={15} /> Rigenera ora
                    </button>
                </div>
            </div>
        </div>
    )
}
