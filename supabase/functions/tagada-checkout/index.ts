// supabase/functions/tagada-checkout/index.ts — Lexum CH, 28-10-2026
//
// Apre la cassa Tagadapay (negozio «Lexum CH», in franchi) al posto di stripe-checkout: Stripe ha
// chiuso il conto. Il prezzo lo decide il server con le stesse regole di stripe-checkout CH:
//   - upgrade di un piano attivo: nuovo piano meno la parte non usata di quello attuale (a giorni);
//   - add-on con piano attivo (pro-rata, Modello A): mesi rimasti fino alla scadenza del piano,
//     arrotondati per eccesso; la scadenza dell'add-on si allinea al piano (la usa tagada-webhook).
// Nome, descrizione e prezzo vengono dal listino di Lexum (admin → Prodotti), con il nome nella lingua
// dell'utente (it/de/fr). Tagadapay incassa solo articoli del suo catalogo: l'articolo giusto lo crea
// questa funzione al momento, se non c'è già (tagada_varianti). Così un prezzo cambiato nell'admin
// vale subito, e upgrade e pro-rata hanno il loro articolo all'importo esatto.
//
// Ogni passaggio alla cassa crea una riga in tagada_ordini; il suo id viaggia nell'indirizzo come
// lexum_tx e torna nella notifica order/paid (tagada-webhook), che accredita l'acquisto.
// Codice sconto (28-10-2026): il server lo riverifica (codice_sconto_esito) e toglie la percentuale dal
// prezzo di oggi, upgrade e pro-rata compresi; l'ordine lo ricorda e a pagamento fatto l'uso si conta da
// sé (trigger su tagada_ordini).
// Abbonamenti dei privati (28-10-2026, come su Lexum IT): un prodotto con rinnovo_automatico si vende con un
// prezzo ricorrente mensile, così Tagadapay ne fa un abbonamento che si rinnova da sé (tagada-webhook segue
// rinnovi e disdette). Un piano più grande sostituisce quello in corso; per uno più piccolo si passa da
// «Gestisci» (abbonamento-gestisci). L'archivio in più dei privati si compra solo con un piano attivo.
// Corpo come stripe-checkout: { prodotto_id, is_upgrade?, consenso_recesso?, codice_sconto?, success_url?, cancel_url? }
// Risposta: { ok: true, url } | { ok: false, error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const API = "https://api.tagada.io/api/public/v1";
// Le sessioni di cassa stanno sull'API interna, quella che usa la pagina di pagamento di Tagadapay.
const API_SESSIONI = "https://api.tagada.io/api/v1/checkout-sessions";
const CHIAVE = Deno.env.get("TAGADA_API_KEY") ?? "";
// Negozio «Lexum CH» (in franchi) e il suo percorso di cassa pubblicato: senza, Tagadapay manda a
// store-unavailable.
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_7daf3c25b192";
const PERCORSO = Deno.env.get("TAGADA_FUNNEL_ID") ?? "funnelv2_9ed3cb28b055";
const PAGINA_CASSA = Deno.env.get("TAGADA_CHECKOUT_URL") ?? "https://simple-checkout--store_7daf3c25b192.cdn.tagada.io/checkout";
const IMMAGINE = Deno.env.get("TAGADA_IMAGE_URL")
  ?? "https://th9llsxpg16laoh4.public.blob.vercel-storage.com/orgs/acc_fd2f3cace1a8/images/06fb4d52-96ce-4aa1-9b10-ec83ee83db36";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://www.lexum.ch").replace(/\/+$/, "");
const VALUTA = "CHF";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

type Lingua = "it" | "de" | "fr";
function linguaDi(l: unknown): Lingua {
  return l === "de" || l === "fr" ? l : "it";
}

