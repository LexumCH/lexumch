// Tema «Notte»: gli stessi valori di docs/mockup/tela/lexum.css (.app.notte).
// È l'unico tema dell'app: niente tema chiaro.

export const colori = {
  // marchio
  petrolio: '#0B1F2A',
  oro: '#C9A45C',
  oroChiaro: '#E5C78C',
  salvia: '#7FA39A',
  nebbia: '#F4F7F8',

  // fondi
  bg: '#0B1F2A',
  bg2: '#0E2531',
  surface: '#16303E',
  surface2: '#243447',

  // testo
  fg: '#F4F7F8',
  fg2: '#B4C0C6',
  fg3: '#93A3AC',

  // linee
  line: 'rgba(244,247,248,0.09)',
  line2: 'rgba(244,247,248,0.17)',

  // accento oro
  accent: '#C9A45C',
  accentFg: '#0B1F2A',
  accentText: '#D8B56E',
  accentLine: 'rgba(201,164,92,0.42)',
  accentSoft: 'rgba(201,164,92,0.10)',

  // stati
  ok: '#8DB3A9',
  okLine: 'rgba(127,163,154,0.45)',
  okSoft: 'rgba(127,163,154,0.12)',
  warn: '#E3B66A',
  warnLine: 'rgba(227,182,106,0.42)',
  danger: '#E8968A',
  dangerLine: 'rgba(232,150,138,0.45)',

  // velo sotto fogli e menù
  scrim: 'rgba(3,10,14,0.66)',
} as const;

// Sfondo «hero» delle schermate di benvenuto: linear-gradient(160deg, …).
export const gradienteHero = {
  colori: ['#0B1F2A', '#1B3040', '#0B1F2A'] as const,
  posizioni: [0, 0.58, 1] as const,
};

// Pulsante oro: linear-gradient(135deg, #C9A45C 0%, #E5C78C 50%, #C9A45C 100%).
export const gradienteOro = {
  colori: ['#C9A45C', '#E5C78C', '#C9A45C'] as const,
  posizioni: [0, 0.5, 1] as const,
};

// Colori delle etichette: la stessa tavolozza del sito (PALETTE in src/pages/user/Ricerche.jsx),
// così un'etichetta creata dall'app ha lo stesso aspetto anche sul sito.
export const coloriEtichette = [
  '#7FA39A',
  '#C9A45C',
  '#6FA3D4',
  '#D47F7F',
  '#8B7BB8',
  '#D49B6F',
  '#8FB979',
  '#B57FD4',
] as const;
