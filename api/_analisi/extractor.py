"""Estrattore del "gemello digitale" da un PDF vettoriale ArchiCAD.

Legge geometria e testi per layer (OCG) e ricostruisce:
- metadata del cartiglio (scala, formato)
- quote: linee di quota, tick, testi con convenzione svizzera; ogni testo
  viene riscontrato contro la geometria (coppia di tick che lo contiene)
- timbri dei locali (nome, finiture, superficie BF)

Nota sul modello delle quote: nei piani esecutivi la stessa linea porta due
serie di valori (misura grezza "roh" sopra, finita "fertig" sotto) con tick
su facce diverse dello stesso muro, quindi un testo NON corrisponde sempre
all'intervallo tra due tick consecutivi. La verifica giusta è: il valore
dichiarato deve corrispondere alla distanza di UNA coppia di tick della sua
linea che contiene il testo. Le etichette delle aperture (larghezza/altezza,
es. 90/2.32) hanno l'altezza non misurabile in pianta: vengono riconosciute
e marcate, non verificate.
"""

import math
import re
from collections import defaultdict

import fitz

LAYER_BEMASSUNG = "105 Bemassung 1:50"
LAYER_RAUMSTEMPEL = "087 Wohnungsfläche WF (Raumstempel)"

# 1 m alla scala 1:1 = 72/0.0254 pt; alla scala 1:S diviso S
PT_PER_M_BASE = 72 / 0.0254

TICK_LEN = (6.0, 10.0)     # lunghezza tipica dei tick ArchiCAD (45°) in pianta
TICK_LEN_FALLBACK = (3.0, 20.0)  # range esteso: sezioni/dettagli usano tick più
                                 # lunghi (11-20pt) che il detector primario
                                 # scarta; usato SOLO come fallback sulle quote
                                 # irrisolte (percorso primario intatto)
COLLINEAR_TOL = 0.6        # pt: tolleranza per collinearità
TICK_ON_LINE_TOL = 1.2     # pt: distanza max tick-centro dalla linea di quota
TEXT_OFFSET_MAX = 14.0     # pt: distanza max testo quota dalla sua linea
TEXT_MARGIN = 8.0          # pt: quanto un testo può sporgere dal suo span
SUPERSCRIPT_MAX_SIZE = 6.0 # pt: font size sotto cui un numero è apice (mezzo cm)
TOLLERANZA_MM = 5.0        # scarto max quota dichiarata vs distanza disegnata


def span_text(span):
    return "".join(chr(c[0]) for c in span["chars"])


def load_page(pdf_path):
    doc = fitz.open(pdf_path)
    return doc, doc[0]


# ---------------------------------------------------------------- layer

def detect_layers(page):
    """Riconosce i layer quote e timbri dal CONTENUTO, non dal nome.

    Ogni studio usa le proprie convenzioni di denominazione: il layer delle
    quote è quello che massimizza tick a 45° x testi numerici in convenzione
    svizzera; il layer dei timbri locali è quello con più pattern 'BF: n m2'
    (o comunque superfici in m2).
    """
    seg_by_layer = defaultdict(list)
    for d in page.get_drawings():
        layer = d.get("layer")
        if not layer:
            continue
        for it in d["items"]:
            if it[0] == "l":
                seg_by_layer[layer].append((it[1], it[2]))

    text_by_layer = defaultdict(list)
    for s in page.get_texttrace():
        layer = s.get("layer")
        if layer:
            text_by_layer[layer].append(span_text(s).strip())

    best_bem, best_bem_score = None, 0
    for layer, segs in seg_by_layer.items():
        n_ticks = len(_ticks(segs))
        n_nums = sum(1 for t in text_by_layer.get(layer, ())
                     if re.fullmatch(r"\d+(\.\d+)?", t))
        score = n_ticks * n_nums
        if score > best_bem_score:
            best_bem, best_bem_score = layer, score

    best_rs, best_rs_score = None, 0
    for layer, txts in text_by_layer.items():
        joined = " ".join(txts)
        score = len(re.findall(r"(BF:|[\d.]+\s*m2|m²)", joined))
        if layer != best_bem and score > best_rs_score:
            best_rs, best_rs_score = layer, score

    return best_bem or LAYER_BEMASSUNG, best_rs or LAYER_RAUMSTEMPEL


# ---------------------------------------------------------------- metadata

