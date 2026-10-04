import type { Parziale } from '../tipi';

// Sezione «chat»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).

const it = {};

const de: Parziale<typeof it> = {};

const fr: Parziale<typeof it> = {};

export const chat = { it, de, fr };
