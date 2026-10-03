# Effect API 0.4

Nový efekt je samostatný modul. Definujte metadata a renderer, potom zavolejte `effectRegistry.register(definition)` v `src/lib/effects/index.ts`. UI si automaticky vytvoří nabídku a ovládací prvky. Neupravujte Svelte komponenty pro nový efekt.

## Kontrakt

Typy jsou v `src/lib/effects/core/types.ts`:

```ts
interface EffectDefinition {
  id: string; name: string; version: string; category: string; description: string;
  inputs: EffectInputDefinition[];
  parameters: EffectParameterDefinition[];
  createRenderer(context: EffectRenderContext): EffectRenderer;
}
```

Renderer má `filter: Filter`, `update(parameters, context)` a `destroy()`. Runtime vlastní GPU objekty, nikdy je neukládejte do EffectInstance. Context má `width`, `height`, `mode: 'preview' | 'final'` a případný `secondary: Texture`. Filter musí fungovat v offscreen dokumentovém renderu, nikoliv ve viewportových souřadnicích. `update` opakovaně používá existující renderer. Pro jiný backend bude továrna moci vytvořit jiný Pixi program.

Parametr deklaruje `id`, `label`, `type`, `default`, případně `min`, `max`, `step` a `options: {value,label}[]`. Podporované UI/validační typy jsou float, integer, boolean, select, color (`#rrggbb`), seed a layer (reference ID nebo null). Numeric validace odmítá NaN/Infinity, omezuje meze a zaokrouhluje integer/seed. `validateParameters` zahazuje nedefinované klíče a doplní výchozí hodnoty.

`EffectInstance` má vlastní UUID, ID definice, enabled, parameters a inputs. Dva výskyty stejné definice mají nezávislý runtime. Registry umí register/unregister/get/list/listByCategory a odmítá duplicity.

## Příklad jednoduchého WebGL efektu

```ts
// src/lib/effects/color/invert.ts
import { shaderEffect, numberParameter } from '../core/shader';
export const invert = shaderEffect({
  id: 'invert', name: 'Invert', category: 'Color',
  description: 'Míchá originální a invertovaný obraz.',
  parameters: [numberParameter('amount', 'Amount', 1, 0, 1)],
  body: `finalColor = vec4(mix(color, 1.0 - color, p_amount) * source.a, source.a);`,
});
```

Potom modul importujte a registrujte v `effects/index.ts`. `shaderEffect` poskytuje GLSL 3 vertex shader, input sampler, uniformy a statický Pixi adapter. Tělo běží v main, má `uv` (0–1 v dokumentu), `source` (premultiplied RGBA), `color` (straight RGB), `uSize` a `p_<parameterId>`. Používejte `sampleImage(uv)` pro pixelový vstup a transparentní okraje. Funkce `straight`, `luminance`, `hash` jsou společné. Výstup `finalColor` musí být premultiplied RGBA.

Helper automaticky mapuje float/integer/seed na float uniform, boolean na 0/1 a select na index možnosti. Pro vlastní color/layer parametry nebo složitější GPU zdroje implementujte `createRenderer` přímo; obecné UI a validace je podporují, shader helper pro ně uniformy automaticky nevytváří.

## Více vstupů a seed

Deklarujte `inputs: [{id:'secondary',label:'Druhá vrstva',required:true}]`. GraphRenderer vyhodnotí `instance.inputs.secondary` a předá texturu v dokumentových souřadnicích. Shader helper zpřístupní `uSecondary`; jeho UV jsou 0–1. Chybějící vstup způsobí bypass s diagnostikou. Další pojmenované vstupy vyžadují rozšíření backendového adapteru; současný executor poskytuje primary a secondary.

Seed má tlačítko Randomize používající crypto pouze při uživatelské operaci. V renderu nikdy nevolejte Math.random. CPU procedury mohou používat `seededRandom(seed)` z `utils/random.ts`; Noise používá deterministický hash pixelové pozice a uloženého seedu v shaderu. Stejný seed a parametry na stejném backendu reprodukují obraz.

## Procedurální data a sdílené funkce

`shaderEffect` přijímá také `helpers` (GLSL funkce vložené před main) a volitelný `data: ShaderData`. Data deklarují GLSL uniformy v `declarations`; `create()` při vytvoření runtime vrátí vlastní uniformy a `update(parameters)`. Uniformy obsahují `value`, `type` a volitelné `size` pro pole. Pole aktualizujte na místě; adapter pak volá `UniformGroup.update()`. Každá instance má vlastní data. CPU data se obnoví z uložených parametrů a nepatří do projektu.

`collage/fragments.ts` generuje Fisher–Yates permutaci do `uOrder[64]`; obnovuje ji jen při změně rozměrů, shuffle nebo seedu. `material/foldMap.ts` generuje až 32 záhybů do `uFolds[32]` a poskytuje sdílenou GLSL funkci výškového pole s analytickým gradientem. Crumple používá gradient pro deformaci i osvětlení. Procedurální generátory jsou oddělené od UI a shaderů konkrétních efektů.

Novou sadu ověřuje `npm run test:catalog` proti produkčnímu preview na portu 4173 se stejnou CSP jako desktop.

`collage/voronoi.ts` poskytuje další sdílený generátor: normalizované pozice buněk a vektory posunu do `uSites[32]`. GLSL helper vyhledává nejbližší centrum v pixelech dokumentu a počítá vzdálenost od skutečných bisektorů buněk, takže šířka mezer zůstává v pixelech i u obdélníkového dokumentu. Modulo Mix používá stejný secondary vstup jako boolean efekty; normalizovaný součet kanálů se zalamuje operací `mod(sum, divisor) / divisor * gain`.

## Testování a chyby

Přidejte testy validace a algoritmu. Ověřte skutečný shader také v `scripts/features.mjs`, včetně exportu, průhlednosti a případného secondary vstupu. Spusťte check, unit tests, build a produkční browser test s CSP Tauri. Neznámá definice z projektu se zachová, v panelu se dá vypnout/odstranit a zobrazuje diagnostiku. Vyhozená chyba rendereru má ponechat input; export chybu oznámí a nepřipraví nesprávný soubor.
