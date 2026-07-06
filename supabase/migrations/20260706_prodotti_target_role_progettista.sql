-- target_role dei prodotti: ammette anche 'progettista'
-- ('entrambi' resta per i prodotti trasversali come i crediti AI)
-- APPLICATA il 2026-07-06 via MCP (apply_migration 'prodotti_target_role_progettista')

ALTER TABLE public.prodotti DROP CONSTRAINT prodotti_target_role_check;
ALTER TABLE public.prodotti ADD CONSTRAINT prodotti_target_role_check
  CHECK (target_role = ANY (ARRAY['avvocato'::text, 'fiduciario'::text, 'progettista'::text, 'entrambi'::text]));
