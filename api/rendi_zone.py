"""POST /api/rendi_zone — ritaglia in PNG le zone di dettaglio non verificate.

Body JSON: { "disegno_id": "<uuid>" }
Header:    Authorization: Bearer <jwt utente>

Renderer DETERMINISTICO (zero AI): usa lo stesso riquadro di checks.py
(bbox min/max delle quote con stato 'zona_non_verificata', più padding),
renderizza il ritaglio ad alto zoom con PyMuPDF e lo carica nel bucket
'disegni' sotto il prefisso dell'utente (le RLS valgono come nel browser).
Il risultato va in progetto_disegni.zone_dettaglio.crops; le interpretazioni
AI (lex-vision-zone su Supabase) vivono accanto, in .interpretazioni.

NB: NON tocca updated_at — le cache (narrazione, esiti_cantonali) restano valide.
"""

import datetime
import json
import os
import tempfile
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

import fitz  # PyMuPDF

PAD_FRAZIONE = 0.35   # padding attorno al bbox delle quote (il disegno eccede i testi)
PAD_MIN_PT = 60.0
PX_TARGET = 1400      # lato massimo desiderato del PNG
PX_MAX = 2500.0       # tetto assoluto in pixel (limiti vision + costi)
ZOOM_MIN, ZOOM_MAX = 2.0, 6.0


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

        # 1) riga del disegno (le RLS garantiscono la proprietà)
        try:
            _, data = _req(
                f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                f"&select=id,storage_path,gemello,zone_dettaglio,updated_at", headers=rest)
        except urllib.error.HTTPError as e:
            return self._json(e.code, {"errore": f"lettura disegno: {e.reason}"})
        rows = json.loads(data)
        if not rows:
            return self._json(404, {"errore": "disegno non trovato o non accessibile"})
        riga = rows[0]
        gemello = riga.get("gemello") or {}
        zone_dett = riga.get("zone_dettaglio") or {}

        # Idempotente: crops già freschi → non rifare il lavoro.
        crops = zone_dett.get("crops")
        if crops and crops.get("fonte_updated_at") == riga.get("updated_at"):
            return self._json(200, {"stato": "ok", "cached": True, "crops": crops})

        # 2) bbox della zona: STESSO riquadro di checks.py (min/max delle quote zona)
        testi = (gemello.get("quote") or {}).get("testi") or []
        zona = [t for t in testi if t.get("stato") == "zona_non_verificata"
                and isinstance(t.get("posizione_pt"), list) and len(t["posizione_pt"]) == 2]
        if not zona:
            return self._json(200, {"stato": "ok", "zone": 0,
                                    "messaggio": "nessuna zona non verificata su questa tavola"})
        xs = [t["posizione_pt"][0] for t in zona]
        ys = [t["posizione_pt"][1] for t in zona]
        pad = max(PAD_MIN_PT, (max(xs) - min(xs)) * PAD_FRAZIONE,
                  (max(ys) - min(ys)) * PAD_FRAZIONE)

        # 3) scarica il PDF e renderizza il ritaglio
        try:
            _, pdf = _req(f"{base}/storage/v1/object/disegni/{riga['storage_path']}",
                          headers={"apikey": anon, "Authorization": f"Bearer {token}"})
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(pdf)
                tmp = f.name
            doc = fitz.open(tmp)
            page = doc[0]
            clip = fitz.Rect(min(xs) - pad, min(ys) - pad,
                             max(xs) + pad, max(ys) + pad) & page.rect
            if clip.is_empty:
                doc.close()
                os.unlink(tmp)
                return self._json(422, {"errore": "zona fuori dalla pagina del PDF"})
            lato = max(clip.width, clip.height) or 1.0
            zoom = max(ZOOM_MIN, min(ZOOM_MAX, PX_TARGET / lato))
            zoom = min(zoom, PX_MAX / lato)  # il tetto assoluto vince su ZOOM_MIN
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
            png = pix.tobytes("png")
            doc.close()
            os.unlink(tmp)

            # 4) upload nel bucket sotto il prefisso dell'utente (RLS come da browser)
            cartella = os.path.dirname(riga["storage_path"])
            crop_path = f"{cartella}/zone_{disegno_id}_0.png"
            _req(f"{base}/storage/v1/object/disegni/{crop_path}",
                 method="POST",
                 headers={"apikey": anon, "Authorization": f"Bearer {token}",
                          "Content-Type": "image/png", "x-upsert": "true"},
                 data=png)

            # 5) salva i metadati (merge su lettura FRESCA: riduce la race con la
            #    vision/altre scritture; NON toccare .interpretazioni, NON updated_at)
            try:
                _, zd_data = _req(
                    f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                    f"&select=zone_dettaglio", headers=rest)
                zd_rows = json.loads(zd_data)
                if zd_rows:
                    zone_dett = zd_rows[0].get("zone_dettaglio") or {}
            except Exception:
                pass  # in caso di errore si merge sul valore letto all'inizio
            nuovo = dict(zone_dett)
            nuovo["crops"] = {
                "generato_il": datetime.datetime.now(datetime.timezone.utc)
                               .isoformat(timespec="seconds"),
                "fonte_updated_at": riga.get("updated_at"),
                "items": [{
                    "idx": 0,
                    "path": crop_path,
                    "bbox_pt": [min(xs), min(ys), max(xs), max(ys)],
                    "quote": [t.get("testo") for t in zona],
                    "n_quote": len(zona),
                    "zoom": round(zoom, 2),
                }],
            }
            _req(f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}",
                 method="PATCH",
                 headers={**rest, "Prefer": "return=minimal"},
                 data=json.dumps({"zone_dettaglio": nuovo}, ensure_ascii=False).encode())

            return self._json(200, {"stato": "ok", "cached": False, "crops": nuovo["crops"]})
        except Exception as e:
            return self._json(500, {"stato": "errore", "errore": str(e)[:800]})
