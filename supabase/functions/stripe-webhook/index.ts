// supabase/functions/stripe-webhook/index.ts
//
// Webhook Stripe — gestisce `checkout.session.completed` per tutti i tipi di prodotto:
//   - seat_addon            → aggiunge posti allo studio
//   - clienti_addon         → alza limite_clienti_extra dello studio (Modello A)
//   - abbonamento           → attiva piano avvocato + crediti_ai tipo='piano' + GB + limite clienti
//   - accesso_singolo       → sblocca accesso a una sentenza specifica
//   - crediti_ai            → crea record crediti_ai tipo='topup' (non scadono mai)
//   - spazio_archiviazione  → crea record spazio_archiviazione con scadenza (durata_mesi)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// ─── Email — passa attraverso send-mail (logga + supporta BCC interno) ─────
const ALIAS_CON_BCC_INTERNO = new Set([
  "abbonamento-attivato",
  "crediti-ai-attivati",
  "spazio-di-archiviazione-attivato",
  "accesso-sentenza",
  "seat-addon-attivato",
  "clienti-addon-attivato",
]);

async function inviaEmail(
  to: string,
  templateAlias: string,
  templateModel: Record<string, unknown>,
  toUserId?: string,
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-mail`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to,
        templateAlias,
        templateModel,
        tipo: templateAlias.replace(/-/g, "_"),
        origine: "stripe-webhook",
        toUserId,
        bccInterno: ALIAS_CON_BCC_INTERNO.has(templateAlias),
      }),
    });
  } catch (e) {
    console.error("send-mail error:", e);
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body      = await req.text();
  const secret    = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, secret);
  } catch (err) {
    console.error("Webhook signature non valida:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("OK", { status: 200 });
  }

  const session         = event.data.object as Stripe.Checkout.Session;
  const userId          = session.metadata?.supabase_user_id;
  const proprietarioId  = session.metadata?.proprietario_id ?? userId;
  const prodottoId      = session.metadata?.prodotto_id;
  const prodottoTipo    = session.metadata?.prodotto_tipo;

  // Multi-app sullo stesso account Stripe: il webhook CH processa SOLO i propri
  // eventi. Gli eventi di lexum.it (senza app=lexum_ch) vengono ignorati con 200.
  if (session.metadata?.app !== "lexum_ch") {
    return new Response("OK (evento non LEXUM CH)", { status: 200 });
  }

  // Idempotenza: registra l'evento Stripe; se è già stato processato, esci subito
  // (Stripe consegna at-least-once e ritenta sulle risposte non-2xx).
  const { error: idemErr } = await supabase
    .from("stripe_eventi_processati")
    .insert({ event_id: event.id });
  if (idemErr) {
    if (idemErr.code === "23505") {
      return new Response("OK (evento gia processato)", { status: 200 });
    }
    console.error("Idempotenza Stripe:", idemErr);
    // errore diverso dal duplicato: proseguiamo (meglio concedere che bloccare un pagamento valido)
  }

  // ─── Pro-rata Modello A ───
  const prorataApplicato  = session.metadata?.prorata_applicato === "true";
  const scadenzaAddonMeta = session.metadata?.scadenza_addon || null;

  if (!userId || !prodottoId) {
    console.error("Metadata mancanti nella sessione");
    return new Response("Missing metadata", { status: 400 });
  }

  // ─── Recupero metodo di pagamento da Stripe (per ricevuta) ───
  let metodoPagamento = "Carta";
  try {
    const pi = await stripe.paymentIntents.retrieve(
      session.payment_intent as string,
      { expand: ["payment_method"] }
    );
    const pm = pi.payment_method as Stripe.PaymentMethod;
    if (pm?.card) {
      metodoPagamento = `${pm.card.brand.toUpperCase()} **** ${pm.card.last4}`;
    }
  } catch (e) {
    console.error("Errore recupero PM:", e);
  }

  try {
    const { data: prodotto, error: prodErr } = await supabase
      .from("prodotti")
      .select("*")
      .eq("id", prodottoId)
      .single();

    if (prodErr || !prodotto) throw new Error("Prodotto non trovato");

    const { data: profilo } = await supabase
      .from("profiles")
      .select(`
        id, email, nome, cognome, studio_id, role, titolare_id, tipo_account,
        indirizzo, cap, ragione_sociale, sede_legale, tipo_soggetto
      `)
      .eq("id", userId)
      .single();

    // Calcola scadenza
    // Modello A: per add-on con pro-rata applicato, usa la scadenza del piano (passata in metadata).
    // Per tutto il resto (abbonamento, prodotti senza piano attivo), calcola now() + durata_mesi.
    let scadenza: string | null = null;
    if (prorataApplicato && scadenzaAddonMeta) {
      scadenza = scadenzaAddonMeta;
      console.log(`Modello A: scadenza add-on allineata al piano: ${scadenza}`);
    } else if (prodotto.durata_mesi) {
      const s = new Date();
      s.setMonth(s.getMonth() + prodotto.durata_mesi);
      scadenza = s.toISOString();
    }

    // ═══════════════════════════════════════════════════════════
    // SEAT ADD-ON
    // ═══════════════════════════════════════════════════════════
    if (prodottoTipo === "seat_addon") {
      if (!profilo?.studio_id) throw new Error("Seat add-on senza studio attivo");

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
          .eq("id", userId);
      }

      await supabase.from("audit_log").insert({
        studio_id:   profilo.studio_id,
        user_id:     userId,
        user_nome:   `${profilo.nome} ${profilo.cognome}`,
        azione:      "Seat add-on acquistato",
        entita_tipo: "prodotti",
        entita_id:   prodottoId,
        dettaglio:   `+${prodotto.posti ?? 1} posto/i — totale: ${nuoviPosti}`,
      });

      await inviaEmail(profilo.email, "seat-addon-attivato", {
        profilo: {
          nome:             profilo.nome,
          cognome:          profilo.cognome,
          email:            profilo.email,
          cf:               profilo.cf,
          indirizzo:        profilo.indirizzo,
          cap:              profilo.cap,
          comune:           profilo.comune,
          provincia:        profilo.provincia,
          ragione_sociale:  profilo.ragione_sociale,
          partita_iva:      profilo.partita_iva,
          sede_legale:      profilo.sede_legale,
        },
        prodotto: {
          nome:  prodotto.nome,
          posti: prodotto.posti ?? 1,
        },
        nuoviPosti: nuoviPosti,
        pagamento: {
          data:    new Date().toLocaleDateString("it-IT"),
          metodo:  metodoPagamento,
          importo: prodotto.prezzo.toFixed(2).replace(".", ","),
          valuta:  "CHF",
        },
        app_url: Deno.env.get("APP_URL"),
      });
    }

    // ═══════════════════════════════════════════════════════════
    // CLIENTI ADD-ON
    // Alza il limite di clienti registrabili dello studio.
    // Modello A: scadenza allineata al piano. Limite azzerato a scadenza piano
    // (gestito da check-scadenze.ts).
    // ═══════════════════════════════════════════════════════════
    else if (prodottoTipo === "clienti_addon") {
      const clientiExtra = prodotto.limite_clienti ?? 0;
      if (clientiExtra <= 0) throw new Error("Clienti add-on senza limite configurato");

      // Risolvi proprietario: l'add-on punta sempre al titolare/singolo,
      // anche se chi clicca è un collaboratore.
      const propId = profilo?.titolare_id ?? userId;

      const { data: propProfilo } = await supabase
        .from("profiles")
        .select(`
          id, email, nome, cognome, studio_id,
          indirizzo, cap, ragione_sociale, sede_legale,
          limite_clienti_extra
        `)
        .eq("id", propId)
        .single();

      if (!propProfilo) throw new Error("Proprietario clienti_addon non trovato");

      // Somma: limite extra esistente + nuovo pacchetto
      const nuovoTotaleExtra = (propProfilo.limite_clienti_extra ?? 0) + clientiExtra;

      await supabase
        .from("profiles")
        .update({ limite_clienti_extra: nuovoTotaleExtra })
        .eq("id", propId);

      // Audit log
      if (propProfilo.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id:   propProfilo.studio_id,
          user_id:     userId,
          user_nome:   `${profilo?.nome} ${profilo?.cognome}`,
          azione:      "Clienti add-on acquistato",
          entita_tipo: "prodotti",
          entita_id:   prodottoId,
          dettaglio:   `+${clientiExtra} clienti — totale extra: ${nuovoTotaleExtra}${scadenza ? ` — scade il ${new Date(scadenza).toLocaleDateString("it-IT")}` : ''}`,
        });
      }

      await inviaEmail(propProfilo.email, "clienti-addon-attivato", {
        profilo: {
          nome:             propProfilo.nome,
          cognome:          propProfilo.cognome,
          email:            propProfilo.email,
          cf:               propProfilo.cf,
          indirizzo:        propProfilo.indirizzo,
          cap:              propProfilo.cap,
          comune:           propProfilo.comune,
          provincia:        propProfilo.provincia,
          ragione_sociale:  propProfilo.ragione_sociale,
          partita_iva:      propProfilo.partita_iva,
          sede_legale:      propProfilo.sede_legale,
        },
        prodotto: {
          nome:          prodotto.nome,
          clienti_extra: clientiExtra,
        },
        nuovoTotaleExtra,
        scadenza: scadenza ? new Date(scadenza).toLocaleDateString("it-IT") : null,
        pagamento: {
          data:    new Date().toLocaleDateString("it-IT"),
          metodo:  metodoPagamento,
          importo: prodotto.prezzo.toFixed(2).replace(".", ","),
          valuta:  "CHF",
        },
        app_url: Deno.env.get("APP_URL"),
      });

      console.log(`✅ Clienti add-on attivato: +${clientiExtra} per ${propId} → totale extra ${nuovoTotaleExtra}`);
    }

    // ═══════════════════════════════════════════════════════════
    // ABBONAMENTO PROFESSIONISTA (avvocato / fiduciario / progettista)
    // ═══════════════════════════════════════════════════════════
    else if (prodottoTipo === "abbonamento") {
      const posti       = prodotto.posti ?? 1;
      const tipoAccount = posti === 1 ? "singolo" : "titolare";

      const studioData = {
        piano_id:               prodottoId,
        posti_totali:           posti,
        posti_usati:            1,
        include_banca_dati:     prodotto.include_banca_dati,
        include_monetizzazione: prodotto.include_monetizzazione,
        scadenza,
        stato:                  "attivo",
        stripe_sub_id:          session.payment_intent as string,
      };

      // limite_clienti_piano: cache dal prodotto piano. Azzerato da check-scadenze a scadenza.
      // limite_clienti_extra: azzerato qui perché un nuovo piano resetta tutto (Modello A puro).
      const profiloUpdate = {
        tipo_account:           tipoAccount,
        piano_id:               prodottoId,
        abbonamento_tipo:       prodotto.nome,
        abbonamento_scadenza:   scadenza,
        abbonamento_stato:      "attivo",
        grazia_fino_al:         null,
        spazio_gb_piano:        prodotto.spazio_gb ?? 0,
        posti_acquistati:       posti,
        limite_clienti_piano:   prodotto.limite_clienti ?? 0,
        limite_clienti_extra:   0,
        include_banca_dati:     prodotto.include_banca_dati ?? false,
        include_monetizzazione: prodotto.include_monetizzazione ?? false,
      };

      if (profilo?.studio_id) {
        await supabase
          .from("studios")
          .update(studioData)
          .eq("id", profilo.studio_id);

        await supabase
          .from("profiles")
          .update(profiloUpdate)
          .eq("id", userId);
      } else {
        const nomeStudio = posti === 1
          ? `Studio di ${profilo?.nome} ${profilo?.cognome}`
          : "Il mio studio";

        const { data: nuovoStudio, error: studioErr } = await supabase
          .from("studios")
          .insert({ ...studioData, nome: nomeStudio, titolare_id: userId })
          .select()
          .single();

        if (studioErr || !nuovoStudio) throw new Error("Errore creazione studio");

        // Il ruolo assegnato dipende dalla destinazione del prodotto:
        // target_role = 'avvocato' | 'fiduciario' | 'progettista'.
        // Fallback difensivo ad 'avvocato'.
        const ruoloDaProdotto =
          (prodotto.target_role === "fiduciario" ||
           prodotto.target_role === "avvocato" ||
           prodotto.target_role === "progettista")
            ? prodotto.target_role
            : "avvocato";

        await supabase
          .from("profiles")
          .update({
            ...profiloUpdate,
            studio_id: nuovoStudio.id,
            role:      ruoloDaProdotto,
          })
          .eq("id", userId);

        await supabase.from("studio_members").insert({
          studio_id:    nuovoStudio.id,
          user_id:      userId,
          ruolo_studio: "titolare",
          visibilita:   "tutto",
          is_active:    true,
          joined_at:    new Date().toISOString(),
        });
      }

      // ─── Crediti AI mensili inclusi nel piano (tipo='piano', scadono dopo 1 mese) ───
      if (prodotto.crediti_ai_mensili > 0) {
        const inizioPeriodo = new Date();
        const finePeriodo   = new Date();
        finePeriodo.setMonth(finePeriodo.getMonth() + 1);

        const studioIdCrediti = profilo?.studio_id ?? (
          await supabase.from("profiles").select("studio_id").eq("id", userId).single()
        ).data?.studio_id;

        await supabase.from("crediti_ai").insert({
          user_id:        userId,
          studio_id:      studioIdCrediti ?? null,
          tipo:           "piano",
          crediti_totali: prodotto.crediti_ai_mensili,
          crediti_usati:  0,
          periodo_inizio: inizioPeriodo.toISOString(),
          periodo_fine:   finePeriodo.toISOString(),
        });
      }

      // Audit log
      const studioIdLog = profilo?.studio_id ?? (
        await supabase.from("profiles").select("studio_id").eq("id", userId).single()
      ).data?.studio_id;

      if (studioIdLog) {
        await supabase.from("audit_log").insert({
          studio_id:   studioIdLog,
          user_id:     userId,
          user_nome:   `${profilo?.nome} ${profilo?.cognome}`,
          azione:      "Abbonamento acquistato",
          entita_tipo: "prodotti",
          entita_id:   prodottoId,
          dettaglio:   `${prodotto.nome} — CHF ${prodotto.prezzo} — ${posti} posto/i`,
        });
      }

      await inviaEmail(profilo?.email ?? "", "abbonamento-attivato", {
        profilo: {
          nome:             profilo?.nome,
          cognome:          profilo?.cognome,
          email:            profilo?.email,
          cf:               profilo?.cf,
          indirizzo:        profilo?.indirizzo,
          cap:              profilo?.cap,
          comune:           profilo?.comune,
          provincia:        profilo?.provincia,
          ragione_sociale:  profilo?.ragione_sociale,
          partita_iva:      profilo?.partita_iva,
          sede_legale:      profilo?.sede_legale,
        },
        prodotto: {
          nome:                   prodotto.nome,
          crediti_ai_mensili:     prodotto.crediti_ai_mensili ?? 0,
          spazio_gb:              prodotto.spazio_gb ?? 0,
          posti:                  prodotto.posti ?? 1,
          include_banca_dati:     prodotto.include_banca_dati,
          include_monetizzazione: prodotto.include_monetizzazione,
        },
        scadenza: scadenza ? new Date(scadenza).toLocaleDateString("it-IT") : null,
        pagamento: {
          data:    new Date().toLocaleDateString("it-IT"),
          metodo:  metodoPagamento,
          importo: prodotto.prezzo.toFixed(2).replace(".", ","),
          valuta:  "CHF",
        },
        app_url: Deno.env.get("APP_URL"),
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ACCESSO SINGOLO SENTENZA
    // ═══════════════════════════════════════════════════════════
    else if (prodottoTipo === "accesso_singolo") {
      const sentenzaId = session.metadata?.sentenza_id;
      if (sentenzaId) {
        const revenuePct  = prodotto.revenue_pct ?? 60;
        const quotaAutore = (prodotto.prezzo * revenuePct) / 100;

        await supabase.from("accessi_sentenze").insert({
          sentenza_id:   sentenzaId,
          acquirente_id: userId,
          prezzo:        prodotto.prezzo,
          quota_autore:  quotaAutore,
          stato:         "da_liquidare",
        });

        await supabase.rpc("increment_accessi_sentenza", { sid: sentenzaId });

        // Recupera dati sentenza per la ricevuta
        const { data: sentenza } = await supabase
          .from("sentenze")
          .select("tipo_provvedimento, organo, sezione, numero, anno, data_deposito, materia")
          .eq("id", sentenzaId)
          .single();

        const baseUrlSentenza = profilo?.role === "avvocato"
          ? `${Deno.env.get("APP_URL")}/banca-dati/avvocato/${sentenzaId}`
          : `${Deno.env.get("APP_URL")}/area/avvocato/${sentenzaId}`;

        await inviaEmail(profilo?.email ?? "", "accesso-sentenza", {
          profilo: {
            nome:             profilo?.nome,
            cognome:          profilo?.cognome,
            email:            profilo?.email,
            cf:               profilo?.cf,
            indirizzo:        profilo?.indirizzo,
            cap:              profilo?.cap,
            comune:           profilo?.comune,
            provincia:        profilo?.provincia,
            ragione_sociale:  profilo?.ragione_sociale,
            partita_iva:      profilo?.partita_iva,
            sede_legale:      profilo?.sede_legale,
          },
          sentenza: {
            tipo_provvedimento: sentenza?.tipo_provvedimento,
            organo:             sentenza?.organo,
            sezione:            sentenza?.sezione,
            numero:             sentenza?.numero,
            anno:               sentenza?.anno,
            data_deposito:      sentenza?.data_deposito
              ? new Date(sentenza.data_deposito).toLocaleDateString("it-IT")
              : null,
            materia:            sentenza?.materia,
          },
          sentenza_url: baseUrlSentenza,
          pagamento: {
            data:    new Date().toLocaleDateString("it-IT"),
            metodo:  metodoPagamento,
            importo: prodotto.prezzo.toFixed(2).replace(".", ","),
            valuta:  "CHF",
          },
          app_url: Deno.env.get("APP_URL"),
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CREDITI AI (top-up — NON scadono mai)
    // ═══════════════════════════════════════════════════════════
    else if (prodottoTipo === "crediti_ai") {
      const creditiAcquistati = prodotto.crediti_ai_mensili ?? 0;

      // Crea sempre un nuovo record tipo='topup' con periodo_fine=NULL.
      await supabase.from("crediti_ai").insert({
        user_id:        userId,
        studio_id:      profilo?.studio_id ?? null,
        tipo:           "topup",
        crediti_totali: creditiAcquistati,
        crediti_usati:  0,
        periodo_inizio: new Date().toISOString(),
        periodo_fine:   null,
      });

      await inviaEmail(profilo?.email ?? "", "crediti-ai-attivati", {
        profilo: {
          nome:             profilo?.nome,
          cognome:          profilo?.cognome,
          email:            profilo?.email,
          cf:               profilo?.cf,
          indirizzo:        profilo?.indirizzo,
          cap:              profilo?.cap,
          comune:           profilo?.comune,
          provincia:        profilo?.provincia,
          ragione_sociale:  profilo?.ragione_sociale,
          partita_iva:      profilo?.partita_iva,
          sede_legale:      profilo?.sede_legale,
        },
        prodotto: {
          nome: prodotto.nome,
        },
        creditiAcquistati: creditiAcquistati,
        pagamento: {
          data:    new Date().toLocaleDateString("it-IT"),
          metodo:  metodoPagamento,
          importo: prodotto.prezzo.toFixed(2).replace(".", ","),
          valuta:  "CHF",
        },
        app_url: Deno.env.get("APP_URL"),
      });
    }

    // ═══════════════════════════════════════════════════════════
    // SPAZIO ARCHIVIAZIONE (top-up GB extra con scadenza)
    // ═══════════════════════════════════════════════════════════
    else if (prodottoTipo === "spazio_archiviazione") {
      const gb         = prodotto.spazio_gb ?? 0;
      const durataMesi = prodotto.durata_mesi ?? 1;

      if (gb <= 0) throw new Error("Prodotto storage senza GB configurati");

      // Calcola periodo
      // Modello A: se pro-rata applicato, periodo_fine = scadenza piano.
      // Altrimenti: now() + durata_mesi (comportamento legacy).
      const inizioPeriodo = new Date();
      let finePeriodo: Date;
      if (prorataApplicato && scadenzaAddonMeta) {
        finePeriodo = new Date(scadenzaAddonMeta);
      } else {
        finePeriodo = new Date();
        finePeriodo.setMonth(finePeriodo.getMonth() + durataMesi);
      }

      // Risolvi proprietario_id: per storage punta sempre al titolare/singolo
      const { data: profProprietario } = await supabase
        .from("profiles")
        .select(`
          id, email, nome, cognome, studio_id,
          indirizzo, cap, ragione_sociale, sede_legale
        `)
        .eq("id", proprietarioId)
        .single();

      if (!profProprietario) throw new Error("Proprietario storage non trovato");

      // Crea transazione prima dello spazio per avere il riferimento
      const { data: nuovaTx } = await supabase
        .from("transazioni")
        .insert({
          user_id:           userId,
          studio_id:         profProprietario.studio_id ?? profilo?.studio_id ?? null,
          prodotto_id:       prodottoId,
          prodotto_nome:     prodotto.nome,
          tipo:              prodottoTipo,
          importo:           prodotto.prezzo,
          stripe_session_id: session.id,
          stripe_payment_id: session.payment_intent as string,
          stato:             "completato",
        })
        .select()
        .single();

      // Insert nel pool di storage
      await supabase.from("spazio_archiviazione").insert({
        proprietario_id: proprietarioId,
        gb,
        prodotto_id:     prodottoId,
        transazione_id:  nuovaTx?.id ?? null,
        periodo_inizio:  inizioPeriodo.toISOString(),
        periodo_fine:    finePeriodo.toISOString(),
      });

      // Audit log
      if (profProprietario.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id:   profProprietario.studio_id,
          user_id:     userId,
          user_nome:   `${profilo?.nome} ${profilo?.cognome}`,
          azione:      "Storage acquistato",
          entita_tipo: "spazio_archiviazione",
          entita_id:   prodottoId,
          dettaglio:   `+${gb} GB — scade il ${finePeriodo.toLocaleDateString("it-IT")}`,
        });
      }

      await inviaEmail(profProprietario.email ?? "", "spazio-di-archiviazione-attivato", {
        profilo: {
          nome:             profProprietario.nome,
          cognome:          profProprietario.cognome,
          email:            profProprietario.email,
          cf:               profProprietario.cf,
          indirizzo:        profProprietario.indirizzo,
          cap:              profProprietario.cap,
          comune:           profProprietario.comune,
          provincia:        profProprietario.provincia,
          ragione_sociale:  profProprietario.ragione_sociale,
          partita_iva:      profProprietario.partita_iva,
          sede_legale:      profProprietario.sede_legale,
        },
        prodotto: {
          nome:              prodotto.nome,
          gb_aggiunti:       gb,
          durata_mesi:       durataMesi,
          durata_singolare:  durataMesi === 1,
          scadenza:          finePeriodo.toLocaleDateString("it-IT"),
        },
        pagamento: {
          data:    new Date().toLocaleDateString("it-IT"),
          metodo:  metodoPagamento,
          importo: prodotto.prezzo.toFixed(2).replace(".", ","),
          valuta:  "CHF",
        },
        app_url: Deno.env.get("APP_URL"),
      });

      // Skip blocco transazione generico in fondo
      console.log(`✅ Webhook completato — utente ${userId}, prodotto ${prodotto.nome} (storage)`);
      return new Response("OK", { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════
    // SALVA TRANSAZIONE (per tutti i tipi tranne spazio_archiviazione)
    // ═══════════════════════════════════════════════════════════
    const studioIdTx = profilo?.studio_id ?? (
      await supabase.from("profiles").select("studio_id").eq("id", userId).single()
    ).data?.studio_id;

    await supabase.from("transazioni").insert({
      user_id:           userId,
      studio_id:         studioIdTx ?? null,
      prodotto_id:       prodottoId,
      prodotto_nome:     prodotto.nome,
      tipo:              prodottoTipo,
      importo:           prodotto.prezzo,
      stripe_session_id: session.id,
      stripe_payment_id: session.payment_intent as string,
      stato:             "completato",
    });

    console.log(`✅ Webhook completato — utente ${userId}, prodotto ${prodotto.nome}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Errore webhook:", err.message);
    // La concessione è fallita: rimuovo il record di idempotenza così il retry
    // di Stripe può rielaborare l'evento da capo (evita "pagato ma non concesso").
    await supabase.from("stripe_eventi_processati").delete().eq("event_id", event.id);
    return new Response("Error", { status: 500 });
  }
});
