// src/lib/supabase.js
// Client Supabase per il frontend
// Le variabili d'ambiente vengono iniettate da Vite al build time

import { createClient } from '@supabase/supabase-js'

// L'URL di Supabase deve essere "nudo": https://<progetto>.supabase.co
// Normalizziamo per difenderci da env mal configurate (es. con /rest/v1 o slash
// finale): senza, l'auth finirebbe su /rest/v1/auth/v1/token → PGRST125.
export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')          // slash finali
  .replace(/\/rest\/v1$/i, '')  // eventuale /rest/v1 di troppo
  .replace(/\/+$/, '')
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Lexum] Variabili Supabase non configurate. ' +
    'Crea un file .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')

/* ─── Helper: token di accesso con guardia sessione ────────────
   Evita il crash "Cannot read properties of null (reading 'access_token')"
   quando la sessione è scaduta/assente: lancia un errore leggibile invece
   di mandare "Bearer undefined" alle Edge Function. */
export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessione scaduta. Effettua di nuovo il login.')
  }
  return session.access_token
}

/* ─── Helper: chiama una Edge Function ─────────────────────────
   Uso:
     const res = await callEdgeFunction('contact-form', payload)
──────────────────────────────────────────────────────────────── */
export async function callEdgeFunction(functionName, payload) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,                      // il gateway Supabase richiede sempre l'apikey
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