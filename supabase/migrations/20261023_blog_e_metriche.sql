-- =====================================================================================
-- Blog «Novità» di lexum.ch e metriche dell'admin (23-10-2026).
--
-- 1. novita: gli articoli del blog, scritti dall'admin. Ogni articolo ha una riga per
--    lingua (it, de, fr), ognuna col suo indirizzo (/it/novita/<slug>, /de/novita/<slug>…);
--    le versioni dello stesso articolo hanno lo stesso «gruppo», così il sito le collega
--    (cambio lingua e hreflang per Google). Lettura pubblica dei soli pubblicati; il resto
--    solo l'admin. Pubblicazione programmata: il giro novita-programmati, 5 volte al giorno.
-- 2. impostazioni_sito: l'indirizzo del deploy hook di Vercel (solo admin), per far ripartire
--    il rilascio quando esce un articolo (la testata per Google la scrive il rilascio).
-- 3. Contatore delle visite della vetrina, come su lexum.it: giorno, indirizzo, canale di
--    provenienza, numero di visite. Niente cookie, niente IP, niente dati personali.
-- 4. admin_metriche_sito(giorni) e admin_percorso_iscritti(giorni): solo admin (is_admin()).
-- =====================================================================================

-- ── 1. Articoli ──────────────────────────────────────────────────────────────────────
create table if not exists public.novita (
  id uuid primary key default gen_random_uuid(),
  gruppo uuid not null default gen_random_uuid(),
  lingua text not null default 'it' check (lingua in ('it', 'de', 'fr')),
  slug text not null,
  titolo text not null,
  sommario text,
  contenuto text not null default '',
  copertina_url text,
  autore text,
  categoria text,
  stato text not null default 'bozza' check (stato in ('bozza', 'programmato', 'pubblicato')),
  programmato_il timestamptz,
  pubblicato_il timestamptz,
  instagram_url text,
  tiktok_url text,
  creato_da uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint novita_lingua_slug_unico unique (lingua, slug),
  constraint novita_gruppo_lingua_unico unique (gruppo, lingua),
  constraint novita_programmato_ha_data check (stato <> 'programmato' or programmato_il is not null),
  constraint novita_instagram_url_valido check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/'),
  constraint novita_tiktok_url_valido check (tiktok_url is null or tiktok_url ~ '^https://(www\.|vm\.)?tiktok\.com/')
);
create index if not exists novita_pubblicati_idx on public.novita (lingua, pubblicato_il desc) where stato = 'pubblicato';
create index if not exists novita_gruppo_idx on public.novita (gruppo);

-- Slug pulito (solo a-z 0-9 e trattini) e data di pubblicazione alla prima uscita
create or replace function public.novita_prepara()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.slug := regexp_replace(lower(trim(coalesce(new.slug, ''))), '\s+', '-', 'g');
  new.slug := regexp_replace(new.slug, '[^a-z0-9-]', '', 'g');
  new.slug := regexp_replace(new.slug, '-{2,}', '-', 'g');
  new.slug := trim(both '-' from new.slug);
  if new.slug = '' then
    new.slug := 'articolo-' || to_char(now(), 'YYYYMMDDHH24MISS');
  end if;
  if new.stato = 'pubblicato' and new.pubblicato_il is null then
    new.pubblicato_il := now();
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists novita_prepara on public.novita;
create trigger novita_prepara before insert or update on public.novita
  for each row execute function public.novita_prepara();

alter table public.novita enable row level security;
revoke all on public.novita from public, anon, authenticated;
grant select on public.novita to anon, authenticated;
grant insert, update, delete on public.novita to authenticated;

drop policy if exists novita_lettura_pubblicati on public.novita;
create policy novita_lettura_pubblicati on public.novita
  for select to anon, authenticated using (stato = 'pubblicato');
