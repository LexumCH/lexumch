// src/lib/password.js
//
// 13-10-2026: la regola delle password, uguale a quella di Supabase Auth (SPEC-password.md, la stessa
// per il sito IT, il sito CH e l'app): almeno 8 caratteri, con almeno una lettera minuscola, una
// maiuscola, un numero e un simbolo. Le classi sono ASCII come sul server: le lettere accentate non
// contano, e valgono come simboli solo quelli che Supabase riconosce (€ £ § ° e lo spazio no).
// Supabase non accetta più di 72 caratteri: come sul server, si contano i byte (UTF-8).
//
// I testi stanno in common.json (password.*). Le funzioni che li restituiscono ricevono la t della
// pagina; le pagine admin, solo in italiano, passano una t fissata sull'italiano.
// I messaggi inglesi di Supabase («Password should…») non arrivano mai all'utente.

export const PASSWORD_LUNGHEZZA_MINIMA = 8
export const PASSWORD_LUNGHEZZA_MASSIMA = 72

// I simboli di Supabase: !@#$%^&*()_+-=[]{};'\:"|<>?,./ più il backtick e la tilde
export const PASSWORD_SIMBOLI = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~"

const TIPI = [
    ['minuscola', s => /[a-z]/.test(s)],
    ['maiuscola', s => /[A-Z]/.test(s)],
    ['numero', s => /[0-9]/.test(s)],
    ['simbolo', s => Array.from(s).some(c => PASSWORD_SIMBOLI.includes(c))],
]

const tipiMancanti = s => TIPI.filter(([, presente]) => !presente(s)).map(([tipo]) => tipo)

// Cosa non va nella password: 'corta' o 'lunga', poi i tipi di carattere che mancano
// ('minuscola', 'maiuscola', 'numero', 'simbolo'). Vuoto = la password va bene.
export function problemiPassword(p) {
    const s = String(p ?? '')
    const problemi = []
    if (Array.from(s).length < PASSWORD_LUNGHEZZA_MINIMA) problemi.push('corta')
    else if (new TextEncoder().encode(s).length > PASSWORD_LUNGHEZZA_MASSIMA) problemi.push('lunga')
    return [...problemi, ...tipiMancanti(s)]
}

export function passwordValida(p) {
    return problemiPassword(p).length === 0
}

const testo = (t, chiave, valori) => t(`password.${chiave}`, { ns: 'common', ...valori })

// Il testo sotto il campo password: la regola intera
export function suggerimentoPassword(t) {
    return testo(t, 'suggerimento')
}

// «Alla password manca/mancano …»: le voci unite con «, » e con «e / und / et» prima dell'ultima
function testoMancano(tipi, t) {
    const voci = tipi.map(tipo => testo(t, `tipi.${tipo}`))
    const elenco = voci.length < 2
        ? voci.join('')
        : `${voci.slice(0, -1).join(', ')} ${testo(t, 'e')} ${voci[voci.length - 1]}`
    return testo(t, 'manca', { count: voci.length, elenco })
}

// L'errore da mostrare prima dell'invio, oppure null se la password va bene.
// Corta (o lunga) e incompleta insieme: i due testi uno dopo l'altro.
export function messaggioPassword(p, t) {
    const problemi = problemiPassword(p)
    if (!problemi.length) return null
    const parti = []
    if (problemi.includes('corta')) parti.push(testo(t, 'troppo_corta'))
    if (problemi.includes('lunga')) parti.push(testo(t, 'troppo_lunga'))
    const tipi = problemi.filter(x => x !== 'corta' && x !== 'lunga')
    if (tipi.length) parti.push(testoMancano(tipi, t))
    return parti.join(' ')
}

// I motivi dal testo inglese, quando arriva solo quello (es. girato da una funzione del server)
function motiviDalTesto(s) {
    const motivi = []
    if (/should be at least/i.test(s)) motivi.push('length')
    if (/should contain at least one character/i.test(s)) motivi.push('characters')
    if (/known to be weak|pwned/i.test(s)) motivi.push('pwned')
    return motivi
}

