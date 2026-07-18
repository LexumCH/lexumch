"""POST /api/rendi_zone — ritaglia in PNG i punti notevoli di una tavola analizzata.

Body JSON: { "disegno_id": "<uuid>" }
Header:    Authorization: Bearer <jwt utente>

Renderer DETERMINISTICO (zero AI). Produce tre famiglie di ritagli:
  - 'zona'    → il riquadro delle quote non verificabili (stesso bbox di checks.py);
                è l'unico ritaglio che viene poi interpretato dalla vision AI.
  - 'finding' → un ritaglio per ogni quota senza riscontro (ancora visiva:
                il progettista VEDE la quota incriminata, non coordinate in pt).
  - 'porta'   → un ritaglio per ogni apertura sotto soglia (esiti_normativa
                art. 10, campo strutturato posizioni_pt).

Upload nel bucket 'disegni' sotto il prefisso dell'utente (RLS come nel browser).
Metadati in progetto_disegni.zone_dettaglio.crops. NON tocca updated_at.
"""

import datetime
import json
import os
import tempfile
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

import fitz  # PyMuPDF

PAD_FRAZIONE = 0.35   # padding attorno al bbox della zona
PAD_MIN_PT = 60.0
RAGGIO_PUNTO_PT = 110.0   # semilato del ritaglio attorno a un punto (quota/porta)
PX_TARGET = 1400      # lato massimo desiderato del PNG
PX_MAX = 2500.0       # tetto assoluto in pixel
ZOOM_MIN, ZOOM_MAX = 2.0, 6.0
MAX_FINDING = 8       # tetto ritagli per famiglia (costi storage/UI)
MAX_PORTE = 8


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
                f"&select=id,storage_path,gemello,findings,esiti_normativa,"
                f"zone_dettaglio,updated_at", headers=rest)
        except urllib.error.HTTPError as e:
            return self._json(e.code, {"errore": f"lettura disegno: {e.reason}"})
        rows = json.loads(data)
        if not rows:
            return self._json(404, {"errore": "disegno non trovato o non accessibile"})
        riga = rows[0]
        gemello = riga.get("gemello") or {}
        findings = riga.get("findings") or []
        esiti = riga.get("esiti_normativa") or []
        zone_dett = riga.get("zone_dettaglio") or {}

        # Idempotente: crops già freschi → non rifare il lavoro.
        crops = zone_dett.get("crops")
        if crops and crops.get("fonte_updated_at") == riga.get("updated_at"):
            return self._json(200, {"stato": "ok", "cached": True, "crops": crops})

        def salva_crops(items):
            """Merge su lettura FRESCA di zone_dettaglio + PATCH (MAI updated_at)."""
            zd = zone_dett
            try:
                _, zd_data = _req(f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}"
                                  f"&select=zone_dettaglio", headers=rest)
                zd_rows = json.loads(zd_data)
                if zd_rows:
                    zd = zd_rows[0].get("zone_dettaglio") or {}
            except Exception:
                pass
            nuovo = dict(zd)
            nuovo["crops"] = {
                "generato_il": datetime.datetime.now(datetime.timezone.utc)
                               .isoformat(timespec="seconds"),
                "fonte_updated_at": riga.get("updated_at"),
                "items": items,
            }
            _req(f"{base}/rest/v1/progetto_disegni?id=eq.{disegno_id}",
                 method="PATCH", headers={**rest, "Prefer": "return=minimal"},
                 data=json.dumps({"zone_dettaglio": nuovo}, ensure_ascii=False).encode())
            return nuovo["crops"]

        # DXF: nessuna tavola raster da ritagliare. Si renderizza il disegno con
        # ezdxf (backend PyMuPDF) e si sovrappongono i marcatori dei finding →
        # una panoramica annotata come ancora visiva.
        if (riga["storage_path"] or "").lower().endswith(".dxf"):
            try:
                import sys as _sys
                _sys.path.insert(0, os.path.dirname(__file__))
                from _analisi import dxf_render
                scala = ((gemello.get("metadata") or {}).get("scala_dichiarata")) or 50
                pt_per_m = (72 / 0.0254) / scala
                _, blob = _req(f"{base}/storage/v1/object/disegni/{riga['storage_path']}",
                               headers={"apikey": anon, "Authorization": f"Bearer {token}"})
                with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as f:
                    f.write(blob)
                    tmpd = f.name
                png = dxf_render.render_overview(tmpd, findings, pt_per_m)
                os.unlink(tmpd)
                if not png:
                    return self._json(200, {"stato": "ok", "zone": 0,
                                            "messaggio": "render DXF non disponibile"})
                path = f"{os.path.dirname(riga['storage_path'])}/zone_{disegno_id}_panoramica0.png"
                _req(f"{base}/storage/v1/object/disegni/{path}", method="POST",
                     headers={"apikey": anon, "Authorization": f"Bearer {token}",
                              "Content-Type": "image/png", "x-upsert": "true"}, data=png)
                crops = salva_crops([{"idx": 0, "tipo": "panoramica", "ref": 0, "path": path}])
                return self._json(200, {"stato": "ok", "cached": False, "crops": crops})
            except Exception as e:
                return self._json(500, {"stato": "errore", "errore": str(e)[:800]})

        # 2) specifiche dei ritagli (deterministiche, dalle stesse fonti dei report)
        specs = []  # {tipo, ref, rect(x0,y0,x1,y1), quote?}

        testi = (gemello.get("quote") or {}).get("testi") or []
        zona = [t for t in testi if t.get("stato") == "zona_non_verificata"
                and isinstance(t.get("posizione_pt"), list) and len(t["posizione_pt"]) == 2]
        if zona:
            xs = [t["posizione_pt"][0] for t in zona]
            ys = [t["posizione_pt"][1] for t in zona]
            pad = max(PAD_MIN_PT, (max(xs) - min(xs)) * PAD_FRAZIONE,
                      (max(ys) - min(ys)) * PAD_FRAZIONE)
            specs.append({"tipo": "zona", "ref": 0,
                          "rect": (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad),
                          "quote": [t.get("testo") for t in zona]})

        n_f = 0
        for i, f in enumerate(findings):
            if f.get("tipo") not in ("quota_senza_riscontro", "catena_incoerente"):
                continue
            p = f.get("posizione_pt")
            if not (isinstance(p, list) and len(p) == 2) or n_f >= MAX_FINDING:
                continue
            specs.append({"tipo": "finding", "ref": i,
                          "rect": (p[0] - RAGGIO_PUNTO_PT, p[1] - RAGGIO_PUNTO_PT,
                                   p[0] + RAGGIO_PUNTO_PT, p[1] + RAGGIO_PUNTO_PT)})
            n_f += 1

        n_p = 0
        for i_e, e in enumerate(esiti):
            for pos in (e.get("posizioni_pt") or []):
                if not (isinstance(pos, list) and len(pos) == 2) or n_p >= MAX_PORTE:
                    continue
                # esito_ref lega il ritaglio al SUO esito: se in futuro più esiti
                # avranno posizioni, la UI non mescola i ritagli tra le card.
                specs.append({"tipo": "porta", "ref": n_p, "esito_ref": i_e,
                              "rect": (pos[0] - RAGGIO_PUNTO_PT, pos[1] - RAGGIO_PUNTO_PT,
                                       pos[0] + RAGGIO_PUNTO_PT, pos[1] + RAGGIO_PUNTO_PT)})
                n_p += 1

        if not specs:
            return self._json(200, {"stato": "ok", "zone": 0,
                                    "messaggio": "nessun punto da ritagliare su questa tavola"})

        # 3) scarica il PDF e renderizza i ritagli (PDF vettoriale: clip economici)
        try:
            _, pdf = _req(f"{base}/storage/v1/object/disegni/{riga['storage_path']}",
                          headers={"apikey": anon, "Authorization": f"Bearer {token}"})
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(pdf)
                tmp = f.name
            doc = fitz.open(tmp)
            page = doc[0]

            cartella = os.path.dirname(riga["storage_path"])
            items = []
            for k, spec in enumerate(specs):
                clip = fitz.Rect(*spec["rect"]) & page.rect
                if clip.is_empty:
                    continue
                lato = max(clip.width, clip.height) or 1.0
                zoom = max(ZOOM_MIN, min(ZOOM_MAX, PX_TARGET / lato))
                zoom = min(zoom, PX_MAX / lato)
                pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
                path = f"{cartella}/zone_{disegno_id}_{spec['tipo']}{spec['ref']}.png"
                _req(f"{base}/storage/v1/object/disegni/{path}",
                     method="POST",
                     headers={"apikey": anon, "Authorization": f"Bearer {token}",
                              "Content-Type": "image/png", "x-upsert": "true"},
                     data=pix.tobytes("png"))
                item = {"idx": k, "tipo": spec["tipo"], "ref": spec["ref"], "path": path,
                        "bbox_pt": list(spec["rect"])}
                if "esito_ref" in spec:
                    item["esito_ref"] = spec["esito_ref"]
                if spec.get("quote"):
                    item["quote"] = spec["quote"]
                    item["n_quote"] = len(spec["quote"])
                items.append(item)
            doc.close()
            os.unlink(tmp)

            # 4) salva i metadati (merge su lettura FRESCA; MAI updated_at)
            crops = salva_crops(items)
            return self._json(200, {"stato": "ok", "cached": False, "crops": crops})
        except Exception as e:
            return self._json(500, {"stato": "errore", "errore": str(e)[:800]})
