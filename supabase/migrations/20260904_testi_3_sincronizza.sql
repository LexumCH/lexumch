-- ============================================================================
-- Pannello "Testi" — sincronizzazione dal codice, lettura, ricerca
--
-- Il catalogo NON si scrive a mano: lo detta il codice. Il pannello legge i
-- file /locales/<lingua>/<ns>.json già serviti dal deploy corrente e li
-- riversa qui. Così, dopo ogni deploy che tocca i testi, una sincronizzazione
-- riallinea la base SENZA cancellare le modifiche fatte dal pannello.
-- ============================================================================

create or replace function public.testi_sincronizza_ns(
  p_ns        text,
  p_etichetta text,
  p_gruppo    text,
  p_ordine    int,
  p_voci      jsonb                    -- [{percorso, ordine, tipo, ...,  it, de, fr}]
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v          jsonb;
  k_id       bigint;
  lng        text;
  nuovo      text;
  esiste     boolean;
  v_val      text;
  v_file     text;
  n_nuove    int := 0;
  n_base     int := 0;    -- base aggiornata, nessuna modifica utente da difendere
  n_tenute   int := 0;    -- il codice è cambiato ma la TUA modifica ha la precedenza
  n_sparite  int := 0;
  percorsi   text[] := '{}';
begin
  if not public.testi_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;

  insert into public.testi_namespace (ns, etichetta, gruppo, ordine, aggiornato_il)
       values (p_ns, p_etichetta, p_gruppo, p_ordine, now())
  on conflict (ns) do update
     set etichetta = excluded.etichetta,
         gruppo    = excluded.gruppo,
         ordine    = excluded.ordine,
         aggiornato_il = now();

  for v in select * from jsonb_array_elements(p_voci) loop
    percorsi := percorsi || (v->>'percorso');

    insert into public.testi_chiave
      (ns, percorso, ordine, tipo, enum_valori, variabili, tag,
       obbligatoria, max_caratteri, array_padre, array_indice, attiva)
    values (
      p_ns,
      v->>'percorso',
      coalesce((v->>'ordine')::int, 0),
      coalesce(v->>'tipo', 'testo'),
      case when jsonb_typeof(v->'enum_valori') = 'array'
           then (select array_agg(x #>> '{}') from jsonb_array_elements(v->'enum_valori') x)
           else null end,
      coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(v->'variabili') x), '{}'),
      coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(v->'tag') x), '{}'),
      coalesce((v->>'obbligatoria')::boolean, true),
      coalesce((v->>'max_caratteri')::int, 1000),
      v->>'array_padre',
      (v->>'array_indice')::int,
      true)
    on conflict (ns, percorso) do update
       set ordine        = excluded.ordine,
           tipo          = excluded.tipo,
           enum_valori   = excluded.enum_valori,
           variabili     = excluded.variabili,
           tag           = excluded.tag,
           obbligatoria  = excluded.obbligatoria,
           max_caratteri = excluded.max_caratteri,
           array_padre   = excluded.array_padre,
           array_indice  = excluded.array_indice,
           attiva        = true
    returning id into k_id;

    foreach lng in array array['it','de','fr'] loop
      nuovo := v ->> lng;
      if nuovo is null then continue; end if;

      select true, valore, valore_file into esiste, v_val, v_file
        from public.testi_valore where chiave_id = k_id and lingua = lng;

      if not coalesce(esiste, false) then
        insert into public.testi_valore (chiave_id, lingua, valore, valore_file)
             values (k_id, lng, nuovo, nuovo);
        n_nuove := n_nuove + 1;

      elsif v_val is not distinct from v_file then
        -- Nessuna modifica dal pannello: la base si aggiorna e basta.
        if v_file is distinct from nuovo then
          update public.testi_valore
             set valore = nuovo, valore_file = nuovo, aggiornato_il = now()
           where chiave_id = k_id and lingua = lng;
          n_base := n_base + 1;
        end if;

      else
        -- C'è una modifica fatta dal pannello: VINCE LEI. Sposto solo la base.
        if v_file is distinct from nuovo then
          update public.testi_valore set valore_file = nuovo
           where chiave_id = k_id and lingua = lng;
          n_tenute := n_tenute + 1;
        end if;
      end if;
    end loop;
  end loop;

  -- Frasi non più presenti nel codice: si SPENGONO, non si cancellano mai.
  -- Se domani tornano, la modifica che avevi fatto è ancora lì.
  update public.testi_chiave set attiva = false
   where ns = p_ns and attiva and not (percorso = any(percorsi));
  get diagnostics n_sparite = row_count;

  return jsonb_build_object('ns', p_ns, 'nuove', n_nuove, 'base_aggiornata', n_base,
                            'modifiche_tenute', n_tenute, 'sparite', n_sparite);