// Un errore di Supabase Auth sulla password diventa il testo giusto nella lingua di t:
//   weak_password (i motivi in err.reasons o in err.weak_password.reasons: length, characters, pwned),
//   same_password, e «Password cannot be longer than 72 characters».
// Accetta l'errore di supabase-js, il corpo JSON di una funzione del server ({ error, code?, reasons? })
// o il solo testo. Restituisce null se l'errore è un altro.
// `password` è quella scritta: serve a dire cosa manca; se non c'è, per i caratteri la regola intera.
export function messaggioErroreAuthPassword(err, password, t) {
    if (!err) return null
    const oggetto = typeof err === 'object' ? err : {}
    const messaggio = typeof err === 'string' ? err
        : [oggetto.message, oggetto.error, oggetto.msg, oggetto.error_description].find(x => typeof x === 'string') ?? ''
    const codice = c => oggetto.code === c || oggetto.error_code === c

    // Prima di weak_password: anche questo testo inglese contiene «password should»
    if (codice('same_password') || /should be different from the old/i.test(messaggio)) return testo(t, 'uguale')
    if (/password cannot be longer than/i.test(messaggio)) return testo(t, 'troppo_lunga')
    if (!codice('weak_password') && !/password should|known to be weak/i.test(messaggio)) return null

    let motivi = oggetto.reasons ?? oggetto.weak_password?.reasons
    if (!Array.isArray(motivi) || !motivi.length) motivi = motiviDalTesto(messaggio)

    // Con la password scritta a portata di mano, corta e incompleta insieme danno i due testi
    const locali = password ? problemiPassword(password) : []
    const tipi = locali.filter(x => x !== 'corta' && x !== 'lunga')
    const regola = motivi.includes('length') || motivi.includes('characters')
    const parti = []
    if (motivi.includes('length') || (regola && locali.includes('corta'))) parti.push(testo(t, 'troppo_corta'))
    // Se qui non risulta che manchi niente (il server l'ha rifiutata lo stesso), la regola intera
    if (regola && tipi.length) parti.push(testoMancano(tipi, t))
    else if (motivi.includes('characters')) parti.push(suggerimentoPassword(t))
    if (motivi.includes('pwned')) parti.push(testo(t, 'rubata'))
    return parti.length ? parti.join(' ') : suggerimentoPassword(t)
}

// Gli altri rifiuti di Supabase Auth nella registrazione, nella richiesta del link e nella
// reimpostazione: il caso, che la pagina traduce con i suoi testi ('gia_registrata',
// 'troppi_tentativi', 'email_non_valida', 'link_scaduto'), oppure 'generico' per la rete e per tutto
// il resto. Il messaggio inglese non si mostra mai.
export function casoErroreAuth(err) {
    const codice = String(err?.code ?? err?.error_code ?? '')
    const s = typeof err === 'string' ? err : String(err?.message ?? '')
    if (codice === 'user_already_exists' || codice === 'email_exists' || /already (been )?registered|already exists/i.test(s)) return 'gia_registrata'
    if (err?.status === 429 || codice.includes('rate_limit') || /rate limit|too many|for security purposes/i.test(s)) return 'troppi_tentativi'
    if (codice === 'email_address_invalid' || /email address.*invalid|unable to validate email|invalid format/i.test(s)) return 'email_non_valida'
    if (err?.name === 'AuthSessionMissingError' || ['session_not_found', 'session_expired', 'otp_expired', 'bad_jwt'].includes(codice)
        || /session missing|session.*(does not exist|expired)|jwt expired|invalid or has expired/i.test(s)) return 'link_scaduto'
    return 'generico'
}

// Un testo del server si mostra così com'è solo se è un messaggio leggibile: in italiano, senza
// dettagli tecnici. Le funzioni del server rispondono in italiano; l'inglese arriva quando girano
// l'errore di Supabase o della piattaforma.
const INGLESE = /\b(the|is|are|was|be|been|has|have|not|should|cannot|can't|must|with|this|that|for|from|only|after|already|invalid|error|failed|unable|unexpected|denied|exceeded|expired|found|exists?|violates|duplicate|permission|relation|column|returned|request|security|user|email address)\b/i
const TECNICO = /edge function|non-2xx|\bjson\b|\bjwt\b|fetch|typeerror|syntaxerror|referenceerror|undefined|\bnull\b|https?:\/\/|supabase|postgres|pgrst|sqlstate|deno/i

export function testoServerLeggibile(s) {
    return typeof s === 'string' && s.trim() !== '' && !INGLESE.test(s) && !TECNICO.test(s)
}

// L'errore di una funzione del server, dal corpo della risposta già letto (le chiamate con fetch):
// prima il traduttore delle password, poi il testo del server se è leggibile, altrimenti `generico`
// (un messaggio generico nella lingua della pagina).
export function messaggioErroreServer(corpo, { password, t, generico }) {
    const pwd = typeof t === 'function' ? messaggioErroreAuthPassword(corpo, password, t) : null
    if (pwd) return pwd
    const s = typeof corpo === 'string' ? corpo : corpo?.error ?? corpo?.message
    return testoServerLeggibile(s) ? s : generico
}

// Lo stesso per supabase.functions.invoke: con una risposta non 2xx il testo vero sta nel corpo della
// risposta (error.context), e «Edge Function returned a non-2xx status code» non si mostra mai.
export async function messaggioErroreInvoke(error, data, opzioni) {
    let corpo = data ?? null
    if (!corpo && error?.context) {
        try { corpo = await error.context.json() } catch { corpo = null }
    }
    return messaggioErroreServer(corpo ?? error, opzioni)
}
