# Ověření foundation

Ověřeno na Windows dne 2. 10. 2026.

- Node.js 24.19.0, npm 12.0.2.
- Rust 1.99.0 a Cargo 1.99.0; stable `x86_64-pc-windows-msvc`.
- Visual Studio 2019 Community C++ tools; kompilace a linking Tauri úspěšné.
- `npm run check`: bez chyb a varování.
- `npm test`: 8 unit testů dokumentu, viewportu a render graph invalidace.
- `npm run build`: produkční frontend sestaven.
- `cargo check --manifest-path src-tauri/Cargo.toml`: úspěšné.
- `npm run desktop:build`: nativní EXE a NSIS instalátor sestaveny.
- `npm run test:browser`: WebGL start, import PNG/JPEG/WebP, viditelnost a krytí kontrolované porovnáním canvas snímků, všech 6 blend módů, zoom, pan, demo, zámek, vlastní rozměry a zotavení po neplatném PNG.
- Produkční frontend na portu 4173 prošel stejným testem s CSP převzatou z Tauri konfigurace.
- Sestavené nativní EXE bylo spuštěno; strom přístupnosti WebView2 potvrzuje vytvořený canvas, dokončenou inicializaci a Fit na 65 %, bez chybové výstrahy. Nativní snímání okna nebylo dostupné: Computer Use vracelo `FrameArrived timed out` / `window capture timed out`. Vizuální kontrola proto vychází z browser snímků; nativní interakce nebyly samostatně kompletně ověřeny.
- `npm audit`: bez známých zranitelností v instalovaných závislostech.

Kontrolní snímky browser testu jsou v `test-results/foundation-empty.png` a `test-results/foundation-demo.png`.

Původní dev port 1420 patří v tomto systému do rezervovaného rozsahu Windows 1331–1430. Vite i Tauri proto používají port 5173.

Pokud byl Rust nainstalován během běhu editoru/terminálu, starý proces nemusí mít aktualizovaný PATH. Otevřete nový terminál, případně přidejte `%USERPROFILE%\.cargo\bin` do PATH aktuálního procesu. Žádná změna systémových rezervací portů není potřeba.
