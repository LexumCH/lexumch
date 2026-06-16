// src/components/sicurezza/ModalBackupCodes.jsx
//
// Mostra i 10 backup codes UNA SOLA VOLTA dopo enrollment o rigenerazione.
// L'utente DEVE confermare di averli salvati per chiudere.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle, Copy, Check, Download, Printer } from 'lucide-react'

const DATE_LOCALES = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH' }

export default function ModalBackupCodes({ codici, onClose }) {
    const { t, i18n } = useTranslation('comp_modal_backup_codes')
    const dateLocale = DATE_LOCALES[i18n.language] || 'it-CH'

    const [confermato, setConfermato] = useState(false)
    const [copiato, setCopiato] = useState(false)

    const testoCompleto = codici
        .map((c, i) => `${(i + 1).toString().padStart(2, '0')}.  ${c}`)
        .join('\n')

    function handleCopia() {
        navigator.clipboard.writeText(testoCompleto)
        setCopiato(true)
        setTimeout(() => setCopiato(false), 2000)
    }

    function handleScarica() {
        const intestazione = [
            t('file.titolo'),
            t('file.generatiIl', { data: new Date().toLocaleString(dateLocale) }),
            '',
            t('file.importante'),
            t('file.conserva'),
            t('file.disattiva'),
            '',
            '----------------------------------------',
            '',
        ].join('\n')
        const blob = new Blob([intestazione + testoCompleto], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lexum-backup-codes-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    function handleStampa() {
        const w = window.open('', '_blank')
        if (!w) return
        w.document.write(`
            <html>
                <head>
                    <title>${t('stampa.titoloPagina')}</title>
                    <style>
                        body { font-family: monospace; padding: 40px; line-height: 1.8; }
                        h1 { font-family: Georgia, serif; }
                        .codice { font-size: 16px; letter-spacing: 2px; }
                        .nota { color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <h1>${t('stampa.titoloPagina')}</h1>
                    <p>${t('file.generatiIl', { data: new Date().toLocaleString(dateLocale) })}</p>
                    <pre class="codice">${testoCompleto}</pre>
                    <p class="nota">
                        ${t('file.importante')}<br>
                        ${t('file.conserva')}<br>
                        ${t('file.disattiva')}
                    </p>
                </body>
            </html>
        `)
        w.document.close()
        w.print()
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-oro/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">{t('header.titolo')}</h2>
                    </div>
                    {confermato && (
                        <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia" title={t('azioni.chiudi')} aria-label={t('azioni.chiudi')}>
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-amber-900/10 border border-amber-500/30 p-4">
                        <p className="font-body text-sm text-amber-400 font-medium mb-2">
                            {t('avviso.titolo')}
                        </p>
                        <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                            {t('avviso.descrizione')}
                        </p>
                    </div>

                    <div className="bg-petrolio border border-white/10 p-5 grid grid-cols-2 gap-x-6 gap-y-2">
                        {codici.map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="font-mono text-xs text-nebbia/30 w-6">{(i + 1).toString().padStart(2, '0')}.</span>
                                <code className="font-mono text-sm text-nebbia tracking-wider">{c}</code>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleCopia} className="flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5">
                            {copiato ? <Check size={13} /> : <Copy size={13} />}
                            {copiato ? t('azioni.copiati') : t('azioni.copia')}
                        </button>
                        <button onClick={handleScarica} className="flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5">
                            <Download size={13} /> {t('azioni.scarica')}
                        </button>
                        <button onClick={handleStampa} className="flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5">
                            <Printer size={13} /> {t('azioni.stampa')}
                        </button>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-petrolio border border-white/10 hover:border-oro/30 transition-colors">
                        <input
                            type="checkbox"
                            checked={confermato}
                            onChange={e => setConfermato(e.target.checked)}
                            className="mt-0.5 accent-oro"
                        />
                        <span className="font-body text-xs text-nebbia/70 leading-relaxed">
                            {t('conferma.label')}
                        </span>
                    </label>

                    <button
                        onClick={onClose}
                        disabled={!confermato}
                        className="btn-primary text-sm w-full justify-center disabled:opacity-40"
                    >
                        {t('azioni.chiudiSalvato')}
                    </button>
                </div>
            </div>
        </div>
    )
}
