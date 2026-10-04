import type { Parziale } from '../tipi';

// Sezione «profilo»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).

const it = {};

const de: Parziale<typeof it> = {};

const fr: Parziale<typeof it> = {};

export const profilo = { it, de, fr };
