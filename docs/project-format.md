# Projektový formát 3

Desktop uloží uživatelem zvolený JSON a sousední `assets/` s originálními PNG/JPEG/WebP. Přenášejte oba. ZIP / `.rlab` není implementován.

```json
{
  "format": "rasterlab",
  "version": 3,
  "document": { "id": "uuid", "name": "Untitled", "width": 1000, "height": 1000, "layers": [], "background": { "r": 0, "g": 0, "b": 0, "a": 0 }, "createdAt": "ISO", "modifiedAt": "ISO" },
  "assets": [{ "id": "asset-uuid", "name": "photo.png", "width": 1000, "height": 1000, "mimeType": "image/png", "file": "assets/asset-uuid.png" }]
}
```

Rastrová vrstva odkazuje na `assetId`. Generátorová vrstva má `type: "generated"`, `generatorId` a `parameters`; nepoužívá asset. ID generátorů jsou `noise`, `checker`, `lines`, `dots`, `fbm`, `voronoi`, `interference` a `radial`. Skupina má `type: "group"` a rekurzivní `children`. Serializují se transformace, krytí, blend, visibility/lock a effect instance parameters/inputs/enabled. Pixi objekty a runtime URL v projektu nejsou. Nepoužité importy a historie se neukládají.

Prohlížeč používá stejnou obálku a přidá k assetům `dataUrl: "data:image/png;base64,..."`. Tento přenosný JSON lze otevřít také v Tauri; příští desktopový save převede data do `assets/`. Browser načítá pouze přenosné JSON; desktop načítá i adresářové projekty. Nejde o ZIP podporu.

## Validace a migrations

ProjectDeserializer.parse přijímá verze 1, 2 a 3 a migruje je v paměti na v3. Generátory vyžadují alespoň v2 a známé generatorId. Maska vrstvy vyžaduje v3. Nejprve ověří format/version, rozměry, typy, transformace, asset manifest, duplicitní UUID a všechny vstupní reference. Odmítá cykly včetně skupin a masek a neimplementované typy vrstev. Známé parametry normalizuje podle definice, neznámé effectId zachová pro budoucí pluginy. Neznámá verze se odmítne před změnou živého stavu. Další uložení vždy vytvoří v3, kterou aplikace před 0.9 neotevře.

Volitelné `layer.mask` obsahuje `sourceId`, `enabled`, `mode: "alpha" | "luminance"`, `invert`, `strength` v rozsahu 0–1 a `feather` v rozsahu 0–64 dokumentových px. Odkaz musí mířit na existující vrstvu a nesmí tvořit cyklus ani při vypnuté masce. Výstup masky se použije po stacku efektů, před krytím/blendem. Historický neimplementovaný klíč `maskId` se odmítá; nenahrazuje nový objekt masky.

Bitmapy se dekódují do dočasného AssetManageru, rozměry se porovnají s manifestem a teprve po úspěchu se vymění dokument. Chybný soubor zachová současný dokument. Limity: 100 vrstev/assetů, 32 efektů na vrstvu, 12 úrovní skupin, 8192 px na stranu, 100 MB na bitmapu a 300 MB na projektová data. Praktický počet efektů omezuje GPU paměť.

## Filesystem

Rust přijímá pouze validované cesty `assets/<ID>.<extension>` odpovídající MIME; relativní traversal a únik přes symlink mimo projekt odmítá. Originál s existujícím ID se nepřepisuje jinými bytes: konflikt je chyba. Assets se zapisují přes temporary soubor a rename; JSON manifest se atomicky přepíše až poslední. Starý projekt zůstane čitelný, pokud save před commit selže. Staré nepoužité asset soubory se automaticky nemažou.

Ctrl+S používá poslední desktopovou cestu; Ctrl+Shift+S zobrazí výběr jiné cesty. Browser každý save stáhne nový portable JSON. Uložený immutable model určuje dirty flag. Otevření a nový dokument resetují historii. Native close a otevření projektu vyžadují rozhodnutí o skutečně neuložených změnách.

Export je oddělen od projektu: full-resolution PNG/JPEG/WebP, kvalita JPEG/WebP, bílé podložení průhlednosti JPEG. Export neobsahuje editorový checkerboard, hranici, zoom ani pan.

Od verze 0.7 existují dva další oddělené formáty: `.preset.json` s obálkou `rasterlab-preset`, verze 1, a interní IndexedDB kopie `rasterlab-recovery`, verze 1. Preset neobsahuje assety ani masku vrstvy; kopie obnovy ukládá projekt spolu s původními Bloby v jedné transakci. V aplikaci 0.9 je vložený projekt v3; starší kopie s projektem v1/v2 se migrují při načtení. Podrobnosti v [návodu 0.7](workflow-0.7.md) a [návodu masek](masks-0.9.md).
