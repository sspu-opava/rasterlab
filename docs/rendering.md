# Vykreslování 0.4

DocumentRenderEngine inicializuje PixiJS 8 Application s `preference: 'webgl'`. Ticker je vypnutý a UI změny se slučují přes requestAnimationFrame. Editorový canvas má maximálně 2× density; rozměry dokumentu jsou samostatné.

GraphRenderer vyhodnocuje graf v document-space RenderTexture při resolution 1. Raster source obsahuje originál s transformací. Každý efekt má vlastní output target a persistentní runtime. Source a čisté efekty se z cache znovu nepočítají při změně následného efektu. Sekundární vstupy vytvářejí downstream závislosti; cykly hlídá model i evaluator. Skupinový source skládá child outputs, výsledný dokument skládá layers s jejich opacity/visibility/blend a background.

Cache se resetuje při změně ID/rozměrů dokumentu, render mode nebo asset revision. Odstraněné uzly vracejí textury RenderTargetPoolu, který drží nejvýše osm volných targetů. Při změně slideru se znovu používají render targety a uniformy. Pixi filter intermediates dále používají vlastní interní pool. GPU runtime se uvolní při změně dokumentu nebo zániku rendereru.

Editor zobrazuje finální document texture na checkerboardu, transformovanou pouze viewportovým containerem. Hranice má konstantní tloušťku podle zoomu. Proto render obsahuje celé dokumentové rozlišení a zůstává nezávislý na okně a poloze kamery.

Export vytváří samostatný final GraphRenderer, vykreslí kompletní dokument a extrahuje přesně width × height. Checkerboard a border jsou pouze UI objekty. PNG/WebP zachovávají alpha; JPEG se skládá na bílý Canvas před encodingem. Chyba aktivního efektu zastaví export; preview ponechá vstup a vrátí error map do panelu. Preview/final nyní mají stejné rozlišení; budoucí preview scaling patří do context/render adapteru.

Shader helper používá explicitní GLSL ES 3.00 pro správné 8bit bitové XOR/AND/OR/NAND operace. Vstupy jsou premultiplied; barevné efekty počítají straight RGB a výstup znovu premultiplikují. Float uniformy se mapují z deklarovaných metadat. Distortion parametry se měří v document-space pixelech, nikoli viewportu.

Tauri CSP zůstává bez unsafe-eval. `pixi.js/unsafe-eval` je Pixi modul používající statické funkce bez eval. Rozšířené blend módy registruje `pixi.js/advanced-blend-modes`. Produkční browser test aplikuje tutéž CSP jako Tauri a kontroluje skutečné exportované pixely.

Koláže předpočítávají při změně seedu nebo členění bijektivní permutaci zdrojových fragmentů (nejvýše 64). Shader provádí zpětné mapování v dokumentových souřadnicích; transformované dlaždice ořezává na jejich buňku, mezery jsou průhledné. Crumple předpočítává až 32 orientovaných záhybů a v shaderu analyticky vyhodnotí jejich výšku a gradient. Gradient slouží pro displacement i světla/stíny. Data map zůstávají v runtime a nejsou součástí projektového JSON. Preview a export je nezávisle obnovují ze stejných parametrů.

Voronoi Collage používá nejvýše 32 seedovaných center; dvojice center definují bisektory pro přesnou šířku mezer. Ink Bleed vyhodnocuje 24 radiálních vzorků inkoustu s vláknitou nepravidelností. Zachovává alpha zdrojového papíru a šíří tmavé kanály jen uvnitř něj; nejde o iterativní fyzikální difuzi. Surface Relief vyhodnocuje symetrické derivace luminance, u průhledných okrajů použije jas aktuálního bodu. Contour Atlas vyhlazuje vrstevnice derivací `fwidth`, Scanline Displace posouvá skupiny řádků v dokumentových pixelech. Všechny tyto efekty jsou jednopassové, bez zpětné vazby.
