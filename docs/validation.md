# Ověření RasterLabu 0.7

Windows, 3. 10. 2026. Node.js 24.19.0, npm 12.0.2, Rust/Cargo 1.99.0 stable pro `x86_64-pc-windows-msvc`, Visual Studio 2019 Community C++ tools, WebView2.

- TypeScript/Svelte check: 0 chyb a 0 varování.
- Unit tests: 40 testů modelu, viewportu, grafu, registry, parametrů, seedovaného PRNG, boolean/modulo operací, historie, serializace, presetů, zotavení a procedurálních map. Mapy kontrolují bijekci shuffle, stabilitu seedu, změny rozměrů, normalizované záhyby a Voronoi centra/vektory. Registry obsahuje 48 jedinečných definic s validními defaulty. Presety ověřují mapování rolí, nezávislé instance, limity, zamčený cíl, cykly včetně skupin, neznámé moduly a ukázkové recepty. Kopie obnovy kontrolují originální Bloby, verze, data a dirty stav obnovené historie.
- Rust: 3 testy skutečného save/load/overwrite, odmítnutí traversal/future version a atomického exportu/overwrite presetu s odmítnutím neplatné přípony, verze a velikosti bez změny předchozího souboru.
- Frontend production build úspěšný.
- Browser smoke: WebGL, PNG/JPEG/WebP import, opacity/visibility porovnané přes canvas snímky, blend modes, zoom, pan, lock, rozměry a neplatný bitmapový import.
- Feature test: všech 10 skutečných GPU efektů, bypass/reset, seed determinism, undo/redo, project save/load se shodnými exportovanými bytes, failed load zachová dokument, PNG/JPEG/WebP export stejného rozlišení a invariance vůči zoom/pan.
- Pixelové testy boolean shaderů: známé 8bit vstupy ověřují XOR/AND/OR/NAND RGB výstupy a binary threshold režim.
- Produkční browser testy aplikují CSP převzatou z Tauri konfigurace. Shader helper nevyžaduje eval.
- Ověřeno přeskupení efektů přetažením i šipkou a klávesové Ctrl+Z / Ctrl+Shift+Z; undo obnoví původní pořadí i výsledné pixely.
- Catalog test: 12 experimentálních GPU efektů (sady 0.3 a 0.4), determinismus a změna seedu, bypass, undo seedu, nulové transformace a síla, 64 dlaždic, 32 Voronoi buněk a jediná buňka bez vnitřních hran. Průhledné mezery v PNG, nový smíšený stack i dvouvstupový Modulo Mix po save/load mají shodné exportované bytes. Bit Plane Extractor kontroluje přesné hodnoty bitů 0 a 1 kanálu 0xaa i invert. Modulo Mix kontroluje známé RGB výstupy s tolerancí jednoho 8bit kroku a luminanční režim.
- Expansion test: všech 20 nových GPU modulů, determinismus a změna seedu, undo a bypass, identity při nulové síle včetně alpha. Ověřuje přesné AND/OR/NAND/NOR/XNOR a bit-plane výstupy, Pixel Sort vzestupně/sestupně i s prahovými bariérami a svislým směrem, akumulaci Feedback po 2 a 3 průchodech a stacionární Gray–Scott stav. Projekt obsahující všech 20 efektů zachová parametry i výsledné pixely. PNG/JPEG/WebP mají rozměr dokumentu, multipass export nezávisí na viewportu.
- Remaining test: šest posledních katalogových GPU efektů, determinismus, seed/undo a bypass. Kontroluje aritmetické výsledky Channel Algebra, identity RGB/alpha, bezpečné dělení, chybný výraz a obnovu pomocí undo i uložení aktivního pole přes Ctrl+S. Ověřuje rozdíl rekurzivních hloubek, skutečný růst buněk a zachování živých zárodků, přesné opakování pixelového proudu a neutrální nastavení všech efektů. Projekt se šesti moduly zachová parametry a exportované pixely; export nezávisí na zoomu a všechny formáty mají správný rozměr.
- Finální produkční build: všechny čtyři GPU testovací skripty a základní browser smoke prošly s CSP Tauri, celkem pokrývají 48 efektů. TypeScript a Vite build nemají chyby ani varování; Svelte runtime je v samostatném chunku.
- Workflow test: hledání, oblíbené, nezávislá duplikace, uložení efektu i stacku, import/export a trvalost presetů, mapování zdrojů, odmítnutí cyklů a limitů bez částečného zápisu, undo/redo a shodné GPU pixely při použití presetu. Skutečný IndexedDB autosave ukládá původní Bloby, nemění dirty stav, po reloadu obnoví totožný výstup a ruční save odstraní starou kopii. Nativní exportní větev je ověřena s mockem dialogu a invoke; filesystem zápis kryje Rust test.
- Desktop release build vytvořil EXE a NSIS instalátor 0.7.0. Distribuční kopie jsou v `releases/`; verze EXE je ověřena ze systémových metadat.
- Nativní UI kontrolu blokuje nedostupné připojení computer-use: `Computer Use native pipe is unavailable` / os error 2. Start EXE a nativní dialogy této verze nebyly automaticky ověřeny. Browser testy běží proti produkčnímu buildu s CSP desktopové aplikace.
- `npm audit` v předchozí iteraci: 0 známých zranitelností; tato iterace nepřidává závislosti.

Snímky: `test-results/foundation-empty.png`, `foundation-demo.png`, `effects-projects.png`, `catalog-effects.png`, `expansion-stack.png`, `expansion-sheet.png`, `remaining-stack.png`, `remaining-sheet.png`, `workflow-presets.png`. Contact sheets obsahují skutečné exporty dvaceti modulů sady 0.5 a šesti modulů sady 0.6. Nový panel presetů, hledání, oblíbené a ovládání stacků prošly vizuální kontrolou browser snímku.

Vývojový port 1420 byl v tomto systému rezervovaný Windows; Vite/Tauri používají 5173. Nově instalovaný Rust vyžaduje nový terminál nebo aktualizaci PATH aktuálního procesu.

Starší otevřené okno 0.1 obsahuje rozpracovaný dokument. Pro ověření nové verze se používá oddělený Cargo target `src-tauri/target-v02`, aby zůstalo k dispozici. Finální distribuční kopie jsou v `releases/`.

Omezení nativní UI automatizace: snímání okna vracelo `window capture timed out`, následně nástroj detekoval uživatelský vstup. Automatické nativní save/open dialogy proto nebyly kompletně ověřeny. Jejich filesystem příkazy mají Rust roundtrip testy; frontendový projektový workflow je ověřen browser testem. Vizuální kontrola layoutu vychází z browser snímků. Starší rozpracovaný dokument nebyl zavřen.
