// supabase/functions/avvocato-cliente-actions/index.ts
//
// Strumenti del professionista sui propri clienti:
//   action: "send-reset-email" → invia email reset password
//   action: "set-password"     → imposta password (manuale o casuale)
//   action: "elimina-cliente"  → HARD delete: cancella cliente + tutto cio che gli e collegato
//
// Ruoli abilitati: avvocato, fiduciario, progettista.
// Ownership check: il professionista puo agire solo su clienti del proprio studio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generaPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

async function getStudioIds(avvocato: { id: string; titolare_id: string | null }): Promise<string[]> {
  const titolareId = avvocato.titolare_id ?? avvocato.id;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`id.eq.${titolareId},titolare_id.eq.${titolareId}`);
  return (data ?? []).map((p: { id: string }) => p.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");

    const { data: { user: chiamante }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !chiamante) throw new Error("Token non valido");

    const { data: profiloChiamante } = await supabase
      .from("profiles")
      .select("id, role, nome, cognome, titolare_id")
      .eq("id", chiamante.id)
      .single();

    if (!profiloChiamante || !["avvocato", "fiduciario", "progettista"].includes(profiloChiamante.role)) {
      throw new Error("Accesso riservato ai professionisti");
    }

    const body = await req.json();
    const { action, cliente_id } = body;

    if (!action) throw new Error("Azione obbligatoria");
    if (!cliente_id) throw new Error("cliente_id obbligatorio");

    const { data: cliente } = await supabase
      .from("profiles")
      .select("id, role, email, nome, cognome, ragione_sociale, tipo_soggetto, avvocato_id")
      .eq("id", cliente_id)
      .single();

    if (!cliente) throw new Error("Cliente non trovato");
    if (cliente.role !== "cliente") throw new Error("L'utente non e un cliente");
    if (!cliente.email) throw new Error("Cliente senza email");

    const studioIds = await getStudioIds(profiloChiamante);

    if (!cliente.avvocato_id || !studioIds.includes(cliente.avvocato_id)) {
      throw new Error("Non puoi gestire questo cliente: non appartiene al tuo studio");
    }

    const nomeChiamante = `${profiloChiamante.nome ?? ""} ${profiloChiamante.cognome ?? ""}`.trim() || "Professionista";
    const nomeCliente = cliente.tipo_soggetto === "persona_giuridica"
      ? (cliente.ragione_sociale ?? "—")
      : `${cliente.nome ?? ""} ${cliente.cognome ?? ""}`.trim();

    // ─── send-reset-email ───
    if (action === "send-reset-email") {
      const redirectTo = `${Deno.env.get("APP_URL")}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cliente.email, { redirectTo });
      if (error) throw new Error(`Errore invio email: ${error.message}`);

      await supabase.from("audit_log").insert({
        studio_id: profiloChiamante.titolare_id ?? profiloChiamante.id,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Reset password cliente (email inviata)",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Email reset inviata a ${cliente.email} (cliente: ${nomeCliente})`,
      });

      return jsonResponse({ ok: true, messaggio: `Email di reset inviata a ${cliente.email}` });
    }

    // ─── set-password ───
    if (action === "set-password") {
      const { new_password } = body;
      let password = new_password?.trim() ?? "";
      let generata = false;

      if (!password) {
        password = generaPassword();
        generata = true;
      } else {
        if (password.length < 8) throw new Error("Password minimo 8 caratteri");
      }

      const { error } = await supabase.auth.admin.updateUserById(cliente_id, { password });
      if (error) throw new Error(`Errore aggiornamento password: ${error.message}`);

      await supabase.from("audit_log").insert({
        studio_id: profiloChiamante.titolare_id ?? profiloChiamante.id,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Password cliente reimpostata",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Cliente: ${nomeCliente} (${cliente.email}) — password ${generata ? "generata casualmente" : "impostata manualmente"}`,
      });

      return jsonResponse({
        ok: true,
        password,
        generata,
        messaggio: generata
          ? "Password generata. Comunicala in modo sicuro al cliente."
          : "Password aggiornata.",
      });
    }

    // ─── elimina-cliente (HARD DELETE) ───
    if (action === "elimina-cliente") {
      const conteggi = {
        messaggi_ticket: 0, ticket_assistenza: 0, documenti_pratiche: 0,
        fatture: 0, note_interne: 0, appuntamenti: 0, archivio_documenti: 0, pratiche: 0,
      };

      const { data: ticketsCliente } = await supabase
        .from("ticket_assistenza").select("id")
        .or(`mittente_id.eq.${cliente_id},destinatario_id.eq.${cliente_id}`);
      const ticketIds = (ticketsCliente ?? []).map((t: { id: string }) => t.id);

      if (ticketIds.length > 0) {
        const { count } = await supabase.from("messaggi_ticket")
          .delete({ count: "exact" }).in("ticket_id", ticketIds);
        conteggi.messaggi_ticket = count ?? 0;
      }

      const { count: c2 } = await supabase.from("ticket_assistenza")
        .delete({ count: "exact" })
        .or(`mittente_id.eq.${cliente_id},destinatario_id.eq.${cliente_id}`);
      conteggi.ticket_assistenza = c2 ?? 0;

      const { data: praticheCliente } = await supabase
        .from("pratiche").select("id").eq("cliente_id", cliente_id);
      const praticheIds = (praticheCliente ?? []).map((p: { id: string }) => p.id);

      if (praticheIds.length > 0) {
        const { count } = await supabase.from("documenti_pratiche")
          .delete({ count: "exact" }).in("pratica_id", praticheIds);
        conteggi.documenti_pratiche = count ?? 0;
      }

      const { count: c4 } = await supabase.from("fatture")
        .delete({ count: "exact" }).eq("cliente_id", cliente_id);
      conteggi.fatture = c4 ?? 0;

      const { count: c5 } = await supabase.from("note_interne")
        .delete({ count: "exact" }).eq("cliente_id", cliente_id);
      conteggi.note_interne = c5 ?? 0;

      const { count: c6 } = await supabase.from("appuntamenti")
        .delete({ count: "exact" }).eq("cliente_id", cliente_id);
      conteggi.appuntamenti = c6 ?? 0;

      const { count: c7 } = await supabase.from("archivio_documenti")
        .delete({ count: "exact" }).eq("cliente_id", cliente_id);
      conteggi.archivio_documenti = c7 ?? 0;

      const { count: c8 } = await supabase.from("pratiche")
        .delete({ count: "exact" }).eq("cliente_id", cliente_id);
      conteggi.pratiche = c8 ?? 0;

      await supabase.from("audit_log").insert({
        studio_id: profiloChiamante.titolare_id ?? profiloChiamante.id,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Cliente eliminato (HARD DELETE)",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Cliente eliminato: ${nomeCliente} (${cliente.email}). Conteggi: ${JSON.stringify(conteggi)}`,
      });

      const { error: errDelUser } = await supabase.auth.admin.deleteUser(cliente_id);
      if (errDelUser) {
        throw new Error(`Errore cancellazione utente: ${errDelUser.message}`);
      }

      return jsonResponse({
        ok: true,
        conteggi,
        messaggio: `Cliente ${nomeCliente} eliminato definitivamente.`,
      });
    }

    throw new Error("Azione non riconosciuta");

  } catch (err) {
    console.error("avvocato-cliente-actions error:", err.message);
    return jsonResponse({ ok: false, error: err.message }, 400);
  }
});
