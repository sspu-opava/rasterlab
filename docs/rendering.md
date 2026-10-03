# Vykreslování 0.8

DocumentRenderEngine inicializuje PixiJS 8 Application s `preference: 'webgl'`. Ticker je vypnutý a UI změny se slučují přes requestAnimationFrame. Editorový canvas má maximálně 2× density; rozměry dokumentu jsou samostatné.

GraphRenderer vyhodnocuje graf v document-space RenderTexture při resolution 1. Raster source obsahuje originál s transformací. Každý efekt má vlastní output target a persistentní runtime. Source a čisté efekty se z cache znovu nepočítají při změně následného efektu. Sekundární vstupy vytvářejí downstream závislosti; cykly hlídá model i evaluator. Skupinový source skládá child outputs, výsledný dokument skládá layers s jejich opacity/visibility/blend a background.

Cache se resetuje při změně ID/rozměrů dokumentu, render mode nebo asset revision. Odstraněné uzly vracejí textury RenderTargetPoolu, který drží nejvýše osm volných targetů. Při změně slideru se znovu používají render targety a uniformy. Pixi filter intermediates dále používají vlastní interní pool. GPU runtime se uvolní při změně dokumentu nebo zániku rendereru.

Generátor má samostatný dokumentový target a persistentní runtime spravovaný podle UUID vrstvy. Jeho shader vytváří procedurální obraz bez importovaného assetu; transformovaný obraz vstoupí do source uzlu a běžného stacku. FBM a Voronoi sdílejí efektové runtime s plnou procedurální silou, Interference a Radial Field sdílejí analytické GLSL funkce s odpovídajícími efekty. Parametry a seed určují signaturu uzlu. Při odstranění vrstvy nebo změně dokumentu se uvolní i generator runtime.

Skupina skládá děti v pořadí modelu s jejich viditelností, krytím a blendem. Následně se aplikuje transformace skupiny a její stack; krytí/blend skupiny se použije při složení s ostatními vrstvami. Souřadnice dětí jsou místní vůči předkům. Každá mezitextura má rozměr dokumentu a ořezává se na jeho hranice. Vstupní reference na dítě používá jeho vlastní post-effect výstup před transformací předků; není to výřez finálního dokumentu. Reference na skrytého sourozence je povolená, reference dítěte na jeho předka by tvořila cyklus a je odmítnuta.

Editor zobrazuje finální document texture na checkerboardu, transformovanou pouze viewportovým containerem. Hranice má konstantní tloušťku podle zoomu. Proto render obsahuje celé dokumentové rozlišení a zůstává nezávislý na okně a poloze kamery.

Export vytváří samostatný final GraphRenderer, vykreslí kompletní dokument a extrahuje přesně width × height. Checkerboard a border jsou pouze UI objekty. PNG/WebP zachovávají alpha; JPEG se skládá na bílý Canvas před encodingem. Chyba aktivního efektu zastaví export; preview ponechá vstup a vrátí error map do panelu. Preview/final nyní mají stejné rozlišení; budoucí preview scaling patří do context/render adapteru.

Shader helper používá explicitní GLSL ES 3.00 pro správné 8bit bitové XOR/AND/OR/NAND operace. Vstupy jsou premultiplied; barevné efekty počítají straight RGB a výstup znovu premultiplikují. Float uniformy se mapují z deklarovaných metadat. Distortion parametry se měří v document-space pixelech, nikoli viewportu.

Tauri CSP zůstává bez unsafe-eval. `pixi.js/unsafe-eval` je Pixi modul používající statické funkce bez eval. Rozšířené blend módy registruje `pixi.js/advanced-blend-modes`. Produkční browser test aplikuje tutéž CSP jako Tauri a kontroluje skutečné exportované pixely.

Koláže předpočítávají při změně seedu nebo členění bijektivní permutaci zdrojových fragmentů (nejvýše 64). Shader provádí zpětné mapování v dokumentových souřadnicích; transformované dlaždice ořezává na jejich buňku, mezery jsou průhledné. Crumple předpočítává až 32 orientovaných záhybů a v shaderu analyticky vyhodnotí jejich výšku a gradient. Gradient slouží pro displacement i světla/stíny. Data map zůstávají v runtime a nejsou součástí projektového JSON. Preview a export je nezávisle obnovují ze stejných parametrů.

Voronoi Collage používá nejvýše 32 seedovaných center; dvojice center definují bisektory pro přesnou šířku mezer. Ink Bleed vyhodnocuje 24 radiálních vzorků inkoustu s vláknitou nepravidelností. Zachovává alpha zdrojového papíru a šíří tmavé kanály jen uvnitř něj; nejde o iterativní fyzikální difuzi. Surface Relief vyhodnocuje symetrické derivace luminance, u průhledných okrajů použije jas aktuálního bodu. Contour Atlas vyhlazuje vrstevnice derivací `fwidth`, Scanline Displace posouvá skupiny řádků v dokumentových pixelech. Všechny tyto efekty jsou jednopassové, bez zpětné vazby.

## Iterace a řazení

Víceprůchodový efekt dostává vlastní output target a udržuje dva pomocné RenderTexture objekty. Na každé zneplatnění začíná initialize z původního vstupu, poté střídá read/write targety a finish zapisuje výsledek. Vstupní textury se nikdy nepřepisují. Změna rozměrů a destroy uvolní pomocné targety. Cache čistých uzlů a export používají tuto větev stejně jako jednotlivé filtry.

Pixel Sort provádí odd-even transposition sorting, jeden sousední compare/swap na průchod. Parametr interval 2–64 určuje délku segmentu i počet průchodů; threshold a nulová alpha tvoří bariéry. Feedback transformuje předchozí obraz a míchá jej s původním vstupem. Reaction Diffusion aktualizuje U/V přes čtyřsousední laplacián a Gray–Scott reakční člen; používá periodické hranice a standardní RGBA8 targety. Žádný z těchto algoritmů neakumuluje stav napříč změnami sliderů nebo exporty.

Recursive Collage v každém kroku transformuje výsledek předchozího kroku a skládá jej přes původní obraz metodou source-over. Cellular Growth uchovává binární buňky a procedurální substrát v RG kanálech, rozšiřuje živé buňky přes osm sousedů a periodické hranice a při finish obnoví alpha původní bitmapy. Echo Frames skládá transformované kopie původního obrazu v jednom shaderu. Databend mapuje lineární proud pixelů celočíselně, takže ani dokument 8192 × 8192 neztrácí přesnost adres přes limit float. Signal Collapse kombinuje seedovaný posun, kvantizaci, bitové masky a výpadky kanálů; nepoškozuje původní soubor.
