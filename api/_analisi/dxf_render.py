"""Rendering di un disegno DXF a PNG per le ANCORE VISIVE dei finding.

Il path PDF ritaglia la tavola con PyMuPDF (rendi_zone.py). Il DXF non ha una
tavola raster: qui lo si renderizza con il backend PyMuPDF di ezdxf (già
dipendenza — niente matplotlib) e si sovrappongono marcatori NUMERATI nelle
coordinate dei finding, così il progettista vede dove cade l'incoerenza e sa
quale cerchio corrisponde a quale segnalazione.

Due livelli, come sul path PDF:
  · panoramica  → dove cade ogni finding sull'intera tavola (cerchi numerati);
  · ritagli zoom → cosa c'è in quel punto (uno per finding).

I ritagli sono VETTORIALI (`render_box` del backend), non ritagli del raster
della panoramica: ritagliare il raster darebbe pochi pixel (4 m su una tavola da
90 m), e renderizzare la sola geometria vicina non basterebbe, perché un muro
lungo che attraversa la zona allargherebbe l'inquadratura all'intero disegno
(l'auto-fit usa l'estensione delle entità disegnate, non il riquadro richiesto).

Robustezza (i DXF da convertitore sono sporchi): si purgano gli INSERT con
blocco mancante e si renderizzano solo le entità dentro il riquadro del
contenuto (le DIMENSION), scartando la geometria vagante che libredwg piazza a
coordinate assurde e gonfia l'auto-fit. Su qualunque errore ritorna None/lista
vuota (l'analisi resta valida anche senza immagini)."""

from ezdxf import bbox

from . import dxf_extractor

MARGINE_M = 3.0            # margine attorno al contenuto (metri)
ACI_ROSSO = 1

# Panoramica: il marcatore va dimensionato RELATIVAMENTE alla tavola — un raggio
# fisso è giusto su una pianta da 90 m e coprirebbe mezzo disegno su una da 10 m.
FRAZIONE_MARKER = 0.015    # ~1.35 m su una tavola da 90 m
RAGGIO_MARKER_MIN_M = 0.35
RAGGIO_MARKER_MAX_M = 2.0
LATO_PANORAMICA_PX = 1600

# Ritaglio: il ritaglio È il focus, quindi marcatore piccolo — deve indicare il
# punto senza coprire ciò che il progettista deve guardare.
RAGGIO_RITAGLIO_M = 2.5    # semilato del ritaglio attorno al finding (metri)
FRAZIONE_MARKER_RITAGLIO = 0.14   # rispetto al semilato del ritaglio
LATO_RITAGLIO_PX = 700

# ⚠️ In questo backend il parametro `dpi` di get_pixmap_bytes NON incide sulla
# dimensione dell'immagine (misurato: 283x283 px per una pagina da 100 mm a
# 72/96/200/300 dpi). La risoluzione si governa quindi con la DIMENSIONE DELLA
# PAGINA: px = mm × 72/25.4.
PX_PER_MM = 72 / 25.4
MM_PER_PX = 25.4 / 72


def _bbox_entita(e):
    try:
        b = bbox.extents([e], fast=True)
    except Exception:
        return None
    if not b.has_data:
        return None
    return (b.extmin.x, b.extmin.y, b.extmax.x, b.extmax.y)


def _interseca(eb, box):
    mx0, my0, mx1, my1 = box
    return not (eb[0] > mx1 or eb[2] < mx0 or eb[1] > my1 or eb[3] < my0)


def _punti_ancore(ancore, pt_per_m):
    """[(numero, x_m, y_m)] dalle posizioni_pt dei finding. Il NUMERO è l'indice
    nella lista +1: è lo stesso che la UI mostra accanto alla segnalazione."""
    out = []
    for i, f in enumerate(ancore or []):
        pos = (f or {}).get("posizione_pt")
        if isinstance(pos, list) and len(pos) == 2 and pt_per_m:
            out.append((i + 1, pos[0] / pt_per_m, pos[1] / pt_per_m))
    return out


def _prepara(dxf_path):
    """(doc, msp, [(entità, bbox)], riquadro_contenuto) — senza marcatori.
    Il bbox di ogni entità si calcola UNA volta: i ritagli poi filtrano con
    semplici confronti, senza ricalcolare la geometria per ogni finding."""
    doc = dxf_extractor._leggi_dxf(dxf_path)
    msp = doc.modelspace()

    # purga gli INSERT con blocco mancante (artefatti del convertitore:
    # romperebbero l'esplosione durante il render)
    for ins in list(msp.query("INSERT")):
        if ins.dxf.name not in doc.blocks:
            msp.delete_entity(ins)

    # riquadro del contenuto vero = estensione delle DIMENSION + margine
    d = bbox.extents(msp.query("DIMENSION"), fast=True)
    if not d.has_data:
        return None
    box = (d.extmin.x - MARGINE_M, d.extmin.y - MARGINE_M,
           d.extmax.x + MARGINE_M, d.extmax.y + MARGINE_M)

    coppie = []
    for e in msp:
        eb = _bbox_entita(e)
        if eb is not None and _interseca(eb, box):
            coppie.append((e, eb))
    return doc, msp, coppie, box


