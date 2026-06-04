// src/components/sicurezza/ModalBackupCodes.jsx
//
// Mostra i 10 backup codes UNA SOLA VOLTA dopo enrollment o rigenerazione.
// L'utente DEVE confermare di averli salvati per chiudere.

import { useState } from 'react'
import { X, AlertTriangle, Copy, Check, Download, Printer } from 'lucide-react'

export default function ModalBackupCodes({ codici, onClose }) {
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
            'LEXUM — Codici di recupero 2FA',
            `Generati il: ${new Date().toLocaleString('it-CH')}`,
            '',
            'IMPORTANTE: ogni codice puo essere usato una sola volta.',
            'Conservali in un luogo sicuro. Servono se perdi accesso all\'app autenticatore.',
            'Usando un codice di recupero il 2FA verra disattivato — dovrai riconfigurarlo.',
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
                    <title>Lexum - Codici di recupero 2FA</title>
                    <style>
                        body { font-family: monospace; padding: 40px; line-height: 1.8; }
                        h1 { font-family: Georgia, serif; }
                        .codice { font-size: 16px; letter-spacing: 2px; }
                        .nota { color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <h1>Lexum - Codici di recupero 2FA</h1>
                    <p>Generati il: ${new Date().toLocaleString('it-CH')}</p>
                    <pre class="codice">${testoCompleto}</pre>
                    <p class="nota">
                        IMPORTANTE: ogni codice puo essere usato una sola volta.<br>
                        Conservali in un luogo sicuro. Servono se perdi accesso all'app autenticatore.<br>
                        Usando un codice di recupero il 2FA verra disattivato — dovrai riconfigurarlo.
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
                        <h2 className="font-display text-lg text-nebbia">Codici di recupero</h2>
                    </div>
                    {confermato && (
                        <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-amber-900/10 border border-amber-500/30 p-4">
                        <p className="font-body text-sm text-amber-400 font-medium mb-2">
                            Salva subito questi codici
                        </p>
                        <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                            Verranno mostrati una sola volta. Servono se perdi il telefono per riprendere accesso al tuo account.
                            Ogni codice puo essere usato una sola volta e disattivera il 2FA: dovrai riconfigurarlo.
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
                            {copiato ? 'Copiati' : 'Copia'}
                        </button>
                        <button onClick={handleScarica} className="flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5">
                            <Download size={13} /> Scarica
                        </button>
                        <button onClick={handleStampa} className="flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5">
                            <Printer size={13} /> Stampa
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
                            Confermo di aver salvato i codici di recupero in un luogo sicuro.
                            Capisco che non potranno essere recuperati se li perdo.
                        </span>
                    </label>

                    <button
                        onClick={onClose}
                        disabled={!confermato}
                        className="btn-primary text-sm w-full justify-center disabled:opacity-40"
                    >
                        Ho salvato i codici, chiudi
                    </button>
                </div>
            </div>
        </div>
    )
}