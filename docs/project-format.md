# Projektový formát 1

Desktop uloží uživatelem zvolený JSON a sousední `assets/` s originálními PNG/JPEG/WebP. Přenášejte oba. ZIP / `.rlab` není implementován.

```json
{
  "format": "rasterlab",
  "version": 1,
  "document": { "id": "uuid", "name": "Untitled", "width": 1000, "height": 1000, "layers": [], "background": { "r": 0, "g": 0, "b": 0, "a": 0 }, "createdAt": "ISO", "modifiedAt": "ISO" },
  "assets": [{ "id": "asset-uuid", "name": "photo.png", "width": 1000, "height": 1000, "mimeType": "image/png", "file": "assets/asset-uuid.png" }]
}
```

Vrstva odkazuje pouze na `assetId`. Serializují se transformace, krytí, blend, visibility/lock, effect instance parameters/inputs/enabled a group children. Pixi objekty a runtime URL v projektu nejsou. Nepoužité importy a historie se neukládají.

Prohlížeč používá stejnou obálku a přidá k assetům `dataUrl: "data:image/png;base64,..."`. Tento přenosný JSON lze otevřít také v Tauri; příští desktopový save převede data do `assets/`. Browser načítá pouze přenosné JSON; desktop načítá i adresářové projekty. Nejde o ZIP podporu.

## Validace a migrations

ProjectDeserializer.parse nejprve ověří format/version, rozměry, typy, transformace, asset manifest, duplicitní UUID a všechny vstupní reference. Odmítá cykly a neimplementované typy vrstev/masky. Známé parametry normalizuje podle definice, neznámé effectId zachová pro budoucí pluginy. Neznámá verze se odmítne před změnou živého stavu; zde se v budoucnu zařadí migrace.

Bitmapy se dekódují do dočasného AssetManageru, rozměry se porovnají s manifestem a teprve po úspěchu se vymění dokument. Chybný soubor zachová současný dokument. Limity: 100 vrstev/assetů, 32 efektů na vrstvu, 12 úrovní skupin, 8192 px na stranu, 100 MB na bitmapu a 300 MB na projektová data. Praktický počet efektů omezuje GPU paměť.

## Filesystem

Rust přijímá pouze validované cesty `assets/<ID>.<extension>` odpovídající MIME; relativní traversal a únik přes symlink mimo projekt odmítá. Originál s existujícím ID se nepřepisuje jinými bytes: konflikt je chyba. Assets se zapisují přes temporary soubor a rename; JSON manifest se atomicky přepíše až poslední. Starý projekt zůstane čitelný, pokud save před commit selže. Staré nepoužité asset soubory se automaticky nemažou.

Ctrl+S používá poslední desktopovou cestu; Ctrl+Shift+S zobrazí výběr jiné cesty. Browser každý save stáhne nový portable JSON. Uložený immutable model určuje dirty flag. Otevření a nový dokument resetují historii. Native close a otevření projektu vyžadují rozhodnutí o skutečně neuložených změnách.

Export je oddělen od projektu: full-resolution PNG/JPEG/WebP, kvalita JPEG/WebP, bílé podložení průhlednosti JPEG. Export neobsahuje editorový checkerboard, hranici, zoom ani pan.
