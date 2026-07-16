// src/lib/sanitizzaErrore.js
// ─────────────────────────────────────────────────────────────
// Rete di sicurezza WHITE-LABEL.
// Impedisce che il nome di un fornitore AI (OpenAI, Anthropic, Mistral, …) o un
// suo riferimento tecnico (modelli, host API, header, chiavi) compaia MAI in un
// messaggio d'errore mostrato all'utente finale.
//
// Comportamento:
//   • se il messaggio NON contiene riferimenti a un provider  → lo restituisce
//     invariato (così NON tocca i normali errori applicativi/Supabase);
//   • se contiene un riferimento a un provider                → restituisce un
//     messaggio generico e localizzato (categoria in base allo stato HTTP se
//     riconoscibile: 429 → troppe richieste, 5xx/401/403 → servizio non
//     disponibile).
//
// Il dettaglio tecnico reale resta nei log lato server (edge function), mai qui.
// Difesa in profondità: le edge Lex già restituiscono messaggi generici; questo
// filtro copre anche le funzioni che non possiamo auditare/patchare al volo.
// ─────────────────────────────────────────────────────────────

import i18n from 'i18next'

// Qualsiasi marcatore che tradisca un fornitore AI o un dettaglio del provider.
const MARKER =
  /openai|anthropic|mistral|\bclaude\b|claude-|\bgpt-|chatgpt|api\.(?:openai|anthropic|mistral)|x-api-key|anthropic-version|\bsk-ant-|\bsk-proj-|\bsk-[a-z0-9]{20}|text-embedding/i

const MSG = {
  it: {
    rate: 'Troppe richieste in questo momento. Riprova tra qualche secondo.',
    down: 'Il servizio AI è temporaneamente non disponibile. Riprova tra poco.',
    generico: 'Il servizio AI non è al momento disponibile. Riprova tra poco.',
  },
  de: {
    rate: 'Zu viele Anfragen im Moment. Bitte in einigen Sekunden erneut versuchen.',
    down: 'Der KI-Dienst ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
    generico: 'Der KI-Dienst ist derzeit nicht verfügbar. Bitte später erneut versuchen.',
  },
  fr: {
    rate: 'Trop de requêtes pour le moment. Réessayez dans quelques secondes.',
    down: 'Le service IA est temporairement indisponible. Réessayez bientôt.',
    generico: "Le service IA est momentanément indisponible. Réessayez bientôt.",
  },
}

function messaggi() {
  const l = (i18n?.language ?? 'it').slice(0, 2)
  return MSG[l] ?? MSG.it
}

/**
 * Ripulisce un messaggio d'errore da qualsiasi riferimento a fornitori AI.
 * @param {unknown} input      stringa, Error, o qualsiasi valore
 * @param {string}  [fallback] messaggio generico personalizzato (facoltativo)
 * @returns {string|undefined} messaggio sicuro da mostrare; `undefined` se input vuoto
 *          (così `sanitizzaErrore(x) ?? t('...')` mantiene il fallback esistente).
 */
export function sanitizzaErrore(input, fallback) {
  const raw =
    typeof input === 'string'
      ? input
      : input?.message ?? (input == null ? '' : String(input))
  if (!raw) return undefined
  if (!MARKER.test(raw)) return raw // nessun riferimento provider → invariato

  const m = messaggi()
  const stato = (raw.match(/\b(429|5\d\d|401|403)\b/) || [])[1]
  if (stato === '429') return m.rate
  if (stato === '401' || stato === '403' || (stato && stato[0] === '5')) return m.down
  return fallback ?? m.generico
}

export default sanitizzaErrore
