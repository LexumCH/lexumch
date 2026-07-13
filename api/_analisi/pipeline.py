"""Pipeline completa: PDF -> gemello digitale -> findings -> report testuale."""

from pathlib import Path

from . import extractor, checks

# Versione del motore, stampata nei risultati: ogni analisi è tracciabile
# alla versione di codice che l'ha prodotta.
VERSIONE_MOTORE = "1.5.0"


def build_twin(pdf_path, nome_file=None):
    doc, page = extractor.load_page(pdf_path)
    meta = extractor.extract_metadata(page)
    meta["versione_motore"] = VERSIONE_MOTORE
    scala = meta["scala_dichiarata"] or 50
    layer_bem, layer_rs = extractor.detect_layers(page)
    meta["layer_quote"] = layer_bem
    meta["layer_timbri"] = layer_rs
    twin = {
        "file": nome_file or Path(pdf_path).name,
        "metadata": meta,
        "quote": extractor.extract_dimensions(page, scala, layer_bem),
        "locali": extractor.extract_rooms(page, layer_rs),
    }
    doc.close()
    return twin


def render_report(twin, findings):
    m = twin["metadata"]
    testi = twin["quote"]["testi"]
    n_ok = sum(1 for t in testi if t["stato"] == "ok")
    n_dett = sum(1 for t in testi if t["stato"] == "ok_dettaglio")
    n_aperture = sum(1 for t in testi if t["stato"] == "altezza_apertura")
    n_fuori = sum(1 for t in testi if t["stato"] == "fuori_tavola")
    n_zona = sum(1 for t in testi if t["stato"] == "zona_non_verificata")
    n_ko = sum(1 for t in testi if t["stato"] == "senza_riscontro")
    scale_dett = sorted({t.get("scala_dettaglio") for t in testi
                         if t["stato"] == "ok_dettaglio"})
    tot_bf = sum(r["superficie_bf_m2"] or 0 for r in twin["locali"])

    lines = [
        f"# Analisi disegno — {twin['file']}",
        "",
        f"- Formato: {m['formato_cm'][0]}×{m['formato_cm'][1]} cm, "
        f"scala dichiarata 1:{m['scala_dichiarata']}, "
        f"scala rilevata dalla geometria 1:{m.get('scala_rilevata')}",
        f"- Layer rilevati automaticamente — quote: “{m.get('layer_quote')}”, "
        f"timbri locali: “{m.get('layer_timbri')}”",
        f"- Linee di quota: {len(twin['quote']['linee'])} — "
        f"testi quota letti: {len(testi)}",
        f"- Quote riscontrate sulla geometria: {n_ok} "
        f"(tolleranza {extractor.TOLLERANZA_MM:.0f} mm)"
        + (f" + {n_dett} in dettagli a scala 1:{'/1:'.join(str(s) for s in scale_dett)}"
           if n_dett else "")
        + f" — altezze aperture (non misurabili in pianta): {n_aperture} — "
        f"troncate dal bordo tavola / totali fuori scala: {n_fuori} — "
        f"in zona dettaglio non verificabile: {n_zona} — "
        f"senza riscontro: {n_ko}",
        f"- Locali riconosciuti: {len(twin['locali'])} "
        f"(superficie BF totale {tot_bf:.2f} m²)",
        "",
        "## Esito verifiche",
        "",
    ]
    if not findings:
        lines.append("Nessuna incoerenza rilevata: ogni quota corrisponde a "
                     "una distanza reale disegnata sulla sua linea e la scala "
                     "è coerente.")
    else:
        for sev in ("errore", "avviso"):
            sel = [f for f in findings if f["severita"] == sev]
            if sel:
                lines.append(f"### {'Errori' if sev == 'errore' else 'Avvisi'} ({len(sel)})")
                lines += [f"- {f['messaggio']}" for f in sel]
                lines.append("")

    lines += ["## Locali", ""]
    for r in sorted(twin["locali"], key=lambda r: -(r["superficie_bf_m2"] or 0)):
        sup = f"{r['superficie_bf_m2']:.2f} m²" if r["superficie_bf_m2"] else "—"
        fin = ", ".join(f"{k}: {v}" for k, v in r["finiture"].items())
        lines.append(f"- **{r['nome']}** — {sup}" + (f" ({fin})" if fin else ""))
    return "\n".join(lines) + "\n"
