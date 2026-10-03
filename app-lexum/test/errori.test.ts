import { messaggiErrore, messaggioErrore } from '@/errori';

describe('messaggi d’errore white-label', () => {
  it('non mostra mai il nome di un fornitore AI', () => {
    const grezzi = [
      'Anthropic API error 529 overloaded',
      'OpenAI: rate limit 429',
      'mistral-large failed',
      'invalid x-api-key for claude-3',
    ];
    for (const g of grezzi) {
      const m = messaggioErrore(g);
      expect(m).not.toMatch(/anthropic|openai|mistral|claude|api-key/i);
    }
  });

  it('distingue troppe richieste, servizio giù e rete', () => {
    expect(messaggioErrore('openai 429')).toBe(messaggiErrore.it.rate);
    expect(messaggioErrore('anthropic 503')).toBe(messaggiErrore.it.down);
    expect(messaggioErrore('TypeError: Network request failed')).toBe(messaggiErrore.it.rete);
    expect(messaggioErrore('Edge Function returned a non-2xx status code')).toBe(messaggiErrore.it.tecnico);
  });

  it('lascia com’è un messaggio già scritto per l’utente', () => {
    expect(messaggioErrore('Email o password non corretti')).toBe('Email o password non corretti');
  });

  it('parla tedesco e francese quando serve', () => {
    expect(messaggioErrore('openai 429', 'de')).toBe(messaggiErrore.de.rate);
    expect(messaggioErrore('openai 429', 'fr')).toBe(messaggiErrore.fr.rate);
  });
});
