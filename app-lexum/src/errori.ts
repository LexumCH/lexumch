// Messaggi d'errore per l'utente, WHITE-LABEL: non compaiono mai nomi di fornitori AI,
// modelli o indirizzi tecnici. Stessa regola di src/lib/sanitizzaErrore.js del sito svizzero.
//
// - Se il messaggio contiene un riferimento a un fornitore → messaggio generico
//   (429 → troppe richieste; 401/403/5xx → servizio non disponibile).
// - Errori di rete → «La connessione si è interrotta…».
// - Messaggi tecnici del motore JavaScript o della piattaforma → messaggio generico.
// - Altrimenti il messaggio è già scritto per l'utente e resta com'è.

const MARKER =
  /openai|anthropic|mistral|\bclaude\b|claude-|\bgpt-|chatgpt|api\.(?:openai|anthropic|mistral)|x-api-key|anthropic-version|\bsk-ant-|\bsk-proj-|\bsk-[a-z0-9]{20}|text-embedding/i;

const RETE =
  /failed to fetch|networkerror|network error|network request failed|load failed|err_network|err_internet_disconnected/i;

const TECNICO =
  /unexpected (?:end|token)|\bjson\b|is not a function|cannot read propert|is not defined|\bundefined\b|typeerror|syntaxerror|referenceerror|statement timeout|internal server error|bad gateway|gateway time-?out|worker_limit|econnreset|edge function returned|non-2xx|failed to send a request to the edge function|relay error/i;

export type TipoMessaggio = 'rate' | 'down' | 'generico' | 'rete' | 'tecnico';

// Gli stessi testi del sito (italiano, tedesco, francese).
export const messaggiErrore: Record<string, Record<TipoMessaggio, string>> = {
  it: {
    rate: 'Troppe richieste in questo momento. Riprova tra qualche secondo.',
    down: 'Il servizio AI è temporaneamente non disponibile. Riprova tra poco.',
    generico: 'Il servizio AI non è al momento disponibile. Riprova tra poco.',
    rete: 'La connessione si è interrotta. Controlla la rete e riprova.',
    tecnico: 'Si è verificato un errore temporaneo. Riprova tra qualche istante.',
  },
  de: {
    rate: 'Zu viele Anfragen im Moment. Bitte in einigen Sekunden erneut versuchen.',
    down: 'Der KI-Dienst ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
    generico: 'Der KI-Dienst ist derzeit nicht verfügbar. Bitte später erneut versuchen.',
    rete: 'Die Verbindung wurde unterbrochen. Bitte prüfen Sie das Netzwerk und versuchen Sie es erneut.',
    tecnico: 'Ein vorübergehender Fehler ist aufgetreten. Bitte versuchen Sie es in Kürze erneut.',
  },
  fr: {
    rate: 'Trop de requêtes pour le moment. Réessayez dans quelques secondes.',
    down: 'Le service IA est temporairement indisponible. Réessayez bientôt.',
    generico: 'Le service IA est momentanément indisponible. Réessayez bientôt.',
    rete: 'La connexion a été interrompue. Vérifiez le réseau et réessayez.',
    tecnico: "Une erreur temporaire s'est produite. Veuillez réessayer dans quelques instants.",
  },
};

export function messaggioErrore(input: unknown, lingua = 'it', ripiego?: string): string {
  const m = messaggiErrore[lingua] ?? messaggiErrore.it;
  const grezzo =
    typeof input === 'string'
      ? input
      : input instanceof Error
        ? input.message
        : input == null
          ? ''
          : String(input);
  if (!grezzo) return ripiego ?? m.tecnico;
  if (MARKER.test(grezzo)) {
    const stato = (grezzo.match(/\b(429|5\d\d|401|403)\b/) || [])[1];
    if (stato === '429') return m.rate;
    if (stato === '401' || stato === '403' || (stato && stato[0] === '5')) return m.down;
    return ripiego ?? m.generico;
  }
  if (RETE.test(grezzo)) return m.rete;
  if (TECNICO.test(grezzo)) return ripiego ?? m.tecnico;
  return grezzo;
}
