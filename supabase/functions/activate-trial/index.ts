// supabase/functions/activate-trial/index.ts  (Lexum CH)
//
// Il pulsante «Attiva la prova gratuita» per chi era già iscritto. Dal 03-11-2026 la logica sta nel database, in
// attiva_prova_gratuita, la stessa che parte da sola quando chi si registra come avvocato o progettista
// conferma l'email: controlli, ruolo, studio, crediti e transazione. Come su Lexum IT.
// Prima questa funzione non creava lo studio e voleva la verifica approvata.
//
// Qui resta anche la mail, nella lingua dell'utente: il database chiama con { avviso_prova: <id> } e il gettone
// 'avvisi_piano_token' del vault, perché su questo progetto il vault non ha la chiave di servizio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const LOCALI: Record<string, string> = { it: "it-CH", de: "de-CH", fr: "fr-CH" };

const risposta = (corpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function spedisciAvviso(userId: string): Promise<Response> {
  const { data: profilo } = await supabase
    .from("profiles")
    .select("email, nome, lingua, piano_id, abbonamento_tipo, abbonamento_scadenza, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profilo?.email || !profilo.piano_id) return risposta({ ok: false, error: "Profilo senza prova" }, 400);

  const { data: prodotto } = await supabase
    .from("prodotti")
    .select("durata_mesi, crediti_ai_mensili, spazio_gb, posti, limite_clienti, include_banca_dati")
    .eq("id", profilo.piano_id)
    .maybeSingle();

  const lingua = profilo.lingua === "de" || profilo.lingua === "fr" ? profilo.lingua : "it";
  const fine = new Date(profilo.abbonamento_scadenza);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-mail`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      to: profilo.email,
      templateAlias: `trial-attivata-${lingua}`,
      templateModel: {
        nome: profilo.nome,
        piano_nome: profilo.abbonamento_tipo,
        durata_giorni: Math.round(Number(prodotto?.durata_mesi ?? 0) * 30) || 3,
        scadenza: fine.toLocaleDateString(LOCALI[lingua], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }),
        crediti_ai: prodotto?.crediti_ai_mensili ?? 0,
        spazio_gb: prodotto?.spazio_gb ?? 0,
        posti: prodotto?.posti ?? 1,
        limite_clienti: prodotto?.limite_clienti ?? 0,
        include_banca_dati: prodotto?.include_banca_dati ?? false,
        app_url: "https://www.lexum.ch",
      },
      tipo: "trial_attivata",
      origine: "attiva_prova_gratuita",
      toUserId: userId,
    }),
  });
  const esito = await res.json().catch(() => null);
  if (!res.ok || esito?.ok !== true) console.error("send-mail:", res.status, JSON.stringify(esito));
  return risposta({ ok: res.ok && esito?.ok === true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const chiave = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!chiave) throw new Error("Non autorizzato");

    const corpo = await req.json().catch(() => ({}));

    // La mail, solo dal database
    if (corpo?.avviso_prova) {
      const { data: valida } = await supabase.rpc("avvisi_piano_token_valido", { p_token: chiave });
      if (valida !== true) return risposta({ ok: false, error: "Non autorizzato" }, 401);
      return await spedisciAvviso(String(corpo.avviso_prova));
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(chiave);
    if (authErr || !user) throw new Error("Token non valido");

    const { data: scadenza, error } = await supabase.rpc("attiva_prova_gratuita", {
      p_user: user.id,
      p_automatica: false,
    });
    if (error) {
      console.error("attiva_prova_gratuita:", error.code, error.message);
      // P0001 = i rifiuti scritti nella funzione. Il resto non si mostra all'utente.
      throw new Error(error.code === "P0001"
        ? error.message
        : "Non è stato possibile attivare la prova: riprova o scrivi all'assistenza.");
    }

    return risposta({ ok: true, scadenza });
  } catch (err) {
    console.error("activate-trial error:", (err as Error).message);
    return risposta({ ok: false, error: (err as Error).message }, 400);
  }
});
