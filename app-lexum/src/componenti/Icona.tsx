import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colori } from '@/tema';

// Icone a tratto dei mockup (viewBox 24, tratto 1,6, estremi arrotondati).
type Disegno = {
  p?: string[];
  c?: [number, number, number][];
  r?: [number, number, number, number][];
  pieni?: [number, number, number][];
};

const disegni = {
  menu: { p: ['M4 8h16M4 16h11'] },
  indietro: { p: ['M15 18l-6-6 6-6'] },
  avanti: { p: ['M9 18l6-6-6-6'] },
  giu: { p: ['M6 9l6 6 6-6'] },
  su: { p: ['M18 15l-6-6-6 6'] },
  chiudi: { p: ['M18 6L6 18M6 6l12 12'] },
  stella: { p: ['M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z'] },
  freccia: { p: ['M7 17L17 7M9 7h8v8'] },
  piu: { p: ['M12 5v14M5 12h14'] },
  invia: { p: ['M12 19V6M6 12l6-6 6 6'] },
  fotocamera: { p: ['M4 8h3l2-3h6l2 3h3v11H4z'], c: [[12, 13, 3.5]] },
  cartella: { p: ['M3 5h6l2 2h10v12H3z'] },
  cerca: { p: ['M20 20l-4-4'], c: [[11, 11, 7]] },
  documento: { p: ['M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6'] },
  elenco: { p: ['M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'] },
  libro: { p: ['M4 4.5A1.5 1.5 0 015.5 3H20v15H5.5A1.5 1.5 0 004 19.5zM4 19.5A1.5 1.5 0 005.5 21H20v-3'] },
  tribunale: { p: ['M3 21h18M5 18v-8M9.5 18v-8M14.5 18v-8M19 18v-8M12 3l9 5H3z'] },
  ricevuta: { p: ['M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21zM9 8h6M9 12h6M9 16h4'] },
  globo: {
    p: ['M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z'],
    c: [[12, 12, 9]],
  },
  orologio: { p: ['M12 7v5l3 2'], c: [[12, 12, 9]] },
  calendario: { p: ['M3 10h18M8 3v4M16 3v4'], r: [[3, 5, 18, 16]] },
  cruscotto: {
    r: [
      [3, 3, 7, 9],
      [14, 3, 7, 5],
      [14, 12, 7, 9],
      [3, 16, 7, 5],
    ],
  },
  altro: {
    pieni: [
      [5, 12, 1.6],
      [12, 12, 1.6],
      [19, 12, 1.6],
    ],
  },
  mappa: { p: ['M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15'] },
  bilancia: { p: ['M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z'] },
  email: { p: ['M3 7l9 6 9-6'], r: [[3, 5, 18, 14]] },
  condividi: { p: ['M12 3v12M8 7l4-4 4 4M5 12v9h14v-9'] },
  etichetta: { p: ['M3 3h8l10 10-8 8L3 11z'], pieni: [[7.5, 7.5, 1.2]] },
  fumetto: { p: ['M4 4h16v12H8l-4 4z'] },
  copia: { p: ['M5 15V4h11'], r: [[9, 9, 11, 11]] },
  scarica: { p: ['M12 4v11M7 10l5 5 5-5M5 20h14'] },
  segnalibro: { p: ['M18 21l-6-4-6 4V4a1 1 0 011-1h10a1 1 0 011 1z'] },
  fulmine: { p: ['M13 2L4 14h7l-1 8 9-12h-7z'] },
  esterno: { p: ['M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'] },
  spunta: { p: ['M5 12.5l4.5 4.5L19 7.5'] },
  cestino: { p: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6.5 7l1 12.5h9l1-12.5', 'M10 11v5', 'M14 11v5'] },
  modifica: { p: ['M12 4H4v16h16v-8M17.5 3.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z'] },
  archivio: { p: ['M3 4h18v4H3zM5 8v12h14V8M10 12h4'] },
  domanda: { p: ['M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01'], c: [[12, 12, 9]] },
  persona: { p: ['M4 21a8 8 0 0116 0'], c: [[12, 8, 4]] },
  persone: {
    p: ['M2 21a7 7 0 0114 0', 'M16 4.2a3.6 3.6 0 010 7', 'M18 14.5a7 7 0 014 6.5'],
    c: [[9, 8, 3.6]],
  },
  calcolatrice: {
    p: ['M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01'],
    r: [[5, 3, 14, 18]],
  },
  squadra: { p: ['M4 4v16h16zM8 12v4h4z'] },
  campanella: { p: ['M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4'] },
  occhio: { p: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'], c: [[12, 12, 3]] },
  confronta: { p: ['M12 4v16'], r: [[3, 4, 18, 16]] },
  filtri: {
    p: ['M4 7h10M18 7h2M4 17h4M12 17h8'],
    c: [
      [16, 7, 2],
      [10, 17, 2],
    ],
  },
  carica: { p: ['M12 20V9M7 14l5-5 5 5M5 4h14'] },
  esci: { p: ['M10 20H4V4h6M15 16l4-4-4-4M19 12H9'] },
  // icone aggiunte nell'app (non nei mockup), nello stesso stile a tratto
  avviso: { p: ['M12 3l10 18H2zM12 10v5M12 18h.01'] },
  riprova: { p: ['M20 11a8 8 0 10-2.3 5.7M20 4v7h-7'] },
  offline: { p: ['M2 8.5a15 15 0 0120 0M5.5 12a10 10 0 0113 0M9 15.5a5 5 0 016 0M12 19h.01M3 3l18 18'] },
  lucchetto: { p: ['M8 11V7a4 4 0 018 0v4'], r: [[5, 11, 14, 10]] },
} satisfies Record<string, Disegno>;

export type NomeIcona = keyof typeof disegni;

type Props = {
  nome: NomeIcona;
  dimensione?: number;
  colore?: string;
  spessore?: number;
};

export function Icona({ nome, dimensione = 20, colore = colori.fg2, spessore = 1.6 }: Props) {
  const d: Disegno = disegni[nome];
  return (
    <Svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colore}
      strokeWidth={spessore}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.p?.map((dd) => (
        <Path key={dd} d={dd} />
      ))}
      {d.c?.map(([cx, cy, r]) => (
        <Circle key={`c${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
      {d.r?.map(([x, y, w, h]) => (
        <Rect key={`r${x}-${y}`} x={x} y={y} width={w} height={h} />
      ))}
      {d.pieni?.map(([cx, cy, r]) => (
        <Circle key={`p${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={colore} stroke="none" />
      ))}
    </Svg>
  );
}
