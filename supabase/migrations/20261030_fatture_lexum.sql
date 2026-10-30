-- Fatture di Lexum ai suoi clienti (30-10-2026).
--
-- A ogni pagamento parte la ricevuta via email (com'era). Chi ha dato i dati aziendali (ragione sociale o
-- numero IDI, alla registrazione o nel Profilo) riceve anche la fattura PDF di Mosaico Experiences SA,
-- allegata alla stessa mail: la crea tagada-webhook. Numero per anno, CH-2026-0001 (lexum.it ha la sua
-- serie IT-2026-0001: stesso emittente, serie distinte). IVA, risposta dell'amministratore di Mosaico del
-- 30-10: 8,1% per i clienti in Svizzera, inclusa nel prezzo; nessuna IVA per i clienti fuori dalla Svizzera.

create table if not exists public.fatture_lexum (
  id            uuid primary key default gen_random_uuid(),
  anno          integer not null,
  progressivo   integer not null,
  numero        text not null unique,
  -- il pagamento da cui nasce: tagada:<ordine> (primo pagamento) o la chiave del rinnovo
  riferimento   text not null unique,
  -- resta anche se l'account si cancella: le fatture si conservano
  user_id       uuid references public.profiles(id) on delete set null,
  emessa_il     timestamptz not null default now(),
  cliente       jsonb not null,
  descrizione   text not null,
  totale        numeric(12,2) not null,
  imponibile    numeric(12,2) not null,
  iva_aliquota  numeric(5,2) not null default 0,
  iva_importo   numeric(12,2) not null default 0,
  valuta        text not null,
  pdf_path      text,
  unique (anno, progressivo)
);

alter table public.fatture_lexum enable row level security;

drop policy if exists fatture_lexum_proprie on public.fatture_lexum;
create policy fatture_lexum_proprie on public.fatture_lexum
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fatture_lexum_admin on public.fatture_lexum;
create policy fatture_lexum_admin on public.fatture_lexum
  for select to authenticated using (public.is_admin());

-- Le scrive solo il server (service_role, che salta la RLS)
revoke insert, update, delete on public.fatture_lexum from anon, authenticated;

-- Numero e importi, una volta sola per pagamento (un avviso ripetuto ridà la stessa fattura).
-- Il prezzo pagato è IVA inclusa: l'IVA si scorpora.
create or replace function public.fattura_lexum_crea(
  p_riferimento  text,
  p_user         uuid,
  p_cliente      jsonb,
  p_descrizione  text,
  p_totale       numeric,
  p_iva_aliquota numeric,
  p_valuta       text
) returns public.fatture_lexum
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anno integer := extract(year from (now() at time zone 'Europe/Zurich'))::integer;
  v_prog integer;
  v_iva  numeric(12,2);
  r      public.fatture_lexum;
begin
  perform pg_advisory_xact_lock(hashtext('fatture_lexum'), v_anno);

  select * into r from public.fatture_lexum where riferimento = p_riferimento;
  if found then
    return r;
  end if;

  select coalesce(max(progressivo), 0) + 1 into v_prog from public.fatture_lexum where anno = v_anno;
  v_iva := round(p_totale * p_iva_aliquota / (100 + p_iva_aliquota), 2);

  insert into public.fatture_lexum (anno, progressivo, numero, riferimento, user_id, cliente, descrizione,
                                    totale, imponibile, iva_aliquota, iva_importo, valuta)
  values (v_anno, v_prog, 'CH-' || v_anno || '-' || lpad(v_prog::text, 4, '0'), p_riferimento, p_user,
          p_cliente, p_descrizione, p_totale, p_totale - v_iva, p_iva_aliquota, v_iva, p_valuta)
  returning * into r;
  return r;
end $$;

revoke all on function public.fattura_lexum_crea(text, uuid, jsonb, text, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.fattura_lexum_crea(text, uuid, jsonb, text, numeric, numeric, text) to service_role;

-- I PDF: privati, ognuno legge solo la sua cartella (<user_id>/<numero>.pdf)
insert into storage.buckets (id, name, public)
values ('fatture-lexum', 'fatture-lexum', false)
on conflict (id) do nothing;

drop policy if exists fatture_lexum_pdf_proprie on storage.objects;
create policy fatture_lexum_pdf_proprie on storage.objects
  for select to authenticated
  using (bucket_id = 'fatture-lexum' and (storage.foldername(name))[1] = auth.uid()::text);

-- Registrazione: i dati aziendali per la fattura (facoltativi) passano dai metadata al profilo.
create or replace function public.crea_profilo_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, nome, cognome, studio, role, lingua, verification_status, created_at,
                               ragione_sociale, uid)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    nullif(new.raw_user_meta_data->>'studio', ''),
    'user',
    coalesce(new.raw_user_meta_data->>'lingua', 'it'),
    'none',
    now(),
    left(nullif(trim(new.raw_user_meta_data->>'ragione_sociale'), ''), 200),
    left(upper(nullif(trim(new.raw_user_meta_data->>'uid'), '')), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
