"""Verifiche sul gemello digitale: quote vs geometria, scala, catene."""

TOLLERANZA_MM = 5.0  # scarto max tra quota dichiarata e distanza disegnata

# Catene di quote: Σ parziali vs totale su linee parallele vicine.
CATENA_DIST_LINEE_PT = 45.0   # distanza max tra la linea dei parziali e quella del totale
CATENA_ASSOC_PT = 12.0        # un testo appartiene alla linea se dista meno di così
CATENA_BORDO_PT = 1.5         # bordi dell'unione ≈ bordi del totale: tick-esatti.
                              # A 1.5pt una serie fertig NON si accoppia col
                              # totale roh (differiscono di ~2.8pt a 1:50)
CATENA_GAP_PT = 2.5           # gap max tra parziali consecutivi (sotto-tick: un
                              # gap più largo può nascondere un segmento mancante)
CATENA_OVERLAP_PT = 2.0       # sovrapposizione max: i parziali devono PARTIZIONARE
CATENA_SPAN_MIN_PT = 4.0      # sotto questo span un testo non entra nelle catene:
                              # i micro-intervalli annidati inquinerebbero la somma
CATENA_OK_M = 0.015           # somma coerente entro 15 mm
CATENA_KO_M = 0.02            # oltre 20 mm (a partizione perfetta) è un'incoerenza


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
        spread = max(max(xs) - min(xs), max(ys) - min(ys))
        if len(zona) >= 20 or spread >= 600:
            # tavola INTERA di quote non verificate = sezione/dettaglio: le quote
            # si ancorano agli spigoli della geometria, non a coppie di tick.
            findings.append({
                "tipo": "stile_non_verificabile",
                "severita": "avviso",
                "messaggio": (
                    f"{len(zona)} quote non verificabili con questo metodo: la "
                    f"tavola sembra una sezione o un dettaglio, dove le quote si "
                    f"ancorano agli spigoli della geometria e non a coppie di tick "
                    f"sulla linea. Il motore oggi verifica la quotatura di pianta: "
                    f"queste quote non sono validate (né sono errori)."
                ),
                "posizione_pt": [min(xs), min(ys)],
            })
        else:
            valori = ", ".join(t["testo"] for t in zona[:12]) + (" …" if len(zona) > 12 else "")
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


