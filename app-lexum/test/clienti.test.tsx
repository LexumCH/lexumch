import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { clientiPerTema } from '@/fogli/FogliClienti';
import { studioFinto } from '@/dati-finti/studio';
import {
  avsValido,
  dataDaCampo,
  emailValida,
  erroriCliente,
  generaPassword,
  iniziali,
  nomeDaDati,
  normalizzaUid,
  pulisciDati,
  sdiValido,
  statoLimite,
  uidValido,
} from '@/studio/clienti';
import { StatoProvider, useStato } from '@/stato/Stato';
import { StudioProvider, useStudio } from '@/stato/Studio';

describe('regole dei clienti', () => {
  it('controlla email, numero AVS (EAN-13), UID (modulo 11) e codice SDI', () => {
    expect(emailValida('marco.ferrari@example.com')).toBe(true);
    expect(emailValida('marco@')).toBe(false);
    expect(avsValido('756.1234.5678.97')).toBe(true);
    expect(avsValido('7561234567897')).toBe(true);
    expect(avsValido('756.1234.5678.98')).toBe(false);
    expect(avsValido('123.1234.5678.97')).toBe(false);
    // come normalizzaUid del sito svizzero: la cifra di controllo deve tornare
    expect(uidValido('CHE-123.456.788')).toBe(true);
    expect(uidValido('CHE-123.456.789')).toBe(false);
    expect(normalizzaUid('che123456788 mwst')).toBe('CHE-123.456.788');
    expect(sdiValido('M5UXCR1')).toBe(true);
    expect(sdiValido('UFABC1')).toBe(true); // 6 caratteri: Pubblica Amministrazione
    expect(sdiValido('M5UX')).toBe(false);
  });

  it('obbligatori: nome e cognome (o ragione sociale) ed email; password del portale di 8 caratteri', () => {
    expect(erroriCliente({}, 'IT')).toEqual({
      nomeProprio: 'clienti.errori.nome',
      cognome: 'clienti.errori.cognome',
      email: 'clienti.errori.email',
    });
    expect(erroriCliente({ giuridica: true, email: 'a@b.it' }, 'IT')).toEqual({
      ragioneSociale: 'clienti.errori.ragioneSociale',
    });
    const persona = { nomeProprio: 'Anna', cognome: 'Rossi', email: 'anna@example.com' };
    expect(erroriCliente(persona, 'IT', { attivo: true, password: 'corta' })).toEqual({
      password: 'clienti.errori.passwordCorta',
    });
    expect(erroriCliente(persona, 'IT', { attivo: true, password: '' })).toEqual({
      password: 'clienti.errori.password',
    });
    expect(erroriCliente(persona, 'IT', { attivo: false, password: '' })).toEqual({});
  });

  it('Italia e Svizzera controllano campi diversi', () => {
    const base = { nomeProprio: 'Anna', cognome: 'Rossi', email: 'anna@example.com' };
    expect(erroriCliente({ ...base, cf: 'XYZ', cap: '123', codiceDestinatario: 'AB' }, 'IT')).toEqual({
      cf: 'clienti.errori.cf',
      cap: 'clienti.errori.cap.IT',
      codiceDestinatario: 'clienti.errori.sdi',
    });
    expect(erroriCliente({ ...base, avs: '756.0000.0000.00', cap: '69000' }, 'CH')).toEqual({
      avs: 'clienti.errori.avs',
      cap: 'clienti.errori.cap.CH',
    });
    // un indirizzo all'estero non ha il CAP del paese dello studio
    expect(erroriCliente({ ...base, cap: '75008', paese: 'FR' }, 'CH')).toEqual({});
    expect(
      erroriCliente({ ...base, giuridica: true, ragioneSociale: 'Alfa SA', uid: 'CHE-1' }, 'CH'),
    ).toEqual({ uid: 'clienti.errori.uid' });
  });

  it('pulisce i dati: niente campi dell’altro tipo di soggetto, maiuscole dove servono', () => {
    const d = pulisciDati(
      {
        giuridica: true,
        ragioneSociale: '  Alfa SA ',
        nomeProprio: 'resto',
        uid: 'che123456788',
        cantone: 'ti',
        telefono: '  ',
      },
      'CH',
    );
    expect(d).toEqual({
      giuridica: true,
      ragioneSociale: 'Alfa SA',
      uid: 'CHE-123.456.788',
      cantone: 'TI',
      paese: 'CH',
    });
    expect(nomeDaDati({ nomeProprio: 'Marco', cognome: ' Ferrari' })).toBe('Marco Ferrari');
    expect(nomeDaDati({ giuridica: true, ragioneSociale: 'Edilnord S.r.l.' })).toBe('Edilnord S.r.l.');
    expect(iniziali('Edilnord S.r.l.')).toBe('ES');
  });

  it('limite dei clienti del piano, data di nascita, password generata', () => {
    expect(statoLimite(10, 25)).toBe('ok');
    expect(statoLimite(18, 25)).toBe('avviso');
    expect(statoLimite(23, 25)).toBe('critico');
    expect(statoLimite(25, 25)).toBe('pieno');
    expect(statoLimite(99)).toBe('ok');
    expect(dataDaCampo('12.03.1978')).toBe('1978-03-12');
    expect(dataDaCampo('31.02.1978')).toBeNull();
    expect(dataDaCampo('')).toBeUndefined();
    expect(generaPassword()).toHaveLength(12);
  });

  it('Chiedi a Lex sui clienti (risposta finta): fatture da incassare, portale', () => {
    const d = studioFinto('IT', 'avvocato');
    expect(clientiPerTema('fatture', d).map((c) => c.id)).toEqual(['c2', 'c3']);
    expect(clientiPerTema('portale', d).map((c) => c.id)).toEqual(['c2', 'c4']);
  });
});

