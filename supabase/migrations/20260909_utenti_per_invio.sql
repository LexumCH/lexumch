-- Gemella di quella nel repo LEXUM (Italia), ma ADATTATA allo schema svizzero.
-- Tre differenze reali, verificate sullo schema prima di scriverla:
--   · CH non ha la tabella `ricerche_bancadati` (solo lex_logs e ricerche)
--   · `profiles` non ha la colonna `disattivato_at`
--   · la guardia admin qui e' testi_e_admin(), non questionario_e_admin()
-- Non "riallineare" i due file: gli schemi sono diversi davvero.
--
-- Riuso testi_e_admin() e non is_admin(): quest'ultima esiste in produzione
-- ma non in nessun file di migrations/, quindi non e' sotto controllo di
-- versione e non se ne conosce il search_path.
create or replace function public.utenti_per_invio()
returns table (id uuid, nome text, cognome text, email text, role text,
               ha_usato boolean, ha_crediti boolean, registrato date,
               e_di_prova boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  with usato as (
    select distinct l.user_id from public.lex_logs l       where l.user_id is not null
    union
    select distinct r.user_id from public.ricerche r       where r.user_id is not null
  )
  select p.id, p.nome, p.cognome, p.email, p.role,
         (p.id in (select u.user_id from usato u)),
         exists (select 1 from public.crediti_ai c where c.user_id = p.id),
         p.created_at::date,
         (lower(coalesce(p.nome,'') || coalesce(p.cognome,'') || p.email) like '%test%'
          or p.email like '%@lexum.ch'
          or p.email like '%@lexum.it')
    from public.profiles p
   where public.testi_e_admin()
     and p.email is not null
   order by lower(coalesce(nullif(btrim(p.cognome), ''), p.nome, p.email));
$$;

revoke execute on function public.utenti_per_invio() from public, anon;
grant  execute on function public.utenti_per_invio() to authenticated;