const TESTI: Record<Lingua, {
  soloPrivati: string; recesso: string; nonDisponibile: string; accessoScaduto: string;
  soloPiuCaro: string; mese: (n: number) => string;
  datiMancanti: (campi: string) => string; campi: Record<string, string>;
  sconto: (percentuale: string, codice: string) => string; motiviSconto: Record<string, string>;
  mensile: string; archivioSoloPrivati: string; archivioSenzaPiano: string; giaTuo: string; piuPiccolo: string;
}> = {
  it: {
    soloPrivati: "Il Piano Personale è riservato agli utenti privati.",
    recesso: "Per procedere spunta la casella sull'attivazione immediata.",
    nonDisponibile: "Il pagamento online non è disponibile in questo momento. Riprova tra qualche minuto.",
    accessoScaduto: "Accesso scaduto: entra di nuovo.",
    soloPiuCaro: "Con il piano attuale ancora attivo puoi passare solo a un piano più caro.",
    mese: (n) => (n === 1 ? "1 mese" : `${n} mesi`),
    datiMancanti: (c) => `Per acquistare completa i dati di fatturazione nel profilo: ${c}.`,
    campi: { nome: "Nome", cognome: "Cognome", indirizzo: "Indirizzo", cap: "NPA", citta: "Località", paese: "Paese" },
    sconto: (p, c) => `sconto ${p}% (${c})`,
    motiviSconto: {
      inesistente: "Codice sconto non valido.",
      non_ancora: "Questo codice sconto non è ancora valido.",
      scaduto: "Questo codice sconto è scaduto.",
      esaurito: "Questo codice sconto è esaurito.",
      gia_usato: "Hai già usato questo codice sconto.",
      non_tuo: "Questo codice sconto è riservato a un'altra persona.",
      non_per_te: "Questo codice sconto non vale per il tuo account.",
      non_vale: "Questo codice sconto non vale per questo acquisto.",
    },
    mensile: "Si rinnova ogni mese finché non lo disdici.",
    archivioSoloPrivati: "L'archivio in più al mese è per gli utenti privati.",
    archivioSenzaPiano: "Per aggiungere archivio serve un abbonamento attivo.",
    giaTuo: "Hai già questo abbonamento: lo trovi in «Gestisci».",
    piuPiccolo: "Per passare a un piano più piccolo usa «Gestisci»: parte alla fine del mese già pagato.",
  },
  de: {
    soloPrivati: "Der Persönliche Plan ist Privatpersonen vorbehalten.",
    recesso: "Um fortzufahren, setzen Sie das Häkchen bei der sofortigen Aktivierung.",
    nonDisponibile: "Die Online-Zahlung ist im Moment nicht verfügbar. Bitte versuchen Sie es in ein paar Minuten erneut.",
    accessoScaduto: "Sitzung abgelaufen: Bitte melden Sie sich erneut an.",
    soloPiuCaro: "Solange Ihr aktueller Plan aktiv ist, können Sie nur zu einem teureren Plan wechseln.",
    mese: (n) => (n === 1 ? "1 Monat" : `${n} Monate`),
    datiMancanti: (c) => `Um zu kaufen, ergänzen Sie die Rechnungsangaben im Profil: ${c}.`,
    campi: { nome: "Vorname", cognome: "Nachname", indirizzo: "Adresse", cap: "PLZ", citta: "Ort", paese: "Land" },
    sconto: (p, c) => `${p}% Rabatt (${c})`,
    motiviSconto: {
      inesistente: "Ungültiger Rabattcode.",
      non_ancora: "Dieser Rabattcode ist noch nicht gültig.",
      scaduto: "Dieser Rabattcode ist abgelaufen.",
      esaurito: "Dieser Rabattcode ist aufgebraucht.",
      gia_usato: "Sie haben diesen Rabattcode bereits verwendet.",
      non_tuo: "Dieser Rabattcode ist für eine andere Person reserviert.",
      non_per_te: "Dieser Rabattcode gilt nicht für Ihr Konto.",
      non_vale: "Dieser Rabattcode gilt nicht für diesen Kauf.",
    },
    mensile: "Verlängert sich jeden Monat, bis Sie kündigen.",
    archivioSoloPrivati: "Das monatliche Zusatzarchiv ist für Privatpersonen.",
    archivioSenzaPiano: "Für zusätzliches Archiv braucht es ein aktives Abonnement.",
    giaTuo: "Sie haben dieses Abonnement bereits: Sie finden es unter «Verwalten».",
    piuPiccolo: "Für einen kleineren Plan nutzen Sie «Verwalten»: er beginnt am Ende des bezahlten Monats.",
  },
  fr: {
    soloPrivati: "Le Plan personnel est réservé aux particuliers.",
    recesso: "Pour continuer, cochez la case relative à l'activation immédiate.",
    nonDisponibile: "Le paiement en ligne n'est pas disponible pour le moment. Réessayez dans quelques minutes.",
    accessoScaduto: "Session expirée : reconnectez-vous.",
    soloPiuCaro: "Tant que votre plan actuel est actif, vous ne pouvez passer qu'à un plan plus cher.",
    mese: (n) => `${n} mois`,
    datiMancanti: (c) => `Pour acheter, complétez les données de facturation dans le profil : ${c}.`,
    campi: { nome: "Prénom", cognome: "Nom", indirizzo: "Adresse", cap: "NPA", citta: "Localité", paese: "Pays" },
    sconto: (p, c) => `remise ${p} % (${c})`,
    motiviSconto: {
      inesistente: "Code de réduction non valable.",
      non_ancora: "Ce code de réduction n'est pas encore valable.",
      scaduto: "Ce code de réduction a expiré.",
      esaurito: "Ce code de réduction est épuisé.",
      gia_usato: "Vous avez déjà utilisé ce code de réduction.",
      non_tuo: "Ce code de réduction est réservé à une autre personne.",
      non_per_te: "Ce code de réduction n'est pas valable pour votre compte.",
      non_vale: "Ce code de réduction n'est pas valable pour cet achat.",
    },
    mensile: "Se renouvelle chaque mois jusqu'à résiliation.",
    archivioSoloPrivati: "L'archive supplémentaire mensuelle est réservée aux particuliers.",
    archivioSenzaPiano: "Pour ajouter de l'archive, il faut un abonnement actif.",
    giaTuo: "Vous avez déjà cet abonnement : vous le trouvez sous « Gérer ».",
    piuPiccolo: "Pour passer à un plan plus petit, utilisez « Gérer » : il commence à la fin du mois déjà payé.",
  },
};

