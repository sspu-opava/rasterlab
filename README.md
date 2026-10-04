# RasterLab

Nedestruktivní experimentální rastrový editor v Tauri 2, Svelte 5, TypeScriptu a PixiJS 8. Verze 1.0 nabízí 53 efektů, osm samostatných generátorů, masky z jiné vrstvy, vnořené skupiny s duplikací, knihovnu presetů a automatickou obnovu rozpracovaného projektu. Efekty pokrývají všechny položky `katalog.md`. Rozhraní vychází z `gui/gui-navrh.png`.

[Český návod](docs/navod.md) · [Vydání 1.0 a rozsah ověření](docs/vydani-1.0.md)

## Spuštění

Vyžaduje Node.js 22.12+ a npm. Pro desktop navíc Rust stable pro `x86_64-pc-windows-msvc`, Visual Studio C++ build tools, Windows SDK a WebView2.

```sh
npm install
npm run dev          # prohlížeč: http://127.0.0.1:5173
npm run desktop      # nativní Tauri okno
```

```sh
npm run check
npm test
npm run build
npm run test:browser # při běžícím dev serveru; jednou: npx playwright install chromium
npm run test:features
npm run test:catalog # produkční preview na portu 4173
npm run test:expansion # dalších 20 efektů; stejné produkční preview
npm run test:remaining # posledních 6 katalogových efektů; stejné preview
npm run test:workflow # presety, kopírování, historie a IndexedDB obnova
npm run test:composition # osm generátorů, vnořené skupiny a projekty v3
npm run test:masks   # masky, duplikace skupin, projekty v3 a obnova
npm run test:creative # pět nových efektů, přesné pixely a barevná paleta
cargo test --manifest-path src-tauri/Cargo.toml --lib
npm run desktop:build
```

Desktopový instalátor vzniká v `src-tauri/target/release/bundle/nsis/`. V nově otevřeném terminálu musí být dostupné `cargo` a `rustc`.

Distribuční soubory: `releases/RasterLab-1.0.0.exe` a `releases/RasterLab-1.0.0-setup.exe`; kontrolní součty a ověřovací protokol jsou přiložené. Ověřovací desktop build používá samostatnou cache `CARGO_TARGET_DIR=src-tauri/target-v02`.

Pro test produkčního frontendu spusťte `npm run preview -- --port 4173` a v druhém PowerShell terminálu `$env:RASTERLAB_TEST_URL='http://127.0.0.1:4173'; npm run test:features; npm run test:browser`. Testy pak aplikují stejnou CSP jako Tauri.

## Co nyní funguje

- Prázdný transparentní dokument 1000 × 1000; nový dokument s vlastními rozměry 1–8192 px.
- PixiJS 8 s WebGL, checkerboard, hranice a oříznutí dokumentu.
- Zoom k ukazateli, pan myší / prostředním tlačítkem / mezerníkem, Fit a 100 %.
- Import PNG, JPEG a WebP přes výběr souborů i drag & drop; vícenásobný import.
- Assets se identifikují UUID; originální soubor se nemění. Kliknutí na asset přidá další vrstvu.
- Výběr, viditelnost, zámek, krytí, blend mode, pořadí a transformace rastrových vrstev.
- Noise, Checker, Lines, Dots, FBM Noise, Voronoi, Interference a Radial Field jako samostatné vrstvy bez importu bitmapy.
- Strom vrstev, sbalování a vnořování skupin, přesuny vrstev dovnitř i ven, efekty a transformace celé skupiny; [návod 0.8](docs/composition-0.8.md).
- Masky podle alfa kanálu nebo jasu, invertování, síla a změkčení; duplikace celých skupin s přemapováním jejich vnitřních vazeb; [návod 0.9](docs/masks-0.9.md).
- Demo experiment generovaný lokálně, bez přístupu k síti.
- Grayscale, Threshold, Posterize, Noise, RGB Shift, Wave, XOR, AND, OR a NAND jako samostatné GPU moduly.
- Crumple: procedurální záhyby deformující obraz, se světlem a stínem.
- Strips a Random Tiles: přeskupení fragmentů, průhledné mezery a transformace.
- Bit Plane Extractor, Photocopy a Interference: bitové roviny kanálů, textura kopírky a vlnová interference.
- Voronoi Collage: až 32 nepravidelných buněk s posunem obsahu a průhlednými hranami.
- Ink Bleed a Surface Relief: šíření tmavého inkoustu uvnitř obrazu a osvětlení luminanční výškové mapy.
- Contour Atlas, Scanline Displace a Modulo Mix: jasové vrstevnice, seedované posuny řádků a modulo kombinace dvou vrstev.
- Dalších 20 efektů v 0.5: [seznam a ovládání](docs/effects-0.5.md). Nová víceprůchodová API větev využívá dvě opakovaně používané GPU textury.
- Zbývajících šest v 0.6: Channel Algebra, Recursive Collage, Echo Frames, Cellular Growth, Databend a Signal Collapse; [ovládání a příklady](docs/effects-0.6.md).
- Nových pět v 0.10: Displacement Map, Halftone, Dither, Morphology a Palette Remap; [ovládání a kombinace](docs/effects-0.10.md).
- Hledání efektů podle názvu, kategorie i popisu a trvale uložené oblíbené efekty.
- Duplikace efektu a kopírování celého stacku mezi vrstvami s novým přiřazením vstupů a jediným undo.
- Knihovna až 100 uživatelských presetů, deset ukázkových postupů, import/export `.preset.json`; [návod](docs/workflow-0.7.md).
- Zotavovací kopie po 15 sekundách nečinnosti včetně originálních obrázků, nabídka obnovy po restartu a oddělený stav ručního uložení.
- Automatické UI parametrů, vícenásobné instance, změna pořadí přetažením nebo šipkami, reset a Before/After bypass.
- Více vstupů odkazem na jinou vrstvu; ochrana proti cyklům a izolace chyb efektu.
- Uložení, Uložit jako a otevření verzovaného projektu včetně originálních obrázků.
- Export celého dokumentu PNG/JPEG/WebP; průhlednost v PNG/WebP, bílé pozadí v JPEG.
- Undo/redo změn vrstev, transformací a efektů; slider/drag se slučuje do jednoho kroku.
- Render graph s cache čistých uzlů, downstream invalidací a RenderTargetPool.

