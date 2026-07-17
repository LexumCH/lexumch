"""CLI di sviluppo per l'analisi disegni.

Il motore canonico vive in api/_analisi/ (bundlato nella funzione Vercel
/api/analizza_disegno): questo CLI lo importa per i test locali.

Uso:
    python3 cli.py <disegno.pdf> [outdir]          # analisi disegno
    python3 cli.py --normativa <gemello.json> [outdir]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))
from _analisi import pipeline, checks, normativa  # noqa: E402


def main():
    args = [a for a in sys.argv[1:] if a != "--normativa"]
    modo_normativa = "--normativa" in sys.argv
    if not args:
        sys.exit(__doc__)
    outdir = Path(args[1]) if len(args) > 1 else Path(__file__).parent / "out"
    outdir.mkdir(parents=True, exist_ok=True)

    if modo_normativa:
        data = json.loads(Path(args[0]).read_text())
        twin = data["twin"]
        esiti = normativa.analizza(twin)
        icone = {"conforme": "✅", "non_conforme": "❌",
                 "da_verificare": "⚠️", "non_verificabile": "ℹ️"}
        report = "\n\n".join(
            f"## {icone[e['esito']]} {e['riferimento']} — {e['esito'].replace('_', ' ')}\n\n"
            f"{e['verifica']}\n\n> {e['testo_norma']}"
            for e in esiti)
        (outdir / "report_normativa.md").write_text(report)
        (outdir / "esiti_normativa.json").write_text(
            json.dumps(esiti, indent=1, ensure_ascii=False))
        print(report)
        return

    if args[0].lower().endswith(".dxf"):
        from _analisi import dxf_extractor
        twin = dxf_extractor.build_twin_from_dxf(
            args[0], nome_file=Path(args[0]).name,
            versione_motore=pipeline.VERSIONE_MOTORE)
    else:
        twin = pipeline.build_twin(args[0])
    findings = checks.run_all(twin)
    (outdir / "gemello.json").write_text(
        json.dumps({"twin": twin, "findings": findings}, indent=1, ensure_ascii=False))
    report = pipeline.render_report(twin, findings)
    (outdir / "report.md").write_text(report)
    print(report)


if __name__ == "__main__":
    main()
