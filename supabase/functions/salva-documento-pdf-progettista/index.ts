// supabase/functions/salva-documento-pdf-progettista/index.ts — Lexum CH
//
// Variante PROGETTISTA di salva-documento-pdf: converte Markdown finale
// (eventualmente modificato dall'utente) in PDF in stile atto, salva su
// storage e crea record in progetto_documenti.
//
// Differenze rispetto alla variante avvocati (tutto il resto — parser
// markdown, renderer PDF, stili — invariato):
//   1. Ownership: progetti (id + progettista_id = user.id), niente collaboratori.
//   2. Bucket "progetto-documenti", path ${user.id}/${progetto_id}/generati/...
//      (il prefisso user.id è richiesto dalle RLS del bucket).
//   3. INSERT in progetto_documenti: { progetto_id, progettista_id, nome_file,
//      storage_path, dimensione, categoria } — niente autore_id/tipo_file.
//   4. Body: tipo_codice/tipo_nome al posto di template_codice/template_nome.
//   5. Footer neutro "Generato con Lexum · {data}" (i progettisti non hanno
//      cantone_albo).
//
// Body: { progetto_id, tipo_codice, tipo_nome, markdown_finale,
//         nome_file_personalizzato?, categoria?, solo_anteprima? }
// Response (salva): { ok, documento_id, storage_path, url, nome_file }
// Response (anteprima): { ok, anteprima, pdf_base64, dimensione }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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

// Uint8Array -> base64 a chunk (evita stack overflow su PDF grandi)
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ─────────────────────────────────────────────────────────────
// Parser Markdown minimale per estrarre struttura tipografica
// ─────────────────────────────────────────────────────────────
type Blocco =
  | { tipo: "h1"; testo: string }
  | { tipo: "h2"; testo: string }
  | { tipo: "h3"; testo: string }
  | { tipo: "hr" }
  | { tipo: "lista"; items: string[] }
  | { tipo: "paragrafo"; parti: Array<{ testo: string; bold: boolean; italic: boolean }> };

