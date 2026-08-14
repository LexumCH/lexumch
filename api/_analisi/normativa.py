"""Analisi normativa: incrocia il gemello digitale con le norme applicabili.

Per un edificio commerciale/artigianale (Gewerbe) i requisiti quantificabili
in pianta vengono dal diritto federale del lavoro (OLL 3 e OLL 4). Le regole
urbanistiche cantonali (PBG/RPBG UR) riguardano zone, distanze e altezze:
richiedono la planimetria di situazione e il regolamento comunale, quindi
vengono elencate come "non verificabili da questa tavola" — mai inventate.

Esiti: conforme / non_conforme / da_verificare / non_verificabile.
Ogni esito cita l'articolo esatto (snapshot dal DB Lexum CH).
"""

import json
import re
from pathlib import Path

SOGLIA_DUE_SCALE_M2 = 900.0   # OLL 4 art. 7 cpv. 2
LARGHEZZA_PORTA_M = 0.90      # OLL 4 art. 10 cpv. 2
LARGHEZZA_CORRIDOIO_M = 1.20  # OLL 4 art. 6 e 9

NOMI_SCALE = re.compile(r"trepp|scala|stair", re.IGNORECASE)
NOMI_WC = re.compile(r"\bwc\b|gabinett|toilett", re.IGNORECASE)
# Locali di passaggio per l'art. 6/9: corridoi, atri/ingressi, vani scala.
# NB: \bgang\b non pesca "Eingang" (nessun word-boundary interno) → Eingang è
# incluso esplicitamente.
NOMI_PASSAGGI = re.compile(
    r"\b(korridor|flur|gang|durchgang|passage|eingang|corridoio|atrio|couloir"
    r"|treppenhaus)\b", re.IGNORECASE)


def carica_norme():
    return json.loads((Path(__file__).parent / "snapshot_oll.json").read_text())


def _parse_valore(testo):
    """Stessa convenzione dei disegni: '1.60' = metri, '90' = centimetri."""
    t = testo.strip()
    if "." in t:
        return float(t)
    return int(t) / 100.0


def _articolo(norme, fonte, num):
    for a in norme["articoli"]:
        if a["fonte"] == fonte and a["articolo"] == str(num):
            return a
    raise KeyError(f"{fonte} art. {num} non nello snapshot")


