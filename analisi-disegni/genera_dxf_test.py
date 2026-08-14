"""Genera un DXF sintetico a valori NOTI per testare il motore CAD senza
dipendere da un file ArchiCAD reale (il formato DXF è esatto: un fixture
sintetico è un test valido del parsing, della misura e del rendering).

La pianta è piccola ma COMPLETA — contiene un caso per ogni verifica:

  · quote automatiche (4.575 / 2.32)            → misura esatta
  · quota con testo override "9.99" su geometria 1.63  → «quota scritta sbagliata»
  · locale «Büro» BF 24.00 m² su perimetro 6.00×4.00   → superficie CONFERMATA
  · locale «Korridor» BF 8.80 m² su perimetro 8.00×1.10 → passaggio SOTTO 1.20 m
  · porta singola 0.90                          → conforme
  · porta singola 0.80                          → sotto soglia (finding)
  · porta DOPPIA 0.85 + 0.85 (cerniere a 1.70)  → va unita in 1.70, NON due finding

Uso:  python3 genera_dxf_test.py [out.dxf]
Poi:  python3 cli.py out.dxf
"""
import sys

import ezdxf

LAY_QUOTE = "105 Bemassung 1_50"
LAY_PORTE = "010 Türen"
LAY_KONTUR = "087 Wohnungsfläche WF (Raumstempel) Kontur"
LAY_TIMBRO = "087 Wohnungsfläche WF (Raumstempel) Text"


def _timbro(msp, x, y, righe):
    """Timbro-locale come frammenti di testo ravvicinati (come li scrive
    ArchiCAD: il motore li ri-aggrega per prossimità)."""
    for i, riga in enumerate(righe):
        msp.add_text(riga, height=0.18,
                     dxfattribs={"layer": LAY_TIMBRO}).set_placement((x, y - i * 0.28))


def _porta(msp, cx, cy, raggio, start, end):
    """Anta di porta: l'arco di battuta in pianta (raggio = larghezza anta)."""
    msp.add_arc(center=(cx, cy), radius=raggio, start_angle=start, end_angle=end,
                dxfattribs={"layer": LAY_PORTE})


def genera(path):
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    doc.header["$INSUNITS"] = 6  # metri
    for nome in (LAY_QUOTE, LAY_PORTE, LAY_KONTUR, LAY_TIMBRO):
        if nome not in doc.layers:
            doc.layers.add(nome)

    # ── muri (geometria di contorno, solo per il rendering) ──
    for a, b in [((0, 0), (8, 0)), ((8, 0), (8, 5.1)), ((8, 5.1), (0, 5.1)),
                 ((0, 5.1), (0, 0)), ((0, 4), (8, 4)), ((6, 0), (6, 4))]:
        msp.add_line(a, b)

    # ── perimetri-locale (layer Kontur): area = verità geometrica ──
    # Büro 6.00 × 4.00 = 24.00 m²
    msp.add_lwpolyline([(0, 0), (6, 0), (6, 4), (0, 4)], close=True,
                       dxfattribs={"layer": LAY_KONTUR})
    # Korridor 8.00 × 1.10 = 8.80 m²  → larghezza minima 1.10 < 1.20 (art. 6/9)
    msp.add_lwpolyline([(0, 4), (8, 4), (8, 5.1), (0, 5.1)], close=True,
                       dxfattribs={"layer": LAY_KONTUR})

    # ── timbri-locale: il BF dichiarato deve combaciare con l'area sopra ──
    _timbro(msp, 2.0, 2.4, ["Büro", "B: Parkett", "W: Abrieb 0.5",
                            "D: Weissputz", "BF: 24.00 m2"])
    _timbro(msp, 2.0, 4.9, ["Korridor", "B: Platten", "W: Abrieb 0.5",
                            "D: Weissputz", "BF: 8.80 m2"])

    # ── porte (archi di battuta sul layer Türen) ──
    _porta(msp, 1.0, 4.0, 0.90, 0, 90)      # singola conforme
    _porta(msp, 3.0, 4.0, 0.80, 0, 90)      # singola SOTTO soglia → finding
    # DOPPIA: due ante da 0.85, cerniere sui due stipiti a 1.70 = somma dei raggi,
    # battute specchiate (l'una verso l'altra). Il passaggio utile è 1.70, non 0.85.
    _porta(msp, 5.0, 4.0, 0.85, 0, 90)
    _porta(msp, 6.7, 4.0, 0.85, 90, 180)

    # ── quote ──
    msp.add_linear_dim(base=(0, -0.6), p1=(0, 0), p2=(4.575, 0),
                       dimstyle="EZDXF", dxfattribs={"layer": LAY_QUOTE}).render()
    msp.add_aligned_dim(p1=(0, 0), p2=(0, 2.32), distance=0.6,
                        dimstyle="EZDXF", dxfattribs={"layer": LAY_QUOTE}).render()
    # CASO-TRAPPOLA: geometria 1.63 ma il testo dichiara "9.99"
    msp.add_linear_dim(base=(2, -1.6), p1=(2, -1), p2=(3.63, -1), text="9.99",
                       dimstyle="EZDXF", dxfattribs={"layer": LAY_QUOTE}).render()

    doc.saveas(path)
    print(f"scritto {path}")
    print("  quote: 4.575 auto · 2.32 auto · 1.63 con override '9.99'")
    print("  locali: Büro BF 24.00 (perimetro 24.00) · Korridor BF 8.80 "
          "(perimetro 8.80, largh. min 1.10)")
    print("  porte: 0.90 · 0.80 (sotto soglia) · 0.85+0.85 DOPPIA (=1.70)")


if __name__ == "__main__":
    genera(sys.argv[1] if len(sys.argv) > 1 else "test_synth.dxf")
