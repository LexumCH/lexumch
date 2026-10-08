-- 08-10-2026 (controllo di sicurezza, fase 2): come in Italia (pulizia del 03-10-2026), chi non ha fatto
-- l'accesso (anon) e gli utenti (authenticated) non hanno TRUNCATE, REFERENCES e TRIGGER su nessuna
-- tabella, né su quelle che nasceranno. Dalle API non si usano, ma TRUNCATE non è soggetto alle
-- regole RLS: non deve esserci. In CH c'erano ancora su 83 tabelle (anon) e 88 (authenticated).

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
