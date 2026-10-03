import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { risposteFinte, rispostaDiSeguitoFinta, type Messaggio, type RispostaFinta } from '@/dati-finti/chat';
import { contiFinti, type Conto } from '@/dati-finti/conti';
import { elementiFinti, etichetteFinte, type Elemento, type Etichetta } from '@/dati-finti/ricerche';
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
  'home-it' | 'lavora-it' | 'risposta-it' | 'salvata-it' | 'senza-accesso-ch' | 'home-ch';

type Stato = {
  paese: string;
  accessi: Record<string, boolean>;
  conti: Record<string, Conto>;
  lingua: LinguaCH;
  chat: Chat;
  etichette: Record<string, Etichetta[]>;
  elementi: Record<string, Elemento[]>;
};

const statoIniziale = (): Stato => ({
  paese: paesePredefinito,
  accessi: { IT: true, CH: true },
  conti: copia(contiFinti),
  lingua: 'it',
  chat: chatVuota,
  etichette: copia(etichetteFinte),
  elementi: copia(elementiFinti),
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
  mostraSubitoRisposta: () => void;
  salvaChat: (etichettaId: string) => void;
  creaEtichetta: (nome: string) => Etichetta;
  nuovaChat: () => void;
  apriChatSalvata: (elemento: Elemento) => void;
  esci: () => void;
  scenario: (nome: Scenario) => void;
};

type Valore = Stato & {
  azioni: Azioni;
  conto: Conto;
  etichetteAttive: Etichetta[];
  elementiAttivi: Elemento[];
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
        return { ...s, chat: concludiRisposta(s.chat, s.paese) };
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

  const inviaDomanda = useCallback(
    (testo: string) => {
      if (stato.chat.inCorso) return 'occupato' as const;
      if (stato.conti[stato.paese].crediti <= 0) return 'esauriti' as const;
      setStato((prima) => {
        const c = prima.conti[prima.paese];
        // i crediti di benvenuto si usano per primi
        const benvenuto = Math.max(0, c.creditiBenvenuto - 1);
        return {
          ...prima,
          conti: {
            ...prima.conti,
            [prima.paese]: { ...c, crediti: c.crediti - 1, creditiBenvenuto: benvenuto },
          },
          chat: {
            ...prima.chat,
            inCorso: true,
            passo: 0,
            messaggi: [...prima.chat.messaggi, { id: nuovoId('m'), da: 'io', testo: testo.trim() }],
          },
        };
      });
      return 'ok' as const;
    },
    [stato.chat.inCorso, stato.conti, stato.paese],
  );

  const mostraSubitoRisposta = useCallback(() => {
    setStato((s) => (s.chat.inCorso ? { ...s, chat: concludiRisposta(s.chat, s.paese) } : s));
  }, []);

  const creaEtichetta = useCallback(
    (nome: string) => {
      const elenco = stato.etichette[stato.paese] ?? [];
      const nuova: Etichetta = {
        id: nuovoId('et'),
        nome: nome.trim(),
        colore: coloriEtichette[elenco.length % coloriEtichette.length],
      };
      setStato((prima) => ({
        ...prima,
        etichette: { ...prima.etichette, [prima.paese]: [...(prima.etichette[prima.paese] ?? []), nuova] },
      }));
      return nuova;
    },
    [stato.etichette, stato.paese],
  );

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
        messaggi: elemento.messaggi ?? [
          {
            id: nuovoId('m'),
            da: 'lex',
            risposta: { titolo: elemento.titolo, punti: [], nota: elemento.estratto },
          },
        ],
      },
    }));
  }, []);

  // Per l'elenco delle schermate: una chat già con la risposta, non salvata.

  const esci = useCallback(() => {
    setStato((s) => ({ ...s, chat: chatVuota }));
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
      mostraSubitoRisposta,
      salvaChat,
      creaEtichetta,
      nuovaChat,
      apriChatSalvata,
      esci,
      scenario,
    }),
    [
      scegliPaese,
      passaAPaese,
      impostaLingua,
      inviaDomanda,
      mostraSubitoRisposta,
      salvaChat,
      creaEtichetta,
      nuovaChat,
      apriChatSalvata,
      esci,
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
  const conCrediti = (s: Stato, paese: string, crediti: number): Stato => ({
    ...s,
    conti: {
      ...s.conti,
      [paese]: {
        ...s.conti[paese],
        crediti,
        creditiBenvenuto: Math.min(s.conti[paese].creditiBenvenuto, crediti),
      },
    },
  });
  const domanda: Messaggio = { id: nuovoId('m'), da: 'io', testo: domandaEsempio('IT') };
  switch (nome) {
    case 'home-it':
      return base;
    case 'lavora-it':
      return {
        ...conCrediti(base, 'IT', 0),
        chat: { ...chatVuota, inCorso: true, passo: 3, messaggi: [domanda] },
      };
    case 'risposta-it':
    case 'salvata-it': {
      const s = conCrediti(base, 'IT', 0);
      const chat = concludiRisposta({ ...chatVuota, inCorso: true, messaggi: [domanda] }, 'IT');
      if (nome === 'risposta-it') return { ...s, chat };
      const elemento: Elemento = {
        id: nuovoId('e'),
        etichetta: 'casa',
        tipo: 'Chat con Lex',
        quando: 'oggi',
        titolo: 'Accesso agli atti: silenzio del Comune',
        estratto: 'Il silenzio del Comune vale come rifiuto e hai 30 giorni per contestarlo…',
        messaggi: chat.messaggi,
      };
      return {
        ...s,
        chat: { ...chat, salvata: true, etichetta: 'casa' },
        elementi: { ...s.elementi, IT: [elemento, ...s.elementi.IT] },
      };
    }
    case 'senza-accesso-ch':
      return { ...base, accessi: { ...base.accessi, CH: false } };
    case 'home-ch':
      return { ...base, paese: 'CH' };
  }
}

function concludiRisposta(chat: Chat, paese: string): Chat {
  const giaRisposto = chat.messaggi.some((m) => m.da === 'lex');
  const risposta: RispostaFinta = giaRisposto
    ? rispostaDiSeguitoFinta
    : (risposteFinte[paese] ?? rispostaDiSeguitoFinta);
  return {
    ...chat,
    inCorso: false,
    passo: 0,
    titolo: chat.titolo ?? (risposta.titolo || null),
    messaggi: [...chat.messaggi, { id: nuovoId('m'), da: 'lex', risposta }],
  };
}

function primaRisposta(chat: Chat): RispostaFinta | null {
  const m = chat.messaggi.find((x) => x.da === 'lex');
  return m && m.da === 'lex' ? m.risposta : null;
}

function capitalizza(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function domandaEsempio(paese: string): string {
  return paese === 'CH'
    ? 'Mi hanno disdetto il contratto mentre ero in malattia, dopo due anni di lavoro. È valido?'
    : 'Ho chiesto al Comune di vedere i documenti della pratica edilizia del mio vicino. Sono passati 40 giorni e nessuno mi ha risposto. Cosa posso fare?';
}
