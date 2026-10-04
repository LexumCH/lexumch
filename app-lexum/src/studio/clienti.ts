// Regole dei clienti dello studio: campi obbligatori, controlli, limite del piano, password del portale.
// Come i moduli dei siti (avvocato/clienti/Nuovo.jsx, IT e CH), con qualche controllo in più sui formati.

import type { Cliente, DocumentoStudio } from '@/dati-finti/studio';
import type { Chiave } from '@/lingue';

import { capValido, cfValido, pivaValida } from './fatturazione';

// I dati che si scrivono nel modulo: tutto il cliente tranne quello che decide lo studio.
export type DatiCliente = Omit<Cliente, 'id' | 'nome' | 'creato' | 'portale'> & { ragioneSociale?: string };

const pieno = (v?: string) => !!v && !!v.trim();

export function emailValida(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

// Numero AVS svizzero: 756.xxxx.xxxx.xx, con la cifra di controllo EAN-13.
export function avsValido(s: string): boolean {
  const v = s.replace(/[\s.]/g, '');
  if (!/^756\d{10}$/.test(v)) return false;
  let somma = 0;
  for (let i = 0; i < 12; i++) somma += Number(v[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (somma % 10)) % 10 === Number(v[12]);
}

// Numero UID (IDI) delle imprese svizzere: CHE-123.456.789, l'ultima cifra è di controllo (modulo 11).
// Come `normalizzaUid` del sito svizzero: torna la forma ufficiale, o null se non è valido.
export function normalizzaUid(s: string): string | null {
  const v = s
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/(MWST|TVA|IVA|VAT)$/, '');
  const m = /^CHE(\d{9})$/.exec(v);
  if (!m) return null;
  const d = m[1].split('').map(Number);
  const somma = [5, 4, 3, 2, 7, 6, 5, 4].reduce((tot, peso, i) => tot + peso * d[i], 0);
  const controllo = (11 - (somma % 11)) % 11;
  if (controllo === 10 || controllo !== d[8]) return null;
  return `CHE-${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6)}`;
}
export function uidValido(s: string): boolean {
  return normalizzaUid(s) !== null;
}

// I 26 Cantoni (CHECK `profiles_cantone_check` del database svizzero).
export const cantoni = [
  'AG',
  'AI',
  'AR',
  'BE',
  'BL',
  'BS',
  'FR',
  'GE',
  'GL',
  'GR',
  'JU',
  'LU',
  'NE',
  'NW',
  'OW',
  'SG',
  'SH',
  'SO',
  'SZ',
  'TG',
  'TI',
  'UR',
  'VD',
  'VS',
  'ZG',
  'ZH',
] as const;

// Codice destinatario SDI: 7 caratteri, 6 per la Pubblica Amministrazione.
export function sdiValido(s: string): boolean {
  return /^[A-Z0-9]{6,7}$/i.test(s.trim());
}

// Il nome che si vede: «Nome Cognome» per le persone, la ragione sociale per le società.
export function nomeDaDati(d: DatiCliente): string {
  if (d.giuridica) return (d.ragioneSociale ?? '').trim();
  return [d.nomeProprio, d.cognome]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(' ');
}

// I dati del modulo a partire da un cliente (per «Modifica»).
export function datiDaCliente(c: Cliente): DatiCliente {
  const { id: _id, nome, creato: _creato, portale: _portale, ...resto } = c;
  return { ...resto, ragioneSociale: c.giuridica ? nome : undefined };
}

// Toglie gli spazi in più, svuota i campi vuoti e quelli dell'altro tipo di soggetto
// (come fa `update-cliente` sul sito svizzero).
export function pulisciDati(d: DatiCliente, paese: string): DatiCliente {
  const x: DatiCliente = {};
  for (const [k, v] of Object.entries(d)) {
    const valore = typeof v === 'string' ? v.trim() || undefined : v;
    if (valore !== undefined) (x as Record<string, unknown>)[k] = valore;
  }
  if (x.rappresentante) {
    const r = Object.fromEntries(
      Object.entries(x.rappresentante)
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
        .filter(([, v]) => v),
    );
    x.rappresentante = Object.keys(r).length ? r : undefined;
  }
  if (x.giuridica) {
    delete x.nomeProprio;
    delete x.cognome;
    delete x.dataNascita;
    delete x.luogoNascita;
    delete x.avs;
    if (paese === 'CH') delete x.cf;
  } else {
    delete x.ragioneSociale;
    if (paese === 'CH') delete x.piva;
    delete x.uid;
    delete x.formaGiuridica;
    delete x.ivaAttiva;
    delete x.sedeLegale;
    delete x.rappresentante;
  }
  if (x.cf) x.cf = x.cf.toUpperCase();
  if (x.uid) x.uid = normalizzaUid(x.uid) ?? x.uid.toUpperCase();
  if (x.codiceDestinatario) x.codiceDestinatario = x.codiceDestinatario.toUpperCase();
  if (x.provincia) x.provincia = x.provincia.toUpperCase();
  if (x.cantone) x.cantone = x.cantone.toUpperCase();
  x.paese = (x.paese ?? paese).toUpperCase();
  return x;
}

export type CampoCliente =
  | 'nomeProprio'
  | 'cognome'
  | 'ragioneSociale'
  | 'email'
  | 'cf'
  | 'piva'
  | 'avs'
  | 'uid'
  | 'cap'
  | 'provincia'
  | 'paese'
  | 'codiceDestinatario'
  | 'pecFatturazione'
  | 'dataNascita'
  | 'rappresentanteCodice'
  | 'password';

// Errori del modulo, come chiavi dei testi. Obbligatori: nome e cognome (o ragione sociale) ed email,
// come sul sito; alla creazione con il portale, la password iniziale di almeno 8 caratteri.
// Sul sito in modifica nessun campo è obbligatorio: qui restano obbligatori, per non lasciare un cliente senza nome.
export function erroriCliente(
  d: DatiCliente,
  paese: string,
  portale?: { attivo: boolean; password: string },
): Partial<Record<CampoCliente, Chiave>> {
  const e: Partial<Record<CampoCliente, Chiave>> = {};
  if (d.giuridica) {
    if (!pieno(d.ragioneSociale)) e.ragioneSociale = 'clienti.errori.ragioneSociale';
  } else {
    if (!pieno(d.nomeProprio)) e.nomeProprio = 'clienti.errori.nome';
    if (!pieno(d.cognome)) e.cognome = 'clienti.errori.cognome';
  }
  if (!pieno(d.email)) e.email = 'clienti.errori.email';
  else if (!emailValida(d.email!)) e.email = 'clienti.errori.emailNonValida';
  if (paese === 'IT') {
    if (pieno(d.cf) && !cfValido(d.cf!.toUpperCase())) e.cf = 'clienti.errori.cf';
    if (pieno(d.piva) && !pivaValida(d.piva!)) e.piva = 'clienti.errori.piva';
    if (pieno(d.codiceDestinatario) && !sdiValido(d.codiceDestinatario!))
      e.codiceDestinatario = 'clienti.errori.sdi';
    if (pieno(d.pecFatturazione) && !emailValida(d.pecFatturazione!))
      e.pecFatturazione = 'clienti.errori.pecFatturazione';
    if (pieno(d.provincia) && !/^[A-Za-z]{2}$/.test(d.provincia!.trim()))
      e.provincia = 'clienti.errori.provincia';
    if (pieno(d.rappresentante?.codice) && !cfValido(d.rappresentante!.codice!.toUpperCase()))
      e.rappresentanteCodice = 'clienti.errori.cf';
  } else {
    if (!d.giuridica && pieno(d.avs) && !avsValido(d.avs!)) e.avs = 'clienti.errori.avs';
    if (d.giuridica && pieno(d.uid) && !uidValido(d.uid!)) e.uid = 'clienti.errori.uid';
    if (pieno(d.rappresentante?.codice) && !avsValido(d.rappresentante!.codice!))
      e.rappresentanteCodice = 'clienti.errori.avs';
  }
  // Il CAP si controlla solo per un indirizzo nel paese dello studio (CH e LI hanno 4 cifre).
  const paeseCliente = (d.paese ?? paese).trim().toUpperCase();
  if (pieno(d.paese) && !/^[A-Z]{2}$/.test(paeseCliente)) e.paese = 'clienti.errori.paese';
  const capNazionale = paese === 'CH' ? ['CH', 'LI'].includes(paeseCliente) : paeseCliente === 'IT';
  if (pieno(d.cap) && capNazionale && !capValido(d.cap!, paese))
    e.cap = paese === 'CH' ? 'clienti.errori.cap.CH' : 'clienti.errori.cap.IT';
  if (portale?.attivo && portale.password.length < 8)
    e.password = portale.password ? 'clienti.errori.passwordCorta' : 'clienti.errori.password';
  return e;
}

// Spazio clienti del piano, con le soglie del sito: 70% avviso, 90% critico, 100% pieno.
export type StatoLimite = 'ok' | 'avviso' | 'critico' | 'pieno';
export function statoLimite(conteggio: number, limite?: number): StatoLimite {
  if (!limite) return 'ok';
  const p = conteggio / limite;
  if (p >= 1) return 'pieno';
  if (p >= 0.9) return 'critico';
  if (p >= 0.7) return 'avviso';
  return 'ok';
}

// «Genera casuale»: 12 caratteri, senza quelli che si confondono (0/O, 1/l/I).
export function generaPassword(lunghezza = 12): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
  let p = '';
  for (let i = 0; i < lunghezza; i++) p += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return p;
}

// Data di nascita: si scrive gg.mm.aaaa, si salva AAAA-MM-GG.
export function dataPerCampo(iso?: string): string {
  if (!iso) return '';
  const [a, m, g] = iso.split('-');
  return a && m && g ? `${g}.${m}.${a}` : iso;
}
export function dataDaCampo(testo: string): string | undefined | null {
  if (!testo.trim()) return undefined;
  const m = testo.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d > new Date()) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Documenti dell'archivio di un cliente o di una pratica, i più recenti prima.
export function documentiDi(
  documenti: DocumentoStudio[],
  filtro: { clienteId?: string; praticaId?: string },
): DocumentoStudio[] {
  return documenti
    .filter(
      (d) =>
        (!filtro.clienteId || d.clienteId === filtro.clienteId) &&
        (!filtro.praticaId || d.praticaId === filtro.praticaId),
    )
    .sort((a, b) => b.quando.localeCompare(a.quando));
}

// Iniziali per il riquadro del cliente: «MF» per Marco Ferrari, «ED» per Edilnord S.r.l.
export function iniziali(nome: string): string {
  const parole = nome
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return ((parole[0]?.[0] ?? '') + (parole[1]?.[0] ?? '')).toUpperCase() || '·';
}
