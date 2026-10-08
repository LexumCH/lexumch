-- 08-10-2026 (controllo di sicurezza, fase 2): tutti gli id dell'assistenza, senza leggere i profili.
--
-- get_supporto_admin_id() dà il primo amministratore (destinatario delle nuove richieste). La pagina
-- Assistenza dei professionisti riconosceva i ticket con Lexum dal ruolo del profilo dell'altra
-- parte, che qui non è leggibile: i ticket con Lexum non si sarebbero riconosciuti. Questa funzione
-- dà solo gli id di tutti gli amministratori, come in Italia.

create or replace function public.get_supporto_admin_ids()
returns uuid[]
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(id order by created_at asc), '{}')
  from public.profiles
  where role = 'admin'
$function$;

revoke all on function public.get_supporto_admin_ids() from public, anon;
grant execute on function public.get_supporto_admin_ids() to authenticated, service_role;
