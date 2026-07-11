-- Variante category-scoped di cerca_archivio_simili: identica, ma restringe ai
-- documenti di una specifica categoria (es. la libreria "Norme tecniche · SIA"
-- del progettista). Il filtro categoria è applicato PRIMA del top-K, così i
-- chunk della categoria non vengono esclusi dal cutoff generale dell'archivio.

CREATE OR REPLACE FUNCTION public.cerca_archivio_simili_cat(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.45,
  match_count integer DEFAULT 10,
  p_titolare_id uuid DEFAULT NULL::uuid,
  p_categoria_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(documento_id uuid, chunk_index integer, testo_chunk text, similarity double precision)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidati AS (
    SELECT
      ae.documento_id,
      ae.chunk_index,
      ae.testo_chunk,
      ae.embedding <=> query_embedding AS distanza
    FROM archivio_embeddings ae
    JOIN archivio_documenti ad ON ad.id = ae.documento_id
    WHERE ad.verificato = true
      AND (p_titolare_id IS NULL OR ad.titolare_id = p_titolare_id OR ad.autore_id = p_titolare_id)
      AND (p_categoria_id IS NULL OR ad.categoria_id = p_categoria_id)
    ORDER BY ae.embedding <=> query_embedding
    LIMIT GREATEST(match_count * 4, 40)
  )
  SELECT
    c.documento_id,
    c.chunk_index,
    c.testo_chunk,
    (1 - c.distanza)::double precision AS similarity
  FROM candidati c
  WHERE (1 - c.distanza) > match_threshold
  ORDER BY c.distanza
  LIMIT match_count;
END;
$function$;