def _marcatore(msp, n, x, y, raggio):
    """Cerchio rosso + numero della segnalazione, accostato al cerchio (il
    numero è quello che la UI mostra accanto al testo del finding)."""
    ents = [msp.add_circle((x, y), radius=raggio, dxfattribs={"color": ACI_ROSSO})]
    t = msp.add_text(str(n), height=raggio * 1.2, dxfattribs={"color": ACI_ROSSO})
    px, py = x + raggio * 1.25, y + raggio * 1.25
    try:
        from ezdxf.enums import TextEntityAlignment
        t.set_placement((px, py), align=TextEntityAlignment.MIDDLE_CENTER)
    except Exception:
        t.dxf.insert = (px, py)
    ents.append(t)
    return ents


def _raggio_marker(box):
    """Raggio proporzionato alla tavola, con estremi di sicurezza."""
    lato = max(box[2] - box[0], box[3] - box[1])
    return max(RAGGIO_MARKER_MIN_M, min(RAGGIO_MARKER_MAX_M, lato * FRAZIONE_MARKER))


def _pagina(box, lato_px):
    """Pagina (mm) con le proporzioni del riquadro, tale da rendere ~lato_px
    pixel sul lato lungo alla risoluzione DPI."""
    from ezdxf.addons.drawing.layout import Page, Units
    w = max(box[2] - box[0], 1e-6)
    h = max(box[3] - box[1], 1e-6)
    if w >= h:
        px_w, px_h = lato_px, max(1, int(lato_px * h / w))
    else:
        px_h, px_w = lato_px, max(1, int(lato_px * w / h))
    return Page(px_w * MM_PER_PX, px_h * MM_PER_PX, units=Units.mm)


def _render(doc, ents, box, lato_px):
    from ezdxf.addons.drawing import Frontend, RenderContext
    from ezdxf.addons.drawing.pymupdf import PyMuPdfBackend
    from ezdxf.math import BoundingBox2d, Vec2
    be = PyMuPdfBackend()
    Frontend(RenderContext(doc), be).draw_entities(ents)
    # render_box inquadra ESATTAMENTE il riquadro richiesto: senza, l'auto-fit
    # seguirebbe l'estensione delle entità (una linea lunga sballerebbe lo zoom).
    rb = BoundingBox2d([Vec2(box[0], box[1]), Vec2(box[2], box[3])])
    return be.get_pixmap_bytes(_pagina(box, lato_px), fmt="png", render_box=rb)


def render_overview(dxf_path, ancore, pt_per_m, lato_px=LATO_PANORAMICA_PX):
    """PNG (bytes) del disegno coi finding cerchiati e NUMERATI; None se fallisce."""
    try:
        prep = _prepara(dxf_path)
        if prep is None:
            return None
        doc, msp, coppie, box = prep
        ents = [e for e, _ in coppie]
        raggio = _raggio_marker(box)
        for n, x, y in _punti_ancore(ancore, pt_per_m):
            ents += _marcatore(msp, n, x, y, raggio)
        return _render(doc, ents, box, lato_px)
    except Exception:
        return None


def render_crops(dxf_path, ancore, pt_per_m, raggio_m=RAGGIO_RITAGLIO_M, max_ritagli=8):
    """[(numero, png_bytes)] — un ritaglio ingrandito per finding (cap a
    max_ritagli: oltre, il costo di storage/UI non ripaga)."""
    try:
        prep = _prepara(dxf_path)
        if prep is None:
            return []
        doc, msp, coppie, _ = prep
        out = []
        for n, x, y in _punti_ancore(ancore, pt_per_m)[:max_ritagli]:
            zona = (x - raggio_m, y - raggio_m, x + raggio_m, y + raggio_m)
            ents = [e for e, eb in coppie if _interseca(eb, zona)]
            ents += _marcatore(msp, n, x, y, raggio_m * FRAZIONE_MARKER_RITAGLIO)
            png = _render(doc, ents, zona, LATO_RITAGLIO_PX)
            if png:
                out.append((n, png))
        return out
    except Exception:
        return []
