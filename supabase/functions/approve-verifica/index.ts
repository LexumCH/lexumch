// supabase/functions/approve-verifica/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    // Email approvazione (parametrizzata per direzione)
    const { data: profilo } = await supabase
      .from("profiles")
      .select("email, nome, tipo_richiesta")
      .eq("id", user_id)
      .single();

    if (profilo?.email) {
      const direzioneLabel =
        profilo.tipo_richiesta === "fiduciario" ? "fiduciario"
        : profilo.tipo_richiesta === "progettista" ? "progettista"
        : "avvocato";

      await fetch("https://api.postmarkapp.com/email/withTemplate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": Deno.env.get("POSTMARK_API_KEY")!,
        },
        body: JSON.stringify({
          From: "noreply@lexum.ch",
          To: profilo.email,
          TemplateAlias: "verifica-approvata",
          TemplateModel: {
            nome:       profilo.nome,
            direzione:  direzioneLabel,
            app_url:    Deno.env.get("APP_URL"),
          },
        }),
      });
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
