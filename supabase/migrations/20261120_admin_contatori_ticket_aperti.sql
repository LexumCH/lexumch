-- 20-11-2026 (APPLICATA sul DB CH): «Ticket aperti» nella Dashboard admin contava solo i ticket senza
-- destinatario, ma chi scrive a Lexum lo indirizza a un admin (in Italia restava a 0 con un ticket appena
-- arrivato). Ora conta le conversazioni con Lexum ancora aperte: senza destinatario, scritte a un admin,
-- o aperte da Lexum. La lista Assistenza dell'admin cerca gli stessi ticket (src/pages/admin/Assistenza.jsx).
CREATE OR REPLACE FUNCTION public.admin_contatori()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'accesso negato' USING ERRCODE = '42501';
  END IF;

  WITH p AS (
    SELECT coalesce(role, 'nessuno') AS role, verification_status,
           stato_abbonamento_calcolato(abbonamento_scadenza, grazia_fino_al, abbonamento_tipo) AS stato
    FROM profiles
  )
  SELECT jsonb_build_object(
    'totale', (SELECT count(*) FROM p),
    -- ogni ruolo presente: la somma fa sempre il totale
    'per_ruolo', (SELECT coalesce(jsonb_object_agg(role, n), '{}'::jsonb)
                    FROM (SELECT role, count(*) AS n FROM p GROUP BY role) x),
    -- attivi = abbonamento valido oggi (attivo o in scadenza)
    'professionisti', (SELECT coalesce(jsonb_object_agg(role, s), '{}'::jsonb) FROM (
        SELECT role, jsonb_build_object(
          'totale',      count(*),
          'attivi',      count(*) FILTER (WHERE stato IN ('attivo', 'in_scadenza')),
          'in_scadenza', count(*) FILTER (WHERE stato = 'in_scadenza'),
          'in_grazia',   count(*) FILTER (WHERE stato = 'in_grazia'),
          'scaduti',     count(*) FILTER (WHERE stato = 'scaduto'),
          'senza_piano', count(*) FILTER (WHERE stato IS NULL)) AS s
        FROM p WHERE role IN ('avvocato', 'fiduciario', 'progettista') GROUP BY role) y),
    'verifiche_pendenti', (SELECT count(*) FROM p WHERE verification_status = 'pending'),
    -- come la lista Assistenza dell'admin: le conversazioni con Lexum ancora aperte
    'ticket_aperti', (SELECT count(*) FROM ticket_assistenza t
                       WHERE t.stato = 'aperto'
                         AND (t.destinatario_id IS NULL
                              OR t.mittente_ruolo = 'admin'
                              OR EXISTS (SELECT 1 FROM profiles a
                                         WHERE a.id = t.destinatario_id AND a.role = 'admin'))),
    -- per valuta: niente somme fra franchi ed euro
    'ricavi', jsonb_build_object('CHF', 0) || (SELECT coalesce(jsonb_object_agg(valuta, tot), '{}'::jsonb) FROM (
        SELECT coalesce(valuta, 'CHF') AS valuta, sum(importo) AS tot
        FROM transazioni WHERE stato = 'completato' GROUP BY 1) z),
    'valuta', 'CHF'
  ) INTO r;
  RETURN r;
END $function$;
