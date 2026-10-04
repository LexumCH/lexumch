import type { Parziale } from '../tipi';

// Sezione «ricerche»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).

const it = {};

const de: Parziale<typeof it> = {};

const fr: Parziale<typeof it> = {};

export const ricerche = { it, de, fr };