drop policy if exists novita_admin on public.novita;
create policy novita_admin on public.novita
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── 2. Impostazioni del sito (deploy hook) ───────────────────────────────────────────
create table if not exists public.impostazioni_sito (
  chiave text primary key,
  valore text,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references public.profiles(id) on delete set null
);
alter table public.impostazioni_sito enable row level security;
revoke all on public.impostazioni_sito from public, anon, authenticated;
grant select, insert, update, delete on public.impostazioni_sito to authenticated;
drop policy if exists impostazioni_sito_admin on public.impostazioni_sito;
create policy impostazioni_sito_admin on public.impostazioni_sito
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pubblica gli articoli programmati arrivati alla loro ora e fa ripartire il rilascio
create or replace function public.novita_pubblica_programmati()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  n    integer;
  hook text;
begin
  update public.novita
     set stato = 'pubblicato',
         pubblicato_il = coalesce(pubblicato_il, programmato_il, now())
   where stato = 'programmato' and programmato_il <= now();
  get diagnostics n = row_count;

  if n > 0 then
    select valore into hook from public.impostazioni_sito where chiave = 'vercel_deploy_hook';
    if hook ~ '^https://api\.vercel\.com/v[0-9]+/integrations/deploy/' then
      perform net.http_post(url := hook, body := '{}'::jsonb);
    end if;
  end if;
  return n;
end $$;
revoke all on function public.novita_pubblica_programmati() from public, anon, authenticated;

