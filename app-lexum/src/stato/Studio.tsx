import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  studioFinto,
  type Appuntamento,
  type Cliente,
  type Controparte,
  type DatiFatturazione,
  type DatiStudio,
  type DocumentoStudio,
  type Esito,
  type Fattura,
  type Pratica,
  type RicercaPratica,
  type RigaFattura,
  type StatoEvento,
  type TipoCausa,
} from '@/dati-finti/studio';
import { totaliFattura } from '@/studio/calcoli';
import { nomeDaDati, type DatiCliente } from '@/studio/clienti';
import { useStato } from '@/stato/Stato';

// Stato dell'area Studio (clienti, pratiche, calendario, fatture, archivio dello studio) dell'account
// attivo: un insieme di dati per paese e ruolo. Tutto in memoria, con dati finti: dalla tappa «Studio»
// arriva dal database.

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

export type NuovoDocumento = {
  titolo: string;
  dimensione: string;
  formato: string;
  categoriaId?: string;
  sottocategoriaId?: string;
  clienteId?: string;
  praticaId?: string;
  scansione?: boolean;
};

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
  // clienti (edge function create-cliente, update-cliente, avvocato-cliente-actions)
  creaCliente: (d: DatiCliente, portale: boolean) => string | 'limite';
  modificaCliente: (id: string, d: DatiCliente) => void;
  eliminaCliente: (id: string) => void;
  attivaPortale: (id: string) => void;
  aggiungiNota: (clienteId: string, testo: string) => void;
  modificaNota: (id: string, testo: string) => void;
  eliminaNota: (id: string) => void;
  apriTicket: (clienteId: string, oggetto: string, testo?: string) => string;
  scriviNelTicket: (id: string, testo: string) => void;
  statoTicket: (id: string, stato: 'aperto' | 'chiuso') => void;
  condividiNelPortale: (clienteId: string, f: { nome: string; dimensione: string }) => void;
  rimuoviDalPortale: (id: string) => void;
  // archivio dello studio
  caricaDocumento: (d: NuovoDocumento) => string;
  collegaDocumento: (id: string, c: { clienteId?: string | null; praticaId?: string | null }) => void;
  spostaDocumento: (id: string, categoriaId: string | null, sottocategoriaId: string | null) => void;
  eliminaDocumento: (id: string) => 'ok' | 'fattura';
  creaCategoria: (nome: string) => string;
  rinominaCategoria: (id: string, nome: string) => void;
  eliminaCategoria: (id: string) => void;
  creaSottocategoria: (categoriaId: string, nome: string) => string;
  rinominaSottocategoria: (categoriaId: string, id: string, nome: string) => void;
  eliminaSottocategoria: (categoriaId: string, id: string) => void;
  // collegamenti a una pratica
  salvaAtto: (praticaId: string, titolo: string) => string;
  collegaFattura: (fatturaId: string, praticaId: string | null) => void;
  collegaRicerca: (praticaId: string, r: Omit<RicercaPratica, 'id'>) => void;
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
          // i documenti d'archivio restano, senza pratica; quelli solo della pratica se ne vanno
          documenti: d.documenti
            .filter((x) => !(x.soloPratica && x.praticaId === id))
            .map((x) => (x.praticaId === id ? { ...x, praticaId: undefined } : x)),
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
      // Come `genera-fattura-pdf`: il PDF finisce anche nell'archivio, nella categoria «Fatture».
      generaPdf: (fatturaId) =>
        aggiorna((d) => {
          const f = d.fatture.find((x) => x.id === fatturaId);
          if (!f || d.documenti.some((x) => x.fatturaId === fatturaId))
            return { ...d, fatture: d.fatture.map((x) => (x.id === fatturaId ? { ...x, pdf: true } : x)) };
          let categorie = d.categorie;
          let categoria = categorie.find((c) => c.nome === 'Fatture');
          if (!categoria) {
            categoria = { id: nuovoId('k'), nome: 'Fatture', sottocategorie: [] };
            categorie = [...categorie, categoria];
          }
          const pdf: DocumentoStudio = {
            id: nuovoId('d'),
            titolo: `Fattura ${f.numero}`,
            quando: new Date().toISOString(),
            dimensione: '90 KB',
            formato: 'PDF',
            stato: 'Indicizzato',
            categoriaId: categoria.id,
            clienteId: f.clienteId,
            praticaId: f.praticaId,
            origine: 'fattura',
            fatturaId,
          };
          return {
            ...d,
            categorie,
            documenti: [pdf, ...d.documenti],
            fatture: d.fatture.map((x) => (x.id === fatturaId ? { ...x, pdf: true } : x)),
          };
        }),
      salvaDatiFatturazione: (fatturazione) => aggiorna((d) => ({ ...d, fatturazione })),
      preparaParcella: (p) => setParcella(p),
      scartaParcella: () => setParcella(null),

      // ——— clienti ———
      // Come `create-cliente`: si ferma al limite di clienti del piano (LIMITE_CLIENTI_RAGGIUNTO).
      creaCliente: (n, portale) => {
        if (dati.limiteClienti && dati.clienti.length >= dati.limiteClienti) return 'limite';
        const id = nuovoId('c');
        const { ragioneSociale: _rs, ...resto } = n;
        const cliente: Cliente = {
          ...resto,
          id,
          nome: nomeDaDati(n),
          portale: portale || undefined,
          creato: new Date().toISOString(),
        };
        aggiorna((d) => ({ ...d, clienti: [cliente, ...d.clienti] }));
        return id;
      },
      modificaCliente: (id, n) =>
        aggiorna((d) => ({
          ...d,
          clienti: d.clienti.map((c) => {
            if (c.id !== id) return c;
            const { ragioneSociale: _rs, ...resto } = n;
            return {
              ...resto,
              id,
              nome: nomeDaDati(n),
              portale: c.portale,
              creato: c.creato,
              noteIniziali: c.noteIniziali,
            };
          }),
        })),
      // Come `avvocato-cliente-actions` (elimina-cliente): via l'anagrafica e tutto quello che è suo.
      eliminaCliente: (id) =>
        aggiorna((d) => {
          const pratiche = new Set(d.pratiche.filter((p) => p.clienteId === id).map((p) => p.id));
          return {
            ...d,
            clienti: d.clienti.filter((c) => c.id !== id),
            pratiche: d.pratiche.filter((p) => !pratiche.has(p.id)),
            fatture: d.fatture.filter((f) => f.clienteId !== id),
            appuntamenti: d.appuntamenti.filter(
              (a) => a.clienteId !== id && !(a.praticaId && pratiche.has(a.praticaId)),
            ),
            note: d.note.filter((x) => x.clienteId !== id),
            comunicazioni: d.comunicazioni.filter((x) => x.clienteId !== id),
            portale: d.portale.filter((x) => x.clienteId !== id),
            documenti: d.documenti.filter(
              (x) => x.clienteId !== id && !(x.praticaId && pratiche.has(x.praticaId)),
            ),
          };
        }),
      // Dopo «Cambia password» il cliente può entrare nel portale.
      attivaPortale: (id) =>
        aggiorna((d) => ({
          ...d,
          clienti: d.clienti.map((c) => (c.id === id ? { ...c, portale: true } : c)),
        })),
      aggiungiNota: (clienteId, testo) =>
        aggiorna((d) => ({
          ...d,
          note: [
            { id: nuovoId('n'), clienteId, testo: testo.trim(), quando: new Date().toISOString() },
            ...d.note,
          ],
        })),
      modificaNota: (id, testo) =>
        aggiorna((d) => ({
          ...d,
          note: d.note.map((x) =>
            x.id === id ? { ...x, testo: testo.trim(), modificata: new Date().toISOString() } : x,
          ),
        })),
      eliminaNota: (id) => aggiorna((d) => ({ ...d, note: d.note.filter((x) => x.id !== id) })),
      apriTicket: (clienteId, oggetto, testo) => {
        const id = nuovoId('tk');
        const quando = new Date().toISOString();
        aggiorna((d) => ({
          ...d,
          comunicazioni: [
            {
              id,
              clienteId,
              oggetto: oggetto.trim(),
              stato: 'aperto',
              creato: quando,
              messaggi: testo?.trim()
                ? [{ id: nuovoId('m'), da: 'studio', testo: testo.trim(), quando }]
                : [],
            },
            ...d.comunicazioni,
          ],
        }));
        return id;
      },
      scriviNelTicket: (id, testo) =>
        aggiorna((d) => ({
          ...d,
          comunicazioni: d.comunicazioni.map((x) =>
            x.id === id
              ? {
                  ...x,
                  messaggi: [
                    ...x.messaggi,
                    { id: nuovoId('m'), da: 'studio', testo: testo.trim(), quando: new Date().toISOString() },
                  ],
                }
              : x,
          ),
        })),
      statoTicket: (id, stato) =>
        aggiorna((d) => ({
          ...d,
          comunicazioni: d.comunicazioni.map((x) => (x.id === id ? { ...x, stato } : x)),
        })),
      condividiNelPortale: (clienteId, f) =>
        aggiorna((d) => ({
          ...d,
          portale: [
            { id: nuovoId('pp'), clienteId, ...f, quando: new Date().toISOString(), da: 'studio' },
            ...d.portale,
          ],
        })),
      rimuoviDalPortale: (id) => aggiorna((d) => ({ ...d, portale: d.portale.filter((x) => x.id !== id) })),

      // ——— archivio dello studio ———
      // Come il caricamento dell'Archivio del sito: il file entra «In coda» per la lettura (process-archivio).
      // Se si sceglie una pratica, il cliente è quello della pratica.
      caricaDocumento: (n) => {
        const id = nuovoId('d');
        const pratica = dati.pratiche.find((p) => p.id === n.praticaId);
        aggiorna((d) => ({
          ...d,
          documenti: [
            {
              ...n,
              id,
              titolo: n.titolo.trim(),
              clienteId: pratica?.clienteId ?? n.clienteId,
              quando: new Date().toISOString(),
              stato: 'In coda',
            },
            ...d.documenti,
          ],
        }));
        return id;
      },
      // Cliente e pratica di un documento (AssegnaDocumento del sito). Una pratica porta con sé il suo
      // cliente; togliere il cliente toglie anche la pratica.
      collegaDocumento: (id, c) =>
        aggiorna((d) => ({
          ...d,
          documenti: d.documenti.map((x) => {
            if (x.id !== id) return x;
            const y = { ...x };
            if (c.clienteId !== undefined) {
              y.clienteId = c.clienteId ?? undefined;
              const pratica = d.pratiche.find((p) => p.id === y.praticaId);
              if (!y.clienteId || (pratica && pratica.clienteId !== y.clienteId)) y.praticaId = undefined;
            }
            if (c.praticaId !== undefined) {
              const pratica = d.pratiche.find((p) => p.id === c.praticaId);
              y.praticaId = pratica?.id;
              if (pratica) y.clienteId = pratica.clienteId;
            }
            return y;
          }),
        })),
      spostaDocumento: (id, categoriaId, sottocategoriaId) =>
        aggiorna((d) => ({
          ...d,
          documenti: d.documenti.map((x) =>
            x.id === id
              ? {
                  ...x,
                  categoriaId: categoriaId ?? undefined,
                  sottocategoriaId: sottocategoriaId ?? undefined,
                }
              : x,
          ),
        })),
      // Il PDF di una fattura non si elimina dall'archivio (come sul sito).
      eliminaDocumento: (id) => {
        if (dati.documenti.find((x) => x.id === id)?.origine === 'fattura') return 'fattura';
        aggiorna((d) => ({ ...d, documenti: d.documenti.filter((x) => x.id !== id) }));
        return 'ok';
      },
      creaCategoria: (nome) => {
        const id = nuovoId('k');
        aggiorna((d) => ({
          ...d,
          categorie: [...d.categorie, { id, nome: nome.trim(), sottocategorie: [] }],
        }));
        return id;
      },
      rinominaCategoria: (id, nome) =>
        aggiorna((d) => ({
          ...d,
          categorie: d.categorie.map((c) => (c.id === id ? { ...c, nome: nome.trim() } : c)),
        })),
      // I documenti restano, senza categoria; le sottocategorie se ne vanno.
      eliminaCategoria: (id) =>
        aggiorna((d) => ({
          ...d,
          categorie: d.categorie.filter((c) => c.id !== id),
          documenti: d.documenti.map((x) =>
            x.categoriaId === id ? { ...x, categoriaId: undefined, sottocategoriaId: undefined } : x,
          ),
        })),
      creaSottocategoria: (categoriaId, nome) => {
        const id = nuovoId('s');
        aggiorna((d) => ({
          ...d,
          categorie: d.categorie.map((c) =>
            c.id === categoriaId
              ? { ...c, sottocategorie: [...c.sottocategorie, { id, nome: nome.trim() }] }
              : c,
          ),
        }));
        return id;
      },
      rinominaSottocategoria: (categoriaId, id, nome) =>
        aggiorna((d) => ({
          ...d,
          categorie: d.categorie.map((c) =>
            c.id === categoriaId
              ? {
                  ...c,
                  sottocategorie: c.sottocategorie.map((s) =>
                    s.id === id ? { ...s, nome: nome.trim() } : s,
                  ),
                }
              : c,
          ),
        })),
      // I documenti restano nella categoria principale.
      eliminaSottocategoria: (categoriaId, id) =>
        aggiorna((d) => ({
          ...d,
          categorie: d.categorie.map((c) =>
            c.id === categoriaId ? { ...c, sottocategorie: c.sottocategorie.filter((s) => s.id !== id) } : c,
          ),
          documenti: d.documenti.map((x) =>
            x.sottocategoriaId === id ? { ...x, sottocategoriaId: undefined } : x,
          ),
        })),

      // ——— collegamenti a una pratica ———
      // «Salva PDF» di un atto preparato da Lex (`salva-documento-pdf`): in Italia va nell'archivio
      // collegato alla pratica, in Svizzera nei documenti della pratica.
      salvaAtto: (praticaId, titolo) => {
        const id = nuovoId('d');
        const pratica = dati.pratiche.find((p) => p.id === praticaId);
        aggiorna((d) => ({
          ...d,
          documenti: [
            {
              id,
              titolo,
              quando: new Date().toISOString(),
              dimensione: '60 KB',
              formato: 'PDF',
              stato: 'Indicizzato',
              clienteId: pratica?.clienteId,
              praticaId,
              origine: 'atto',
              soloPratica: paese === 'CH' || undefined,
            },
            ...d.documenti,
          ],
        }));
        return id;
      },
      collegaFattura: (fatturaId, praticaId) =>
        aggiorna((d) => ({
          ...d,
          fatture: d.fatture.map((f) =>
            f.id === fatturaId ? { ...f, praticaId: praticaId ?? undefined } : f,
          ),
        })),
      collegaRicerca: (praticaId, r) =>
        conPratica(praticaId, (p) => ({ ...p, ricerche: [{ ...r, id: nuovoId('r') }, ...p.ricerche] })),
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
