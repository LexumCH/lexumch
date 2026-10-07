// 07-10-2026 (controllo di sicurezza): le azioni admin vogliono la verifica in due passaggi completata (aal2).
// supabase/functions/approve-verifica/index.ts
//
// 02-10-2026: l'email di approvazione passa da send-mail (Mail Log, mittente del
// progetto) ed è nella lingua dell'utente (profiles.lingua). Prima andava a
// Postmark con l'alias «verifica-approvata», che sul server Lexum CH non
// esisteva: l'email non partiva.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// La professione richiesta, come la scrive il sito in ogni lingua
const DIREZIONI: Record<string, Record<string, string>> = {
  it: { avvocato: "avvocato", fiduciario: "fiduciario", progettista: "progettista" },
  de: { avvocato: "Anwalt", fiduciario: "Treuhänder", progettista: "Planer" },
  fr: { avvocato: "avocat", fiduciario: "fiduciaire", progettista: "concepteur" },
};

// Il livello della sessione dal token (già verificato da getUser): «aal1» o «aal2».
function livelloDelToken(token: string): string {
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(parte.padEnd(Math.ceil(parte.length / 4) * 4, "=")));
    return typeof payload.aal === "string" ? payload.aal : "aal1";
  } catch {
    return "aal1";
  }
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Token non valido");

    const { data: admin } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (admin?.role !== "admin") throw new Error("Accesso negato");
    if (livelloDelToken(authHeader.replace("Bearer ", "")) !== "aal2") {
      return new Response(
        JSON.stringify({ ok: false, error: "Serve la verifica in due passaggi" }),
        { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id obbligatorio");

    // ─── Approvazione = solo verification_status.
    // Il RUOLO NON viene assegnato qui: lo assegna l'acquisto del prodotto.
    // L'utente resta 'user' con la sua tipo_richiesta come direzione.
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "approved" })
      .eq("id", user_id);

    if (error) throw new Error(error.message);

    // Email approvazione (parametrizzata per direzione e lingua)
    const { data: profilo } = await supabase
      .from("profiles")
      .select("email, nome, tipo_richiesta, lingua")
      .eq("id", user_id)
      .single();

    if (profilo?.email) {
      const lingua = profilo.lingua === "de" || profilo.lingua === "fr" ? profilo.lingua : "it";
      const direzione =
        profilo.tipo_richiesta === "fiduciario" ? "fiduciario"
        : profilo.tipo_richiesta === "progettista" ? "progettista"
        : "avvocato";

      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-mail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to:            profilo.email,
            templateAlias: `verifica-approvata-${lingua}`,
            templateModel: {
              nome:      profilo.nome,
              direzione: DIREZIONI[lingua][direzione],
            },
            tipo:     "verifica_approvata",
            origine:  "approve-verifica",
            toUserId: user_id,
          }),
        });
      } catch (e) {
        console.error("send-mail error:", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
