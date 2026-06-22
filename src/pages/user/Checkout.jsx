// src/pages/user/Checkout.jsx

import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, Lock } from 'lucide-react'
import { supabaseUrl, getAccessToken } from '@/lib/supabase'

export default function UserCheckout() {
    const { t } = useTranslation('user_checkout')
    const { profile } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const prodotto = location.state?.prodotto

    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')

    if (!prodotto) {
        return (
            <div className="text-center py-12 space-y-4">
                <p className="font-body text-sm text-nebbia/50">{t('vuoto.nessun_prodotto')}</p>
                <Link to="/abbonamenti" className="btn-secondary text-sm inline-flex">
                    {t('vuoto.torna_ai_piani')}
                </Link>
            </div>
        )
    }

    async function handlePagamento() {
        setErrore('')
        setLoading(true)

        try {
            const accessToken = await getAccessToken()

            const res = await fetch(
                `${supabaseUrl}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        prodotto_id: prodotto.id,
                        success_url: `${window.location.origin}/abbonamenti?success=1`,
                        cancel_url: `${window.location.origin}/abbonamenti/checkout`,
                    }),
                }
            )

            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.ok) throw new Error(json?.error || `Errore checkout (HTTP ${res.status})`)

            // Redirect a Stripe Checkout
            window.location.href = json.url

        } catch (err) {
            setErrore(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5 max-w-lg mx-auto">
            <div>
                <p className="section-label mb-2">{t('header.label')}</p>
                <h1 className="font-display text-4xl font-light text-nebbia">{t('header.titolo')}</h1>
            </div>

            {/* Intestatario */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label">{t('intestatario.titolo')}</p>
                <p className="font-body text-xs text-nebbia/30 leading-relaxed">
                    {t('intestatario.nota')}
                </p>
                {[
                    [t('intestatario.nome'), `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim() || '—'],
                    [t('intestatario.email'), profile?.email ?? '—'],
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
                <p className="font-body text-xs text-nebbia/25 pt-1">
                    {t('intestatario.dati_errati')}{' '}
                    <Link to="/user/profilo" className="text-oro hover:text-oro/70 transition-colors">
                        {t('intestatario.aggiorna_profilo')}
                    </Link>
                </p>
            </div>

            {/* Prodotto */}
            <div className="bg-slate border border-oro/20 p-5 space-y-2">
                <p className="section-label">{t('prodotto.piano_selezionato')}</p>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-display text-xl font-semibold text-nebbia">{prodotto.nome}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {prodotto.durata_mesi ? t('prodotto.durata', { count: prodotto.durata_mesi }) : '—'}
                        </p>
                        <div className="flex gap-2 mt-2">
                            <span className={`font-body text-[10px] px-2 py-0.5 border ${prodotto.include_banca_dati ? 'border-oro/30 text-oro' : 'border-white/10 text-nebbia/30'}`}>
                                {prodotto.include_banca_dati ? t('prodotto.badge_pro') : t('prodotto.badge_base')}
                            </span>
                            {prodotto.include_monetizzazione && (
                                <span className="font-body text-[10px] px-2 py-0.5 border border-salvia/30 text-salvia">
                                    {t('prodotto.badge_monetizzazione')}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="font-display text-4xl font-light text-oro shrink-0">CHF {prodotto.prezzo}</p>
                </div>
                <button
                    onClick={() => navigate('/abbonamenti')}
                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors pt-1"
                >
                    {t('prodotto.cambia_piano')}
                </button>
            </div>

            {/* Totale */}
            <div className="flex justify-between items-center px-1 py-2 border-t border-white/5">
                <span className="font-body text-sm text-nebbia/50">{t('totale.label')}</span>
                <span className="font-display text-3xl font-semibold text-oro">CHF {prodotto.prezzo}</span>
            </div>

            {/* Info */}
            <div className="bg-petrolio/50 border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/30 leading-relaxed">
                    {t('info.testo')}
                </p>
            </div>

            {/* Errore */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handlePagamento}
                disabled={loading}
                className="btn-primary w-full justify-center text-sm disabled:opacity-60"
            >
                {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                ) : (
                    <>
                        <Lock size={14} />
                        {t('cta.procedi')}
                    </>
                )}
            </button>

            <p className="font-body text-xs text-nebbia/20 text-center flex items-center justify-center gap-1">
                <Lock size={10} /> {t('cta.ssl')}
            </p>
        </div>
    )
}