## Projekty a klávesové zkratky

Desktop ukládá zvolený `.json` a vedle něj adresář `assets/`. Přenášejte společně JSON i složku. Ukládají se pouze obrázky používané dokumentem; obrázky zůstávají v původním formátu. Prohlížeč stahuje přenosný JSON s vloženými daty obrázků, který lze otevřít i v desktopové verzi. Tlačítko Uložit .rlab vytvoří jeden přenosný ZIP/STORE soubor s manifestem a původními obrázky. Neuložené změny označuje hvězdička u názvu dokumentu.

| Operace | Zkratka |
| --- | --- |
| Nový dokument | Ctrl+N |
| Import obrázků | Ctrl+I |
| Otevřít projekt | Ctrl+O |
| Uložit / uložit jako | Ctrl+S / Ctrl+Shift+S |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z nebo Ctrl+Y |
| Export | Ctrl+E |
| Přesun vrstvy / pan | V / H |
| Fit / 100 % | F / 1 |
| Dočasný pan | Mezerník nebo prostřední tlačítko |

Historie uchovává nejvýše 200 příkazů, nepersistuje se v projektu a při otevření/novém dokumentu se resetuje. Neznámý nebo selhávající efekt zachová v náhledu svůj vstup a zobrazí diagnostiku; export se při chybě aktivního efektu přeruší.

Presety a oblíbené efekty se ukládají místně do nastavení aplikace. Zotavovací kopie je v IndexedDB úložišti WebView/prohlížeče; nemaže originály a nepřepisuje ručně uložený soubor. Aplikace uchovává jednu poslední kopii pro dané úložiště. Obnovený dokument zůstává neuložený až do Ctrl+S. Vymazání dat aplikace odstraní i místní nastavení a kopii obnovy.

Projekty verze 1 a 2 se při otevření převedou na verzi 3; nové projekty vyžadují RasterLab 0.9. Verze 0.11 přidává vícečetný výběr sousedních vrstev, bezpečné rozpuštění neutrální skupiny, nastavení dokumentu a přenosný archiv. Vícevstupové efekty používají dvě vrstvy. Koláže mají nejvýše 64 fragmentů, Crumple 32 záhybů. Maximální rozměr dokumentu i assetu je 8192 px; reálná kapacita GPU a paměti závisí na počtu vrstev a efektů.

Podrobnosti: [architektura](docs/architecture.md), [Effect API](docs/effect-api.md), [projektový formát](docs/project-format.md), [vykreslování](docs/rendering.md), [ověření](docs/validation.md).

Další rozvoj: [návrh vylepšení, priority a doporučené etapy](docs/navrh-vylepseni.md).

Před vydáním 1.0: [důkladná revize funkčnosti, potvrzené chyby a prioritizované opravy](docs/revize-pred-1.0.md). Revize upozorňuje také na mezery ovládání, které dosavadní pixelové testy efektů nepokrývaly.

Stabilizace 0.11: [opravy a přesné meze](docs/stabilizace-0.11.md). Úplná kontrola: `npm run release:check -- --desktop` (vyžaduje volné porty 4173/5173); verze se synchronizuje `npm run version:sync -- 1.0.0`. Náročné dokumenty podléhají GPU preflightu 512 MiB. Desktopové přenosy mají limit 32 MiB; browserové projekty 300 MiB. Připraven je [nativní release protokol](docs/release-native-protocol.md). Veřejná distribuce a licence čekají na rozhodnutí držitele práv.
