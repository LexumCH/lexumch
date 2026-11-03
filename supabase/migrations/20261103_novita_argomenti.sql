-- 03-11-2026: gli argomenti degli articoli (src/lib/argomenti.js), con le pagine /:lang/novita/argomento/<slug>.
-- Applicata col connettore (la CLI non ha accesso a CH), con la classificazione dei 9 articoli esistenti.
alter table public.novita add column if not exists argomenti text[] not null default '{}';
grant select (argomenti) on public.novita to anon;
grant select, insert, update (argomenti) on public.novita to authenticated;
-- Nello stesso passaggio: provenienza_visita distingue Gemini da Google e tratta i collegamenti di Postmark come mail.