// Nome e descrizione dell'articolo nella lingua dell'utente. Il listino CH ha i nomi in italiano:
// per tedesco e francese si compongono dal tipo, con le parole che il sito usa già.
// deno-lint-ignore no-explicit-any
function articolo(p: any, lingua: Lingua, upgrade: boolean, prorataMesi: number | null): { nome: string; testo: string } {
  const t = TESTI[lingua];
  const crediti = p.crediti_ai_mensili ?? 0;
  const gb = p.spazio_gb ?? 0;
  const mesi = Number(p.durata_mesi ?? 0) || 0;
  const posti = p.posti ?? 1;
  let nome = p.nome;
  let testo = p.nome;
  if (p.tipo === "crediti_ai") {
    const lampo = p.codice === "lampo";
    nome = lingua === "de" ? (lampo ? `Blitzpaket · ${crediti} Lex-AI-Credits` : `${crediti} Lex-AI-Credits`)
      : lingua === "fr" ? (lampo ? `Pack Éclair · ${crediti} crédits Lex AI` : `${crediti} crédits Lex AI`)
      : (lampo ? p.nome : `${crediti} crediti Lex AI`);
    testo = lingua === "de" ? `${crediti} Recherchen mit Lex AI auf Lexum. Das Guthaben verfällt nicht.`
      : lingua === "fr" ? `${crediti} recherches avec Lex AI sur Lexum. Les crédits n'expirent pas.`
      : `${crediti} ricerche con Lex AI su Lexum. I crediti non scadono.`;
  } else if (p.tipo === "piano_privato") {
    const extra = p.codice === "piano_personale_plus" ? " Plus" : p.codice === "piano_personale_pro" ? " Pro" : "";
    nome = (lingua === "de" ? "Persönlicher Plan" : lingua === "fr" ? "Plan personnel" : "Piano Personale") + extra;
    testo = lingua === "de" ? `${crediti} Lex-AI-Credits · ${gb} GB Archiv · ${t.mese(mesi || 1)}`
      : lingua === "fr" ? `${crediti} crédits Lex AI · ${gb} GB d'archive · ${t.mese(mesi || 1)}`
      : `${crediti} crediti Lex AI · ${gb} GB di archivio · ${t.mese(mesi || 1)}`;
  } else if (p.tipo === "abbonamento") {
    testo = lingua === "de" ? `${posti} ${posti === 1 ? "Zugang" : "Zugänge"} · ${crediti} Lex-AI-Credits pro Monat · ${gb} GB · ${t.mese(mesi)}`
      : lingua === "fr" ? `${posti} ${posti === 1 ? "accès" : "accès"} · ${crediti} crédits Lex AI par mois · ${gb} GB · ${t.mese(mesi)}`
      : `${posti} ${posti === 1 ? "accesso" : "accessi"} · ${crediti} crediti Lex AI al mese · ${gb} GB · ${t.mese(mesi)}`;
  } else if (p.tipo === "seat_addon") {
    testo = lingua === "de" ? `+${posti} ${posti === 1 ? "Zugang" : "Zugänge"} für die Kanzlei`
      : lingua === "fr" ? `+${posti} accès pour le cabinet`
      : `+${posti} ${posti === 1 ? "accesso" : "accessi"} allo studio`;
  } else if (p.tipo === "spazio_archiviazione") {
    testo = lingua === "de" ? `+${gb} GB Archiv · ${t.mese(mesi || 12)}`
      : lingua === "fr" ? `+${gb} GB d'archive · ${t.mese(mesi || 12)}`
      : `+${gb} GB di archivio · ${t.mese(mesi || 12)}`;
  } else if (p.tipo === "clienti_addon") {
    testo = lingua === "de" ? `+${p.limite_clienti ?? 0} Klienten in der Kanzlei`
      : lingua === "fr" ? `+${p.limite_clienti ?? 0} clients dans le cabinet`
      : `+${p.limite_clienti ?? 0} clienti registrabili nello studio`;
  }
  if (upgrade) {
    nome = lingua === "de" ? `Upgrade auf ${nome}` : lingua === "fr" ? `Passage à ${nome}` : `Upgrade a ${nome}`;
    testo += lingua === "de" ? ". Preis des neuen Plans abzüglich des nicht genutzten Teils des aktuellen."
      : lingua === "fr" ? ". Prix du nouveau plan moins la partie non utilisée du plan actuel."
      : ". Prezzo del nuovo piano meno la parte non usata di quello attuale.";
  }
  if (p.rinnovo_automatico === true) testo += `. ${t.mensile}`;
  if (prorataMesi) {
    testo += lingua === "de" ? ` · ${t.mese(prorataMesi)} bis zur Verlängerung des Plans`
      : lingua === "fr" ? ` · ${t.mese(prorataMesi)} jusqu'au renouvellement du plan`
      : ` · ${t.mese(prorataMesi)} fino al rinnovo del piano`;
  }
  return { nome, testo };
}

