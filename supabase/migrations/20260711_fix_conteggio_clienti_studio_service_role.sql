-- conteggio_clienti_studio veniva chiamata da create-cliente col SERVICE ROLE
-- (nessun JWT utente): dentro la funzione auth.uid() è NULL, quindi la guardia
-- "p_proprietario_id <> get_titolare_id() AND NOT is_admin()" scattava SEMPRE e
-- sollevava 'accesso negato' → il frontend mostrava "Errore verifica limite
-- clienti" e la creazione del cliente falliva (400).
--
-- Fix: la guardia di proprietà va applicata SOLO alle chiamate con contesto
-- utente reale; il backend service-role è già fidato (ha autenticato l'utente e
-- calcolato proprietarioId server-side). auth.role()='service_role' bypassa la
-- guardia; anon/authenticated restano protetti come prima.
CREATE OR REPLACE FUNCTION public.conteggio_clienti_studio(p_proprietario_id uuid)
 RETURNS TABLE(conteggio integer, limite_piano integer, limite_extra integer, limite_totale integer, percentuale integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_conteggio integer; v_limite_piano integer; v_limite_extra integer; v_totale integer;
begin
  if auth.role() <> 'service_role'
     and p_proprietario_id is distinct from get_titolare_id()
     and not is_admin() then
    raise exception 'accesso negato';
  end if;
  select count(*)::integer into v_conteggio
  from profiles
  where role = 'cliente'
    and avvocato_id in (select p_proprietario_id union select id from profiles where titolare_id = p_proprietario_id);
  select coalesce(limite_clienti_piano, 0), coalesce(limite_clienti_extra, 0)
  into v_limite_piano, v_limite_extra from profiles where id = p_proprietario_id;
  v_totale := v_limite_piano + v_limite_extra;
  return query select v_conteggio, v_limite_piano, v_limite_extra, v_totale,
    case when v_totale = 0 then 0 else least(100, (v_conteggio * 100 / v_totale)) end::integer;
end;
$function$;
