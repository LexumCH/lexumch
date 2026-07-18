"""Microservizio DWG → DXF (thin wrapper su libredwg `dwg2dxf`).

Perché esiste: il DWG è un formato binario Autodesk che ezdxf NON legge, e la
funzione Vercel Python NON può eseguire binari CAD (filesystem read-only, niente
apt/toolchain). Questo servizio va deployato FUORI da Vercel (Fly.io, Render, un
container qualsiasi con libredwg) e Lexum lo chiama via `DWG_CONVERTER_URL`.

Non ripara il DXF: restituisce l'output grezzo di dwg2dxf. È il motore Lexum
(`_analisi.dxf_extractor._leggi_dxf`) a riparare le MTEXT sfasate in lettura →
un'unica fonte di verità per la riparazione.

Contratto:
  POST /convert   body = i byte del .dwg   →   200 + i byte del .dxf
  GET  /health    →   200 "ok"
Nessuna dipendenza Python esterna (solo stdlib): immagine minima.
"""

import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = 60 * 1024 * 1024  # tetto input DWG (60 MB)
DWG2DXF = os.environ.get("DWG2DXF_BIN", "dwg2dxf")


def _converti(dwg_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, "in.dwg")
        dst = os.path.join(d, "out.dxf")
        with open(src, "wb") as f:
            f.write(dwg_bytes)
        # ASCII DXF (il default); il motore Lexum ripara le MTEXT del convertitore.
        res = subprocess.run([DWG2DXF, "-o", dst, src],
                             capture_output=True, timeout=120)
        if not os.path.exists(dst) or os.path.getsize(dst) == 0:
            raise RuntimeError(f"dwg2dxf non ha prodotto output: "
                               f"{res.stderr.decode('utf-8', 'replace')[:300]}")
        with open(dst, "rb") as f:
            return f.read()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="text/plain; charset=utf-8"):
        body = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") == "/health":
            return self._send(200, "ok")
        return self._send(404, "not found")

    def do_POST(self):
        if self.path.rstrip("/") != "/convert":
            return self._send(404, "not found")
        try:
            n = int(self.headers.get("content-length", 0))
        except ValueError:
            return self._send(400, "content-length non valido")
        if n <= 0 or n > MAX_BYTES:
            return self._send(413, f"dimensione non valida (max {MAX_BYTES} byte)")
        dwg = self.rfile.read(n)
        try:
            dxf = _converti(dwg)
        except subprocess.TimeoutExpired:
            return self._send(504, "conversione andata in timeout")
        except Exception as e:  # noqa: BLE001
            return self._send(500, f"conversione fallita: {str(e)[:300]}")
        return self._send(200, dxf, ctype="image/vnd.dxf")

    def log_message(self, *_):  # silenzia il log di default
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