describe('clienti e documenti nello stato dello Studio', () => {
  const avvolgi = ({ children }: { children: ReactNode }) => (
    <StatoProvider>
      <StudioProvider>{children}</StudioProvider>
    </StatoProvider>
  );
  const prepara = async () => {
    const r = await renderHook(() => ({ stato: useStato(), studio: useStudio() }), { wrapper: avvolgi });
    await act(async () => r.result.current.stato.azioni.scenario('avvocato-it'));
    return r.result;
  };

  it('crea un cliente, si ferma al limite del piano', async () => {
    const result = await prepara();
    let id = '';
    await act(async () => {
      id = result.current.studio.azioni.creaCliente(
        { nomeProprio: 'Anna', cognome: 'Rossi', email: 'anna@example.com' },
        true,
      );
    });
    const anna = result.current.studio.clienti.find((c) => c.id === id);
    expect(anna).toMatchObject({ nome: 'Anna Rossi', portale: true });
    await act(async () => {
      for (let i = result.current.studio.clienti.length; i < 25; i++)
        result.current.studio.azioni.creaCliente(
          { nomeProprio: 'N', cognome: `${i}`, email: 'n@x.it' },
          false,
        );
    });
    expect(result.current.studio.clienti).toHaveLength(25);
    let esito = '';
    await act(async () => {
      esito = result.current.studio.azioni.creaCliente(
        { nomeProprio: 'Ultimo', cognome: 'X', email: 'u@x.it' },
        false,
      );
    });
    expect(esito).toBe('limite');
  });

  it('una pratica porta con sé il suo cliente; togliere il cliente toglie la pratica', async () => {
    const result = await prepara();
    // il modello di procura (d7) non è di nessuno
    await act(async () => result.current.studio.azioni.collegaDocumento('d7', { praticaId: 'p3' }));
    const d7 = () => result.current.studio.documenti.find((d) => d.id === 'd7');
    expect(d7()).toMatchObject({ praticaId: 'p3', clienteId: 'c3' });
    // un altro cliente: la pratica di Edilnord non vale più
    await act(async () => result.current.studio.azioni.collegaDocumento('d7', { clienteId: 'c1' }));
    expect(d7()).toMatchObject({ clienteId: 'c1', praticaId: undefined });
    await act(async () => result.current.studio.azioni.collegaDocumento('d7', { clienteId: null }));
    expect(d7()?.clienteId).toBeUndefined();
  });

  it('carica un documento dalla pratica: entra nell’archivio con pratica e cliente', async () => {
    const result = await prepara();
    let id = '';
    await act(async () => {
      id = result.current.studio.azioni.caricaDocumento({
        titolo: 'Memoria',
        dimensione: '100 KB',
        formato: 'PDF',
        praticaId: 'p1',
      });
    });
    expect(result.current.studio.documenti.find((d) => d.id === id)).toMatchObject({
      praticaId: 'p1',
      clienteId: 'c1',
      stato: 'In coda',
    });
  });

  it('categorie: eliminare una categoria lascia i documenti senza categoria', async () => {
    const result = await prepara();
    await act(async () => result.current.studio.azioni.eliminaSottocategoria('k1', 's1'));
    expect(result.current.studio.documenti.find((d) => d.id === 'd1')).toMatchObject({
      categoriaId: 'k1',
      sottocategoriaId: undefined,
    });
    await act(async () => result.current.studio.azioni.eliminaCategoria('k1'));
    expect(result.current.studio.categorie.some((c) => c.id === 'k1')).toBe(false);
    expect(result.current.studio.documenti.find((d) => d.id === 'd1')?.categoriaId).toBeUndefined();
  });

  it('il PDF di una fattura non si elimina; generare il PDF lo archivia una volta', async () => {
    const result = await prepara();
    let esito = '';
    await act(async () => {
      esito = result.current.studio.azioni.eliminaDocumento('d6');
    });
    expect(esito).toBe('fattura');
    const prima = result.current.studio.documenti.length;
    await act(async () => result.current.studio.azioni.generaPdf('f3'));
    await act(async () => result.current.studio.azioni.generaPdf('f3'));
    expect(result.current.studio.documenti).toHaveLength(prima + 1);
    expect(result.current.studio.documenti.find((d) => d.fatturaId === 'f3')).toMatchObject({
      origine: 'fattura',
      categoriaId: 'k3',
      clienteId: 'c2',
    });
  });

  it('elimina un cliente con tutto quello che è suo', async () => {
    const result = await prepara();
    await act(async () => result.current.studio.azioni.eliminaCliente('c1'));
    const s = result.current.studio;
    expect(s.clienti.some((c) => c.id === 'c1')).toBe(false);
    expect(s.pratiche.some((p) => p.clienteId === 'c1')).toBe(false);
    expect(s.fatture.some((f) => f.clienteId === 'c1')).toBe(false);
    expect(s.appuntamenti.some((a) => a.clienteId === 'c1')).toBe(false);
    expect(s.note.some((n) => n.clienteId === 'c1')).toBe(false);
    expect(s.comunicazioni.some((x) => x.clienteId === 'c1')).toBe(false);
    expect(s.portale.some((x) => x.clienteId === 'c1')).toBe(false);
    expect(s.documenti.some((x) => x.clienteId === 'c1')).toBe(false);
    // gli altri restano
    expect(s.clienti).toHaveLength(3);
  });

  it('note, messaggi e portale del cliente', async () => {
    const result = await prepara();
    await act(async () => result.current.studio.azioni.aggiungiNota('c2', '  Richiamare lunedì  '));
    expect(result.current.studio.note[0]).toMatchObject({ clienteId: 'c2', testo: 'Richiamare lunedì' });
    let ticket = '';
    await act(async () => {
      ticket = result.current.studio.azioni.apriTicket('c2', 'Documenti', 'Mi manda la lettera?');
    });
    await act(async () => result.current.studio.azioni.scriviNelTicket(ticket, 'Grazie'));
    await act(async () => result.current.studio.azioni.statoTicket(ticket, 'chiuso'));
    expect(result.current.studio.comunicazioni.find((x) => x.id === ticket)).toMatchObject({
      stato: 'chiuso',
      messaggi: [{ testo: 'Mi manda la lettera?' }, { testo: 'Grazie' }],
    });
    await act(async () =>
      result.current.studio.azioni.condividiNelPortale('c2', { nome: 'a.pdf', dimensione: '1 KB' }),
    );
    expect(result.current.studio.portale[0]).toMatchObject({ clienteId: 'c2', da: 'studio' });
  });

  it('atto di Lex: in Italia nell’archivio della pratica, in Svizzera solo nella pratica', async () => {
    const result = await prepara();
    let id = '';
    await act(async () => {
      id = result.current.studio.azioni.salvaAtto('p2', 'Ricorso – Bianchi');
    });
    expect(result.current.studio.documenti.find((d) => d.id === id)).toMatchObject({
      origine: 'atto',
      praticaId: 'p2',
      clienteId: 'c2',
    });
    expect(result.current.studio.documenti.find((d) => d.id === id)?.soloPratica).toBeUndefined();
    await act(async () => result.current.stato.azioni.scenario('avvocato-ch'));
    await act(async () => {
      id = result.current.studio.azioni.salvaAtto('p1', 'Contestazione – Keller');
    });
    expect(result.current.studio.documenti.find((d) => d.id === id)?.soloPratica).toBe(true);
  });
});
