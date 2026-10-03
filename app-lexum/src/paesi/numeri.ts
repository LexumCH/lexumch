// Numeri delle fonti: PROVVISORI (vedi docs/PIANO.md, «Numeri delle fonti»).
// Stanno tutti qui, così alla fine si aggiornano in un punto solo.
// Le schermate li leggono da qui e li formattano con le funzioni in fondo.

export const numeri = {
  IT: {
    totale: 4_200_000,
    codici: 229,
    codiciArticoli: 34_000,
    leggiAtti: 66_400,
    leggiArticoli: 397_000,
    giurisprudenza: 3_200_000,
    tributario: 129_000,
    prassi: 177_000,
    europaDecisioni: 215_000,
    europaArticoli: 34_000,
  },
  CH: {
    totale: 1_800_000,
    federaleAtti: 4_600,
    federaleArticoli: 412_000,
    cantonaleAtti: 18_000,
    cantonaleArticoli: 418_000,
    giurisprudenza: 795_000,
    prassi: 19_000,
    europaDecisioni: 216_000,
    europaArticoli: 34_000,
  },
} as const;

// 66400 → «66.400»
export function migliaia(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// 4200000 → «4,2 milioni»; 795000 → «795.000»
export function milioni(n: number): string {
  if (n < 1_000_000) return migliaia(n);
  const m = Math.round(n / 100_000) / 10;
  return `${m.toString().replace('.', ',')} milioni`;
}

// 3200000 → «3,2 mln»; 177000 → «177 mila»
export function breve(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toString().replace('.', ',')} mln`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mila`;
  return String(n);
}