end $$;

-- ── Riepilogo per la barra laterale ─────────────────────────────────────────
create or replace function public.testi_riepilogo()
returns table (ns text, etichetta text, gruppo text, ordine int,
               n_frasi bigint, n_modificate bigint, n_da_tradurre bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select n.ns, n.etichetta, n.gruppo, n.ordine,
         count(*) filter (where v.lingua = 'it'),
         count(*) filter (where v.valore is distinct from v.valore_file),
         count(*) filter (where v.lingua <> 'it' and btrim(v.valore) = '' and c.obbligatoria)
    from public.testi_namespace n
    join public.testi_chiave  c on c.ns = n.ns and c.attiva
    join public.testi_valore  v on v.chiave_id = c.id
   group by n.ns, n.etichetta, n.gruppo, n.ordine
   order by n.gruppo, n.ordine, n.etichetta;
$$;

-- ── Le frasi di un namespace, già affiancate nelle tre lingue ───────────────
create or replace function public.testi_elenco(p_ns text)
returns table (id bigint, percorso text, ordine int, tipo text, enum_valori text[],
               variabili text[], tag text[], obbligatoria boolean, max_caratteri int,
               array_padre text, array_indice int,
               it text, de text, fr text,
               it_file text, de_file text, fr_file text,
               it_visto timestamptz, de_visto timestamptz, fr_visto timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.percorso, c.ordine, c.tipo, c.enum_valori, c.variabili, c.tag,
         c.obbligatoria, c.max_caratteri, c.array_padre, c.array_indice,
         max(v.valore)      filter (where v.lingua='it'),
         max(v.valore)      filter (where v.lingua='de'),
         max(v.valore)      filter (where v.lingua='fr'),
         max(v.valore_file) filter (where v.lingua='it'),
         max(v.valore_file) filter (where v.lingua='de'),
         max(v.valore_file) filter (where v.lingua='fr'),
         max(v.aggiornato_il) filter (where v.lingua='it'),
         max(v.aggiornato_il) filter (where v.lingua='de'),
         max(v.aggiornato_il) filter (where v.lingua='fr')
    from public.testi_chiave c
    join public.testi_valore v on v.chiave_id = c.id
   where c.ns = p_ns and c.attiva
   group by c.id
   order by c.ordine, c.percorso;
$$;

-- ── La porta d'ingresso: cerca una frase ovunque, in tutte le lingue ────────
create or replace function public.testi_cerca(p_testo text, p_gruppo text default null,
                                              p_limite int default 300)
returns table (id bigint, ns text, etichetta text, gruppo text, percorso text,
               it text, de text, fr text, dove text)
language sql stable security definer set search_path = public, pg_temp as $$
  with m as (
    select c.id, c.ns,
           max(v.valore) filter (where v.lingua='it') as it,
           max(v.valore) filter (where v.lingua='de') as de,
           max(v.valore) filter (where v.lingua='fr') as fr,
           string_agg(distinct v.lingua, ',' order by v.lingua)
             filter (where v.valore ilike '%' || p_testo || '%') as dove,
           bool_or(v.valore ilike '%' || p_testo || '%')          as colpito,
           c.percorso, c.ordine
      from public.testi_chiave c
      join public.testi_valore v on v.chiave_id = c.id
      join public.testi_namespace n on n.ns = c.ns
     where c.attiva and (p_gruppo is null or n.gruppo = p_gruppo)
     group by c.id, c.ns, c.percorso, c.ordine
  )
  select m.id, m.ns, n.etichetta, n.gruppo, m.percorso, m.it, m.de, m.fr, m.dove
    from m join public.testi_namespace n on n.ns = m.ns
   where m.colpito or m.percorso ilike '%' || p_testo || '%'
   order by n.gruppo, n.ordine, m.ordine
   limit greatest(1, least(p_limite, 1000));
$$;

-- ── Tutte le frasi: serve al pannello per riscrivere i file del repo ────────
create or replace function public.testi_tutti()
returns table (ns text, percorso text, ordine int, it text, de text, fr text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.ns, c.percorso, c.ordine,
         max(v.valore) filter (where v.lingua='it'),
         max(v.valore) filter (where v.lingua='de'),
         max(v.valore) filter (where v.lingua='fr')
    from public.testi_chiave c
    join public.testi_valore v on v.chiave_id = c.id
   where c.attiva
   group by c.ns, c.percorso, c.ordine
   order by c.ns, c.ordine;
$$;

create or replace function public.testi_segna_export()
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.testi_stato set ultimo_export = now(), aggiornato_il = now()
   where id and public.testi_e_admin();
$$;

-- ============================================================================
-- RLS e privilegi
--
-- anon NON riceve alcun grant: PostgREST non arriva nemmeno a valutare la RLS.
-- La superficie pubblica di questa funzione è UN FILE JSON su Storage, che
-- contiene testo di marketing già visibile sul sito.
-- Il revoke va fatto da PUBLIC, non da anon: anon eredita da PUBLIC.
-- ============================================================================
alter table public.testi_namespace enable row level security;
alter table public.testi_chiave    enable row level security;
alter table public.testi_valore    enable row level security;
alter table public.testi_storico   enable row level security;
alter table public.testi_stato     enable row level security;

drop policy if exists testi_namespace_admin on public.testi_namespace;
drop policy if exists testi_chiave_admin    on public.testi_chiave;
drop policy if exists testi_valore_admin    on public.testi_valore;
drop policy if exists testi_storico_admin   on public.testi_storico;
drop policy if exists testi_stato_admin     on public.testi_stato;

create policy testi_namespace_admin on public.testi_namespace for all
  using (public.testi_e_admin()) with check (public.testi_e_admin());
create policy testi_chiave_admin on public.testi_chiave for all
  using (public.testi_e_admin()) with check (public.testi_e_admin());
create policy testi_valore_admin on public.testi_valore for all
  using (public.testi_e_admin()) with check (public.testi_e_admin());
create policy testi_stato_admin on public.testi_stato for all
  using (public.testi_e_admin()) with check (public.testi_e_admin());
-- Lo storico lo scrivono solo le funzioni security definer: dal client è in sola lettura.
create policy testi_storico_admin on public.testi_storico for select
  using (public.testi_e_admin());

revoke all on public.testi_namespace, public.testi_chiave, public.testi_valore,
              public.testi_storico,   public.testi_stato from public;
grant select, insert, update, delete
   on public.testi_namespace, public.testi_chiave, public.testi_valore, public.testi_stato
   to authenticated;
grant select on public.testi_storico to authenticated;

revoke execute on function public.testi_valida(bigint, text)                     from public;
revoke execute on function public.testi_overlay(text)                            from public;
revoke execute on function public.testi_salva(bigint, text, text, timestamptz)   from public;
revoke execute on function public.testi_ripristina(bigint, text)                 from public;
revoke execute on function public.testi_imposta_attivo(boolean)                  from public;
revoke execute on function public.testi_sincronizza_ns(text, text, text, int, jsonb) from public;
revoke execute on function public.testi_riepilogo()                              from public;
revoke execute on function public.testi_elenco(text)                             from public;
revoke execute on function public.testi_cerca(text, text, int)                   from public;
revoke execute on function public.testi_tutti()                                  from public;
revoke execute on function public.testi_segna_export()                           from public;
revoke execute on function public.testi_e_admin()                                from public;

grant execute on function public.testi_valida(bigint, text)                      to authenticated;
grant execute on function public.testi_overlay(text)                             to authenticated;
grant execute on function public.testi_salva(bigint, text, text, timestamptz)    to authenticated;
grant execute on function public.testi_ripristina(bigint, text)                  to authenticated;
grant execute on function public.testi_imposta_attivo(boolean)                   to authenticated;
grant execute on function public.testi_sincronizza_ns(text, text, text, int, jsonb) to authenticated;
grant execute on function public.testi_riepilogo()                               to authenticated;
grant execute on function public.testi_elenco(text)                              to authenticated;
grant execute on function public.testi_cerca(text, text, int)                    to authenticated;
grant execute on function public.testi_tutti()                                   to authenticated;
grant execute on function public.testi_segna_export()                            to authenticated;
grant execute on function public.testi_e_admin()                                 to authenticated;
