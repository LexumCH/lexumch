// Numeri delle fonti: PROVVISORI (vedi docs/PIANO.md, «Numeri delle fonti»).
// Stanno tutti qui, così alla fine si aggiornano in un punto solo.
// Le schermate li leggono da qui e li formattano con le funzioni in fondo.

// Nell'app si mostra solo il totale di ogni paese («oltre 4,2 milioni»), mai i numeri delle singole
// fonti (deciso da Antonino il 04-10-2026).
export const numeri = {
  IT: { totale: 4_200_000 },
  CH: { totale: 1_800_000 },
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
