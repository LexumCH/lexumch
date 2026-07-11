-- Norme tecniche SIA (BYO-license) + documenti di progetto in archivio.
--
-- 1) Cache degli esiti della verifica norme SIA sul disegno (come esiti_cantonali).
-- 2) Marcatore stabile di categoria archivio con ruolo speciale (rename-proof):
--    NULL per le categorie normali (archivio avvocato invariato); 'norme_sia'
--    per la libreria personale di norme del progettista; 'documenti_progetto'
--    per i documenti generati depositati in archivio.

ALTER TABLE public.progetto_disegni
  ADD COLUMN IF NOT EXISTS esiti_sia jsonb;

ALTER TABLE public.categorie_archivio
  ADD COLUMN IF NOT EXISTS chiave text;

-- Al massimo una categoria per (titolare, chiave): evita doppioni delle
-- categorie-slot in caso di creazione concorrente.
CREATE UNIQUE INDEX IF NOT EXISTS categorie_archivio_titolare_chiave_uidx
  ON public.categorie_archivio (titolare_id, chiave)
  WHERE chiave IS NOT NULL;
