-- Zone di dettaglio non verificate: ritagli PNG (renderer deterministico Vercel)
-- + interpretazioni vision AI (lex-vision-zone, corsia in quarantena: descrittiva,
-- mai misure o verdetti). Struttura:
-- { crops: { generato_il, fonte_updated_at, items:[{idx, path, bbox_pt, quote, n_quote}] },
--   interpretazioni: { <lingua>: { modello, generato_il, fonte_updated_at, items:[{idx, tipo, scala_indicata, titolo, descrizione, leggibile}] } } }
ALTER TABLE progetto_disegni
  ADD COLUMN IF NOT EXISTS zone_dettaglio jsonb;

COMMENT ON COLUMN progetto_disegni.zone_dettaglio IS
  'Zone dettaglio non verificate: crops PNG deterministici + interpretazioni vision AI (descrittive, quarantena: mai misure/verdetti).';
