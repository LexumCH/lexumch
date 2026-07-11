// ═══════════════════════════════════════════════════════════════
// lex-archivia-documento-progetto  (LEXUM CH)
// Deposita un documento generato dal progetto (già salvato in progetto_documenti)
// ANCHE nell'archivio privato dello studio, indicizzandolo (process-archivio) per
// la ricerca semantica trasversale ai progetti + classificazione Haiku.
//
// Chiamata fire-and-forget dal frontend dopo il salvataggio del PDF. Idempotente:
// se il documento è già stato archiviato non ne crea un duplicato.
//
// Body: { documento_id }  (id di una riga progetto_documenti)
// verify_jwt = false (auth in-funzione via supabase.auth.getUser)
// Versione: 1.0.0-CH
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonOut(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user } } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    if (!user) return jsonOut({ ok: false, error: "non autenticato" }, 401);

    const { documento_id } = await req.json().catch(() => ({}));
    if (!documento_id) return jsonOut({ ok: false, error: "documento_id obbligatorio" }, 400);

    // Riga progetto_documenti di proprietà del progettista
    const { data: doc } = await supabase
      .from("progetto_documenti")
      .select("id, progetto_id, nome_file, storage_path, dimensione")
      .eq("id", documento_id)
      .eq("progettista_id", user.id)
      .maybeSingle();
    if (!doc) return jsonOut({ ok: false, error: "documento non trovato" }, 404);

    const { data: progetto } = await supabase
      .from("progetti").select("nome").eq("id", doc.progetto_id).maybeSingle();

    const { data: prof } = await supabase
      .from("profiles").select("titolare_id").eq("id", user.id).maybeSingle();
    const titolareId = prof?.titolare_id ?? user.id;

    // Idempotenza: già archiviato? (marcatore in metadati)
    const { data: esistente } = await supabase
      .from("archivio_documenti")
      .select("id")
      .filter("metadati->>progetto_documento_id", "eq", documento_id)
      .maybeSingle();
    if (esistente?.id) return jsonOut({ ok: true, archivio_id: esistente.id, already: true });

    // Categoria "Documenti di progetto" (marcatore chiave, rename-proof)
    let catId: string | null = null;
    const { data: cat } = await supabase
      .from("categorie_archivio")
      .select("id").eq("titolare_id", titolareId).eq("chiave", "documenti_progetto").maybeSingle();
    if (cat?.id) catId = cat.id;
    else {
      const { data: creata } = await supabase
        .from("categorie_archivio")
        .insert({ titolare_id: titolareId, nome: "Documenti di progetto", colore: "#6b8f9c", chiave: "documenti_progetto" })
        .select("id").maybeSingle();
      catId = creata?.id ?? null;
    }

    // Copia il PDF dal bucket di progetto all'archivio
    const { data: blob, error: dlErr } = await supabase.storage
      .from("progetto-documenti").download(doc.storage_path);
    if (dlErr || !blob) return jsonOut({ ok: false, error: "download fallito" }, 500);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const archPath = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("archivio").upload(archPath, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) return jsonOut({ ok: false, error: `upload fallito: ${upErr.message}` }, 500);

    const titolo = `${(doc.nome_file ?? "Documento").replace(/\.pdf$/i, "")}${progetto?.nome ? ` · ${progetto.nome}` : ""}`;
    const { data: archDoc, error: insErr } = await supabase
      .from("archivio_documenti")
      .insert({
        autore_id: user.id,
        titolare_id: titolareId,
        categoria_id: catId,
        tipo: "pdf",
        titolo,
        storage_path: archPath,
        tipo_file: "application/pdf",
        dimensione: doc.dimensione ?? bytes.byteLength,
        ocr_status: "pending",
        metadati: { origine: "documento_progetto", progetto_id: doc.progetto_id, progetto_nome: progetto?.nome ?? null, progetto_documento_id: documento_id },
      })
      .select("id").maybeSingle();
    if (insErr || !archDoc?.id) {
      await supabase.storage.from("archivio").remove([archPath]);
      return jsonOut({ ok: false, error: "registrazione fallita" }, 500);
    }

    // Estrazione testo + embeddings in background (JWT dell'utente)
    const bg = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-archivio`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
      body: JSON.stringify({ documento_id: archDoc.id }),
    }).catch(() => {});
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(bg); } catch { /* fire-and-forget */ }

    return jsonOut({ ok: true, archivio_id: archDoc.id });
  } catch (err: any) {
    return jsonOut({ ok: false, error: String(err?.message ?? err).slice(0, 300) }, 500);
  }
});
