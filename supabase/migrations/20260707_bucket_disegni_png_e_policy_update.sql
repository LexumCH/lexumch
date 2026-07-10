-- I ritagli PNG delle zone-dettaglio vivono nel bucket 'disegni' accanto ai PDF.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf','image/png']
WHERE id = 'disegni';

-- L'upsert del ritaglio (path stabile zone_{disegno_id}_0.png) richiede UPDATE
-- oltre a INSERT: senza, la rigenerazione dopo una ri-analisi fallisce per sempre.
CREATE POLICY disegni_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'disegni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'disegni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
