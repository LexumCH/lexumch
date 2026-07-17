"""Genera un DXF sintetico a valori NOTI per testare l'estrattore CAD senza un
file ArchiCAD reale (il formato DXF è esatto: un fixture sintetico è un test
valido del parsing e della misura). Include un caso-trappola con testo override
divergente dalla geometria (per la futura rilevazione "quota scritta sbagliata").

Uso:  python3 genera_dxf_test.py [out.dxf]
Poi:  python3 cli.py out.dxf
"""
import sys

import ezdxf


def genera(path):
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    doc.header["$INSUNITS"] = 6  # metri

    # geometria (muri/scala)
    msp.add_line((0, 0), (4.575, 0))
    msp.add_line((0, 0), (0, 2.32))

    # quota lineare 4.575 (testo automatico)
    msp.add_linear_dim(base=(0, -0.6), p1=(0, 0), p2=(4.575, 0), dimstyle="EZDXF").render()
    # quota allineata 2.32 (automatica)
    msp.add_aligned_dim(p1=(0, 0), p2=(0, 2.32), distance=0.6, dimstyle="EZDXF").render()
    # CASO-TRAPPOLA: geometria misura 1.63 ma il testo dichiara "9.99"
    msp.add_linear_dim(base=(2, -1.6), p1=(2, -1), p2=(3.63, -1),
                       text="9.99", dimstyle="EZDXF").render()

    doc.saveas(path)
    print(f"scritto {path} — 3 quote (4.575 auto, 2.32 auto, 1.63 con override '9.99')")


if __name__ == "__main__":
    genera(sys.argv[1] if len(sys.argv) > 1 else "test_synth.dxf")
