-- Il bucket 'disegni' accettava solo pdf/png/jpeg → il DXF veniva rifiutato.
-- Aggiungiamo i mime DXF (il frontend forza image/vnd.dxf all'upload; gli altri
-- per robustezza su upload diretti). Serve al binario "pro" DXF (misura esatta
-- delle quote di sezione).
update storage.buckets
set allowed_mime_types = array(
  select distinct unnest(
    coalesce(allowed_mime_types, array[]::text[])
    || array['image/vnd.dxf', 'application/dxf', 'application/x-dxf']
  )
)
where id = 'disegni';