def check_catene(quote):
    """Doppia corroborazione: la somma dei parziali di una catena deve
    coincidere col totale sulla linea parallela adiacente.

    Deterministico e CONSERVATIVO, per non produrre mai falsi positivi:
    - i parziali devono PARTIZIONARE il totale (bordi allineati, contigui,
      senza sovrapposizioni: un gap largo può nascondere un segmento mancante,
      una sovrapposizione indica testi estranei alla catena);
    - una stessa partizione può affacciarsi su più totali (serie roh/fertig):
      si confronta col totale PIÙ VICINO in valore, e si segnala solo se
      nemmeno il migliore corrisponde (best-pairing).
    Ritorna (findings, n_catene_verificate).
    """
    ok = [t for t in quote["testi"]
          if t["stato"] in ("ok", "ok_dettaglio") and t.get("span_pt")]

    def asse(t):      # coordinata lungo la linea
        return t["posizione_pt"][0] if t["orientamento"] == "orizzontale" else t["posizione_pt"][1]

    def perp(t):      # coordinata trasversale (per associare testo → linea)
        return t["posizione_pt"][1] if t["orientamento"] == "orizzontale" else t["posizione_pt"][0]

    def intervallo(t):
        a = asse(t) - t["span_pt"] / 2
        return a, a + t["span_pt"]

    # partizione → tutti i totali candidati con cui si affaccia
    partizioni = {}   # chiave(ids parziali) -> {"parz", "somma", "coppie": [(tot, diff)]}
    for tot in ok:
        t0, t1 = intervallo(tot)
        for segno in (-1, 1):           # parziali sopra/sotto (o sx/dx) del totale
            cand = [p for p in ok
                    if p is not tot
                    and p["orientamento"] == tot["orientamento"]
                    and 4.0 < (perp(p) - perp(tot)) * segno <= CATENA_DIST_LINEE_PT
                    and t0 - CATENA_BORDO_PT <= intervallo(p)[0]
                    and intervallo(p)[1] <= t1 + CATENA_BORDO_PT]
            if len(cand) < 2:
                continue
            # tutti sulla stessa linea: quella del candidato più vicino al totale
            base = perp(min(cand, key=lambda p: abs(perp(p) - perp(tot))))
            grezzi = [p for p in cand
                      if abs(perp(p) - base) <= CATENA_ASSOC_PT
                      and p["span_pt"] > CATENA_SPAN_MIN_PT]
            # dedup dei testi duplicati (stesso intervallo e valore, PDF che
            # disegna il testo due volte): conterebbero doppio nella somma
            visti, riga = set(), []
            for p in sorted(grezzi, key=lambda p: (intervallo(p)[0], intervallo(p)[1])):
                a, b = intervallo(p)
                k = (round(a, 1), round(b, 1), round(p["valore_m"], 4))
                if k in visti:
                    continue
                visti.add(k)
                riga.append(p)
            if len(riga) < 2:
                continue
            # VERA partizione: camminata a cursore da t0 a t1 (ordinati per
            # inizio intervallo); intervalli annidati o gap larghi la invalidano
            cur, valida = t0, True
            for p in riga:
                a, b = intervallo(p)
                if not (-CATENA_OVERLAP_PT <= a - cur <= CATENA_GAP_PT) or b <= cur:
                    valida = False
                    break
                cur = b
            if not valida or abs(cur - t1) > CATENA_BORDO_PT:
                continue
            chiave = tuple(sorted(id(p) for p in riga))
            somma = sum(p["valore_m"] for p in riga)
            voce = partizioni.setdefault(chiave, {"parz": riga, "somma": somma, "coppie": []})
            voce["coppie"].append((tot, abs(somma - tot["valore_m"])))

    findings, verificate, emesse = [], 0, set()
    for voce in partizioni.values():
        tot, diff = min(voce["coppie"], key=lambda c: c[1])
        if diff <= CATENA_OK_M:
            verificate += 1
        elif diff > CATENA_KO_M:
            # la posizione entra nella firma: due errori identici in ali
            # simmetriche della pianta sono DUE segnalazioni distinte
            firma = (round(voce["somma"], 3), round(tot["valore_m"], 3),
                     round(tot["posizione_pt"][0]), round(tot["posizione_pt"][1]))
            if firma in emesse:
                continue
            emesse.add(firma)
            findings.append({
                "tipo": "catena_incoerente",
                "severita": "errore",
                "messaggio": (
                    f"Catena di quote incoerente: i parziali "
                    f"({' + '.join(p['testo'] for p in voce['parz'])}) sommano a "
                    f"{voce['somma']:.3f} m ma il totale sulla linea adiacente "
                    f"dichiara {tot['valore_m']:.3f} m ('{tot['testo']}'): "
                    f"scarto {diff * 1000:.0f} mm"
                ),
                "posizione_pt": tot["posizione_pt"],
            })
    return findings, verificate