function parsificaMarkdown(md: string): Blocco[] {
  const blocchi: Blocco[] = [];
  const righe = md.split("\n");
  let i = 0;

  while (i < righe.length) {
    const r = righe[i].trim();

    if (r === "") {
      i++;
      continue;
    }

    if (r === "---" || r === "***") {
      blocchi.push({ tipo: "hr" });
      i++;
      continue;
    }

    if (r.startsWith("# ")) {
      blocchi.push({ tipo: "h1", testo: r.slice(2).trim() });
      i++;
      continue;
    }

    if (r.startsWith("## ")) {
      blocchi.push({ tipo: "h2", testo: r.slice(3).trim() });
      i++;
      continue;
    }

    if (r.startsWith("### ")) {
      blocchi.push({ tipo: "h3", testo: r.slice(4).trim() });
      i++;
      continue;
    }

    // Lista (- item oppure * item)
    if (r.startsWith("- ") || r.startsWith("* ")) {
      const items: string[] = [];
      while (i < righe.length) {
        const rr = righe[i].trim();
        if (rr.startsWith("- ") || rr.startsWith("* ")) {
          items.push(rr.slice(2).trim());
          i++;
        } else if (rr === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      blocchi.push({ tipo: "lista", items });
      continue;
    }

    // Paragrafo: aggrega righe fino a riga vuota
    const righeP: string[] = [];
    while (i < righe.length && righe[i].trim() !== "") {
      righeP.push(righe[i].trim());
      i++;
    }
    const testoP = righeP.join(" ");
    blocchi.push({ tipo: "paragrafo", parti: parsificaInline(testoP) });
  }

  return blocchi;
}

// Parser inline: estrae bold/italic dal testo paragrafo
function parsificaInline(testo: string): Array<{ testo: string; bold: boolean; italic: boolean }> {
  const parti: Array<{ testo: string; bold: boolean; italic: boolean }> = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|([^*]+)/g;
  let m;
  while ((m = regex.exec(testo)) !== null) {
    if (m[2] !== undefined) {
      parti.push({ testo: m[2], bold: true, italic: false });
    } else if (m[4] !== undefined) {
      parti.push({ testo: m[4], bold: false, italic: true });
    } else if (m[5] !== undefined) {
      parti.push({ testo: m[5], bold: false, italic: false });
    }
  }
  return parti.length > 0 ? parti : [{ testo, bold: false, italic: false }];
}

// ─────────────────────────────────────────────────────────────
// Renderer PDF stile atto
// Times New Roman 12pt, A4, margini 2.5cm sopra/sotto, 2cm laterali
// ─────────────────────────────────────────────────────────────
function renderPdfAtto(blocchi: Blocco[]): Uint8Array {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });

  const W = 210;
  const H = 297;
  const ML = 20;
  const MR = 20;
  const MT = 25;
  const MB = 25;

  const larghezzaTesto = W - ML - MR;
  let y = MT;

  function checkPageBreak(altezzaNecessaria: number) {
    if (y + altezzaNecessaria > H - MB) {
      doc.addPage();
      y = MT;
    }
  }

  function scriviParagrafoInline(
    parti: Array<{ testo: string; bold: boolean; italic: boolean }>,
    fontSize = 12,
    lineHeight = 6,
    indentaPrima = false
  ) {
    doc.setFontSize(fontSize);

    type Parola = { testo: string; bold: boolean; italic: boolean; spazio: boolean };
    const parole: Parola[] = [];

    for (const p of parti) {
      const tokens = p.testo.split(/(\s+)/);
      for (const tk of tokens) {
        if (tk === "") continue;
        if (/^\s+$/.test(tk)) {
          if (parole.length > 0) parole[parole.length - 1].spazio = true;
        } else {
          parole.push({ testo: tk, bold: p.bold, italic: p.italic, spazio: false });
        }
      }
    }

    function setStyle(b: boolean, i: boolean) {
      const fs = b && i ? "bolditalic" : b ? "bold" : i ? "italic" : "normal";
      doc.setFont("times", fs);
    }

    function larghezza(p: Parola): number {
      setStyle(p.bold, p.italic);
      return doc.getTextWidth(p.testo);
    }

    setStyle(false, false);
    const spazioW = doc.getTextWidth(" ");

    type Riga = { parole: Parola[]; larghezzaTotale: number };
    const righe: Riga[] = [];
    let rigaCorrente: Parola[] = [];
    let larghezzaCorrente = 0;
    const indentazione = indentaPrima ? 8 : 0;
    let larghezzaDisponibile = larghezzaTesto - indentazione;

    for (const p of parole) {
      const w = larghezza(p);
      const wConSpazio = rigaCorrente.length > 0 ? spazioW + w : w;
      if (larghezzaCorrente + wConSpazio > larghezzaDisponibile && rigaCorrente.length > 0) {
        righe.push({ parole: rigaCorrente, larghezzaTotale: larghezzaCorrente });
        rigaCorrente = [p];
        larghezzaCorrente = w;
        larghezzaDisponibile = larghezzaTesto;
      } else {
        rigaCorrente.push(p);
        larghezzaCorrente += wConSpazio;
      }
    }
    if (rigaCorrente.length > 0) {
      righe.push({ parole: rigaCorrente, larghezzaTotale: larghezzaCorrente });
    }

    for (let idx = 0; idx < righe.length; idx++) {
      checkPageBreak(lineHeight);
      const riga = righe[idx];
      const ultima = idx === righe.length - 1;
      const isPrima = idx === 0 && indentaPrima;
      const xStart = ML + (isPrima ? indentazione : 0);
      const larghezzaRiga = larghezzaTesto - (isPrima ? indentazione : 0);

      if (ultima || riga.parole.length === 1) {
        let x = xStart;
        for (let pi = 0; pi < riga.parole.length; pi++) {
          const p = riga.parole[pi];
          setStyle(p.bold, p.italic);
          doc.text(p.testo, x, y);
          x += larghezza(p);
          if (pi < riga.parole.length - 1) x += spazioW;
        }
      } else {
        const wParole = riga.parole.reduce((acc, p) => acc + larghezza(p), 0);
        const numSpazi = riga.parole.length - 1;
        const spazioGiusto = (larghezzaRiga - wParole) / numSpazi;
        let x = xStart;
        for (let pi = 0; pi < riga.parole.length; pi++) {
          const p = riga.parole[pi];
          setStyle(p.bold, p.italic);
          doc.text(p.testo, x, y);
          x += larghezza(p);
          if (pi < riga.parole.length - 1) x += spazioGiusto;
        }
      }
      y += lineHeight;
    }
  }

  for (const b of blocchi) {
    if (b.tipo === "h1") {
      checkPageBreak(14);
      y += 4;
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      const linee = doc.splitTextToSize(b.testo.toUpperCase(), larghezzaTesto);
      for (const linea of linee) {
        checkPageBreak(7);
        const lw = doc.getTextWidth(linea);
        doc.text(linea, ML + (larghezzaTesto - lw) / 2, y);
        y += 7;
      }
      y += 3;
      continue;
    }

    if (b.tipo === "h2") {
      checkPageBreak(12);
      y += 3;
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      const linee = doc.splitTextToSize(b.testo.toUpperCase(), larghezzaTesto);
      for (const linea of linee) {
        checkPageBreak(6);
        const lw = doc.getTextWidth(linea);
        doc.text(linea, ML + (larghezzaTesto - lw) / 2, y);
        y += 6;
      }
      y += 2;
      continue;
    }

    if (b.tipo === "h3") {
      checkPageBreak(10);
      y += 2;
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      const linee = doc.splitTextToSize(b.testo, larghezzaTesto);
      for (const linea of linee) {
        checkPageBreak(6);
        doc.text(linea, ML, y);
        y += 6;
      }
      y += 1;
      continue;
    }

    if (b.tipo === "hr") {
      checkPageBreak(8);
      y += 2;
      doc.setDrawColor(150);
      doc.setLineWidth(0.3);
      doc.line(ML, y, W - MR, y);
      y += 5;
      continue;
    }

    if (b.tipo === "lista") {
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      for (const item of b.items) {
        const parti = parsificaInline(item);
        checkPageBreak(6);
        doc.text("•", ML + 3, y);
        const savedY = y;
        let testoCompleto = parti.map((p) => p.testo).join("");
        const linee = doc.splitTextToSize(testoCompleto, larghezzaTesto - 8);
        for (const linea of linee) {
          checkPageBreak(6);
          doc.text(linea, ML + 8, y);
          y += 6;
        }
        if (y === savedY) y += 6;
      }
      y += 2;
      continue;
    }

    if (b.tipo === "paragrafo") {
      scriviParagrafoInline(b.parti, 12, 6, false);
      y += 2;
      continue;
    }
  }

  // Piè di pagina su tutte le pagine — progettisti: footer neutro
  const totPagine = doc.getNumberOfPages();
  for (let p = 1; p <= totPagine; p++) {
    doc.setPage(p);
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const footer = `Generato con Lexum · ${new Date().toLocaleDateString("it-CH")}`;
    doc.text(footer, ML, H - 12);
    doc.text(`Pagina ${p} di ${totPagine}`, W - MR, H - 12, { align: "right" });
    doc.setTextColor(0);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ ok: false, error: "Non autorizzato" }, 401);
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return jsonResponse({ ok: false, error: "Token non valido" }, 401);
    }

    const { progetto_id, tipo_codice, tipo_nome, markdown_finale, nome_file_personalizzato, categoria, solo_anteprima } = await req.json();

    if (!progetto_id || !tipo_codice || !tipo_nome || !markdown_finale) {
      throw new Error("Parametri obbligatori: progetto_id, tipo_codice, tipo_nome, markdown_finale");
    }

    // Verifica che il progetto appartenga al progettista autenticato
    const { data: progetto, error: pErr } = await supabase
      .from("progetti")
      .select("id")
      .eq("id", progetto_id)
      .eq("progettista_id", user.id)
      .single();

    if (pErr || !progetto) throw new Error("Progetto non trovato o non autorizzato");

    // Parsifica markdown e genera PDF
    const blocchi = parsificaMarkdown(markdown_finale);
    const pdfBytes = renderPdfAtto(blocchi);

    // ─── MODALITA' ANTEPRIMA ───────────────────────────────────
    // Stesso identico PDF del salvataggio, ma NON archiviato.
    if (solo_anteprima === true) {
      return jsonResponse({
        ok: true,
        anteprima: true,
        pdf_base64: uint8ToBase64(pdfBytes),
        dimensione: pdfBytes.byteLength,
      });
    }

    // Storage path — prefisso user.id richiesto dalle RLS del bucket
    const timestamp = Date.now();
    const filename = `${tipo_codice}_${timestamp}.pdf`;
    const storagePath = `${user.id}/${progetto_id}/generati/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("progetto-documenti")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upErr) throw new Error(`Errore upload PDF: ${upErr.message}`);

    // Nome leggibile per progetto_documenti.
    function sanitizzaNomeFile(nome: string): string {
      return nome
        .trim()
        .replace(/[/\\:*?\"<>|]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 150);
    }

    let nomeFile: string;
    if (nome_file_personalizzato && typeof nome_file_personalizzato === "string") {
      const sanitizzato = sanitizzaNomeFile(nome_file_personalizzato);
      if (sanitizzato.length === 0) {
        nomeFile = `${tipo_nome} - ${new Date().toLocaleDateString("it-CH")}.pdf`;
      } else {
        nomeFile = sanitizzato.toLowerCase().endsWith(".pdf")
          ? sanitizzato
          : `${sanitizzato}.pdf`;
      }
    } else {
      nomeFile = `${tipo_nome} - ${new Date().toLocaleDateString("it-CH")}.pdf`;
    }

    const { data: docRecord, error: docErr } = await supabase
      .from("progetto_documenti")
      .insert({
        progetto_id,
        progettista_id: user.id,
        nome_file: nomeFile,
        storage_path: storagePath,
        dimensione: pdfBytes.byteLength,
        categoria: categoria ?? "rapporto",
      })
      .select("id")
      .single();

    if (docErr) {
      await supabase.storage.from("progetto-documenti").remove([storagePath]);
      throw new Error(`Errore registrazione documento: ${docErr.message}`);
    }

    // URL firmato per download (1 ora)
    const { data: signedData } = await supabase.storage
      .from("progetto-documenti")
      .createSignedUrl(storagePath, 3600);

    return jsonResponse({
      ok: true,
      documento_id: docRecord.id,
      storage_path: storagePath,
      url: signedData?.signedUrl,
      nome_file: nomeFile,
    });

  } catch (err) {
    console.error("salva-documento-pdf-progettista error:", err.message);
    return jsonResponse({ ok: false, error: err.message }, 400);
  }
});
