import { fetch } from 'expo/fetch';

import { messaggioErrore } from '@/errori';
import type { Lingua } from '@/lingue';
import { trovaPaese } from '@/paesi/registro';

import { clientDi } from './client';
import { creaLettoreSSE, type EventoLex } from './sse';

// La chat con Lex dei dati veri (tappa 3): POST a `lex-lead` con la sessione dell'utente, poi lo stream
// SSE letto pezzo per pezzo. Serve `fetch` di expo: quello standard di React Native non legge gli stream.
// Il corpo è quello del sito (BancaDati.jsx); in Svizzera anche la lingua dell'interfaccia e della domanda,
// così le fasi arrivano nella lingua giusta.

export type DomandaLex = {
  paese: string;
  domanda: string;
  messaggi: { role: 'user' | 'assistant'; content: string }[];
  lingua: Lingua;
  conversazioneId?: string;
  documentoId?: string;
};

export type EsitoLex = 'ok' | 'esauriti' | 'errore';

export async function chiediALex(
  d: DomandaLex,
  onEvento: (e: EventoLex) => void,
  segnale?: AbortSignal,
): Promise<EsitoLex> {
  const paese = trovaPaese(d.paese);
  const { data } = await clientDi(d.paese).auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    onEvento({ tipo: 'error', errore: messaggioErrore('Sessione scaduta', d.lingua) });
    return 'errore';
  }
  const corpo: Record<string, unknown> = {
    domanda: d.domanda,
    messaggi: d.messaggi,
    tipo_richiesta: 'query_iniziale',
    client_conversation_id: d.conversazioneId,
    documento_id: d.documentoId,
  };
  if (d.paese === 'CH') {
    corpo.lingua_interfaccia = d.lingua;
    corpo.lingua_domanda = d.lingua;
  }
  let risposta: Awaited<ReturnType<typeof fetch>>;
  try {
    risposta = await fetch(`${paese.supabaseUrl}/functions/v1/lex-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: paese.chiavePubblica,
      },
      body: JSON.stringify(corpo),
      signal: segnale,
    });
  } catch (e) {
    onEvento({ tipo: 'error', errore: messaggioErrore(e, d.lingua) });
    return 'errore';
  }
  // Prima dello stream: 400/401 con {ok:false, error}, 402 con crediti_esauriti.
  if (!risposta.ok || !risposta.body) {
    let json: { error?: string; crediti_esauriti?: boolean } = {};
    try {
      json = (await risposta.json()) as typeof json;
    } catch {
      // corpo non JSON
    }
    if (risposta.status === 402 || json.crediti_esauriti) return 'esauriti';
    onEvento({ tipo: 'error', errore: messaggioErrore(json.error ?? risposta.status, d.lingua) });
    return 'errore';
  }
  const lettore = creaLettoreSSE();
  const decoder = new TextDecoder();
  const reader = risposta.body.getReader();
  let finita = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const e of lettore.leggi(decoder.decode(value, { stream: true }))) {
      if (e.tipo === 'done') finita = true;
      onEvento(e.tipo === 'error' ? { tipo: 'error', errore: messaggioErrore(e.errore, d.lingua) } : e);
    }
  }
  for (const e of lettore.fine()) {
    if (e.tipo === 'done') finita = true;
    onEvento(e);
  }
  // stream chiuso senza «done»: la risposta è arrivata a metà
  if (!finita) onEvento({ tipo: 'error', errore: messaggioErrore('stream interrotto', d.lingua) });
  return finita ? 'ok' : 'errore';
}
