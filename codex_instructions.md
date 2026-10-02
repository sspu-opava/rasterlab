# RasterLab

Vytvoř desktopovou aplikaci **RasterLab** určenou pro experimentální a umělecké zpracování rastrových obrazů.

Nejde o klasický fotografický editor ani náhradu Photoshopu. Hlavním účelem aplikace je kreativní kombinování několika rastrových obrazů, procedurálních generátorů, masek a nedestruktivních obrazových efektů.

Aplikace musí být od začátku navržena modulárně tak, aby bylo možné snadno přidávat nové typy efektů.

## 1. Technologický stack

Použij:

- Tauri 2
- Svelte
- TypeScript
- Vite
- PixiJS 8

Pro stav aplikace použij jednoduché Svelte stores nebo obdobné lehké řešení. Nepřidávej rozsáhlý state-management framework bez skutečné potřeby.

PixiJS používej jako hlavní renderovací engine.

Pro první implementaci používej WebGL renderer.

Architekturu ale nenavrhuj způsobem, který by znemožnil pozdější podporu WebGPU.

Rust část Tauri udržuj zatím minimální. Používej ji pouze tam, kde je skutečně nutná interakce s operačním systémem.

## 2. Základní princip

RasterLab musí být NEDestruktivní editor.

Nikdy neměň originální bitmapu při aplikaci efektu.

Dokument musí obsahovat:

- zdrojové obrázky,
- vrstvy,
- skupiny,
- masky,
- parametry vrstev,
- stack efektů,
- vazby mezi vstupy,
- nastavení dokumentu.

Výsledný obraz se vždy vypočítá z tohoto popisu.

Architekturu navrhni jako renderovací graf, i když uživatelské rozhraní bude v první verzi zobrazovat klasický seznam vrstev a efektů.

## 3. Dokument

Vytvoř datový model `RasterDocument`.

Výchozí rozměr:

1000 × 1000 px

Rozměr však nesmí být natvrdo zakódován.

Dokument obsahuje minimálně:

```ts
interface RasterDocument {
    id: string;
    name: string;

    width: number;
    height: number;

    layers: LayerNode[];

    background: RGBAColor;

    createdAt: string;
    modifiedAt: string;
}
```

Datový model navrhni tak, aby byl serializovatelný do JSON.

Odděluj DOM/UI objekty, PixiJS objekty a serializovatelný model dokumentu.

Do JSON nikdy neukládej PixiJS instance.

## 4. Vrstvy

Implementuj minimálně:

- RasterLayer
- GroupLayer

Připrav architekturu také pro:

- GeneratedLayer
- AdjustmentLayer
- MaskLayer

Každá vrstva musí podporovat:

- name
- visible
- locked
- opacity
- position
- scale
- rotation
- blend mode
- effect stack

RasterLayer odkazuje na asset, nikoli přímo na serializovanou bitmapu.

## 5. Assets

Vytvoř AssetManager.

Musí umožňovat:

- import PNG
- import JPEG
- import WebP
- vytvoření PixiJS texture
- nalezení assetu podle ID
- odstranění nepoužívaného assetu

Datový model vrstvy má používat například:

```ts
assetId: string;
```

Nikoli absolutní cestu jako základ identity assetu.

## 6. Canvas

Centrální pracovní plocha musí obsahovat:

- zobrazení dokumentu,
- zoom kolečkem,
- pan,
- Fit to Screen,
- 100% zoom,
- checkerboard pro průhlednost,
- jasné označení hranic dokumentu.

Canvas nesmí změnit rozlišení skutečného dokumentu podle velikosti okna.

Zoom je pouze transformací viewportu.

## 7. Editor layout

Vytvoř desktopové rozhraní přibližně tohoto typu:

```text
Toolbar
────────────────────────────────────────────

Assets     Canvas                  Layers
                                  
                                   Effects
                                   Properties

────────────────────────────────────────────
Status bar
```

Levý panel:

- Assets
- později Generators
- později Presets

Pravý panel:

- Layers
- Effect Stack
- Effect Properties

Střed:

- PixiJS canvas

Použij tmavé neutrální rozhraní vhodné pro grafický editor.

Nepoužívej výrazné dekorativní gradienty ani zbytečné animace.

Prioritou je obraz.

## 8. Effect API

