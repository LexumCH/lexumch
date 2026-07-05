"""Verifiche sul gemello digitale: quote vs geometria, scala."""

TOLLERANZA_MM = 5.0  # scarto max tra quota dichiarata e distanza disegnata


def check_dimensions(quote):
    findings = []
    for t in quote["testi"]:
        if t["stato"] != "senza_riscontro":
            continue
        vicino = ""
        if t.get("piu_vicino_m") is not None:
            vicino = (f"; la distanza più simile sulla sua linea è "
                      f"{t['piu_vicino_m']:.3f} m")
        findings.append({
            "tipo": "quota_senza_riscontro",
            "severita": "errore",
            "messaggio": (
                f"Quota {t['orientamento']} '{t['testo']}' "
                f"({t['valore_m']:.3f} m): nessuna coppia di tick sulla sua "
                f"linea corrisponde a questo valore{vicino}"
            ),
            "posizione_pt": t["posizione_pt"],
        })

    zona = [t for t in quote["testi"] if t["stato"] == "zona_non_verificata"]
    if zona:
        xs = [t["posizione_pt"][0] for t in zona]
        ys = [t["posizione_pt"][1] for t in zona]
        valori = ", ".join(t["testo"] for t in zona)
        findings.append({
            "tipo": "zona_non_verificata",
            "severita": "avviso",
            "messaggio": (
                f"Zona di dettaglio non verificabile: {len(zona)} quote "
                f"({valori}) raggruppate in un riquadro della tavola "
                f"(x {min(xs):.0f}–{max(xs):.0f}, y {min(ys):.0f}–{max(ys):.0f} pt), "
                f"probabilmente un dettaglio costruttivo a scala non "
                f"riconosciuta o con marcatori diversi"
            ),
            "posizione_pt": [min(xs), min(ys)],
        })
    return findings


def check_scale_calibration(quote, scala_dichiarata):
    """Verifica la scala: rapporto mediano pt/m sulle quote riscontrate."""
    import statistics
    ratios = [t["span_pt"] / t["valore_m"] for t in quote["testi"]
              if t["stato"] == "ok" and t["valore_m"] > 0.5]
    if not ratios:
        return [], None
    med = statistics.median(ratios)
    scala_rilevata = round((72 / 0.0254) / med)
    findings = []
    if scala_dichiarata and abs(scala_rilevata - scala_dichiarata) > scala_dichiarata * 0.02:
        findings.append({
            "tipo": "scala_incoerente",
            "severita": "errore",
            "messaggio": (
                f"Scala dichiarata 1:{scala_dichiarata} ma dalla geometria "
                f"risulta 1:{scala_rilevata}"
            ),
        })
    return findings, scala_rilevata


def run_all(twin):
    findings = []
    scale_findings, scala_rilevata = check_scale_calibration(
        twin["quote"], twin["metadata"]["scala_dichiarata"])
    findings += scale_findings
    findings += check_dimensions(twin["quote"])
    twin["metadata"]["scala_rilevata"] = scala_rilevata
    return findings
