-- Cache della narrazione AI localizzata per lingua (it/de/fr) dei disegni analizzati.
-- Il motore deterministico resta la fonte di verità (gemello/findings/esiti_normativa);
-- questa colonna contiene SOLO la prosa localizzata generata da lex-narra-disegno,
-- per non ripagare la generazione a ogni vista.
-- Struttura: { "it": { generata_il, modello, fonte_updated_at, findings, esiti, sommario }, "de": {...}, "fr": {...} }
ALTER TABLE progetto_disegni
  ADD COLUMN IF NOT EXISTS narrazione jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN progetto_disegni.narrazione IS
  'Cache narrazione AI localizzata per lingua (it/de/fr). Prosa generata da lex-narra-disegno a partire dal risultato deterministico; misure e testo di legge mai inventati.';