-- Alle 3, 8, 13, 18 e 23 ora svizzera (d'estate; d'inverno un'ora prima)
select cron.unschedule(jobid) from cron.job where jobname = 'novita-programmati';
select cron.schedule('novita-programmati', '0 1,6,11,16,21 * * *', 'select public.novita_pubblica_programmati()');

-- ── 3. Contatore delle visite ────────────────────────────────────────────────────────
create table if not exists public.visite_pagine (
  giorno date not null,
  percorso text not null,
  provenienza text not null,
  visite integer not null default 0,
  primary key (giorno, percorso, provenienza)
);
alter table public.visite_pagine enable row level security;
revoke all on public.visite_pagine from public, anon, authenticated;

create or replace function public.provenienza_visita(p_referrer text, p_utm text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select case
    when nullif(btrim(p_utm), '') is not null then
      left(regexp_replace(lower(btrim(p_utm)), '[^a-z0-9_.-]', '', 'g'), 30)
    when nullif(btrim(p_referrer), '') is null then 'diretto'
    else (
      with h as (select regexp_replace(lower(btrim(p_referrer)), '^www\.', '') as host)
      select case
        when host = 'interno' or host ~ '(^|\.)lexum\.(it|ch)$' then 'interno'
        when host ~ '(^|\.)instagram\.com$' then 'instagram'
        when host ~ '(^|\.)(facebook\.com|fb\.me|fb\.com)$' then 'facebook'
        when host ~ '(^|\.)(linkedin\.com|lnkd\.in)$' then 'linkedin'
        when host ~ '(^|\.)tiktok\.com$' then 'tiktok'
        when host ~ '(^|\.)(t\.co|x\.com|twitter\.com)$' then 'x'
        when host ~ '(^|\.)(whatsapp\.com|wa\.me)$' then 'whatsapp'
        when host ~ '(^|\.)google\.[a-z.]+$' or host ~ '^google\.' then 'google'
        when host ~ '(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.ch|startpage\.com)$' and host !~ '^mail\.' then 'altri motori'
        when host ~ '^(mail|webmail|posta)\.' or host ~ '(outlook\.(live|office)\.com|mail\.google\.com|bluewin\.ch|gmx\.(ch|net|de)|hispeed\.ch)$' then 'email'
        else left(regexp_replace(host, '[^a-z0-9.-]', '', 'g'), 60)
      end
      from h
    )
  end
$$;

create or replace function public.registra_visita(p_percorso text, p_referrer text default null, p_utm text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_percorso text := lower(split_part(split_part(coalesce(p_percorso, ''), '?', 1), '#', 1));
begin
  if v_percorso !~ '^/[a-z0-9/_.-]{0,199}$' or v_percorso ~ '\.\.' then
    return;
  end if;
  if length(v_percorso) > 1 then
    v_percorso := rtrim(v_percorso, '/');
  end if;
  insert into public.visite_pagine as v (giorno, percorso, provenienza, visite)
  values ((now() at time zone 'Europe/Zurich')::date, v_percorso, public.provenienza_visita(p_referrer, p_utm), 1)
  on conflict (giorno, percorso, provenienza) do update set visite = v.visite + 1;
end
$$;
revoke all on function public.registra_visita(text, text, text) from public;
grant execute on function public.registra_visita(text, text, text) to anon, authenticated;
revoke all on function public.provenienza_visita(text, text) from public, anon, authenticated;

-- ── 4a. Blog e sito ──────────────────────────────────────────────────────────────────
-- Gli articoli stanno in /<lingua>/novita/<slug>: ogni versione linguistica è una riga.
create or replace function public.admin_metriche_sito(p_giorni integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  oggi date := (now() at time zone 'Europe/Zurich')::date;
  dal date;
  dal_prima date;
  art constant text := '^/(it|de|fr)/novita/.+';
  ris jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo per gli amministratori' using errcode = '42501';
  end if;
  dal := case when p_giorni is null then date '2000-01-01' else oggi - (p_giorni - 1) end;
  dal_prima := case when p_giorni is null then null else dal - p_giorni end;

  select jsonb_build_object(
    'dal', dal,
    'al', oggi,
    'primo_giorno_contato', (select min(giorno) from visite_pagine),
    'visite', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal),
    'visite_periodo_prima', case when dal_prima is null then null else
        (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal_prima and giorno < dal) end,
    'ingressi', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal and provenienza <> 'interno'),
    'visite_articoli', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal and percorso ~ art),
    'per_lingua', coalesce((
        select jsonb_agg(jsonb_build_object('lingua', l, 'visite', tot) order by tot desc)
          from (select substring(percorso from '^/(it|de|fr)(/|$)') as l, sum(visite) as tot
                  from visite_pagine where giorno >= dal and percorso ~ '^/(it|de|fr)(/|$)'
                 group by 1) x), '[]'::jsonb),
    'per_giorno', coalesce((
        select jsonb_agg(jsonb_build_object('giorno', g, 'visite', coalesce(s, 0), 'articoli', coalesce(a, 0)) order by g)
          from (
            select gs::date as g,
                   (select sum(visite) from visite_pagine v where v.giorno = gs::date) as s,
                   (select sum(visite) from visite_pagine v where v.giorno = gs::date and v.percorso ~ art) as a
              from generate_series(greatest(dal, coalesce((select min(giorno) from visite_pagine), oggi)), oggi, interval '1 day') gs
          ) x), '[]'::jsonb),
    'pagine', coalesce((
        select jsonb_agg(jsonb_build_object('percorso', percorso, 'visite', tot) order by tot desc)
          from (select percorso, sum(visite) as tot from visite_pagine where giorno >= dal
                 group by percorso order by tot desc limit 20) p), '[]'::jsonb),
    'provenienze', coalesce((
        select jsonb_agg(jsonb_build_object('provenienza', provenienza, 'ingressi', tot) order by tot desc)
          from (select provenienza, sum(visite) as tot from visite_pagine where giorno >= dal and provenienza <> 'interno'
                 group by provenienza order by tot desc limit 15) p), '[]'::jsonb),
    'articoli', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'slug', n.slug, 'lingua', n.lingua, 'titolo', n.titolo, 'categoria', n.categoria,
                 'pubblicato_il', n.pubblicato_il,
                 'visite', coalesce(vp.periodo, 0), 'visite_totali', coalesce(vt.totali, 0),
                 'da_instagram', coalesce(vp.instagram, 0))
               order by coalesce(vp.periodo, 0) desc, n.pubblicato_il desc)
          from novita n
          left join lateral (select sum(visite) as periodo,
                                    sum(visite) filter (where provenienza = 'instagram') as instagram
                               from visite_pagine
                              where percorso = '/' || n.lingua || '/novita/' || n.slug and giorno >= dal) vp on true
          left join lateral (select sum(visite) as totali from visite_pagine
                              where percorso = '/' || n.lingua || '/novita/' || n.slug) vt on true
         where n.stato = 'pubblicato'), '[]'::jsonb),
    'articoli_programmati', (select count(*) from novita where stato = 'programmato')
  ) into ris;
  return ris;
