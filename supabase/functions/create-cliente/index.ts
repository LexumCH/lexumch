// supabase/functions/create-cliente/index.ts — Lexum CH
//
// Crea un cliente come utente Auth + record profiles.
// Ruoli abilitati a creare clienti: avvocato, fiduciario, progettista.
//
// Se 'attiva_portale' = true: il professionista fornisce 'password_iniziale' e la
// impostiamo sull'utente Auth. La comunica al cliente fuori da Lexum.
// Se false: password random buttata, l'accesso portale puo' essere attivato dopo.
//
// VALIDAZIONE LIMITE CLIENTI: prima di creare, la RPC conteggio_clienti_studio()
// verifica il limite del piano. Se raggiunto, 403 con payload strutturato.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generaPasswordRandom(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function addIfPresent(obj: Record<string, unknown>, key: string, value: unknown) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;
  obj[key] = typeof value === "string" ? value.trim() : value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Token non valido");

    const { data: profilo, error: profiloErr } = await supabase
      .from("profiles")
      .select("role, studio_id, nome, cognome, titolare_id")
      .eq("id", user.id)
      .single();

    if (profiloErr || !profilo) throw new Error("Profilo non trovato");
    if (!["avvocato", "fiduciario", "progettista"].includes(profilo.role)) throw new Error("Accesso negato");

    // ─── VALIDAZIONE LIMITE CLIENTI ─────────────────────────────
    const proprietarioId = profilo.titolare_id ?? user.id;

    const { data: conteggio, error: conteggioErr } = await supabase
      .rpc("conteggio_clienti_studio", { p_proprietario_id: proprietarioId })
      .single();

    if (conteggioErr) {
      console.error("Errore RPC conteggio_clienti_studio:", conteggioErr);
      throw new Error("Errore verifica limite clienti");
    }

    const conteggioAttuale = (conteggio as any)?.conteggio ?? 0;
    const limiteTotale     = (conteggio as any)?.limite_totale ?? 0;

    if (limiteTotale > 0 && conteggioAttuale >= limiteTotale) {
      const errorePayload = {
        ok: false,
        error: `Hai raggiunto il limite di ${limiteTotale} clienti del tuo piano. Acquista un Clienti add-on per registrarne altri.`,
        code: "LIMITE_CLIENTI_RAGGIUNTO",
        meta: {
          conteggio:     conteggioAttuale,
          limite_piano:  (conteggio as any)?.limite_piano ?? 0,
          limite_extra:  (conteggio as any)?.limite_extra ?? 0,
          limite_totale: limiteTotale,
        },
      };
      return new Response(
        JSON.stringify(errorePayload),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const {
      tipo_soggetto,
      nome, cognome, data_nascita, luogo_nascita, numero_avs,
      ragione_sociale, uid, forma_giuridica, iva_attiva, sede_legale,
      rappr_nome, rappr_cognome, rappr_avs, rappr_carica,
      email, telefono,
      indirizzo, citta, cantone, cap,
      note,
      avvocato_id,
      attiva_portale,
      password_iniziale,
    } = body;

    const tipo = tipo_soggetto === "persona_giuridica" ? "persona_giuridica" : "persona_fisica";

    if (tipo === "persona_fisica") {
      if (!nome?.trim()) throw new Error("Nome obbligatorio");
      if (!cognome?.trim()) throw new Error("Cognome obbligatorio");
    } else {
      if (!ragione_sociale?.trim()) throw new Error("Ragione sociale obbligatoria");
    }

    if (!email?.trim()) throw new Error("Email obbligatoria");
    if (!/\S+@\S+\.\S+/.test(email)) throw new Error("Email non valida");

    const attivaPortale = attiva_portale === true;
    if (attivaPortale) {
      if (!password_iniziale || typeof password_iniziale !== "string") {
        throw new Error("Password obbligatoria per attivare il portale");
      }
      if (password_iniziale.length < 8) {
        throw new Error("La password deve essere di almeno 8 caratteri");
      }
    }

    const emailNorm = email.trim().toLowerCase();

    const { data: esistente } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", emailNorm)
      .maybeSingle();

    if (esistente) throw new Error("Esiste gia un utente con questa email");

    const avvId = avvocato_id ?? user.id;

    const password = attivaPortale ? password_iniziale : generaPasswordRandom();
    const nomeDisplay = tipo === "persona_fisica" ? nome.trim() : ragione_sociale.trim();

    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nomeDisplay,
        cognome: tipo === "persona_fisica" ? cognome.trim() : "",
        role: "cliente",
      },
    });

    if (createErr || !newUser.user) {
      throw new Error(createErr?.message ?? "Errore nella creazione utente");
    }

    const updatePayload: Record<string, unknown> = {
      role:          "cliente",
      tipo_soggetto: tipo,
      email:         emailNorm,
      avvocato_id:   avvId,
      studio_id:     profilo.studio_id ?? null,
      creato_da:     user.id,
      aggiornato_da: user.id,
    };

    if (attivaPortale) {
      updatePayload.credenziali_inviate_il = new Date().toISOString();
    }

    if (tipo === "persona_fisica") {
      updatePayload.nome    = nome.trim();
      updatePayload.cognome = cognome.trim();
    } else {
      updatePayload.ragione_sociale = ragione_sociale.trim();
      updatePayload.nome            = ragione_sociale.trim();
      updatePayload.cognome         = null;
    }

    addIfPresent(updatePayload, "telefono",      telefono);
    addIfPresent(updatePayload, "indirizzo",     indirizzo);
    addIfPresent(updatePayload, "citta",         citta);
    addIfPresent(updatePayload, "cantone",       cantone);
    addIfPresent(updatePayload, "cap",           cap);
    addIfPresent(updatePayload, "note_iniziali", note);

    if (tipo === "persona_fisica") {
      addIfPresent(updatePayload, "numero_avs",    numero_avs);
      addIfPresent(updatePayload, "data_nascita",  data_nascita);
      addIfPresent(updatePayload, "luogo_nascita", luogo_nascita);
    } else {
      addIfPresent(updatePayload, "uid",             uid);
      addIfPresent(updatePayload, "forma_giuridica", forma_giuridica);
      addIfPresent(updatePayload, "iva_attiva",      iva_attiva);
      addIfPresent(updatePayload, "sede_legale",     sede_legale);
      addIfPresent(updatePayload, "rappr_nome",      rappr_nome);
      addIfPresent(updatePayload, "rappr_cognome",   rappr_cognome);
      addIfPresent(updatePayload, "rappr_avs",       rappr_avs);
      addIfPresent(updatePayload, "rappr_carica",    rappr_carica);
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", newUser.user.id);

    if (profileErr) {
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(profileErr.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cliente_id: newUser.user.id,
        portale_attivato: attivaPortale,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
