// LexAnimatedDemo.jsx
// Animazione one-shot (no loop): scrittura domanda -> risposta che si scrive -> azioni
// Transizioni morbide via CSS transition + fade incrociato
// Contenuti testuali via i18n (namespace 'lex_ai', chiave 'anim')

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, FolderOpen, Tag, ArrowUp } from 'lucide-react'

const toArray = (val) => Array.isArray(val) ? val : []

const CHAR_SPEED_DOMANDA = 50
const CHAR_SPEED_RISPOSTA = 8
const PAUSE_BETWEEN_BLOCKS = 200

const FADE_DURATION = 400  // durata delle transizioni di stato (ms)

// ─── Stati ───
const PHASE = {
    IDLE: 'idle',
    TYPING_DOMANDA: 'typing_domanda',
    PRESS_SEND: 'press_send',
    TRANSITION_TO_SEARCH: 'transition_to_search',
    TYPING_RISPOSTA: 'typing_risposta',
    ACTIONS: 'actions',
    DONE: 'done',
}

const DUR = {
    IDLE: 1500,
    PRESS_SEND: 800,
    TRANSITION: FADE_DURATION,
    ACTIONS_APPEAR: 600,
}

// ─── Componente principale ───
export default function LexAnimatedDemo({ variant = 'avvocato', startDelay = 0, aspetto = 'classico' }) {
    const { t, ready } = useTranslation('lex_ai')
    // Ogni professione ha il suo set domanda/risposta/azione (anim, anim_fiduciario, anim_progettista)
    const prefix = variant === 'avvocato' ? 'anim' : `anim_${variant}`
    const DOMANDA = t(`${prefix}.domanda`)
    const RISPOSTA = toArray(t(`${prefix}.risposta`, { returnObjects: true }))
    const ACTION = t(`${prefix}.action`)

    const [phase, setPhase] = useState(PHASE.IDLE)
    const [domandaText, setDomandaText] = useState('')
    const [rispostaBlocks, setRispostaBlocks] = useState([])
    const timeoutsRef = useRef([])

    // Scrive solo quando si vede: se la sezione esce dallo schermo l'animazione si ferma
    // e riprende quando torna visibile. Così, se stai leggendo più in basso, la risposta
    // che si allunga non fa scorrere la pagina sotto i tuoi occhi.
    const rootRef = useRef(null)
    const conversazioneRef = useRef(null)
    useEffect(() => {
        const el = conversazioneRef.current
        if (!el) return
        const segui = () => { el.scrollTop = el.scrollHeight }
        const mo = new MutationObserver(segui)
        mo.observe(el, { childList: true, subtree: true, characterData: true })
        return () => mo.disconnect()
    }, [])
    const visibileRef = useRef(false)
    const inAttesaRef = useRef([])
    useEffect(() => {
        const el = rootRef.current
        if (!el || typeof IntersectionObserver === 'undefined') { visibileRef.current = true; return }
        const obs = new IntersectionObserver(([e]) => {
            visibileRef.current = e.isIntersecting
            if (e.isIntersecting) {
                inAttesaRef.current.forEach(riprendi => riprendi())
                inAttesaRef.current = []
            }
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    const quandoVisibile = () => visibileRef.current
        ? Promise.resolve()
        : new Promise(riprendi => inAttesaRef.current.push(riprendi))

    const addTimeout = (fn, delay) => {
        const id = setTimeout(fn, delay)
        timeoutsRef.current.push(id)
        return id
    }

    // Ogni passo dell'animazione aspetta il suo tempo E che la sezione sia visibile
    const wait = async (ms) => {
        await new Promise(resolve => addTimeout(resolve, ms))
        await quandoVisibile()
    }

    useEffect(() => {
        // Avvia l'animazione solo quando le traduzioni sono pronte
        if (!ready || !DOMANDA || RISPOSTA.length === 0) return

        let isMounted = true

        const run = async () => {
            // IDLE (+ scaglionamento del trio)
            await wait(DUR.IDLE + startDelay)
            if (!isMounted) return

            // TYPING DOMANDA
            setPhase(PHASE.TYPING_DOMANDA)
            for (let i = 0; i <= DOMANDA.length; i++) {
                if (!isMounted) return
                setDomandaText(DOMANDA.slice(0, i))
                await wait(CHAR_SPEED_DOMANDA)
            }

            // PRESS SEND
            setPhase(PHASE.PRESS_SEND)
            await wait(DUR.PRESS_SEND)
            if (!isMounted) return

            // TRANSITION (fade out input, fade in conversazione) → subito la risposta
            setPhase(PHASE.TRANSITION_TO_SEARCH)
            await wait(DUR.TRANSITION)
            if (!isMounted) return

            // TYPING RISPOSTA
            setPhase(PHASE.TYPING_RISPOSTA)
            for (let blockIdx = 0; blockIdx < RISPOSTA.length; blockIdx++) {
                if (!isMounted) return
                const block = RISPOSTA[blockIdx]

                if (block.type === 'h2' || block.type === 'p') {
                    for (let c = 0; c <= block.text.length; c++) {
                        if (!isMounted) return
                        const partial = block.text.slice(0, c)
                        setRispostaBlocks(prev => {
                            const next = [...prev]
                            next[blockIdx] = { ...block, partialText: partial }
                            return next
                        })
                        await wait(CHAR_SPEED_RISPOSTA)
                    }
                } else {
                    setRispostaBlocks(prev => {
                        const next = [...prev]
                        next[blockIdx] = block
                        return next
                    })
                    await wait(PAUSE_BETWEEN_BLOCKS * 2)
                }
                await wait(PAUSE_BETWEEN_BLOCKS)
            }

            // ACTIONS
            setPhase(PHASE.ACTIONS)
            await wait(DUR.ACTIONS_APPEAR)
            if (!isMounted) return

            // DONE — l'animazione si ferma qui
            setPhase(PHASE.DONE)
        }

        run()

        return () => {
            isMounted = false
            timeoutsRef.current.forEach(clearTimeout)
            timeoutsRef.current = []
        }
    }, [ready, variant])

    const isInputPhase = phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND || phase === PHASE.TRANSITION_TO_SEARCH
    const isPressing = phase === PHASE.PRESS_SEND
    const showCursor = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA) && (Math.floor(Date.now() / 500) % 2 === 0)

    // Visibilità con fade incrociato
    const inputOpacity = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND) ? 1 : 0
    const conversationOpacity = (phase === PHASE.TYPING_RISPOSTA || phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0
    const responseOpacity = (phase === PHASE.TYPING_RISPOSTA || phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0
    const actionsOpacity = (phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0

    // ── Aspetto «chat»: il campo per scrivere sta in basso col pulsante d'invio,
    //    la domanda sale come nuvoletta, la risposta di Lex arriva senza riquadro.
    //    Stessi testi e stessi tempi dell'aspetto classico.
    if (aspetto === 'chat') {
        const inviata = !(phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND)
        const pronto = !!domandaText && !inviata
        return (
            <div ref={rootRef} className="flex flex-col h-full">
                {/* Conversazione */}
                <div ref={conversazioneRef}
                    className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ maskImage: 'linear-gradient(to bottom, transparent 0, #000 24px, #000 calc(100% - 12px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 24px, #000 calc(100% - 12px), transparent 100%)' }}>
                    {!inviata ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <div className="w-12 h-12 rounded-full border border-oro/25 bg-oro/[0.06] flex items-center justify-center mb-5">
                                <Sparkles size={18} className="text-oro" />
                            </div>
                            <p className="font-display text-3xl font-light text-nebbia/85 mb-2">{t('anim.vuoto_titolo')}</p>
                            <p className="font-body text-xs text-nebbia/35 max-w-xs leading-relaxed">{t('anim.input_hint')}</p>
                        </div>
                    ) : (
                        <div className="space-y-7">
                            {/* La domanda */}
                            <div className="flex justify-end" style={{ animation: 'fadeInUp 0.45s ease-out both' }}>
                                <div className="max-w-[85%]">
                                    <p className="font-body text-[10px] uppercase tracking-[0.22em] text-nebbia/30 mb-2 text-right">{t('anim.user_label')}</p>
                                    <div className="bg-oro/[0.07] border border-oro/20 px-4 py-3">
                                        <p className="font-body text-sm text-nebbia/85 leading-relaxed">{DOMANDA}</p>
                                    </div>
                                </div>
                            </div>

                            {/* La risposta */}
                            {responseOpacity > 0 && (
                                <div className="flex gap-3.5" style={{ animation: 'fadeInUp 0.45s ease-out both' }}>
                                    <div className="w-7 h-7 shrink-0 rounded-full border border-salvia/30 bg-salvia/10 flex items-center justify-center mt-0.5">
                                        <Sparkles size={12} className="text-salvia" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-3">
                                        <p className="font-body text-[10px] uppercase tracking-[0.22em] text-salvia/60">{t('anim.lex_label')}</p>
                                        {rispostaBlocks.map((block, i) => {
                                            if (!block) return null
                                            if (block.type === 'h2') return (
                                                <div key={i} className="flex items-center gap-3 pt-3">
                                                    <p className="font-body text-[10.5px] uppercase tracking-[0.2em] text-oro/80 shrink-0">{block.partialText ?? block.text}</p>
                                                    <span className="flex-1 h-px bg-gradient-to-r from-oro/25 to-transparent" />
                                                </div>
                                            )
                                            if (block.type === 'p') return (
                                                <p key={i} className="font-body text-xs text-nebbia/65 leading-[1.75]">{block.partialText ?? block.text}</p>
                                            )
                                            if (block.type === 'list') return (
                                                <ul key={i} className="space-y-2 animate-[fadeInUp_0.4s_ease-out]">
                                                    {block.items.map((it, j) => (
                                                        <li key={j} className="flex items-start gap-2.5 font-body text-xs text-nebbia/60 leading-[1.7]">
                                                            <span className="w-1.5 h-1.5 rotate-45 bg-oro/60 shrink-0 mt-[7px]" />
                                                            <span>{it}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )
                                            if (block.type === 'chips') return (
                                                <div key={i} className="flex gap-1.5 flex-wrap pt-3 animate-[fadeInUp_0.4s_ease-out]">
                                                    {block.items.map(c => (
                                                        <span key={c} className="font-body text-[10px] px-2 py-1 border border-oro/20 text-oro/70 bg-oro/[0.04]">{c}</span>
                                                    ))}
                                                </div>
                                            )
                                            return null
                                        })}
                                        {actionsOpacity > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-3 animate-[fadeInUp_0.4s_ease-out]">
                                                <span className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 text-nebbia/50 font-body text-[11px]">
                                                    <FolderOpen size={12} className="text-oro/70" /> {ACTION}
                                                </span>
                                                <span className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 text-nebbia/50 font-body text-[11px]">
                                                    <Tag size={12} className="text-salvia/70" /> {t('anim.action_etichetta')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Il campo per scrivere, in basso, col pulsante d'invio */}
                <div className="shrink-0 px-4 sm:px-5 pb-4 pt-2">
                    <div className={`flex items-center gap-3 bg-petrolio/80 border pl-4 pr-1.5 py-1.5 transition-colors duration-300 ${isPressing ? 'border-oro/60' : pronto ? 'border-oro/30' : 'border-white/10'}`}>
                        <p className="flex-1 min-w-0 font-body text-sm py-2 leading-relaxed">
                            {!inviata && domandaText
                                ? <span className="text-nebbia/85">{domandaText}</span>
                                : <span className="text-nebbia/25">{t('anim.input_placeholder')}</span>}
                            {showCursor && <span className="inline-block w-[2px] h-4 bg-oro/80 align-middle ml-0.5" />}
                        </p>
                        <span className={`w-9 h-9 shrink-0 flex items-center justify-center transition-all duration-300 ${pronto ? 'bg-oro text-petrolio' : 'bg-white/[0.04] text-nebbia/25'} ${isPressing ? 'scale-90' : ''}`}>
                            <ArrowUp size={16} />
                        </span>
                    </div>
                </div>

                <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
            </div>
        )
    }

    return (
        <div ref={rootRef} className="relative">

            {/* INPUT — fade out quando si passa alla conversazione */}
            <div
                className="space-y-3 transition-opacity"
                style={{
                    opacity: inputOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: inputOpacity === 0 ? 'none' : 'auto',
                    position: !isInputPhase ? 'absolute' : 'relative',
                    width: '100%',
                    top: 0,
                    left: 0,
                }}
            >
                <p className="font-body text-xs text-nebbia/25">
                    {t('anim.input_hint')}
                </p>
                <div className={`bg-petrolio border ${isPressing ? 'border-salvia/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3.5 transition-colors min-h-[78px]`}>
                    <span className="text-nebbia/85">{domandaText}</span>
                    {showCursor && <span className="inline-block w-[2px] h-4 bg-salvia/80 align-middle ml-0.5" />}
                    {!domandaText && !showCursor && <span className="text-nebbia/20">{t('anim.input_placeholder')}</span>}
                </div>
                <button
                    className={`flex items-center justify-center gap-2 w-full py-3 border font-body text-sm transition-all ${isPressing
                        ? 'bg-salvia/30 border-salvia/60 text-salvia scale-[0.98]'
                        : 'bg-salvia/10 border-salvia/30 text-salvia'
                        }`}
                >
                    <Sparkles size={13} /> {t('anim.cta')}
                </button>
            </div>

            {/* CONVERSAZIONE — fade in quando l'input si nasconde */}
            <div
                className="space-y-4 transition-opacity"
                style={{
                    opacity: conversationOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: conversationOpacity === 0 ? 'none' : 'auto',
                    position: conversationOpacity === 0 ? 'absolute' : 'relative',
                    width: '100%',
                    top: 0,
                    left: 0,
                }}
            >
                {/* Bubble utente */}
                <div>
                    <p className="font-body text-xs text-nebbia/30 mb-1.5">{t('anim.user_label')}</p>
                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                        <p className="font-body text-sm text-nebbia/65">{DOMANDA}</p>
                    </div>
                </div>

                {/* Risposta — si scrive subito dopo l'invio */}
                    <div
                        className="transition-opacity"
                        style={{
                            opacity: responseOpacity,
                            transitionDuration: `${FADE_DURATION}ms`,
                            pointerEvents: responseOpacity === 0 ? 'none' : 'auto',
                        }}
                    >
                        {responseOpacity > 0 && (
                            <>
                                <p className="font-body text-xs text-salvia/50 mb-1.5">{t('anim.lex_label')}</p>
                                <div className="bg-salvia/5 border border-salvia/15 p-5 space-y-3">
                                    {rispostaBlocks.map((block, i) => {
                                        if (!block) return null
                                        if (block.type === 'h2') {
                                            return (
                                                <p key={i} className="font-body text-[11px] uppercase tracking-widest text-salvia/70 font-medium pt-1">
                                                    {block.partialText ?? block.text}
                                                </p>
                                            )
                                        }
                                        if (block.type === 'p') {
                                            return (
                                                <p key={i} className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    {block.partialText ?? block.text}
                                                </p>
                                            )
                                        }
                                        if (block.type === 'list') {
                                            return (
                                                <ul key={i} className="space-y-1.5 pl-1 animate-[fadeInUp_0.4s_ease-out]">
                                                    {block.items.map((it, j) => (
                                                        <li key={j} className="flex items-start gap-2 font-body text-xs text-nebbia/55 leading-relaxed">
                                                            <div className="w-1 h-1 rounded-full bg-salvia/60 shrink-0 mt-1.5" />
                                                            <span>{it}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )
                                        }
                                        if (block.type === 'chips') {
                                            return (
                                                <div key={i} className="flex gap-1 flex-wrap pt-2 animate-[fadeInUp_0.4s_ease-out]">
                                                    {block.items.map(c => (
                                                        <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/40">{c}</span>
                                                    ))}
                                                </div>
                                            )
                                        }
                                        return null
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                {/* Azioni — fade in alla fine */}
                <div
                    className="flex flex-col sm:flex-row gap-2 transition-opacity"
                    style={{
                        opacity: actionsOpacity,
                        transitionDuration: `${FADE_DURATION}ms`,
                        pointerEvents: actionsOpacity === 0 ? 'none' : 'auto',
                    }}
                >
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-oro/25 text-oro/80 font-body text-xs hover:bg-oro/5 transition-colors">
                        <FolderOpen size={12} /> {ACTION}
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-salvia/25 text-salvia/80 font-body text-xs hover:bg-salvia/5 transition-colors">
                        <Tag size={12} /> {t('anim.action_etichetta')}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    )
}
