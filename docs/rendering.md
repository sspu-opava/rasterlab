# Vykreslování

Foundation používá asynchronně inicializovanou PixiJS 8 Application s `preference: 'webgl'`. GPU instance vlastní pouze PixiRenderEngine. Assets se dekódují jednou a Texture se vytváří až při prvním renderu.

Tauri CSP nepovoluje eval. Import `pixi.js/unsafe-eval` používá statické uniform synchronizační funkce bez eval; název modulu je převzatý z PixiJS. CSP zůstává bez `unsafe-eval`. Rozšířené blend módy registruje `pixi.js/advanced-blend-modes`.

Dokumentový kontejner má checkerboard, background, vrstvy a klip. Hranice je v samostatném objektu a její tloušťka se upravuje podle zoomu. Checkerboard ani border nemají být součástí budoucího exportu. Pixi ticker je vypnutý; aktualizace se seskupují přes requestAnimationFrame. Canvas má maximálně dvojnásobnou pixel density, což nemění rozměry dokumentu.

RenderGraph je nezávislý na GPU. Source uzel a jednotlivé effect uzly mají samostatné signatures. Změna efektu invaliduje jen sebe a následníky. Renderer nyní používá persistentní sprites a znovu používá původní textury; GPU render target caching a RenderTargetPool se implementují s prvními efekty.

Připravené RenderContext/RenderResult typy rozlišují preview/final a diagnostiku. Příští renderer vyhodnotí graf topologicky, detekuje cykly vstupních referencí a ukládá výsledky čistých uzlů. Preview může snížit rozlišení; parametry efektu se musí interpretovat v souřadnicích dokumentu, aby final zachoval stejný obraz.
