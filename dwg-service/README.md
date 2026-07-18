# Microservizio conversione DWG → DXF

Lexum legge i **DXF** nativamente (ezdxf, dentro `/api/analizza_disegno`). Il
**DWG** è binario Autodesk e **non è convertibile dentro Vercel** (niente binari
CAD, filesystem read-only). Questo servizio esterno converte DWG→DXF con
`libredwg` e Lexum lo chiama quando è configurato.

- **Il servizio non ripara** il DXF: restituisce l'output grezzo di `dwg2dxf`.
  La riparazione (MTEXT sfasate dai convertitori) vive **una volta sola** nel
  motore Lexum: `api/_analisi/dxf_extractor.py::_leggi_dxf`.

## Contratto

| Metodo | Path | Body | Risposta |
|---|---|---|---|
| `POST` | `/convert` | i byte del `.dwg` | `200` + i byte del `.dxf` |
| `GET` | `/health` | — | `200 "ok"` |

## Deploy (esempi)

**Fly.io**
```sh
cd dwg-service
fly launch --no-deploy         # genera fly.toml (internal_port = 8080)
fly deploy
```

**Render / container generico**: build dell'immagine da `Dockerfile`, esporre
la porta `8080`.

**Locale (test)**
```sh
docker build -t lexum-dwg dwg-service
docker run -p 8080:8080 lexum-dwg
curl --data-binary @disegno.dwg http://localhost:8080/convert -o disegno.dxf
```

## Collegare a Lexum

1. Imposta su Vercel (progetto Lexum CH) l'env **`DWG_CONVERTER_URL`** =
   `https://<host-del-servizio>/convert`.
2. `analizza_disegno.py`, al caricamento di un `.dwg`, POSTa il file al servizio,
   riceve il DXF e prosegue con l'estrattore CAD. Senza l'env, il DWG dà un
   errore chiaro ("esporta in DXF").
3. (Opzionale) Riabilita l'upload `.dwg` togliendo il blocco in
   `ProgettoDisegni.jsx::caricaFile` quando il servizio è live.

## Note

- `dwg2dxf` è fornito dal pacchetto `libredwg-tools` (Debian) / `brew install libredwg` (macOS).
- Tetto input 60 MB (`MAX_BYTES`), timeout conversione 120 s.
- Nessuna dipendenza Python esterna: solo stdlib.
