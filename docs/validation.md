# Ověření RasterLabu 0.2

Windows, 2. 10. 2026. Node.js 24.19.0, npm 12.0.2, Rust/Cargo 1.99.0 stable pro `x86_64-pc-windows-msvc`, Visual Studio 2019 Community C++ tools, WebView2.

- TypeScript/Svelte check: 0 chyb a 0 varování.
- Unit tests: 20 testů modelu, viewportu, grafu, registry, parametrů, seedovaného PRNG, boolean operací, historie a serializace.
- Rust: 2 testy skutečného save/load/overwrite a odmítnutí traversal/future version.
- Frontend production build úspěšný.
- Browser smoke: WebGL, PNG/JPEG/WebP import, opacity/visibility porovnané přes canvas snímky, blend modes, zoom, pan, lock, rozměry a neplatný bitmapový import.
- Feature test: všech 10 skutečných GPU efektů, bypass/reset, seed determinism, undo/redo, project save/load se shodnými exportovanými bytes, failed load zachová dokument, PNG/JPEG/WebP export stejného rozlišení a invariance vůči zoom/pan.
- Pixelové testy boolean shaderů: známé 8bit vstupy ověřují XOR/AND/OR/NAND RGB výstupy a binary threshold režim.
- Produkční browser testy aplikují CSP převzatou z Tauri konfigurace. Shader helper nevyžaduje eval.
- Ověřeno přeskupení efektů přetažením i šipkou a klávesové Ctrl+Z / Ctrl+Shift+Z; undo obnoví původní pořadí i výsledné pixely.
- Desktop release build vytvořil EXE a NSIS instalátor 0.2.0. Distribuční EXE bylo spuštěno; WebView2 strom potvrzuje inicializovaný canvas, Fit na 65 %, UI verze 0.2 a žádnou chybovou výstrahu.
- `npm audit`: 0 známých zranitelností.

Snímky: `test-results/foundation-empty.png`, `foundation-demo.png`, `effects-projects.png`.

Vývojový port 1420 byl v tomto systému rezervovaný Windows; Vite/Tauri používají 5173. Nově instalovaný Rust vyžaduje nový terminál nebo aktualizaci PATH aktuálního procesu.

Starší otevřené okno 0.1 obsahuje rozpracovaný dokument. Pro ověření nové verze se používá oddělený Cargo target `src-tauri/target-v02`, aby zůstalo k dispozici. Finální distribuční kopie jsou v `releases/`.

Omezení nativní UI automatizace: snímání okna vracelo `window capture timed out`, následně nástroj detekoval uživatelský vstup. Automatické nativní save/open dialogy proto nebyly kompletně ověřeny. Jejich filesystem příkazy mají Rust roundtrip testy; frontendový projektový workflow je ověřen browser testem. Vizuální kontrola layoutu vychází z browser snímků. Starší rozpracovaný dokument nebyl zavřen.