def check_completezza(twin):
    """QA di COMPLETEZZA del disegno (deterministico): non verifica se le quote
    sono giuste (lo fa check_dimensions), ma segnala ciò che MANCA. Conservativo,
    per non produrre falsi positivi: severità 'avviso' (cose da completare prima
    del deposito, non errori del disegno).
    """
    findings = []
    locali = twin["locali"]
    testi = twin["quote"]["testi"]
    linee = twin["quote"]["linee"]

    # A) Timbro locale CON finiture (B/W/D) ma SENZA superficie BF → manca la BF.
    #    Le finiture rendono certo che è un timbro locale (non una nota qualsiasi).
    for r in locali:
        if r.get("superficie_bf_m2") is None and (r.get("finiture") or {}):
            nome = r.get("nome") or "(senza nome)"
            findings.append({
                "tipo": "completezza_locale_senza_superficie",
                "severita": "avviso",
                "messaggio": (
                    f"Il locale «{nome}» ha il timbro con le finiture ma nessuna "
                    f"superficie BF indicata: aggiungi la superficie."
                ),
                "posizione_pt": r.get("posizione_pt"),
            })

    # B) Locale con superficie ma SENZA denominazione → manca il nome.
    for r in locali:
        if r.get("superficie_bf_m2") is not None and not (r.get("nome") or "").strip():
            findings.append({
                "tipo": "completezza_locale_senza_nome",
                "severita": "avviso",
                "messaggio": (
                    f"Un locale di {r['superficie_bf_m2']:.2f} m² è quotato ma senza "
                    f"denominazione nel timbro."
                ),
                "posizione_pt": r.get("posizione_pt"),
            })

    # C) Quota d'ingombro complessiva mancante su un asse: se nessuna quota
    #    riscontrata copre ~l'intera estensione disegnata dell'asse, la dimensione
    #    totale del fabbricato probabilmente non è quotata.
    xs, ys = [], []
    for ln in linee:
        a, b = ln["estensione_pt"]
        if ln["orientamento"] == "orizzontale":
            xs += [a, b]; ys.append(ln["posizione_pt"])
        else:
            ys += [a, b]; xs.append(ln["posizione_pt"])
    if xs and ys:
        cw, ch = max(xs) - min(xs), max(ys) - min(ys)

        def max_span(orient):
            s = [ln["estensione_pt"][1] - ln["estensione_pt"][0]
                 for ln in linee if ln["orientamento"] == orient]
            s += [t["span_pt"] for t in testi
                  if t["orientamento"] == orient
                  and t["stato"] in ("ok", "ok_dettaglio") and t.get("span_pt")]
            return max(s) if s else 0.0

        for orient, lato, ext in (("orizzontale", "orizzontale (larghezza)", cw),
                                  ("verticale", "verticale (profondità)", ch)):
            if ext > 200 and max_span(orient) < ext * 0.70:
                findings.append({
                    "tipo": "completezza_ingombro_mancante",
                    "severita": "avviso",
                    "messaggio": (
                        f"Nessuna quota d'ingombro complessiva sul lato {lato}: "
                        f"la dimensione totale del fabbricato non risulta quotata "
                        f"da una singola catena che copre l'intera estensione."
                    ),
                    "posizione_pt": None,
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


OVERRIDE_KO_M = 0.05  # oltre 5 cm tra numero SCRITTO e geometria = errore reale


def check_override_dxf(quote):
    """DXF: una quota il cui TESTO forza un numero diverso dalla misura geometrica
    (override esplicito — NON un campo automatico '<MeasuredValue>') è una 'quota
    scritta sbagliata': la geometria è la verità. Capacità che il PDF non ha (lì
    il numero È il testo). Soglia 5 cm: sotto, è arrotondamento di display; sopra,
    è un errore reale. Solo per il path DXF (marcatore via_dxf + override_grezzo)."""
    findings = []
    for t in quote["testi"]:
        ov = t.get("override_grezzo")
        if ov is None or not t.get("via_dxf"):
            continue
        scarto = abs(ov - t["valore_m"])
        if scarto > OVERRIDE_KO_M:
            findings.append({
                "tipo": "quota_testo_discorde",
                "severita": "errore",
                "messaggio": (
                    f"Quota {t['orientamento']}: il testo dichiara {ov:.3f} m ma la "
                    f"geometria misura {t['valore_m']:.3f} m (scarto "
                    f"{round(scarto * 1000)} mm). La quota scritta non corrisponde "
                    f"al disegno — verificare."
                ),
                "posizione_pt": t["posizione_pt"],
            })
    return findings


def run_all(twin):
    findings = []
    scale_findings, scala_rilevata = check_scale_calibration(
        twin["quote"], twin["metadata"]["scala_dichiarata"])
    findings += scale_findings
    findings += check_dimensions(twin["quote"])
    catene_findings, catene_ok = check_catene(twin["quote"])
    findings += catene_findings
    findings += check_completezza(twin)
    findings += check_override_dxf(twin["quote"])
    twin["metadata"]["scala_rilevata"] = scala_rilevata
    twin["metadata"]["catene_verificate"] = catene_ok
    return findings
