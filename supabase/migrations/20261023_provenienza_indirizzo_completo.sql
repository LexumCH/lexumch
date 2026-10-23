-- La provenienza di una visita accetta anche un indirizzo completo (https://www.instagram.com/…),
-- non solo il dominio che manda il sito (applicata il 23-10-2026 dopo blog_e_metriche).
create or replace function public.provenienza_visita(p_referrer text, p_utm text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select case
    when nullif(btrim(p_utm), '') is not null then
      left(regexp_replace(lower(btrim(p_utm)), '[^a-z0-9_.-]', '', 'g'), 30)
    when nullif(btrim(p_referrer), '') is null then 'diretto'
    else (
      with h as (select regexp_replace(split_part(regexp_replace(lower(btrim(p_referrer)), '^[a-z][a-z0-9+.-]*://', ''), '/', 1), '^www\.', '') as host)
      select case
        when host = 'interno' or host ~ '(^|\.)lexum\.(it|ch)$' then 'interno'
        when host ~ '(^|\.)instagram\.com$' then 'instagram'
        when host ~ '(^|\.)(facebook\.com|fb\.me|fb\.com)$' then 'facebook'
        when host ~ '(^|\.)(linkedin\.com|lnkd\.in)$' then 'linkedin'
        when host ~ '(^|\.)tiktok\.com$' then 'tiktok'
        when host ~ '(^|\.)(t\.co|x\.com|twitter\.com)$' then 'x'
        when host ~ '(^|\.)(whatsapp\.com|wa\.me)$' then 'whatsapp'
        when host ~ '(^|\.)google\.[a-z.]+$' or host ~ '^google\.' then 'google'
        when host ~ '(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.ch|startpage\.com)$' and host !~ '^mail\.' then 'altri motori'
        when host ~ '^(mail|webmail|posta)\.' or host ~ '(outlook\.(live|office)\.com|mail\.google\.com|bluewin\.ch|gmx\.(ch|net|de)|hispeed\.ch)$' then 'email'
        else left(regexp_replace(host, '[^a-z0-9.-]', '', 'g'), 60)
      end
      from h
    )
  end
$$;
revoke all on function public.provenienza_visita(text, text) from public, anon, authenticated;
