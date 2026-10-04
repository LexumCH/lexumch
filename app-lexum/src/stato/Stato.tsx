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
import { salvaPaese } from '@/backend/telefono';
import { linguaTelefono } from '@/lingue';
import { datiVeri } from '@/config';
import { messaggioErrore } from '@/errori';
import { coloriEtichette } from '@/tema';
import { contenuti } from '@/paesi/contenuti';
import { utenteFinto } from '@/dati-finti/utente';
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
  | 'offline-ricerche-it'
  | 'due-passaggi-it'
  | 'avvocato-it'
  | 'avvocato-ch'
  | 'commercialista-it'
  | 'fiduciario-ch'
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
  telefono: Telefono;
  // Verifica in due passaggi (codice di un'app di autenticazione), per account di paese:
  // è la stessa del sito, perché il fattore sta nell'account (Supabase MFA).
  dueFattori: Record<string, boolean>;
  // Ruolo dell'account in ogni paese (user, avvocato, cliente…): non blocca mai l'accesso.
  ruoli: Record<string, string>;
  // Chi è entrato in ogni paese: gli account dei due paesi sono separati, anche con la stessa email.
  utenti: Record<string, Utente>;
  // Cresce a ogni scenario dell'elenco delle schermate: lo Studio riparte dai suoi dati finti.
  generazione: number;
};

export type Utente = { nome: string; cognome: string; email: string };

const utenteDiProva: Utente = {
  nome: utenteFinto.nome,
  cognome: utenteFinto.cognome,
  email: utenteFinto.email,
};

// Impostazioni di questo telefono (Profilo → «Su questo telefono»): valgono per tutti i paesi,
// spente finché l'utente non le accende. Dalla tappa 6 si salvano sul telefono.
export type Telefono = {
  blocco: boolean; // Face ID o impronta all'apertura dell'app
  ricercheOffline: boolean; // copia di Ricerche sul telefono, leggibile senza rete
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
  // Con i dati veri si parte senza accessi: li ritrova l'avvio dalle sessioni salvate.
  accessi: { IT: !datiVeri, CH: !datiVeri },
  conti: copia(contiFinti),
  // La lingua del telefono, se è italiano, tedesco o francese: vale solo in Svizzera (e nella scelta del paese).
  lingua: linguaTelefono(),
  chat: chatVuota,
  etichette: copia(etichetteFinte),
  elementi: copia(elementiFinti),
  documenti: copia(documentiArchivioFinti),
  simula: nessunaSimulazione,
  telefono: { blocco: false, ricercheOffline: false },
  dueFattori: { IT: false, CH: false },
  ruoli: { IT: 'user', CH: 'user' },
  utenti: { IT: { ...utenteDiProva }, CH: { ...utenteDiProva } },
  generazione: 0,
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
  modificaEtichetta: (id: string, dati: { nome: string; colore: string }) => void;
  eliminaEtichetta: (id: string) => void;
  impostaTelefono: (chiave: keyof Telefono, valore: boolean) => void;
  impostaDueFattori: (attiva: boolean) => void;
  salvaInArchivio: (documento: {
    titolo: string;
    categoria: string | null;
    dimensione: string;
    tipo: string;
  }) => void;
  usaCredito: () => void;
  creaAppunti: (dati: { titolo: string; testo: string; etichetta: string }) => Elemento;
  nuovaChat: () => void;
  apriChatSalvata: (elemento: Elemento) => void;
  esci: () => void;
  eliminaAccesso: (codice: string) => void;
  // Accesso vero (tappa 2): chi è entrato in un paese, con il ruolo letto dal profilo.
  entrato: (codice: string, dati: { ruolo: string } & Utente) => void;
  uscito: (codice: string) => void;
  scenario: (nome: Scenario) => void;
};

