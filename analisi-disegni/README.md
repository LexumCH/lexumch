# Analisi disegni — prototipo

Prototipo dei due tool del futuro ruolo Progettista di Lexum CH:
**analisi del disegno** (quote vs geometria) e **analisi normativa**
(gemello digitale vs norme dal DB Lexum). Legge un PDF **vettoriale**
esportato da ArchiCAD (con layer OCG conservati) — tutto deterministico,
nessuna AI di visione.

## Uso

```bash
pip3 install pymupdf
python3 -m src.main <disegno.pdf> [outdir]        # analisi del disegno
python3 -m src.normativa out/gemello.json [outdir] # analisi normativa
```

Output: `out/gemello.json`, `out/report.md` (disegno),
`out/report_normativa.md` + `out/esiti_normativa.json` (normativa).

## Cosa fa

1. **Estrazione per layer** (`src/extractor.py`)
   - metadata dal cartiglio (formato, scala dichiarata)
   - dal layer `105 Bemassung`: linee di quota, tick a 45°, testi con
     convenzione svizzera (`3.40` = metri, `28` = cm, apice = mezzo cm)
   - dal layer `087 Raumstempel`: locali con nome, finiture B/W/D,
     superficie BF dichiarata

2. **Verifica quote vs geometria**: ogni valore dichiarato deve corrispondere
   (±5 mm reali) alla distanza di una coppia di tick della sua linea che
   contiene il testo. Classificazione degli esiti:
   - `ok` — riscontrata sulla geometria
   - `altezza_apertura` — etichetta porta/finestra (larghezza/altezza
     impilate): l'altezza non è misurabile in pianta, riconosciuta e scartata
   - `fuori_tavola` — quota troncata dal bordo tavola o totale d'edificio
     che non sta fisicamente nella tavola in scala
   - `ok_dettaglio` — quota di un dettaglio costruttivo a scala diversa,
     accettata solo se ≥3 quote concordano sulla stessa scala nella stessa zona
   - `zona_non_verificata` — cluster compatto di quote irrisolte (dettaglio a
     scala ignota): un solo avviso di zona, non errori singoli
   - `senza_riscontro` — ERRORE: nessuna distanza reale corrisponde al valore

3. **Calibrazione scala**: la scala risultante dalla geometria (mediana pt/m
   sulle quote riscontrate) deve coincidere con quella dichiarata nel cartiglio.

## Perché il modello è così

Imparato sul piano reale GAMMA AG (Gewerbezentrum Waldweg, Altdorf):

- Nei piani esecutivi la stessa linea di quota porta **due serie di valori**:
  misura grezza (roh) sopra e finita (fertig) sotto, con tick su facce diverse
  dello stesso muro. Un testo NON corrisponde quindi all'intervallo tra due
  tick consecutivi: va riscontrato contro una coppia qualsiasi di tick che lo
  contiene.
- Le quote piccole (2 cm, 10.5 cm) hanno il testo scritto FUORI dal proprio
  intervallo: il margine di ricerca deve coprire la larghezza del testo.
- Sulla stessa tavola convivono dettagli costruttivi a scala diversa.

## Risultati sul piano di riferimento

561 testi quota: 493 riscontrati ±5 mm, 49 altezze aperture, 12 fuori
tavola, 7 in zona dettaglio, **0 senza riscontro** (il disegno è corretto).
Controprova di sensibilità: alterando di +5 cm i valori di 5 quote, le 3
misurabili in pianta vengono tutte segnalate.

## Analisi normativa (`src/normativa.py`)

Incrocia il gemello digitale con le norme applicabili a un edificio Gewerbe:
OLL 4 (RS 822.114: scale in funzione della superficie del piano, larghezza
porte su vie di fuga, corridoi) e OLL 3 (RS 822.113: gabinetti). Ogni esito
(`conforme` / `non_conforme` / `da_verificare` / `non_verificabile`) cita
l'articolo esatto. Le regole cantonali/comunali (PBG UR, Bauordnung) vengono
dichiarate non verificabili dalla pianta — mai inventate. Le norme sono in
`norme/snapshot_oll.json` (snapshot dal DB Lexum CH: in produzione il modulo
interrogherà direttamente `norme_ch`/`norme_cantonali_ch`).

Sul piano di riferimento ha prodotto un finding reale: due porte da 0,88 m
(una EI30 accanto al WC IV) sotto la soglia di 0,90 m richiesta alle porte
su vie d'evacuazione — correttamente triaged "da verificare".

## Limiti noti / prossimi passi

- Richiede PDF vettoriale con layer OCG. Fallback per PDF "piatti"
  (classificazione da spessori/colori/retini) da costruire; i PDF scansionati
  vanno rifiutati con messaggio chiaro.
- Nomi layer ArchiCAD hardcoded (`105 Bemassung 1:50`, `087 ... Raumstempel`):
  serve auto-rilevamento per convenzioni di altri studi.
- Le superfici BF dichiarate nei timbri non sono verificate contro i poligoni
  dei locali (le zone non sono nel PDF: arriverà con l'ingestione IFC).
- Solo quote orizzontali/verticali (le oblique sono rare nelle piante).
- Il check "esiste una coppia di tick che corrisponde" può in teoria assolvere
  una quota sbagliata se un'altra coppia sulla stessa linea misura per caso lo
  stesso valore: improbabile ma possibile su linee molto affollate.
- Il modulo normativo (confronto con PBG/LE cantonali dal DB Lexum) è la fase
  successiva: usa `gemello.json` come input.
