import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { rispostaDiSeguitoFinta, rispostaPer, type Messaggio, type RispostaFinta } from '@/dati-finti/chat';
import { documentiArchivioFinti, type DocumentoArchivio } from '@/dati-finti/archivio';
import { contiFinti, type Conto } from '@/dati-finti/conti';
import {
  elementiFinti,
  etichetteFinte,
  messaggiDi,
  type Elemento,
  type Etichetta,
} from '@/dati-finti/ricerche';
import { messaggioErrore } from '@/errori';
import { coloriEtichette } from '@/tema';
import { contenuti } from '@/paesi/contenuti';
import { paesePredefinito } from '@/paesi/registro';

// Stato dell'app nella tappa 1: tutto in memoria, con dati finti.
// Dalla tappa 2 paese, accesso e conto arrivano da Supabase (un client per paese);
// dalla tappa 3 la chat parla con Lex.

export type Chat = {
  messaggi: Messaggio[];
  inCorso: boolean; // Lex sta lavorando
  passo: number; // passo attivo dell'attesa
  titolo: string | null;
  salvata: boolean;
  etichetta: string | null;
};

const chatVuota: Chat = {
  messaggi: [],
  inCorso: false,
  passo: 0,
  titolo: null,
  salvata: false,
  etichetta: null,
};

export type LinguaCH = 'it' | 'de' | 'fr';

// Situazioni pronte per l'elenco delle schermate (anteprima nel browser).
export type Scenario =
  | 'home-it'
  | 'lavora-it'
  | 'risposta-it'
  | 'salvata-it'
  | 'errore-lex-it'
  | 'offline-it'
  | 'caricamento-it'
  | 'vuoto-it'
  | 'senza-accesso-ch'
  | 'home-ch';

type Stato = {
  paese: string;
  accessi: Record<string, boolean>;
  conti: Record<string, Conto>;
  lingua: LinguaCH;
  chat: Chat;
  etichette: Record<string, Etichetta[]>;
  elementi: Record<string, Elemento[]>;
  documenti: Record<string, DocumentoArchivio[]>;
  simula: Simulazioni;
};

// Situazioni che nella tappa 1 si possono solo simulare (dall'elenco delle schermate).
export type Simulazioni = {
  erroreLex: boolean; // la prossima risposta di Lex non arriva
  offline: boolean; // come se il telefono fosse senza connessione
  caricamento: boolean; // gli elenchi restano in caricamento
};

const nessunaSimulazione: Simulazioni = { erroreLex: false, offline: false, caricamento: false };

const statoIniziale = (): Stato => ({
  paese: paesePredefinito,
  accessi: { IT: true, CH: true },
  conti: copia(contiFinti),
  lingua: 'it',
  chat: chatVuota,
  etichette: copia(etichetteFinte),
  elementi: copia(elementiFinti),
  documenti: copia(documentiArchivioFinti),
  simula: nessunaSimulazione,
});

function copia<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

let contatore = 0;
const nuovoId = (prefisso: string) => `${prefisso}${Date.now().toString(36)}${(contatore++).toString(36)}`;

const DURATA_PASSO_MS = 750;

type Azioni = {
  scegliPaese: (codice: string) => void;
  passaAPaese: (codice: string) => void;
  impostaLingua: (lingua: LinguaCH) => void;
  inviaDomanda: (testo: string) => 'ok' | 'esauriti' | 'occupato';
  riprova: () => void;
  impostaSimulazione: (chiave: keyof Simulazioni, valore: boolean) => void;
  mostraSubitoRisposta: () => void;
  salvaChat: (etichettaId: string) => void;
  creaEtichetta: (nome: string, colore?: string) => Etichetta;
  usaCredito: () => void;
  nuovaChat: () => void;
  apriChatSalvata: (elemento: Elemento) => void;
  esci: () => void;
  eliminaAccesso: (codice: string) => void;
  scenario: (nome: Scenario) => void;
};

type Valore = Stato & {
  azioni: Azioni;
  conto: Conto;
  etichetteAttive: Etichetta[];
  elementiAttivi: Elemento[];
  documentiAttivi: DocumentoArchivio[];
  chatDaSalvare: boolean;
};

