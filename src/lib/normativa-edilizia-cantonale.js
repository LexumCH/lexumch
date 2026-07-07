// src/lib/normativa-edilizia-cantonale.js
//
// Elenco CURATO degli atti edilizi cantonali core per ciascun cantone svizzero:
// legge edilizia (o di pianificazione) + regolamento/ordinanza d'applicazione +
// IVHB/AIHC (armonizzazione delle definizioni edilizie), dove adottata.
//
// Valori = `systematic_number` reali di `norme_cantonali_ch` (verificati sul DB
// Lexum CH, luglio 2026). L'ordine dell'array è l'ordine di visualizzazione.
// Alcuni cantoni non hanno adottato l'IVHB (BS, GE, VD, SZ) o non hanno il
// regolamento separato nel DB: si mostrano gli atti disponibili.
//
// Perché curato e non solo per parole chiave: il match testuale prende rumore
// (es. "Wasserbaugesetz" contiene "baugesetz") e falsi positivi da abbreviazioni
// ambigue (VD "LC = sur les communes", GL "PBG = Pflege- und Betreuungsgesetz",
// GE "RLE = laïcité"). Qui mostriamo solo gli atti giusti, nell'ordine giusto.

export const NORME_EDILIZIA_CANTONALE = {
  AG: ['713.100', '713.121', '713.010'],       // BauG, BauV, IVHB
  AI: ['700.000', '700.010', '700.910'],       // BauG, Verordnung, IVHB
  AR: ['721.1', '721.11'],                      // Raumplanung/Baurecht, BauV
  BE: ['721.0', '721.1', '721.2'],             // BauG, BauV, IVHB (Beitritt)
  BL: ['400', '400.11', '149.72'],             // RBG, RBV, IVHB
  BS: ['730.100', '730.110', '730.115'],       // BPG, BPV, ABPV
  FR: ['710.1', '710.11', '710.7'],            // LATeC, ReLATeC, AIHC
  GE: ['L 5 05', 'L 5 05.01', 'L 5 05.06'],    // LCI, RCI, RACI
  GL: ['VII B/1/1', 'VII B/1/4'],              // RBG, RBGVV
  GR: ['801.100', '801.110'],                  // KRG, KRVO
  JU: ['701.1'],                               // LCAT
  LU: ['735', '736', '737'],                   // PBG, PBV, IVHB
  NE: ['720.0', '720.1', '701.0', '720.5'],    // LConstr, RELConstr, LCAT, AIHC
  NW: ['611.1', '611.11', '611.2'],            // PBG, PBV, IVHB
  OW: ['710.1', '710.3'],                      // PBG, IVHB
  SG: ['731.1', '731.11'],                     // PBG, PBV
  SH: ['700.100', '700.101', '700.110'],       // Baugesetz, BauV, IVHB
  SO: ['711.1', '711.64'],                     // PBG, IVHB
  SZ: ['400.100', '400.111'],                  // PBG, PBV
  TG: ['700', '700.1', '700.2'],               // PBG, PBV, IVHB
  TI: ['705.100', '705.110', '701.100', '701.110'], // LE, RLE, LST, RLST
  UR: ['40.1111', '40.1115', '40.1117'],       // PBG, RPBG, IVHB
  VD: ['700.11', '700.11.1'],                  // LATC, RLATC
  VS: ['705.1', '705.101'],                    // LC, AIHC
  ZG: ['721.11', '721.111', '721.7'],          // PBG, V PBG, IVHB
  ZH: ['700.1'],                               // PBG
}

export default NORME_EDILIZIA_CANTONALE
