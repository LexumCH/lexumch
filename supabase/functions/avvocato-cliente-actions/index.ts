// supabase/functions/avvocato-cliente-actions/index.ts — Lexum CH
//
// Strumenti del professionista sui clienti del suo studio:
//
//   action: "send-reset-email" → email per scegliere la password; registra l'accesso al portale
//   action: "set-password"     → imposta la password (scelta o generata); registra l'accesso al portale
//   action: "elimina-cliente"  → elimina il cliente e quello che lo riguarda
//
// Ownership check: il professionista agisce solo sui clienti del suo studio (titolare + collaboratori).
//
// Versione 2 (06-10-2026):
//   - L'accesso al portale si registra (profiles.credenziali_inviate_il) anche con «set-password» e
//     «send-reset-email»: prima lo scrivevano solo create-cliente e cliente-reset-password, e le app
//     non potevano sapere chi aveva il portale.
//   - «elimina-cliente» prima controlla, poi cancella, e si ferma al primo errore (prima andava avanti
//     e l'eliminazione poteva fermarsi a metà, con pratiche e fatture già cancellate):
//       • con fatture emesse (PDF generato, pagate o con pagamenti, note di credito) non elimina: si
//         conservano per legge. Risposta 409 { code: "FATTURE_EMESSE" };
//       • toglie anche i documenti del portale e quello che è collegato alle sue pratiche (archivio,
//         appuntamenti, documenti), che prima bloccavano l'eliminazione dell'account;
//       • alla fine toglie i file dallo spazio file (portale, archivio, documenti delle pratiche).
//   - L'email del cliente serve solo all'azione che la usa (prima un cliente senza email non si poteva
//     né gestire né eliminare).

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

const RUOLI_PROFESSIONISTI = ["avvocato", "fiduciario", "progettista"];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────
// Password sicura, no caratteri ambigui
// ─────────────────────────────────────────────
function generaPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const casuali = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(casuali, (n) => chars[n % chars.length]).join("");
}

// ─────────────────────────────────────────────
// Gli id di tutti i membri dello studio del professionista (titolare + collaboratori)
// ─────────────────────────────────────────────
async function getStudioIds(avvocato: { id: string; titolare_id: string | null }): Promise<string[]> {
  const titolareId = avvocato.titolare_id ?? avvocato.id;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`id.eq.${titolareId},titolare_id.eq.${titolareId}`);
  return (data ?? []).map((p: { id: string }) => p.id);
}

// L'accesso al portale: da quando le credenziali sono state date al cliente
async function registraAccesso(clienteId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ credenziali_inviate_il: new Date().toISOString() })
    .eq("id", clienteId);
  if (error) console.error("credenziali_inviate_il non registrato:", error.message);
}

// Un passo dell'eliminazione: se non riesce ci si ferma (niente eliminazioni a metà)
async function passo(
  nome: string,
  q: PromiseLike<{ error: { message: string } | null; count?: number | null }>,
): Promise<number> {
  const { error, count } = await q;
  if (error) throw new Error(`Eliminazione non completata (${nome}): ${error.message}`);
  return count ?? 0;
}

