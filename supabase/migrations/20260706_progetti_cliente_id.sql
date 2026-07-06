-- I progetti appartengono a un cliente/committente dello studio, come mandati e pratiche.
-- APPLICATA il 2026-07-06 via MCP (apply_migration 'progetti_cliente_id' + 'progetti_cliente_fk_set_null')

ALTER TABLE public.progetti ADD COLUMN cliente_id uuid;
CREATE INDEX progetti_cliente_idx ON public.progetti (cliente_id);
COMMENT ON COLUMN public.progetti.cliente_id IS 'Cliente (committente) del progetto. Stesso pattern di mandati.cliente_id / pratiche.cliente_id.';

-- Se il cliente viene eliminato, i suoi progetti restano al progettista (cliente_id → NULL)
ALTER TABLE public.progetti ADD CONSTRAINT progetti_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Il cliente vede i propri progetti (come per le pratiche)
DROP POLICY progetti_select ON public.progetti;
CREATE POLICY progetti_select ON public.progetti FOR SELECT
  USING (progettista_id = (SELECT auth.uid())
    OR cliente_id = (SELECT auth.uid())
    OR (studio_id IS NOT NULL AND studio_id = get_studio_id()));
