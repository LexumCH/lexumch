// supabase/functions/rigenera-sito/index.ts (lexum.ch)
//
// Fa ripartire il rilascio del sito quando l'admin pubblica un articolo delle
// Novità: solo con un nuovo rilascio l'articolo nasce con la sua testata per
// Google e per le anteprime dei link.
//
// L'indirizzo del "deploy hook" di Vercel sta in impostazioni_sito, che legge
// solo l'admin: non passa mai dal browser di chi non è admin.
// verify_jwt=false perché l'autenticazione la fa questa funzione: accetta solo
// il JWT di un utente con ruolo admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const servizio = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Un indirizzo qualsiasi non si chiama: solo i deploy hook di Vercel.
const HOOK_VALIDO = /^https:\/\/api\.vercel\.com\/v\d+\/integrations\/deploy\/[A-Za-z0-9_\-\/]+$/;

function risposta(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return risposta(401, { ok: false, error: "Non autorizzato" });

  const { data: sessione } = await servizio.auth.getUser(token);
  if (!sessione?.user) return risposta(401, { ok: false, error: "Sessione non valida" });

  const { data: profilo } = await servizio
    .from("profiles")
    .select("role")
    .eq("id", sessione.user.id)
    .maybeSingle();
  if (profilo?.role !== "admin") return risposta(403, { ok: false, error: "Riservato all'amministratore" });

  const { data: riga } = await servizio
    .from("impostazioni_sito")
    .select("valore")
    .eq("chiave", "vercel_deploy_hook")
    .maybeSingle();

  const hook = (riga?.valore ?? "").trim();
  if (!hook) {
    return risposta(200, {
      ok: false,
      error: "Manca l'indirizzo di rilascio del sito: incollalo in Novità → Rilascio del sito.",
    });
  }
  if (!HOOK_VALIDO.test(hook)) {
    return risposta(200, {
      ok: false,
      error: "L'indirizzo di rilascio non sembra un deploy hook di Vercel: ricontrollalo.",
    });
  }

  try {
    const r = await fetch(hook, { method: "POST" });
    await r.body?.cancel();
    console.log(JSON.stringify({ evento: "rigenera_sito", utente: sessione.user.id, stato: r.status }));
    if (!r.ok) {
      return risposta(200, { ok: false, error: `Il rilascio non è partito (errore ${r.status}).` });
    }
    return risposta(200, { ok: true });
  } catch (err) {
    console.log(JSON.stringify({ evento: "rigenera_sito_errore", errore: (err as Error)?.message }));
    return risposta(200, { ok: false, error: "Il rilascio non è partito: riprova tra poco." });
  }
});
