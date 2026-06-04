import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, FileText, Search } from 'lucide-react'

/**
 * ArchivioAnimatedDemo — versione fluida (~10 sec totali) — i18n ready
 * ─────────────────────────────────────────────────────────────────────
 * Sezione 3.4 della Home — Documentale + Archivio.
 * 
 *  • SINISTRA: 3 file pre-completati statici + 3 con barra di progresso
 *    che si riempiono con easing naturale (easeInOutCubic) in tempi 
 *    sfalsati, ognuna diventa "Completato" a 100% con transizione
 *    morbida.
 *  • DESTRA: input vuoto → typing organico del query → press del bottone
 *    CERCA con conferma visiva → appaiono in sequenza 2 risultati con
 *    fade-in lento dal basso.
 * 
 * IntersectionObserver al 25% di soglia. One-shot.
 * Tutti i testi vengono dal namespace 'archivio_demo'.
 */

const TYPE_SPEED_BASE = 95
const TYPE_SPEED_VAR = 50

const T_BAR_CONTRATTO_START = 800
const T_BAR_CONTRATTO_END = 4200

const T_BAR_CONTRATTO_2_START = 2200
const T_BAR_CONTRATTO_2_END = 4800

const T_BAR_DIFFIDA_START = 3600
const T_BAR_DIFFIDA_END = 8800

const T_TYPING_START = 1000
const T_PAUSA_PRE_PRESS = 800
const T_BUTTON_PRESS_DUR = 280
const T_PAUSA_PRE_RISULTATI = 700
const T_GAP_RISULTATI = 500

const T_END = 9800

const easeInOutCubic = (t) => {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const StaticCompleted = ({ filename, uploadedToText, completedLabel }) => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0">
            <Check size={12} className="text-salvia" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
            <p className="font-body text-[10px] text-nebbia/30">{uploadedToText}</p>
        </div>
        <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">
            {completedLabel}
        </span>
    </div>
)

const AnimatedBar = ({ filename, fromPct, started, completed, currentPct, uploadedToText, completedLabel }) => {
    if (completed) {
        return (
            <div className="flex items-center gap-3 transition-all duration-700 ease-out">
                <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0 transition-colors duration-700">
                    <Check size={12} className="text-salvia" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
                    <p className="font-body text-[10px] text-nebbia/30">{uploadedToText}</p>
                </div>
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">
                    {completedLabel}
                </span>
            </div>
        )
    }

    const pct = started ? currentPct : fromPct

    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                <FileText size={12} className="text-oro" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
                <div className="h-1 bg-petrolio mt-1 overflow-hidden">
                    <div
                        className="h-full bg-oro/60"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <span className="font-body text-[10px] text-nebbia/40 shrink-0 tabular-nums">
                {Math.round(pct)}%
            </span>
        </div>
    )
}

