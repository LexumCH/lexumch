-- =====================================================================================
-- Scritture dirette dal browser e dall'app: ogni id dev'essere dello studio di chi scrive
-- (12-10-2026). Chiude il punto aperto del controllo del 07-10 (gruppo F).
--
-- Prima: le regole d'accesso di queste tabelle controllavano quasi sempre una sola cosa
-- («avvocato_id = io»). Gli altri id della riga (cliente, pratica, mandato, studio,
-- appuntamento, archivio) non li controllava nessuno: scrivendo direttamente nel database
-- con il proprio accesso si potevano creare righe nello studio o nel portale di altri
-- (pratiche, appuntamenti con notifica al cliente, documenti, note...) e, tramite
-- appuntamento_id, far spostare o cancellare dai trigger l'appuntamento di un altro studio.
-- Dopo: il trigger z_ids_dello_studio (gira dopo gli altri trigger BEFORE, sulla riga
-- finale) rifiuta con un messaggio breve, codice 42501, ogni id che non è dello studio di
-- chi scrive. In modifica controlla solo gli id che cambiano; togliere un collegamento
-- (null) è sempre permesso. Non tocca le funzioni del server (chiave di servizio), le
-- funzioni del database (SECURITY DEFINER) e gli admin con la verifica in due passaggi.
-- Le funzioni d'aiuto (miei_studi, cliente_del_mio_studio, ...) ci sono già: sono quelle
-- del controllo sulle fatture, 20261008_fatture_solo_dal_server.sql.
--
-- Provato il 12-10-2026 come utenti veri, in blocchi annullati alla fine:
--   - prima: passavano 15 scritture «cattive» su 16 (l'altra la fermava già un controllo esistente);
--   - dopo: rifiutate tutte, ciascuna col suo messaggio;
--   - le scritture normali (avvocato, fiduciario con conto annuale ed esercizio, progettista, cliente dal portale, privato) passano;
--   - sui dati di oggi nessuna riga sarebbe stata rifiutata.
-- Per tornare indietro: drop trigger z_ids_dello_studio sulle tabelle qui sotto.
-- =====================================================================================

create or replace function public.ids_dello_studio()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  nuovo jsonb;
  vecchio jsonb;
  colonna text;
  valore uuid;
  pratica uuid;
  mandato uuid;
begin
  -- Solo le scritture dirette dal browser e dall'app girano come authenticated / anon
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  if public.is_admin() then
    return new;
  end if;

  nuovo := to_jsonb(new);
  vecchio := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  pratica := nullif(nuovo ->> 'pratica_id', '')::uuid;
  mandato := nullif(nuovo ->> 'mandato_id', '')::uuid;

  foreach colonna in array tg_argv loop
    if not (nuovo ? colonna) then
      raise exception 'ids_dello_studio: la tabella % non ha la colonna %', tg_table_name, colonna;
    end if;
    valore := nullif(nuovo ->> colonna, '')::uuid;
    continue when valore is null;
    continue when tg_op = 'UPDATE' and (nuovo -> colonna) is not distinct from (vecchio -> colonna);

    if colonna in ('avvocato_id', 'professionista_id', 'progettista_id') then
      if not public.professionista_del_mio_studio(valore) then
        raise exception 'Il professionista non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna in ('autore_id', 'caricato_da', 'user_id') then
      if not public.professionista_del_mio_studio(valore) then
        raise exception 'L''autore non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna = 'cliente_id' then
      if not public.cliente_del_mio_studio(valore, pratica, mandato) then
        raise exception 'Il cliente non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna = 'studio_id' then
      if not public.studio_mio(valore, pratica, mandato) then
        raise exception 'Lo studio indicato non è il tuo' using errcode = '42501';
      end if;
    elsif colonna = 'pratica_id' then
      if not public.pratica_del_mio_studio(valore) then
        raise exception 'La pratica non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna = 'mandato_id' then
      if not public.mandato_del_mio_studio(valore) then
        raise exception 'Il mandato non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna = 'appuntamento_id' then
      if not public.appuntamento_del_mio_studio(valore) then
        raise exception 'L''appuntamento non è del tuo studio' using errcode = '42501';
      end if;
    elsif colonna = 'titolare_id' then
      if valore is distinct from auth.uid() and valore is distinct from public.mio_titolare() then
        raise exception 'L''archivio indicato non è il tuo' using errcode = '42501';
      end if;
    else
      raise exception 'ids_dello_studio: colonna % non prevista', colonna;
    end if;
  end loop;

  return new;
end
$function$;

revoke all on function public.ids_dello_studio() from public, anon, authenticated;


-- Le tabelle controllate e le loro colonne
-- Pratiche, mandati, progetti: compaiono allo studio_id e nel portale del cliente_id
-- (il trigger che completa lo studio_id lo mette solo se manca).
drop trigger if exists z_ids_dello_studio on public.pratiche;
create trigger z_ids_dello_studio
  before insert or update on public.pratiche
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.mandati;
create trigger z_ids_dello_studio
  before insert or update on public.mandati
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.progetti;
create trigger z_ids_dello_studio
  before insert or update on public.progetti
  for each row execute function public.ids_dello_studio('progettista_id', 'cliente_id', 'studio_id');

-- Agenda: l'appuntamento va nel portale (e nelle notifiche) del cliente e nell'agenda
-- dello studio indicato.
drop trigger if exists z_ids_dello_studio on public.appuntamenti;
create trigger z_ids_dello_studio
  before insert or update on public.appuntamenti
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id', 'pratica_id', 'mandato_id');

-- Scadenze fiduciarie: il trigger del database crea l'appuntamento per il professionista
-- e il cliente del MANDATO indicato, e con appuntamento_id sposta/cancella l'appuntamento.
drop trigger if exists z_ids_dello_studio on public.scadenze_fiduciarie;
create trigger z_ids_dello_studio
  before insert or update on public.scadenze_fiduciarie
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id', 'mandato_id', 'appuntamento_id');

-- Termini e udienze: la pratica la controllano gia' le regole; appuntamento_id no
-- (con i trigger dei termini sposta o cancella l'appuntamento di chiunque).
drop trigger if exists z_ids_dello_studio on public.termini_processuali;
create trigger z_ids_dello_studio
  before insert or update on public.termini_processuali
  for each row execute function public.ids_dello_studio('pratica_id', 'appuntamento_id');

drop trigger if exists z_ids_dello_studio on public.udienze;
create trigger z_ids_dello_studio
  before insert or update on public.udienze
  for each row execute function public.ids_dello_studio('pratica_id', 'appuntamento_id');

-- Archivio: titolare_id decide in quale archivio compare il documento (la regola accetta
-- titolare_id = io con QUALUNQUE autore_id: il documento comparirebbe a quell'autore);
-- cliente_id manda la notifica «Nuovo documento condiviso» al cliente.
drop trigger if exists z_ids_dello_studio on public.archivio_documenti;
create trigger z_ids_dello_studio
  before insert or update on public.archivio_documenti
  for each row execute function public.ids_dello_studio('autore_id', 'titolare_id', 'cliente_id', 'pratica_id', 'mandato_id');

-- Documenti del portale: con visibile_cliente il cliente_id lo vede; lo studio_id pure.
-- I clienti caricano qui dal portale (cliente_id = se stessi): passa.
drop trigger if exists z_ids_dello_studio on public.documenti;
create trigger z_ids_dello_studio
  before insert or update on public.documenti
  for each row execute function public.ids_dello_studio('caricato_da', 'cliente_id', 'pratica_id', 'studio_id');

-- Documenti ed elementi delle pratiche: con autore_id = io la regola accetta qualunque
-- pratica, e il professionista e il cliente di quella pratica li vedono.
drop trigger if exists z_ids_dello_studio on public.documenti_pratiche;
create trigger z_ids_dello_studio
  before insert or update on public.documenti_pratiche
  for each row execute function public.ids_dello_studio('pratica_id');

drop trigger if exists z_ids_dello_studio on public.elementi_pratiche;
create trigger z_ids_dello_studio
  before insert or update on public.elementi_pratiche
  for each row execute function public.ids_dello_studio('pratica_id');

-- Note interne: con autore_id = io la regola accetta qualunque cliente_id, e lo studio
-- di quel cliente vede la nota.
drop trigger if exists z_ids_dello_studio on public.note_interne;
create trigger z_ids_dello_studio
  before insert or update on public.note_interne
  for each row execute function public.ids_dello_studio('cliente_id');

-- Ricerche: con una pratica dello studio la regola accetta qualunque user_id; chi lavora
-- sulla pratica le vede.
drop trigger if exists z_ids_dello_studio on public.ricerche;
create trigger z_ids_dello_studio
  before insert or update on public.ricerche
  for each row execute function public.ids_dello_studio('user_id', 'pratica_id', 'mandato_id');

-- Contabilita' e personale dei clienti (fiduciario): lo studio_id le mostra allo studio.
drop trigger if exists z_ids_dello_studio on public.movimenti;
create trigger z_ids_dello_studio
  before insert or update on public.movimenti
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id', 'mandato_id');

drop trigger if exists z_ids_dello_studio on public.registrazioni;
create trigger z_ids_dello_studio
  before insert or update on public.registrazioni
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id', 'mandato_id');

drop trigger if exists z_ids_dello_studio on public.piano_conti;
create trigger z_ids_dello_studio
  before insert or update on public.piano_conti
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.mapping_categorie;
create trigger z_ids_dello_studio
  before insert or update on public.mapping_categorie
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.saldi_cassa;
create trigger z_ids_dello_studio
  before insert or update on public.saldi_cassa
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.clienti_dipendenti;
create trigger z_ids_dello_studio
  before insert or update on public.clienti_dipendenti
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.dipendenti_bonus;
create trigger z_ids_dello_studio
  before insert or update on public.dipendenti_bonus
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

-- Conto annuale (CO 958) ed esercizi contabili: lo studio_id li fa vedere allo studio indicato.
-- Le funzioni chiudi_esercizio / riapri_esercizio sono SECURITY DEFINER: non toccate.
drop trigger if exists z_ids_dello_studio on public.conti_annuali;
create trigger z_ids_dello_studio
  before insert or update on public.conti_annuali
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

drop trigger if exists z_ids_dello_studio on public.esercizi_contabili;
create trigger z_ids_dello_studio
  before insert or update on public.esercizi_contabili
  for each row execute function public.ids_dello_studio('avvocato_id', 'cliente_id', 'studio_id');

-- Richieste di pagamento: lo studio_id le fa vedere allo studio indicato.
drop trigger if exists z_ids_dello_studio on public.richieste_pagamento;
create trigger z_ids_dello_studio
  before insert or update on public.richieste_pagamento
  for each row execute function public.ids_dello_studio('avvocato_id', 'studio_id');

-- Allegati degli appuntamenti con Lexum: chi non è admin poteva allegare file a qualunque
-- appuntamento, e gli admin li vedevano. Ora serve un appuntamento di cui si è autore o
-- partecipante; dato che gli appuntamenti con Lexum li vedono solo gli admin, in pratica
-- allegano solo gli admin, come già fa il sito (regola all_man_admin, non toccata).
alter policy all_man_manage on public.allegati_manuali_appuntamento
  with check (
    caricato_da = (select auth.uid())
    and exists (
      select 1
        from public.appuntamenti_admin a
       where a.id = allegati_manuali_appuntamento.appuntamento_id
         and (a.creato_da = (select auth.uid()) or a.partecipante_user_id = (select auth.uid()))
    )
  );
