-- Lettura AI dei PDF scansionati/raster (che il motore vettoriale non può leggere).
-- CORSIA IN QUARANTENA DURA: trascrizione da immagine, mai dentro gemello/findings/
-- esiti normativi. Struttura:
-- { tiles: { generato_il, fonte_updated_at, overview_path, items:[{idx, path, riga, col}] },
--   letture: { <lingua>: { modello, generato_il, fonte_updated_at, dati:{scala_indicata, titolo_tavola, locali, quote_visibili, descrizione, leggibile} } } }
ALTER TABLE progetto_disegni
  ADD COLUMN IF NOT EXISTS lettura_raster jsonb;

COMMENT ON COLUMN progetto_disegni.lettura_raster IS
  'Lettura AI da immagine per PDF raster: tessere PNG deterministiche + trascrizione vision (quarantena: minor affidabilità, mai nei check).';
