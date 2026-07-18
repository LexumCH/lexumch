# Microservizio DWG→DXF: Python stdlib + libredwg (dwg2dxf).
# Immagine minima; nessuna dipendenza Python esterna.
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libredwg-tools python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY convert.py /app/convert.py

ENV PORT=8080
EXPOSE 8080

# Health check: GET /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health').read()==b'ok' else 1)" || exit 1

CMD ["python3", "/app/convert.py"]
