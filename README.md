# RasterLab

Desktopový základ nedestruktivního experimentálního rastrového editoru. Rozhraní vychází z `gui/gui-navrh.png`. Implementace respektuje první úkol v `codex_instructions.md`: nejprve funkční foundation, potom samostatné další fáze.

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
npm run desktop:build
```

Desktopový instalátor vzniká v `src-tauri/target/release/bundle/nsis/`. V nově otevřeném terminálu musí být dostupné `cargo` a `rustc`.

Pro test produkčního frontendu spusťte `npm run preview -- --port 4173` a v druhém PowerShell terminálu `$env:RASTERLAB_TEST_URL='http://127.0.0.1:4173'; npm run test:browser`. Test pak aplikuje stejnou CSP jako Tauri.

## Co nyní funguje

- Prázdný transparentní dokument 1000 × 1000; nový dokument s vlastními rozměry 1–8192 px.
- PixiJS 8 s WebGL, checkerboard, hranice a oříznutí dokumentu.
- Zoom k ukazateli, pan myší / prostředním tlačítkem / mezerníkem, Fit a 100 %.
- Import PNG, JPEG a WebP přes výběr souborů i drag & drop; vícenásobný import.
- Assets se identifikují UUID; originální soubor se nemění. Kliknutí na asset přidá další vrstvu.
- Výběr, viditelnost, zámek, krytí, blend mode, pořadí a transformace rastrových vrstev.
- Demo experiment generovaný lokálně, bez přístupu k síti.
- Serializovatelný model, oddělený renderovací graf a základy invalidace.

## Rozsah této iterace

Jde o první foundation s ověřovacím ovládáním rastrových vrstev, nikoli dokončený editor. Datové typy připravují skupiny, masky, generátory a efekty; UI a renderery těchto funkcí přijdou v dalších fázích. Ukládání/otevírání projektu, export, undo/redo, Effect Registry, GPU efekty a RenderTargetPool zatím nejsou implementovány. Dokument a assets žijí v paměti a po zavření aplikace se ztratí. Rozhraní tyto funkce nepředstírá; panel Effects uvádí jejich plánovaný stav.

Další krok: dokončit skupiny a vrstvy, pak přidat deklarativní Effect API a první efekty. Viz [architektura](docs/architecture.md).
