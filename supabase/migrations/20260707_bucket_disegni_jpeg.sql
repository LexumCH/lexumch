-- Le tessere raster sono JPEG (5-10x più leggere del PNG sulle scansioni).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf','image/png','image/jpeg']
WHERE id = 'disegni';