Navrhni obecné pluginové API pro efekty.

Například:

```ts
interface EffectDefinition {
    id: string;
    name: string;
    version: string;
    category: string;

    description?: string;

    inputs: EffectInputDefinition[];
    parameters: EffectParameterDefinition[];

    createRenderer(
        context: EffectRenderContext
    ): EffectRenderer;
}
```

Efekt musí být datově popsaný.

UI editor parametrů se má vytvořit automaticky podle `parameters`.

Podporované typy parametrů:

- float
- integer
- boolean
- select
- color
- seed
- layer reference

Například:

```ts
{
    id: "strength",
    label: "Strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5
}
```

## 9. Effect Registry

Vytvoř centrální:

```ts
EffectRegistry
```

který umožní:

```ts
register(effectDefinition);
unregister(effectId);
get(effectId);
list();
listByCategory(category);
```

Editor nesmí obsahovat hardcoded seznam efektů.

Efekty se registrují jako samostatné moduly.

Struktura například:

```text
src/lib/effects/
    core/
    color/
    boolean/
    distortion/
    material/
    generative/
```

## 10. Pluginy

V první fázi NEIMPLEMENTUJ načítání libovolného JavaScriptu z externích adresářů.

Vytvoř pouze plugin-ready interní architekturu.

Interní efekt musí používat stejné API, jaké později použije externí plugin.

Tím zabráníme dvojí implementaci efektového systému.

## 11. Effect Instance

Odděl definici efektu a jeho konkrétní použití.

Například:

```ts
interface EffectInstance {
    id: string;
    effectId: string;
    enabled: boolean;
    parameters: Record<string, unknown>;
}
```

Jedna definice `crumple` tak může být použita mnohokrát s různými parametry.

## 12. Effect Stack

Každá vrstva může obsahovat sekvenci:

```text
Source
↓
Effect 1
↓
Effect 2
↓
Effect 3
↓
Layer output
```

Uživatel musí umět:

- přidat efekt,
- odstranit efekt,
- vypnout efekt,
- zapnout efekt,
- měnit pořadí drag & drop,
- editovat parametry,
- resetovat parametry.

Změna parametru se musí okamžitě projevit na canvasu.

## 13. Randomize

Parametry typu `seed` musí mít podporu pro tlačítko:

Randomize

Výsledek generativních efektů musí být deterministický.

Stejný seed + stejné parametry = stejný obraz.

Nepoužívej `Math.random()` přímo uvnitř renderování efektu.

Implementuj seeded PRNG utility.

## 14. První efekty

Neimplementuj desítky efektů najednou.

Nejprve ověř architekturu na této malé sadě.

### Grayscale

Parametr:

- method

Možnosti:

- luminance
- average

### Threshold

Parametry:

- threshold
- softness
- invert

### Posterize

Parametry:

- levels

### Noise

Parametry:

- amount
- monochrome
- seed

### RGB Shift

Parametry:

- redX
- redY
- greenX
- greenY
- blueX
- blueY

### Wave

Parametry:

- amplitude
- frequency
- angle
- phase

### XOR

Dva obrazové vstupy.

Parametry:

- mode: RGB / luminance / binary
- threshold

Tento efekt použij také jako test podpory efektu s více obrazovými vstupy.

## 15. Boolean engine

Navrhni společný základ pro:

- AND
- OR
- XOR
- NAND

Boolean operace musí podporovat alespoň:

RGB mode:

bitová operace nad jednotlivými 8bit kanály.

Binary mode:

1. převedení na luminanci,
2. threshold,
3. boolean operace,
4. vytvoření výsledné masky.

Boolean implementaci odděl od UI.

## 16. Crumple experiment

Po stabilizaci základního editoru vytvoř experimentální efekt:

`Crumple`

Nemá jít pouze o náhodný displacement.

Vytvoř procedurální pole záhybů.

Použij jej alespoň pro:

- displacement obrazu,
- simulaci highlights,
- simulaci shadows.

Parametry:

- strength
- foldCount
- scale
- sharpness
- lightAngle
- lighting
- seed

Výsledkem má být abstraktní simulace zmuchlaného nebo přehýbaného obrazu.

Implementaci odděl tak, aby bylo možné generátor fold map později používat i jinými efekty.

## 17. Collage engine

Po Crumple vytvoř obecný základ pro kolážové efekty.

