import { getLocales } from 'expo-localization';

import { de } from './de';
import { fr } from './fr';
import { it } from './it';
import type { Chiave, Lingua, Traduzione } from './tipi';

export type { Chiave, Lingua } from './tipi';

const lingue: Record<Lingua, Traduzione> = { it, de, fr };

function cerca(radice: unknown, chiave: string): string | undefined {
  let nodo: unknown = radice;
  for (const parte of chiave.split('.')) {
    if (nodo == null || typeof nodo !== 'object') return undefined;
    nodo = (nodo as Record<string, unknown>)[parte];
  }
  return typeof nodo === 'string' ? nodo : undefined;
}

// Il testo nella lingua chiesta, con i segnaposto riempiti; se manca, quello italiano.
export function traduci(lingua: Lingua, chiave: Chiave, valori?: Record<string, string | number>): string {
  const testo = cerca(lingue[lingua], chiave) ?? cerca(it, chiave) ?? chiave;
  if (!valori) return testo;
  return testo.replace(/\{(\w+)\}/g, (tutto, nome: string) =>
    nome in valori ? String(valori[nome]) : tutto,
  );
}

// In Italia l'app è sempre in italiano; in Svizzera nella lingua scelta.
export function linguaDelPaese(paese: string, linguaScelta: Lingua): Lingua {
  return paese === 'CH' ? linguaScelta : 'it';
}

// Lingua e regione del telefono, per il primo avvio (scelta del paese e lingua svizzera).
export function linguaTelefono(): Lingua {
  try {
    const codice = getLocales()[0]?.languageCode ?? 'it';
    return codice === 'de' || codice === 'fr' ? codice : 'it';
  } catch {
    return 'it';
  }
}

export function regioneTelefono(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}