// UPGRADE A GIORNI (08-10-2026), identico a stripe-checkout CH e alla pagina Studio del sito.
const MS_GIORNO = 24 * 60 * 60 * 1000;
function creditoUpgrade(prezzoAttuale: number, durataMesiAttuale: number, scadenzaAttuale: string): number {
  const fine = new Date(scadenzaAttuale);
  const inizio = new Date(fine.getTime());
  inizio.setUTCMonth(inizio.getUTCMonth() - Math.trunc(Number(durataMesiAttuale) || 0));
  const giorniPeriodo = Math.round((fine.getTime() - inizio.getTime()) / MS_GIORNO);
  if (!(prezzoAttuale > 0) || !(giorniPeriodo > 0)) return 0;
  const giorni = Math.min(giorniPeriodo, Math.max(0, Math.ceil((fine.getTime() - Date.now()) / MS_GIORNO)));
  return Math.min(prezzoAttuale, Math.round(prezzoAttuale * giorni / giorniPeriodo * 100) / 100);
}

// PRO-RATA Modello A, identico a stripe-checkout CH: mesi rimasti fino alla scadenza del piano,
// per eccesso (30,44 giorni al mese), almeno uno.
const TIPI_PRORATA = new Set(["seat_addon", "clienti_addon", "spazio_archiviazione"]);
function prorata(prezzoListino: number, durataMesi: number, scadenzaPiano: string) {
  const diffGiorni = (new Date(scadenzaPiano).getTime() - Date.now()) / MS_GIORNO;
  const mesiResidui = Math.max(1, Math.ceil(diffGiorni / 30.44));
  const mesiPieni = durataMesi || 12;
  return { importo: Math.round(prezzoListino / mesiPieni * mesiResidui * 100) / 100, mesi: mesiResidui };
}