def extract_metadata(page, scale_hint=None):
    words = page.get_text("words")
    flat = " ".join(w[4] for w in words)
    m = re.search(r"1\s*:\s*(\d+)", flat)
    scale = scale_hint or (int(m.group(1)) if m else None)
    return {
        "pagina_pt": [round(page.rect.width, 1), round(page.rect.height, 1)],
        "formato_cm": [round(page.rect.width / 72 * 2.54), round(page.rect.height / 72 * 2.54)],
        "scala_dichiarata": scale,
        "layers": sorted({d.get("layer") for d in page.get_drawings() if d.get("layer")}),
    }


# ---------------------------------------------------------------- quote

def _segments(page, layer):
    segs = []
    for d in page.get_drawings():
        if d.get("layer") != layer:
            continue
        for it in d["items"]:
            if it[0] == "l":
                segs.append((it[1], it[2]))
    return segs


def _merge_collinear(segs):
    """Fonde segmenti H/V collinari e contigui in linee massimali."""
    horiz, vert = defaultdict(list), defaultdict(list)
    for p1, p2 in segs:
        if abs(p1.y - p2.y) < COLLINEAR_TOL and abs(p1.x - p2.x) > 1:
            horiz[round(p1.y / COLLINEAR_TOL)].append((min(p1.x, p2.x), max(p1.x, p2.x), p1.y))
        elif abs(p1.x - p2.x) < COLLINEAR_TOL and abs(p1.y - p2.y) > 1:
            vert[round(p1.x / COLLINEAR_TOL)].append((min(p1.y, p2.y), max(p1.y, p2.y), p1.x))

    def merge(groups, axis):
        lines = []
        for parts in groups.values():
            parts.sort()
            cur_a, cur_b, pos = parts[0]
            for a, b, p in parts[1:]:
                if a <= cur_b + 2:
                    cur_b = max(cur_b, b)
                else:
                    lines.append({"axis": axis, "pos": pos, "a": cur_a, "b": cur_b})
                    cur_a, cur_b, pos = a, b, p
            lines.append({"axis": axis, "pos": pos, "a": cur_a, "b": cur_b})
        return lines

    return merge(horiz, "h") + merge(vert, "v")


def _ticks(segs, tick_len=TICK_LEN):
    """Tick di quota: tratti a ~45° di lunghezza tipica; ritorna i punti medi."""
    pts = []
    for p1, p2 in segs:
        L = math.hypot(p2.x - p1.x, p2.y - p1.y)
        if not (tick_len[0] <= L <= tick_len[1]):
            continue
        ang = abs(math.degrees(math.atan2(p2.y - p1.y, p2.x - p1.x))) % 180
        if 30 <= ang <= 60 or 120 <= ang <= 150:
            pts.append(((p1.x + p2.x) / 2, (p1.y + p2.y) / 2))
    return pts


def _lines_with_ticks(segs, ticks):
    """Linee di quota (segmenti H/V collinari fusi) coi tick assegnati; tiene
    solo quelle con ≥2 tick (una quota ha bisogno di una coppia di tick)."""
    lines = _merge_collinear(segs)
    for ln in lines:
        on_line = []
        for tx, ty in ticks:
            if ln["axis"] == "h" and abs(ty - ln["pos"]) < TICK_ON_LINE_TOL and ln["a"] - 2 <= tx <= ln["b"] + 2:
                on_line.append(tx)
            elif ln["axis"] == "v" and abs(tx - ln["pos"]) < TICK_ON_LINE_TOL and ln["a"] - 2 <= ty <= ln["b"] + 2:
                on_line.append(ty)
        ln["ticks"] = _dedupe(sorted(on_line))
    return [ln for ln in lines if len(ln["ticks"]) >= 2]


def _dimension_texts(page, layer):
    """Testi quota con gestione dell'apice (mezzo centimetro)."""
    spans = [s for s in page.get_texttrace() if s.get("layer") == layer]
    mains, sups = [], []
    for s in spans:
        txt = span_text(s).strip()
        if not re.fullmatch(r"\d+(\.\d+)?", txt):
            continue
        vertical = abs(s["dir"][1]) > 0.5
        entry = {
            "text": txt,
            "bbox": s["bbox"],
            "cx": (s["bbox"][0] + s["bbox"][2]) / 2,
            "cy": (s["bbox"][1] + s["bbox"][3]) / 2,
            "vertical": vertical,
            # semiestensione del testo lungo l'asse della quota
            "halfw": ((s["bbox"][3] - s["bbox"][1]) if vertical
                      else (s["bbox"][2] - s["bbox"][0])) / 2,
        }
        (sups if s["size"] < SUPERSCRIPT_MAX_SIZE else mains).append(entry)

    for m in mains:
        m["sup"] = None
        for s in sups:
            if s["vertical"] == m["vertical"] and \
               abs(s["cx"] - m["cx"]) < 12 and abs(s["cy"] - m["cy"]) < 12:
                m["sup"] = s["text"]
                break
        m["value_m"] = _parse_value(m["text"], m["sup"])
    return mains


