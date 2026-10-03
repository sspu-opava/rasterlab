# Architektura RasterLabu 0.6

```text
Svelte UI → editor commands / RasterDocument → RenderGraph → GraphRenderer → PixiJS 8 WebGL
                         ↕ CommandHistory          ↕ EffectRegistry           ↕ RenderTargetPool
                         ↕ ProjectSerializer       ↕ AssetManager (UUID → originál → Texture)
```

## Model a operace

`document/types.ts` obsahuje serializovatelné modely. Bitmapy se nikdy nepřepisují, vrstvy odkazují na asset UUID. Position je v dokumentových pixelech, scale vůči rozměrům originálu, rotation ve stupních. Vrstvy v modelu jsou od horní po spodní, efekty od prvního po poslední. DOM a GPU objekty patří výhradně do runtime.

`editor/state.ts` implementuje operace vrstev, efektů a projektů. `store.ts` je veřejný export. CommandHistory ukládá příkaz s immutable modely před/po změně, ne s pixely. Modely sdílejí nezměněné větve a asset UUID. Historie má 200 kroků, nová editace zahodí redo větev, souvislé změny sliderů/dragu se slučují. Undo/redo nesmějí přepisovat aktivní save/load/export operaci. Uložený model se eviduje samostatně a hvězdička ukazuje neuložené změny.

AssetManager vlastní originální Blob, object URL, dekódovaný obraz a lazy Texture. Při load se vytvoří dočasný manager a všechny bitmapy se ověří před výměnou živého dokumentu. Revision správce invaliduje cache po výměně zdrojových obrazů, i když projekt používá stejná UUID. Library v paměti drží i nepoužité importy kvůli undo; save zahrnuje jen reference aktivního dokumentu.

## Efekty

Efekty mají nezávislou definici a instance. Registry, validace a renderer API jsou v `effects/core`, moduly v `color`, `distortion`, `generative`, `boolean`, `collage` a `material`. UI čte metadata; není v něm seznam konkrétních efektů ani shaderové algoritmy. `createRenderer` vytváří persistentní runtime, `update` obvykle mění uniformy a vstupy. Channel Algebra překládá omezené textové výrazy do GLSL a při jejich změně vymění svůj program. Registruje se interní kód, žádné externí JS pluginy se nenačítají.

Sekundární vstup je post-effect obsah druhé vrstvy v dokumentových souřadnicích, před krytím/blendem vrstvy. Reference může použít i skrytou vrstvu. Store a deserializer odmítají cykly; renderer má ještě vlastní ochranu. Selhání jednotlivého efektu vrací jeho nezměněný vstup, loguje diagnostiku a označí efekt v panelu. Export při chybě aktivního efektu skončí čitelnou chybou.

## Render

DocumentRenderEngine vlastní Application a editorový viewport. GraphRenderer vlastní evaluaci source → effect stack → layer output → document, cache RenderTexture a efektové runtimy. Zdroj je vykreslen v rozměru dokumentu se svou transformací; efekty se počítají v tomto prostoru. Krytí, viditelnost a blend se použijí při skládání vrstev. Skupiny se rekurzivně skládají a jejich source obsahuje výstupy dětí.

GraphRenderer znovu počítá jen dirty uzly a následníky. Čisté source/efektové textury se používají z cache. RenderTargetPool opakovaně používá uvolněné textury; velikost volného poolu je omezená. Shader uniformy se aktualizují bez nové alokace render targetu při každém pohybu slideru. Přepnutí projektu/rozměrů/revision uvolní cache.

Export má samostatný final GraphRenderer bez editorového viewportu, checkerboardu a hranice. Preview/final nyní mají stejné rozlišení. Rozměry a režim jsou v EffectRenderContext; budoucí nižší preview rozlišení se přidá v renderovací vrstvě. WebGL adapter používá GLSL 3; backendová výměna nevyžaduje změnu dokumentu nebo UI metadat.

Víceprůchodové efekty používají alternativní `EffectRenderer.render` místo jediného filtru. GraphRenderer jim předá nezměněný vstup a vlastní výstupní target. Multipass runtime udržuje pouze dva pomocné targety pro střídání průchodů. Cache a invalidace nadále fungují na úrovni celého efektového uzlu. Initialize se spustí pro každé nové vyhodnocení, takže export ani undo nezdědí historii simulace.

## Operační systém

Rust je omezen na filesystem: `save_project`, `load_project`, `write_export`. Výběr cest řeší oficiální dialog plugin. Assets mají validované relativní cesty, soubory se zapisují atomicky a manifest poslední. UI nedostává obecný filesystem plugin. Podrobnosti jsou v [projektovém formátu](project-format.md).

## Rozsah

UI plně ovládá rastrové vrstvy nejvyšší úrovně. Serializace a render podporují skupiny, ale jejich vytváření a ovládání dětí přijde v další iteraci. Masky, adjustment/generated layer renderery a WebGPU zatím nejsou implementovány. Parametrové typy a datové modely pro ně existují. Crumple, Strips, Random Tiles, Bit Plane Extractor, Photocopy a Interference jsou samostatné interní moduly. CPU generátory fragmentů a záhybů jsou oddělené od GPU renderu a ukládají se pouze jejich parametry.
