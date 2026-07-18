"""Rendering di un disegno DXF a PNG per le ANCORE VISIVE dei finding.

Il path PDF ritaglia la tavola con PyMuPDF (rendi_zone.py). Il DXF non ha una
tavola raster: qui lo si renderizza con il backend PyMuPDF di ezdxf (già
dipendenza — niente matplotlib) e si sovrappongono marcatori nelle coordinate
dei finding, così il progettista VEDE dove cade l'incoerenza.

Robustezza (i DXF da convertitore sono sporchi): si purgano gli INSERT con
blocco mancante e si renderizzano solo le entità dentro il riquadro del
contenuto (le DIMENSION), scartando la geometria vagante che libredwg piazza a
coordinate assurde e gonfia l'auto-fit. Su qualunque errore ritorna None
(l'analisi resta valida anche senza l'immagine)."""

import ezdxf
from ezdxf import bbox

from . import dxf_extractor

MARGINE_M = 3.0        # margine attorno al contenuto (metri)
RAGGIO_MARKER_M = 1.5  # raggio dei cerchi-marcatore (metri)
ACI_ROSSO = 1


def _entita_dentro(e, box):
    try:
        b = bbox.extents([e], fast=True)
    except Exception:
        return False
    if not b.has_data:
        return False
    mx0, my0, mx1, my1 = box
    return not (b.extmin.x > mx1 or b.extmax.x < mx0 or b.extmin.y > my1 or b.extmax.y < my0)


def render_overview(dxf_path, findings, pt_per_m, dpi=90):
    """PNG (bytes) del disegno con i finding cerchiati in rosso; None se fallisce."""
    try:
        doc = dxf_extractor._leggi_dxf(dxf_path)
        msp = doc.modelspace()

        # 1) purga gli INSERT con blocco mancante (artefatti del convertitore:
        #    romperebbero l'esplosione durante il render)
        for ins in list(msp.query("INSERT")):
            if ins.dxf.name not in doc.blocks:
                msp.delete_entity(ins)

        # 2) riquadro del contenuto vero = estensione delle DIMENSION + margine
        dims = msp.query("DIMENSION")
        d = bbox.extents(dims, fast=True)
        if not d.has_data:
            return None
        box = (d.extmin.x - MARGINE_M, d.extmin.y - MARGINE_M,
               d.extmax.x + MARGINE_M, d.extmax.y + MARGINE_M)

        # 3) entità dentro il contenuto (scarta la geometria vagante)
        ents = [e for e in msp if _entita_dentro(e, box)]

        # 4) marcatori nelle coordinate-disegno dei finding (posizione_pt/pt_per_m)
        for f in findings or []:
            pos = f.get("posizione_pt")
            if isinstance(pos, list) and len(pos) == 2 and pt_per_m:
                x, y = pos[0] / pt_per_m, pos[1] / pt_per_m
                ents.append(msp.add_circle((x, y), radius=RAGGIO_MARKER_M,
                                           dxfattribs={"color": ACI_ROSSO}))

        # 5) render col backend PyMuPDF
        from ezdxf.addons.drawing import Frontend, RenderContext
        from ezdxf.addons.drawing.pymupdf import PyMuPdfBackend
        from ezdxf.addons.drawing.layout import Page
        be = PyMuPdfBackend()
        Frontend(RenderContext(doc), be).draw_entities(ents)
        return be.get_pixmap_bytes(Page(0, 0), fmt="png", dpi=dpi)
    except Exception:
        return None
