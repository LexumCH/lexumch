-- =====================================================================================
-- Collaboratori di pratica: il titolare della pratica aggiunge solo professionisti del suo
-- studio (13-10-2026).
--
-- Prima la regola pratica_coll_manage controllava solo che chi scrive fosse il titolare
-- della pratica: scrivendo direttamente nel database poteva aggiungere chiunque, anche di
-- un altro studio, che da quel momento vedeva (e poteva modificare) la pratica.
-- Ora il collaboratore dev'essere dello stesso studio (stesso titolare o membro attivo di
-- uno dei suoi studi): lo controlla z_ids_dello_studio, come sulle altre tabelle, con il
-- messaggio «Il professionista non è del tuo studio». Togliere resta come prima.
-- Il sito e l'app propongono già solo i collaboratori dello studio.
-- =====================================================================================

drop trigger if exists z_ids_dello_studio on public.pratica_collaboratori;
create trigger z_ids_dello_studio
  before insert or update on public.pratica_collaboratori
  for each row execute function public.ids_dello_studio('pratica_id', 'avvocato_id');
