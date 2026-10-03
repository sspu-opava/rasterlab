# RasterLab

Nedestruktivní experimentální rastrový editor v Tauri 2, Svelte 5, TypeScriptu a PixiJS 8. Verze 0.6 nabízí 48 efektů a pokrývá všechny položky `katalog.md`, včetně skutečného Pixel Sort, iterativního Feedback, Channel Algebra a Cellular Growth. Rozhraní vychází z `gui/gui-navrh.png`.

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
cargo test --manifest-path src-tauri/Cargo.toml --lib
npm run desktop:build
```

Desktopový instalátor vzniká v `src-tauri/target/release/bundle/nsis/`. V nově otevřeném terminálu musí být dostupné `cargo` a `rustc`.

Připravené distribuční soubory této iterace: `releases/RasterLab-0.6.0.exe` a `releases/RasterLab-0.6.0-setup.exe`. Ověřovací desktop build používá samostatnou cache `CARGO_TARGET_DIR=src-tauri/target-v02`.

Pro test produkčního frontendu spusťte `npm run preview -- --port 4173` a v druhém PowerShell terminálu `$env:RASTERLAB_TEST_URL='http://127.0.0.1:4173'; npm run test:features; npm run test:browser`. Testy pak aplikují stejnou CSP jako Tauri.

## Co nyní funguje

- Prázdný transparentní dokument 1000 × 1000; nový dokument s vlastními rozměry 1–8192 px.
- PixiJS 8 s WebGL, checkerboard, hranice a oříznutí dokumentu.
- Zoom k ukazateli, pan myší / prostředním tlačítkem / mezerníkem, Fit a 100 %.
- Import PNG, JPEG a WebP přes výběr souborů i drag & drop; vícenásobný import.
- Assets se identifikují UUID; originální soubor se nemění. Kliknutí na asset přidá další vrstvu.
- Výběr, viditelnost, zámek, krytí, blend mode, pořadí a transformace rastrových vrstev.
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
- Automatické UI parametrů, vícenásobné instance, změna pořadí přetažením nebo šipkami, reset a Before/After bypass.
- Více vstupů odkazem na jinou vrstvu; ochrana proti cyklům a izolace chyb efektu.
- Uložení, Uložit jako a otevření verzovaného projektu včetně originálních obrázků.
- Export celého dokumentu PNG/JPEG/WebP; průhlednost v PNG/WebP, bílé pozadí v JPEG.
- Undo/redo změn vrstev, transformací a efektů; slider/drag se slučuje do jednoho kroku.
- Render graph s cache čistých uzlů, downstream invalidací a RenderTargetPool.

## Projekty a klávesové zkratky

Desktop ukládá zvolený `.json` a vedle něj adresář `assets/`. Přenášejte společně JSON i složku. Ukládají se pouze obrázky používané dokumentem; obrázky zůstávají v původním formátu. Prohlížeč stahuje přenosný JSON s vloženými daty obrázků, který lze otevřít i v desktopové verzi. ZIP / `.rlab` zatím není implementován. Neuložené změny označuje hvězdička u názvu dokumentu.

| Operace | Zkratka |
| --- | --- |
| Nový dokument | Ctrl+N |
| Import obrázků | Ctrl+I |
| Otevřít projekt | Ctrl+O |
| Uložit / uložit jako | Ctrl+S / Ctrl+Shift+S |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z nebo Ctrl+Y |
| Export | Ctrl+E |
| Výběr / pan | V / H |
| Fit / 100 % | F / 1 |
| Dočasný pan | Mezerník nebo prostřední tlačítko |

Historie uchovává nejvýše 200 příkazů, nepersistuje se v projektu a při otevření/novém dokumentu se resetuje. Neznámý nebo selhávající efekt zachová v náhledu svůj vstup a zobrazí diagnostiku; export se při chybě aktivního efektu přeruší.

Další iterace: UI skupin, masky a generátorové vrstvy. Generativní efekty nyní pracují s bitmapovou vrstvou; samostatné generátorové vrstvy ještě nejsou implementovány. Vícevstupové efekty používají dvě vrstvy. Koláže mají nejvýše 64 fragmentů, Crumple 32 záhybů. Maximální rozměr dokumentu i assetu je 8192 px; reálná kapacita GPU a paměti závisí na počtu vrstev a efektů.

Podrobnosti: [architektura](docs/architecture.md), [Effect API](docs/effect-api.md), [projektový formát](docs/project-format.md), [vykreslování](docs/rendering.md), [ověření](docs/validation.md).