const Contesto = createContext<Valore | null>(null);

export function StatoProvider({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Stato>(statoIniziale);

  // Passi dell'attesa: avanzano da soli finché Lex «risponde».
  useEffect(() => {
    if (!stato.chat.inCorso) return;
    const passi = contenuti[stato.paese].passi.length;
    const t = setTimeout(() => {
      setStato((s) => {
        if (!s.chat.inCorso) return s;
        if (s.chat.passo + 1 < passi) return { ...s, chat: { ...s.chat, passo: s.chat.passo + 1 } };
        return concludi(s);
      });
    }, DURATA_PASSO_MS);
    return () => clearTimeout(t);
  }, [stato.chat.inCorso, stato.chat.passo, stato.paese]);

  const scegliPaese = useCallback((codice: string) => {
    setStato((s) => ({ ...s, paese: codice }));
  }, []);

  const passaAPaese = useCallback((codice: string) => {
    setStato((s) => ({ ...s, paese: codice, chat: chatVuota, accessi: { ...s.accessi, [codice]: true } }));
  }, []);

  const impostaLingua = useCallback((lingua: LinguaCH) => {
    setStato((s) => ({ ...s, lingua }));
  }, []);

  // Il credito si controlla all'invio ma si scala solo quando la risposta arriva (vedi concludi).
  const inviaDomanda = useCallback(
    (testo: string) => {
      if (stato.chat.inCorso) return 'occupato' as const;
      if (stato.conti[stato.paese].crediti <= 0) return 'esauriti' as const;
      setStato((prima) => ({
        ...prima,
        chat: {
          ...prima.chat,
          inCorso: true,
          passo: 0,
          messaggi: [...prima.chat.messaggi, { id: nuovoId('m'), da: 'io', testo: testo.trim() }],
        },
      }));
      return 'ok' as const;
    },
    [stato.chat.inCorso, stato.conti, stato.paese],
  );

  // Dopo un errore di Lex: toglie l'avviso e rimanda la stessa domanda (stavolta va a buon fine).
  const riprova = useCallback(() => {
    setStato((s) => ({
      ...s,
      simula: { ...s.simula, erroreLex: false },
      chat: {
        ...s.chat,
        inCorso: true,
        passo: 0,
        messaggi: s.chat.messaggi.filter((m) => m.da !== 'errore'),
      },
    }));
  }, []);

  const impostaSimulazione = useCallback((chiave: keyof Simulazioni, valore: boolean) => {
    setStato((s) => ({ ...s, simula: { ...s.simula, [chiave]: valore } }));
  }, []);

  const mostraSubitoRisposta = useCallback(() => {
    setStato((s) => (s.chat.inCorso ? concludi(s) : s));
  }, []);

  const creaEtichetta = useCallback(
    (nome: string, colore?: string) => {
      const elenco = stato.etichette[stato.paese] ?? [];
      const nuova: Etichetta = {
        id: nuovoId('et'),
        nome: nome.trim(),
        colore: colore ?? coloriEtichette[elenco.length % coloriEtichette.length],
      };
      setStato((prima) => ({
        ...prima,
        etichette: { ...prima.etichette, [prima.paese]: [...(prima.etichette[prima.paese] ?? []), nuova] },
      }));
      return nuova;
    },
    [stato.etichette, stato.paese],
  );

  // Per le richieste a Lex fuori dalla chat (per esempio il confronto): scala un credito.
  const usaCredito = useCallback(() => {
    setStato((s) => ({ ...s, conti: { ...s.conti, [s.paese]: scalaCredito(s.conti[s.paese]) } }));
  }, []);

  const salvaChat = useCallback((etichettaId: string) => {
    setStato((s) => {
      const risposta = primaRisposta(s.chat);
      const elemento: Elemento = {
        id: nuovoId('e'),
        etichetta: etichettaId,
        tipo: 'Chat con Lex',
        quando: 'oggi',
        titolo: s.chat.titolo ?? 'Chat con Lex',
        estratto: risposta?.inBreve ? capitalizza(risposta.inBreve) : 'Chat con Lex',
        messaggi: s.chat.messaggi,
      };
      return {
        ...s,
        chat: { ...s.chat, salvata: true, etichetta: etichettaId },
        elementi: { ...s.elementi, [s.paese]: [elemento, ...(s.elementi[s.paese] ?? [])] },
      };
    });
  }, []);

  const nuovaChat = useCallback(() => {
    setStato((s) => ({ ...s, chat: chatVuota }));
  }, []);

  const apriChatSalvata = useCallback((elemento: Elemento) => {
    setStato((s) => ({
      ...s,
      chat: {
        ...chatVuota,
        titolo: elemento.titolo,
        salvata: true,
        etichetta: elemento.etichetta,
        messaggi: messaggiDi(elemento),
      },
    }));
  }, []);

  // Per l'elenco delle schermate: una chat già con la risposta, non salvata.

  const esci = useCallback(() => {
    setStato((s) => ({ ...s, chat: chatVuota }));
  }, []);

  // Finto: toglie l'accesso nel paese e svuota la chat. Quello vero chiede al backend di cancellare i dati.
  const eliminaAccesso = useCallback((codice: string) => {
    setStato((s) => ({
      ...s,
      chat: chatVuota,
      accessi: { ...s.accessi, [codice]: false },
      conti: { ...s.conti, [codice]: copia(contiFinti[codice]) },
    }));
  }, []);

  const scenario = useCallback((nome: Scenario) => {
    setStato(() => costruisciScenario(nome));
  }, []);

  const azioni = useMemo<Azioni>(
    () => ({
      scegliPaese,
      passaAPaese,
      impostaLingua,
      inviaDomanda,
      riprova,
      impostaSimulazione,
      mostraSubitoRisposta,
      salvaChat,
      creaEtichetta,
      usaCredito,
      nuovaChat,
      apriChatSalvata,
      esci,
      eliminaAccesso,
      scenario,
    }),
    [
      scegliPaese,
      passaAPaese,
      impostaLingua,
      inviaDomanda,
      riprova,
      impostaSimulazione,
      mostraSubitoRisposta,
      salvaChat,
      creaEtichetta,
      usaCredito,
      nuovaChat,
      apriChatSalvata,
      esci,
      eliminaAccesso,
      scenario,
    ],
  );

  const valore = useMemo<Valore>(
    () => ({
      ...stato,
      azioni,
      conto: stato.conti[stato.paese],
      etichetteAttive: stato.etichette[stato.paese] ?? [],
      elementiAttivi: stato.elementi[stato.paese] ?? [],
      documentiAttivi: stato.documenti[stato.paese] ?? [],
      chatDaSalvare: stato.chat.messaggi.length > 0 && !stato.chat.salvata,
    }),
    [stato, azioni],
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useStato(): Valore {
  const v = useContext(Contesto);
  if (!v) throw new Error('useStato va usato dentro StatoProvider');
  return v;
}

function costruisciScenario(nome: Scenario): Stato {
  const base = statoIniziale();
  const domanda: Messaggio = { id: nuovoId('m'), da: 'io', testo: domandaEsempio('IT') };
  const inAttesa = (s: Stato, passo = 3): Stato => ({
    ...s,
    chat: { ...chatVuota, inCorso: true, passo, messaggi: [domanda] },
  });
  switch (nome) {
    case 'home-it':
      return base;
    case 'lavora-it':
      return inAttesa(base);
    case 'risposta-it':
      return concludi(inAttesa(base, 0));
    case 'salvata-it': {
      const s = concludi(inAttesa(base, 0));
      const elemento: Elemento = {
        id: nuovoId('e'),
        etichetta: 'casa',
        tipo: 'Chat con Lex',
        quando: 'oggi',
        titolo: 'Accesso agli atti: silenzio del Comune',
        estratto: 'Il silenzio del Comune vale come rifiuto e hai 30 giorni per contestarlo…',
        messaggi: s.chat.messaggi,
      };
      return {
        ...s,
        chat: { ...s.chat, salvata: true, etichetta: 'casa' },
        elementi: { ...s.elementi, IT: [elemento, ...s.elementi.IT] },
      };
    }
    case 'errore-lex-it':
      return concludi({ ...inAttesa(base, 0), simula: { ...base.simula, erroreLex: true } });
    case 'offline-it':
      return { ...base, simula: { ...base.simula, offline: true } };
    case 'caricamento-it':
      return { ...base, simula: { ...base.simula, caricamento: true } };
    case 'vuoto-it':
      return {
        ...base,
        elementi: { ...base.elementi, IT: [] },
        etichette: { ...base.etichette, IT: [] },
        documenti: { ...base.documenti, IT: [] },
      };
    case 'senza-accesso-ch':
      return { ...base, accessi: { ...base.accessi, CH: false } };
    case 'home-ch':
      return { ...base, paese: 'CH' };
  }
}

// Fine dell'attesa: arriva la risposta e si scala un credito; se Lex non risponde,
// compare l'avviso d'errore e il credito resta.
function concludi(s: Stato): Stato {
  if (s.simula.erroreLex) {
    return {
      ...s,
      chat: {
        ...s.chat,
        inCorso: false,
        passo: 0,
        messaggi: [
          ...s.chat.messaggi,
          // nella tappa 3 qui arriva l'errore vero, ripulito da messaggioErrore
          {
            id: nuovoId('m'),
            da: 'errore',
            testo: messaggioErrore('Edge Function returned a non-2xx status code'),
          },
        ],
      },
    };
  }
  return {
    ...s,
    chat: concludiRisposta(s.chat, s.paese),
    conti: { ...s.conti, [s.paese]: scalaCredito(s.conti[s.paese]) },
  };
}

// Ordine delle domande frequenti: prima i crediti del piano, poi quelli di benvenuto, infine quelli acquistati.
export function scalaCredito(c: Conto): Conto {
  if (c.crediti <= 0) return c;
  const delPiano = c.crediti - c.creditiBenvenuto - c.creditiAcquistati;
  if (delPiano > 0) return { ...c, crediti: c.crediti - 1 };
  if (c.creditiBenvenuto > 0)
    return { ...c, crediti: c.crediti - 1, creditiBenvenuto: c.creditiBenvenuto - 1 };
  return { ...c, crediti: c.crediti - 1, creditiAcquistati: Math.max(0, c.creditiAcquistati - 1) };
}

function concludiRisposta(chat: Chat, paese: string): Chat {
  const giaRisposto = chat.messaggi.some((m) => m.da === 'lex');
  const domanda = chat.messaggi.find((m) => m.da === 'io');
  const testoDomanda = domanda && domanda.da === 'io' ? domanda.testo : '';
  const risposta: RispostaFinta = giaRisposto ? rispostaDiSeguitoFinta : rispostaPer(paese, testoDomanda);
  return {
    ...chat,
    inCorso: false,
    passo: 0,
    titolo: chat.titolo ?? (risposta.titolo || titoloDaDomanda(testoDomanda)),
    messaggi: [...chat.messaggi, { id: nuovoId('m'), da: 'lex', risposta }],
  };
}

function primaRisposta(chat: Chat): RispostaFinta | null {
  const m = chat.messaggi.find((x) => x.da === 'lex');
  return m && m.da === 'lex' ? m.risposta : null;
}

// Senza un argomento riconosciuto, il titolo della chat è l'inizio della domanda.
function titoloDaDomanda(t: string): string | null {
  const pulito = t.trim().replace(/\s+/g, ' ');
  if (!pulito) return null;
  return pulito.length <= 42 ? pulito : `${pulito.slice(0, 40).trimEnd()}…`;
}

function capitalizza(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function domandaEsempio(paese: string): string {
  return paese === 'CH'
    ? 'Mi hanno disdetto il contratto mentre ero in malattia, dopo due anni di lavoro. È valido?'
    : 'Ho chiesto al Comune di vedere i documenti della pratica edilizia del mio vicino. Sono passati 40 giorni e nessuno mi ha risposto. Cosa posso fare?';
}