// Elenco per i filtri PostgREST: (a,b,c)
const lista = (ids: string[]) => `(${ids.join(",")})`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth check ───────────────────────────────
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

    if (!profiloChiamante || !RUOLI_PROFESSIONISTI.includes(profiloChiamante.role)) {
      throw new Error("Accesso riservato ai professionisti");
    }

    // ─── Parse body ───────────────────────────────
    const body = await req.json();
    const { action, cliente_id } = body;

    if (!action) throw new Error("Azione obbligatoria");
    if (!cliente_id) throw new Error("cliente_id obbligatorio");

    // ─── Carica profilo cliente ──────────────────────
    const { data: cliente } = await supabase
      .from("profiles")
      .select("id, role, email, nome, cognome, ragione_sociale, tipo_soggetto, avvocato_id")
      .eq("id", cliente_id)
      .single();

    if (!cliente) throw new Error("Cliente non trovato");
    if (cliente.role !== "cliente") throw new Error("L'utente non e un cliente");

    // ─── Ownership check ─────────────────────────
    const studioIds = await getStudioIds(profiloChiamante);

    if (!cliente.avvocato_id || !studioIds.includes(cliente.avvocato_id)) {
      throw new Error("Non puoi gestire questo cliente: non appartiene al tuo studio");
    }

    const nomeChiamante = `${profiloChiamante.nome ?? ""} ${profiloChiamante.cognome ?? ""}`.trim() || "Professionista";
    const nomeCliente = cliente.tipo_soggetto === "persona_giuridica"
      ? (cliente.ragione_sociale ?? "—")
      : `${cliente.nome ?? ""} ${cliente.cognome ?? ""}`.trim();
    const studioAudit = profiloChiamante.titolare_id ?? profiloChiamante.id;

    // ═══════════════════════════════════════════════════
    // ACTION: send-reset-email
    // ═══════════════════════════════════════════════════
    if (action === "send-reset-email") {
      if (!cliente.email) throw new Error("Cliente senza email");
      const redirectTo = `${Deno.env.get("APP_URL")}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        cliente.email,
        { redirectTo }
      );
      if (error) throw new Error(`Errore invio email: ${error.message}`);

      await registraAccesso(cliente_id);

      await supabase.from("audit_log").insert({
        studio_id: studioAudit,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Reset password cliente (email inviata)",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Email reset inviata a ${cliente.email} (cliente: ${nomeCliente})`,
      });

      return jsonResponse({
        ok: true,
        messaggio: `Email di reset inviata a ${cliente.email}`,
      });
    }

    // ═══════════════════════════════════════════════════
    // ACTION: set-password
    // ═══════════════════════════════════════════════════
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

      await registraAccesso(cliente_id);

      await supabase.from("audit_log").insert({
        studio_id: studioAudit,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Password cliente reimpostata",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Cliente: ${nomeCliente} (${cliente.email ?? "senza email"}) — password ${generata ? "generata casualmente" : "impostata manualmente"}`,
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

    // ═══════════════════════════════════════════════════
    // ACTION: elimina-cliente
    // Prima i controlli, poi le cancellazioni (ognuna controllata), poi l'account, poi i file
    // ═══════════════════════════════════════════════════
    if (action === "elimina-cliente") {
      // ── 1. Fatture emesse: si conservano per legge, il cliente non si elimina ──
      const { data: fattureCliente, error: errFatture } = await supabase
        .from("fatture")
        .select("*")
        .eq("cliente_id", cliente_id);
      if (errFatture) throw new Error(`Errore lettura fatture: ${errFatture.message}`);
      const fatture = (fattureCliente ?? []) as Record<string, unknown>[];
      const idsFatture = fatture.map((f) => String(f.id));
      let conPagamenti = new Set<string>();
      if (idsFatture.length > 0) {
        const { data: pagamenti, error: errPag } = await supabase
          .from("pagamenti_fattura")
          .select("fattura_id")
          .in("fattura_id", idsFatture);
        if (errPag) throw new Error(`Errore lettura pagamenti: ${errPag.message}`);
        conPagamenti = new Set((pagamenti ?? []).map((p: { fattura_id: string }) => p.fattura_id));
      }
      const emesse = fatture.filter((f) =>
        !!f.pdf_generato_at || !!f.pdf_storage_path || f.stato === "pagata" ||
        f.tipo_documento === "TD04" || conPagamenti.has(String(f.id))
      );
      if (emesse.length > 0) {
        return jsonResponse({
          ok: false,
          code: "FATTURE_EMESSE",
          fatture_emesse: emesse.length,
          error: "Il cliente ha fatture emesse: si conservano per legge, quindi il cliente non si elimina.",
        }, 409);
      }

      // ── 2. Cosa riguarda il cliente: pratiche, ticket, file ──
      const { data: praticheCliente, error: errPratiche } = await supabase
        .from("pratiche")
        .select("id")
        .eq("cliente_id", cliente_id);
      if (errPratiche) throw new Error(`Errore lettura pratiche: ${errPratiche.message}`);
      const praticheIds = (praticheCliente ?? []).map((p: { id: string }) => p.id);
      const conPratiche = (base: string) =>
        praticheIds.length > 0 ? `${base},pratica_id.in.${lista(praticheIds)}` : base;

      const { data: ticketCliente } = await supabase
        .from("ticket_assistenza")
        .select("id")
        .or(`mittente_id.eq.${cliente_id},destinatario_id.eq.${cliente_id}`);
      const ticketIds = (ticketCliente ?? []).map((t: { id: string }) => t.id);

      const filtroPortale = conPratiche(`cliente_id.eq.${cliente_id},caricato_da.eq.${cliente_id}`);
      const filtroArchivio = conPratiche(
        `cliente_id.eq.${cliente_id},autore_id.eq.${cliente_id},titolare_id.eq.${cliente_id}`,
      );
      const { data: filePortale } = await supabase
        .from("documenti").select("storage_path").or(filtroPortale);
      const { data: fileArchivio } = await supabase
        .from("archivio_documenti").select("storage_path, metadati").or(filtroArchivio);
      const { data: filePratiche } = praticheIds.length > 0
        ? await supabase.from("documenti_pratiche").select("storage_path").in("pratica_id", praticheIds)
        : { data: [] };

      const daTogliere: Record<string, string[]> = {};
      const aggiungi = (bucket: string, percorso: unknown) => {
        if (!percorso) return;
        (daTogliere[bucket] ??= []).push(String(percorso));
      };
      for (const f of filePortale ?? []) aggiungi("documenti", f.storage_path);
      for (const f of filePratiche ?? []) aggiungi("documenti", f.storage_path);
      for (const f of fileArchivio ?? []) {
        aggiungi(String((f.metadati as Record<string, unknown> | null)?.bucket ?? "archivio"), f.storage_path);
      }

      const conteggi: Record<string, number> = {};

      // ── 3. Le cancellazioni, in un ordine che il database accetta ──
      if (ticketIds.length > 0) {
        conteggi.messaggi_ticket = await passo("messaggi", supabase
          .from("messaggi_ticket").delete({ count: "exact" }).in("ticket_id", ticketIds));
        conteggi.ticket_assistenza = await passo("ticket", supabase
          .from("ticket_assistenza").delete({ count: "exact" }).in("id", ticketIds));
      }
      // messaggi del cliente in altri ticket
      conteggi.messaggi_ticket = (conteggi.messaggi_ticket ?? 0) + await passo("messaggi del cliente", supabase
        .from("messaggi_ticket").delete({ count: "exact" }).eq("autore_id", cliente_id));

      conteggi.documenti_portale = await passo("documenti del portale", supabase
        .from("documenti").delete({ count: "exact" }).or(filtroPortale));

      // fatture non emesse (righe e pagamenti vanno con loro)
      conteggi.fatture = await passo("fatture", supabase
        .from("fatture").delete({ count: "exact" }).eq("cliente_id", cliente_id));
      if (praticheIds.length > 0) {
        // fatture di altri clienti collegate a queste pratiche: restano, senza pratica
        await passo("fatture collegate", supabase
          .from("fatture").update({ pratica_id: null }).in("pratica_id", praticheIds));
      }

      conteggi.note_interne = await passo("note", supabase
        .from("note_interne").delete({ count: "exact" }).eq("cliente_id", cliente_id));

      conteggi.appuntamenti = await passo("appuntamenti", supabase
        .from("appuntamenti").delete({ count: "exact" })
        .or(conPratiche(`cliente_id.eq.${cliente_id}`)));
      await passo("allegati degli appuntamenti", supabase
        .from("allegati_default_appuntamento").update({ caricato_da: null }).eq("caricato_da", cliente_id));
      await passo("allegati degli appuntamenti", supabase
        .from("allegati_manuali_appuntamento").update({ caricato_da: null }).eq("caricato_da", cliente_id));
      await passo("appuntamenti con Lexum", supabase
        .from("appuntamenti_admin").update({ partecipante_user_id: null }).eq("partecipante_user_id", cliente_id));

      conteggi.archivio_documenti = await passo("archivio", supabase
        .from("archivio_documenti").delete({ count: "exact" }).or(filtroArchivio));

      if (praticheIds.length > 0) {
        conteggi.documenti_pratiche = await passo("documenti delle pratiche", supabase
          .from("documenti_pratiche").delete({ count: "exact" }).in("pratica_id", praticheIds));
      }
      await passo("documenti caricati dal cliente", supabase
        .from("documenti_pratiche").update({ autore_id: null }).eq("autore_id", cliente_id));
      // pratiche (controparti, termini, udienze, collaboratori vanno con loro; le ricerche restano)
      conteggi.pratiche = await passo("pratiche", supabase
        .from("pratiche").delete({ count: "exact" }).eq("cliente_id", cliente_id));

      await passo("ricerche", supabase
        .from("ricerche").update({ autore_id: null }).eq("autore_id", cliente_id));
      // le sue azioni nel registro (il registro dell'eliminazione resta, a nome di chi elimina)
      await passo("registro", supabase.from("audit_log").delete().eq("user_id", cliente_id));

      await supabase.from("audit_log").insert({
        studio_id: studioAudit,
        user_id: chiamante.id,
        user_nome: nomeChiamante,
        azione: "Cliente eliminato (HARD DELETE)",
        entita_tipo: "profiles",
        entita_id: cliente_id,
        dettaglio: `Cliente eliminato: ${nomeCliente} (${cliente.email ?? "senza email"}). Conteggi: ${JSON.stringify(conteggi)}`,
      });

      // ── 4. L'account: profilo e il resto vanno in cascata ──
      const { error: errDelUser } = await supabase.auth.admin.deleteUser(cliente_id);
      if (errDelUser) {
        throw new Error(`Errore cancellazione utente: ${errDelUser.message}`);
      }

      // ── 5. I file (se uno non si toglie, resta: il cliente è comunque eliminato) ──
      for (const [bucket, percorsi] of Object.entries(daTogliere)) {
        for (let i = 0; i < percorsi.length; i += 100) {
          const { error } = await supabase.storage.from(bucket).remove(percorsi.slice(i, i + 100));
          if (error) console.error(`file non tolti da ${bucket}:`, error.message);
        }
      }

      return jsonResponse({
        ok: true,
        conteggi,
        messaggio: `Cliente ${nomeCliente} eliminato definitivamente.`,
      });
    }

    throw new Error("Azione non riconosciuta");

  } catch (err) {
    console.error("avvocato-cliente-actions error:", (err as Error).message);
    return jsonResponse({ ok: false, error: (err as Error).message }, 400);
  }
});