def analizza(twin, norme=None):
    norme = norme or carica_norme()
    esiti = []
    locali = twin["locali"]
    quote = twin["quote"]["testi"]

    # --- OLL 4 art. 7: numero di scale rispetto alla superficie del piano
    superficie = sum(r["superficie_bf_m2"] or 0 for r in locali)
    scale = [r for r in locali if r["nome"] and NOMI_SCALE.search(r["nome"])]
    art7 = _articolo(norme, "RS 822.114 (OLL 4)", 7)
    if superficie > SOGLIA_DUE_SCALE_M2:
        esiti.append({
            "esito": "conforme" if len(scale) >= 2 else "non_conforme",
            "riferimento": f"{art7['fonte']} art. {art7['articolo']} cpv. 2",
            "verifica": (
                f"Superficie del piano {superficie:.0f} m² > {SOGLIA_DUE_SCALE_M2:.0f} m² "
                f"⇒ servono almeno 2 rampe di scale. Trovate {len(scale)}: "
                + ", ".join(r["nome"] for r in scale)
            ),
            "testo_norma": art7["testo"],
        })

    # --- OLL 4 art. 10: larghezza utile porte (dalle etichette aperture)
    art10 = _articolo(norme, "RS 822.114 (OLL 4)", 10)
    porte = []
    for t in quote:
        if t["stato"] == "altezza_apertura" and t.get("abbinata_a"):
            try:
                porte.append((_parse_valore(t["abbinata_a"]), t["posizione_pt"]))
            except ValueError:
                continue
    # DXF: larghezze porte dagli ARCHI di apertura (campo 'aperture' del gemello,
    # raggio dell'arco = anta). Fonte geometrica, non testo.
    da_arco = False
    n_doppie = 0
    for ap in twin.get("aperture", []):
        if ap.get("tipo") == "porta" and ap.get("larghezza_m") is not None:
            porte.append((ap["larghezza_m"], ap["posizione_pt"]))
            da_arco = True
            if ap.get("doppia"):
                n_doppie += 1
    strette = [(w, p) for w, p in porte if w < LARGHEZZA_PORTA_M]
    if porte:
        nota_fonte = ""
        if da_arco:
            nota_fonte = (" La larghezza è dedotta dall'arco di apertura in pianta"
                          " (raggio = anta).")
            if n_doppie:
                nota_fonte += (
                    f" {n_doppie} apertura/e a due ante è/sono state riconosciute come"
                    " porte doppie e misurate sul passaggio complessivo.")
        esiti.append({
            "esito": "da_verificare" if strette else "conforme",
            "riferimento": f"{art10['fonte']} art. {art10['articolo']} cpv. 2",
            "verifica": (
                f"{len(porte)} aperture rilevate; "
                f"{len(strette)} con larghezza sotto 0,90 m: "
                + (", ".join(f"{w:.2f} m (x{p[0]:.0f},y{p[1]:.0f})" for w, p in strette)
                   if strette else "nessuna")
                + "." + nota_fonte
                + " Il requisito vale per le porte SU VIE D'EVACUAZIONE: le "
                  "aperture sotto soglia vanno verificate dal progettista "
                  "rispetto al piano di evacuazione."
            ),
            "testo_norma": art10["testo"],
            # posizioni strutturate delle aperture sotto soglia: servono ai
            # ritagli visivi (il progettista deve VEDERE la porta, non x/y in pt)
            "posizioni_pt": [[p[0], p[1]] for _, p in strette],
        })

    # --- OLL 4 art. 6 e 9: passaggi e corridoi >= 1.20 m
    # DXF: i perimetri-locale (layer Kontur) danno la LARGHEZZA MINIMA geometrica
    # di ogni locale. Sui locali di passaggio (corridoi, atri, vani scala) con
    # associazione certa (match per valore) la si confronta con 1,20 m.
    art6 = _articolo(norme, "RS 822.114 (OLL 4)", 6)
    passaggi = [
        r for r in locali
        if r.get("nome") and NOMI_PASSAGGI.search(r["nome"])
        and r.get("match_poligono") == "valore"
        and r.get("larghezza_min_m") is not None
    ]
    if passaggi:
        stretti = [r for r in passaggi if r["larghezza_min_m"] < LARGHEZZA_CORRIDOIO_M]
        esiti.append({
            "esito": "da_verificare" if stretti else "conforme",
            "riferimento": f"{art6['fonte']} art. 6 e art. 9",
            "verifica": (
                f"{len(passaggi)} locali di passaggio misurati dal perimetro "
                "(larghezza minima geometrica): "
                + ", ".join(f"{r['nome']} {r['larghezza_min_m']:.2f} m" for r in passaggi)
                + ". "
                + (("Sotto 1,20 m: "
                    + ", ".join(f"{r['nome']} ({r['larghezza_min_m']:.2f} m)" for r in stretti)
                    + " — una strozzatura locale (nicchia, arredo fisso) può "
                      "falsare la minima: verificare sul percorso di fuga reale.")
                   if stretti else "Tutti ≥ 1,20 m.")
                + " La verifica copre i locali di passaggio CON timbro: eventuali "
                  "corridoi non timbrati restano da controllare."
            ),
            "testo_norma": art6["testo"],
            "posizioni_pt": [r["posizione_pt"] for r in stretti],
        })
    else:
        esiti.append({
            "esito": "non_verificabile",
            "riferimento": f"{art6['fonte']} art. 6 e art. 9",
            "verifica": (
                "La larghezza dei passaggi principali e dei corridoi (min. 1,20 m) "
                "non è ricavabile da questa tavola: nessun locale di passaggio "
                "(corridoio, atrio, vano scala) con perimetro misurabile sui "
                "timbri presenti."
            ),
            "testo_norma": art6["testo"],
        })

    # --- OLL 3 art. 32: gabinetti
    art32 = _articolo(norme, "RS 822.113 (OLL 3)", 32)
    wc = [r for r in locali if r["nome"] and NOMI_WC.search(r["nome"])]
    esiti.append({
        "esito": "da_verificare" if wc else "non_conforme",
        "riferimento": f"{art32['fonte']} art. {art32['articolo']}",
        "verifica": (
            (f"Presenti sulla tavola: {', '.join(r['nome'] for r in wc)}. "
             if wc else "Nessun locale WC riconosciuto sulla tavola. ")
            + "Il NUMERO minimo dipende dai lavoratori occupati "
              "simultaneamente (dato non presente nel disegno)."
        ),
        "testo_norma": art32["testo"],
    })

    # --- livello cantonale/comunale: dichiarato, non inventato
    art17 = _articolo(norme, "UR 40.1111 (PBG)", 17)
    esiti.append({
        "esito": "non_verificabile",
        "riferimento": "UR 40.1111 (PBG) art. 17 + Bauordnung comunale",
        "verifica": (
            "Distanze dai confini, altezze e indici di sfruttamento sono "
            "fissati dalla Bauordnung comunale (non ancora nel DB) e si "
            "verificano sulla planimetria di situazione, non sulla pianta "
            "del piano. Le definizioni di misura sono quelle IVHB "
            "(UR 40.1117)."
        ),
        "testo_norma": art17["testo"],
    })

    return esiti
