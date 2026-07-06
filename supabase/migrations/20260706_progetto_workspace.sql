-- Workspace di progetto: campi anagrafici/workflow + fasi SIA + documenti + note
-- APPLICATA il 2026-07-06 via MCP (apply_migration 'progetto_workspace')

-- 1) Campi anagrafici/workflow su progetti
ALTER TABLE public.progetti
  ADD COLUMN IF NOT EXISTS numero_commessa text,
  ADD COLUMN IF NOT EXISTS mappale text,
  ADD COLUMN IF NOT EXISTS zona_edificatoria text,
  ADD COLUMN IF NOT EXISTS data_inizio date,
  ADD COLUMN IF NOT EXISTS scadenza_licenza date,
  ADD COLUMN IF NOT EXISTS importo numeric,
  ADD COLUMN IF NOT EXISTS fasi jsonb;

COMMENT ON COLUMN public.progetti.fasi IS 'Stato fasi SIA 102: { fase_key: { stato, data } }. Elenco fasi canonico nel frontend.';
COMMENT ON COLUMN public.progetti.scadenza_licenza IS 'Scadenza/termine domanda di costruzione (Baubewilligung).';

-- 2) Documenti di progetto (non-disegni)
CREATE TABLE public.progetto_documenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id uuid NOT NULL REFERENCES public.progetti(id) ON DELETE CASCADE,
  progettista_id uuid NOT NULL REFERENCES public.profiles(id),
  nome_file text NOT NULL,
  storage_path text NOT NULL,
  dimensione bigint,
  categoria text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.progetto_documenti IS 'Documenti non-disegno allegati a un progetto (permessi, rapporti, corrispondenza, contratti).';
ALTER TABLE public.progetto_documenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY progetto_documenti_admin_all ON public.progetto_documenti FOR ALL USING (is_admin());
CREATE POLICY progetto_documenti_select ON public.progetto_documenti FOR SELECT USING (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_documenti_insert ON public.progetto_documenti FOR INSERT WITH CHECK (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_documenti_delete ON public.progetto_documenti FOR DELETE USING (progettista_id = (SELECT auth.uid()));
CREATE INDEX progetto_documenti_progetto_idx ON public.progetto_documenti (progetto_id);

-- 3) Note interne di progetto
CREATE TABLE public.progetto_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id uuid NOT NULL REFERENCES public.progetti(id) ON DELETE CASCADE,
  progettista_id uuid NOT NULL REFERENCES public.profiles(id),
  testo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.progetto_note IS 'Note interne di progetto (solo il progettista).';
ALTER TABLE public.progetto_note ENABLE ROW LEVEL SECURITY;
CREATE POLICY progetto_note_admin_all ON public.progetto_note FOR ALL USING (is_admin());
CREATE POLICY progetto_note_select ON public.progetto_note FOR SELECT USING (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_note_insert ON public.progetto_note FOR INSERT WITH CHECK (progettista_id = (SELECT auth.uid()));
CREATE POLICY progetto_note_delete ON public.progetto_note FOR DELETE USING (progettista_id = (SELECT auth.uid()));
CREATE INDEX progetto_note_progetto_idx ON public.progetto_note (progetto_id, created_at DESC);

-- 4) Bucket documenti di progetto; path = {uid}/{progetto_id}/{file}
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('progetto-documenti', 'progetto-documenti', false, 52428800)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY progdoc_owner_select ON storage.objects FOR SELECT
  USING (bucket_id = 'progetto-documenti' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY progdoc_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'progetto-documenti' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY progdoc_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'progetto-documenti' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
