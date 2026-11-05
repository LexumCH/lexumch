// 07-10-2026 (controllo di sicurezza): le azioni admin vogliono la verifica in due passaggi completata (aal2).
// supabase/functions/reject-verifica/index.ts
//
// 02-10-2026: l'email del rifiuto (col motivo scritto dall'admin) passa da
// send-mail (Mail Log, mittente del progetto) ed è nella lingua dell'utente.
// Prima andava a Postmark da noreply@lexum.it con l'alias «verifica-rifiutata»,
// che sul server Lexum CH non esisteva: l'email non partiva.
// 05-11-2026: il rifiuto ferma anche la prova, se è in corso (ferma_prova_gratuita), e il motivo resta nel profilo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    const { user_id, motivazione } = await req.json();
    if (!user_id) throw new Error("user_id obbligatorio");
    if (!motivazione?.trim()) throw new Error("La motivazione è obbligatoria");

    // Stato e motivo nel profilo, dove l'utente li vede; se è in prova, la prova si ferma. Un piano pagato non si tocca.
    const { data: provaFermata, error } = await supabase.rpc("ferma_prova_gratuita", {
      p_user: user_id,
      p_motivo: motivazione.trim(),
    });

    if (error) throw new Error(error.message);

    const { data: profilo } = await supabase
      .from("profiles")
      .select("email, nome, lingua")
      .eq("id", user_id)
      .single();

    if (profilo?.email) {
      const lingua = profilo.lingua === "de" || profilo.lingua === "fr" ? profilo.lingua : "it";
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-mail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to:            profilo.email,
            templateAlias: `verifica-rifiutata-${lingua}`,
            templateModel: {
              nome:          profilo.nome,
              motivazione:   motivazione.trim(),
              prova_fermata: provaFermata === true,
            },
            tipo:     "verifica_rifiutata",
            origine:  "reject-verifica",
            toUserId: user_id,
          }),
        });
      } catch (e) {
        console.error("send-mail error:", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, prova_fermata: provaFermata === true }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