async function impronta(testo: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo)));
  return Array.from(h.slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// La variante Tagadapay per questo nome a questo importo: dalla tabella, oppure creata adesso.
// deno-lint-ignore no-explicit-any
async function variante(prodotto: any, importo: number, nome: string, testo: string): Promise<string> {
  const ricorrente = prodotto.rinnovo_automatico === true;
  const centesimi = Math.round(importo * 100);
  const chiave = `${prodotto.id}:${centesimi}:${await impronta(`${nome}\n${testo}${ricorrente ? "\nmensile" : ""}`)}`;

  const { data: nota } = await supabase.from("tagada_varianti").select("variant_id").eq("chiave", chiave).maybeSingle();
  if (nota?.variant_id) return nota.variant_id;

  const res = await fetch(`${API}/products/create`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: NEGOZIO,
      name: nome,
      description: testo,
      active: true,
      isShippable: false,
      isTaxable: false,
      variants: [{
        name: nome, active: true, default: true, sku: chiave, imageUrl: IMMAGINE, grams: 0,
        prices: [ricorrente
          ? { currencyOptions: { [VALUTA]: { amount: centesimi } }, recurring: true, interval: "month", intervalCount: Math.max(1, Math.round(Number(prodotto.durata_mesi ?? 1))), default: true }
          : { currencyOptions: { [VALUTA]: { amount: centesimi } }, recurring: false, default: true }],
      }],
    }),
  });
  const corpo = await res.json().catch(() => null);
  const id = corpo?.variants?.[0]?.id;
  if (!res.ok || !id) throw new Error(`Articolo Tagadapay non creato: HTTP ${res.status} ${JSON.stringify(corpo).slice(0, 300)}`);

  // Due pagamenti insieme possono crearlo due volte: vale il primo registrato.
  // il prezzo mensile serve a abbonamento-gestisci per far partire un piano più piccolo a fine mese
  const priceId = ricorrente ? (corpo?.variants?.[0]?.prices?.[0]?.id ?? null) : null;
  await supabase.from("tagada_varianti").insert({ chiave, variant_id: id, prodotto_id: prodotto.id, importo, price_id: priceId }).select().maybeSingle();
  const { data: registrata } = await supabase.from("tagada_varianti").select("variant_id").eq("chiave", chiave).single();
  return registrata?.variant_id ?? id;
}

// Il ritorno dopo il pagamento: solo pagine di lexum.ch.
function ritornoSicuro(u: unknown): string {
  try {
    const url = new URL(String(u));
    const sito = new URL(APP_URL);
    if (url.hostname.replace(/^www\./, "") === sito.hostname.replace(/^www\./, "")) return url.toString();
  } catch { /* non è un indirizzo */ }
  return `${APP_URL}/`;
}

