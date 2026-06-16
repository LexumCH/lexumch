// src/pages/avvocato/Pratiche.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader, BackButton, Badge, InputField, TextareaField } from '@/components/shared'
import { Plus, Search, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

// Variant per stato (le label arrivano da t())
const STATI_VARIANT = {
  aperta: 'salvia',
  chiusa: 'gray',
}

// Chiavi tecniche tipo causa (i valori salvati su DB restano le chiavi)
const TIPI_KEYS = ['Civile', 'Penale', 'Commerciale', 'Amministrativo', 'Lavoro', 'Famiglia']

async function caricaContesto(userId) {
  const { data: profilo } = await supabase
    .from('profiles').select('posti_acquistati').eq('id', userId).single()
  const haStudio = (profilo?.posti_acquistati ?? 1) > 1
  let collaboratori = []
  if (haStudio) {
    const { data: c } = await supabase
      .from('profiles').select('id, nome, cognome').eq('titolare_id', userId)
    collaboratori = c ?? []
  }
  return { haStudio, collaboratori, ids: [userId, ...collaboratori.map(c => c.id)] }
}

export function AvvocatoPratiche() {
  const { t, i18n } = useTranslation('avv_pratiche')
  const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [avvF, setAvvF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pratiche, setPratiche] = useState([])
  const [collabs, setCollabs] = useState([])
  const [isStudio, setIsStudio] = useState(false)
  const [meId, setMeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)
      const ctx = await caricaContesto(user.id)
      setIsStudio(ctx.haStudio)
      setCollabs(ctx.collaboratori)
      const { data, error } = await supabase
        .from('pratiche')
        .select('id, titolo, tipo, stato, created_at, prossima_udienza, avvocato_id, cliente:cliente_id(id, nome, cognome)')
        .in('avvocato_id', ctx.ids)
        .order('created_at', { ascending: false })
      if (error) setErrore(t('lista.errore_caricamento'))
      else setPratiche(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const rows = pratiche.filter(p => {
    if (statoF && p.stato !== statoF) return false
    if (avvF && p.avvocato_id !== avvF) return false
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(p.created_at) > new Date(dateTo + 'T23:59:59')) return false
    if (search) {
      const q = search.toLowerCase()
      return p.titolo.toLowerCase().includes(q) ||
        `${p.cliente?.nome ?? ''} ${p.cliente?.cognome ?? ''}`.toLowerCase().includes(q)
    }
    return true
  })

  const nomeAvv = id => {
    if (id === meId) return t('lista.tu')
    const c = collabs.find(c => c.id === id)
    return c ? `${c.nome} ${c.cognome}` : '—'
  }

  const hasFilters = search || statoF || avvF || dateFrom || dateTo

  const intestazioni = ['pratica', 'cliente', 'tipo', ...(isStudio ? ['avvocato'] : []), 'stato', 'creata_il', 'pross_udienza', '']

  return (
    <div className="space-y-5">
      <PageHeader label={t('lista.label')} title={t('lista.titolo')}
        action={<Link to="/pratiche/nuova" className="btn-primary text-sm"><Plus size={15} />{t('lista.nuova_pratica')}</Link>} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder={t('lista.cerca_placeholder')} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={statoF} onChange={e => setStatoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">{t('lista.tutti_stati')}</option>
          {Object.keys(STATI_VARIANT).map(k => <option key={k} value={k}>{t(`stati.${k}`)}</option>)}
        </select>
        {isStudio && collabs.length > 0 && (
          <select value={avvF} onChange={e => setAvvF(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
            <option value="">{t('lista.tutti_avvocati')}</option>
            {collabs.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30">{t('lista.dal')}</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30">{t('lista.al')}</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatoF(''); setAvvF(''); setDateFrom(''); setDateTo('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 px-3 py-2.5 border border-white/5 hover:border-red-500/30 transition-colors">
            {t('lista.reset')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : errore ? (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {intestazioni.map((h, idx) => (
                  <th key={h || `col-${idx}`} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h ? t(`lista.intestazioni.${h}`) : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={isStudio ? 8 : 7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">{t('lista.nessuna_pratica')}</td></tr>
              ) : rows.map(p => {
                const variant = STATI_VARIANT[p.stato] ?? STATI_VARIANT.aperta
                const statoLabel = STATI_VARIANT[p.stato] ? t(`stati.${p.stato}`) : t('stati.aperta')
                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{p.titolo}</td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{p.cliente ? `${p.cliente.nome} ${p.cliente.cognome}` : '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/40">{p.tipo ? t(`tipi.${TIPI_KEYS.indexOf(p.tipo)}`, { defaultValue: p.tipo }) : '—'}</td>
                    {isStudio && <td className="px-4 py-3 font-body text-sm text-nebbia/60">{nomeAvv(p.avvocato_id)}</td>}
                    <td className="px-4 py-3"><Badge label={statoLabel} variant={variant} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString(dateLocale)}</td>
                    <td className="px-4 py-3">
                      {p.prossima_udienza
                        ? <span className="font-body text-xs text-oro">{new Date(p.prossima_udienza).toLocaleDateString(dateLocale)}</span>
                        : <span className="font-body text-xs text-nebbia/25">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/pratiche/${p.id}`} className="font-body text-xs text-oro hover:text-oro/70">{t('lista.dettaglio')}</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AvvocatoPraticheNuova() {
  const { t } = useTranslation('avv_pratiche')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientePre = searchParams.get('cliente_id') ?? ''

  const [form, setForm] = useState({
    titolo: '', cliente_id: clientePre, tipo: '', stato: 'aperta',
    avvocato_id: '', collaboratori: [], note: '', prossima_udienza: ''
  })
  const [clienti, setClienti] = useState([])
  const [collabs, setCollabs] = useState([])
  const [isStudio, setIsStudio] = useState(false)
  const [meId, setMeId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [success, setSuccess] = useState(false)

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)
      setForm(p => ({ ...p, avvocato_id: user.id }))
      const ctx = await caricaContesto(user.id)
      setIsStudio(ctx.haStudio)
      setCollabs(ctx.collaboratori)
      const { data: cl } = await supabase
        .from('profiles').select('id, nome, cognome')
        .eq('role', 'cliente').in('avvocato_id', ctx.ids).order('cognome')
      setClienti(cl ?? [])
    }
    init()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')
    if (!form.titolo.trim()) return setErrore(t('nuova.errori.titolo_obbligatorio'))
    if (!form.cliente_id) return setErrore(t('nuova.errori.seleziona_cliente'))
    if (!form.tipo) return setErrore(t('nuova.errori.seleziona_tipo'))
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: np, error } = await supabase.from('pratiche').insert({
        titolo: form.titolo.trim(), cliente_id: form.cliente_id,
        avvocato_id: form.avvocato_id || user.id, tipo: form.tipo,
        stato: form.stato, note: form.note.trim() || null,
        prossima_udienza: form.prossima_udienza || null,
        creato_da: user.id, aggiornato_da: user.id,
      }).select().single()
      if (error) throw new Error(error.message)
      if (form.collaboratori.length > 0 && np) {
        await supabase.from('pratica_collaboratori').insert(
          form.collaboratori.map(id => ({ pratica_id: np.id, avvocato_id: id }))
        )
      }
      setSuccess(true)
      setTimeout(() => navigate(clientePre ? `/clienti/${form.cliente_id}` : '/pratiche'), 1500)
    } catch (err) { setErrore(err.message) }
    finally { setLoading(false) }
  }

  if (success) return (
    <div className="space-y-5 max-w-2xl">
      <BackButton to="/pratiche" label={t('nuova.torna')} />
      <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
        <CheckCircle size={40} className="text-salvia" />
        <h2 className="font-display text-2xl text-nebbia">{t('nuova.successo_titolo')}</h2>
      </div>
    </div>
  )

  const tuttiMembri = meId ? [{ id: meId, nome: t('nuova.tu'), cognome: '' }, ...collabs] : collabs
  const collabDisp = collabs.filter(c => c.id !== form.avvocato_id)

  return (
    <div className="space-y-5 max-w-2xl">
      <BackButton to="/pratiche" label={t('nuova.torna')} />
      <PageHeader label={t('nuova.label')} title={t('nuova.titolo_pagina')} />
      <form onSubmit={handleSubmit}>
        <div className="bg-slate border border-white/5 p-6 space-y-5">
          <InputField label={t('nuova.titolo_pratica')} placeholder={t('nuova.titolo_placeholder')} {...f('titolo')} />

          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('nuova.cliente')}</label>
            <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
              <option value="">{t('nuova.seleziona_cliente')}</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('nuova.tipo_causa')}</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                <option value="">{t('nuova.seleziona_tipo')}</option>
                {TIPI_KEYS.map((tipoKey, idx) => <option key={tipoKey} value={tipoKey}>{t(`tipi.${idx}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('nuova.stato')}</label>
              <select value={form.stato} onChange={e => setForm(p => ({ ...p, stato: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                {Object.keys(STATI_VARIANT).map(k => <option key={k} value={k}>{t(`stati.${k}`)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              {t('nuova.prossima_udienza')} <span className="text-nebbia/25 normal-case tracking-normal">{t('nuova.opzionale')}</span>
            </label>
            <input type="date" value={form.prossima_udienza}
              onChange={e => setForm(p => ({ ...p, prossima_udienza: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50" />
          </div>

          {isStudio && tuttiMembri.length > 0 && (
            <>
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{t('nuova.avvocato_principale')}</label>
                <select value={form.avvocato_id} onChange={e => setForm(p => ({ ...p, avvocato_id: e.target.value }))}
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                  {tuttiMembri.map(m => (
                    <option key={m.id} value={m.id}>{m.id === meId ? t('nuova.tu') : `${m.nome} ${m.cognome ?? ''}`.trim()}</option>
                  ))}
                </select>
              </div>
              {collabDisp.length > 0 && (
                <div>
                  <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                    {t('nuova.collaboratori')} <span className="text-nebbia/25 normal-case tracking-normal">{t('nuova.opzionale')}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {collabDisp.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm(p => ({
                          ...p, collaboratori: p.collaboratori.includes(c.id)
                            ? p.collaboratori.filter(x => x !== c.id)
                            : [...p.collaboratori, c.id]
                        }))}
                        className={`flex items-center gap-2 font-body text-sm px-3 py-2 border transition-all ${form.collaboratori.includes(c.id)
                          ? 'bg-salvia/10 border-salvia/40 text-salvia'
                          : 'border-white/10 text-nebbia/50 hover:border-white/20'
                          }`}>
                        <span className="w-5 h-5 bg-salvia/20 border border-salvia/30 flex items-center justify-center text-xs font-semibold text-salvia">
                          {c.nome[0]}
                        </span>
                        {c.nome} {c.cognome}
                        {form.collaboratori.includes(c.id) && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <TextareaField label={t('nuova.note_label')} rows={4}
              placeholder={t('nuova.note_placeholder')}
              {...f('note')} />
            <p className="font-body text-xs text-nebbia/30 mt-2">
              {t('nuova.note_help')}
            </p>
          </div>

          {errore && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {errore}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/pratiche')} className="btn-secondary text-sm flex-1">{t('nuova.annulla')}</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm flex-1 justify-center">
              {loading
                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                : t('nuova.crea_pratica')
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}