První implementace:

### Strips

Rozděl obraz na N pásů a umožni:

- horizontal
- vertical
- random order
- reverse alternation
- displacement
- gap
- seed

### Tiles

Rozděl obraz na mřížku a jednotlivé buňky transformuj.

Parametry:

- columns
- rows
- shuffle
- rotationVariation
- scaleVariation
- offsetVariation
- seed

Později musí být možné přidat:

- Voronoi Collage
- Fragment Scatter
- Recursive Collage
- Cut-up
- Random Crops

Proto odděl generování fragmentů od jejich renderování.

## 18. Generators

Architekturu připrav také na vrstvy bez vstupního bitmapového souboru.

Například:

```text
Noise Generator
Checker Generator
Lines Generator
Dots Generator
Voronoi Generator
Interference Generator
```

GeneratedLayer musí z pohledu efektového systému produkovat stejný typ image output jako běžná RasterLayer.

## 19. Render Graph

Vytvoř samostatnou abstrakci:

```ts
RenderGraph
RenderNode
RenderContext
RenderResult
```

UI nesmí přímo řídit PixiJS filtry.

Tok má být:

```text
UI
↓
document model
↓
render graph
↓
render engine
↓
PixiJS
```

Nikoli:

```text
UI component → přímo PixiJS shader
```

Toto oddělení je kritické.

## 20. Dirty propagation

Připrav mechanismus invalidace.

Když se změní parametr uzlu B:

```text
A → B → C → D
```

nemá být znovu počítán A.

Invaliduj:

```text
B
C
D
```

Implementace může být zpočátku jednoduchá, ale rozhraní musí existovat.

## 21. Render target cache

Vytvoř správu dočasných RenderTexture objektů.

Nealokuj novou GPU texturu při každém pohybu slideru, pokud je možné existující render target znovu použít.

Připrav:

```ts
RenderTargetPool
```

s metodami přibližně:

```ts
acquire(width, height);
release(texture);
clear();
```

## 22. Preview rendering

Editor musí zůstat interaktivní.

Připrav koncept dvou režimů:

```text
preview
final
```

V první implementaci mohou používat stejné rozlišení.

Architektura ale musí umožnit pozdější rendering například:

```text
preview: 500 × 500
final:   4000 × 4000
```

bez změny efektových pluginů.

## 23. Undo / Redo

Použij Command Pattern.

Vytvoř například:

```text
AddLayerCommand
DeleteLayerCommand
MoveLayerCommand
SetLayerOpacityCommand
AddEffectCommand
DeleteEffectCommand
MoveEffectCommand
SetEffectParameterCommand
```

Historie nesmí uchovávat kopii bitmapy po každém kroku.

Implementuj:

Ctrl+Z

Ctrl+Shift+Z nebo Ctrl+Y

## 24. Project serialization

Implementuj serializaci dokumentu do JSON.

Formát musí obsahovat číslo verze:

```json
{
    "format": "rasterlab",
    "version": 1
}
```

Nikdy nepředpokládej, že struktura projektu zůstane navždy stejná.

Připrav:

```ts
ProjectSerializer
ProjectDeserializer
```

a místo pro budoucí migrations.

## 25. Project file

Pro první fázi stačí:

```text
project.json
assets/
```

Později chceme vytvořit jeden soubor:

```text
*.rlab
```

který bude ZIP kontejnerem.

Nepiš ZIP podporu, dokud nebude základ editoru stabilní.

## 26. Export

Implementuj export výsledného dokumentu minimálně do:

- PNG
- JPEG
- WebP

Export musí renderovat celý dokument, nikoli screenshot aktuálního viewportu.

Zoom a pan editoru nesmí ovlivnit export.

## 27. Before / After

Pro vybraný efekt implementuj možnost:

- enabled
- disabled

a jednoduchý bypass.

Později připrav možnost dočasného zobrazení obrazu bez celého effect stacku.

## 28. Error handling

Efekt nesmí shodit celý editor.

Pokud efekt selže:

- zaloguj chybu,
- označ efekt v panelu,
- pokud možno vrať vstupní obraz nezměněný,
- aplikace musí pokračovat.

## 29. Logging

V development režimu poskytni strukturované logování:

```text
DOCUMENT
RENDER
EFFECT
ASSET
PROJECT
PERFORMANCE
```

