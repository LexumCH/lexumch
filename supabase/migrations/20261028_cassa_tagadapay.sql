-- Cassa Tagadapay per lexum.ch (28-10-2026), come su Lexum IT: Stripe ha chiuso il conto. Negozio
-- «Lexum CH» in franchi sullo stesso account Tagadapay (Mosaico Experiences SA). Le funzioni
-- tagada-checkout, tagada-webhook e tagada-admin usano queste tabelle con la chiave di servizio;
-- agli utenti non sono visibili (RLS senza policy).

-- Un ordine aperto per ogni passaggio alla cassa: l'id viaggia nell'indirizzo della cassa (lexum_tx)
-- e torna nella notifica order/paid. Su CH c'è anche il pro-rata degli add-on (Modello A): la scadenza
-- allineata al piano si decide alla cassa e il webhook la ritrova qui.
create table if not exists public.tagada_ordini (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  prodotto_id       uuid references public.prodotti(id) on delete set null,
  variant_id        text not null,
  importo           numeric(10,2) not null,
  valuta            text not null default 'CHF',
  lingua            text not null default 'it',
  prorata           boolean not null default false,
  scadenza_addon    timestamptz,
  consenso_recesso  boolean not null default false,
  consenso_il       timestamptz,
  stato             text not null default 'aperto'
                    check (stato in ('aperto', 'pagato', 'rimborsato', 'errore')),
  order_id          text unique,
  payment_id        text,
  errore            text,
  creato_il         timestamptz not null default now(),
  pagato_il         timestamptz
);
create index if not exists tagada_ordini_utente_idx on public.tagada_ordini (user_id, creato_il desc);
alter table public.tagada_ordini enable row level security;

-- Registro delle notifiche ricevute: una sola elaborazione per evento.
create table if not exists public.tagada_eventi (
  event_id     text primary key,
  tipo         text,
  payload      jsonb,
  ricevuto_il  timestamptz not null default now()
);
alter table public.tagada_eventi enable row level security;

-- Gli articoli del catalogo Tagadapay li crea tagada-checkout al momento, dal listino (nome nella
-- lingua dell'utente, descrizione, prezzo; upgrade e pro-rata all'importo esatto). Qui si ricorda la
-- variante di ogni combinazione: chiave = prodotto + centesimi + impronta di nome e descrizione.
create table if not exists public.tagada_varianti (
  chiave       text primary key,
  variant_id   text not null,
  prodotto_id  uuid references public.prodotti(id) on delete set null,
  importo      numeric(10,2) not null,
  creato_il    timestamptz not null default now()
);
alter table public.tagada_varianti enable row level security;

grant all on public.tagada_ordini, public.tagada_eventi, public.tagada_varianti to service_role;
revoke all on public.tagada_ordini, public.tagada_eventi, public.tagada_varianti from anon, authenticated;

-- Segreto delle notifiche: lo restituisce Tagadapay quando si registra l'indirizzo del webhook e
-- finisce direttamente nel Vault. Solo la chiave di servizio lo legge.
create or replace function public.tagada_webhook_segreto_salva(p_segreto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'tagada_webhook_secret';
  if v_id is null then
    perform vault.create_secret(p_segreto, 'tagada_webhook_secret', 'Segreto delle notifiche Tagadapay (Lexum CH)');
  else
    perform vault.update_secret(v_id, p_segreto);
  end if;
end;
$$;

create or replace function public.tagada_webhook_segreto()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'tagada_webhook_secret';
$$;

revoke all on function public.tagada_webhook_segreto_salva(text) from public, anon, authenticated;
revoke all on function public.tagada_webhook_segreto() from public, anon, authenticated;
grant execute on function public.tagada_webhook_segreto_salva(text) to service_role;
grant execute on function public.tagada_webhook_segreto() to service_role;
