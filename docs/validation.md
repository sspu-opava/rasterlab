# Ověření RasterLabu 1.0.0

4. 10. 2026: finální EXE a NSIS instalátor mají systémovou verzi 1.0.0. Celá automatická release kontrola prošla: 0 typových chyb/varování, 70 testů ve 22 souborech, šest Rust testů, format/clippy, inventář závislostí a všech 14 browser regresních sad. Samostatně prošlo 100 cyklů import/delete/undo/new s uvolněním všech textur a URL; `review-soak.mjs` je nově také součástí dalších běhů release kontroly.

Nativně byl ověřen start EXE, otevření a zrušení open/save dialogů, odblokování operací, zpráva po zrušení save a čisté zavření. Přesný rozsah, nedostupné části automatizace a neprovedené kontroly jsou v [poznámkách k vydání 1.0](vydani-1.0.md). Distribuce obsahuje protokoly, návod a SHA-256. Instalace na čistém systému a matice GPU nebyly provedené.

## Historické ověření 0.11.0

Windows, 4. 10. 2026. Stabilizační změny a zbývající podmínky vydání popisuje [stav oprav před 1.0](stabilizace-0.11.md).

- TypeScript/Svelte: 0 chyb, 0 varování; produkční build prošel.
- Vitest: všech 68 testů v 21 souborech prošlo. Nové kontroly zahrnují archiv, migrace v1/v2/v3, limity obrázků, historii a uchování neotevřené zotavovací kopie při zavření.
- Rust: všech šest testů prošlo; `cargo fmt --check` a `cargo clippy --lib -- -D warnings` také.
- Všech 14 browser sad prošlo: Smoke, Features, Catalog, Expansion, Remaining, Creative, Composition, Workflow, Masks, Review UI, Review Model, Review Races, Review Context a Stabilization. Pokrývají všech 53 efektů a osm generátorů.
- Stabilization: 24 kontrol včetně rozepsaných polí, invalidace skrytého náhledu, shody pixelů skupin a archivů, zrušení exportu, posledních projektů a browser hustoty 100/125/150/200 %. Review UI/model ověřují původní reprodukce pan, textového undo, souběhu a čištění zdrojů historie.
- WebGL loss/restore: shodný obnovený náhled a úspěšný export. Jde o browser backend, nikoli potvrzení fyzických GPU.
- Inventář závislostí: 142 npm a 253 Rust balíčků, žádný chybějící licenční údaj. Inventář sám nenahrazuje volbu veřejné licence projektu.
- Úplný `release:check -- --desktop` skončil úspěšně včetně EXE a NSIS instalátoru. Distribuční kopie mají systémovou verzi 0.11.0 a jsou v `releases/` společně se SHA-256, protokolem a inventářem závislostí. Build použil oddělený target `src-tauri/target-v02`.

Průběh úplné kontroly ukládá `npm run release:check -- --desktop` do `test-results/release/checks.json`; jednotlivé výsledky jsou v `test-results/review/` a `test-results/release/stabilization.json`. Aktuální snímky rozhraní `foundation-demo.png` a `release/minimum-density-200.png` prošly vizuální kontrolou.

Nativní start, dialogy, instalace/upgrade na čistém Windows a fyzické GPU zůstávají neověřené kvůli nedostupnému připojení computer-use. Pro jejich ověření je připraven [nativní protokol](release-native-protocol.md). Verze 0.11.0 je stabilizační kandidát před 1.0.

## Historické ověření 0.10

Windows, 3. 10. 2026. Node.js 24.19.0, npm 12.0.2, Rust/Cargo 1.99.0 stable pro `x86_64-pc-windows-msvc`, Visual Studio 2019 Community C++ tools, WebView2.

Ve verzi 0.10 byly spuštěny unit testy, Rust testy a produkční/native build. Při následné [revizi před 1.0](revize-pred-1.0.md) byly proti 0.10 znovu spuštěny všechny browser sady: Smoke, Features, Catalog, Expansion, Remaining, Creative, Composition, Workflow a Masks. Všechny prošly. Cílená revize ovládání a chybových stavů však odhalila další chyby v pan, ukládání rozpracovaných polí, textovém undo, souběhu importu a obnově WebGL. Zelené regresní sady proto neznamenají připravenost na 1.0.

