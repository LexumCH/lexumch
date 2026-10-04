import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  studioFinto,
  type Appuntamento,
  type Controparte,
  type DatiFatturazione,
  type DatiStudio,
  type Esito,
  type Fattura,
  type Pratica,
  type RigaFattura,
  type StatoEvento,
  type TipoCausa,
} from '@/dati-finti/studio';
import { totaliFattura } from '@/studio/calcoli';
import { useStato } from '@/stato/Stato';

// Stato dell'area Studio (pratiche, calendario, fatture) dell'account attivo: un insieme di dati
// per paese e ruolo. Tutto in memoria, con dati finti: dalla tappa «Studio» arriva dal database.

let contatore = 0;
const nuovoId = (p: string) => `${p}${Date.now().toString(36)}${(contatore++).toString(36)}`;

export type NuovaPratica = {
  titolo: string;
  clienteId: string;
  tipo: TipoCausa;
  note?: string;
  oreDedicate?: number;
};

export type NuovaFattura = Omit<Fattura, 'id' | 'numero' | 'stato' | 'pagamenti' | 'pdf'>;

// Righe calcolate dal calcolatore della parcella, in attesa che la nuova fattura le prenda.
export type Parcella = { righe: Omit<RigaFattura, 'id'>[]; modo: 'aggiungi' | 'sostituisci' };

type Azioni = {
  creaPratica: (p: NuovaPratica) => string;
  chiudiPratica: (id: string, esito: Esito) => void;
  riapriPratica: (id: string) => void;
  salvaNotePratica: (id: string, note: string) => void;
  eliminaPratica: (id: string) => 'ok' | 'fatture';
  aggiungiTermine: (praticaId: string, t: { titolo: string; scadenza: string; evento?: string }) => void;
  compiTermine: (praticaId: string, terminoId: string) => void;
  eliminaTermine: (praticaId: string, terminoId: string) => void;
  aggiungiUdienza: (praticaId: string, u: { tipo: string; dataOra: string; sede?: string }) => void;
  aggiungiControparte: (praticaId: string, c: Omit<Controparte, 'id'>) => void;
  salvaAppuntamento: (a: Omit<Appuntamento, 'id' | 'stato'> & { id?: string }) => void;
  statoAppuntamento: (id: string, stato: StatoEvento) => void;
  creaFattura: (f: NuovaFattura) => string;
  registraPagamento: (fatturaId: string, importo: number, metodo: string, data?: string) => void;
  annullaFattura: (fatturaId: string) => void;
  generaPdf: (fatturaId: string) => void;
  salvaDatiFatturazione: (d: DatiFatturazione) => void;
  preparaParcella: (p: Parcella) => void;
  scartaParcella: () => void;
};

type Valore = DatiStudio & { azioni: Azioni; parcella: Parcella | null };

