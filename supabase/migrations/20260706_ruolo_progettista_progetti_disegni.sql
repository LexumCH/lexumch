-- Ruolo Progettista: nuovo ruolo + gestionale progetti + disegni analizzati
-- Da applicare sul progetto Supabase Lexum CH (wotkrgsxjiijakeulxjl).

-- 1) nuovo ruolo ammesso
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin','avvocato','fiduciario','cliente','user','progettista']));

-- anche il flusso di verifica identità deve poter richiedere il ruolo
ALTER TABLE public.profiles DROP CONSTRAINT profiles_tipo_richiesta_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tipo_richiesta_check
  CHECK (tipo_richiesta IS NULL OR tipo_richiesta = ANY (ARRAY['avvocato','fiduciario','progettista']));

-- 2) progetti (equivalente di pratiche/mandati per il progettista)
CREATE TABLE public.progetti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progettista_id uuid NOT NULL REFERENCES public.profiles(id),
  studio_id uuid REFERENCES public.studios(id),
  nome text NOT NULL,
  descrizione text,
  committente text,
  indirizzo text,
  comune text,
  cantone varchar(2) CHECK (cantone IS NULL OR cantone IN
    ('TI','ZH','GE','VD','BE','BS','BL','LU','ZG','FR','SO','SH','AR','AI','SG','GR','AG','TG','VS','NE','JU','OW','NW','UR','SZ','GL')),
  destinazione text CHECK (destinazione IS NULL OR destinazione IN
    ('residenziale','commerciale','industriale','misto','pubblico')),
  stato text NOT NULL DEFAULT 'aperto' CHECK (stato IN ('aperto','in_corso','sospeso','chiuso','archiviato')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.progetti IS 'Progetti del ruolo progettista (ingegnere/architetto/disegnatore). Equivalente di pratiche (avvocato) e mandati (fiduciario).';

ALTER TABLE public.progetti ENABLE ROW LEVEL SECURITY;
CREATE POLICY progetti_admin_all ON public.progetti FOR ALL USING (is_admin());
CREATE POLICY progetti_select ON public.progetti FOR SELECT
  USING (progettista_id = (SELECT auth.uid()) OR (studio_id IS NOT NULL AND studio_id = get_studio_id()));
CREATE POLICY progetti_insert ON public.progetti FOR INSERT
  WITH CHECK (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetti_update ON public.progetti FOR UPDATE
  USING (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetti_delete ON public.progetti FOR DELETE
  USING (progettista_id = (SELECT auth.uid()));

CREATE INDEX progetti_progettista_idx ON public.progetti (progettista_id, stato);

-- 3) disegni caricati in un progetto + risultati analisi
CREATE TABLE public.progetto_disegni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id uuid NOT NULL REFERENCES public.progetti(id) ON DELETE CASCADE,
  progettista_id uuid NOT NULL REFERENCES public.profiles(id),
  nome_file text NOT NULL,
  storage_path text NOT NULL,
  dimensione bigint,
  stato_analisi text NOT NULL DEFAULT 'caricato'
    CHECK (stato_analisi IN ('caricato','in_analisi','completata','errore')),
  gemello jsonb,
  findings jsonb,
  esiti_normativa jsonb,
  errore text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.progetto_disegni IS 'Disegni PDF di un progetto + gemello digitale e risultati delle analisi (disegno e normativa).';

ALTER TABLE public.progetto_disegni ENABLE ROW LEVEL SECURITY;
CREATE POLICY progetto_disegni_admin_all ON public.progetto_disegni FOR ALL USING (is_admin());
CREATE POLICY progetto_disegni_select ON public.progetto_disegni FOR SELECT
  USING (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_disegni_insert ON public.progetto_disegni FOR INSERT
  WITH CHECK (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_disegni_update ON public.progetto_disegni FOR UPDATE
  USING (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_disegni_delete ON public.progetto_disegni FOR DELETE
  USING (progettista_id = (SELECT auth.uid()));

CREATE INDEX progetto_disegni_progetto_idx ON public.progetto_disegni (progetto_id);

-- 4) bucket storage privato per i disegni; path = {uid}/{progetto_id}/{file}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('disegni', 'disegni', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY disegni_owner_select ON storage.objects FOR SELECT
  USING (bucket_id = 'disegni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY disegni_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'disegni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY disegni_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'disegni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