def _parse_value(text, sup):
    """Convenzione svizzera: '3.40' = metri, '28' = centimetri, apice = mezzo cm."""
    if "." in text:
        v = float(text)
        if sup:
            v += int(sup) / 1000.0
        return v
    v = int(text)
    if sup:
        v += int(sup) / 10.0
    return v / 100.0


def extract_dimensions(page, scale, layer=None):
    layer = layer or LAYER_BEMASSUNG
    pt_per_m = PT_PER_M_BASE / scale
    tol_pt = TOLLERANZA_MM / 1000.0 * pt_per_m
    segs = _segments(page, layer)
    texts = _dimension_texts(page, layer)
    lines = _lines_with_ticks(segs, _ticks(segs))

    def match_text(t, ptm, lines_=None):
        """Miglior coppia di tick per il testo alla scala data: (err_pt, span_pt).
        lines_ permette il fallback a tick esteso senza toccare il set primario."""
        lines_ = lines if lines_ is None else lines_
        along = t["cy"] if t["vertical"] else t["cx"]
        perp_coord = t["cx"] if t["vertical"] else t["cy"]
        target = t["value_m"] * ptm
        best = None
        for ln in lines_:
            if t["vertical"] != (ln["axis"] == "v"):
                continue
            if abs(perp_coord - ln["pos"]) > TEXT_OFFSET_MAX:
                continue
            if not (ln["a"] - 10 <= along <= ln["b"] + 10):
                continue
            tk = ln["ticks"]
            # le quote piccole hanno il testo scritto fuori dallo span:
            # il margine deve coprire almeno la larghezza del testo
            margin = max(TEXT_MARGIN, t["halfw"] * 2 + 4)
            for i in range(len(tk)):
                for j in range(i + 1, len(tk)):
                    if not (tk[i] - margin <= along <= tk[j] + margin):
                        continue
                    span = tk[j] - tk[i]
                    err = abs(span - target)
                    if best is None or err < best[0]:
                        best = (err, span)
        return best

    results = []
    for t in texts:
        along = t["cy"] if t["vertical"] else t["cx"]
        best = match_text(t, pt_per_m)
        res = {
            "testo": t["text"] + (t["sup"] or ""),
            "valore_m": t["value_m"],
            "orientamento": "verticale" if t["vertical"] else "orizzontale",
            "posizione_pt": [round(t["cx"], 1), round(t["cy"], 1)],
            "_t": t,
        }
        if best is not None and best[0] <= tol_pt:
            res["stato"] = "ok"
            res["span_pt"] = round(best[1], 2)
            res["err_mm"] = round(best[0] / pt_per_m * 1000, 1)
        else:
            res["stato"] = "senza_riscontro"
            res["span_pt"] = None
            res["piu_vicino_m"] = round(best[1] / pt_per_m, 3) if best else None
            # quote troncate dal bordo tavola o totali che non ci stanno
            # fisicamente in scala: non verificabili, non errori
            target = t["value_m"] * pt_per_m
            page_extent = page.rect.height if t["vertical"] else page.rect.width
            near_edge = along < 60 or along > page_extent - 60
            oversize = target > max(page.rect.width, page.rect.height)
            if near_edge or oversize:
                res["stato"] = "fuori_tavola"
        results.append(res)

    # etichette aperture (larghezza/altezza): un testo senza riscontro
    # affiancato a un testo riscontrato con lo stesso allineamento
    for r in results:
        if r["stato"] != "senza_riscontro":
            continue
        rx, ry = r["posizione_pt"]
        for o in results:
            if o["stato"] != "ok":
                continue
            ox, oy = o["posizione_pt"]
            if r["orientamento"] != o["orientamento"]:
                continue
            if r["orientamento"] == "verticale":
                stacked = abs(ry - oy) < 8 and 0 < abs(rx - ox) < 14
            else:
                stacked = abs(rx - ox) < 8 and 0 < abs(ry - oy) < 14
            if stacked:
                r["stato"] = "altezza_apertura"
                r["abbinata_a"] = o["testo"]
                break

    # dettagli costruttivi a scala diversa sulla stessa tavola: si accetta
    # una scala alternativa solo se almeno 3 quote non riscontrate
    # concordano sulla stessa E stanno nella stessa zona della tavola
    ko = [r for r in results if r["stato"] == "senza_riscontro"]
    if len(ko) >= 3:
        best_alt, best_hits = None, []
        for alt in (20, 10, 25, 5, 100):
            ptm_alt = PT_PER_M_BASE / alt
            tol_alt = TOLLERANZA_MM / 1000.0 * ptm_alt
            hits = [(r, m) for r in ko
                    if (m := match_text(r["_t"], ptm_alt)) is not None and m[0] <= tol_alt]
            if len(hits) >= 3 and _spread([r for r, _ in hits]) < 600 \
                    and len(hits) > len(best_hits):
                best_alt, best_hits = alt, hits
        if best_alt is not None:
            for r, m in best_hits:
                r["stato"] = "ok_dettaglio"
                r["scala_dettaglio"] = best_alt
                r["span_pt"] = round(m[1], 2)

    # FALLBACK "tick esteso" (idea Vektorpunkte del progettista): nelle sezioni e
    # nei dettagli le quote usano tick più lunghi (11–20 pt) che il detector
    # primario (6–10) scarta → la linea perde i tick e la quota resta irrisolta.
    # Si ricostruiscono le linee coi tick ESTESI e si ri-verificano SOLO le quote
    # ancora irrisolte: il percorso primario resta intatto (nessun impatto sulla
    # quotatura di pianta) e il match è accettato solo se lo span coincide col
    # valore entro tolleranza — con span esatto un falso positivo è quasi
    # impossibile. Marcato via_tick_esteso per trasparenza e validazione.
    ko = [r for r in results if r["stato"] == "senza_riscontro"]
    n_ko_prima = len(ko)   # irrisolte PRIMA del fallback → rileva la "sezione"
    if ko:
        lines_ext = _lines_with_ticks(segs, _ticks(segs, TICK_LEN_FALLBACK))
        for r in ko:
            best = match_text(r["_t"], pt_per_m, lines_ext)
            if best is not None and best[0] <= tol_pt:
                r["stato"] = "ok"
                r["span_pt"] = round(best[1], 2)
                r["err_mm"] = round(best[0] / pt_per_m * 1000, 1)
                r["via_tick_esteso"] = True

    # FALLBACK 2 "linee di richiamo" (Vektorpunkte pieno): quando nemmeno il tick
    # esteso trova la coppia, molte quote di sezione hanno comunque due LINEE DI
    # RICHIAMO (extension lines, perpendicolari alla linea di quota) che marcano i
    # punti misurati. Si misura tra coppie di witness-line DEL LAYER QUOTE (niente
    # geometria d'arredo → niente rumore) allineate alla quota. Solo sulle quote
    # ancora irrisolte; accettato entro tolleranza; marcato via_witness. È la
    # misura tra spigoli chiesta dal progettista, gated per non produrre falsi.
    ko = [r for r in results if r["stato"] == "senza_riscontro"]
    if ko:
        wsegs = [(p1, p2, math.hypot(p2.x - p1.x, p2.y - p1.y)) for p1, p2 in segs]
        for r in ko:
            t = r["_t"]
            axis_v = t["vertical"]
            along0 = t["cy"] if axis_v else t["cx"]
            perp0 = t["cx"] if axis_v else t["cy"]
            target = t["value_m"] * pt_per_m
            anchors = []
            for p1, p2, L in wsegs:
                if not (6.0 <= L <= 70.0):
                    continue
                if (abs(p2.y - p1.y) > abs(p2.x - p1.x)) == axis_v:  # perpendicolare all'asse
                    continue
                pos = (p1.y + p2.y) / 2 if axis_v else (p1.x + p2.x) / 2
                cross = (p1.x + p2.x) / 2 if axis_v else (p1.y + p2.y) / 2
                if abs(cross - perp0) < 26:
                    anchors.append(round(pos, 2))
            anchors = sorted(set(anchors))
            best = None
            for i in range(len(anchors)):
                for j in range(i + 1, len(anchors)):
                    span = anchors[j] - anchors[i]
                    if span < 3:
                        continue
                    if not (anchors[i] - t["halfw"] * 2 - 6 <= along0 <= anchors[j] + t["halfw"] * 2 + 6):
                        continue
                    err = abs(span - target)
                    if best is None or err < best[0]:
                        best = (err, span)
            if best is not None and best[0] <= tol_pt:
                r["stato"] = "ok"
                r["span_pt"] = round(best[1], 2)
                r["err_mm"] = round(best[0] / pt_per_m * 1000, 1)
                r["via_witness"] = True

    # quote irrisolte da declassare da errore ad avviso — NON sono errori del
    # disegno, ma quote che il motore non verifica con questo metodo:
    #  - cluster compatto  = zona di dettaglio a scala/marcatori ignoti;
    #  - insieme AMPIO e diffuso su tutta la tavola = quasi certamente una
    #    SEZIONE/tavola di dettaglio, dove le quote si ancorano agli spigoli
    #    della geometria (Vektorpunkte) invece che a coppie di tick sulla linea:
    #    il tick-matching di pianta non gestisce quello stile → avvisi, non
    #    342 "errori" (che gonfiano anche il costo della narrazione AI).
    # Le quote irrisolte isolate (pochi KO sparsi) restano invece errori reali.
    ko = [r for r in results if r["stato"] == "senza_riscontro"]
    n_tot = len(results)
    compatto = len(ko) >= 3 and _spread(ko) < 600
    # "sezione" rilevata dall'ALTO tasso di irrisolte PRIMA del fallback: anche il
    # residuo dopo il recupero è quotatura di sezione non verificata (marcatori
    # diversi, scala di dettaglio), non errori del progettista → avviso, non
    # decine di falsi errori.
    sistematico = n_ko_prima >= max(12, int(0.30 * n_tot))
    if ko and (compatto or sistematico):
        for r in ko:
            r["stato"] = "zona_non_verificata"

    for r in results:
        del r["_t"]

    return {
        "linee": [{"orientamento": "orizzontale" if ln["axis"] == "h" else "verticale",
                   "posizione_pt": round(ln["pos"], 1),
                   "estensione_pt": [round(ln["a"], 1), round(ln["b"], 1)],
                   "num_tick": len(ln["ticks"])} for ln in lines],
        "testi": results,
    }