type Valore = Stato & {
  azioni: Azioni;
  conto: Conto;
  utente: Utente;
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

  // Con i dati veri il paese attivo resta sul telefono.
  useEffect(() => {
    if (datiVeri) void salvaPaese(stato.paese);
  }, [stato.paese]);

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

  // Gestione etichette, come sul sito: nome e colore si cambiano; eliminando un'etichetta
  // chat, norme e appunti non si cancellano, perdono solo l'etichetta.
  const modificaEtichetta = useCallback((id: string, dati: { nome: string; colore: string }) => {
    setStato((s) => ({
      ...s,
      etichette: {
        ...s.etichette,
        [s.paese]: (s.etichette[s.paese] ?? []).map((e) =>
          e.id === id ? { ...e, nome: dati.nome.trim(), colore: dati.colore } : e,
        ),
      },
    }));
  }, []);

  const eliminaEtichetta = useCallback((id: string) => {
    setStato((s) => ({
      ...s,
      etichette: { ...s.etichette, [s.paese]: (s.etichette[s.paese] ?? []).filter((e) => e.id !== id) },
      elementi: {
        ...s.elementi,
        [s.paese]: (s.elementi[s.paese] ?? []).map((e) => (e.etichetta === id ? { ...e, etichetta: '' } : e)),
      },
      chat: s.chat.etichetta === id ? { ...s.chat, etichetta: null } : s.chat,
    }));
  }, []);

  const impostaTelefono = useCallback((chiave: keyof Telefono, valore: boolean) => {
    setStato((s) => ({ ...s, telefono: { ...s.telefono, [chiave]: valore } }));
  }, []);

  const impostaDueFattori = useCallback((attiva: boolean) => {
    setStato((s) => ({ ...s, dueFattori: { ...s.dueFattori, [s.paese]: attiva } }));
  }, []);

  // «Condividi in Lexum» da un'altra app: il file entra in Archivio, in coda per la lettura.
  const salvaInArchivio = useCallback(
    (d: { titolo: string; categoria: string | null; dimensione: string; tipo: string }) => {
      const documento: DocumentoArchivio = { id: nuovoId('d'), data: 'oggi', stato: 'In coda', ...d };
      setStato((s) => ({
        ...s,
        documenti: { ...s.documenti, [s.paese]: [documento, ...(s.documenti[s.paese] ?? [])] },
      }));
    },
    [],
  );

  // Per le richieste a Lex fuori dalla chat (per esempio il confronto): scala un credito.
  const usaCredito = useCallback(() => {
    setStato((s) => ({ ...s, conti: { ...s.conti, [s.paese]: scalaCredito(s.conti[s.paese]) } }));
  }, []);

  // «Nuova ricerca» di Ricerche: appunti scritti a mano, come la «ricerca manuale» del sito.
  const creaAppunti = useCallback((dati: { titolo: string; testo: string; etichetta: string }) => {
    const testo = dati.testo.trim();
    const elemento: Elemento = {
      id: nuovoId('e'),
      etichetta: dati.etichetta,
      tipo: 'Appunti',
      quando: 'oggi',
      titolo: dati.titolo.trim() || 'Ricerca manuale',
      estratto: testo.length > 160 ? `${testo.slice(0, 157).trimEnd()}…` : testo,
      testo,
    };
    setStato((s) => ({
      ...s,
      elementi: { ...s.elementi, [s.paese]: [elemento, ...(s.elementi[s.paese] ?? [])] },
    }));
    return elemento;
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

  const entrato = useCallback((codice: string, dati: { ruolo: string } & Utente) => {
    const { ruolo, ...utente } = dati;
    setStato((s) => ({
      ...s,
      accessi: { ...s.accessi, [codice]: true },
      ruoli: { ...s.ruoli, [codice]: ruolo },
      utenti: { ...s.utenti, [codice]: utente },
    }));
  }, []);

  const uscito = useCallback((codice: string) => {
    setStato((s) => ({
      ...s,
      chat: s.paese === codice ? chatVuota : s.chat,
      accessi: { ...s.accessi, [codice]: false },
      ruoli: { ...s.ruoli, [codice]: 'user' },
    }));
  }, []);

  const scenario = useCallback((nome: Scenario) => {
    setStato((prima) => ({ ...costruisciScenario(nome), generazione: prima.generazione + 1 }));
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
      creaAppunti,
      modificaEtichetta,
      eliminaEtichetta,
      impostaTelefono,
      impostaDueFattori,
      salvaInArchivio,
      nuovaChat,
      apriChatSalvata,
      esci,
      eliminaAccesso,
      entrato,
      uscito,
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
      creaAppunti,
      modificaEtichetta,
      eliminaEtichetta,
      impostaTelefono,
      impostaDueFattori,
      salvaInArchivio,
      nuovaChat,
      apriChatSalvata,
      esci,
      eliminaAccesso,
      entrato,
      uscito,
      scenario,
    ],
  );

  const valore = useMemo<Valore>(
    () => ({
      ...stato,
      azioni,
      conto: stato.conti[stato.paese],
      utente: stato.utenti[stato.paese] ?? utenteDiProva,
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
    case 'avvocato-it':
      return {
        ...base,
        ruoli: { ...base.ruoli, IT: 'avvocato' },
        dueFattori: { ...base.dueFattori, IT: true },
      };
    case 'avvocato-ch':
      return { ...base, paese: 'CH', ruoli: { ...base.ruoli, CH: 'avvocato' } };
    case 'commercialista-it':
      return { ...base, ruoli: { ...base.ruoli, IT: 'commercialista' } };
    case 'fiduciario-ch':
      return { ...base, paese: 'CH', ruoli: { ...base.ruoli, CH: 'fiduciario' } };
    case 'due-passaggi-it':
      return { ...base, dueFattori: { ...base.dueFattori, IT: true } };
    case 'offline-ricerche-it':
      return {
        ...base,
        simula: { ...base.simula, offline: true },
        telefono: { ...base.telefono, ricercheOffline: true },
      };
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