- TypeScript/Svelte check: 0 chyb a 0 varování.
- Unit tests: 53 testů v 16 souborech. Vedle modelu, efektů, historie, presetů a zotavení ověřují rekurzivní přesuny a zámky, cykly skupin, převod dragu přes transformaci rodiče, osm generátorů, migrace projektů a editaci vnořené vrstvy přes undo/redo. Masky kontrolují rozsahy, zámky, maskové/efektové/skupinové cykly, validaci v3, odstranění zdroje/undo, downstream invalidaci a přemapování efektových i maskových referencí v kopii celé skupiny. Registry efektů nyní obsahuje 53 jedinečných definic s validními defaulty.
- Rust: 5 testů skutečného save/load/overwrite v1, projektu v2 bez bitmap, maskovaného projektu v3 s odmítnutím budoucí verze bez přepsání souboru, odmítnutí traversal a atomického exportu/overwrite presetu s odmítnutím neplatné přípony, verze a velikosti bez změny předchozího souboru.
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
- Composition test: osm generátorů na skutečném GPU bez assetů, neprázdný výstup a plná alpha, přesné pixely šachovnice, determinismus, seed/undo, projekty v3 a migrace v1. Skupiny ověřují identitu při vytvoření, sbalování, vnoření, transformace a krytí rodiče, dědičný zámek, přesuny, pořadí sourozenců, skryté vstupní reference, efekty dítěte i rodiče, presety a obnovu smazaných zdrojů pomocí undo. Export PNG/JPEG/WebP zachovává rozměr a nezávisí na viewportu.
- Masks test: přesné alfa/luminanční pixely, invertování, síla, konečné změkčení, bypass a transparentní pokrytí zdroje. Skryté zdroje, změna parametrů zdroje/undo, vyloučení cyklů z nabídky, odstranění maskového zdroje/undo, maska dítěte i celé skupiny, nezávislá duplikace s přemapovanými odkazy, v3 roundtrip, skutečná IndexedDB obnova vnořených masek a generátorů po reloadu a všechny formáty exportu. Browser nesignalizoval chyby.
- Creative test: všech pět nových GPU efektů, determinismus, bypass a nulová síla; zachování alfa v tiskových/barevných efektech. Přesné pixelové posuny a transparent/wrap/clamp, neutrální průhledná mapa, bílý/černý polotónový tisk, osm světlých bodů Bayerova 4 × 4 rastru při 50 % jasu, seed/undo, dilatace alfa včetně poloměru 8, křížové okolí a eroze, přesné krajní paletové barvy a úprava vlastní barvy/undo. Stack všech pěti efektů s vlastní barvou zachová výstup při save/load; PNG/JPEG/WebP mají rozměr dokumentu a export nezávisí na viewportu.
- Desktop release build vytvořil EXE a NSIS instalátor 0.10.0. Distribuční kopie jsou v `releases/`; verze obou souborů je ověřena ze systémových metadat.
- Nativní UI kontrolu blokuje nedostupné připojení computer-use: `Computer Use native pipe is unavailable` / os error 2. Start EXE a nativní dialogy této verze nebyly automaticky ověřeny. Browser testy běží proti produkčnímu buildu s CSP desktopové aplikace.
- `npm audit` v předchozí iteraci: 0 známých zranitelností; tato iterace nepřidává závislosti.

Snímky: `test-results/foundation-empty.png`, `foundation-demo.png`, `effects-projects.png`, `catalog-effects.png`, `expansion-stack.png`, `expansion-sheet.png`, `remaining-stack.png`, `remaining-sheet.png`, `workflow-presets.png`, `composition-groups.png`, `composition-generators.png`, `masks-groups.png`, `masks-controls.png`, `creative-stack.png`, `creative-sheet.png`. Contact sheets obsahují skutečné exporty modulů a osmi generátorů. Strom vnořených skupin, panel generátorů a ovládání masek prošly vizuální kontrolou browser snímků. Ukázkový projekt je v examples/masked-generators.json.

Vývojový port 1420 byl v tomto systému rezervovaný Windows; Vite/Tauri používají 5173. Nově instalovaný Rust vyžaduje nový terminál nebo aktualizaci PATH aktuálního procesu.

Starší otevřené okno 0.1 obsahuje rozpracovaný dokument. Pro ověření nové verze se používá oddělený Cargo target `src-tauri/target-v02`, aby zůstalo k dispozici. Finální distribuční kopie jsou v `releases/`.

Omezení nativní UI automatizace: snímání okna vracelo `window capture timed out`, následně nástroj detekoval uživatelský vstup. Automatické nativní save/open dialogy proto nebyly kompletně ověřeny. Jejich filesystem příkazy mají Rust roundtrip testy; frontendový projektový workflow je ověřen browser testem. Vizuální kontrola layoutu vychází z browser snímků. Starší rozpracovaný dokument nebyl zavřen.
