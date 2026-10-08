-- 08-10-2026 (controllo di sicurezza, fase 2): la memoria dei riassunti di Lex la legge solo il server.
--
-- lex_riassunti_cached tiene i riassunti degli elementi che lex-confronta e lex-etichetta passano a
-- Lex (documenti, pratiche, sentenze dello studio). La regola lex_riass_read (select, using true,
-- per tutti i ruoli) la rendeva leggibile a chiunque, anche senza accesso. Le funzioni la usano con
-- la chiave del server e i siti non la leggono: la regola si toglie (in IT non c'è mai stata).

drop policy if exists lex_riass_read on public.lex_riassunti_cached;
