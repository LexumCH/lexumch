-- ============================================================================
-- Pannello "Testi" — chiusura di anon
--
-- PERCHE' ESISTE QUESTA MIGRAZIONE, e non basta il revoke nella numero 3:
-- Supabase applica ALTER DEFAULT PRIVILEGES sullo schema public, quindi ogni
-- tabella nuova nasce con TUTTI i privilegi concessi DIRETTAMENTE ad anon,
-- authenticated e service_role. Un "revoke ... from public" non tocca una
-- concessione diretta: dopo la migrazione 3, anon aveva ancora
-- DELETE/INSERT/SELECT/UPDATE su tutte e 5 le tabelle e EXECUTE su tutte e 12
-- le funzioni. Verificato sul database vero, non dedotto.
--
-- Le funzioni di lettura sono security definer, quindi scavalcano la RLS:
-- testi_tutti/elenco/cerca/riepilogo avrebbero restituito l'intero corpus
-- (vetrina E backend) a chiunque avesse la chiave pubblica dell'app.
--
-- Due strati, perche' il primo puo' essere riconcesso per sbaglio dalla
-- prossima migrazione che tocca lo schema:
--   1. revoca esplicita da anon
--   2. la guardia testi_e_admin() DENTRO le funzioni di lettura
--
-- NB: "create or replace function" ricrea i privilegi di default (EXECUTE a
-- PUBLIC): dopo ogni replace le revoche vanno rifatte. E' il motivo per cui
-- in fondo al file si revoca di nuovo.
-- ============================================================================

revoke all on public.testi_namespace, public.testi_chiave, public.testi_valore,
              public.testi_storico,   public.testi_stato from anon;

revoke execute on function public.testi_valida(bigint, text)                         from anon;
revoke execute on function public.testi_overlay(text)                                from anon;
revoke execute on function public.testi_salva(bigint, text, text, timestamptz)       from anon;
revoke execute on function public.testi_ripristina(bigint, text)                     from anon;
revoke execute on function public.testi_imposta_attivo(boolean)                      from anon;
revoke execute on function public.testi_sincronizza_ns(text, text, text, int, jsonb) from anon;
revoke execute on function public.testi_riepilogo()                                  from anon;
revoke execute on function public.testi_elenco(text)                                 from anon;
revoke execute on function public.testi_cerca(text, text, int)                       from anon;
revoke execute on function public.testi_tutti()                                      from anon;
revoke execute on function public.testi_segna_export()                               from anon;
revoke execute on function public.testi_e_admin()                                    from anon;

-- Secondo strato: la guardia dentro le funzioni di lettura.
-- testi_overlay resta senza guardia di proposito (restituisce solo cio' che e'
-- gia' pubblico sul sito), ma non e' piu' eseguibile da anon.

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
   where public.testi_e_admin()
   group by n.ns, n.etichetta, n.gruppo, n.ordine
   order by n.gruppo, n.ordine, n.etichetta;
$$;

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
   where c.ns = p_ns and c.attiva and public.testi_e_admin()
   group by c.id
   order by c.ordine, c.percorso;
$$;

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
           bool_or(v.valore ilike '%' || p_testo || '%') as colpito,
           c.percorso, c.ordine
      from public.testi_chiave c
      join public.testi_valore v on v.chiave_id = c.id
      join public.testi_namespace n on n.ns = c.ns
     where c.attiva and public.testi_e_admin()
       and (p_gruppo is null or n.gruppo = p_gruppo)
     group by c.id, c.ns, c.percorso, c.ordine
  )
  select m.id, m.ns, n.etichetta, n.gruppo, m.percorso, m.it, m.de, m.fr, m.dove
    from m join public.testi_namespace n on n.ns = m.ns
   where m.colpito or m.percorso ilike '%' || p_testo || '%'
   order by n.gruppo, n.ordine, m.ordine
   limit greatest(1, least(p_limite, 1000));
$$;

create or replace function public.testi_tutti()
returns table (ns text, percorso text, ordine int, it text, de text, fr text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.ns, c.percorso, c.ordine,
         max(v.valore) filter (where v.lingua='it'),
         max(v.valore) filter (where v.lingua='de'),
         max(v.valore) filter (where v.lingua='fr')
    from public.testi_chiave c
    join public.testi_valore v on v.chiave_id = c.id
   where c.attiva and public.testi_e_admin()
   group by c.ns, c.percorso, c.ordine
   order by c.ns, c.ordine;
$$;

revoke execute on function public.testi_riepilogo()            from public, anon;
revoke execute on function public.testi_elenco(text)           from public, anon;
revoke execute on function public.testi_cerca(text, text, int) from public, anon;
revoke execute on function public.testi_tutti()                from public, anon;
grant  execute on function public.testi_riepilogo()            to authenticated;
grant  execute on function public.testi_elenco(text)           to authenticated;
grant  execute on function public.testi_cerca(text, text, int) to authenticated;
grant  execute on function public.testi_tutti()                to authenticated;
