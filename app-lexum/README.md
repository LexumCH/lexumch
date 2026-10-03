# Lexum app

App nativa di Lexum per iPhone e Android: la chat con Lex come home, la Banca dati, le Ricerche e l'Archivio. Un'app sola per l'Italia e la Svizzera.

- Istruzioni per chi ci lavora: `CLAUDE.md`
- Piano e decisioni aperte: `docs/PIANO.md`
- Anteprima dei mockup: `docs/mockup/anteprima/index.html`

## Provarla

Serve Node 22.13 o successivo.

```bash
cd app-lexum
npm install
npx expo start --web     # nel browser
npx expo start           # poi inquadra il QR con Expo Go sul telefono
```

Nel browser, su uno schermo largo, l'app sta dentro la sagoma di un telefono e a sinistra c'è l'elenco delle schermate dei mockup (A0–G6): toccando una voce si salta lì con i dati finti pronti. Su un telefono o in una finestra stretta l'app occupa tutto lo schermo.

Per ora (tappa 1) i dati sono tutti finti: niente accesso vero, niente Lex vero, niente database.

## Controlli

```bash
npm run check      # TypeScript, ESLint, Prettier e prove Jest
npm run test:e2e   # percorsi nel browser con Playwright (la prima volta: npx playwright install chromium)
npm run format     # sistema la formattazione
```

Le cose da fare fuori da questo repo (Supabase, Sentry, store) sono in `docs/DA-FARE-ANTONINO.md`.
