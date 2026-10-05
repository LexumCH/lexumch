import { colori } from '@/tema';

// Nel browser, toccando un pulsante compare il contorno blu del fuoco (si vedeva sulle etichette).
// Lo togliamo per tocco e mouse e lo teniamo, in oro, per chi si muove con la tastiera.
if (typeof document !== 'undefined') {
  const radice = document.documentElement;
  const stile = document.createElement('style');
  stile.textContent = [
    'html[data-input="puntatore"] *:focus { outline: none !important; }',
    `html[data-input="tastiera"] *:focus-visible { outline: 2px solid ${colori.accent} !important; outline-offset: 2px; }`,
  ].join('\n');
  document.head.appendChild(stile);
  radice.dataset.input = 'puntatore';
  window.addEventListener('pointerdown', () => (radice.dataset.input = 'puntatore'), true);
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) radice.dataset.input = 'tastiera';
    },
    true,
  );
}

export {};
