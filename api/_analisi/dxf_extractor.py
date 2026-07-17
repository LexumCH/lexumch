"""Estrattore DXF → gemello digitale (drop-in del path PDF).

Perché: nel PDF le quote di sezione sono *testo vicino a segni* e la misura va
indovinata dalla geometria (recupero non infallibile per le quote ancorate agli
spigoli — i Vektorpunkte). In un DXF la quota è un'entità DIMENSION che porta il
valore reale calcolato dagli spigoli misurati: `dim.get_measurement()`. Quindi la
misura è ESATTA per costruzione, zero falsi positivi, anche per le sezioni.

Output: lo STESSO dict a 4 chiavi di `pipeline.build_twin` (file/metadata/quote/
locali), così checks.py, normativa.py, la narrazione e la UI restano invariati.
Ogni quota lineare/allineata esce `stato="ok"` con `err_mm≈0`.

ezdxf è puro-Python → deployabile su Vercel accanto a PyMuPDF. Il DWG NON si
converte qui (ambiente serverless sbagliato): il formato canonico è il DXF, che
ArchiCAD esporta nativamente; l'eventuale DWG va convertito a monte (servizio
esterno) e poi passa da questo stesso estrattore.
"""

import math
import re
import tempfile

import ezdxf
from ezdxf import recover
from ezdxf.math import Vec3

# Stessa base del path PDF (extractor.PT_PER_M_BASE): 1 m = 72/0.0254 pt a 1:1.
PT_PER_M_BASE = 72 / 0.0254
# Scala di display di riferimento: nel DXF non esiste una "tavola", ma span_pt
# deve restare coerente per check_scale_calibration (ratio span_pt/valore_m ==
# pt_per_m ⇒ scala_rilevata == scala_dichiarata). 50 è solo una base consistente.
SCALA_DEFAULT = 50
TOLLERANZA_MM = 5.0

# dimtype (già mascherato & 15 da .dimtype): tipi che danno una LUNGHEZZA usabile.
DIM_LINEAR = 0
DIM_ALIGNED = 1

# $INSUNITS → fattore per convertire in METRI. I più comuni nei disegni edili.
INSUNITS_TO_M = {
    1: 0.0254,   # inch
    2: 0.3048,   # foot
    4: 0.001,    # mm  (default ArchiCAD)
    5: 0.01,     # cm
    6: 1.0,      # m
    14: 0.1,     # dm
    13: 1e-9,    # nm (raro)
}


# ---------------------------------------------------------------- caricamento robusto

def _is_code(line):
    s = line.strip()
    if not s:
        return False
    if s[0] in "+-":
        s = s[1:]
    return s.isdigit()


def _ripara_dxf_ascii(path):
    """I convertitori DWG→DXF (libredwg) scrivono MTEXT con newline GREZZE dentro
    il valore: una newline sfasa TUTTE le coppie [codice]\\n[valore] successive e
    il tokenizer si ferma. Si riallinea: dove ci si aspetta un codice-intero e non
    c'è, la riga è la continuazione del valore precedente → la si rifonde. Scrive
    un DXF riparato in /tmp e ne ritorna il percorso."""
    raw = open(path, encoding="utf-8", errors="replace").read().split("\n")
    out = []
    i, n = 0, len(raw)
    while i < n:
        if _is_code(raw[i]):
            out.append(raw[i].strip())
            out.append(raw[i + 1] if i + 1 < n else "")
            i += 2
        else:
            if out:
                out[-1] = out[-1] + " " + raw[i]
            i += 1
    fd = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False, mode="w", encoding="utf-8")
    fd.write("\n".join(out))
    fd.close()
    return fd.name


def _leggi_dxf(path):
    """Apre un DXF nel modo più tollerante: strict → recover (auditor) →
    riparazione delle coppie codice-valore + strict. I DXF reali da convertitore
    sono spesso non-standard: senza questa catena non si aprono."""
    try:
        return ezdxf.readfile(path)
    except Exception:
        pass
    try:
        doc, _auditor = recover.readfile(path)
        return doc
    except Exception:
        pass
    riparato = _ripara_dxf_ascii(path)
    try:
        return ezdxf.readfile(riparato)
    except Exception:
        doc, _auditor = recover.readfile(riparato)
        return doc


