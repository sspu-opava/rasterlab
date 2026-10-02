# Architektura RasterLabu — foundation

## Oddělení vrstev

```text
Svelte UI → documentStore / RasterDocument → RenderGraph → PixiRenderEngine → PixiJS 8 WebGL
                      ↘ AssetManager (UUID → původní Blob, dekódovaný obraz, Texture)
```

`src/lib/document` obsahuje čisté serializovatelné typy a továrny. Model nikdy neobsahuje DOM objekty, soubory, URL ani Pixi instance. `RasterLayer.assetId` odkazuje na správce assetů. `position` je v dokumentových pixelech, `rotation` ve stupních a `scale` je faktor vůči originálnímu rozměru assetu. Vrstvy jsou v modelu řazeny od horní po spodní.

`src/lib/assets/AssetManager.ts` spravuje originální Blob, životnost object URL, dekódování a lazy vytvoření GPU textury. Import chybných dat bezpečně uvolní URL. Jedna textura se sdílí mezi více instancemi stejného assetu. Odstraňování nepoužívaných assetů vyžaduje množinu všech referencí, včetně budoucí historie; proto se při smazání vrstvy zatím automaticky nespouští.

`src/lib/editor/store.ts` propojuje uživatelské operace se změnami modelu. Svelte komponenty zobrazují stav a vyvolávají operace. Nedekódují bitmapy ani nevytvářejí shadery.

## Renderer a viewport

`PixiRenderEngine` vlastní Application, kontejnery, checkerboard, klip a hranici dokumentu. WebGL je zvolen při inicializaci; model ani graf nejsou svázány s backendem. V budoucnu lze přidat jiný renderer bez změny dokumentového formátu.

Viewport je samostatný `{zoom,x,y}` a mění pouze transformaci kontejneru. Změna okna mění rozměr výstupního canvasu, nikoliv dokument. Kolečko zachovává bod pod ukazatelem. Fit a 100 % explicitně centrují dokument. Document clipping zamezuje vykreslování bitmap mimo jeho hranice. Renderer běží na požádání, změny během jednoho animation frame se slučují. Sprites i textury se mezi změnami parametrů používají znovu.

`RenderGraph` sestavuje uzly source → effect stack → layer output → document. Skupiny mají závislosti na dětech, sekundární vstupy efektů na výstupech referencovaných vrstev. Invalidace prochází pouze následníky a chrání se před cykly. V této fázi graf slouží k evidenci změn a přípravě budoucího vyhodnocování; skutečný shaderový evaluation/cache ještě není implementován.

## Plán modulů

- `layers`: příští iterace — rekurzivní operace skupin, transformace a masky.
- `effects/core`: definice parametrů, validace, registry, renderer kontrakt.
- `effects/{color,boolean,distortion,material,generative}`: samostatně registrované moduly.
- `history`: příkazy s hodnotami modelu před a po změně, žádné kopie bitmap.
- `project`: verzovaný JSON a adresář assets, později migrations; bez ZIP podpory v první fázi.
- `generators`: nyní pouze development demo, později generátory produkující stejný výstup jako raster.

## Limity

Foundation renderuje rastry a interní group container; ostatní varianty LayerNode jsou typová příprava. UI pracuje s rastrovými vrstvami na nejvyšší úrovni. Effect Stack je zatím jen součást modelu. Preview/final mají připravené typy, výstupní rendering a export se přidají později. Maximální importovaný rozměr je 8192 px a velikost 100 MB; GPU může mít vlastní přísnější omezení. Paměť a GPU prostředky se uvolňují při zániku rendereru / správce assetů.

## Ověření

Unit testy pokrývají rozměry dokumentu, JSON roundtrip, fit importu, transformace viewportu a downstream invalidaci včetně více vstupů. Browser smoke test ověřuje inicializaci WebGL, import skutečného PNG, zoom, pan, krytí, viditelnost a vlastní rozměry. Desktopový build ověřuje celý Rust/MSVC/WebView2 základ.
