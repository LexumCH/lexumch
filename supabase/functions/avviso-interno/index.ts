// supabase/functions/avviso-interno/index.ts
//
// 01-11-2026: avvisi interni di Lexum, per ora quelli del controllo dei giri settimanali (controllo_giri.py sul Mac).
// Prima partivano dall'account Gmail degli script; l'utente: «deve arrivare da lexum.ch».
//
// Manda una mail di solo testo da info@lexum.ch con il server Postmark «Lexum CH» e la registra in mail_log.
// Ammessi solo i chiamanti con una chiave segreta del progetto (gli script del Mac, le funzioni interne): senza
// chiave risponde 401 e il mittente e' fisso, quindi non e' un relay (vedi send-mail, 04-09-2026).
// verify_jwt resta false come in send-mail: le chiavi nuove (sb_secret_...) non sono JWT e il gateway le rifiuterebbe.
//
// Versione: 1.0.0

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const POSTMARK_API_KEY = Deno.env.get("POSTMARK_API_KEY")!;
const MITTENTE = "Lexum <info@lexum.ch>";
const DESTINATARIO = "ninoc2012@gmail.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ugualiCostante(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Le chiavi segrete del progetto: le nuove (SUPABASE_SECRET_KEYS, un dizionario JSON) e la vecchia service_role.
function chiaviSegrete(): string[] {
  const out: string[] = [];
  try {
    const tutte = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    for (const v of Object.values(tutte)) if (typeof v === "string" && v) out.push(v);
  } catch {
    // formato inatteso: resta la chiave vecchia
  }
  const vecchia = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (vecchia) out.push(vecchia);
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Metodo non ammesso" }, 405);

  const chiave = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!chiave || !chiaviSegrete().some((k) => ugualiCostante(chiave, k))) {
    return jsonResponse({ ok: false, error: "Non autorizzato" }, 401);
  }

  try {
    const body = await req.json();
    const oggetto = String(body.oggetto ?? "").trim().slice(0, 200);
    const testo = String(body.testo ?? "").trim().slice(0, 50_000);
    const a = String(body.a ?? DESTINATARIO).toLowerCase().trim();
    const origine = String(body.origine ?? "avviso-interno").slice(0, 60);
    if (!oggetto || !testo) return jsonResponse({ ok: false, error: "Servono 'oggetto' e 'testo'" }, 400);

    const { data: log, error: logErr } = await supabase
      .from("mail_log")
      .insert({ to_email: a, from_email: MITTENTE, subject: oggetto, tipo: "avviso-interno", origine, stato: "queued" })
      .select("id")
      .single();
    if (logErr) console.error("Errore creazione log:", logErr.message);

    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_API_KEY,
      },
      body: JSON.stringify({
        From: MITTENTE, To: a, Subject: oggetto, TextBody: testo,
        MessageStream: "outbound", Tag: "avviso-interno",
      }),
    });
    const data = await res.json();
    if (!res.ok || data.ErrorCode !== 0) {
      const errore = `Postmark ${res.status}: ${data.Message ?? JSON.stringify(data).slice(0, 200)}`;
      if (log?.id) await supabase.from("mail_log").update({ stato: "failed", error_message: errore.slice(0, 500) }).eq("id", log.id);
      return jsonResponse({ ok: false, error: errore }, 502);
    }
    if (log?.id) {
      await supabase.from("mail_log")
        .update({ postmark_message_id: data.MessageID, stato: "sent", sent_at: new Date().toISOString() })
        .eq("id", log.id);
    }
    return jsonResponse({ ok: true, messageId: data.MessageID });
  } catch (err) {
    console.error("avviso-interno:", (err as Error).message);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