// Indirizzo di fatturazione sulla sessione di cassa (28-10-2026). Il parametro shippingAddress di
// /checkout/init non basta: la pagina di Tagadapay lo chiedeva di nuovo («Completa l'indirizzo di
// fatturazione»). Lo impostiamo come fa la sua pagina: stessa chiamata del kit @tagadapay/headless-sdk
// (updateAddress), con i suoi nomi dei campi (address1, postal), autorizzata dal token della sessione.
async function impostaIndirizzo(urlCassa: string, email: string, campi: Record<string, string>): Promise<void> {
  const u = new URL(urlCassa);
  const checkoutToken = u.searchParams.get("checkoutToken");
  const token = u.searchParams.get("token");
  if (!checkoutToken || !token) throw new Error("sessione senza token");
  const h = { "Content-Type": "application/json", "x-cms-token": token };
  const sessione = await fetch(`${API_SESSIONI}/${checkoutToken}/v2?skipAsyncWait=false`, { headers: h }).then((r) => r.json());
  const id = sessione?.checkoutSession?.id;
  if (!id) throw new Error("sessione non trovata");
  const indirizzo = Object.fromEntries(Object.entries(campi).filter(([, v]) => v));
  const r = await fetch(`${API_SESSIONI}/${id}/customer-and-session-info`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      checkoutSessionId: id,
      customerData: { email },
      shippingAddress: indirizzo,
      billingAddress: indirizzo,
      differentBillingAddress: false,
    }),
  });
  if (!r.ok) throw new Error(`indirizzo HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  let lingua: Lingua = "it";
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return risposta({ ok: false, error: TESTI.it.accessoScaduto }, 401);

    const { prodotto_id, is_upgrade, consenso_recesso, codice_sconto, success_url } = await req.json().catch(() => ({}));
    if (!prodotto_id) return risposta({ ok: false, error: "prodotto_id obbligatorio" }, 400);

    const { data: prodotto } = await supabase
      .from("prodotti").select("*").eq("id", prodotto_id).eq("attivo", true).maybeSingle();
    if (!prodotto) return risposta({ ok: false, error: "Prodotto non trovato o non attivo" }, 404);

    const { data: profilo } = await supabase
      .from("profiles")
      .select("email, nome, cognome, role, lingua, piano_id, abbonamento_scadenza, telefono, indirizzo, numero_civico, cap, citta, cantone, paese")
      .eq("id", user.id).single();
    lingua = linguaDi(profilo?.lingua);
    const t = TESTI[lingua];

    if (prodotto.tipo === "piano_privato" && profilo?.role !== "user") {
      return risposta({ ok: false, error: t.soloPrivati }, 400);
    }
    // Abbonamenti dei privati: archivio in più solo con un piano attivo; un piano alla volta
    const ricorrente = prodotto.rinnovo_automatico === true;
    const archivioPrivato = prodotto.tipo === "spazio_archiviazione" && prodotto.target_role === "user";
    if (archivioPrivato) {
      if (profilo?.role !== "user") return risposta({ ok: false, error: t.archivioSoloPrivati }, 400);
      const conPiano = !!profilo?.piano_id && !!profilo?.abbonamento_scadenza && new Date(profilo.abbonamento_scadenza) > new Date();
      if (!conPiano) return risposta({ ok: false, error: t.archivioSenzaPiano }, 400);
    }
    let sostituisce: string | null = null;
    if (prodotto.tipo === "piano_privato" && ricorrente) {
      const { data: inCorso } = await supabase
        .from("abbonamenti").select("id, prodotto_id, prodotti:prodotto_id(prezzo)")
        .eq("user_id", user.id).eq("genere", "piano").neq("stato", "chiuso").gt("periodo_fine", new Date().toISOString())
        .order("periodo_fine", { ascending: false }).limit(1).maybeSingle();
      if (inCorso) {
        if (inCorso.prodotto_id === prodotto.id) return risposta({ ok: false, error: t.giaTuo }, 400);
        // deno-lint-ignore no-explicit-any
        if (Number(prodotto.prezzo) < Number((inCorso as any).prodotti?.prezzo ?? 0)) return risposta({ ok: false, error: t.piuPiccolo }, 400);
        sostituisce = inCorso.id;
      }
    }
    // I privati chiedono l'attivazione immediata (Termini, punto 4.6): senza la spunta non si paga.
    if (profilo?.role === "user" && consenso_recesso !== true) {
      return risposta({ ok: false, error: t.recesso }, 400);
    }
    // Dati di fatturazione: li chiede Lexum prima del pulsante (src/lib/datiFatturazione.jsx, stessi campi);
    // qui il controllo vale per chi arriva da una pagina vecchia o dall'app.
    const CAMPI = ["nome", "cognome", "indirizzo", "cap", "citta", "paese"] as const;
    // deno-lint-ignore no-explicit-any
    const mancanti = CAMPI.filter((k) => !String((profilo as any)?.[k] ?? "").trim());
    if (mancanti.length) {
      return risposta({ ok: false, error: t.datiMancanti(mancanti.map((k) => t.campi[k]).join(", ")), campi_mancanti: mancanti }, 400);
    }

    // Prezzo di oggi, con le regole di stripe-checkout CH
    let importo = Number(prodotto.prezzo);
    let upgrade = false;
    let prorataMesi: number | null = null;
    let scadenzaAddon: string | null = null;
    const pianoAttivo = !!profilo?.abbonamento_scadenza && new Date(profilo.abbonamento_scadenza) > new Date();
    if (is_upgrade && prodotto.tipo === "abbonamento" && profilo?.piano_id && pianoAttivo) {
      const { data: attuale } = await supabase
        .from("prodotti").select("prezzo, tipo, durata_mesi").eq("id", profilo.piano_id).single();
      if (attuale?.tipo === "abbonamento") {
        if (Number(prodotto.prezzo) <= Number(attuale.prezzo)) return risposta({ ok: false, error: t.soloPiuCaro }, 400);
        importo = Math.round((Number(prodotto.prezzo) - creditoUpgrade(Number(attuale.prezzo), Number(attuale.durata_mesi), profilo.abbonamento_scadenza)) * 100) / 100;
        upgrade = true;
      }
    } else if (TIPI_PRORATA.has(prodotto.tipo) && pianoAttivo && !ricorrente && !archivioPrivato) {
      const p = prorata(Number(prodotto.prezzo), Number(prodotto.durata_mesi ?? 12), profilo.abbonamento_scadenza);
      importo = p.importo;
      prorataMesi = p.mesi;
      scadenzaAddon = profilo.abbonamento_scadenza;
    }
    if (!(importo > 0)) return risposta({ ok: false, error: t.soloPiuCaro }, 400);
    if (!CHIAVE || !NEGOZIO || !PERCORSO || !PAGINA_CASSA) throw new Error("Cassa Tagadapay CH non configurata");

    // Codice sconto: si riverifica qui (la pagina lo ha già controllato, ma decide il server)
    let sconto: { id: string; codice: string; percentuale: number } | null = null;
    const importoListino = importo;
    if (typeof codice_sconto === "string" && codice_sconto.trim()) {
      const { data: esito, error: scErr } = await supabase.rpc("codice_sconto_esito", {
        p_user: user.id, p_codice: codice_sconto.trim(), p_prodotti: [prodotto.id],
      });
      if (scErr) throw new Error(`Verifica codice sconto: ${scErr.message}`);
      if (!esito?.valido) {
        return risposta({ ok: false, error: t.motiviSconto[esito?.motivo] ?? t.motiviSconto.inesistente, codice_sconto: esito?.motivo ?? "inesistente" }, 400);
      }
      sconto = { id: esito.codice_id, codice: esito.codice, percentuale: Number(esito.percentuale) };
      importo = Math.round(importo * (100 - sconto.percentuale)) / 100;
      if (!(importo > 0)) return risposta({ ok: false, error: t.motiviSconto.non_vale }, 400);
    }

    const art = articolo(prodotto, lingua, upgrade, prorataMesi);
    const nome = sconto ? `${art.nome} · ${t.sconto(sconto.percentuale.toLocaleString(lingua === "de" ? "de-CH" : lingua === "fr" ? "fr-CH" : "it-CH"), sconto.codice)}` : art.nome;
    const testo = art.testo;
    const variantId = await variante(prodotto, importo, nome, testo);

    const { data: ordine, error: ordErr } = await supabase.from("tagada_ordini").insert({
      user_id: user.id,
      prodotto_id: prodotto.id,
      variant_id: variantId,
      importo,
      valuta: VALUTA,
      lingua,
      prorata: prorataMesi != null,
      scadenza_addon: scadenzaAddon,
      consenso_recesso: consenso_recesso === true,
      consenso_il: consenso_recesso === true ? new Date().toISOString() : null,
      codice_sconto_id: sconto?.id ?? null,
      sconto_percentuale: sconto?.percentuale ?? null,
      importo_listino: sconto ? importoListino : null,
      sostituisce_abbonamento_id: sostituisce,
    }).select("id").single();
    if (ordErr || !ordine) throw new Error(`Ordine non creato: ${ordErr?.message}`);

    const q = new URLSearchParams({
      storeId: NEGOZIO,
      funnelId: PERCORSO,
      checkoutUrl: PAGINA_CASSA,
      items: JSON.stringify([{ variantId, quantity: 1 }]),
      currency: VALUTA,
      locale: lingua,
      returnUrl: ritornoSicuro(success_url),
      lexum_tx: ordine.id,
    });
    if (profilo?.email ?? user.email) q.set("customerEmail", profilo?.email ?? user.email!);
    if (profilo?.nome) q.set("customerFirstName", profilo.nome);
    if (profilo?.cognome) q.set("customerLastName", profilo.cognome);
    if (profilo?.telefono) q.set("customerPhone", profilo.telefono);
    // Il paese anche nell'indirizzo della cassa: l'indirizzo completo lo imposta impostaIndirizzo()
    const paese = (String(profilo?.paese ?? "").trim().toUpperCase() || "CH").slice(0, 2);
    q.set("shippingCountry", paese);

    // /checkout/init risponde con un rinvio (307) alla pagina di pagamento: lo leggiamo qui, così un
    // negozio chiuso o una cassa non pubblicata si vedono subito invece che nel browser.
    const init = await fetch(`${API}/checkout/init?${q}`, { redirect: "manual" });
    const url = init.headers.get("location");
    if (init.status >= 300 && init.status < 400 && url && !url.includes("store-unavailable")) {
      try {
        await impostaIndirizzo(url, profilo?.email ?? user.email ?? "", {
          firstName: profilo?.nome ?? "",
          lastName: profilo?.cognome ?? "",
          phone: profilo?.telefono ?? "",
          address1: [profilo?.indirizzo, profilo?.numero_civico].filter(Boolean).join(" "),
          city: profilo?.citta ?? "",
          state: String(profilo?.cantone ?? "").toUpperCase(),
          postal: profilo?.cap ?? "",
          country: paese,
        });
      } catch (e) {
        // Senza indirizzo la pagina di Tagadapay lo chiede: si paga lo stesso, ma lo annotiamo.
        console.error("tagada-checkout indirizzo:", e instanceof Error ? e.message : e);
      }
      return risposta({ ok: true, url });
    }
    const corpo = await init.text().catch(() => "");
    await supabase.from("tagada_ordini").update({ stato: "errore", errore: `init HTTP ${init.status} ${url ?? ""} ${corpo.slice(0, 200)}` }).eq("id", ordine.id);
    console.error("tagada-checkout init:", init.status, url, corpo.slice(0, 300));
    return risposta({ ok: false, error: t.nonDisponibile }, 502);
  } catch (e) {
    console.error("tagada-checkout:", e instanceof Error ? e.message : e);
    return risposta({ ok: false, error: TESTI[lingua].nonDisponibile }, 500);
  }
});
