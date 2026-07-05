"""Analisi normativa: incrocia il gemello digitale con le norme applicabili.

Uso: python3 -m src.normativa <gemello.json> [outdir]

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
import sys
from pathlib import Path

SOGLIA_DUE_SCALE_M2 = 900.0   # OLL 4 art. 7 cpv. 2
LARGHEZZA_PORTA_M = 0.90      # OLL 4 art. 10 cpv. 2
LARGHEZZA_CORRIDOIO_M = 1.20  # OLL 4 art. 6 e 9

NOMI_SCALE = re.compile(r"trepp|scala|stair", re.IGNORECASE)
NOMI_WC = re.compile(r"\bwc\b|gabinett|toilett", re.IGNORECASE)


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


def analizza(twin, norme):
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
    strette = [(w, p) for w, p in porte if w < LARGHEZZA_PORTA_M]
    if porte:
        esiti.append({
            "esito": "da_verificare" if strette else "conforme",
            "riferimento": f"{art10['fonte']} art. {art10['articolo']} cpv. 2",
            "verifica": (
                f"{len(porte)} aperture con larghezza dichiarata sulla tavola; "
                f"{len(strette)} sotto 0,90 m: "
                + (", ".join(f"{w:.2f} m (x{p[0]:.0f},y{p[1]:.0f})" for w, p in strette)
                   if strette else "nessuna")
                + ". Il requisito vale per le porte SU VIE D'EVACUAZIONE: le "
                  "aperture sotto soglia vanno verificate dal progettista "
                  "rispetto al piano di evacuazione."
            ),
            "testo_norma": art10["testo"],
        })

    # --- OLL 4 art. 6 e 9: passaggi e corridoi >= 1.20 m
    art6 = _articolo(norme, "RS 822.114 (OLL 4)", 6)
    esiti.append({
        "esito": "non_verificabile",
        "riferimento": f"{art6['fonte']} art. 6 e art. 9",
        "verifica": (
            "La larghezza dei passaggi principali e dei corridoi (min. 1,20 m) "
            "non è ricavabile automaticamente dai timbri dei locali di questa "
            "tavola: serve la misura dei percorsi (arriverà con l'ingestione "
            "IFC o con quote dedicate)."
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
        "riferimento": "UR 40.1111 (PBG) art. 17 + Bauordnung Altdorf",
        "verifica": (
            "Distanze dai confini, altezze e indici di sfruttamento sono "
            "fissati dalla Bauordnung comunale di Altdorf (non ancora nel DB) "
            "e si verificano sulla planimetria di situazione, non sulla "
            "pianta del piano. Le definizioni di misura sono quelle IVHB "
            "(UR 40.1117)."
        ),
        "testo_norma": art17["testo"],
    })

    return esiti


def render(twin, esiti):
    icone = {"conforme": "✅", "non_conforme": "❌",
             "da_verificare": "⚠️", "non_verificabile": "ℹ️"}
    lines = [
        f"# Analisi normativa — {Path(twin['file']).name}",
        "",
        "Edificio commerciale/artigianale (Gewerbe), Altdorf (UR). "
        "Norme citate dallo snapshot del DB Lexum CH.",
        "",
    ]
    for e in esiti:
        lines += [
            f"## {icone[e['esito']]} {e['riferimento']} — {e['esito'].replace('_', ' ')}",
            "",
            e["verifica"],
            "",
            f"> {e['testo_norma']}",
            "",
        ]
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        sys.exit("uso: python3 -m src.normativa <gemello.json> [outdir]")
    data = json.loads(Path(sys.argv[1]).read_text())
    twin = data["twin"]
    outdir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    norme = json.loads((Path(__file__).parent.parent / "norme" / "snapshot_oll.json").read_text())

    esiti = analizza(twin, norme)
    report = render(twin, esiti)
    (outdir / "report_normativa.md").write_text(report)
    (outdir / "esiti_normativa.json").write_text(
        json.dumps(esiti, indent=1, ensure_ascii=False))
    print(report)


if __name__ == "__main__":
    main()