def _spread(results):
    """Massima estensione (pt) del bounding box delle posizioni dei testi."""
    xs = [r["posizione_pt"][0] for r in results]
    ys = [r["posizione_pt"][1] for r in results]
    return max(max(xs) - min(xs), max(ys) - min(ys))


def _dedupe(sorted_vals, tol=0.5):
    out = []
    for v in sorted_vals:
        if not out or v - out[-1] > tol:
            out.append(v)
    return out


# ---------------------------------------------------------------- locali

def extract_rooms(page, layer=None):
    layer = layer or LAYER_RAUMSTEMPEL
    spans = [s for s in page.get_texttrace() if s.get("layer") == layer]
    items = []
    for s in spans:
        txt = span_text(s).strip()
        if txt:
            b = s["bbox"]
            items.append({"text": txt, "x": b[0], "y": b[1], "x1": b[2], "y1": b[3]})

    # clustering per prossimità (i timbri sono blocchi compatti)
    clusters = []
    for it in sorted(items, key=lambda i: (i["y"], i["x"])):
        placed = False
        for cl in clusters:
            if any(abs(it["y"] - o["y"]) < 60 and abs(it["x"] - o["x"]) < 90 for o in cl):
                cl.append(it)
                placed = True
                break
        if not placed:
            clusters.append([it])

    rooms = []
    for cl in clusters:
        cl.sort(key=lambda i: (round(i["y"]), i["x"]))
        lines = defaultdict(list)
        for it in cl:
            lines[round(it["y"] / 4)].append(it)
        text_lines = [" ".join(i["text"] for i in sorted(v, key=lambda i: i["x"]))
                      for _, v in sorted(lines.items())]
        joined = "\n".join(text_lines)
        bf = re.search(r"BF:\s*([\d.]+)\s*m", joined)
        room = {
            "nome": text_lines[0] if text_lines else None,
            "superficie_bf_m2": float(bf.group(1)) if bf else None,
            "finiture": {k: v for k, v in re.findall(r"([BWD]):\s*([^\n]+)", joined)},
            "posizione_pt": [round(min(i["x"] for i in cl)), round(min(i["y"] for i in cl))],
            "testo_completo": text_lines,
        }
        rooms.append(room)
    return [r for r in rooms if r["superficie_bf_m2"] is not None or (r["nome"] and len(r["testo_completo"]) > 1)]
