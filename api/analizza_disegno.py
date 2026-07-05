"""POST /api/analizza_disegno — analizza un disegno caricato su un progetto.

Body JSON: { "disegno_id": "<uuid>" }
Header:    Authorization: Bearer <jwt utente>

La funzione opera CON IL TOKEN DELL'UTENTE contro Supabase (REST + Storage),
quindi le RLS valgono come nel browser: nessuna service key necessaria.
Flusso: legge la riga progetto_disegni -> stato in_analisi -> scarica il PDF
dal bucket 'disegni' -> pipeline analisi (gemello + findings + normativa) ->
scrive i risultati sulla riga.
"""

import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _analisi import pipeline, checks, normativa  # noqa: E402


def _req(url, method="GET", headers=None, data=None):
    r = urllib.request.Request(url, method=method, headers=headers or {}, data=data)
    with urllib.request.urlopen(r, timeout=60) as resp:
        return resp.status, resp.read()


class handler(BaseHTTPRequestHandler):

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"errore": "body JSON non valido"})

        disegno_id = body.get("disegno_id", "")
        token = (self.headers.get("authorization") or "").removeprefix("Bearer ").strip()
        base = os.environ.get("VITE_SUPABASE_URL") or body.get("supabase_url", "")
        anon = os.environ.get("VITE_SUPABASE_ANON_KEY") or body.get("supabase_anon_key", "")
        if not (disegno_id and token and base and anon):
            return self._json(400, {"errore": "disegno_id, token o config Supabase mancanti"})

        rest = {"apikey": anon, "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"}

        def patch_riga(payload):
            _req(f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}",
                 method="PATCH",
                 headers={**rest, "Prefer": "return=minimal"},
                 data=json.dumps(payload, ensure_ascii=False).encode())

        # 1) riga del disegno (le RLS garantiscono che appartenga all'utente)
        try:
            _, data = _req(
                f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                f"&select=id,storage_path,nome_file", headers=rest)
        except urllib.error.HTTPError as e:
            return self._json(e.code, {"errore": f"lettura disegno: {e.reason}"})
        rows = json.loads(data)
        if not rows:
            return self._json(404, {"errore": "disegno non trovato o non accessibile"})
        riga = rows[0]

        patch_riga({"stato_analisi": "in_analisi", "errore": None})

        # 2) scarica il PDF e lancia la pipeline
        try:
            _, pdf = _req(f"{base}/storage/v1/object/disegni/{riga['storage_path']}",
                          headers={"apikey": anon, "Authorization": f"Bearer {token}"})
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(pdf)
                tmp = f.name

            twin = pipeline.build_twin(tmp, nome_file=riga["nome_file"])
            findings = checks.run_all(twin)
            esiti = normativa.analizza(twin)

            patch_riga({
                "stato_analisi": "completata",
                "gemello": twin,
                "findings": findings,
                "esiti_normativa": esiti,
                "errore": None,
                "updated_at": "now()",
            })
            testi = twin["quote"]["testi"]
            return self._json(200, {
                "stato": "completata",
                "quote_totali": len(testi),
                "quote_ok": sum(1 for t in testi if t["stato"] in ("ok", "ok_dettaglio")),
                "findings": len(findings),
                "locali": len(twin["locali"]),
            })
        except Exception as e:  # qualunque errore va sulla riga, mai perso
            patch_riga({"stato_analisi": "errore", "errore": str(e)[:800]})
            return self._json(500, {"stato": "errore", "errore": str(e)[:800]})
