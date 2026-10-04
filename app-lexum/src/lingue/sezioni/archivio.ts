import type { Parziale } from '../tipi';

// Sezione «archivio»: italiano di riferimento, poi tedesco svizzero («Sie», «ss») e francese («vous»).

const it = {};

const de: Parziale<typeof it> = {};

const fr: Parziale<typeof it> = {};

export const archivio = { it, de, fr };
