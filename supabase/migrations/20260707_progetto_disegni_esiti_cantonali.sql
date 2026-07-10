-- Esiti normativa CANTONALE per disegno, generati dal ponte AI lex-normativa-cantonale.
-- Corsia SEPARATA da esiti_normativa (motore deterministico federale): qui la selezione
-- degli articoli è fatta dall'AI (con guard anti-allucinazione), i verdetti automatici
-- solo dal codice. Struttura: { cantone, lingua, modello, generato_il, fonte_updated_at, esiti: [...] }
ALTER TABLE progetto_disegni
  ADD COLUMN IF NOT EXISTS esiti_cantonali jsonb;

COMMENT ON COLUMN progetto_disegni.esiti_cantonali IS
  'Esiti normativa cantonale (ponte AI): articoli selezionati da norme_cantonali_ch con guard; verdetti automatici solo deterministici (codice). Corsia separata da esiti_normativa (motore).';
