import { attesaVuota, avanzaAttesa, creaLettoreSSE, fontiDaDescrizione, type EventoLex } from '@/backend/sse';

// Lo stream di lex-lead come lo manda il server (sequenza reale, Italia).
const stream = [
  'event: fase\ndata: {"fase":"analisi","descrizione":"Analizzo la domanda"}\n\n',
  ': attesa\n',
  'event: fase\ndata: {"fase":"ricerca","descrizione":"Consulto le fonti: norme_core, giurisprudenza, prassi"}\n\n',
  'event: fase\ndata: {"fase":"sintesi","descrizione":"Composizione della risposta"}\n\n',
  'event: chunk\ndata: {"text":"Secondo l\'art. 52 c.p. "}\n\n',
  'event: chunk\ndata: {"text":"la difesa è legittima."}\n\n',
  'event: done\ndata: {"crediti_rimasti":41,"tipo_risposta":"sintesi","meta":{"tempo_totale_ms":53210},"stop_reason":"end_turn"}\n\n',
].join('');

describe('stream di lex-lead', () => {
  it('legge fasi, pezzi di testo e fine, anche se arrivano spezzati a caso', () => {
    const lettore = creaLettoreSSE();
    const eventi: EventoLex[] = [];
    // pezzi da 7 caratteri: righe e eventi si spezzano in mezzo
    for (let i = 0; i < stream.length; i += 7) eventi.push(...lettore.leggi(stream.slice(i, i + 7)));
    eventi.push(...lettore.fine());
    expect(eventi.map((e) => e.tipo)).toEqual(['fase', 'fase', 'fase', 'chunk', 'chunk', 'done']);
    expect(eventi[1]).toEqual({
      tipo: 'fase',
      fase: 'ricerca',
      descrizione: 'Consulto le fonti: norme_core, giurisprudenza, prassi',
    });
    expect(eventi[5]).toMatchObject({ tipo: 'done', creditiRimasti: 41, stopReason: 'end_turn' });
  });

  it('errori e righe con \\r\\n', () => {
    const lettore = creaLettoreSSE();
    expect(lettore.leggi('event: error\r\ndata: {"error":"Crediti esauriti"}\r\n\r\n')).toEqual([
      { tipo: 'error', errore: 'Crediti esauriti' },
    ]);
  });

  it('le fonti della fase «ricerca»; in Svizzera anche senza fonti', () => {
    expect(fontiDaDescrizione('Consulto le fonti: norme_federali, norme_cantonali, eu, documento')).toEqual([
      'norme_federali',
      'norme_cantonali',
      'eu',
      'documento',
    ]);
    expect(fontiDaDescrizione('Ragiono sul materiale fornito')).toEqual([]);
  });

  it('l’attesa: fasi fatte, fase in corso, fonti e testo che arriva', () => {
    const lettore = creaLettoreSSE();
    const a = lettore.leggi(stream).reduce(avanzaAttesa, attesaVuota);
    expect(a).toEqual({
      fase: 'sintesi',
      fatte: ['analisi', 'ricerca'],
      fonti: ['norme_core', 'giurisprudenza', 'prassi'],
      senzaFonti: false,
      testo: "Secondo l'art. 52 c.p. la difesa è legittima.",
    });
    const senza = avanzaAttesa(attesaVuota, {
      tipo: 'fase',
      fase: 'ricerca',
      descrizione: 'Ragiono sul materiale fornito',
    });
    expect(senza.senzaFonti).toBe(true);
  });
});