const Contesto = createContext<Valore | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const { paese, ruoli, generazione } = useStato();
  const ruolo = ruoli[paese] ?? 'user';
  const chiave = `${paese}-${ruolo}`;
  const [mappa, setMappa] = useState<Record<string, DatiStudio>>({});
  const [ultimaGenerazione, setUltimaGenerazione] = useState(generazione);
  // un nuovo scenario dell'elenco delle schermate: si riparte dai dati finti
  if (generazione !== ultimaGenerazione) {
    setUltimaGenerazione(generazione);
    setMappa({});
  }

  const dati = useMemo(() => mappa[chiave] ?? studioFinto(paese, ruolo), [mappa, chiave, paese, ruolo]);
  const [parcella, setParcella] = useState<Parcella | null>(null);

  const aggiorna = useCallback(
    (fn: (d: DatiStudio) => DatiStudio) => {
      setMappa((m) => ({ ...m, [chiave]: fn(m[chiave] ?? studioFinto(paese, ruolo)) }));
    },
    [chiave, paese, ruolo],
  );

  const conPratica = useCallback(
    (id: string, fn: (p: Pratica) => Pratica) =>
      aggiorna((d) => ({ ...d, pratiche: d.pratiche.map((p) => (p.id === id ? fn(p) : p)) })),
    [aggiorna],
  );

  const azioni = useMemo<Azioni>(() => {
    const creaPratica = (n: NuovaPratica) => {
      const id = nuovoId('p');
      const pratica: Pratica = {
        id,
        titolo: n.titolo.trim(),
        clienteId: n.clienteId,
        tipo: n.tipo,
        stato: 'aperta',
        creata: new Date().toISOString(),
        note: n.note?.trim() || undefined,
        oreDedicate: n.oreDedicate,
        controparti: [],
        termini: [],
        udienze: [],
        documenti: [],
        ricerche: [],
      };
      aggiorna((d) => ({ ...d, pratiche: [pratica, ...d.pratiche] }));
      return id;
    };

    return {
      creaPratica,
      chiudiPratica: (id, esito) => conPratica(id, (p) => ({ ...p, stato: 'chiusa', esito })),
      riapriPratica: (id) => conPratica(id, (p) => ({ ...p, stato: 'aperta', esito: undefined })),
      salvaNotePratica: (id, note) => conPratica(id, (p) => ({ ...p, note: note.trim() || undefined })),
      // Come l'edge function `elimina-pratica`: non si elimina se ci sono fatture collegate.
      eliminaPratica: (id) => {
        if (dati.fatture.some((f) => f.praticaId === id)) return 'fatture';
        aggiorna((d) => ({
          ...d,
          pratiche: d.pratiche.filter((p) => p.id !== id),
          appuntamenti: d.appuntamenti.filter((a) => a.praticaId !== id),
        }));
        return 'ok';
      },
      // Come il trigger dei siti: un termine crea l'evento «SCADENZA: …» in calendario alle 09:00.
      aggiungiTermine: (praticaId, t) => {
        const terminoId = nuovoId('t');
        const pratica = dati.pratiche.find((p) => p.id === praticaId);
        const inizio = new Date(t.scadenza);
        inizio.setHours(9, 0, 0, 0);
        aggiorna((d) => ({
          ...d,
          pratiche: d.pratiche.map((p) =>
            p.id === praticaId
              ? { ...p, termini: [...p.termini, { id: terminoId, stato: 'in_corso', ...t }] }
              : p,
          ),
          appuntamenti: [
            ...d.appuntamenti,
            {
              id: `ev-${terminoId}`,
              titolo: `SCADENZA: ${t.titolo}`,
              tipo: 'scadenza',
              stato: 'programmato',
              inizio: inizio.toISOString(),
              fine: new Date(inizio.getTime() + 30 * 60000).toISOString(),
              clienteId: pratica?.clienteId,
              praticaId,
              origine: 'termine',
            },
          ],
        }));
      },
      compiTermine: (praticaId, terminoId) =>
        conPratica(praticaId, (p) => ({
          ...p,
          termini: p.termini.map((t) => (t.id === terminoId ? { ...t, stato: 'compiuto' } : t)),
        })),
      eliminaTermine: (praticaId, terminoId) =>
        aggiorna((d) => ({
          ...d,
          pratiche: d.pratiche.map((p) =>
            p.id === praticaId ? { ...p, termini: p.termini.filter((t) => t.id !== terminoId) } : p,
          ),
          appuntamenti: d.appuntamenti.filter((a) => a.id !== `ev-${terminoId}`),
        })),
      // Un'udienza programmata crea l'evento «Udienza: …» in calendario (come `UdienzaModal` del sito).
      aggiungiUdienza: (praticaId, u) => {
        const udienzaId = nuovoId('u');
        const pratica = dati.pratiche.find((p) => p.id === praticaId);
        aggiorna((d) => ({
          ...d,
          pratiche: d.pratiche.map((p) =>
            p.id === praticaId
              ? { ...p, udienze: [...p.udienze, { id: udienzaId, stato: 'programmata', ...u }] }
              : p,
          ),
          appuntamenti: [
            ...d.appuntamenti,
            {
              id: `ev-${udienzaId}`,
              titolo: `Udienza: ${u.tipo}`,
              tipo: 'udienza',
              stato: 'programmato',
              inizio: u.dataOra,
              fine: new Date(new Date(u.dataOra).getTime() + 120 * 60000).toISOString(),
              clienteId: pratica?.clienteId,
              praticaId,
              noteInterne: u.sede,
              origine: 'udienza',
            },
          ],
        }));
      },
      aggiungiControparte: (praticaId, c) =>
        conPratica(praticaId, (p) => ({
          ...p,
          controparti: [...p.controparti, { ...c, id: nuovoId('cp') }],
        })),
      // Sul sito un appuntamento non si può modificare dopo averlo creato: nell'app sì.
      salvaAppuntamento: (a) =>
        aggiorna((d) => {
          if (a.id) {
            return {
              ...d,
              appuntamenti: d.appuntamenti.map((x) => (x.id === a.id ? { ...x, ...a, id: x.id } : x)),
            };
          }
          return {
            ...d,
            appuntamenti: [...d.appuntamenti, { ...a, id: nuovoId('a'), stato: 'programmato' }],
          };
        }),
      statoAppuntamento: (id, stato) =>
        aggiorna((d) => ({
          ...d,
          appuntamenti: d.appuntamenti.map((a) => (a.id === id ? { ...a, stato } : a)),
        })),
      // Numerazione come `genera_numero_fattura`: F-AAAA-NNN, contatore per anno.
      creaFattura: (n) => {
        const id = nuovoId('f');
        aggiorna((d) => {
          const anno = new Date(n.emessa).getFullYear();
          const ultimo = d.fatture
            .filter((f) => f.numero.startsWith(`F-${anno}-`))
            .reduce((m, f) => Math.max(m, Number(f.numero.slice(7)) || 0), 0);
          const numero = `F-${anno}-${String(ultimo + 1).padStart(3, '0')}`;
          return { ...d, fatture: [{ ...n, id, numero, stato: 'in_attesa', pagamenti: [] }, ...d.fatture] };
        });
        return id;
      },
      // Come il trigger `trg_aggiorna_stato_da_pagamenti`, ma confrontando con quanto il cliente paga davvero.
      registraPagamento: (fatturaId, importo, metodo, data) =>
        aggiorna((d) => ({
          ...d,
          fatture: d.fatture.map((f) => {
            if (f.id !== fatturaId) return f;
            const pagamenti = [
              ...f.pagamenti,
              { id: nuovoId('pg'), data: data ?? new Date().toISOString(), importo, metodo },
            ];
            const t = totaliFattura({ ...f, pagamenti }, paese);
            return { ...f, pagamenti, stato: t.residuo <= 0.01 ? 'pagata' : f.stato };
          }),
        })),
      annullaFattura: (fatturaId) =>
        aggiorna((d) => ({
          ...d,
          fatture: d.fatture.map((f) => (f.id === fatturaId ? { ...f, stato: 'annullata' } : f)),
        })),
      generaPdf: (fatturaId) =>
        aggiorna((d) => ({
          ...d,
          fatture: d.fatture.map((f) => (f.id === fatturaId ? { ...f, pdf: true } : f)),
        })),
      salvaDatiFatturazione: (fatturazione) => aggiorna((d) => ({ ...d, fatturazione })),
      preparaParcella: (p) => setParcella(p),
      scartaParcella: () => setParcella(null),
    };
  }, [aggiorna, conPratica, dati, paese]);

  const valore = useMemo<Valore>(() => ({ ...dati, azioni, parcella }), [dati, azioni, parcella]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useStudio(): Valore {
  const v = useContext(Contesto);
  if (!v) throw new Error('useStudio va usato dentro StudioProvider');
  return v;
}

export function nomeCliente(clienti: { id: string; nome: string }[], id?: string): string {
  return clienti.find((c) => c.id === id)?.nome ?? 'Senza cliente';
}
