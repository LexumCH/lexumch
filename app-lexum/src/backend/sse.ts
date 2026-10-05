// Lettura dello stream di `lex-lead` (Server-Sent Events), come BancaDati.jsx dei siti.
// Il server manda righe «event: X» e «data: {json}», separate da una riga vuota; ogni 15 secondi un
// commento «: attesa» per tenere viva la connessione, da ignorare. Gli eventi:
// - fase  {fase, descrizione}: analisi → ricerca («Consulto le fonti: norme_core, giurisprudenza…») → sintesi;
//   per le risposte di modello rigetto o no_copertura;
// - chunk {text}: un pezzo della risposta, da accodare;
// - done  {crediti_rimasti, tipo_risposta, meta, stop_reason};
// - error {error}: messaggio già leggibile.
// Qui niente rete: solo il parser e lo stato dell'attesa, così si provano senza server.

export type FaseLex = 'analisi' | 'ricerca' | 'sintesi' | 'rigetto' | 'no_copertura';

export type EventoLex =
  | { tipo: 'fase'; fase: FaseLex; descrizione: string }
  | { tipo: 'chunk'; testo: string }
  | {
      tipo: 'done';
      creditiRimasti?: number;
      tipoRisposta?: string;
      stopReason?: string;
      meta?: Record<string, unknown>;
    }
  | { tipo: 'error'; errore: string };

// Parser incrementale: si passa ogni pezzo di testo che arriva dalla rete, torna gli eventi completi.
// Un evento o una riga possono arrivare spezzati in due letture: il resto aspetta la lettura dopo.
export function creaLettoreSSE() {
  let buffer = '';
  let evento = 'message';
  let dati: string[] = [];

  const chiudi = (): EventoLex | null => {
    if (dati.length === 0) {
      evento = 'message';
      return null;
    }
    const nome = evento;
    const testo = dati.join('\n');
    evento = 'message';
    dati = [];
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(testo) as Record<string, unknown>;
    } catch {
      return null;
    }
    if (nome === 'fase') {
      return {
        tipo: 'fase',
        fase: String(json.fase) as FaseLex,
        descrizione: String(json.descrizione ?? ''),
      };
    }
    if (nome === 'chunk') return { tipo: 'chunk', testo: String(json.text ?? '') };
    if (nome === 'done') {
      return {
        tipo: 'done',
        creditiRimasti: typeof json.crediti_rimasti === 'number' ? json.crediti_rimasti : undefined,
        tipoRisposta: typeof json.tipo_risposta === 'string' ? json.tipo_risposta : undefined,
        stopReason: typeof json.stop_reason === 'string' ? json.stop_reason : undefined,
        meta: (json.meta as Record<string, unknown> | undefined) ?? undefined,
      };
    }
    if (nome === 'error') return { tipo: 'error', errore: String(json.error ?? '') };
    return null;
  };

  return {
    leggi(pezzo: string): EventoLex[] {
      buffer += pezzo;
      const fuori: EventoLex[] = [];
      let a = buffer.indexOf('\n');
      while (a >= 0) {
        const riga = buffer.slice(0, a).replace(/\r$/, '');
        buffer = buffer.slice(a + 1);
        if (riga === '') {
          const e = chiudi();
          if (e) fuori.push(e);
        } else if (riga.startsWith(':')) {
          // commento: «: attesa»
        } else if (riga.startsWith('event:')) {
          evento = riga.slice(6).trim();
        } else if (riga.startsWith('data:')) {
          dati.push(riga.slice(5).replace(/^ /, ''));
        }
        a = buffer.indexOf('\n');
      }
      return fuori;
    },
    // a fine stream: l'ultimo evento, se non è finito con la riga vuota
    fine(): EventoLex[] {
      if (buffer.startsWith('data:')) dati.push(buffer.slice(5).replace(/^ /, ''));
      buffer = '';
      const e = chiudi();
      return e ? [e] : [];
    },
  };
}

// «Consulto le fonti: norme_core, giurisprudenza, prassi» → ['norme_core', 'giurisprudenza', 'prassi'].
// In Svizzera, senza fonti: «Ragiono sul materiale fornito» → [].
export function fontiDaDescrizione(descrizione: string): string[] {
  const i = descrizione.indexOf(':');
  if (i < 0) return [];
  return descrizione
    .slice(i + 1)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// Lo stato dell'attesa che vede l'utente: la fase in corso, quelle già fatte, le fonti consultate
// e il testo della risposta man mano che arriva.
export type AttesaLex = {
  fase: FaseLex | null;
  fatte: FaseLex[];
  fonti: string[];
  senzaFonti: boolean; // CH: «Ragiono sul materiale fornito»
  testo: string;
};

export const attesaVuota: AttesaLex = { fase: null, fatte: [], fonti: [], senzaFonti: false, testo: '' };

export function avanzaAttesa(a: AttesaLex, e: EventoLex): AttesaLex {
  if (e.tipo === 'fase') {
    if (e.fase === 'rigetto' || e.fase === 'no_copertura') return { ...a, fase: e.fase };
    const fatte = a.fase && a.fase !== e.fase && !a.fatte.includes(a.fase) ? [...a.fatte, a.fase] : a.fatte;
    if (e.fase === 'ricerca') {
      const fonti = fontiDaDescrizione(e.descrizione);
      return { ...a, fase: e.fase, fatte, fonti, senzaFonti: fonti.length === 0 };
    }
    return { ...a, fase: e.fase, fatte };
  }
  if (e.tipo === 'chunk') return { ...a, testo: a.testo + e.testo };
  return a;
}
