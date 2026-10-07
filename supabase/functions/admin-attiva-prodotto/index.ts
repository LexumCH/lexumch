// 07-10-2026 (controllo di sicurezza): le azioni admin vogliono la verifica in due passaggi completata (aal2).
// supabase/functions/admin-attiva-prodotto/index.ts
//
// Attivazione manuale di un prodotto da parte dell'admin (versione CH).
// Adattamenti CH rispetto a IT:
//   - select profilo allineato allo schema CH (rimosse colonne IT: cf, comune, provincia, partita_iva)
//   - ruoli ammessi: user, avvocato, fiduciario, progettista
//   - ruoloTarget: promozione a fiduciario, avvocato o progettista (override via body.ruolo_target)
//   - valuta CHF
//   - audit_log.dettaglio come jsonb strutturato (in CH la colonna è jsonb, non text)
//
// FIX SCADENZA (bug prova gratuita CH): il calcolo scadenza usava
//   s.setMonth(s.getMonth() + prodotto.durata_mesi)
// che accetta SOLO mesi interi: per un trial con durata_mesi frazionaria (0.24 ≈ 7 giorni)
// veniva troncato a 0 mesi -> scadenza = adesso -> prova scaduta all'istante.
// Ora: mesi interi come mesi di calendario + parte frazionaria convertita in giorni (30/mese).
//
// FIX VERIFICA (bug prova non poteva creare pratiche): l'attivazione impostava role +
// abbonamento_stato ma NON verification_status, lasciandolo 'none' -> is_professionista()
// = false -> la RLS pratiche_insert rifiutava l'INSERT. Ora l'attivazione manuale admin
// imposta verification_status='approved' (l'admin fa da garante della verifica).
//
// PIANO PERSONALE (02-10-2026): tipo 'piano_privato' per i privati (ruolo 'user'),
// stessa RPC del pagamento Stripe (attiva_piano_privato), senza cambiare ruolo.

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

