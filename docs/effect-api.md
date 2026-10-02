# Effect API — návrh pro další fázi

V této foundation ještě nejsou vykonatelné efekty. Následující kontrakt popisuje plán implementace, nikoli dostupné API.

Definice efektu má `id`, `name`, `version`, `category`, deklarace `inputs`, `parameters` a továrnu `createRenderer(context)`. Parametry budou `float`, `integer`, `boolean`, `select`, `color`, `seed` a `layer reference`. Každý parametr deklaruje výchozí hodnotu, label a případné meze/step/možnosti. UI bude odvozené z definice, nikoliv napsané pro jednotlivé efekty.

`EffectInstance` již existuje v `document/types.ts`. Identifikuje konkrétní použití definice, uchovává `enabled`, hodnoty parametrů a vstupní reference na ID vrstev. Serializuje se pouze instance; renderer a textury patří do runtime.

Při implementaci nového efektu v další fázi: vytvořit samostatný modul v odpovídající kategorii, deklarovat parametry a vstupy, implementovat renderer mimo UI a registrovat definici v centrálním registru. Renderer obdrží rozměry, režim preview/final a vstupní textury od grafu. Seedované efekty musí používat deterministický PRNG. Selhání efektu musí zachovat vstup a vrátit diagnostiku panelu.

První sada bude Grayscale, Threshold, Posterize, Noise, RGB Shift a Wave. XOR ověří více vstupů; Crumple a collage budou následovat až po stabilizaci této sady.