Nevkládej bezhlavě `console.log()` po celém projektu.

## 30. TypeScript

Používej strict TypeScript.

Nepoužívej `any`, pokud to není skutečně nevyhnutelné.

Preferuj malé explicitní typy a interfaces.

Doménové typy umísti mimo Svelte komponenty.

## 31. Svelte komponenty

Svelte komponenty mají řešit prezentaci a uživatelskou interakci.

Nesmí obsahovat renderovací algoritmy.

Příklad struktury:

```text
src/
  lib/
    document/
    layers/
    assets/
    effects/
    render/
    history/
    project/
    generators/
    utils/

  components/
    canvas/
    layers/
    effects/
    assets/
    common/
```

## 32. Testy

Piš unit testy zejména pro:

- EffectRegistry
- parameter validation
- seeded random generator
- Boolean operations
- document serialization
- undo/redo
- graph invalidation

Shaderové vizuální testování může být později doplněno snapshot/reference images.

## 33. Demo content

Pro development přidej možnost vytvořit testovací dokument bez externího obrázku.

Například generovaný checkerboard nebo gradient.

Díky tomu musí být možné spustit aplikaci a okamžitě testovat renderovací pipeline.

## 34. Fáze implementace

Projekt implementuj iterativně.

### Phase 1 — Foundation

- Tauri + Svelte + TypeScript + PixiJS
- základní layout
- canvas
- document model
- import jednoho obrázku
- zobrazení RasterLayer

### Phase 2 — Layers

- více vrstev
- visibility
- opacity
- reorder
- transformations
- groups

### Phase 3 — Effect architecture

- EffectDefinition
- EffectInstance
- EffectRegistry
- automatické UI parametrů
- Effect Stack

### Phase 4 — Basic effects

- Grayscale
- Threshold
- Posterize
- Noise
- RGB Shift
- Wave

### Phase 5 — Multi-input

- references na jiné vrstvy
- XOR
- AND
- OR
- boolean engine

### Phase 6 — Project system

- save
- load
- serialization
- assets
- export

### Phase 7 — History

- commands
- undo
- redo

### Phase 8 — Experimental effects

- Crumple
- Strips
- Tiles

### Phase 9 — Generators

- noise
- checker
- lines
- interference

### Phase 10 — Optimization

- render graph caching
- dirty propagation
- RenderTargetPool
- performance profiling

Nezačínej další fázi, pokud předchozí nemá funkční, čistě zkompilovaný základ.

## 35. Dokumentace

Průběžně udržuj:

```text
README.md
docs/
    architecture.md
    effect-api.md
    project-format.md
    rendering.md
```

`effect-api.md` musí být napsán tak, aby podle něj bylo možné později vytvořit nový efekt bez studování celého zdrojového kódu RasterLabu.

## 36. Code quality

Priorita projektu:

1. čistá architektura,
2. rozšiřitelnost,
3. interaktivní výkon,
4. nedestruktivní workflow,
5. až potom množství efektů.

Nevytvářej jeden obrovský editor component.

Nevytvářej jeden univerzální `utils.ts`.

Nevkládej shadery přímo do Svelte komponent.

Nevaz renderovací engine na konkrétní UI.

Nevytvářej speciální UI ručně pro každý efekt, pokud jej lze odvodit z deklarace parametrů.

## 37. První úkol

Neimplementuj celý projekt najednou.

Nejprve:

1. vytvoř architekturu adresářů,
2. připrav základ Tauri/Svelte/PixiJS,
3. vytvoř datové modely,
4. implementuj prázdný dokument 1000 × 1000,
5. zobraz jej v PixiJS canvasu,
6. implementuj zoom, pan, Fit a 100%,
7. implementuj import jednoho rastrového obrázku,
8. vytvoř první RasterLayer,
9. sepiš `docs/architecture.md`.

Po dokončení této fáze:

- spusť TypeScript kontrolu,
- spusť testy,
- spusť build,
- oprav všechny chyby a warningy, které mají význam,
- zkontroluj, že aplikace skutečně startuje.

Teprve potom pokračuj implementací Layer systému.

Při každém větším architektonickém rozhodnutí preferuj obecné řešení použitelné pro budoucí efekty před rychlým hardcoded řešením pro jeden konkrétní filtr.