// Calcola la data di scadenza a partire da una durata in mesi eventualmente FRAZIONARIA.
// - mesi interi -> mesi di calendario (setMonth), scadenza "pulita" per abbonamenti mensili/annuali
// - resto frazionario -> giorni (30 giorni/mese), cosi' un trial di 0.24 mesi = ~7 giorni funziona
// Ritorna null se durata assente/0.
function calcolaScadenza(durataMesiRaw: unknown): string | null {
  const mesi = Number(durataMesiRaw);
  if (!Number.isFinite(mesi) || mesi <= 0) return null;
  const mesiInteri = Math.floor(mesi);
  const giorniResto = Math.round((mesi - mesiInteri) * 30);
  const s = new Date();
  if (mesiInteri > 0) s.setMonth(s.getMonth() + mesiInteri);
  if (giorniResto > 0) s.setDate(s.getDate() + giorniResto);
  return s.toISOString();
}

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth check: solo admin ────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Token non valido");

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, nome, cognome")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") throw new Error("Accesso negato");
    if (livelloDelToken(authHeader.replace("Bearer ", "")) !== "aal2") {
      return jsonResponse({ ok: false, error: "Serve la verifica in due passaggi" }, 403);
    }

    // ─── Parse body ────────────────────────────────────
    const body = await req.json();
    const { user_id, prodotto_id, importo, motivo, sentenza_id } = body;

    if (!user_id) throw new Error("user_id obbligatorio");
    if (!prodotto_id) throw new Error("prodotto_id obbligatorio");
    if (importo === undefined || importo === null) throw new Error("importo obbligatorio");
    if (importo < 0) throw new Error("importo non puo essere negativo");
    if (!motivo?.trim()) throw new Error("motivo obbligatorio per tracciabilita");

    // ─── Carica prodotto ───────────────────────────────
    const { data: prodotto, error: prodErr } = await supabase
      .from("prodotti")
      .select("*")
      .eq("id", prodotto_id)
      .single();

    if (prodErr || !prodotto) throw new Error("Prodotto non trovato");

    // ─── Carica profilo destinatario (colonne valide in CH) ─
    const { data: profilo } = await supabase
      .from("profiles")
      .select(`
        id, email, nome, cognome, studio_id, role, tipo_account,
        ragione_sociale, sede_legale, tipo_soggetto
      `)
      .eq("id", user_id)
      .single();

    if (!profilo) throw new Error("Utente destinatario non trovato");
    if (!["user", "avvocato", "fiduciario", "progettista"].includes(profilo.role)) {
      throw new Error("Attivazione consentita solo per user, avvocato, fiduciario e progettista");
    }

    // ─── Ruolo da assegnare se l'utente viene promosso ──────
    // Priorità: 1) override esplicito dal body, 2) target_role del prodotto
    // (fonte di verità: il prodotto sa per chi è), 3) ruolo attuale se gia
    // professionista, 4) fallback avvocato.
    // NB: dedurre dal profilo.role è sbagliato in fase di prima attivazione,
    // perche l'utente e ancora 'user' (il ruolo lo da il prodotto).
    const targetRoleProdotto =
      (prodotto.target_role === "fiduciario" ||
       prodotto.target_role === "avvocato" ||
       prodotto.target_role === "progettista")
        ? prodotto.target_role
        : null;

    const ruoloTarget: string =
      body.ruolo_target
      ?? targetRoleProdotto
      ?? (profilo.role === "fiduciario" || profilo.role === "progettista"
        ? profilo.role
        : "avvocato");

    if (!["avvocato", "fiduciario", "progettista"].includes(ruoloTarget)) {
      throw new Error(`ruolo_target non valido: ${ruoloTarget}`);
    }

    const proprietarioId = user_id;
    const prodottoTipo = prodotto.tipo;
    const isOmaggio = Number(importo) === 0;

    // Scadenza generica se il prodotto ha durata (gestisce durate FRAZIONARIE: vedi calcolaScadenza)
    const scadenza: string | null = calcolaScadenza(prodotto.durata_mesi);

    const adminNome = `${adminProfile.nome ?? ""} ${adminProfile.cognome ?? ""}`.trim() || "Admin";
    const metadatiTx = {
      manuale: true,
      attivato_da_id: user.id,
      attivato_da_nome: adminNome,
      motivo: motivo.trim(),
      omaggio: isOmaggio,
    };

    // ═══════════════════════════════════════════════════════
    // SEAT ADD-ON
    // ═══════════════════════════════════════════════════════
    if (prodottoTipo === "seat_addon") {
      if (!profilo.studio_id) throw new Error("Seat add-on richiede uno studio gia attivo");

      const { data: studio } = await supabase
        .from("studios")
        .select("posti_totali")
        .eq("id", profilo.studio_id)
        .single();

      const nuoviPosti = (studio?.posti_totali ?? 1) + (prodotto.posti ?? 1);

      await supabase
        .from("studios")
        .update({ posti_totali: nuoviPosti })
        .eq("id", profilo.studio_id);

      if (nuoviPosti > 1 && profilo.tipo_account === "singolo") {
        await supabase
          .from("profiles")
          .update({ tipo_account: "titolare" })
          .eq("id", user_id);
      }

      await supabase.from("audit_log").insert({
        studio_id: profilo.studio_id,
        user_id: user.id,
        user_nome: adminNome,
        azione: `Attivazione manuale: Seat add-on ${isOmaggio ? "(omaggio)" : ""}`.trim(),
        entita_tipo: "prodotti",
        entita_id: prodotto_id,
        dettaglio: {
          tipo: "seat_addon",
          posti_aggiunti: prodotto.posti ?? 1,
          posti_totali: nuoviPosti,
          destinatario: `${profilo.nome} ${profilo.cognome}`,
          importo,
          valuta: "CHF",
          omaggio: isOmaggio,
          motivo: motivo.trim(),
        },
      });
    }

    // ═══════════════════════════════════════════════════════
    // ABBONAMENTO
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "abbonamento") {
      const posti = prodotto.posti ?? 1;
      const tipoAccount = posti === 1 ? "singolo" : "titolare";

      const studioData = {
        piano_id: prodotto_id,
        posti_totali: posti,
        posti_usati: 1,
        include_banca_dati: prodotto.include_banca_dati,
        include_monetizzazione: prodotto.include_monetizzazione,
        scadenza,
        stato: "attivo",
        stripe_sub_id: null,
      };

      const profiloUpdate = {
        tipo_account: tipoAccount,
        piano_id: prodotto_id,
        abbonamento_tipo: prodotto.nome,
        abbonamento_scadenza: scadenza,
        abbonamento_stato: "attivo",
        verification_status: "approved", // FIX: admin attiva manualmente = garante della verifica -> sblocca is_professionista() (creazione pratiche RLS)
        grazia_fino_al: null,
        spazio_gb_piano: prodotto.spazio_gb ?? 0,
        posti_acquistati: posti,
        include_banca_dati: prodotto.include_banca_dati ?? false,
        include_monetizzazione: prodotto.include_monetizzazione ?? false,
      };

      if (profilo.studio_id) {
        await supabase.from("studios").update(studioData).eq("id", profilo.studio_id);
        await supabase.from("profiles").update(profiloUpdate).eq("id", user_id);
      } else {
        const nomeStudio = posti === 1
          ? `Studio di ${profilo.nome} ${profilo.cognome}`
          : "Il mio studio";

        const { data: nuovoStudio, error: studioErr } = await supabase
          .from("studios")
          .insert({ ...studioData, nome: nomeStudio, titolare_id: user_id })
          .select()
          .single();

        if (studioErr || !nuovoStudio) throw new Error("Errore creazione studio");

        await supabase
          .from("profiles")
          .update({
            ...profiloUpdate,
            studio_id: nuovoStudio.id,
            role: ruoloTarget,
          })
          .eq("id", user_id);

        await supabase.from("studio_members").insert({
          studio_id: nuovoStudio.id,
          user_id,
          ruolo_studio: "titolare",
          visibilita: "tutto",
          is_active: true,
          joined_at: new Date().toISOString(),
        });
      }

      // Crediti AI mensili inclusi nel piano
      if (prodotto.crediti_ai_mensili > 0) {
        const inizioPeriodo = new Date();
        const finePeriodo = new Date();
        finePeriodo.setMonth(finePeriodo.getMonth() + 1);

        const studioIdCrediti = profilo.studio_id ?? (
          await supabase.from("profiles").select("studio_id").eq("id", user_id).single()
        ).data?.studio_id;

        await supabase.from("crediti_ai").insert({
          user_id,
          studio_id: studioIdCrediti ?? null,
          tipo: "piano",
          crediti_totali: prodotto.crediti_ai_mensili,
          crediti_usati: 0,
          periodo_inizio: inizioPeriodo.toISOString(),
          periodo_fine: finePeriodo.toISOString(),
        });
      }

      const studioIdLog = profilo.studio_id ?? (
        await supabase.from("profiles").select("studio_id").eq("id", user_id).single()
      ).data?.studio_id;

      if (studioIdLog) {
        await supabase.from("audit_log").insert({
          studio_id: studioIdLog,
          user_id: user.id,
          user_nome: adminNome,
          azione: `Attivazione manuale: Abbonamento ${isOmaggio ? "(omaggio)" : ""}`.trim(),
          entita_tipo: "prodotti",
          entita_id: prodotto_id,
          dettaglio: {
            tipo: "abbonamento",
            prodotto: prodotto.nome,
            importo,
            valuta: "CHF",
            posti,
            ruolo_assegnato: ruoloTarget,
            destinatario: `${profilo.nome} ${profilo.cognome}`,
            omaggio: isOmaggio,
            motivo: motivo.trim(),
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // ACCESSO SINGOLO SENTENZA (marketplace — non attivo in CH)
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "accesso_singolo") {
      if (!sentenza_id) throw new Error("sentenza_id obbligatorio per accesso_singolo");

      const revenuePct = prodotto.revenue_pct ?? 60;
      const quotaAutore = isOmaggio ? 0 : (Number(importo) * revenuePct) / 100;

      await supabase.from("accessi_sentenze").insert({
        sentenza_id,
        acquirente_id: user_id,
        prezzo: importo,
        quota_autore: quotaAutore,
        stato: "da_liquidare",
      });

      await supabase.rpc("increment_accessi_sentenza", { sid: sentenza_id });

      await supabase.from("audit_log").insert({
        studio_id: profilo.studio_id ?? null,
        user_id: user.id,
        user_nome: adminNome,
        azione: `Attivazione manuale: Accesso sentenza ${isOmaggio ? "(omaggio)" : ""}`.trim(),
        entita_tipo: "accessi_sentenze",
        entita_id: sentenza_id,
        dettaglio: {
          tipo: "accesso_singolo",
          sentenza_id,
          importo,
          valuta: "CHF",
          destinatario: `${profilo.nome} ${profilo.cognome}`,
          omaggio: isOmaggio,
          motivo: motivo.trim(),
        },
      });
    }

    // ═══════════════════════════════════════════════════════
    // CREDITI AI (top-up — NON scadono mai)
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "crediti_ai") {
      const creditiAcquistati = prodotto.crediti_ai_mensili ?? 0;
      if (creditiAcquistati <= 0) throw new Error("Prodotto crediti senza quantita configurata");

      await supabase.from("crediti_ai").insert({
        user_id,
        studio_id: profilo.studio_id ?? null,
        tipo: "topup",
        crediti_totali: creditiAcquistati,
        crediti_usati: 0,
        periodo_inizio: new Date().toISOString(),
        periodo_fine: null,
      });

      if (profilo.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id: profilo.studio_id,
          user_id: user.id,
          user_nome: adminNome,
          azione: `Attivazione manuale: Crediti AI ${isOmaggio ? "(omaggio)" : ""}`.trim(),
          entita_tipo: "prodotti",
          entita_id: prodotto_id,
          dettaglio: {
            tipo: "crediti_ai",
            crediti: creditiAcquistati,
            importo,
            valuta: "CHF",
            destinatario: `${profilo.nome} ${profilo.cognome}`,
            omaggio: isOmaggio,
            motivo: motivo.trim(),
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // SPAZIO ARCHIVIAZIONE (top-up GB con scadenza)
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "spazio_archiviazione") {
      const gb = prodotto.spazio_gb ?? 0;
      const durataMesi = prodotto.durata_mesi ?? 1;

      if (gb <= 0) throw new Error("Prodotto storage senza GB configurati");

      const inizioPeriodo = new Date();
      // FIX: usa calcolaScadenza per gestire durate frazionarie anche qui
      const finePeriodoIso = calcolaScadenza(durataMesi) ?? (() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString();
      })();

      const { data: profProprietario } = await supabase
        .from("profiles")
        .select("id, studio_id, nome, cognome")
        .eq("id", proprietarioId)
        .single();

      if (!profProprietario) throw new Error("Proprietario storage non trovato");

      // Creo prima la transazione per linkare lo spazio
      const { data: nuovaTx } = await supabase
        .from("transazioni")
        .insert({
          user_id,
          studio_id: profProprietario.studio_id ?? profilo.studio_id ?? null,
          prodotto_id,
          prodotto_nome: prodotto.nome,
          tipo: prodottoTipo,
          importo,
          stripe_session_id: null,
          stripe_payment_id: null,
          stato: "completato",
          metadati: metadatiTx,
        })
        .select()
        .single();

      await supabase.from("spazio_archiviazione").insert({
        proprietario_id: proprietarioId,
        gb,
        prodotto_id,
        transazione_id: nuovaTx?.id ?? null,
        periodo_inizio: inizioPeriodo.toISOString(),
        periodo_fine: finePeriodoIso,
      });

      if (profProprietario.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id: profProprietario.studio_id,
          user_id: user.id,
          user_nome: adminNome,
          azione: `Attivazione manuale: Storage ${isOmaggio ? "(omaggio)" : ""}`.trim(),
          entita_tipo: "spazio_archiviazione",
          entita_id: prodotto_id,
          dettaglio: {
            tipo: "spazio_archiviazione",
            gb,
            durata_mesi: durataMesi,
            scadenza: finePeriodoIso,
            importo,
            valuta: "CHF",
            destinatario: `${profProprietario.nome} ${profProprietario.cognome}`,
            omaggio: isOmaggio,
            motivo: motivo.trim(),
          },
        });
      }

      console.log(`Attivazione manuale OK — admin ${user.id}, destinatario ${user_id}, storage ${prodotto.nome}`);
      return jsonResponse({
        ok: true,
        transazione_id: nuovaTx?.id ?? null,
        messaggio: "Storage attivato",
      });
    }

    // ═══════════════════════════════════════════════════════
    // GRATUITO (prova/trial)
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "gratuito") {
      const posti = prodotto.posti ?? 1;
      const tipoAccount = posti === 1 ? "singolo" : "titolare";

      const studioData = {
        piano_id: prodotto_id,
        posti_totali: posti,
        posti_usati: 1,
        include_banca_dati: prodotto.include_banca_dati,
        include_monetizzazione: prodotto.include_monetizzazione,
        scadenza,
        stato: "attivo",
        stripe_sub_id: null,
      };

      const profiloUpdate = {
        tipo_account: tipoAccount,
        piano_id: prodotto_id,
        abbonamento_tipo: prodotto.nome,
        abbonamento_scadenza: scadenza,
        abbonamento_stato: "attivo",
        verification_status: "approved", // FIX: admin attiva manualmente = garante della verifica -> sblocca is_professionista() (creazione pratiche RLS)
        grazia_fino_al: null,
        spazio_gb_piano: prodotto.spazio_gb ?? 0,
        posti_acquistati: posti,
        include_banca_dati: prodotto.include_banca_dati ?? false,
        include_monetizzazione: prodotto.include_monetizzazione ?? false,
        limite_clienti_piano: prodotto.limite_clienti ?? 0,
        limite_clienti_extra: 0,
      };

      if (profilo.studio_id) {
        await supabase.from("studios").update(studioData).eq("id", profilo.studio_id);
        await supabase.from("profiles").update(profiloUpdate).eq("id", user_id);
      } else {
        const nomeStudio = posti === 1
          ? `Studio di ${profilo.nome} ${profilo.cognome}`
          : "Il mio studio";

        const { data: nuovoStudio, error: studioErr } = await supabase
          .from("studios")
          .insert({ ...studioData, nome: nomeStudio, titolare_id: user_id })
          .select()
          .single();

        if (studioErr || !nuovoStudio) throw new Error("Errore creazione studio");

        await supabase
          .from("profiles")
          .update({
            ...profiloUpdate,
            studio_id: nuovoStudio.id,
            role: ruoloTarget,
          })
          .eq("id", user_id);

        await supabase.from("studio_members").insert({
          studio_id: nuovoStudio.id,
          user_id,
          ruolo_studio: "titolare",
          visibilita: "tutto",
          is_active: true,
          joined_at: new Date().toISOString(),
        });
      }

      // Crediti AI inclusi nel trial — tipo "piano" con scadenza del trial
      if (prodotto.crediti_ai_mensili > 0) {
        const studioIdCrediti = profilo.studio_id ?? (
          await supabase.from("profiles").select("studio_id").eq("id", user_id).single()
        ).data?.studio_id;

        await supabase.from("crediti_ai").insert({
          user_id,
          studio_id: studioIdCrediti ?? null,
          tipo: "piano",
          crediti_totali: prodotto.crediti_ai_mensili,
          crediti_usati: 0,
          periodo_inizio: new Date().toISOString(),
          periodo_fine: scadenza, // scadenza del trial, non +1 mese
        });
      }

      const studioIdLog = profilo.studio_id ?? (
        await supabase.from("profiles").select("studio_id").eq("id", user_id).single()
      ).data?.studio_id;

      if (studioIdLog) {
        await supabase.from("audit_log").insert({
          studio_id: studioIdLog,
          user_id: user.id,
          user_nome: adminNome,
          azione: "Attivazione manuale: Prova gratuita",
          entita_tipo: "prodotti",
          entita_id: prodotto_id,
          dettaglio: {
            tipo: "gratuito",
            prodotto: prodotto.nome,
            durata_mesi: prodotto.durata_mesi,
            posti,
            ruolo_assegnato: ruoloTarget,
            destinatario: `${profilo.nome} ${profilo.cognome}`,
            motivo: motivo.trim(),
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // PIANO PERSONALE (privati) — 02-10-2026
    // Stessa funzione del pagamento Stripe: crediti + GB in una transazione,
    // senza cambiare ruolo. Solo per i privati (ruolo 'user').
    // ═══════════════════════════════════════════════════════
    else if (prodottoTipo === "piano_privato") {
      if (profilo.role !== "user") {
        throw new Error("Il Piano Personale si attiva solo per gli utenti privati");
      }
      const { data: att, error: attErr } = await supabase.rpc("attiva_piano_privato", {
        p_user:     user_id,
        p_prodotto: prodotto_id,
        p_sessione: `admin_${crypto.randomUUID()}`,
      });
      if (attErr) throw new Error(`Attivazione Piano Personale non riuscita: ${attErr.message}`);
      const esito = Array.isArray(att) ? att[0] : att;

      if (profilo.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id: profilo.studio_id,
          user_id: user.id,
          user_nome: adminNome,
          azione: `Attivazione manuale: Piano Personale ${isOmaggio ? "(omaggio)" : ""}`.trim(),
          entita_tipo: "prodotti",
          entita_id: prodotto_id,
          dettaglio: {
            tipo: "piano_privato",
            prodotto: prodotto.nome,
            scadenza: esito?.scadenza ?? null,
            crediti: esito?.crediti ?? null,
            importo,
            valuta: "CHF",
            destinatario: `${profilo.nome} ${profilo.cognome}`,
            omaggio: isOmaggio,
            motivo: motivo.trim(),
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // Tipo sconosciuto
    // ═══════════════════════════════════════════════════════
    else {
      throw new Error(`Tipo prodotto non supportato: ${prodottoTipo}`);
    }

    // ═══════════════════════════════════════════════════════
    // SALVA TRANSAZIONE (tutti i tipi tranne spazio_archiviazione)
    // ═══════════════════════════════════════════════════════
    const studioIdTx = profilo.studio_id ?? (
      await supabase.from("profiles").select("studio_id").eq("id", user_id).single()
    ).data?.studio_id;

    const { data: tx } = await supabase
      .from("transazioni")
      .insert({
        user_id,
        studio_id: studioIdTx ?? null,
        prodotto_id,
        prodotto_nome: prodotto.nome,
        tipo: prodottoTipo,
        importo,
        stripe_session_id: null,
        stripe_payment_id: null,
        stato: "completato",
        metadati: metadatiTx,
      })
      .select()
      .single();

    console.log(`Attivazione manuale OK — admin ${user.id}, destinatario ${user_id}, prodotto ${prodotto.nome}`);
    return jsonResponse({
      ok: true,
      transazione_id: tx?.id ?? null,
      messaggio: "Prodotto attivato",
    });

  } catch (err) {
    console.error("admin-attiva-prodotto error:", err.message);
    return jsonResponse({ ok: false, error: err.message }, 400);
  }
});
