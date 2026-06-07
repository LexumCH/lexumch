// src/lib/supabase.js
// Client Supabase per il frontend
// Le variabili d'ambiente vengono iniettate da Vite al build time

import { createClient } from '@supabase/supabase-js'

// L'URL di Supabase deve essere "nudo": https://<progetto>.supabase.co
// Normalizziamo per difenderci da env mal configurate (es. con /rest/v1 o slash
// finale): senza, l'auth finirebbe su /rest/v1/auth/v1/token → PGRST125.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')          // slash finali
  .replace(/\/rest\/v1$/i, '')  // eventuale /rest/v1 di troppo
  .replace(/\/+$/, '')
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Lexum] Variabili Supabase non configurate. ' +
    'Crea un file .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')

/* ─── Helper: chiama una Edge Function ─────────────────────────
   Uso:
     const res = await callEdgeFunction('contact-form', payload)
──────────────────────────────────────────────────────────────── */
export async function callEdgeFunction(functionName, payload) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
    throw new Error(err.error ?? 'Errore nella chiamata Edge Function')
  }

  return res.json()
}