end
$$;
revoke all on function public.admin_metriche_sito(integer) from public, anon;
grant execute on function public.admin_metriche_sito(integer) to authenticated;

-- ── 4b. Il percorso dei nuovi iscritti ───────────────────────────────────────────────
create or replace function public.admin_percorso_iscritti(p_giorni integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  oggi date := (now() at time zone 'Europe/Zurich')::date;
  dal date;
  ris jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo per gli amministratori' using errcode = '42501';
  end if;
  dal := case when p_giorni is null then date '2000-01-01' else oggi - (p_giorni - 1) end;

  with iscritti as (
    select u.id, u.created_at, (u.created_at at time zone 'Europe/Zurich')::date as giorno,
           u.email_confirmed_at is not null as confermata,
           coalesce(p.role, 'user') as ruolo,
           nullif(btrim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, '')), '') as nome,
           u.email,
           (select min(l.created_at) from public.lex_logs l
             where l.user_id = u.id and l.domanda is not null and l.domanda <> '') as prima_domanda,
           exists (select 1 from public.transazioni t
                    where t.user_id = u.id and t.stato = 'completato' and coalesce(t.tipo, '') <> 'gratuito') as acquisto
      from auth.users u
      left join public.profiles p on p.id = u.id
     where (u.created_at at time zone 'Europe/Zurich')::date >= dal
       and coalesce(p.role, 'user') not in ('admin', 'commerciale')
  )
  select jsonb_build_object(
    'dal', dal,
    'al', oggi,
    'tappe', jsonb_build_object(
        'iscritti', (select count(*) from iscritti),
        'email_confermata', (select count(*) from iscritti where confermata),
        'prima_domanda', (select count(*) from iscritti where prima_domanda is not null),
        'acquisto', (select count(*) from iscritti where acquisto)),
    'ore_alla_prima_domanda', (select round((percentile_cont(0.5) within group (
        order by extract(epoch from (prima_domanda - created_at)) / 3600))::numeric, 1)
        from iscritti where prima_domanda is not null),
    'per_ruolo', coalesce((
        select jsonb_agg(jsonb_build_object('ruolo', ruolo, 'iscritti', n, 'email_confermata', c,
                                            'prima_domanda', d, 'acquisto', a) order by n desc)
          from (select ruolo, count(*) n, count(*) filter (where confermata) c,
                       count(*) filter (where prima_domanda is not null) d, count(*) filter (where acquisto) a
                  from iscritti group by ruolo) r), '[]'::jsonb),
    'per_giorno', coalesce((
        select jsonb_agg(jsonb_build_object('giorno', g, 'iscritti', coalesce(n, 0)) order by g)
          from (select gs::date as g, (select count(*) from iscritti i where i.giorno = gs::date) as n
                  from generate_series(greatest(dal, coalesce((select min(giorno) from iscritti), oggi)), oggi, interval '1 day') gs) x),
        '[]'::jsonb),
    'ultimi', coalesce((
        select jsonb_agg(jsonb_build_object('id', id, 'quando', created_at, 'nome', nome, 'email', email, 'ruolo', ruolo,
                                            'email_confermata', confermata, 'prima_domanda', prima_domanda is not null,
                                            'acquisto', acquisto) order by created_at desc)
          from (select * from iscritti order by created_at desc limit 30) u), '[]'::jsonb)
  ) into ris;
  return ris;
end
$$;
revoke all on function public.admin_percorso_iscritti(integer) from public, anon;
grant execute on function public.admin_percorso_iscritti(integer) to authenticated;