# ---------------------------------------------------------------- helpers

def _to_metri(valore_unita, insunits, fattore_fallback):
    """Converte una misura dalle unità del disegno ai metri."""
    f = INSUNITS_TO_M.get(insunits)
    if f is None:
        f = fattore_fallback
    return valore_unita * f


def _fattore_fallback(misure_unita):
    """Quando $INSUNITS manca/è 0: stima l'unità dalla scala dei valori.
    Un muro reale sta ~0.1–100 m. In mm sarebbe 100–100000, in cm 10–10000.
    Si sceglie il fattore che porta la mediana in un range edile plausibile."""
    vals = sorted(v for v in misure_unita if v > 0)
    if not vals:
        return 0.001  # default prudente: mm
    med = vals[len(vals) // 2]
    for f in (1.0, 0.01, 0.001):        # m, cm, mm
        if 0.05 <= med * f <= 200:
            return f
    return 0.001


def _plain_text(dim):
    """Testo mostrato dalla quota. '<>' o vuoto ⇒ automatico (usa la misura)."""
    try:
        t = dim.dxf.text if dim.dxf.hasattr("text") else "<>"
    except Exception:
        t = "<>"
    return (t or "").strip()


def _num_override(testo):
    """Override numerico ESPLICITO = il progettista ha forzato un valore diverso
    dalla misura (candidato 'quota scritta sbagliata'). NON è un override se il
    testo contiene un campo automatico — '<>' oppure '<MeasuredValue>'/'<...>':
    lì il numero mostrato È la geometria e il resto (seconda riga ^M, apice
    mezzo-cm '\\S5^', roh/fertig) è ANNOTAZIONE, non una pretesa di valore.
    Verificato su DXF ArchiCAD reale: trattarli come override darebbe decine di
    falsi 'quota sbagliata'."""
    if not testo:
        return None
    if "<>" in testo or re.search(r"<[^>]*>", testo):
        return None
    m = re.search(r"\d+(?:[.,]\d+)?", testo)
    return float(m.group(0).replace(",", ".")) if m else None


def _iter_dimensions(doc, msp):
    """Tutte le DIMENSION: modelspace + blocchi NOMINATI (le quote possono stare
    dentro block/xref ArchiCAD). Si saltano i blocchi anonimi '*' (sono la
    geometria renderizzata della quota stessa, non contenitori). Dedup per handle."""
    viste = {}
    for d in msp.query("DIMENSION"):
        viste[d.dxf.handle] = d
    for block in doc.blocks:
        if block.name.startswith("*"):
            continue
        for d in block.query("DIMENSION"):
            viste[d.dxf.handle] = d
    return list(viste.values())


# ---------------------------------------------------------------- quote

def _dim_to_testo(dim, pt_per_m, insunits, fattore_fb):
    """Mappa una DIMENSION lineare/allineata → dict-testo del gemello, oppure None."""
    base = dim.dimtype  # proprietà già mascherata & 15
    if base not in (DIM_LINEAR, DIM_ALIGNED):
        return None
    try:
        misura = dim.get_measurement()          # float per lineari/allineate
    except TypeError:
        return None                              # tipi senza misura scalare
    if not isinstance(misura, (int, float)) or misura is None:
        return None

    try:
        a = Vec3(dim.dxf.defpoint2)              # 1° spigolo misurato (code 13)
        b = Vec3(dim.dxf.defpoint3)              # 2° spigolo misurato (code 14)
    except Exception:
        a = b = None

    misura = float(misura)
    # Robustezza allineate: get_measurement proietta su dxf.angle; se una diagonale
    # non memorizza l'angolo la proiezione può sottostimare. La distanza euclidea
    # tra gli spigoli è la lunghezza vera → si usa quella se diverge troppo.
    if base == DIM_ALIGNED and a is not None and b is not None:
        eucl = a.distance(b)
        if eucl > 0 and abs(eucl - misura) > max(1e-6, 0.02 * eucl):
            misura = eucl

    valore_m = _to_metri(misura, insunits, fattore_fb)
    # Scarta le quote degeneri (misura ~0): dimensioni a lunghezza nulla o
    # entità di annotazione senza distanza reale — rumore, non quote.
    if valore_m < 0.005:
        return None

    if a is not None and b is not None:
        mid = (a + b) * 0.5
        d = b - a
        orient = "orizzontale" if abs(d.x) >= abs(d.y) else "verticale"
    else:
        mid = Vec3(dim.dxf.defpoint)
        d = None
        orient = "orizzontale"
    cx, cy = mid.x * pt_per_m, mid.y * pt_per_m

    testo_mostrato = _plain_text(dim)
    override = _num_override(testo_mostrato)

    span_pt = round(valore_m * pt_per_m, 2)
    rec = {
        "testo": testo_mostrato if (override is not None) else f"{valore_m:.3f}",
        "valore_m": round(valore_m, 3),
        "orientamento": orient,
        "posizione_pt": [round(cx, 1), round(cy, 1)],
        "stato": "ok",
        "span_pt": span_pt,
        "err_mm": 0.0,
        "via_dxf": True,
    }
    # Linea di quota corrispondente (stesso formato del path PDF: posizione_pt
    # scalare = coordinata perpendicolare; estensione_pt = [a, b] lungo l'asse).
    # Serve a check_completezza (copertura ingombro complessivo) e alle catene.
    if a is not None and b is not None:
        if orient == "orizzontale":
            along = sorted([a.x * pt_per_m, b.x * pt_per_m]); perp = mid.y * pt_per_m
        else:
            along = sorted([a.y * pt_per_m, b.y * pt_per_m]); perp = mid.x * pt_per_m
        rec["_linea"] = {
            "orientamento": orient,
            "posizione_pt": round(perp, 1),
            "estensione_pt": [round(along[0], 1), round(along[1], 1)],
            "num_tick": 2,
            "via_dxf": True,
        }
    # Cattura per la fase-2 (label sbagliata): se c'è un override numerico che
    # diverge dalla geometria, lo si conserva senza ancora emettere un finding
    # (il formato dell'override reale va validato su un DXF ArchiCAD vero).
    if override is not None:
        rec["override_grezzo"] = override
    return rec


# ---------------------------------------------------------------- locali

def _pulisci_mtext_residui(s):
    """I convertitori (libredwg) lasciano residui di codici MTEXT che plain_mtext
    non rimuove del tutto: height '\\H0.66x;' → '.66x;' incollato al valore, e
    marker di stack '^'. Vanno tolti PRIMA delle regex, altrimenti sporcano il
    numero BF (es. '23.04.66x;^' verrebbe letto '23.04.66')."""
    s = re.sub(r"\.\d+x;", "", s)   # residuo height ancorato al punto
    s = re.sub(r"[{}\^]", "", s)    # graffe e marker di stack
    return re.sub(r"\s+", " ", s).strip()


def _plain_mtext(entity):
    try:
        from ezdxf.tools.text import plain_mtext
        return plain_mtext(entity.text)
    except Exception:
        return getattr(entity, "text", "") or ""


# Layer dei timbri-locale ArchiCAD (Raumstempel/Wohnungsfläche). Se presenti si
# usano SOLO quelli: gli altri testi (quote, note, arredo) inquinano i cluster.
RE_LAYER_TIMBRO = re.compile(r"raumstempel|wohnungsfläche|wohnungsflaeche", re.I)
CLUSTER_TOL_M = 2.5  # semilato del timbro-locale in metri (stampi compatti)


def _extract_rooms_dxf(doc, msp, pt_per_m):
    """Timbri-locale dai TEXT/MTEXT del layer Raumstempel (fallback: tutti):
    frammenti puliti dai codici, clusterizzati per prossimità in metri, ricomposti
    e passati alle stesse regex del path PDF (BF:, [BWD]:)."""
    frags = []
    for e in msp.query("TEXT MTEXT"):
        raw = _plain_mtext(e) if e.dxftype() == "MTEXT" else (e.dxf.text or "")
        t = _pulisci_mtext_residui(raw)
        if not t:
            continue
        try:
            ins = Vec3(e.dxf.insert)
        except Exception:
            continue
        frags.append((ins.x, ins.y, t, e.dxf.layer))

    timbro = [f for f in frags if RE_LAYER_TIMBRO.search(f[3] or "")]
    base = timbro if timbro else frags
    base.sort(key=lambda f: (-f[1], f[0]))

    used = [False] * len(base)
    rooms = []
    for i in range(len(base)):
        if used[i]:
            continue
        x0, y0 = base[i][0], base[i][1]
        grp = []
        for j in range(len(base)):
            if not used[j] and abs(base[j][0] - x0) < CLUSTER_TOL_M and abs(base[j][1] - y0) < CLUSTER_TOL_M:
                grp.append(base[j]); used[j] = True
        grp.sort(key=lambda f: (-round(f[1], 2), f[0]))
        text_lines = [g[2] for g in grp]
        joined = "\n".join(text_lines)
        bf = re.search(r"BF:\s*([\d.]+)\s*m", joined)
        room = {
            "nome": text_lines[0] if text_lines else None,
            "superficie_bf_m2": float(bf.group(1)) if bf else None,
            "finiture": {k: v.strip() for k, v in re.findall(r"([BWD]):\s*([^\n]+)", joined)},
            "posizione_pt": [round(min(g[0] for g in grp) * pt_per_m),
                             round(min(g[1] for g in grp) * pt_per_m)],
            "testo_completo": text_lines,
        }
        if room["superficie_bf_m2"] is not None or (room["nome"] and len(text_lines) > 1):
            rooms.append(room)
    return rooms


# ---------------------------------------------------------------- pipeline

def _scala_dichiarata(doc):
    """Scala di display se rintracciabile in un testo '1:NN'; altrimenti None."""
    try:
        for e in doc.modelspace().query("TEXT MTEXT"):
            t = (_plain_mtext(e) if e.dxftype() == "MTEXT" else (e.dxf.text or ""))
            m = re.search(r"1\s*:\s*(\d{1,4})", t or "")
            if m:
                return int(m.group(1))
    except Exception:
        pass
    return None


def build_twin_from_dxf(dxf_path, nome_file=None, scala_forzata=None, versione_motore=None):
    doc = _leggi_dxf(dxf_path)
    msp = doc.modelspace()

    insunits = int(doc.header.get("$INSUNITS", 0) or 0)
    scala = int(scala_forzata or _scala_dichiarata(doc) or SCALA_DEFAULT)
    pt_per_m = PT_PER_M_BASE / scala

    dims = _iter_dimensions(doc, msp)
    # misure grezze (nelle unità del disegno) per stimare il fattore se INSUNITS manca
    grezze = []
    for d in dims:
        if d.dimtype in (DIM_LINEAR, DIM_ALIGNED):
            try:
                m = d.get_measurement()
                if isinstance(m, (int, float)):
                    grezze.append(float(m))
            except TypeError:
                pass
    fattore_fb = _fattore_fallback(grezze)

    testi = []
    for d in dims:
        rec = _dim_to_testo(d, pt_per_m, insunits, fattore_fb)
        if rec is not None:
            testi.append(rec)

    # linee dai record (chiave interna _linea), poi rimossa dall'output (come _t)
    linee = [t["_linea"] for t in testi if "_linea" in t]
    for t in testi:
        t.pop("_linea", None)

    locali = _extract_rooms_dxf(doc, msp, pt_per_m)

    esploso = len(testi) == 0  # nessuna DIMENSION strutturata → probabile export esploso

    metadata = {
        "pagina_pt": None,
        "formato_cm": None,
        "scala_dichiarata": scala,
        "layers": sorted({ly.dxf.name for ly in doc.layers}),
        "versione_motore": versione_motore,
        "layer_quote": None,
        "layer_timbri": None,
        "fonte": "dxf",
        "insunits": insunits,
        "dxf_esploso": esploso,
        "n_dimension": len(testi),
    }

    return {
        "file": nome_file,
        "metadata": metadata,
        "quote": {"linee": linee, "testi": testi},
        "locali": locali,
    }
