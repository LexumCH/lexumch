"""POST /api/rendi_pagina — affetta la prima pagina di un PDF in tessere PNG.

Body JSON: { "disegno_id": "<uuid>" }
Header:    Authorization: Bearer <jwt utente>

Per i PDF SCANSIONATI/raster (che il motore vettoriale non legge): renderer
DETERMINISTICO che produce una panoramica + una griglia di tessere leggibili
(una tavola intera a bassa risoluzione sarebbe illeggibile per la vision).
Upload nel bucket 'disegni' sotto il prefisso utente (RLS come nel browser);
metadati in progetto_disegni.lettura_raster.tiles. Le trascrizioni AI
(lex-vision-raster su Supabase) vivono accanto, in .letture.

NB: NON tocca updated_at — le altre cache restano valide.
"""

import datetime
import json
import math
import os
import tempfile
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

import fitz  # PyMuPDF

TILE_PT = 1100.0      # lato desiderato della tessera in pt pagina
TILE_PX = 2200.0      # lato massimo della tessera renderizzata
MAX_TILES = 8         # tetto assoluto (costi vision)
OVERVIEW_PX = 1400.0  # lato massimo della panoramica
MAX_PDF_BYTES = 80 * 1024 * 1024  # scansioni oltre 80MB: rifiuto esplicito
JPEG_QUALITA = 80     # JPEG per le scansioni: 5-10x più leggero del PNG


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

        try:
            _, data = _req(
                f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                f"&select=id,storage_path,lettura_raster,updated_at,dimensione", headers=rest)
        except urllib.error.HTTPError as e:
            return self._json(e.code, {"errore": f"lettura disegno: {e.reason}"})
        rows = json.loads(data)
        if not rows:
            return self._json(404, {"errore": "disegno non trovato o non accessibile"})
        riga = rows[0]
        lettura = riga.get("lettura_raster") or {}

        tiles = lettura.get("tiles")
        if tiles and tiles.get("fonte_updated_at") == riga.get("updated_at"):
            return self._json(200, {"stato": "ok", "cached": True, "tiles": tiles})

        if (riga.get("dimensione") or 0) > MAX_PDF_BYTES:
            return self._json(413, {"errore": "PDF oltre 80MB: riduci la risoluzione della scansione"})

        try:
            _, pdf = _req(f"{base}/storage/v1/object/disegni/{riga['storage_path']}",
                          headers={"apikey": anon, "Authorization": f"Bearer {token}"})
            if len(pdf) > MAX_PDF_BYTES:
                return self._json(413, {"errore": "PDF oltre 80MB: riduci la risoluzione della scansione"})
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(pdf)
                tmp = f.name
            doc = fitz.open(tmp)
            page = doc[0]
            w, h = page.rect.width, page.rect.height
            cartella = os.path.dirname(riga["storage_path"])

            def upload(path, dati):
                _req(f"{base}/storage/v1/object/disegni/{path}",
                     method="POST",
                     headers={"apikey": anon, "Authorization": f"Bearer {token}",
                              "Content-Type": "image/jpeg", "x-upsert": "true"},
                     data=dati)

            # Griglia entro MAX_TILES (clamp prima del while: MediaBox patologici
            # non devono far iterare il decremento miliardi di volte)
            cols = min(max(1, math.ceil(w / TILE_PT)), MAX_TILES)
            righe_n = min(max(1, math.ceil(h / TILE_PT)), MAX_TILES)
            while cols * righe_n > MAX_TILES:
                if cols >= righe_n:
                    cols -= 1
                else:
                    righe_n -= 1

            # UN SOLO render della pagina (una scansione grande si ri-decodifica a
            # ogni get_pixmap: 9 render sforerebbero i 60s); tessere e panoramica
            # sono ricavate dal pixmap unico via copy / scaled-copy.
            zoom = min(3.0, TILE_PX / max(w / cols, h / righe_n))
            big = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            doc.close()
            os.unlink(tmp)

            # Panoramica (orientamento generale, non per leggere i testi)
            fattore_ov = OVERVIEW_PX / max(big.width, big.height)
            ov = fitz.Pixmap(big, int(big.width * fattore_ov),
                             int(big.height * fattore_ov), None)
            overview_path = f"{cartella}/raster_{disegno_id}_ov.jpg"
            upload(overview_path, ov.tobytes("jpeg", jpg_quality=JPEG_QUALITA))
            ov = None

            tile_px_w, tile_px_h = big.width / cols, big.height / righe_n
            items = []
            for r in range(righe_n):
                for c in range(cols):
                    ir = fitz.IRect(int(c * tile_px_w), int(r * tile_px_h),
                                    int((c + 1) * tile_px_w), int((r + 1) * tile_px_h))
                    if ir.is_empty:
                        continue
                    tile = fitz.Pixmap(big.colorspace, ir, big.alpha)
                    tile.copy(big, ir)
                    idx = r * cols + c
                    path = f"{cartella}/raster_{disegno_id}_t{idx}.jpg"
                    upload(path, tile.tobytes("jpeg", jpg_quality=JPEG_QUALITA))
                    items.append({"idx": idx, "path": path, "riga": r, "col": c})
                    tile = None

            # merge su lettura fresca (riduce la race con la vision/altre scritture)
            try:
                _, lr_data = _req(
                    f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                    f"&select=lettura_raster", headers=rest)
                lr_rows = json.loads(lr_data)
                if lr_rows:
                    lettura = lr_rows[0].get("lettura_raster") or {}
            except Exception:
                pass
            nuovo = dict(lettura)
            nuovo["tiles"] = {
                "generato_il": datetime.datetime.now(datetime.timezone.utc)
                               .isoformat(timespec="seconds"),
                "fonte_updated_at": riga.get("updated_at"),
                "overview_path": overview_path,
                "griglia": [righe_n, cols],
                "items": items,
            }
            _req(f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}",
                 method="PATCH",
                 headers={**rest, "Prefer": "return=minimal"},
                 data=json.dumps({"lettura_raster": nuovo}, ensure_ascii=False).encode())

            return self._json(200, {"stato": "ok", "cached": False, "tiles": nuovo["tiles"]})
        except Exception as e:
            return self._json(500, {"stato": "errore", "errore": str(e)[:800]})