export default function ArchivioAnimatedDemo() {
    const { t } = useTranslation('archivio_demo')

    const SEARCH_QUERY = t('search_query')

    const sectionRef = useRef(null)
    const [started, setStarted] = useState(false)
    const [now, setNow] = useState(0)
    const [typedText, setTypedText] = useState('')
    const [typingDoneTimestamp, setTypingDoneTimestamp] = useState(null)
    const startTimeRef = useRef(null)

    useEffect(() => {
        if (!sectionRef.current || started) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !started) {
                    setStarted(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.25 }
        )

        observer.observe(sectionRef.current)
        return () => observer.disconnect()
    }, [started])

    useEffect(() => {
        if (!started) return

        const startTime = performance.now()
        let raf

        const tick = () => {
            const elapsed = performance.now() - startTime
            setNow(elapsed)

            if (elapsed < T_END) {
                raf = requestAnimationFrame(tick)
            } else {
                setNow(T_END)
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [started])

    useEffect(() => {
        if (!started) return

        let timeoutId
        let cancelled = false

        const startTyping = () => {
            let i = 0
            const typeChar = () => {
                if (cancelled) return
                if (i <= SEARCH_QUERY.length) {
                    setTypedText(SEARCH_QUERY.slice(0, i))
                    i++
                    if (i <= SEARCH_QUERY.length) {
                        const speed = TYPE_SPEED_BASE + (Math.random() - 0.5) * TYPE_SPEED_VAR * 2
                        const isSpace = SEARCH_QUERY[i - 1] === ' '
                        const delay = isSpace ? speed * 1.8 : speed
                        timeoutId = setTimeout(typeChar, delay)
                    } else {
                        const elapsed = performance.now() - startTimeRef.current
                        setTypingDoneTimestamp(elapsed)
                    }
                }
            }
            typeChar()
        }

        timeoutId = setTimeout(startTyping, T_TYPING_START)
        return () => {
            cancelled = true
            clearTimeout(timeoutId)
        }
    }, [started, SEARCH_QUERY])

    useEffect(() => {
        if (started && !startTimeRef.current) {
            startTimeRef.current = performance.now()
        }
    }, [started])

    const computeBarPct = (fromPct, tStart, tEnd) => {
        if (now < tStart) return fromPct
        if (now >= tEnd) return 100
        const progress = (now - tStart) / (tEnd - tStart)
        const eased = easeInOutCubic(progress)
        return fromPct + (100 - fromPct) * eased
    }

    const contrattoLocPct = computeBarPct(64, T_BAR_CONTRATTO_START, T_BAR_CONTRATTO_END)
    const contrattoPct = computeBarPct(90, T_BAR_CONTRATTO_2_START, T_BAR_CONTRATTO_2_END)
    const diffidaPct = computeBarPct(28, T_BAR_DIFFIDA_START, T_BAR_DIFFIDA_END)

    const contrattoLocCompleted = now >= T_BAR_CONTRATTO_END
    const contrattoCompleted = now >= T_BAR_CONTRATTO_2_END
    const diffidaCompleted = now >= T_BAR_DIFFIDA_END

    const sinceTypingDone = typingDoneTimestamp !== null ? now - typingDoneTimestamp : 0
    const typingDone = typingDoneTimestamp !== null

    const buttonPressed = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS &&
        sinceTypingDone < T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR

    const result1Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI

    const result2Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI + T_GAP_RISULTATI

    const isTyping = started && now >= T_TYPING_START && !typingDone
    const showCursor = isTyping || (started && now >= T_TYPING_START - 200 && now < T_TYPING_START + 200)

    const uploadedToText = t('uploaded_to_prefix')
    const completedLabel = t('status_completed')

    return (
        <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">

            {/* SINISTRA — Caricamento file */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">
                    {t('loading_label')}
                </p>
                <div className="space-y-2.5">
                    <StaticCompleted
                        filename={t('files.curriculum')}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />

                    <AnimatedBar
                        filename={t('files.contratto_locazione')}
                        fromPct={64}
                        started={started && now >= T_BAR_CONTRATTO_START}
                        completed={contrattoLocCompleted}
                        currentPct={contrattoLocPct}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />

                    <AnimatedBar
                        filename={t('files.contratto')}
                        fromPct={90}
                        started={started && now >= T_BAR_CONTRATTO_2_START}
                        completed={contrattoCompleted}
                        currentPct={contrattoPct}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />

                    <StaticCompleted
                        filename={t('files.perizia')}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />

                    <AnimatedBar
                        filename={t('files.diffida')}
                        fromPct={28}
                        started={started && now >= T_BAR_DIFFIDA_START}
                        completed={diffidaCompleted}
                        currentPct={diffidaPct}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />

                    <StaticCompleted
                        filename={t('files.statuto')}
                        uploadedToText={uploadedToText}
                        completedLabel={completedLabel}
                    />
                </div>
            </div>

            {/* DESTRA — Ricerca nell'archivio */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">
                    {t('search_label')}
                </p>

                <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15 mb-3">
                    <Search size={11} className="text-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/70 flex-1 min-h-[16px]">
                        {typedText}
                        {showCursor && (
                            <span className="inline-block w-[1px] h-3 bg-nebbia/70 ml-[1px] animate-pulse align-middle" />
                        )}
                    </span>
                    <button
                        className={`font-body text-[10px] px-2 py-1 border uppercase tracking-widest shrink-0 transition-all duration-300 ease-out ${buttonPressed
                            ? 'bg-oro/30 border-oro text-oro scale-95'
                            : 'bg-oro/10 border-oro/30 text-oro scale-100'
                            }`}
                    >
                        {t('search_button')}
                    </button>
                </div>

                <div className="space-y-2 min-h-[160px]">
                    <div
                        className={`bg-petrolio border border-salvia/15 p-3 transition-all duration-700 ease-out ${result1Visible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-3 pointer-events-none'
                            }`}
                    >
                        <div className="flex items-start gap-2.5">
                            <FileText size={12} className="text-salvia mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">
                                    {t('result1.filename')}
                                </p>
                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                    {t('result1.snippet')}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('result1.tag1')}
                                    </span>
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('result1.tag2')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-petrolio border border-white/8 p-3 transition-all duration-700 ease-out ${result2Visible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-3 pointer-events-none'
                            }`}
                    >
                        <div className="flex items-start gap-2.5">
                            <FileText size={12} className="text-nebbia/40 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">
                                    {t('result2.filename')}
                                </p>
                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                    {t('result2.snippet')}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('result2.tag1')}
                                    </span>
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('result2.tag2')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}